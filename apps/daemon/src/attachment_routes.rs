use super::{
    authorize_api, hex_bytes, hex_decode, json_escape, json_string, json_u64, pairing_ready,
    response, RelayClient, RelayEndpoint, RelayEnvelope, RelayError, Request, RouteContext,
};
use crate::{
    delivery::DeliveryLedger,
    mls_session::session_checkpoint_key,
    storage::{RecordClass, RecordMutation},
};

pub(crate) fn handle_attachment_route(
    request: &Request<'_>,
    context: &mut RouteContext<'_>,
) -> Option<Vec<u8>> {
    if matches!(
        (request.method, request.path),
        ("POST", "/local-api/attachment/upload-chunk")
            | ("POST", "/local-api/attachment/upload-completed")
            | ("POST", "/local-api/attachment/download-chunk")
            | ("POST", "/local-api/attachment/send")
    ) {
        let _ = context;
        return Some(response(503, "staged_route_required", None, None));
    }
    let reply = match (request.method, request.path) {
        ("POST", "/local-api/attachment/upload-chunk") => {
            if let Err(reply) = authorize_api(context.bridge, request, context.now) {
                return Some(reply);
            }
            if !pairing_ready(context.invite_authority.as_deref(), context.now) {
                return Some(response(
                    403,
                    "pairing_not_ready",
                    None,
                    Some("application/json"),
                ));
            }
            let Some(inbox_url) = json_string(request.body, "inbox_url") else {
                return Some(response(
                    400,
                    "invalid_inbox_url",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(blob_id) = json_string(request.body, "blob_id") else {
                return Some(response(
                    400,
                    "invalid_blob_id",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(chunk) = json_string(request.body, "chunk").and_then(hex_decode) else {
                return Some(response(
                    400,
                    "invalid_blob_chunk",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(offset) =
                json_u64(request.body, "offset").and_then(|value| usize::try_from(value).ok())
            else {
                return Some(response(
                    400,
                    "invalid_blob_offset",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(total) =
                json_u64(request.body, "total").and_then(|value| usize::try_from(value).ok())
            else {
                return Some(response(
                    400,
                    "invalid_blob_total",
                    None,
                    Some("application/json"),
                ));
            };
            let Ok(endpoint) = RelayEndpoint::from_inbox_url_with_pin(
                inbox_url,
                context
                    .invite_authority
                    .as_deref()
                    .and_then(|authority| authority.relay_tls_pin),
            ) else {
                return Some(response(
                    422,
                    "unsupported_relay_endpoint",
                    None,
                    Some("application/json"),
                ));
            };
            match RelayClient::new(endpoint)
                .upload_blob_chunk_blocking(blob_id, offset, total, &chunk)
            {
                Ok(result) => response(
                    200,
                    &format!(
                        r##"{{"complete":{},"received":{},"total":{},"expires_at":{}}}"##,
                        result.complete, result.received, result.total, result.expires_at
                    ),
                    None,
                    Some("application/json"),
                ),
                Err(RelayError::Rejected(status)) => {
                    response(status, "relay_rejected", None, Some("application/json"))
                }
                Err(_) => response(503, "relay_unavailable", None, Some("application/json")),
            }
        }
        ("POST", "/local-api/attachment/start") => {
            if let Err(reply) = authorize_api(context.bridge, request, context.now) {
                return Some(reply);
            }
            let Some(authority) = context.invite_authority.as_deref_mut() else {
                return Some(response(503, "pairing_unavailable", None, None));
            };
            let Some(blob_id) = json_string(request.body, "blob_id") else {
                return Some(response(
                    400,
                    "invalid_blob_id",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(total) =
                json_u64(request.body, "total").and_then(|value| usize::try_from(value).ok())
            else {
                return Some(response(
                    400,
                    "invalid_attachment_size",
                    None,
                    Some("application/json"),
                ));
            };
            let file_name = json_string(request.body, "file_name");
            let media_type = json_string(request.body, "media_type");
            match authority.attachment_start(blob_id, total, file_name, media_type, context.now) {
                Ok(()) => response(201, r##"{"started":true}"##, None, Some("application/json")),
                Err(_) => response(400, "invalid_attachment", None, Some("application/json")),
            }
        }
        ("POST", "/local-api/attachment/append") => {
            if let Err(reply) = authorize_api(context.bridge, request, context.now) {
                return Some(reply);
            }
            let Some(authority) = context.invite_authority.as_deref_mut() else {
                return Some(response(503, "pairing_unavailable", None, None));
            };
            let Some(blob_id) = json_string(request.body, "blob_id") else {
                return Some(response(
                    400,
                    "invalid_blob_id",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(index) =
                json_u64(request.body, "index").and_then(|value| u32::try_from(value).ok())
            else {
                return Some(response(
                    400,
                    "invalid_attachment_index",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(plaintext) = json_string(request.body, "plaintext").and_then(hex_decode)
            else {
                return Some(response(
                    400,
                    "invalid_attachment_chunk",
                    None,
                    Some("application/json"),
                ));
            };
            match authority.attachment_append(blob_id, index, &plaintext) {
                Ok(()) => response(
                    202,
                    r##"{"accepted":true}"##,
                    None,
                    Some("application/json"),
                ),
                Err(_) => response(
                    409,
                    "invalid_attachment_chunk",
                    None,
                    Some("application/json"),
                ),
            }
        }
        ("POST", "/local-api/attachment/finish") => {
            if let Err(reply) = authorize_api(context.bridge, request, context.now) {
                return Some(reply);
            }
            let Some(authority) = context.invite_authority.as_deref_mut() else {
                return Some(response(503, "pairing_unavailable", None, None));
            };
            let Some(blob_id) = json_string(request.body, "blob_id") else {
                return Some(response(
                    400,
                    "invalid_blob_id",
                    None,
                    Some("application/json"),
                ));
            };
            match authority.attachment_finish(blob_id, context.now) {
                Ok(_) => response(
                    200,
                    r##"{"finished":true}"##,
                    None,
                    Some("application/json"),
                ),
                Err(_) => response(
                    409,
                    "attachment_not_complete",
                    None,
                    Some("application/json"),
                ),
            }
        }
        ("POST", "/local-api/attachment/send") => {
            if let Err(reply) = authorize_api(context.bridge, request, context.now) {
                return Some(reply);
            }
            if !pairing_ready(context.invite_authority.as_deref(), context.now) {
                return Some(response(
                    403,
                    "pairing_not_ready",
                    None,
                    Some("application/json"),
                ));
            }
            let Some(conversation_id) = json_string(request.body, "conversation_id") else {
                return Some(response(
                    400,
                    "invalid_conversation",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(inbox_url) = json_string(request.body, "inbox_url") else {
                return Some(response(
                    400,
                    "invalid_inbox_url",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(blob_id) = json_string(request.body, "blob_id") else {
                return Some(response(
                    400,
                    "invalid_blob_id",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(authority) = context.invite_authority.as_deref_mut() else {
                return Some(response(503, "pairing_unavailable", None, None));
            };
            let Ok(endpoint) =
                RelayEndpoint::from_inbox_url_with_pin(inbox_url, authority.relay_tls_pin)
            else {
                return Some(response(
                    422,
                    "unsupported_relay_endpoint",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(package) = authority.completed_attachments.get(blob_id) else {
                return Some(response(
                    404,
                    "attachment_not_found",
                    None,
                    Some("application/json"),
                ));
            };
            let client = RelayClient::new(endpoint.clone());
            for (index, chunk) in package
                .blob
                .chunks(crate::attachment::CHUNK_SIZE)
                .enumerate()
            {
                let offset = index * crate::attachment::CHUNK_SIZE;
                if client
                    .upload_blob_chunk_blocking(blob_id, offset, package.blob.len(), chunk)
                    .is_err()
                {
                    return Some(response(
                        503,
                        "relay_unavailable",
                        None,
                        Some("application/json"),
                    ));
                }
            }
            let descriptor = package.descriptor.clone();
            let Some(catalog) = context.session_catalog.as_deref_mut() else {
                return Some(response(503, "session_unavailable", None, None));
            };
            let Some(store) = context.session_store.as_deref_mut() else {
                return Some(response(503, "storage_unavailable", None, None));
            };
            let Ok(ciphertext) = catalog.send_attachment_unpersisted(conversation_id, &descriptor)
            else {
                return Some(response(
                    409,
                    "attachment_session_failed",
                    None,
                    Some("application/json"),
                ));
            };
            let Ok(checkpoint) = catalog.checkpoint_bytes(conversation_id) else {
                catalog.poison(conversation_id);
                return Some(response(503, "session_storage_unavailable", None, None));
            };
            let Some(expires_at) = context.now.checked_add(3600) else {
                catalog.poison(conversation_id);
                return Some(response(
                    422,
                    "invalid_expiry",
                    None,
                    Some("application/json"),
                ));
            };
            let Ok(envelope) =
                RelayEnvelope::create(&endpoint.capability, &ciphertext, expires_at, context.now)
            else {
                catalog.poison(conversation_id);
                return Some(response(
                    422,
                    "invalid_delivery_envelope",
                    None,
                    Some("application/json"),
                ));
            };
            let Ok(digest) = envelope.digest() else {
                catalog.poison(conversation_id);
                return Some(response(
                    422,
                    "invalid_delivery_envelope",
                    None,
                    Some("application/json"),
                ));
            };
            let Ok(wire) = envelope.to_wire() else {
                catalog.poison(conversation_id);
                return Some(response(
                    422,
                    "invalid_delivery_envelope",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(ledger) = context.delivery_ledger.as_deref_mut() else {
                catalog.poison(conversation_id);
                return Some(response(503, "delivery_unavailable", None, None));
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
                catalog.poison(conversation_id);
                return Some(response(
                    409,
                    "duplicate_delivery",
                    None,
                    Some("application/json"),
                ));
            }
            if ledger
                .transition(&digest, crate::delivery::DeliveryState::Queued)
                .is_err()
            {
                catalog.poison(conversation_id);
                return Some(response(503, "delivery_state_unavailable", None, None));
            }
            let Ok(ledger_bytes) = ledger.encoded_bytes() else {
                catalog.poison(conversation_id);
                return Some(response(503, "delivery_state_unavailable", None, None));
            };
            if store
                .apply_batch(&[
                    RecordMutation::Put(
                        RecordClass::ProtocolSession,
                        session_checkpoint_key(conversation_id),
                        checkpoint,
                    ),
                    RecordMutation::Put(
                        RecordClass::Outbox,
                        "delivery/ledger".into(),
                        ledger_bytes,
                    ),
                ])
                .is_err()
            {
                catalog.poison(conversation_id);
                if let Ok(restored) = DeliveryLedger::restore(store) {
                    *ledger = restored;
                }
                return Some(response(503, "message_storage_unavailable", None, None));
            }
            let accepted = match client.post_blocking(&envelope) {
                Ok(value) => value,
                Err(_) => {
                    let _ = ledger.schedule_retry(&digest, context.now);
                    let _ = ledger.persist(store);
                    return Some(response(
                        503,
                        &format!(
                            r##"{{"error":"relay_unavailable","digest":"{}","state":"retryable"}}"##,
                            json_escape(&digest)
                        ),
                        None,
                        Some("application/json"),
                    ));
                }
            };
            let _ = ledger.bind_relay_id(&digest, &accepted.id);
            let _ = ledger.transition(&digest, crate::delivery::DeliveryState::Queued);
            let _ = ledger.transition(&digest, crate::delivery::DeliveryState::RelayAccepted);
            if ledger.persist(store).is_err() {
                return Some(response(503, "storage_unavailable", None, None));
            }
            authority.take_completed_attachment(blob_id);
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
        ("POST", "/local-api/attachment/upload-completed") => {
            if let Err(reply) = authorize_api(context.bridge, request, context.now) {
                return Some(reply);
            }
            if !pairing_ready(context.invite_authority.as_deref(), context.now) {
                return Some(response(
                    403,
                    "pairing_not_ready",
                    None,
                    Some("application/json"),
                ));
            }
            let Some(authority) = context.invite_authority.as_deref_mut() else {
                return Some(response(503, "pairing_unavailable", None, None));
            };
            let Some(inbox_url) = json_string(request.body, "inbox_url") else {
                return Some(response(
                    400,
                    "invalid_inbox_url",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(blob_id) = json_string(request.body, "blob_id") else {
                return Some(response(
                    400,
                    "invalid_blob_id",
                    None,
                    Some("application/json"),
                ));
            };
            let Ok(endpoint) =
                RelayEndpoint::from_inbox_url_with_pin(inbox_url, authority.relay_tls_pin)
            else {
                return Some(response(
                    422,
                    "unsupported_relay_endpoint",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(package) = authority.completed_attachments.get(blob_id) else {
                return Some(response(
                    404,
                    "attachment_not_found",
                    None,
                    Some("application/json"),
                ));
            };
            let client = RelayClient::new(endpoint);
            for (index, chunk) in package
                .blob
                .chunks(crate::attachment::CHUNK_SIZE)
                .enumerate()
            {
                let offset = index * crate::attachment::CHUNK_SIZE;
                if client
                    .upload_blob_chunk_blocking(blob_id, offset, package.blob.len(), chunk)
                    .is_err()
                {
                    return Some(response(
                        503,
                        "relay_unavailable",
                        None,
                        Some("application/json"),
                    ));
                }
            }
            authority.take_completed_attachment(blob_id);
            response(
                200,
                r##"{"uploaded":true}"##,
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/attachment/download-chunk") => {
            if let Err(reply) = authorize_api(context.bridge, request, context.now) {
                return Some(reply);
            }
            if !pairing_ready(context.invite_authority.as_deref(), context.now) {
                return Some(response(
                    403,
                    "pairing_not_ready",
                    None,
                    Some("application/json"),
                ));
            }
            let Some(authority) = context.invite_authority.as_deref() else {
                return Some(response(503, "pairing_unavailable", None, None));
            };
            let Some(attachment_id) = json_string(request.body, "attachment_id") else {
                return Some(response(
                    400,
                    "invalid_attachment_id",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(inbox_url) = json_string(request.body, "inbox_url") else {
                return Some(response(
                    400,
                    "invalid_inbox_url",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(index) =
                json_u64(request.body, "index").and_then(|value| usize::try_from(value).ok())
            else {
                return Some(response(
                    400,
                    "invalid_attachment_index",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(descriptor) = authority.received_attachment(attachment_id) else {
                return Some(response(
                    404,
                    "attachment_not_found",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(chunk) = descriptor.chunks.get(index) else {
                return Some(response(
                    416,
                    "attachment_chunk_not_found",
                    None,
                    Some("application/json"),
                ));
            };
            let offset: usize = descriptor.chunks[..index]
                .iter()
                .map(|item| item.ciphertext_size as usize)
                .sum();
            let Ok(endpoint) =
                RelayEndpoint::from_inbox_url_with_pin(inbox_url, authority.relay_tls_pin)
            else {
                return Some(response(
                    422,
                    "unsupported_relay_endpoint",
                    None,
                    Some("application/json"),
                ));
            };
            let Ok(ciphertext) = RelayClient::new(endpoint).download_blob_chunk_blocking(
                &descriptor.blob_id,
                offset,
                chunk.ciphertext_size as usize,
            ) else {
                return Some(response(
                    503,
                    "relay_unavailable",
                    None,
                    Some("application/json"),
                ));
            };
            let Ok(plaintext) =
                crate::attachment::decrypt_blob_chunk(descriptor, index as u32, &ciphertext)
            else {
                return Some(response(
                    409,
                    "attachment_verification_failed",
                    None,
                    Some("application/json"),
                ));
            };
            let complete = index + 1 == descriptor.chunks.len();
            let file_name = descriptor
                .file_name
                .as_deref()
                .map(|value| format!(r##""{}""##, json_escape(value)))
                .unwrap_or_else(|| "null".to_owned());
            let media_type = descriptor
                .media_type
                .as_deref()
                .map(|value| format!(r##""{}""##, json_escape(value)))
                .unwrap_or_else(|| "null".to_owned());
            response(
                200,
                &format!(
                    r##"{{"attachment_id":"{}","index":{},"complete":{},"file_name":{},"media_type":{},"plaintext":"{}"}}"##,
                    json_escape(attachment_id),
                    index,
                    complete,
                    file_name,
                    media_type,
                    hex_bytes(&plaintext)
                ),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/attachment/cancel") => {
            if let Err(reply) = authorize_api(context.bridge, request, context.now) {
                return Some(reply);
            }
            let Some(authority) = context.invite_authority.as_deref_mut() else {
                return Some(response(503, "pairing_unavailable", None, None));
            };
            let Some(blob_id) = json_string(request.body, "blob_id") else {
                return Some(response(
                    400,
                    "invalid_attachment_id",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(store) = context.session_store.as_deref_mut() else {
                return Some(response(503, "storage_unavailable", None, None));
            };
            let cancelled = authority.cancel_attachment(blob_id, store);
            response(
                200,
                &format!(r##"{{"cancelled":{cancelled}}}"##),
                None,
                Some("application/json"),
            )
        }
        _ => return None,
    };
    Some(reply)
}
