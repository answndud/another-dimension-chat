use super::*;

pub(crate) fn notify_new_messages(enabled: bool, count: usize) {
    if !enabled || count == 0 || !cfg!(target_os = "macos") {
        return;
    }
    let message = if count == 1 {
        "새 암호화 메시지가 도착했습니다."
    } else {
        "새 암호화 메시지가 도착했습니다. 앱을 열어 확인하세요."
    };
    let script = format!(
        "display notification {:?} with title \"Another Dimension\"",
        message
    );
    let _ = Command::new("osascript").args(["-e", &script]).status();
}

pub(crate) fn deliver_device_change_commits(
    authority: &InviteAuthority,
    commits: &[(String, Vec<u8>)],
    ledger: &mut DeliveryLedger,
    store: &mut EncryptedStore,
    now: u64,
) -> Result<Vec<String>, RelayError> {
    let expires_at = now.saturating_add(10 * 60);
    let mut digests = Vec::new();
    for (conversation_id, commit) in commits {
        let contact = authority
            .contacts
            .for_conversation(conversation_id)
            .ok_or(RelayError::InvalidEndpoint)?;
        let inbox_url = contact.inbox_url.ok_or(RelayError::InvalidEndpoint)?;
        let endpoint = RelayEndpoint::from_inbox_url_with_pin(&inbox_url, authority.relay_tls_pin)?;
        let envelope = RelayEnvelope::create(&endpoint.capability, commit, expires_at, now)
            .map_err(|_| RelayError::InvalidResponse)?;
        let digest = envelope.digest().map_err(|_| RelayError::InvalidResponse)?;
        let wire = envelope
            .to_wire()
            .map_err(|_| RelayError::InvalidResponse)?;
        ledger
            .register_encrypted_with_destination(
                digest.clone(),
                Some(wire),
                Some(envelope.expires_at),
                Some(inbox_url),
            )
            .map_err(|_| RelayError::InvalidResponse)?;
        let accepted = match RelayClient::new(endpoint).post_blocking(&envelope) {
            Ok(accepted) => accepted,
            Err(error) => {
                let _ = ledger.schedule_retry(&digest, now);
                let _ = ledger.persist(store);
                return Err(error);
            }
        };
        ledger
            .bind_relay_id(&digest, accepted.id)
            .map_err(|_| RelayError::InvalidResponse)?;
        ledger
            .transition(&digest, crate::delivery::DeliveryState::Queued)
            .map_err(|_| RelayError::InvalidResponse)?;
        ledger
            .transition(&digest, crate::delivery::DeliveryState::RelayAccepted)
            .map_err(|_| RelayError::InvalidResponse)?;
        digests.push(digest);
    }
    ledger
        .persist(store)
        .map_err(|_| RelayError::InvalidResponse)?;
    Ok(digests)
}

/// Retries only daemon-owned outbox records whose destination was persisted
/// with the encrypted ledger. A small per-tick bound prevents a dead relay
/// from monopolizing the single-thread daemon runtime after a restart.
pub(crate) fn retry_due_deliveries(
    authority: &mut InviteAuthority,
    ledger: &mut DeliveryLedger,
    store: &mut EncryptedStore,
    now: u64,
) -> usize {
    let due = ledger
        .due_retries(now)
        .into_iter()
        .take(MAX_AUTOMATIC_RETRIES_PER_TICK)
        .collect::<Vec<_>>();
    let mut accepted_count = 0;
    for record in due {
        let Some(destination) = record.destination.as_deref() else {
            continue;
        };
        let Some(wire) = record.wire.as_deref() else {
            continue;
        };
        let Ok(endpoint) =
            RelayEndpoint::from_inbox_url_with_pin(destination, authority.relay_tls_pin)
        else {
            let _ = ledger.mark_failed(&record.digest);
            continue;
        };
        let Ok(envelope) = RelayEnvelope::from_wire(wire, now) else {
            let _ = ledger.mark_failed(&record.digest);
            continue;
        };
        if envelope.mailbox != endpoint.capability {
            let _ = ledger.mark_failed(&record.digest);
            continue;
        }
        match RelayClient::new(endpoint).post_blocking(&envelope) {
            Ok(accepted) => {
                if ledger.bind_relay_id(&record.digest, accepted.id).is_ok()
                    && ledger
                        .transition(&record.digest, crate::delivery::DeliveryState::Queued)
                        .is_ok()
                    && ledger
                        .transition(
                            &record.digest,
                            crate::delivery::DeliveryState::RelayAccepted,
                        )
                        .is_ok()
                {
                    accepted_count += 1;
                } else {
                    let _ = ledger.mark_failed(&record.digest);
                }
            }
            Err(RelayError::Rejected(410)) => {
                let _ = authority.invalidate_relay_binding(store);
                let _ = ledger.mark_failed(&record.digest);
            }
            Err(_) => {
                let _ = ledger.schedule_retry(&record.digest, now);
            }
        }
        let _ = ledger.persist(store);
    }
    accepted_count
}

/// Performs one bounded daemon-owned inbox pass. It tries each locally known
/// conversation because the relay envelope intentionally does not contain a
/// conversation identifier. Failed decryption never advances an MLS session.
pub(crate) fn background_sync_once(
    authority: &mut InviteAuthority,
    catalog: &mut MlsSessionCatalog,
    store: &mut EncryptedStore,
    ledger: &mut DeliveryLedger,
    now: u64,
) -> Result<usize, RelayError> {
    let Some(inbox_url) = authority.inbox_url.clone() else {
        return Ok(0);
    };
    let endpoint = RelayEndpoint::from_inbox_url_with_pin(&inbox_url, authority.relay_tls_pin)
        .map_err(|_| RelayError::InvalidEndpoint)?;
    let capability = endpoint.capability.clone();
    let client = RelayClient::new(endpoint);
    let items = match client.sync_blocking() {
        Ok(items) => items,
        Err(RelayError::Rejected(410)) => {
            let _ = authority.invalidate_relay_binding(store);
            return Err(RelayError::Rejected(410));
        }
        Err(error) => return Err(error),
    };
    let conversation_ids = catalog.conversation_ids();
    let mut acknowledged_ids = Vec::new();
    let mut processed = 0;
    for item in items {
        let Some(wire) = item.envelope.strip_prefix("ADENV1.") else {
            return Err(RelayError::InvalidResponse);
        };
        let envelope =
            RelayEnvelope::from_wire(wire, now).map_err(|_| RelayError::InvalidResponse)?;
        if envelope.mailbox != capability
            || hex_bytes(&Sha256::digest(item.envelope.as_bytes())) != item.id
        {
            return Err(RelayError::InvalidResponse);
        }
        let digest = envelope.digest().map_err(|_| RelayError::InvalidResponse)?;
        if ledger
            .get(&digest)
            .is_some_and(|record| record.state == crate::delivery::DeliveryState::Decrypted)
        {
            acknowledged_ids.push(item.id);
            continue;
        }
        let mut delivered = false;
        for conversation_id in &conversation_ids {
            let Ok(plaintext) =
                catalog.receive_delivery(conversation_id, &envelope.ciphertext, store)
            else {
                continue;
            };
            if ledger
                .register_recipient_received(&digest, item.id.clone())
                .is_err()
                || ledger.mark_decrypted(&digest).is_err()
            {
                return Err(RelayError::InvalidResponse);
            }
            if let Some(plaintext) = plaintext {
                if let Some(descriptor) = attachment_descriptor_from_plaintext(&plaintext) {
                    authority
                        .register_received_attachment(&digest, descriptor, store)
                        .map_err(|_| RelayError::InvalidResponse)?;
                    let _ = authority.record_contact_message(
                        conversation_id,
                        b"[encrypted attachment]",
                        now,
                        true,
                        store,
                    );
                } else if let Some(message) = decode_message_payload(&plaintext) {
                    if message.expires_at == 0 || message.expires_at > now {
                        persist_message(store, conversation_id, &message, "incoming")
                            .map_err(|_| RelayError::InvalidResponse)?;
                        let _ = authority.record_contact_message(
                            conversation_id,
                            message.text.as_bytes(),
                            now,
                            true,
                            store,
                        );
                    }
                }
            }
            delivered = true;
            processed += 1;
            break;
        }
        if delivered {
            acknowledged_ids.push(item.id);
        }
    }
    if !acknowledged_ids.is_empty() {
        client.ack_blocking(&acknowledged_ids)?;
    }
    ledger
        .persist(store)
        .map_err(|_| RelayError::InvalidResponse)?;
    Ok(processed)
}
