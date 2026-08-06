//! One-time device-link request and root-signed approval boundary.
//!
//! A link request contains only the new device's public key. The private key
//! is generated and retained by the requesting device; the approving device
//! never receives it.

use crate::identity::{AccountRootKey, DeviceCertificate, IdentityError};
use getrandom::fill as secure_random;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fmt;
use zeroize::Zeroizing;

const REQUEST_VERSION: u16 = 1;
const REQUEST_PREFIX: &str = "ADDLINKREQ1.";
const APPROVAL_PREFIX: &str = "ADDLINKAPP1.";
const REQUEST_ID_BYTES: usize = 16;
const CODE_BYTES: usize = 16;
const MAX_DEVICE_LINK_TTL: u64 = 10 * 60;

#[derive(Debug, Eq, PartialEq)]
pub enum DeviceLinkError {
    RandomnessUnavailable,
    InvalidRequest,
    InvalidCode,
    Expired,
    InvalidApproval,
    Identity(IdentityError),
}

impl fmt::Display for DeviceLinkError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(match self {
            Self::RandomnessUnavailable => "secure randomness is unavailable",
            Self::InvalidRequest => "device link request is invalid",
            Self::InvalidCode => "device link code is invalid",
            Self::Expired => "device link request has expired",
            Self::InvalidApproval => "device link approval is invalid",
            Self::Identity(_) => "device identity is invalid",
        })
    }
}

impl std::error::Error for DeviceLinkError {}

impl From<IdentityError> for DeviceLinkError {
    fn from(error: IdentityError) -> Self {
        Self::Identity(error)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct RequestWire {
    version: u16,
    request_id: String,
    device_id: String,
    device_public_key: String,
    protocol_package_hash: String,
    created_at: u64,
    expires_at: u64,
    request_digest: String,
    code_hash: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct ApprovalWire {
    version: u16,
    request_id: String,
    account_public_key: String,
    device_id: String,
    device_public_key: String,
    protocol_package_hash: String,
    issued_at: u64,
    expires_at: u64,
    signature: String,
}

/// Public request data that can be transferred by QR, paste, or a relay.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DeviceLinkRequest {
    request_id: [u8; REQUEST_ID_BYTES],
    device_id: String,
    device_public_key: [u8; 32],
    protocol_package_hash: [u8; 32],
    created_at: u64,
    expires_at: u64,
    request_digest: [u8; 32],
    code_hash: [u8; 32],
}

/// The requesting device keeps this seed locally until the approving device
/// returns an approval. It is never included in a request or approval.
#[derive(Debug)]
pub struct PendingDeviceKey {
    seed: Zeroizing<[u8; 32]>,
    request: DeviceLinkRequest,
}

impl PendingDeviceKey {
    pub fn create(
        device_id: impl Into<String>,
        protocol_package_hash: [u8; 32],
        now: u64,
    ) -> Result<(Self, String), DeviceLinkError> {
        let mut seed = [0_u8; 32];
        secure_random(&mut seed).map_err(|_| DeviceLinkError::RandomnessUnavailable)?;
        let mut request_id = [0_u8; REQUEST_ID_BYTES];
        secure_random(&mut request_id).map_err(|_| DeviceLinkError::RandomnessUnavailable)?;
        let mut code = [0_u8; CODE_BYTES];
        secure_random(&mut code).map_err(|_| DeviceLinkError::RandomnessUnavailable)?;
        let device_key = ed25519_dalek::SigningKey::from_bytes(&seed);
        let device_public_key = device_key.verifying_key().to_bytes();
        let device_id = device_id.into();
        let expires_at = now.saturating_add(MAX_DEVICE_LINK_TTL);
        let request_digest = digest_request(
            &request_id,
            &device_id,
            &device_public_key,
            &protocol_package_hash,
            now,
            expires_at,
        );
        let code_hash = hash_code(&code, &request_digest);
        let request = DeviceLinkRequest {
            request_id,
            device_id,
            device_public_key,
            protocol_package_hash,
            created_at: now,
            expires_at,
            request_digest,
            code_hash,
        };
        Ok((
            Self {
                seed: Zeroizing::new(seed),
                request,
            },
            format_code(&code),
        ))
    }

    pub fn request(&self) -> &DeviceLinkRequest {
        &self.request
    }

    pub fn seed_bytes(&self) -> Zeroizing<[u8; 32]> {
        self.seed.clone()
    }
}

impl DeviceLinkRequest {
    pub fn parse(value: &str) -> Result<Self, DeviceLinkError> {
        let encoded = value
            .strip_prefix(REQUEST_PREFIX)
            .ok_or(DeviceLinkError::InvalidRequest)?;
        let bytes = decode_hex(encoded).ok_or(DeviceLinkError::InvalidRequest)?;
        let wire: RequestWire =
            serde_json::from_slice(&bytes).map_err(|_| DeviceLinkError::InvalidRequest)?;
        if wire.version != REQUEST_VERSION {
            return Err(DeviceLinkError::InvalidRequest);
        }
        let request_id = fixed_hex::<REQUEST_ID_BYTES>(&wire.request_id)?;
        let device_public_key = fixed_hex::<32>(&wire.device_public_key)?;
        let protocol_package_hash = fixed_hex::<32>(&wire.protocol_package_hash)?;
        let request_digest = fixed_hex::<32>(&wire.request_digest)?;
        let code_hash = fixed_hex::<32>(&wire.code_hash)?;
        let expected_digest = digest_request(
            &request_id,
            &wire.device_id,
            &device_public_key,
            &protocol_package_hash,
            wire.created_at,
            wire.expires_at,
        );
        if expected_digest != request_digest || wire.expires_at <= wire.created_at {
            return Err(DeviceLinkError::InvalidRequest);
        }
        Ok(Self {
            request_id,
            device_id: wire.device_id,
            device_public_key,
            protocol_package_hash,
            created_at: wire.created_at,
            expires_at: wire.expires_at,
            request_digest,
            code_hash,
        })
    }

    pub fn encode(&self) -> Result<String, DeviceLinkError> {
        let wire = RequestWire {
            version: REQUEST_VERSION,
            request_id: hex(&self.request_id),
            device_id: self.device_id.clone(),
            device_public_key: hex(&self.device_public_key),
            protocol_package_hash: hex(&self.protocol_package_hash),
            created_at: self.created_at,
            expires_at: self.expires_at,
            request_digest: hex(&self.request_digest),
            code_hash: hex(&self.code_hash),
        };
        let bytes = serde_json::to_vec(&wire).map_err(|_| DeviceLinkError::InvalidRequest)?;
        Ok(format!("{REQUEST_PREFIX}{}", hex(&bytes)))
    }

    pub fn request_id(&self) -> String {
        hex(&self.request_id)
    }

    pub fn device_id(&self) -> &str {
        &self.device_id
    }

    pub fn device_public_key(&self) -> [u8; 32] {
        self.device_public_key
    }

    pub fn expires_at(&self) -> u64 {
        self.expires_at
    }

    pub fn approve(
        &self,
        code: &str,
        root: &AccountRootKey,
        now: u64,
    ) -> Result<DeviceLinkApproval, DeviceLinkError> {
        if now >= self.expires_at {
            return Err(DeviceLinkError::Expired);
        }
        let normalized = normalize_code(code).ok_or(DeviceLinkError::InvalidCode)?;
        let code_bytes = decode_hex(&normalized).ok_or(DeviceLinkError::InvalidCode)?;
        if code_bytes.len() != CODE_BYTES
            || hash_code(&code_bytes, &self.request_digest) != self.code_hash
        {
            return Err(DeviceLinkError::InvalidCode);
        }
        let certificate = root.issue_device_for_public_key(
            self.device_id.clone(),
            self.device_public_key,
            self.protocol_package_hash,
            now,
            self.expires_at,
        )?;
        Ok(DeviceLinkApproval {
            request_id: self.request_id,
            certificate,
        })
    }
}

pub struct DeviceLinkApproval {
    request_id: [u8; REQUEST_ID_BYTES],
    certificate: crate::identity::DeviceCertificate,
}

impl DeviceLinkApproval {
    pub fn certificate(&self) -> &DeviceCertificate {
        &self.certificate
    }

    pub fn encode(&self) -> Result<String, DeviceLinkError> {
        let wire = ApprovalWire {
            version: REQUEST_VERSION,
            request_id: hex(&self.request_id),
            account_public_key: hex(&self.certificate.account_public_key()),
            device_id: self.certificate.device_id().to_owned(),
            device_public_key: hex(&self.certificate.device_public_key()),
            protocol_package_hash: hex(&self.certificate.protocol_package_hash()),
            issued_at: self.certificate.issued_at(),
            expires_at: self.certificate.expires_at(),
            signature: hex(&self.certificate.signature()),
        };
        let bytes = serde_json::to_vec(&wire).map_err(|_| DeviceLinkError::InvalidApproval)?;
        Ok(format!("{APPROVAL_PREFIX}{}", hex(&bytes)))
    }

    pub fn parse(value: &str) -> Result<Self, DeviceLinkError> {
        let encoded = value
            .strip_prefix(APPROVAL_PREFIX)
            .ok_or(DeviceLinkError::InvalidApproval)?;
        let bytes = decode_hex(encoded).ok_or(DeviceLinkError::InvalidApproval)?;
        let wire: ApprovalWire =
            serde_json::from_slice(&bytes).map_err(|_| DeviceLinkError::InvalidApproval)?;
        if wire.version != REQUEST_VERSION {
            return Err(DeviceLinkError::InvalidApproval);
        }
        let request_id = fixed_hex::<REQUEST_ID_BYTES>(&wire.request_id)
            .map_err(|_| DeviceLinkError::InvalidApproval)?;
        let certificate = DeviceCertificate::from_parts(
            fixed_hex::<32>(&wire.account_public_key)
                .map_err(|_| DeviceLinkError::InvalidApproval)?,
            wire.device_id,
            fixed_hex::<32>(&wire.device_public_key)
                .map_err(|_| DeviceLinkError::InvalidApproval)?,
            fixed_hex::<32>(&wire.protocol_package_hash)
                .map_err(|_| DeviceLinkError::InvalidApproval)?,
            wire.issued_at,
            wire.expires_at,
            fixed_hex::<64>(&wire.signature).map_err(|_| DeviceLinkError::InvalidApproval)?,
            false,
        )
        .map_err(|_| DeviceLinkError::InvalidApproval)?;
        Ok(Self {
            request_id,
            certificate,
        })
    }

    pub fn verify_for(&self, request: &DeviceLinkRequest, now: u64) -> Result<(), DeviceLinkError> {
        if self.request_id != request.request_id
            || self.certificate.device_id() != request.device_id
            || self.certificate.device_public_key() != request.device_public_key
            || self.certificate.protocol_package_hash() != request.protocol_package_hash
        {
            return Err(DeviceLinkError::InvalidApproval);
        }
        self.certificate
            .verify(now)
            .map_err(DeviceLinkError::Identity)
    }
}

fn digest_request(
    request_id: &[u8; REQUEST_ID_BYTES],
    device_id: &str,
    device_public_key: &[u8; 32],
    protocol_package_hash: &[u8; 32],
    created_at: u64,
    expires_at: u64,
) -> [u8; 32] {
    let mut bytes = b"another-dimension/device-link-request/v1\0".to_vec();
    append_blob(&mut bytes, request_id);
    append_blob(&mut bytes, device_id.as_bytes());
    append_blob(&mut bytes, device_public_key);
    append_blob(&mut bytes, protocol_package_hash);
    bytes.extend_from_slice(&created_at.to_be_bytes());
    bytes.extend_from_slice(&expires_at.to_be_bytes());
    Sha256::digest(bytes).into()
}

fn hash_code(code: &[u8], request_digest: &[u8; 32]) -> [u8; 32] {
    let mut bytes = b"another-dimension/device-link-code/v1\0".to_vec();
    append_blob(&mut bytes, code);
    append_blob(&mut bytes, request_digest);
    Sha256::digest(bytes).into()
}

fn append_blob(output: &mut Vec<u8>, value: &[u8]) {
    output.extend_from_slice(&(value.len() as u32).to_be_bytes());
    output.extend_from_slice(value);
}

fn normalize_code(value: &str) -> Option<String> {
    let value: String = value
        .chars()
        .filter(|character| *character != '-' && !character.is_whitespace())
        .flat_map(char::to_uppercase)
        .collect();
    (value.len() == CODE_BYTES * 2 && value.bytes().all(|byte| byte.is_ascii_hexdigit()))
        .then_some(value)
}

fn format_code(code: &[u8; CODE_BYTES]) -> String {
    hex(code)
        .as_bytes()
        .chunks(4)
        .map(|chunk| String::from_utf8_lossy(chunk).into_owned())
        .collect::<Vec<_>>()
        .join("-")
        .to_ascii_uppercase()
}

fn fixed_hex<const N: usize>(value: &str) -> Result<[u8; N], DeviceLinkError> {
    let bytes = decode_hex(value).ok_or(DeviceLinkError::InvalidRequest)?;
    bytes
        .try_into()
        .map_err(|_| DeviceLinkError::InvalidRequest)
}

fn decode_hex(value: &str) -> Option<Vec<u8>> {
    if value.len() % 2 != 0 || !value.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return None;
    }
    (0..value.len())
        .step_by(2)
        .map(|offset| u8::from_str_radix(&value[offset..offset + 2], 16).ok())
        .collect()
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

#[cfg(test)]
mod tests {
    use super::{DeviceLinkError, PendingDeviceKey};
    use crate::{device::DeviceRegistry, identity::AccountRootKey};

    #[test]
    fn request_binds_code_to_public_key_and_root_approval() {
        let root = AccountRootKey::from_seed([61; 32]);
        let (pending, code) = PendingDeviceKey::create("phone", [9; 32], 100).unwrap();
        let request = pending.request();
        let encoded = request.encode().unwrap();
        let parsed = super::DeviceLinkRequest::parse(&encoded).unwrap();
        let approval = parsed.approve(&code, &root, 101).unwrap();
        approval.verify_for(&parsed, 101).unwrap();
        let restored = super::DeviceLinkApproval::parse(&approval.encode().unwrap()).unwrap();
        restored.verify_for(&parsed, 101).unwrap();
        let mut registry = DeviceRegistry::new(&root);
        registry
            .register(approval.certificate().clone(), 101)
            .unwrap();
        assert_eq!(registry.len(), 1);
        assert_eq!(pending.seed_bytes().len(), 32);
    }

    #[test]
    fn wrong_code_or_expired_request_is_rejected() {
        let root = AccountRootKey::from_seed([62; 32]);
        let (pending, code) = PendingDeviceKey::create("phone", [8; 32], 100).unwrap();
        let request =
            super::DeviceLinkRequest::parse(&pending.request().encode().unwrap()).unwrap();
        assert!(matches!(
            request.approve("0000", &root, 101),
            Err(DeviceLinkError::InvalidCode)
        ));
        assert!(matches!(
            request.approve(&code, &root, request.expires_at()),
            Err(DeviceLinkError::Expired)
        ));
    }
}
