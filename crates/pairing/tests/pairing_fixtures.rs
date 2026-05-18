use another_dimension_identity::{
    PairwiseIdentity, PairwisePrivateKey, PairwisePublicKey, PairwiseSignature, ProfileName,
};
use another_dimension_pairing::{transcript, PairingPayload, DEFAULT_TTL_SECONDS};

const ALICE_CANONICAL_HEX: &str = "414450414952322d43414e4f4e4943414c000011616e6f746865722d64696d656e73696f6e001270616972696e672d7061796c6f61642d76310005616c696365000b616c6963652d6e6f6e63650009616c6963652d707562000b616c6963652e6f6e696f6e00096d616e75616c2d7631000970726f746f74797065001350656e64696e6743727970746f44657369676e000000000000000000000000000003e80000000000000258";
const ALICE_SIGNATURE: &str = "dev-sign-v1-09e17a93ef4fd23f";
const BOB_CANONICAL_HEX: &str = "414450414952322d43414e4f4e4943414c000011616e6f746865722d64696d656e73696f6e001270616972696e672d7061796c6f61642d76310003626f620009626f622d6e6f6e63650007626f622d7075620009626f622e6f6e696f6e00096d616e75616c2d7631000970726f746f74797065001350656e64696e6743727970746f44657369676e000000000000000000000000000007d00000000000000258";
const BOB_SIGNATURE: &str = "dev-sign-v1-a3064b907effe2d7";
const SAFETY_TRANSCRIPT: &str = "ADPAIR-SAFETY-V1|414450414952322d43414e4f4e4943414c000011616e6f746865722d64696d656e73696f6e001270616972696e672d7061796c6f61642d76310003626f620009626f622d6e6f6e63650007626f622d7075620009626f622e6f6e696f6e00096d616e75616c2d7631000970726f746f74797065001350656e64696e6743727970746f44657369676e000000000000000000000000000007d00000000000000258|414450414952322d43414e4f4e4943414c000011616e6f746865722d64696d656e73696f6e001270616972696e672d7061796c6f61642d76310005616c696365000b616c6963652d6e6f6e63650009616c6963652d707562000b616c6963652e6f6e696f6e00096d616e75616c2d7631000970726f746f74797065001350656e64696e6743727970746f44657369676e000000000000000000000000000003e80000000000000258";

#[test]
fn canonical_pairing_payload_fixture_is_stable() {
    let alice = fixture_payload("alice", "alice-nonce", "alice-pub", "alice.onion", 1_000);

    assert_eq!(
        hex(&alice.canonical_bytes().expect("canonical bytes")),
        ALICE_CANONICAL_HEX
    );
    assert_eq!(alice.pairwise_signature.as_str(), ALICE_SIGNATURE);
    assert_eq!(
        alice.encode().expect("payload encodes"),
        format!("ADPAIR2|{ALICE_CANONICAL_HEX}|{ALICE_SIGNATURE}")
    );
}

#[test]
fn safety_transcript_fixture_is_stable_and_order_independent() {
    let alice = fixture_payload("alice", "alice-nonce", "alice-pub", "alice.onion", 1_000);
    let bob = fixture_payload("bob", "bob-nonce", "bob-pub", "bob.onion", 2_000);

    assert_eq!(
        hex(&bob.canonical_bytes().expect("canonical bytes")),
        BOB_CANONICAL_HEX
    );
    assert_eq!(bob.pairwise_signature.as_str(), BOB_SIGNATURE);
    assert_eq!(
        transcript(&alice, &bob).expect("transcript"),
        SAFETY_TRANSCRIPT
    );
    assert_eq!(
        transcript(&bob, &alice).expect("transcript"),
        SAFETY_TRANSCRIPT
    );
}

#[test]
fn fixture_signature_rejects_canonical_tampering() {
    let alice = fixture_payload("alice", "alice-nonce", "alice-pub", "alice.onion", 1_000);
    let mut canonical = alice.canonical_bytes().expect("canonical bytes");
    let last = canonical.len() - 1;
    canonical[last] ^= 0x01;

    assert!(alice.pairwise_public_key.verify_pairing_signature(
        &alice.canonical_bytes().expect("canonical bytes"),
        &alice.pairwise_signature
    ));
    assert!(!alice
        .pairwise_public_key
        .verify_pairing_signature(&canonical, &alice.pairwise_signature));
}

fn fixture_payload(
    owner: &str,
    nonce: &str,
    public_key: &str,
    endpoint: &str,
    issued_at_local_ms: u128,
) -> PairingPayload {
    let mut payload = PairingPayload {
        owner_profile: ProfileName::new(owner).expect("valid profile"),
        pairing_nonce: nonce.to_string(),
        pairwise_public_key: PairwisePublicKey::new(public_key).expect("valid public key"),
        pairwise_signature: PairwiseSignature::new("unsigned").expect("valid signature"),
        rendezvous_endpoint: endpoint.to_string(),
        endpoint_rotation_policy: "manual-v1".to_string(),
        protocol_capabilities: "prototype".to_string(),
        prekey_bundle: "PendingCryptoDesign".to_string(),
        issued_at_local_ms,
        ttl_seconds: DEFAULT_TTL_SECONDS,
    };
    let private_key =
        PairwisePrivateKey::new(format!("dev-priv-for-{public_key}")).expect("valid private key");
    let identity =
        PairwiseIdentity::new(payload.pairwise_public_key.clone(), private_key).expect("identity");
    payload.pairwise_signature = identity.sign_pairing_payload(
        &payload
            .canonical_bytes()
            .expect("canonical payload should build"),
    );
    payload
}

fn hex(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push(HEX[(byte >> 4) as usize] as char);
        out.push(HEX[(byte & 0x0f) as usize] as char);
    }
    out
}
