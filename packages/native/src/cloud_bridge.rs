use crate::local_store::{KitchenTicket, LocalStore, LocalStoreError, OrderRecord};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::BTreeSet;
use subtle::ConstantTimeEq;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SaasAddon {
    CloudStorageSync,
    OnlineOrderingBridge,
    AiAutopilot,
    MultiUnitCommissary,
    ManagedStripeConnect,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaasEntitlementPayload {
    pub grant_id: String,
    pub customer_id: String,
    pub site_id: Uuid,
    pub plan_tier: String,
    pub addons: BTreeSet<SaasAddon>,
    pub cloud_endpoint: String,
    pub issued_at_unix: u64,
    pub expires_at_unix: u64,
    pub offline_grace_seconds: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignedSaasGrant {
    pub payload: SaasEntitlementPayload,
    pub signature_hex: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CloudBridgeError {
    InvalidSignature,
    WrongSite,
    GrantExpired,
    AddonNotSubscribed(SaasAddon),
    StoreError(LocalStoreError),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudSyncEnvelope {
    pub batch_id: String,
    pub site_id: Uuid,
    pub customer_id: String,
    pub cloud_endpoint: String,
    pub event_count: usize,
    pub payload_sha256: String,
    pub events: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelayedOnlineOrder {
    pub external_order_id: String,
    pub customer_name: String,
    pub fulfillment_mode: String,
    pub items: Vec<(String, i64)>,
}

pub fn sign_entitlement_payload(
    payload: &SaasEntitlementPayload,
    signing_secret: &str,
) -> Result<String, CloudBridgeError> {
    let canonical = serde_json::to_vec(payload).map_err(|_| CloudBridgeError::InvalidSignature)?;
    let mut mac = Hmac::<Sha256>::new_from_slice(signing_secret.as_bytes())
        .map_err(|_| CloudBridgeError::InvalidSignature)?;
    mac.update(&canonical);
    Ok(hex::encode(mac.finalize().into_bytes()))
}

pub fn verify_signed_grant(
    grant: &SignedSaasGrant,
    expected_site_id: Uuid,
    signing_secret: &str,
    now_unix: u64,
) -> Result<(), CloudBridgeError> {
    if grant.payload.site_id != expected_site_id {
        return Err(CloudBridgeError::WrongSite);
    }
    let expected_sig = sign_entitlement_payload(&grant.payload, signing_secret)?;
    let mut provided_bytes = [0u8; 32];
    let mut expected_bytes = [0u8; 32];
    if hex::decode_to_slice(&grant.signature_hex, &mut provided_bytes).is_err()
        || hex::decode_to_slice(&expected_sig, &mut expected_bytes).is_err()
    {
        return Err(CloudBridgeError::InvalidSignature);
    }
    if !bool::from(provided_bytes.ct_eq(&expected_bytes)) {
        return Err(CloudBridgeError::InvalidSignature);
    }
    let final_deadline = grant
        .payload
        .expires_at_unix
        .saturating_add(grant.payload.offline_grace_seconds);
    if now_unix > final_deadline {
        return Err(CloudBridgeError::GrantExpired);
    }
    Ok(())
}

/// Manages the installed Rust application's connection to the CulinaryOS SaaS
/// server for cloud storage sync, online ordering relay, and paid add-ons.
/// Note: Local POS, KDS, cash drawer, and hardware printing ALWAYS remain active
/// locally even when disconnected from SaaS.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudBridge {
    active_grant: Option<SignedSaasGrant>,
}

impl CloudBridge {
    pub fn new() -> Self {
        Self { active_grant: None }
    }

    pub fn connect(
        &mut self,
        grant: SignedSaasGrant,
        expected_site_id: Uuid,
        signing_secret: &str,
        now_unix: u64,
    ) -> Result<&SaasEntitlementPayload, CloudBridgeError> {
        verify_signed_grant(&grant, expected_site_id, signing_secret, now_unix)?;
        self.active_grant = Some(grant);
        Ok(&self.active_grant.as_ref().expect("just set").payload)
    }

    pub fn disconnect(&mut self) {
        self.active_grant = None;
    }

    pub fn is_connected(&self) -> bool {
        self.active_grant.is_some()
    }

    pub fn current_grant(&self) -> Option<&SaasEntitlementPayload> {
        self.active_grant.as_ref().map(|g| &g.payload)
    }

    pub fn require_addon(
        &self,
        addon: SaasAddon,
        now_unix: u64,
    ) -> Result<&SaasEntitlementPayload, CloudBridgeError> {
        let Some(grant) = &self.active_grant else {
            return Err(CloudBridgeError::AddonNotSubscribed(addon));
        };
        let deadline = grant
            .payload
            .expires_at_unix
            .saturating_add(grant.payload.offline_grace_seconds);
        if now_unix > deadline {
            return Err(CloudBridgeError::GrantExpired);
        }
        if !grant.payload.addons.contains(&addon) {
            return Err(CloudBridgeError::AddonNotSubscribed(addon));
        }
        Ok(&grant.payload)
    }

    /// Packages pending local database mutations into a verifiable batch for
    /// the CulinaryOS SaaS Cloud Storage & Backup service.
    pub fn prepare_storage_sync_batch(
        &self,
        store: &mut LocalStore,
        now_unix: u64,
    ) -> Result<CloudSyncEnvelope, CloudBridgeError> {
        let grant = self.require_addon(SaasAddon::CloudStorageSync, now_unix)?;
        let events = store
            .drain_sync_outbox()
            .map_err(CloudBridgeError::StoreError)?;
        let serialized =
            serde_json::to_vec(&events).map_err(|_| CloudBridgeError::InvalidSignature)?;
        let payload_sha256 = hex::encode(Sha256::digest(&serialized));
        let mut rnd = [0u8; 8];
        let _ = getrandom::fill(&mut rnd);
        Ok(CloudSyncEnvelope {
            batch_id: format!("sync-{}", hex::encode(rnd)),
            site_id: grant.site_id,
            customer_id: grant.customer_id.clone(),
            cloud_endpoint: grant.cloud_endpoint.clone(),
            event_count: events.len(),
            payload_sha256,
            events,
        })
    }

    /// Receives an online order from the CulinaryOS SaaS Online Ordering Bridge,
    /// reprices all items authoritatively against the installed local database,
    /// and dispatches tickets directly to the local KDS.
    pub fn ingest_relayed_online_order(
        &self,
        store: &mut LocalStore,
        relayed: RelayedOnlineOrder,
        now_unix: u64,
    ) -> Result<(OrderRecord, Vec<KitchenTicket>), CloudBridgeError> {
        self.require_addon(SaasAddon::OnlineOrderingBridge, now_unix)?;
        let items_with_seat_course = relayed
            .items
            .into_iter()
            .map(|(menu_id, qty)| (menu_id, qty, 1, 1))
            .collect();
        let order_id = format!("online-{}", relayed.external_order_id);
        let order = store
            .create_order(
                Some(order_id.clone()),
                format!("Online ({})", relayed.customer_name),
                items_with_seat_course,
            )
            .map_err(CloudBridgeError::StoreError)?;
        let tickets = store
            .send_order_to_kitchen(&order_id)
            .map_err(CloudBridgeError::StoreError)?;
        Ok((order, tickets))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SECRET: &str = "culinaryos-saas-signing-secret-key-2026-prod";

    fn sample_grant(site_id: Uuid) -> SignedSaasGrant {
        let mut addons = BTreeSet::new();
        addons.insert(SaasAddon::CloudStorageSync);
        addons.insert(SaasAddon::OnlineOrderingBridge);
        addons.insert(SaasAddon::AiAutopilot);
        let payload = SaasEntitlementPayload {
            grant_id: "grant-001".to_string(),
            customer_id: "cust-alley-katz".to_string(),
            site_id,
            plan_tier: "saas_pro".to_string(),
            addons,
            cloud_endpoint: "https://cloud.culinaryos.io".to_string(),
            issued_at_unix: 1_000,
            expires_at_unix: 2_000,
            offline_grace_seconds: 600,
        };
        let signature_hex = sign_entitlement_payload(&payload, SECRET).unwrap();
        SignedSaasGrant {
            payload,
            signature_hex,
        }
    }

    #[test]
    fn installed_rust_app_verifies_saas_addons_syncs_storage_and_relays_online_orders() {
        let dir = tempfile::tempdir().unwrap();
        let site_id = Uuid::from_u128(777);
        let mut store = LocalStore::open_or_init(&dir.path().join("local.db"), site_id).unwrap();
        let mut bridge = CloudBridge::new();

        // Without SaaS connection, local POS works, but cloud sync requires the SaaS add-on
        store
            .create_order(
                Some("local-ord-1".to_string()),
                "Table 1".to_string(),
                vec![("item-margherita".to_string(), 1, 1, 1)],
            )
            .unwrap();
        assert_eq!(
            bridge.prepare_storage_sync_batch(&mut store, 1_500).unwrap_err(),
            CloudBridgeError::AddonNotSubscribed(SaasAddon::CloudStorageSync)
        );

        // Connect installed Rust app to SaaS server using signed entitlement grant
        let grant = sample_grant(site_id);
        bridge.connect(grant, site_id, SECRET, 1_500).unwrap();
        assert!(bridge.is_connected());

        // Relay online order from SaaS bridge -> local store reprices & fires to KDS
        let (online_order, kds_tickets) = bridge
            .ingest_relayed_online_order(
                &mut store,
                RelayedOnlineOrder {
                    external_order_id: "web-901".to_string(),
                    customer_name: "Nathaniel".to_string(),
                    fulfillment_mode: "pickup".to_string(),
                    items: vec![("item-ribeye".to_string(), 1)],
                },
                1_500,
            )
            .unwrap();
        assert_eq!(online_order.subtotal_cents, 4600);
        assert_eq!(kds_tickets.len(), 1);
        assert_eq!(kds_tickets[0].station, "grill");

        // Prepare cloud storage sync batch containing both the local order and online order
        let sync_batch = bridge.prepare_storage_sync_batch(&mut store, 1_500).unwrap();
        assert_eq!(sync_batch.event_count, 2);
        assert_eq!(store.pending_outbox_len(), 0);

        // Offline grace window keeps add-ons working at t=2500 (expires 2000 + 600 grace = 2600)
        assert!(bridge.require_addon(SaasAddon::AiAutopilot, 2_500).is_ok());
        // Past grace window (t=2700), cloud add-on returns GrantExpired while local store still works
        assert_eq!(
            bridge.require_addon(SaasAddon::AiAutopilot, 2_700),
            Err(CloudBridgeError::GrantExpired)
        );
    }
}
