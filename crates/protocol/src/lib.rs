use std::collections::BTreeSet;

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MessageType {
    Data,
    Ack,
    Control,
}

impl MessageType {
    fn as_str(&self) -> &'static str {
        match self {
            Self::Data => "data",
            Self::Ack => "ack",
            Self::Control => "control",
        }
    }

    fn parse(value: &str) -> Result<Self, ProtocolError> {
        match value {
            "data" => Ok(Self::Data),
            "ack" => Ok(Self::Ack),
            "control" => Ok(Self::Control),
            _ => Err(ProtocolError::InvalidMessageType),
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Envelope {
    pub protocol_version: u16,
    pub channel_id: String,
    pub message_number: u64,
    pub message_type: MessageType,
    pub padded_ciphertext: Vec<u8>,
}

impl Envelope {
    pub fn encode(&self) -> String {
        format!(
            "ADENV1|{}|{}|{}|{}|{}",
            self.protocol_version,
            self.channel_id,
            self.message_number,
            self.message_type.as_str(),
            encode_hex(&self.padded_ciphertext)
        )
    }

    pub fn decode(value: &str) -> Result<Self, ProtocolError> {
        let parts = value.trim().split('|').collect::<Vec<_>>();
        if parts.len() != 6 || parts[0] != "ADENV1" {
            return Err(ProtocolError::InvalidEnvelope);
        }
        Ok(Self {
            protocol_version: parts[1]
                .parse()
                .map_err(|_| ProtocolError::InvalidEnvelope)?,
            channel_id: parts[2].to_string(),
            message_number: parts[3]
                .parse()
                .map_err(|_| ProtocolError::InvalidEnvelope)?,
            message_type: MessageType::parse(parts[4])?,
            padded_ciphertext: decode_hex(parts[5])?,
        })
    }
}

pub fn pad_to_bucket(payload: &[u8]) -> Result<Vec<u8>, ProtocolError> {
    let bucket = bucket_for_len(payload.len()).ok_or(ProtocolError::PayloadTooLarge)?;
    let mut padded = Vec::with_capacity(bucket);
    padded.extend_from_slice(payload);
    padded.resize(bucket, 0);
    Ok(padded)
}

pub fn trim_padding(payload: &[u8]) -> &[u8] {
    let end = payload
        .iter()
        .rposition(|byte| *byte != 0)
        .map(|index| index + 1)
        .unwrap_or(0);
    &payload[..end]
}

pub fn bucket_for_len(len: usize) -> Option<usize> {
    [256, 512, 1024, 2048, 4096, 8192]
        .into_iter()
        .find(|bucket| len <= *bucket)
}

#[derive(Debug, Eq, PartialEq)]
pub enum ProtocolError {
    PayloadTooLarge,
    InvalidEnvelope,
    InvalidMessageType,
    InvalidHex,
    InvalidMessageNumber,
    ReplayMessage,
    OldMessage,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReplayWindow {
    window_size: u64,
    highest_seen: u64,
    seen: BTreeSet<u64>,
}

impl ReplayWindow {
    pub fn new(window_size: u64) -> Result<Self, ProtocolError> {
        if window_size == 0 {
            return Err(ProtocolError::InvalidMessageNumber);
        }
        Ok(Self {
            window_size,
            highest_seen: 0,
            seen: BTreeSet::new(),
        })
    }

    pub fn accept(&mut self, message_number: u64) -> Result<(), ProtocolError> {
        if message_number == 0 {
            return Err(ProtocolError::InvalidMessageNumber);
        }
        let min_allowed = self
            .highest_seen
            .saturating_sub(self.window_size.saturating_sub(1));
        if self.highest_seen != 0 && message_number < min_allowed {
            return Err(ProtocolError::OldMessage);
        }
        if !self.seen.insert(message_number) {
            return Err(ProtocolError::ReplayMessage);
        }
        self.highest_seen = self.highest_seen.max(message_number);
        let min_allowed = self
            .highest_seen
            .saturating_sub(self.window_size.saturating_sub(1));
        self.seen.retain(|seen| *seen >= min_allowed);
        Ok(())
    }

    pub fn accept_after_decrypt<T, E>(
        &mut self,
        message_number: u64,
        decrypt: impl FnOnce() -> Result<T, E>,
    ) -> Result<T, E>
    where
        E: From<ProtocolError>,
    {
        let mut next = self.clone();
        next.accept(message_number)?;
        let plaintext = decrypt()?;
        *self = next;
        Ok(plaintext)
    }

    pub fn highest_seen(&self) -> u64 {
        self.highest_seen
    }

    pub fn encode_state(&self) -> String {
        let seen = self
            .seen
            .iter()
            .map(u64::to_string)
            .collect::<Vec<_>>()
            .join(",");
        format!(
            "ADREPLAY1|{}|{}|{}",
            self.window_size, self.highest_seen, seen
        )
    }

    pub fn decode_state(value: &str) -> Result<Self, ProtocolError> {
        let parts = value.trim().split('|').collect::<Vec<_>>();
        if parts.len() != 4 || parts[0] != "ADREPLAY1" {
            return Err(ProtocolError::InvalidEnvelope);
        }
        let window_size = parts[1]
            .parse::<u64>()
            .map_err(|_| ProtocolError::InvalidMessageNumber)?;
        if window_size == 0 {
            return Err(ProtocolError::InvalidMessageNumber);
        }
        let highest_seen = parts[2]
            .parse::<u64>()
            .map_err(|_| ProtocolError::InvalidMessageNumber)?;
        let mut seen = BTreeSet::new();
        if !parts[3].is_empty() {
            for item in parts[3].split(',') {
                let message_number = item
                    .parse::<u64>()
                    .map_err(|_| ProtocolError::InvalidMessageNumber)?;
                if message_number == 0 {
                    return Err(ProtocolError::InvalidMessageNumber);
                }
                seen.insert(message_number);
            }
        }
        if seen
            .iter()
            .any(|message_number| *message_number > highest_seen)
        {
            return Err(ProtocolError::InvalidMessageNumber);
        }
        let min_allowed = highest_seen.saturating_sub(window_size.saturating_sub(1));
        seen.retain(|message_number| *message_number >= min_allowed);
        Ok(Self {
            window_size,
            highest_seen,
            seen,
        })
    }
}

pub fn encode_hex(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push(HEX[(byte >> 4) as usize] as char);
        out.push(HEX[(byte & 0x0f) as usize] as char);
    }
    out
}

pub fn decode_hex(value: &str) -> Result<Vec<u8>, ProtocolError> {
    if !value.len().is_multiple_of(2) {
        return Err(ProtocolError::InvalidHex);
    }
    value
        .as_bytes()
        .chunks(2)
        .map(|chunk| {
            let high = hex_value(chunk[0])?;
            let low = hex_value(chunk[1])?;
            Ok((high << 4) | low)
        })
        .collect()
}

fn hex_value(byte: u8) -> Result<u8, ProtocolError> {
    match byte {
        b'0'..=b'9' => Ok(byte - b'0'),
        b'a'..=b'f' => Ok(byte - b'a' + 10),
        b'A'..=b'F' => Ok(byte - b'A' + 10),
        _ => Err(ProtocolError::InvalidHex),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pads_to_minimum_bucket() {
        let padded = pad_to_bucket(b"hello").expect("padding should work");
        assert_eq!(padded.len(), 256);
    }

    #[test]
    fn rejects_payloads_over_max_bucket() {
        let payload = vec![1_u8; 8193];
        assert_eq!(pad_to_bucket(&payload), Err(ProtocolError::PayloadTooLarge));
    }

    #[test]
    fn replay_window_rejects_duplicates_and_old_messages() {
        let mut window = ReplayWindow::new(3).expect("valid replay window");

        assert_eq!(window.accept(1), Ok(()));
        assert_eq!(window.accept(3), Ok(()));
        assert_eq!(window.accept(2), Ok(()));
        assert_eq!(window.accept(2), Err(ProtocolError::ReplayMessage));
        assert_eq!(window.accept(6), Ok(()));
        assert_eq!(window.accept(1), Err(ProtocolError::OldMessage));
        assert_eq!(window.highest_seen(), 6);
    }

    #[test]
    fn replay_window_accept_after_decrypt_does_not_commit_on_decrypt_error() {
        let mut window = ReplayWindow::new(3).expect("valid replay window");

        assert_eq!(
            window.accept_after_decrypt(7, || Err::<(), _>(ProtocolError::InvalidEnvelope)),
            Err(ProtocolError::InvalidEnvelope)
        );
        assert_eq!(window.highest_seen(), 0);
        assert_eq!(
            window.accept_after_decrypt(7, || Ok::<_, ProtocolError>("message")),
            Ok("message")
        );
        assert_eq!(window.highest_seen(), 7);
        assert_eq!(
            window.accept_after_decrypt(7, || Ok::<_, ProtocolError>("replay")),
            Err(ProtocolError::ReplayMessage)
        );
    }

    #[test]
    fn replay_window_state_round_trips() {
        let mut window = ReplayWindow::new(4).expect("valid replay window");
        window.accept(4).expect("accept first message");
        window.accept(6).expect("accept second message");

        let restored =
            ReplayWindow::decode_state(&window.encode_state()).expect("state should decode");

        assert_eq!(restored.highest_seen(), 6);
        assert_eq!(restored, window);
    }
}
