//! Account-owned device registry. The registry stores public certificates and
//! revocation state; private root/device seeds remain in the encrypted store.

use crate::{
    identity::{AccountRootKey, DeviceCertificate, DeviceRevocation, IdentityError},
    model::DeviceState,
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug)]
pub struct DeviceRecord {
    certificate: DeviceCertificate,
    state: DeviceState,
    revoked_at: Option<u64>,
}

impl DeviceRecord {
    pub fn certificate(&self) -> &DeviceCertificate {
        &self.certificate
    }

    pub fn state(&self) -> DeviceState {
        self.state
    }

    pub fn revoked_at(&self) -> Option<u64> {
        self.revoked_at
    }
}

#[derive(Debug)]
pub struct DeviceRegistry {
    account_public_key: [u8; 32],
    devices: BTreeMap<String, DeviceRecord>,
}

#[derive(Debug, Eq, PartialEq)]
pub enum DeviceRegistryError {
    Identity(IdentityError),
    WrongAccount,
    DuplicateDevice,
    UnknownDevice,
    DeviceNotActive,
    Corrupt,
}

impl std::fmt::Display for DeviceRegistryError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Self::Identity(_) => "device certificate validation failed",
            Self::WrongAccount => "device certificate belongs to another account",
            Self::DuplicateDevice => "device is already registered",
            Self::UnknownDevice => "device is not registered",
            Self::DeviceNotActive => "device is not active",
            Self::Corrupt => "device registry is corrupt",
        })
    }
}

impl std::error::Error for DeviceRegistryError {}

impl From<IdentityError> for DeviceRegistryError {
    fn from(error: IdentityError) -> Self {
        Self::Identity(error)
    }
}

impl DeviceRegistry {
    pub fn new(root: &AccountRootKey) -> Self {
        Self {
            account_public_key: root.public_key(),
            devices: BTreeMap::new(),
        }
    }

    pub fn account_public_key(&self) -> [u8; 32] {
        self.account_public_key
    }

    pub fn belongs_to(&self, root: &AccountRootKey) -> bool {
        self.account_public_key == root.public_key()
    }

    pub fn encode(&self) -> Result<Vec<u8>, DeviceRegistryError> {
        let wire = RegistryWire {
            account_public_key: self.account_public_key.to_vec(),
            devices: self
                .devices
                .values()
                .map(|record| DeviceRecordWire {
                    account_public_key: record.certificate.account_public_key().to_vec(),
                    device_id: record.certificate.device_id().to_owned(),
                    device_public_key: record.certificate.device_public_key().to_vec(),
                    protocol_package_hash: record.certificate.protocol_package_hash().to_vec(),
                    issued_at: record.certificate.issued_at(),
                    expires_at: record.certificate.expires_at(),
                    signature: record.certificate.signature().to_vec(),
                    revoked: record.certificate.is_revoked(),
                    state: record.state,
                    revoked_at: record.revoked_at,
                })
                .collect(),
        };
        serde_json::to_vec(&wire).map_err(|_| DeviceRegistryError::Corrupt)
    }

    pub fn decode(bytes: &[u8]) -> Result<Self, DeviceRegistryError> {
        let wire: RegistryWire =
            serde_json::from_slice(bytes).map_err(|_| DeviceRegistryError::Corrupt)?;
        let account_public_key: [u8; 32] = wire
            .account_public_key
            .try_into()
            .map_err(|_| DeviceRegistryError::Corrupt)?;
        let mut devices = BTreeMap::new();
        for item in wire.devices {
            let certificate = DeviceCertificate::from_parts(
                item.account_public_key
                    .try_into()
                    .map_err(|_| DeviceRegistryError::Corrupt)?,
                item.device_id,
                item.device_public_key
                    .try_into()
                    .map_err(|_| DeviceRegistryError::Corrupt)?,
                item.protocol_package_hash
                    .try_into()
                    .map_err(|_| DeviceRegistryError::Corrupt)?,
                item.issued_at,
                item.expires_at,
                item.signature
                    .try_into()
                    .map_err(|_| DeviceRegistryError::Corrupt)?,
                item.revoked,
            )?;
            if certificate.account_public_key() != account_public_key
                || devices.contains_key(certificate.device_id())
            {
                return Err(DeviceRegistryError::Corrupt);
            }
            devices.insert(
                certificate.device_id().to_owned(),
                DeviceRecord {
                    certificate,
                    state: item.state,
                    revoked_at: item.revoked_at,
                },
            );
        }
        Ok(Self {
            account_public_key,
            devices,
        })
    }

    pub fn register(
        &mut self,
        certificate: DeviceCertificate,
        now: u64,
    ) -> Result<(), DeviceRegistryError> {
        if certificate.account_public_key() != self.account_public_key {
            return Err(DeviceRegistryError::WrongAccount);
        }
        certificate.verify(now)?;
        if self.devices.contains_key(certificate.device_id()) {
            return Err(DeviceRegistryError::DuplicateDevice);
        }
        let device_id = certificate.device_id().to_owned();
        self.devices.insert(
            device_id,
            DeviceRecord {
                certificate,
                state: DeviceState::Active,
                revoked_at: None,
            },
        );
        Ok(())
    }

    pub fn revoke(
        &mut self,
        root: &AccountRootKey,
        device_id: &str,
        revoked_at: u64,
    ) -> Result<DeviceRevocation, DeviceRegistryError> {
        if root.public_key() != self.account_public_key {
            return Err(DeviceRegistryError::WrongAccount);
        }
        let record = self
            .devices
            .get_mut(device_id)
            .ok_or(DeviceRegistryError::UnknownDevice)?;
        if record.state != DeviceState::Active {
            return Err(DeviceRegistryError::DeviceNotActive);
        }
        let revocation = root.revoke_device(&record.certificate, revoked_at)?;
        record.certificate.apply_revocation(&revocation)?;
        record.state = DeviceState::Revoked;
        record.revoked_at = Some(revoked_at);
        Ok(revocation)
    }

    pub fn authorize(&self, device_id: &str, now: u64) -> Result<(), DeviceRegistryError> {
        let record = self
            .devices
            .get(device_id)
            .ok_or(DeviceRegistryError::UnknownDevice)?;
        if record.state != DeviceState::Active {
            return Err(DeviceRegistryError::DeviceNotActive);
        }
        record.certificate.verify(now)?;
        Ok(())
    }

    pub fn get(&self, device_id: &str) -> Option<&DeviceRecord> {
        self.devices.get(device_id)
    }

    pub fn records(&self) -> impl Iterator<Item = &DeviceRecord> {
        self.devices.values()
    }

    pub fn len(&self) -> usize {
        self.devices.len()
    }

    pub fn is_empty(&self) -> bool {
        self.devices.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::{DeviceRegistry, DeviceRegistryError};
    use crate::{identity::AccountRootKey, model::DeviceState};

    #[test]
    fn registry_registers_authorizes_and_revokes_devices() {
        let root = AccountRootKey::from_seed([31; 32]);
        let device = root.issue_device("macbook", [7; 32], 100, 500).unwrap();
        let mut registry = DeviceRegistry::new(&root);
        registry
            .register(device.certificate().clone(), 200)
            .unwrap();
        assert_eq!(registry.len(), 1);
        assert_eq!(registry.authorize("macbook", 200), Ok(()));
        let revocation = registry.revoke(&root, "macbook", 250).unwrap();
        assert_eq!(revocation.device_id(), "macbook");
        assert_eq!(
            registry.get("macbook").unwrap().state(),
            DeviceState::Revoked
        );
        assert_eq!(
            registry.authorize("macbook", 250),
            Err(DeviceRegistryError::DeviceNotActive)
        );
        assert_eq!(
            registry.revoke(&root, "macbook", 260),
            Err(DeviceRegistryError::DeviceNotActive)
        );
    }

    #[test]
    fn registry_rejects_duplicate_and_foreign_devices() {
        let root = AccountRootKey::from_seed([32; 32]);
        let foreign = AccountRootKey::from_seed([33; 32]);
        let device = root.issue_device("macbook", [8; 32], 100, 500).unwrap();
        let foreign_device = foreign.issue_device("phone", [9; 32], 100, 500).unwrap();
        let mut registry = DeviceRegistry::new(&root);
        registry
            .register(device.certificate().clone(), 200)
            .unwrap();
        assert_eq!(
            registry.register(device.certificate().clone(), 200),
            Err(DeviceRegistryError::DuplicateDevice)
        );
        assert_eq!(
            registry.register(foreign_device.certificate().clone(), 200),
            Err(DeviceRegistryError::WrongAccount)
        );
    }

    #[test]
    fn registry_wire_round_trip_preserves_public_state_only() {
        let root = AccountRootKey::from_seed([34; 32]);
        let device = root.issue_device("laptop", [10; 32], 100, 500).unwrap();
        let mut registry = DeviceRegistry::new(&root);
        registry
            .register(device.certificate().clone(), 200)
            .unwrap();
        let encoded = registry.encode().unwrap();
        assert!(!encoded.windows(32).any(|window| window == &[10; 32]));
        let decoded = DeviceRegistry::decode(&encoded).unwrap();
        assert_eq!(decoded.len(), 1);
        assert_eq!(decoded.authorize("laptop", 200), Ok(()));
    }
}

#[derive(Debug, Deserialize, Serialize)]
struct RegistryWire {
    account_public_key: Vec<u8>,
    devices: Vec<DeviceRecordWire>,
}

#[derive(Debug, Deserialize, Serialize)]
struct DeviceRecordWire {
    account_public_key: Vec<u8>,
    device_id: String,
    device_public_key: Vec<u8>,
    protocol_package_hash: Vec<u8>,
    issued_at: u64,
    expires_at: u64,
    signature: Vec<u8>,
    revoked: bool,
    state: DeviceState,
    revoked_at: Option<u64>,
}
