use super::*;

pub(crate) fn handle_delivery_route(
    request: &Request<'_>,
    context: &mut RouteContext<'_>,
) -> Option<Vec<u8>> {
    if request.method != "POST" || !request.path.starts_with("/local-api/delivery/") {
        return None;
    }
    Some(dispatch_delivery_route(request, context))
}

fn dispatch_delivery_route(request: &Request<'_>, context: &mut RouteContext<'_>) -> Vec<u8> {
    let bridge = &mut *context.bridge;
    let now = context.now;
    let invite_authority = &mut context.invite_authority;
    let session_catalog = &mut context.session_catalog;
    let session_store = &mut context.session_store;
    let delivery_ledger = &mut context.delivery_ledger;
    match (request.method, request.path) {
        ("POST", "/local-api/delivery/post") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            if !pairing_ready(invite_authority.as_deref()) {
                return response(403, "pairing_not_ready", None, Some("application/json"));
            }
            let Some(inbox_url) = json_string(request.body, "inbox_url") else {
                return response(400, "invalid_inbox_url", None, Some("application/json"));
            };
            let Some(ciphertext) = json_string(request.body, "ciphertext").and_then(hex_decode)
            else {
                return response(400, "invalid_ciphertext", None, Some("application/json"));
            };
            let Some(expires_at) = json_u64(request.body, "expires_at") else {
                return response(400, "invalid_expiry", None, Some("application/json"));
            };
            let Ok(endpoint) = RelayEndpoint::from_inbox_url_with_pin(
                inbox_url,
                invite_authority
                    .as_deref()
                    .and_then(|authority| authority.relay_tls_pin),
            ) else {
                return response(
                    422,
                    "unsupported_relay_endpoint",
                    None,
                    Some("application/json"),
                );
            };
            let Ok(envelope) =
                RelayEnvelope::create(&endpoint.capability, &ciphertext, expires_at, now)
            else {
                return response(
                    422,
                    "invalid_delivery_envelope",
                    None,
                    Some("application/json"),
                );
            };
            let Ok(digest) = envelope.digest() else {
                return response(
                    422,
                    "invalid_delivery_envelope",
                    None,
                    Some("application/json"),
                );
            };
            let Ok(wire) = envelope.to_wire() else {
                return response(
                    422,
                    "invalid_delivery_envelope",
                    None,
                    Some("application/json"),
                );
            };
            let Some(ledger) = delivery_ledger.as_deref_mut() else {
                return response(503, "delivery_unavailable", None, None);
            };
            if ledger
                .register_encrypted_with_destination(
                    digest.clone(),
                    Some(wire),
                    Some(envelope.expires_at),
                    Some(inbox_url.to_owned()),
                )
                .is_err()
            {
                return response(409, "duplicate_delivery", None, Some("application/json"));
            }
            let client = RelayClient::new(endpoint);
            let accepted = match client.post_blocking(&envelope) {
                Ok(value) => value,
                Err(RelayError::Rejected(410)) => {
                    if let (Some(authority), Some(store)) = (
                        invite_authority.as_deref_mut(),
                        session_store.as_deref_mut(),
                    ) {
                        let _ = authority.invalidate_relay_binding(store);
                    }
                    return response(
                        409,
                        "relay_capability_expired",
                        None,
                        Some("application/json"),
                    );
                }
                Err(_) => {
                    let _ = ledger.schedule_retry(&digest, now);
                    if let Some(store) = session_store.as_deref_mut() {
                        let _ = ledger.persist(store);
                    }
                    return response(
                        503,
                        &format!(
                            r##"{{"error":"relay_unavailable","digest":"{}","state":"retryable"}}"##,
                            json_escape(&digest)
                        ),
                        None,
                        Some("application/json"),
                    );
                }
            };
            if ledger.bind_relay_id(&digest, &accepted.id).is_err() {
                return response(503, "delivery_state_unavailable", None, None);
            }
            let _ = ledger.transition(&digest, crate::delivery::DeliveryState::Queued);
            let _ = ledger.transition(&digest, crate::delivery::DeliveryState::RelayAccepted);
            if let Some(store) = session_store.as_deref_mut() {
                if ledger.persist(store).is_err() {
                    return response(503, "storage_unavailable", None, None);
                }
            }
            response(
                202,
                &format!(
                    r##"{{"accepted":true,"id":"{}","digest":"{}","state":"relay-accepted"}}"##,
                    json_escape(&accepted.id),
                    json_escape(&digest)
                ),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/delivery/status") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
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
            if let Err(reply) = authorize_api(bridge, &request, now) {
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
            let cancelled = match ledger.cancel(&digest) {
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
        ("POST", "/local-api/delivery/retry") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            if !pairing_ready(invite_authority.as_deref()) {
                return response(403, "pairing_not_ready", None, Some("application/json"));
            }
            let Some(inbox_url) = json_string(request.body, "inbox_url") else {
                return response(400, "invalid_inbox_url", None, Some("application/json"));
            };
            let Some(digest) = json_string(request.body, "digest") else {
                return response(
                    400,
                    "invalid_delivery_digest",
                    None,
                    Some("application/json"),
                );
            };
            let Ok(endpoint) = RelayEndpoint::from_inbox_url_with_pin(
                inbox_url,
                invite_authority
                    .as_deref()
                    .and_then(|authority| authority.relay_tls_pin),
            ) else {
                return response(
                    422,
                    "unsupported_relay_endpoint",
                    None,
                    Some("application/json"),
                );
            };
            let Some(ledger) = delivery_ledger.as_deref_mut() else {
                return response(503, "delivery_unavailable", None, Some("application/json"));
            };
            let Some(record) = ledger.get(digest).cloned() else {
                return response(404, "delivery_not_found", None, Some("application/json"));
            };
            if record.state == crate::delivery::DeliveryState::Failed {
                return response(
                    409,
                    "delivery_retry_exhausted",
                    None,
                    Some("application/json"),
                );
            }
            if record.state != crate::delivery::DeliveryState::Retryable {
                return response(
                    409,
                    "delivery_not_retryable",
                    None,
                    Some("application/json"),
                );
            }
            if record.next_retry_at.is_some_and(|retry_at| retry_at > now) {
                return response(
                    429,
                    "delivery_retry_backoff",
                    None,
                    Some("application/json"),
                );
            }
            let Some(wire) = record.wire else {
                return response(
                    409,
                    "delivery_not_retriable",
                    None,
                    Some("application/json"),
                );
            };
            let Ok(envelope) = RelayEnvelope::from_wire(&wire, now) else {
                return response(
                    409,
                    "delivery_not_retriable",
                    None,
                    Some("application/json"),
                );
            };
            if envelope.mailbox != endpoint.capability {
                return response(
                    422,
                    "delivery_endpoint_mismatch",
                    None,
                    Some("application/json"),
                );
            }
            let accepted = match RelayClient::new(endpoint).post_blocking(&envelope) {
                Ok(value) => value,
                Err(RelayError::Rejected(410)) => {
                    if let (Some(authority), Some(store)) = (
                        invite_authority.as_deref_mut(),
                        session_store.as_deref_mut(),
                    ) {
                        let _ = authority.invalidate_relay_binding(store);
                    }
                    return response(
                        409,
                        "relay_capability_expired",
                        None,
                        Some("application/json"),
                    );
                }
                Err(_) => {
                    let _ = ledger.schedule_retry(digest, now);
                    if let Some(store) = session_store.as_deref_mut() {
                        let _ = ledger.persist(store);
                    }
                    return response(503, "relay_unavailable", None, Some("application/json"));
                }
            };
            if ledger.bind_relay_id(digest, &accepted.id).is_err()
                || ledger
                    .transition(digest, crate::delivery::DeliveryState::Queued)
                    .is_err()
                || ledger
                    .transition(digest, crate::delivery::DeliveryState::RelayAccepted)
                    .is_err()
            {
                return response(503, "delivery_state_unavailable", None, None);
            }
            if let Some(store) = session_store.as_deref_mut() {
                if ledger.persist(store).is_err() {
                    return response(503, "storage_unavailable", None, None);
                }
            }
            response(
                202,
                &format!(
                    r##"{{"accepted":true,"id":"{}","digest":"{}","state":"relay-accepted"}}"##,
                    json_escape(&accepted.id),
                    json_escape(digest)
                ),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/delivery/sync") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            if !pairing_ready(invite_authority.as_deref()) {
                return response(403, "pairing_not_ready", None, Some("application/json"));
            }
            let Some(inbox_url) = json_string(request.body, "inbox_url") else {
                return response(400, "invalid_inbox_url", None, Some("application/json"));
            };
            let Some(conversation_id) = json_string(request.body, "conversation_id") else {
                return response(400, "invalid_conversation", None, Some("application/json"));
            };
            if invite_authority.as_deref().is_some_and(|authority| {
                authority.contacts.is_blocked_conversation(&conversation_id)
            }) {
                return response(403, "contact_blocked", None, Some("application/json"));
            }
            let background = json_bool(request.body, "background").unwrap_or(false);
            let Ok(endpoint) = RelayEndpoint::from_inbox_url_with_pin(
                inbox_url,
                invite_authority
                    .as_deref()
                    .and_then(|authority| authority.relay_tls_pin),
            ) else {
                return response(
                    422,
                    "unsupported_relay_endpoint",
                    None,
                    Some("application/json"),
                );
            };
            let capability = endpoint.capability.clone();
            let client = RelayClient::new(endpoint);
            let items = match client.sync_blocking() {
                Ok(items) => items,
                Err(RelayError::Rejected(410)) => {
                    if let (Some(authority), Some(store)) = (
                        invite_authority.as_deref_mut(),
                        session_store.as_deref_mut(),
                    ) {
                        let _ = authority.invalidate_relay_binding(store);
                    }
                    return response(
                        409,
                        "relay_capability_expired",
                        None,
                        Some("application/json"),
                    );
                }
                Err(_) => {
                    return response(503, "relay_unavailable", None, Some("application/json"))
                }
            };
            let mut validated_items = Vec::with_capacity(items.len());
            for item in items {
                let Some(wire) = item.envelope.strip_prefix("ADENV1.") else {
                    return response(
                        502,
                        "invalid_relay_envelope",
                        None,
                        Some("application/json"),
                    );
                };
                let Ok(envelope) = RelayEnvelope::from_wire(wire, now) else {
                    return response(
                        502,
                        "invalid_relay_envelope",
                        None,
                        Some("application/json"),
                    );
                };
                if envelope.mailbox != capability
                    || hex_bytes(&Sha256::digest(item.envelope.as_bytes())) != item.id
                {
                    return response(
                        502,
                        "invalid_relay_envelope",
                        None,
                        Some("application/json"),
                    );
                }
                validated_items.push((item.id, envelope));
            }
            let Some(catalog) = session_catalog.as_deref_mut() else {
                return response(503, "session_unavailable", None, Some("application/json"));
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, Some("application/json"));
            };
            let mut acknowledged_ids = Vec::new();
            let mut messages = Vec::new();
            for (relay_id, envelope) in validated_items {
                let digest = match envelope.digest() {
                    Ok(value) => value,
                    Err(_) => {
                        return response(
                            502,
                            "invalid_relay_envelope",
                            None,
                            Some("application/json"),
                        );
                    }
                };
                if delivery_ledger
                    .as_deref()
                    .and_then(|ledger| ledger.get(&digest))
                    .is_some_and(|record| record.state == crate::delivery::DeliveryState::Decrypted)
                {
                    acknowledged_ids.push(relay_id);
                    continue;
                }
                let plaintext = match catalog.receive(conversation_id, &envelope.ciphertext, store)
                {
                    Ok(value) => value,
                    Err(_) => {
                        return response(
                            409,
                            "message_decrypt_failed",
                            None,
                            Some("application/json"),
                        );
                    }
                };
                if let Some(ledger) = delivery_ledger.as_deref_mut() {
                    if ledger
                        .register_recipient_received(&digest, relay_id.clone())
                        .is_err()
                        || ledger.mark_decrypted(&digest).is_err()
                    {
                        return response(503, "delivery_state_unavailable", None, None);
                    }
                    if ledger.persist(store).is_err() {
                        return response(503, "storage_unavailable", None, None);
                    }
                }
                let attachment = attachment_descriptor_from_plaintext(&plaintext);
                if let Some(descriptor) = attachment {
                    if let Some(authority) = invite_authority.as_deref_mut() {
                        if authority
                            .register_received_attachment(&digest, descriptor, store)
                            .is_err()
                        {
                            return response(503, "attachment_state_unavailable", None, None);
                        }
                        let _ = authority.record_contact_message(
                            &conversation_id,
                            b"[encrypted attachment]",
                            now,
                            background,
                            store,
                        );
                    }
                    messages.push(format!(
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
                        if persist_message(store, conversation_id, message, "incoming").is_err() {
                            return response(503, "message_storage_unavailable", None, None);
                        }
                    }
                    if let Some(authority) = invite_authority.as_deref_mut() {
                        if !expired {
                            let _ = authority.record_contact_message(
                                &conversation_id,
                                display_text,
                                now,
                                background,
                                store,
                            );
                        }
                    }
                    let metadata = message
                        .as_ref()
                        .map(|item| format!(r##","message_id":"{}","created_at":{},"expires_at":{},"expired":{}"##, json_escape(&item.id), item.created_at, item.expires_at, expired))
                        .unwrap_or_default();
                    messages.push(format!(
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
                acknowledged_ids.push(relay_id.clone());
            }
            let acknowledged = if acknowledged_ids.is_empty() {
                0
            } else {
                match client.ack_blocking(&acknowledged_ids) {
                    Ok(value) => value,
                    Err(RelayError::Rejected(410)) => {
                        if let (Some(authority), Some(store)) = (
                            invite_authority.as_deref_mut(),
                            session_store.as_deref_mut(),
                        ) {
                            let _ = authority.invalidate_relay_binding(store);
                        }
                        return response(
                            409,
                            "relay_capability_expired",
                            None,
                            Some("application/json"),
                        );
                    }
                    Err(_) => {
                        return response(503, "relay_unavailable", None, Some("application/json"));
                    }
                }
            };
            if let Some(ledger) = delivery_ledger.as_deref_mut() {
                if ledger.persist(store).is_err() {
                    return response(503, "storage_unavailable", None, None);
                }
            }
            response(
                200,
                &format!(
                    r##"{{"acknowledged":{},"messages":[{}]}}"##,
                    acknowledged,
                    messages.join(",")
                ),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/delivery/ack") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(inbox_url) = json_string(request.body, "inbox_url") else {
                return response(400, "invalid_inbox_url", None, Some("application/json"));
            };
            let Some(ids) = json_string_array(request.body, "ids") else {
                return response(400, "invalid_delivery_ids", None, Some("application/json"));
            };
            let Ok(endpoint) = RelayEndpoint::from_inbox_url_with_pin(
                inbox_url,
                invite_authority
                    .as_deref()
                    .and_then(|authority| authority.relay_tls_pin),
            ) else {
                return response(
                    422,
                    "unsupported_relay_endpoint",
                    None,
                    Some("application/json"),
                );
            };
            let acknowledged = match RelayClient::new(endpoint).ack_blocking(&ids) {
                Ok(value) => value,
                Err(RelayError::Rejected(410)) => {
                    if let (Some(authority), Some(store)) = (
                        invite_authority.as_deref_mut(),
                        session_store.as_deref_mut(),
                    ) {
                        let _ = authority.invalidate_relay_binding(store);
                    }
                    return response(
                        409,
                        "relay_capability_expired",
                        None,
                        Some("application/json"),
                    );
                }
                Err(_) => {
                    return response(503, "relay_unavailable", None, Some("application/json"))
                }
            };
            let recipient_received = if let Some(ledger) = delivery_ledger.as_deref_mut() {
                let count = ledger.acknowledge_relay_ids(&ids);
                if let Some(store) = session_store.as_deref_mut() {
                    if ledger.persist(store).is_err() {
                        return response(503, "storage_unavailable", None, None);
                    }
                }
                count
            } else {
                0
            };
            response(
                200,
                &format!(
                    r##"{{"acknowledged":{},"recipient_received":{}}}"##,
                    acknowledged, recipient_received
                ),
                None,
                Some("application/json"),
            )
        }
        _ => unreachable!("delivery route was filtered before dispatch"),
    }
}
