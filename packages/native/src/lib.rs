#![forbid(unsafe_code)]

pub mod enrollment;
use serde::{Deserialize, Serialize};

/// Site numbers are scoped to their company.
#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub struct Site {
    pub company_id: u128,
    pub site_id: u128,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub enum DeviceRole {
    Pos,
    Kds { station_id: u128 },
    Manager,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Operation {
    EnterOrder,
    TakePayment,
    ReadTickets { station_id: u128 },
    BumpTicket { station_id: u128 },
    OpenAdmin,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Denial {
    Revoked,
    WrongSite,
    WrongRole,
}

/// Load this assignment from the site registry using the authenticated device
/// identity. Request bodies cannot supply their own assignment.
#[derive(Clone, Serialize, Deserialize)]
pub struct DeviceAssignment {
    pub site: Site,
    pub role: DeviceRole,
    pub revoked: bool,
}

impl DeviceAssignment {
    /// This gate limits device capabilities. Human permissions and commercial
    /// entitlements are additional checks for operations that require them.
    pub fn authorize(&self, target: Site, operation: Operation) -> Result<(), Denial> {
        if self.revoked {
            return Err(Denial::Revoked);
        }
        if self.site != target {
            return Err(Denial::WrongSite);
        }

        match (self.role, operation) {
            (DeviceRole::Pos, Operation::EnterOrder | Operation::TakePayment)
            | (DeviceRole::Manager, Operation::OpenAdmin) => Ok(()),
            (
                DeviceRole::Kds { station_id },
                Operation::ReadTickets {
                    station_id: target_station,
                }
                | Operation::BumpTicket {
                    station_id: target_station,
                },
            ) if station_id == target_station => Ok(()),
            _ => Err(Denial::WrongRole),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SITE: Site = Site {
        company_id: 1,
        site_id: 1,
    };

    #[test]
    fn kds_can_work_only_its_assigned_station() {
        let kds = DeviceAssignment {
            site: SITE,
            role: DeviceRole::Kds { station_id: 7 },
            revoked: false,
        };
        assert_eq!(
            kds.authorize(SITE, Operation::ReadTickets { station_id: 7 }),
            Ok(())
        );
        assert_eq!(
            kds.authorize(SITE, Operation::BumpTicket { station_id: 7 }),
            Ok(())
        );
        for operation in [
            Operation::ReadTickets { station_id: 8 },
            Operation::BumpTicket { station_id: 8 },
            Operation::EnterOrder,
            Operation::TakePayment,
            Operation::OpenAdmin,
        ] {
            assert_eq!(kds.authorize(SITE, operation), Err(Denial::WrongRole));
        }
    }

    #[test]
    fn pos_and_manager_have_distinct_device_permissions() {
        let pos = DeviceAssignment {
            site: SITE,
            role: DeviceRole::Pos,
            revoked: false,
        };
        let manager = DeviceAssignment {
            role: DeviceRole::Manager,
            ..pos
        };
        assert_eq!(pos.authorize(SITE, Operation::EnterOrder), Ok(()));
        assert_eq!(
            pos.authorize(SITE, Operation::OpenAdmin),
            Err(Denial::WrongRole)
        );
        assert_eq!(
            pos.authorize(SITE, Operation::ReadTickets { station_id: 7 }),
            Err(Denial::WrongRole)
        );
        assert_eq!(manager.authorize(SITE, Operation::OpenAdmin), Ok(()));
        assert_eq!(
            manager.authorize(SITE, Operation::TakePayment),
            Err(Denial::WrongRole)
        );
    }

    #[test]
    fn assignment_is_scoped_to_company_and_site_and_can_be_revoked() {
        let mut pos = DeviceAssignment {
            site: SITE,
            role: DeviceRole::Pos,
            revoked: false,
        };
        for other in [
            Site {
                company_id: 2,
                ..SITE
            },
            Site { site_id: 2, ..SITE },
        ] {
            assert_eq!(
                pos.authorize(other, Operation::EnterOrder),
                Err(Denial::WrongSite)
            );
        }
        pos.revoked = true;
        assert_eq!(
            pos.authorize(SITE, Operation::EnterOrder),
            Err(Denial::Revoked)
        );
    }
}
pub mod cloud_bridge;
pub mod local_store;
pub mod site;
pub mod standalone;
