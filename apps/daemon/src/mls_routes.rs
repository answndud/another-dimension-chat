use super::{
    authorize_api, catalog_error, decode_message_payload, deliver_device_change_commits,
    encode_message_payload, encoded_message_record, hex_bytes, hex_decode, json_escape,
    json_string, json_u64, mls_device_credential, pairing_ready, response, AttachmentDescriptor,
    Request, RouteContext, MAX_MESSAGE_TTL_SECONDS,
};
use crate::protocol_gate::{
    admit, negotiate, validate_clock, DAEMON_PROTOCOL, DAEMON_PROTOCOL_VERSION,
};
use crate::{
    mls_session::session_checkpoint_key,
    storage::{RecordClass, RecordMutation},
};

fn require_protocol(identity: &super::IdentityView, now: u64) -> Result<(), &'static str> {
    admit(&identity.account_id, &identity.device_id, DAEMON_PROTOCOL)
        .map_err(|_| "protocol_unavailable")?;
    negotiate(DAEMON_PROTOCOL_VERSION).map_err(|_| "protocol_version_unsupported")?;
    validate_clock(now, now).map_err(|_| "clock_skew")?;
    Ok(())
}

fn require_peer_binding(
    authority: Option<&super::InviteAuthority>,
    conversation_id: &str,
    now: u64,
) -> Result<(), &'static str> {
    let Some(authority) = authority else {
        // Route unit tests may intentionally exercise the catalog without a
        // pairing authority. A real daemon supplies the authority after init.
        return Ok(());
    };
    let peer = authority
        .pairing
        .snapshot()
        .peer
        .ok_or("peer_unavailable")?;
    admit(&peer.account_id, &peer.device_id, DAEMON_PROTOCOL)
        .map_err(|_| "peer_protocol_unavailable")?;
    if now >= peer.expires_at {
        return Err("peer_expired");
    }
    if peer
        .conversation_id
        .as_deref()
        .is_some_and(|bound| bound != conversation_id)
    {
        return Err("conversation_binding_changed");
    }
    Ok(())
}

pub(crate) fn handle_mls_route(
    request: &Request<'_>,
    context: &mut RouteContext<'_>,
) -> Option<Vec<u8>> {
    let reply = match (request.method, request.path) {
        ("POST", "/local-api/session/remove-device") => {
            if let Err(reply) = authorize_api(context.bridge, request, context.now) {
                return Some(reply);
            }
            let Some(authority) = context.invite_authority.as_deref_mut() else {
                return Some(response(503, "device_unavailable", None, None));
            };
            if authority.root.is_none() {
                return Some(response(
                    403,
                    "root_authority_unavailable",
                    None,
                    Some("application/json"),
                ));
            }
            let Some(account_id) = json_string(request.body, "account_id") else {
                return Some(response(
                    400,
                    "account_id_required",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(device_id) = json_string(request.body, "device_id") else {
                return Some(response(
                    400,
                    "device_id_required",
                    None,
                    Some("application/json"),
                ));
            };
            if account_id != authority.account_id {
                return Some(response(
                    422,
                    "device_account_mismatch",
                    None,
                    Some("application/json"),
                ));
            }
            let Some(catalog) = context.session_catalog.as_deref_mut() else {
                return Some(response(503, "session_unavailable", None, None));
            };
            let Some(store) = context.session_store.as_deref_mut() else {
                return Some(response(503, "storage_unavailable", None, None));
            };
            let Some(ledger) = context.delivery_ledger.as_deref_mut() else {
                return Some(response(503, "delivery_unavailable", None, None));
            };
            let commits = match catalog
                .remove_device_unpersisted(&mls_device_credential(account_id, device_id))
            {
                Ok(commits) => commits,
                Err(error) => {
                    catalog.poison_all();
                    return Some(catalog_error(error));
                }
            };
            let mutations = commits
                .iter()
                .map(|(conversation_id, _, checkpoint)| {
                    RecordMutation::Put(
                        RecordClass::ProtocolSession,
                        session_checkpoint_key(conversation_id),
                        checkpoint.clone(),
                    )
                })
                .collect::<Vec<_>>();
            if store.apply_batch(&mutations).is_err() {
                catalog.poison_all();
                return Some(response(503, "storage_unavailable", None, None));
            }
            let delivered = match deliver_device_change_commits(
                authority,
                &commits,
                ledger,
                store,
                context.now,
            ) {
                Ok(digests) => digests,
                Err(_) => {
                    return Some(response(
                        503,
                        "device_change_delivery_pending",
                        None,
                        Some("application/json"),
                    ));
                }
            };
            let payload = commits
                .iter()
                .map(|(conversation_id, commit, _)| {
                    format!(
                        r##"{{"conversation_id":"{}","commit":"{}"}}"##,
                        json_escape(conversation_id),
                        hex_bytes(commit)
                    )
                })
                .collect::<Vec<_>>()
                .join(",");
            response(
                200,
                &format!(
                    r##"{{"removed":true,"commits":[{}],"delivered":{}}}"##,
                    payload,
                    delivered.len()
                ),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/session/create") => {
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
            let Some(identity) = context.identity else {
                return Some(response(503, "identity_unavailable", None, None));
            };
            if let Err(error) = require_protocol(identity, context.now) {
                return Some(response(503, error, None, Some("application/json")));
            }
            let Some(conversation_id) = json_string(request.body, "conversation_id") else {
                return Some(response(
                    400,
                    "invalid_conversation",
                    None,
                    Some("application/json"),
                ));
            };
            if let Err(error) = require_peer_binding(
                context.invite_authority.as_deref(),
                conversation_id,
                context.now,
            ) {
                return Some(response(409, error, None, Some("application/json")));
            }
            let Some(catalog) = context.session_catalog.as_deref_mut() else {
                return Some(response(503, "session_unavailable", None, None));
            };
            let Some(store) = context.session_store.as_deref_mut() else {
                return Some(response(503, "storage_unavailable", None, None));
            };
            match catalog.create(
                conversation_id,
                mls_device_credential(&identity.account_id, &identity.device_id),
                store,
            ) {
                Ok(()) => response(201, r##"{"created":true}"##, None, Some("application/json")),
                Err(error) => catalog_error(error),
            }
        }
        ("POST", "/local-api/session/prepare") => {
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
            if let Err(error) = require_peer_binding(
                context.invite_authority.as_deref(),
                conversation_id,
                context.now,
            ) {
                return Some(response(409, error, None, Some("application/json")));
            }
            let Some(identity) = context.identity else {
                return Some(response(503, "identity_unavailable", None, None));
            };
            if let Err(error) = require_protocol(identity, context.now) {
                return Some(response(503, error, None, Some("application/json")));
            }
            let Some(catalog) = context.session_catalog.as_deref_mut() else {
                return Some(response(503, "session_unavailable", None, None));
            };
            let Some(store) = context.session_store.as_deref_mut() else {
                return Some(response(503, "storage_unavailable", None, None));
            };
            match catalog.prepare(
                conversation_id,
                mls_device_credential(&identity.account_id, &identity.device_id),
                store,
            ) {
                Ok(key_package) => response(
                    200,
                    &format!(r##"{{"key_package":"{}"}}"##, hex_bytes(&key_package)),
                    None,
                    Some("application/json"),
                ),
                Err(error) => catalog_error(error),
            }
        }
        ("POST", "/local-api/session/join") => {
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
            if let Err(error) = require_peer_binding(
                context.invite_authority.as_deref(),
                conversation_id,
                context.now,
            ) {
                return Some(response(409, error, None, Some("application/json")));
            }
            let Some(welcome) = json_string(request.body, "welcome").and_then(hex_decode) else {
                return Some(response(
                    400,
                    "invalid_welcome",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(identity) = context.identity else {
                return Some(response(503, "identity_unavailable", None, None));
            };
            if let Err(error) = require_protocol(identity, context.now) {
                return Some(response(503, error, None, Some("application/json")));
            }
            let Some(catalog) = context.session_catalog.as_deref_mut() else {
                return Some(response(503, "session_unavailable", None, None));
            };
            let Some(store) = context.session_store.as_deref_mut() else {
                return Some(response(503, "storage_unavailable", None, None));
            };
            match catalog.join(
                conversation_id,
                mls_device_credential(&identity.account_id, &identity.device_id),
                &welcome,
                store,
            ) {
                Ok(()) => response(200, r##"{"joined":true}"##, None, Some("application/json")),
                Err(error) => catalog_error(error),
            }
        }
        ("POST", "/local-api/session/add-member") => {
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
            let Some(identity) = context.identity else {
                return Some(response(503, "identity_unavailable", None, None));
            };
            if let Err(error) = require_protocol(identity, context.now) {
                return Some(response(503, error, None, Some("application/json")));
            }
            let Some(conversation_id) = json_string(request.body, "conversation_id") else {
                return Some(response(
                    400,
                    "invalid_conversation",
                    None,
                    Some("application/json"),
                ));
            };
            if let Err(error) = require_peer_binding(
                context.invite_authority.as_deref(),
                conversation_id,
                context.now,
            ) {
                return Some(response(409, error, None, Some("application/json")));
            }
            let Some(key_package) = json_string(request.body, "key_package").and_then(hex_decode)
            else {
                return Some(response(
                    400,
                    "invalid_key_package",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(catalog) = context.session_catalog.as_deref_mut() else {
                return Some(response(503, "session_unavailable", None, None));
            };
            let Some(store) = context.session_store.as_deref_mut() else {
                return Some(response(503, "storage_unavailable", None, None));
            };
            match catalog.add_member(conversation_id, &key_package, store) {
                Ok(welcome) => response(
                    200,
                    &format!(r##"{{"welcome":"{}"}}"##, hex_bytes(&welcome)),
                    None,
                    Some("application/json"),
                ),
                Err(error) => catalog_error(error),
            }
        }
        ("POST", "/local-api/session/send") => {
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
            let Some(identity) = context.identity else {
                return Some(response(503, "identity_unavailable", None, None));
            };
            if let Err(error) = require_protocol(identity, context.now) {
                return Some(response(503, error, None, Some("application/json")));
            }
            let Some(conversation_id) = json_string(request.body, "conversation_id") else {
                return Some(response(
                    400,
                    "invalid_conversation",
                    None,
                    Some("application/json"),
                ));
            };
            if let Err(error) = require_peer_binding(
                context.invite_authority.as_deref(),
                conversation_id,
                context.now,
            ) {
                return Some(response(409, error, None, Some("application/json")));
            }
            if context
                .invite_authority
                .as_deref()
                .is_some_and(|authority| {
                    authority.contacts.is_blocked_conversation(conversation_id)
                })
            {
                return Some(response(
                    403,
                    "contact_blocked",
                    None,
                    Some("application/json"),
                ));
            }
            let Some(message_text) = json_string(request.body, "plaintext") else {
                return Some(response(
                    400,
                    "invalid_message",
                    None,
                    Some("application/json"),
                ));
            };
            let expires_at = json_u64(request.body, "expires_at").unwrap_or(0);
            if expires_at != 0
                && (expires_at <= context.now
                    || expires_at > context.now.saturating_add(MAX_MESSAGE_TTL_SECONDS))
            {
                return Some(response(
                    422,
                    "invalid_message_expiry",
                    None,
                    Some("application/json"),
                ));
            }
            let Some(plaintext) = encode_message_payload(message_text, context.now, expires_at)
            else {
                return Some(response(503, "randomness_unavailable", None, None));
            };
            let Some(catalog) = context.session_catalog.as_deref_mut() else {
                return Some(response(503, "session_unavailable", None, None));
            };
            let Some(store) = context.session_store.as_deref_mut() else {
                return Some(response(503, "storage_unavailable", None, None));
            };
            match catalog.send_unpersisted(conversation_id, &plaintext) {
                Ok(ciphertext) => {
                    let Some(message) = decode_message_payload(&plaintext) else {
                        return Some(response(503, "message_encoding_failed", None, None));
                    };
                    let (message_key, message_bytes) =
                        match encoded_message_record(conversation_id, &message, "outgoing") {
                            Ok(value) => value,
                            Err(_) => {
                                catalog.poison(conversation_id);
                                return Some(response(
                                    503,
                                    "message_storage_unavailable",
                                    None,
                                    None,
                                ));
                            }
                        };
                    let checkpoint = match catalog.checkpoint_bytes(conversation_id) {
                        Ok(value) => value,
                        Err(_) => {
                            catalog.poison(conversation_id);
                            return Some(response(503, "session_storage_unavailable", None, None));
                        }
                    };
                    if store
                        .apply_batch(&[
                            RecordMutation::Put(
                                RecordClass::ProtocolSession,
                                session_checkpoint_key(conversation_id),
                                checkpoint,
                            ),
                            RecordMutation::Put(RecordClass::Message, message_key, message_bytes),
                        ])
                        .is_err()
                    {
                        catalog.poison(conversation_id);
                        return Some(response(503, "message_storage_unavailable", None, None));
                    }
                    response(
                        200,
                        &format!(r##"{{"ciphertext":"{}"}}"##, hex_bytes(&ciphertext)),
                        None,
                        Some("application/json"),
                    )
                }
                Err(error) => catalog_error(error),
            }
        }
        ("POST", "/local-api/session/receive") => {
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
            if let Err(error) = require_peer_binding(
                context.invite_authority.as_deref(),
                conversation_id,
                context.now,
            ) {
                return Some(response(409, error, None, Some("application/json")));
            }
            if context
                .invite_authority
                .as_deref()
                .is_some_and(|authority| {
                    authority.contacts.is_blocked_conversation(conversation_id)
                })
            {
                return Some(response(
                    403,
                    "contact_blocked",
                    None,
                    Some("application/json"),
                ));
            }
            let Some(ciphertext) = json_string(request.body, "ciphertext").and_then(hex_decode)
            else {
                return Some(response(
                    400,
                    "invalid_ciphertext",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(catalog) = context.session_catalog.as_deref_mut() else {
                return Some(response(503, "session_unavailable", None, None));
            };
            let Some(store) = context.session_store.as_deref_mut() else {
                return Some(response(503, "storage_unavailable", None, None));
            };
            match catalog.receive_delivery_unpersisted(conversation_id, &ciphertext) {
                Ok(Some(plaintext)) => {
                    let checkpoint = match catalog.checkpoint_bytes(conversation_id) {
                        Ok(value) => value,
                        Err(_) => {
                            catalog.poison(conversation_id);
                            return Some(response(503, "session_storage_unavailable", None, None));
                        }
                    };
                    if store
                        .apply_batch(&[RecordMutation::Put(
                            RecordClass::ProtocolSession,
                            session_checkpoint_key(conversation_id),
                            checkpoint,
                        )])
                        .is_err()
                    {
                        catalog.poison(conversation_id);
                        return Some(response(503, "session_storage_unavailable", None, None));
                    }
                    let (plaintext, metadata) = decode_message_payload(&plaintext)
                        .map(|message| {
                            let expired = message.expires_at != 0 && message.expires_at <= context.now;
                            (message.text.into_bytes(), format!(r##","message_id":"{}","created_at":{},"expires_at":{},"expired":{}"##, json_escape(&message.id), message.created_at, message.expires_at, expired))
                        })
                        .unwrap_or_else(|| (plaintext, String::new()));
                    response(
                        200,
                        &format!(r##"{{"plaintext":"{}"{metadata}}}"##, hex_bytes(&plaintext)),
                        None,
                        Some("application/json"),
                    )
                }
                Ok(None) => response(
                    409,
                    "session_operation_failed",
                    None,
                    Some("application/json"),
                ),
                Err(error) => catalog_error(error),
            }
        }
        ("POST", "/local-api/session/send-attachment") => {
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
            if let Err(error) = require_peer_binding(
                context.invite_authority.as_deref(),
                conversation_id,
                context.now,
            ) {
                return Some(response(409, error, None, Some("application/json")));
            }
            if context
                .invite_authority
                .as_deref()
                .is_some_and(|authority| {
                    authority.contacts.is_blocked_conversation(conversation_id)
                })
            {
                return Some(response(
                    403,
                    "contact_blocked",
                    None,
                    Some("application/json"),
                ));
            }
            let Some(descriptor_json) = json_string(request.body, "descriptor") else {
                return Some(response(
                    400,
                    "invalid_attachment_descriptor",
                    None,
                    Some("application/json"),
                ));
            };
            let Ok(descriptor) = serde_json::from_str::<AttachmentDescriptor>(descriptor_json)
            else {
                return Some(response(
                    400,
                    "invalid_attachment_descriptor",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(catalog) = context.session_catalog.as_deref_mut() else {
                return Some(response(503, "session_unavailable", None, None));
            };
            let Some(store) = context.session_store.as_deref_mut() else {
                return Some(response(503, "storage_unavailable", None, None));
            };
            match catalog.send_attachment_unpersisted(conversation_id, &descriptor) {
                Ok(ciphertext) => {
                    let checkpoint = match catalog.checkpoint_bytes(conversation_id) {
                        Ok(value) => value,
                        Err(_) => {
                            catalog.poison(conversation_id);
                            return Some(response(503, "session_storage_unavailable", None, None));
                        }
                    };
                    if store
                        .apply_batch(&[RecordMutation::Put(
                            RecordClass::ProtocolSession,
                            session_checkpoint_key(conversation_id),
                            checkpoint,
                        )])
                        .is_err()
                    {
                        catalog.poison(conversation_id);
                        return Some(response(503, "session_storage_unavailable", None, None));
                    }
                    response(
                        200,
                        &format!(
                            r##"{{"ciphertext":"{}","blob_id":"{}"}}"##,
                            hex_bytes(&ciphertext),
                            json_escape(&descriptor.blob_id)
                        ),
                        None,
                        Some("application/json"),
                    )
                }
                Err(error) => catalog_error(error),
            }
        }
        ("POST", "/local-api/session/receive-attachment") => {
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
            if let Err(error) = require_peer_binding(
                context.invite_authority.as_deref(),
                conversation_id,
                context.now,
            ) {
                return Some(response(409, error, None, Some("application/json")));
            }
            if context
                .invite_authority
                .as_deref()
                .is_some_and(|authority| {
                    authority.contacts.is_blocked_conversation(conversation_id)
                })
            {
                return Some(response(
                    403,
                    "contact_blocked",
                    None,
                    Some("application/json"),
                ));
            }
            let Some(ciphertext) = json_string(request.body, "ciphertext").and_then(hex_decode)
            else {
                return Some(response(
                    400,
                    "invalid_ciphertext",
                    None,
                    Some("application/json"),
                ));
            };
            let Some(catalog) = context.session_catalog.as_deref_mut() else {
                return Some(response(503, "session_unavailable", None, None));
            };
            let Some(store) = context.session_store.as_deref_mut() else {
                return Some(response(503, "storage_unavailable", None, None));
            };
            match catalog.receive_attachment_unpersisted(conversation_id, &ciphertext) {
                Ok(descriptor) => {
                    let checkpoint = match catalog.checkpoint_bytes(conversation_id) {
                        Ok(value) => value,
                        Err(_) => {
                            catalog.poison(conversation_id);
                            return Some(response(503, "session_storage_unavailable", None, None));
                        }
                    };
                    if store
                        .apply_batch(&[RecordMutation::Put(
                            RecordClass::ProtocolSession,
                            session_checkpoint_key(conversation_id),
                            checkpoint,
                        )])
                        .is_err()
                    {
                        catalog.poison(conversation_id);
                        return Some(response(503, "session_storage_unavailable", None, None));
                    }
                    match serde_json::to_string(&descriptor) {
                        Ok(payload) => response(
                            200,
                            &format!(r##"{{"descriptor":{payload}}}"##),
                            None,
                            Some("application/json"),
                        ),
                        Err(_) => response(503, "descriptor_unavailable", None, None),
                    }
                }
                Err(error) => catalog_error(error),
            }
        }
        _ => return None,
    };
    Some(reply)
}
