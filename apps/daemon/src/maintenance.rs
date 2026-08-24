use super::*;

pub(crate) fn notify_new_messages(enabled: bool, count: usize) {
    if !enabled || count == 0 {
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
    if cfg!(target_os = "macos") {
        let _ = Command::new("osascript").args(["-e", &script]).status();
    } else if cfg!(target_os = "linux") {
        let _ = Command::new("notify-send")
            .args(["-a", "Another Dimension", message])
            .status();
    } else if cfg!(target_os = "windows") {
        let ps_script = format!(
            "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null; \
             [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Another Dimension').Show(\
             [Windows.UI.Notifications.ToastNotification]::new(\
             [Windows.UI.Notifications.ToastText02]::new())); \
             $toast = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02); \
             $textNodes = $toast.GetElementsByTagName('text'); \
             $textNodes.Item(0).AppendChild($toast.CreateTextNode('Another Dimension')) | Out-Null; \
             $textNodes.Item(1).AppendChild($toast.CreateTextNode('{}')) | Out-Null; \
             $toast_notif = [Windows.UI.Notifications.ToastNotification]::new($toast); \
             [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Another Dimension').Show($toast_notif)",
             message
        );
        let mut cmd = Command::new("powershell");
        cmd.args(["-NoProfile", "-Command", &ps_script]);
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        let _ = cmd.status();
    } else {
        eprintln!("notification: {message}");
    }
}

pub(crate) fn deliver_device_change_commits(
    authority: &InviteAuthority,
    commits: &[crate::mls_session::DeviceRemovalCommit],
    ledger: &mut DeliveryLedger,
    store: &mut EncryptedStore,
    now: u64,
) -> Result<Vec<String>, RelayError> {
    let expires_at = now.saturating_add(10 * 60);
    let mut digests = Vec::new();
    for (conversation_id, commit, _) in commits {
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

/// Fetches the opaque inbox without holding any daemon state lock. The caller
/// must snapshot the relay binding (inbox URL + TLS pin) out of the guarded
/// state first, then process and acknowledge the returned items only after
/// the local transaction has committed.
pub(crate) fn fetch_inbox(
    inbox_url: &str,
    relay_tls_pin: Option<crate::trust::TlsCertificatePin>,
) -> Result<Option<(RelayClient, String, Vec<crate::relay_http::RelayItem>)>, RelayError> {
    let endpoint = RelayEndpoint::from_inbox_url_with_pin(inbox_url, relay_tls_pin)
        .map_err(|_| RelayError::InvalidEndpoint)?;
    let capability = endpoint.capability.clone();
    let client = RelayClient::new(endpoint);
    let items = client.sync_blocking()?;
    Ok(Some((client, capability, items)))
}

/// Processes a fetched inbox while the daemon state locks are held. No relay
/// network I/O occurs here. It tries each locally known conversation because
/// the relay envelope intentionally does not contain a conversation
/// identifier. Failed decryption never advances an MLS session.
pub(crate) fn process_inbox_items(
    authority: &mut InviteAuthority,
    catalog: &mut MlsSessionCatalog,
    store: &mut EncryptedStore,
    ledger: &mut DeliveryLedger,
    capability: &str,
    items: Vec<crate::relay_http::RelayItem>,
    now: u64,
) -> Result<(usize, Vec<String>), RelayError> {
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
                catalog.receive_delivery_unpersisted(conversation_id, &envelope.ciphertext)
            else {
                continue;
            };
            let checkpoint = catalog
                .checkpoint_bytes(conversation_id)
                .map_err(|_| RelayError::InvalidResponse)?;
            let mut mutations = vec![RecordMutation::Put(
                RecordClass::ProtocolSession,
                session_checkpoint_key(conversation_id),
                checkpoint,
            )];
            if let Some(plaintext) = plaintext {
                if let Some(descriptor) = attachment_descriptor_from_plaintext(&plaintext) {
                    let encoded = authority
                        .stage_received_attachment(&digest, descriptor)
                        .map_err(|_| RelayError::InvalidResponse)?;
                    mutations.push(RecordMutation::Put(
                        RecordClass::Attachment,
                        format!("received/{digest}"),
                        encoded,
                    ));
                    if authority
                        .stage_contact_message(
                            conversation_id,
                            b"[encrypted attachment]",
                            now,
                            true,
                        )
                        .is_ok()
                    {
                        mutations.push(RecordMutation::Put(
                            RecordClass::Contact,
                            "contacts/directory".into(),
                            authority
                                .contacts_snapshot_bytes()
                                .map_err(|_| RelayError::InvalidResponse)?,
                        ));
                    }
                } else if let Some(message) = decode_message_payload(&plaintext) {
                    if message.expires_at == 0 || message.expires_at > now {
                        let (key, encoded) =
                            encoded_message_record(conversation_id, &message, "incoming")
                                .map_err(|_| RelayError::InvalidResponse)?;
                        mutations.push(RecordMutation::Put(RecordClass::Message, key, encoded));
                        if authority
                            .stage_contact_message(
                                conversation_id,
                                message.text.as_bytes(),
                                now,
                                true,
                            )
                            .is_ok()
                        {
                            mutations.push(RecordMutation::Put(
                                RecordClass::Contact,
                                "contacts/directory".into(),
                                authority
                                    .contacts_snapshot_bytes()
                                    .map_err(|_| RelayError::InvalidResponse)?,
                            ));
                        }
                    }
                }
            }
            if ledger
                .register_recipient_received(&digest, item.id.clone())
                .is_err()
                || ledger.mark_decrypted(&digest).is_err()
            {
                return Err(RelayError::InvalidResponse);
            }
            mutations.push(RecordMutation::Put(
                RecordClass::Outbox,
                "delivery/ledger".into(),
                ledger
                    .encoded_bytes()
                    .map_err(|_| RelayError::InvalidResponse)?,
            ));
            if store.apply_batch(&mutations).is_err() {
                catalog.poison(conversation_id);
                let _ = authority.restore_contacts(store);
                let _ = authority.restore_received_attachments(store);
                if let Ok(restored) = DeliveryLedger::restore(store) {
                    *ledger = restored;
                }
                return Err(RelayError::InvalidResponse);
            }
            delivered = true;
            processed += 1;
            break;
        }
        if delivered {
            acknowledged_ids.push(item.id);
        }
    }
    ledger
        .persist(store)
        .map_err(|_| RelayError::InvalidResponse)?;
    Ok((processed, acknowledged_ids))
}
