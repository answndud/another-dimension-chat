use another_dimension_crypto::derive_production_safety_material;
use argon2::{Algorithm, Argon2, Params, Version};
use vodozemac::{
    base64_decode, base64_encode,
    olm::{Account, AccountPickle, OlmMessage, Session, SessionConfig, SessionPickle},
    Curve25519PublicKey,
};
use wasm_bindgen::prelude::*;

fn olm_error<E>(_: E) -> JsValue {
    JsValue::from_str("Olm ratchet operation failed. Discard the input and pair again.")
}

fn account_from_pickle(value: &str) -> Result<Account, JsValue> {
    serde_json::from_str::<AccountPickle>(value)
        .map(Account::from_pickle)
        .map_err(olm_error)
}

fn session_from_pickle(value: &str) -> Result<Session, JsValue> {
    serde_json::from_str::<SessionPickle>(value)
        .map(Session::from_pickle)
        .map_err(olm_error)
}

fn encode_olm_message(message: &OlmMessage) -> serde_json::Value {
    let (message_type, body) = message.to_parts();
    serde_json::json!({ "messageType": message_type, "body": base64_encode(body) })
}

fn decode_olm_message(message_type: u32, body: &str) -> Result<OlmMessage, JsValue> {
    let bytes = base64_decode(body).map_err(olm_error)?;
    OlmMessage::from_parts(message_type as usize, &bytes).map_err(olm_error)
}

fn serialized_session(session: &Session) -> Result<String, JsValue> {
    serde_json::to_string(&session.pickle()).map_err(olm_error)
}

fn serialized_account(account: &Account) -> Result<String, JsValue> {
    serde_json::to_string(&account.pickle()).map_err(olm_error)
}

fn setup_plaintext(kind: &str, transcript: &str) -> Vec<u8> {
    format!("AD-OLM-{kind}-V3|{transcript}").into_bytes()
}

#[wasm_bindgen]
pub fn safety_material(transcript: &str) -> String {
    let material = derive_production_safety_material(transcript);
    format!("{} · {}", material.number, material.phrase)
}

#[wasm_bindgen]
pub fn argon2id_profile_key(passphrase: &str, salt: &[u8]) -> Result<Vec<u8>, JsValue> {
    let params = Params::new(19_456, 2, 1, Some(32)).map_err(olm_error)?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut output = vec![0_u8; 32];
    argon2
        .hash_password_into(passphrase.as_bytes(), salt, &mut output)
        .map_err(olm_error)?;
    Ok(output)
}

#[wasm_bindgen]
pub fn olm_account_new() -> Result<String, JsValue> {
    let mut account = Account::new();
    let generated = account.generate_one_time_keys(10);
    account.mark_keys_as_published();
    let identity = account.identity_keys();
    let account_pickle = serialized_account(&account)?;
    serde_json::to_string(&serde_json::json!({
        "accountPickle": account_pickle,
        "ed25519Public": identity.ed25519.to_base64(),
        "curve25519Public": identity.curve25519.to_base64(),
        "oneTimePublicKeys": generated.created.iter().map(|key| key.to_base64()).collect::<Vec<_>>(),
    }))
    .map_err(olm_error)
}

#[wasm_bindgen]
pub fn olm_account_replenish(account_pickle: &str, count: usize) -> Result<String, JsValue> {
    let mut account = account_from_pickle(account_pickle)?;
    let generated = account.generate_one_time_keys(count.min(10));
    account.mark_keys_as_published();
    let account_pickle = serialized_account(&account)?;
    serde_json::to_string(&serde_json::json!({
        "accountPickle": account_pickle,
        "oneTimePublicKeys": generated.created.iter().map(|key| key.to_base64()).collect::<Vec<_>>(),
    }))
    .map_err(olm_error)
}

#[wasm_bindgen]
pub fn olm_account_revoke(account_pickle: &str, public_key: &str) -> Result<String, JsValue> {
    let mut account = account_from_pickle(account_pickle)?;
    let public_key = Curve25519PublicKey::from_base64(public_key).map_err(olm_error)?;
    account.remove_one_time_key(public_key);
    serialized_account(&account)
}

#[wasm_bindgen]
pub fn olm_outbound_start(
    account_pickle: &str,
    peer_curve25519: &str,
    peer_one_time: &str,
    transcript: &str,
) -> Result<String, JsValue> {
    let account = account_from_pickle(account_pickle)?;
    let peer_curve = Curve25519PublicKey::from_base64(peer_curve25519).map_err(olm_error)?;
    let peer_one_time = Curve25519PublicKey::from_base64(peer_one_time).map_err(olm_error)?;
    let mut session = account
        .create_outbound_session(SessionConfig::version_2(), peer_curve, peer_one_time)
        .map_err(olm_error)?;
    let message = session
        .encrypt(setup_plaintext("INIT", transcript))
        .map_err(olm_error)?;
    let session_pickle = serialized_session(&session)?;
    serde_json::to_string(&serde_json::json!({
        "sessionPickle": session_pickle,
        "message": encode_olm_message(&message),
    }))
    .map_err(olm_error)
}

#[wasm_bindgen]
pub fn olm_inbound_accept(
    account_pickle: &str,
    peer_curve25519: &str,
    message_type: u32,
    body: &str,
    transcript: &str,
) -> Result<String, JsValue> {
    let mut account = account_from_pickle(account_pickle)?;
    let peer_curve = Curve25519PublicKey::from_base64(peer_curve25519).map_err(olm_error)?;
    let pre_key = match decode_olm_message(message_type, body)? {
        OlmMessage::PreKey(message) => message,
        OlmMessage::Normal(_) => return Err(olm_error("expected pre-key message")),
    };
    let result = account
        .create_inbound_session(SessionConfig::version_2(), peer_curve, &pre_key)
        .map_err(olm_error)?;
    if result.plaintext != setup_plaintext("INIT", transcript) {
        return Err(olm_error("setup transcript mismatch"));
    }
    let mut session = result.session;
    let reply = session
        .encrypt(setup_plaintext("READY", transcript))
        .map_err(olm_error)?;
    let account_pickle = serialized_account(&account)?;
    let session_pickle = serialized_session(&session)?;
    serde_json::to_string(&serde_json::json!({
        "accountPickle": account_pickle,
        "sessionPickle": session_pickle,
        "message": encode_olm_message(&reply),
    }))
    .map_err(olm_error)
}

#[wasm_bindgen]
pub fn olm_outbound_finish(
    session_pickle: &str,
    message_type: u32,
    body: &str,
    transcript: &str,
) -> Result<String, JsValue> {
    let mut session = session_from_pickle(session_pickle)?;
    let plaintext = session
        .decrypt(&decode_olm_message(message_type, body)?)
        .map_err(olm_error)?;
    if plaintext != setup_plaintext("READY", transcript) {
        return Err(olm_error("setup transcript mismatch"));
    }
    serialized_session(&session)
}

#[wasm_bindgen]
pub fn olm_session_encrypt(session_pickle: &str, plaintext: &[u8]) -> Result<String, JsValue> {
    let mut session = session_from_pickle(session_pickle)?;
    let message = session.encrypt(plaintext).map_err(olm_error)?;
    let session_pickle = serialized_session(&session)?;
    serde_json::to_string(&serde_json::json!({
        "sessionPickle": session_pickle,
        "message": encode_olm_message(&message),
    }))
    .map_err(olm_error)
}

#[wasm_bindgen]
pub fn olm_session_decrypt(
    session_pickle: &str,
    message_type: u32,
    body: &str,
) -> Result<String, JsValue> {
    let mut session = session_from_pickle(session_pickle)?;
    let plaintext = session
        .decrypt(&decode_olm_message(message_type, body)?)
        .map_err(olm_error)?;
    let session_pickle = serialized_session(&session)?;
    serde_json::to_string(&serde_json::json!({
        "sessionPickle": session_pickle,
        "plaintext": base64_encode(plaintext),
    }))
    .map_err(olm_error)
}
