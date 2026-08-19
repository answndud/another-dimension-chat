use super::{
    attachment_descriptor_from_plaintext, authorize_api, decode_message_payload,
    delivery_state_name, encoded_message_record, hex_bytes, json_escape, json_string, response,
    InviteAuthority, RelayEnvelope, RelayItem, Request, RouteContext,
};
use crate::{
    delivery::DeliveryLedger,
    mls_session::{session_checkpoint_key, MlsSessionCatalog},
    storage::{EncryptedStore, RecordClass, RecordMutation},
};
use sha2::{Digest, Sha256};

pub(crate) fn handle_delivery_route(
    request: &Request<'_>,
    context: &mut RouteContext<'_>,
) -> Option<Vec<u8>> {
    if request.method != "POST" || !request.path.starts_with("/local-api/delivery/") {
        return None;
    }
    if matches!(
        request.path,
        "/local-api/delivery/post"
            | "/local-api/delivery/retry"
            | "/local-api/delivery/sync"
            | "/local-api/delivery/ack"
    ) {
        // Network-bearing delivery routes are owned by the staged handlers in
        // http_server.rs. A direct in-process caller must fail closed instead
        // of reintroducing lock-held relay I/O through this legacy dispatcher.
        let _ = context;
        return Some(response(503, "staged_route_required", None, None));
    }
    Some(dispatch_delivery_route(request, context))
}

fn dispatch_delivery_route(request: &Request<'_>, context: &mut RouteContext<'_>) -> Vec<u8> {
    let bridge = &mut *context.bridge;
    let now = context.now;
    let session_store = &mut context.session_store;
    let delivery_ledger = &mut context.delivery_ledger;
    match (request.method, request.path) {
        ("POST", "/local-api/delivery/status") => {
            if let Err(reply) = authorize_api(bridge, request, now) {
                return reply;
            }
            let Some(digest) = json_string(request.body, "digest") else {
                return response(
                    400,
                    "invalid_delivery_digest",
                    None,
                    Some("application/json"),
                );
            };
            let Some(ledger) = delivery_ledger.as_deref() else {
                return response(503, "delivery_unavailable", None, Some("application/json"));
            };
            let Some(record) = ledger.get(digest) else {
                return response(404, "delivery_not_found", None, Some("application/json"));
            };
            let relay_id = record
                .relay_id
                .as_deref()
                .map(|value| format!(r##""{}""##, json_escape(value)))
                .unwrap_or_else(|| "null".to_owned());
            response(
                200,
                &format!(
                    r##"{{"digest":"{}","state":"{}","attempts":{},"next_retry_at":{},"relay_id":{}}}"##,
                    json_escape(&record.digest),
                    delivery_state_name(record.state),
                    record.attempts,
                    record
                        .next_retry_at
                        .map_or_else(|| "null".to_owned(), |value| value.to_string()),
                    relay_id
                ),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/delivery/cancel") => {
            if let Err(reply) = authorize_api(bridge, request, now) {
                return reply;
            }
            let Some(digest) = json_string(request.body, "digest") else {
                return response(
                    400,
                    "invalid_delivery_digest",
                    None,
                    Some("application/json"),
                );
            };
            let Some(ledger) = delivery_ledger.as_deref_mut() else {
                return response(503, "delivery_unavailable", None, None);
            };
            let cancelled = match ledger.cancel(digest) {
                Ok(value) => value,
                Err(_) => {
                    return response(404, "delivery_not_found", None, Some("application/json"))
                }
            };
            if cancelled {
                if let Some(store) = session_store.as_deref_mut() {
                    if ledger.persist(store).is_err() {
                        return response(503, "storage_unavailable", None, None);
                    }
                }
            }

            response(
                200,
                &format!(r##"{{"cancelled":{cancelled}}}"##),
                None,
                Some("application/json"),
            )
        }
        // Keep the dispatcher fail-closed even if a future caller bypasses the
        // prefix guard above. A malformed route must never terminate the daemon.
        _ => response(404, "not_found", None, None),
    }
}

pub(crate) struct SyncProcessResult {
    pub(crate) acknowledged_ids: Vec<String>,
    pub(crate) messages: Vec<String>,
}

pub(crate) struct SyncProcessContext<'a> {
    pub(crate) invite_authority: Option<&'a mut InviteAuthority>,
    pub(crate) catalog: &'a mut MlsSessionCatalog,
    pub(crate) store: &'a mut EncryptedStore,
    pub(crate) delivery_ledger: Option<&'a mut DeliveryLedger>,
}

/// Validates fetched relay items and performs only the local MLS/storage part
/// of delivery sync. Relay fetch and ACK are intentionally outside this
/// function so callers can release daemon state locks around network I/O.
pub(crate) fn process_sync_items(
    conversation_id: &str,
    background: bool,
    capability: &str,
    items: Vec<RelayItem>,
    now: u64,
    context: SyncProcessContext<'_>,
) -> Result<SyncProcessResult, Vec<u8>> {
    let SyncProcessContext {
        mut invite_authority,
        catalog,
        store,
        mut delivery_ledger,
    } = context;
    let mut validated_items = Vec::with_capacity(items.len());
    for item in items {
        let Some(wire) = item.envelope.strip_prefix("ADENV1.") else {
            return Err(response(
                502,
                "invalid_relay_envelope",
                None,
                Some("application/json"),
            ));
        };
        let Ok(envelope) = RelayEnvelope::from_wire(wire, now) else {
            return Err(response(
                502,
                "invalid_relay_envelope",
                None,
                Some("application/json"),
            ));
        };
        if envelope.mailbox != capability
            || hex_bytes(&Sha256::digest(item.envelope.as_bytes())) != item.id
        {
            return Err(response(
                502,
                "invalid_relay_envelope",
                None,
                Some("application/json"),
            ));
        }
        validated_items.push((item.id, envelope));
    }

    let mut acknowledged_ids = Vec::new();
    let mut messages = Vec::new();
    for (relay_id, envelope) in validated_items {
        let digest = envelope.digest().map_err(|_| {
            response(
                502,
                "invalid_relay_envelope",
                None,
                Some("application/json"),
            )
        })?;
        if delivery_ledger
            .as_deref()
            .and_then(|ledger| ledger.get(&digest))
            .is_some_and(|record| {
                matches!(
                    record.state,
                    crate::delivery::DeliveryState::RecipientReceived
                        | crate::delivery::DeliveryState::Decrypted
                )
            })
        {
            // The local transaction was already committed. Re-ACK the relay
            // item without feeding the same ciphertext into MLS again.
            acknowledged_ids.push(relay_id);
            continue;
        }
        let plaintext = catalog
            .receive_delivery_unpersisted(conversation_id, &envelope.ciphertext)
            .map_err(|_| {
                response(
                    409,
                    "message_decrypt_failed",
                    None,
                    Some("application/json"),
                )
            })?;
        let checkpoint = catalog.checkpoint_bytes(conversation_id).map_err(|_| {
            catalog.poison(conversation_id);
            response(503, "session_storage_unavailable", None, None)
        })?;
        let mut mutations = vec![RecordMutation::Put(
            RecordClass::ProtocolSession,
            session_checkpoint_key(conversation_id),
            checkpoint,
        )];
        let mut rendered_message = None;
        if let Some(plaintext) = plaintext {
            if let Some(descriptor) = attachment_descriptor_from_plaintext(&plaintext) {
                if let Some(authority) = invite_authority.as_deref_mut() {
                    let encoded = authority
                        .stage_received_attachment(&digest, descriptor)
                        .map_err(|_| {
                            catalog.poison(conversation_id);
                            response(503, "attachment_state_unavailable", None, None)
                        })?;
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
                            background,
                        )
                        .is_ok()
                    {
                        if let Ok(encoded) = authority.contacts_snapshot_bytes() {
                            mutations.push(RecordMutation::Put(
                                RecordClass::Contact,
                                "contacts/directory".into(),
                                encoded,
                            ));
                        }
                    }
                }
                rendered_message = Some(format!(
                    r##"{{"id":"{}","digest":"{}","attachment_id":"{}"}}"##,
                    json_escape(&relay_id),
                    json_escape(&digest),
                    json_escape(&digest)
                ));
            } else {
                let message = decode_message_payload(&plaintext);
                let expired = message
                    .as_ref()
                    .is_some_and(|item| item.expires_at != 0 && item.expires_at <= now);
                let display_text = message
                    .as_ref()
                    .map(|item| item.text.as_bytes())
                    .unwrap_or(&plaintext);
                if let Some(message) = message.as_ref().filter(|_| !expired) {
                    let (key, encoded) =
                        encoded_message_record(conversation_id, message, "incoming").map_err(
                            |_| {
                                catalog.poison(conversation_id);
                                response(503, "message_storage_unavailable", None, None)
                            },
                        )?;
                    mutations.push(RecordMutation::Put(RecordClass::Message, key, encoded));
                }
                if let Some(authority) = invite_authority.as_deref_mut() {
                    if !expired
                        && authority
                            .stage_contact_message(conversation_id, display_text, now, background)
                            .is_ok()
                    {
                        if let Ok(encoded) = authority.contacts_snapshot_bytes() {
                            mutations.push(RecordMutation::Put(
                                RecordClass::Contact,
                                "contacts/directory".into(),
                                encoded,
                            ));
                        }
                    }
                }
                let metadata = message
                    .as_ref()
                    .map(|item| {
                        format!(
                            r##","message_id":"{}","created_at":{},"expires_at":{},"expired":{}"##,
                            json_escape(&item.id),
                            item.created_at,
                            item.expires_at,
                            expired
                        )
                    })
                    .unwrap_or_default();
                rendered_message = Some(format!(
                    r##"{{"id":"{}","digest":"{}","plaintext":"{}"{} }}"##,
                    json_escape(&relay_id),
                    json_escape(&digest),
                    if expired {
                        "".to_owned()
                    } else {
                        hex_bytes(display_text)
                    },
                    metadata
                ));
            }
        }
        if let Some(ledger) = delivery_ledger.as_deref_mut() {
            if ledger
                .register_recipient_received(&digest, relay_id.clone())
                .is_err()
                || ledger.mark_decrypted(&digest).is_err()
            {
                catalog.poison(conversation_id);
                return Err(response(503, "delivery_state_unavailable", None, None));
            }
            let encoded = ledger
                .encoded_bytes()
                .map_err(|_| response(503, "delivery_state_unavailable", None, None))?;
            mutations.push(RecordMutation::Put(
                RecordClass::Outbox,
                "delivery/ledger".into(),
                encoded,
            ));
        }
        if store.apply_batch(&mutations).is_err() {
            catalog.poison(conversation_id);
            if let Some(authority) = invite_authority.as_deref_mut() {
                let _ = authority.restore_contacts(store);
                let _ = authority.restore_received_attachments(store);
            }
            if let Some(ledger) = delivery_ledger.as_deref_mut() {
                if let Ok(restored) = DeliveryLedger::restore(store) {
                    *ledger = restored;
                }
            }
            return Err(response(503, "message_storage_unavailable", None, None));
        }
        if let Some(rendered) = rendered_message {
            messages.push(rendered);
        }
        acknowledged_ids.push(relay_id);
    }
    Ok(SyncProcessResult {
        acknowledged_ids,
        messages,
    })
}
