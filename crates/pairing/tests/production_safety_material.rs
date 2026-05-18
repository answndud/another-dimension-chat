use another_dimension_crypto::derive_production_safety_material;
use another_dimension_identity::{ProductionPairwisePrivateKey, ProfileName};
use another_dimension_pairing::{
    production_pairing_payload_for, transcript, PairingPayload, ProductionPairingPayloadParams,
    DEFAULT_TTL_SECONDS,
};

#[test]
fn signed_production_payloads_derive_stable_safety_material() {
    let alice = production_payload(
        "alice",
        [41_u8; 32],
        "alice-nonce",
        "alice.onion",
        "alice-prekey",
        1_000,
    );
    let bob = production_payload(
        "bob",
        [42_u8; 32],
        "bob-nonce",
        "bob.onion",
        "bob-prekey",
        2_000,
    );

    let safety_transcript = transcript(&alice, &bob).expect("transcript");
    let reversed_transcript = transcript(&bob, &alice).expect("reversed transcript");
    let material = derive_production_safety_material(&safety_transcript);

    assert_eq!(safety_transcript, reversed_transcript);
    assert_eq!(material.number, "56950 60786 54421 15314 30423 39233");
    assert_eq!(material.phrase, "sha256-1ee8-7136-ea1d-69b8");
}

#[test]
fn production_safety_material_changes_when_signed_payload_changes() {
    let alice = production_payload(
        "alice",
        [51_u8; 32],
        "alice-nonce",
        "alice.onion",
        "alice-prekey",
        1_000,
    );
    let bob = production_payload(
        "bob",
        [52_u8; 32],
        "bob-nonce",
        "bob.onion",
        "bob-prekey",
        2_000,
    );
    let changed_bob = production_payload(
        "bob",
        [52_u8; 32],
        "bob-nonce",
        "bob-rotated.onion",
        "bob-prekey",
        2_000,
    );

    let original =
        derive_production_safety_material(&transcript(&alice, &bob).expect("transcript"));

    for changed_payload in [
        changed_bob,
        production_payload(
            "bob",
            [53_u8; 32],
            "bob-nonce",
            "bob.onion",
            "bob-prekey",
            2_000,
        ),
        production_payload(
            "bob",
            [52_u8; 32],
            "bob-nonce",
            "bob.onion",
            "bob-rotated-prekey",
            2_000,
        ),
        production_payload_with_capabilities(
            "bob",
            [52_u8; 32],
            "bob-nonce",
            "bob.onion",
            "bob-prekey",
            "prototype-production-pairing-v2",
            2_000,
        ),
    ] {
        assert_eq!(
            PairingPayload::decode(&changed_payload.encode().expect("payload encodes")),
            Ok(changed_payload.clone())
        );
        let changed = derive_production_safety_material(
            &transcript(&alice, &changed_payload).expect("changed transcript"),
        );
        assert_ne!(original, changed);
    }
}

fn production_payload(
    owner: &str,
    seed: [u8; 32],
    nonce: &str,
    endpoint: &str,
    prekey: &str,
    issued_at_local_ms: u128,
) -> PairingPayload {
    production_payload_with_capabilities(
        owner,
        seed,
        nonce,
        endpoint,
        prekey,
        "prototype-production-pairing-v1",
        issued_at_local_ms,
    )
}

fn production_payload_with_capabilities(
    owner: &str,
    seed: [u8; 32],
    nonce: &str,
    endpoint: &str,
    prekey: &str,
    capabilities: &str,
    issued_at_local_ms: u128,
) -> PairingPayload {
    let private_key =
        ProductionPairwisePrivateKey::from_ed25519_dalek_seed(seed).expect("valid seed");
    production_pairing_payload_for(
        &ProfileName::new(owner).expect("valid profile"),
        &private_key,
        ProductionPairingPayloadParams {
            pairing_nonce: nonce.to_string(),
            rendezvous_endpoint: endpoint.to_string(),
            endpoint_rotation_policy: "manual-v1".to_string(),
            protocol_capabilities: capabilities.to_string(),
            prekey_bundle: prekey.to_string(),
            issued_at_local_ms,
            ttl_seconds: DEFAULT_TTL_SECONDS,
        },
    )
    .expect("production payload")
}
