use crate::{Denial, DeviceAssignment, DeviceRole, Operation, Site};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fs::{File, OpenOptions},
    io::{self, BufReader, BufWriter, Write},
    path::{Path, PathBuf},
};
use tempfile::NamedTempFile;

const PAIRING_LIFETIME_SECONDS: u64 = 300;
const FORMAT_VERSION: u32 = 1;

/// Random bearer value for the local enrollment prototype. Only its digest
/// is persisted. Transport and device-side secret storage are separate.
pub struct Secret([u8; 32]);

impl Secret {
    fn generate() -> Result<Self, RegistryError> {
        let mut bytes = [0; 32];
        getrandom::fill(&mut bytes).map_err(|_| RegistryError::RandomUnavailable)?;
        Ok(Self(bytes))
    }

    pub fn from_hex(value: &str) -> Result<Self, RegistryError> {
        let mut bytes = [0; 32];
        hex::decode_to_slice(value, &mut bytes).map_err(|_| RegistryError::InvalidSecret)?;
        Ok(Self(bytes))
    }

    pub fn to_hex(&self) -> String {
        hex::encode(self.0)
    }

    fn digest(&self) -> String {
        hex::encode(Sha256::digest(self.0))
    }
}

#[derive(Debug, Eq, PartialEq)]
pub enum RegistryError {
    Storage,
    AlreadyInitialized,
    Locked,
    InvalidFormat,
    WrongSite,
    RandomUnavailable,
    InvalidSecret,
    InvalidClock,
    UnknownPairing,
    ExpiredPairing,
    UnknownDevice,
    Denied(Denial),
}

#[derive(Clone, Serialize, Deserialize)]
struct Pairing {
    role: DeviceRole,
    expires_at: u64,
}

#[derive(Clone, Serialize, Deserialize)]
struct Device {
    id: String,
    assignment: DeviceAssignment,
}

#[derive(Clone, Serialize, Deserialize)]
struct State {
    version: u32,
    site: Site,
    pairings: BTreeMap<String, Pairing>,
    devices: BTreeMap<String, Device>,
}

pub struct Enrollment {
    pub device_id: String,
    pub credential: Secret,
}

/// Single-host prototype. The site service owns the directory and serializes
/// calls. A second process cannot open the same registry for writing.
pub struct Registry {
    directory: PathBuf,
    _lock: File,
    state: State,
}

impl Registry {
    pub fn create(directory: &Path, site: Site) -> Result<Self, RegistryError> {
        let lock = Self::lock(directory)?;
        let registry = Self {
            directory: directory.to_owned(),
            _lock: lock,
            state: State {
                version: FORMAT_VERSION,
                site,
                pairings: BTreeMap::new(),
                devices: BTreeMap::new(),
            },
        };
        registry.save(&registry.state, true)?;
        Ok(registry)
    }

    pub fn open(directory: &Path, site: Site) -> Result<Self, RegistryError> {
        let lock = Self::lock(directory)?;
        let file =
            File::open(directory.join("registry.json")).map_err(|_| RegistryError::Storage)?;
        let state: State = serde_json::from_reader(BufReader::new(file))
            .map_err(|_| RegistryError::InvalidFormat)?;
        if state.version != FORMAT_VERSION {
            return Err(RegistryError::InvalidFormat);
        }
        if state.site != site
            || state
                .devices
                .values()
                .any(|device| device.assignment.site != site)
        {
            return Err(RegistryError::WrongSite);
        }
        Ok(Self {
            directory: directory.to_owned(),
            _lock: lock,
            state,
        })
    }

    fn lock(directory: &Path) -> Result<File, RegistryError> {
        let lock = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(directory.join("registry.lock"))
            .map_err(|_| RegistryError::Storage)?;
        lock.try_lock().map_err(|error| match error {
            std::fs::TryLockError::WouldBlock => RegistryError::Locked,
            std::fs::TryLockError::Error(_) => RegistryError::Storage,
        })?;
        Ok(lock)
    }

    fn save(&self, state: &State, create: bool) -> Result<(), RegistryError> {
        let mut temp =
            NamedTempFile::new_in(&self.directory).map_err(|_| RegistryError::Storage)?;
        {
            let mut output = BufWriter::new(temp.as_file_mut());
            serde_json::to_writer(&mut output, state).map_err(|_| RegistryError::Storage)?;
            output.flush().map_err(|_| RegistryError::Storage)?;
        }
        temp.as_file()
            .sync_all()
            .map_err(|_| RegistryError::Storage)?;
        let path = self.directory.join("registry.json");
        if create {
            temp.persist_noclobber(path).map_err(|error| {
                if error.error.kind() == io::ErrorKind::AlreadyExists {
                    RegistryError::AlreadyInitialized
                } else {
                    RegistryError::Storage
                }
            })?;
        } else {
            temp.persist(path).map_err(|_| RegistryError::Storage)?;
        }
        Ok(())
    }

    fn commit(&mut self, next: State) -> Result<(), RegistryError> {
        self.save(&next, false)?;
        self.state = next;
        Ok(())
    }

    /// The caller checks manager authorization and site ownership first.
    /// Timestamps are trusted server time in Unix seconds.
    pub fn issue_pairing(&mut self, role: DeviceRole, now: u64) -> Result<Secret, RegistryError> {
        let secret = Secret::generate()?;
        let expires_at = now
            .checked_add(PAIRING_LIFETIME_SECONDS)
            .ok_or(RegistryError::InvalidClock)?;
        let mut next = self.state.clone();
        next.pairings.retain(|_, pairing| pairing.expires_at > now);
        next.pairings
            .insert(secret.digest(), Pairing { role, expires_at });
        self.commit(next)?;
        Ok(secret)
    }

    pub fn redeem(&mut self, code: &Secret, now: u64) -> Result<Enrollment, RegistryError> {
        let digest = code.digest();
        let pairing = self
            .state
            .pairings
            .get(&digest)
            .ok_or(RegistryError::UnknownPairing)?;
        if now >= pairing.expires_at {
            return Err(RegistryError::ExpiredPairing);
        }
        let credential = Secret::generate()?;
        let device_id = Secret::generate()?.to_hex();
        let mut next = self.state.clone();
        next.pairings.remove(&digest);
        next.devices.insert(
            credential.digest(),
            Device {
                id: device_id.clone(),
                assignment: DeviceAssignment {
                    site: next.site,
                    role: pairing.role,
                    revoked: false,
                },
            },
        );
        self.commit(next)?;
        Ok(Enrollment {
            device_id,
            credential,
        })
    }

    /// The caller checks manager authorization and site ownership first.
    pub fn revoke(&mut self, device_id: &str) -> Result<(), RegistryError> {
        let mut next = self.state.clone();
        let device = next
            .devices
            .values_mut()
            .find(|device| device.id == device_id)
            .ok_or(RegistryError::UnknownDevice)?;
        device.assignment.revoked = true;
        self.commit(next)
    }

    pub fn authorize(
        &self,
        credential: &Secret,
        site: Site,
        operation: Operation,
    ) -> Result<(), RegistryError> {
        let device = self
            .state
            .devices
            .get(&credential.digest())
            .ok_or(RegistryError::UnknownDevice)?;
        device
            .assignment
            .authorize(site, operation)
            .map_err(RegistryError::Denied)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SITE: Site = Site {
        company_id: 1,
        site_id: 2,
    };

    #[test]
    fn pairing_is_single_use_across_restarts_and_revocation_persists() {
        let dir = tempfile::tempdir().unwrap();
        let mut registry = Registry::create(dir.path(), SITE).unwrap();
        let pairing = registry
            .issue_pairing(DeviceRole::Kds { station_id: 7 }, 100)
            .unwrap();
        drop(registry);

        let mut registry = Registry::open(dir.path(), SITE).unwrap();
        let enrolled = registry.redeem(&pairing, 110).unwrap();
        let credential = Secret::from_hex(&enrolled.credential.to_hex()).unwrap();
        let disk = std::fs::read_to_string(dir.path().join("registry.json")).unwrap();
        assert!(!disk.contains(&credential.to_hex()));
        assert!(!disk.contains(&pairing.to_hex()));
        drop(registry);

        let mut registry = Registry::open(dir.path(), SITE).unwrap();
        assert!(matches!(
            registry.redeem(&pairing, 111),
            Err(RegistryError::UnknownPairing)
        ));
        let bump = Operation::BumpTicket { station_id: 7 };
        assert_eq!(registry.authorize(&credential, SITE, bump), Ok(()));
        assert_eq!(
            registry.authorize(&credential, SITE, Operation::TakePayment),
            Err(RegistryError::Denied(Denial::WrongRole))
        );
        registry.revoke(&enrolled.device_id).unwrap();
        drop(registry);

        let registry = Registry::open(dir.path(), SITE).unwrap();
        assert_eq!(
            registry.authorize(&credential, SITE, bump),
            Err(RegistryError::Denied(Denial::Revoked))
        );
    }

    #[test]
    fn rejects_expired_pairing_wrong_site_and_second_registry_owner() {
        let dir = tempfile::tempdir().unwrap();
        let mut registry = Registry::create(dir.path(), SITE).unwrap();
        let pairing = registry.issue_pairing(DeviceRole::Pos, 100).unwrap();
        assert!(matches!(
            registry.redeem(&pairing, 400),
            Err(RegistryError::ExpiredPairing)
        ));
        assert!(matches!(
            Registry::open(dir.path(), SITE),
            Err(RegistryError::Locked)
        ));
        drop(registry);
        assert!(matches!(
            Registry::create(dir.path(), SITE),
            Err(RegistryError::AlreadyInitialized)
        ));
        assert!(matches!(
            Registry::open(
                dir.path(),
                Site {
                    company_id: 9,
                    ..SITE
                }
            ),
            Err(RegistryError::WrongSite)
        ));
    }
}
