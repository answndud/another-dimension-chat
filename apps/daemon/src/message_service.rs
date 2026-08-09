use super::*;

const MESSAGE_PREFIX: &[u8] = b"ADMSG1.";

#[derive(serde::Deserialize, serde::Serialize)]
pub(crate) struct MessagePayload {
    pub(crate) id: String,
    pub(crate) created_at: u64,
    pub(crate) expires_at: u64,
    pub(crate) text: String,
}

#[derive(serde::Deserialize, serde::Serialize)]
pub(crate) struct StoredMessage {
    pub(crate) conversation_id: String,
    pub(crate) message_id: String,
    pub(crate) direction: String,
    pub(crate) created_at: u64,
    pub(crate) expires_at: u64,
    pub(crate) text: String,
}

pub(crate) fn message_record_key(conversation_id: &str, message_id: &str) -> String {
    format!(
        "messages/{}",
        hex_bytes(&Sha256::digest(
            format!("{conversation_id}\n{message_id}").as_bytes()
        ))
    )
}

pub(crate) fn encoded_message_record(
    conversation_id: &str,
    message: &MessagePayload,
    direction: &str,
) -> Result<(String, Vec<u8>), StorageError> {
    let record = StoredMessage {
        conversation_id: conversation_id.to_owned(),
        message_id: message.id.clone(),
        direction: direction.to_owned(),
        created_at: message.created_at,
        expires_at: message.expires_at,
        text: message.text.clone(),
    };
    let bytes = serde_json::to_vec(&record).map_err(|_| StorageError::CorruptStore)?;
    Ok((message_record_key(conversation_id, &message.id), bytes))
}

pub(crate) fn encode_message_payload(text: &str, now: u64, expires_at: u64) -> Option<Vec<u8>> {
    let mut id = [0_u8; 16];
    getrandom::fill(&mut id).ok()?;
    let payload = MessagePayload {
        id: hex_bytes(&id),
        created_at: now,
        expires_at,
        text: text.to_owned(),
    };
    let mut encoded = MESSAGE_PREFIX.to_vec();
    encoded.extend(serde_json::to_vec(&payload).ok()?);
    Some(encoded)
}

pub(crate) fn decode_message_payload(plaintext: &[u8]) -> Option<MessagePayload> {
    plaintext
        .strip_prefix(MESSAGE_PREFIX)
        .and_then(|value| serde_json::from_slice(value).ok())
}
