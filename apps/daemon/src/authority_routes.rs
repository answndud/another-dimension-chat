use super::*;

pub(crate) fn handle_authority_route(
    request: &Request<'_>,
    context: &mut RouteContext<'_>,
) -> Option<Vec<u8>> {
    let handled = request.path == "/local-api/identity"
        || request.path == "/local-api/conversations"
        || request.path == "/local-api/messages/list"
        || request.path.starts_with("/local-api/relay/trust")
        || request.path.starts_with("/local-api/devices")
        || request.path.starts_with("/local-api/invites")
        || request.path.starts_with("/local-api/pairing")
        || request.path.starts_with("/local-api/contacts");
    if !handled {
        return None;
    }
    Some(dispatch_authority_route(request, context))
}

fn dispatch_authority_route(request: &Request<'_>, context: &mut RouteContext<'_>) -> Vec<u8> {
    let bridge = &mut *context.bridge;
    let now = context.now;
    let identity = context.identity;
    let invite_authority = &mut context.invite_authority;
    let session_catalog = &mut context.session_catalog;
    let session_store = &mut context.session_store;
    let delivery_ledger = &mut context.delivery_ledger;
    let origin = request.header("origin").unwrap_or("");
    let host = request.header("host").unwrap_or("");
    match (request.method, request.path) {
        ("GET", "/local-api/relay/trust") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority.as_deref() else {
                return response(
                    503,
                    "relay_trust_unavailable",
                    None,
                    Some("application/json"),
                );
            };
            let pin = authority.relay_tls_pin.map(TlsCertificatePin::as_text);
            response(
                200,
                &format!(
                    r##"{{"relay_origin":"{}","tls_pin":{},"retrust_required":false}}"##,
                    json_escape(&authority.relay_origin),
                    pin.as_deref()
                        .map(|value| format!(r##""{}""##, json_escape(value)))
                        .unwrap_or_else(|| "null".into())
                ),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/relay/trust") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(
                    503,
                    "relay_trust_unavailable",
                    None,
                    Some("application/json"),
                );
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, Some("application/json"));
            };
            let Some(value) = json_string(request.body, "tls_pin") else {
                return response(400, "tls_pin_required", None, Some("application/json"));
            };
            if !authority.relay_origin.starts_with("https://") {
                return response(
                    422,
                    "tls_pin_requires_https",
                    None,
                    Some("application/json"),
                );
            }
            let Ok(pin) = TlsCertificatePin::parse(value) else {
                return response(422, "invalid_tls_pin", None, Some("application/json"));
            };
            let retrust = json_bool(request.body, "retrust").unwrap_or(false);
            if let Some(previous) = authority.relay_tls_pin {
                if previous != pin && !retrust {
                    return response(
                        409,
                        "relay_retrust_required",
                        None,
                        Some("application/json"),
                    );
                }
            }
            if store
                .put(
                    RecordClass::Account,
                    &relay_tls_pin_record_key(&authority.relay_origin),
                    pin.as_text().as_bytes(),
                )
                .is_err()
            {
                return response(503, "storage_unavailable", None, Some("application/json"));
            }
            authority.relay_tls_pin = Some(pin);
            response(
                200,
                &format!(
                    r##"{{"saved":true,"tls_pin":"{}","retrusted":{}}}"##,
                    json_escape(&pin.as_text()),
                    retrust
                ),
                None,
                Some("application/json"),
            )
        }
        ("GET", "/local-api/identity") => {
            let Some(cookie) = cookie_value(request.header("cookie").unwrap_or(""), "ad_session")
            else {
                return response(401, "session_invalid", None, None);
            };
            let authorization = BridgeRequest {
                origin,
                host,
                method: "GET",
                cookie,
                csrf_token: None,
                ui_version: request.header("x-ad-ui-version").unwrap_or(""),
            };
            let Some(identity) = identity else {
                return response(503, "identity_unavailable", None, None);
            };
            match bridge.authorize(&authorization, now) {
                Ok(()) => {
                    let body = format!(
                        r##"{{"account_id":"{}","device_id":"{}","display_name":"{}","private_state":"daemon-owned"}}"##,
                        json_escape(&identity.account_id),
                        json_escape(&identity.device_id),
                        json_escape(&identity.display_name),
                    );
                    response(200, &body, None, Some("application/json"))
                }
                Err(error) => response(403, error_code(&error), None, Some("application/json")),
            }
        }
        ("GET", "/local-api/devices") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority.as_deref() else {
                return response(503, "device_unavailable", None, Some("application/json"));
            };
            let devices = authority
                .device_registry
                .records()
                .map(|record| {
                    let certificate = record.certificate();
                    serde_json::json!({
                        "device_id": certificate.device_id(),
                        "state": if record.revoked_at().is_some() || certificate.is_revoked() { "revoked" } else { "active" },
                        "issued_at": certificate.issued_at(),
                        "expires_at": certificate.expires_at(),
                        "public_key": hex_bytes(&certificate.device_public_key()),
                        "revoked_at": record.revoked_at(),
                    })
                })
                .collect::<Vec<_>>();
            response(
                200,
                &serde_json::json!({
                    "devices": devices,
                    "events": authority.device_registry.events(),
                })
                .to_string(),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/devices/revoke") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(device_id) = json_string(request.body, "device_id") else {
                return response(400, "device_id_required", None, Some("application/json"));
            };
            let Some(authority) = invite_authority.as_deref_mut() else {
                return response(503, "device_unavailable", None, Some("application/json"));
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, Some("application/json"));
            };
            let Some(catalog) = session_catalog.as_deref_mut() else {
                return response(503, "session_unavailable", None, Some("application/json"));
            };
            let Some(ledger) = delivery_ledger.as_deref_mut() else {
                return response(503, "delivery_unavailable", None, Some("application/json"));
            };
            match authority.revoke_device(device_id, now, store) {
                Ok(()) => {
                    let commits = match catalog.remove_device(
                        &mls_device_credential(&authority.account_id, device_id),
                        store,
                    ) {
                        Ok(commits) => commits,
                        Err(error) => return catalog_error(error),
                    };
                    let delivered = match deliver_device_change_commits(
                        authority, &commits, ledger, store, now,
                    ) {
                        Ok(digests) => digests.len(),
                        Err(_) => {
                            return response(
                                503,
                                "device_change_delivery_pending",
                                None,
                                Some("application/json"),
                            )
                        }
                    };
                    response(
                        200,
                        &format!(
                            r##"{{"revoked":true,"device_id":"{}","sessions_removed":{},"delivered":{}}}"##,
                            json_escape(device_id),
                            commits.len(),
                            delivered
                        ),
                        None,
                        Some("application/json"),
                    )
                }
                Err(DeviceActionError::CurrentDevice) => response(
                    409,
                    "current_device_revoke_forbidden",
                    None,
                    Some("application/json"),
                ),
                Err(DeviceActionError::Registry(DeviceRegistryError::UnknownDevice)) => {
                    response(404, "device_not_found", None, Some("application/json"))
                }
                Err(DeviceActionError::Registry(DeviceRegistryError::DeviceNotActive)) => response(
                    409,
                    "device_already_revoked",
                    None,
                    Some("application/json"),
                ),
                Err(DeviceActionError::Storage) => {
                    response(503, "storage_unavailable", None, Some("application/json"))
                }
                Err(DeviceActionError::Registry(_)) => response(
                    422,
                    "device_registry_invalid",
                    None,
                    Some("application/json"),
                ),
                Err(DeviceActionError::Link(_)) => response(
                    422,
                    "device_registry_invalid",
                    None,
                    Some("application/json"),
                ),
                Err(DeviceActionError::RootUnavailable) => response(
                    403,
                    "root_authority_unavailable",
                    None,
                    Some("application/json"),
                ),
            }
        }
        ("POST", "/local-api/devices/link/approve") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(link_request) = json_string(request.body, "link_request") else {
                return response(400, "link_request_required", None, Some("application/json"));
            };
            let Some(code) = json_string(request.body, "code") else {
                return response(400, "link_code_required", None, Some("application/json"));
            };
            let Ok(parsed) = DeviceLinkRequest::parse(link_request) else {
                return response(
                    422,
                    "invalid_device_link_request",
                    None,
                    Some("application/json"),
                );
            };
            let Some(authority) = invite_authority.as_deref_mut() else {
                return response(503, "device_unavailable", None, Some("application/json"));
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, Some("application/json"));
            };
            match authority.approve_device_link(&parsed, code, now, store) {
                Ok(approval) => response(
                    200,
                    &format!(
                        r##"{{"approved":true,"device_id":"{}","approval":"{}"}}"##,
                        json_escape(parsed.device_id()),
                        json_escape(&approval)
                    ),
                    None,
                    Some("application/json"),
                ),
                Err(DeviceActionError::Link(DeviceLinkError::Expired)) => {
                    response(410, "device_link_expired", None, Some("application/json"))
                }
                Err(DeviceActionError::Link(DeviceLinkError::InvalidCode)) => response(
                    422,
                    "invalid_device_link_code",
                    None,
                    Some("application/json"),
                ),
                Err(DeviceActionError::Registry(DeviceRegistryError::DuplicateDevice)) => response(
                    409,
                    "device_already_registered",
                    None,
                    Some("application/json"),
                ),
                Err(DeviceActionError::Storage) => {
                    response(503, "storage_unavailable", None, Some("application/json"))
                }
                Err(DeviceActionError::Link(_)) | Err(DeviceActionError::Registry(_)) => response(
                    422,
                    "invalid_device_link_request",
                    None,
                    Some("application/json"),
                ),
                Err(DeviceActionError::CurrentDevice) => response(
                    409,
                    "current_device_revoke_forbidden",
                    None,
                    Some("application/json"),
                ),
                Err(DeviceActionError::RootUnavailable) => response(
                    403,
                    "root_authority_unavailable",
                    None,
                    Some("application/json"),
                ),
            }
        }
        ("POST", "/local-api/invites") => {
            let Some(cookie) = cookie_value(request.header("cookie").unwrap_or(""), "ad_session")
            else {
                return response(401, "session_invalid", None, None);
            };
            let authorization = BridgeRequest {
                origin,
                host,
                method: "POST",
                cookie,
                csrf_token: request.header("x-ad-csrf"),
                ui_version: request.header("x-ad-ui-version").unwrap_or(""),
            };
            let Some(authority) = invite_authority else {
                return response(503, "invite_unavailable", None, None);
            };
            if authority.root.is_none() {
                return response(
                    403,
                    "root_authority_unavailable",
                    None,
                    Some("application/json"),
                );
            }
            match bridge.authorize(&authorization, now) {
                Ok(()) => {
                    let Some(store) = session_store.as_deref_mut() else {
                        return response(503, "storage_unavailable", None, None);
                    };
                    if let Err(error) = authority.mark_invite_created(store) {
                        return pairing_error(error);
                    }
                    let Some((code, signed_invite)) = authority.create(now) else {
                        return response(503, "randomness_unavailable", None, None);
                    };
                    let body = format!(
                        r##"{{"invite_code":"{}","signed_invite":"{}","expires_in":600}}"##,
                        code, signed_invite
                    );
                    response(200, &body, None, Some("application/json"))
                }
                Err(error) => response(403, error_code(&error), None, Some("application/json")),
            }
        }
        ("POST", "/local-api/invites/verify") => {
            let Some(cookie) = cookie_value(request.header("cookie").unwrap_or(""), "ad_session")
            else {
                return response(401, "session_invalid", None, None);
            };
            let authorization = BridgeRequest {
                origin,
                host,
                method: "POST",
                cookie,
                csrf_token: request.header("x-ad-csrf"),
                ui_version: request.header("x-ad-ui-version").unwrap_or(""),
            };
            if let Err(error) = bridge.authorize(&authorization, now) {
                return response(403, error_code(&error), None, Some("application/json"));
            }
            let Some(code) = json_string(request.body, "invite_code") else {
                return response(400, "invalid_invite", None, Some("application/json"));
            };
            let Some(signed_invite) = json_string(request.body, "signed_invite") else {
                return response(400, "invalid_invite", None, Some("application/json"));
            };
            let Some(invite) = verify_signed_invite(code, signed_invite, now) else {
                return response(422, "invalid_invite", None, Some("application/json"));
            };
            let body = format!(
                r##"{{"account_id":"{}","device_id":"{}","expires_at":{},"relay_origin":"{}","verified":true}}"##,
                json_escape(&invite.account_id),
                json_escape(&invite.device_id),
                invite.expires_at,
                json_escape(&invite.relay_origin)
            );
            response(200, &body, None, Some("application/json"))
        }
        ("POST", "/local-api/invites/stage") => {
            let Some(cookie) = cookie_value(request.header("cookie").unwrap_or(""), "ad_session")
            else {
                return response(401, "session_invalid", None, None);
            };
            let authorization = BridgeRequest {
                origin,
                host,
                method: "POST",
                cookie,
                csrf_token: request.header("x-ad-csrf"),
                ui_version: request.header("x-ad-ui-version").unwrap_or(""),
            };
            if let Err(error) = bridge.authorize(&authorization, now) {
                return response(403, error_code(&error), None, Some("application/json"));
            }
            let Some(authority) = invite_authority else {
                return response(503, "invite_unavailable", None, None);
            };
            let Some(code) = json_string(request.body, "invite_code") else {
                return response(400, "invalid_invite", None, Some("application/json"));
            };
            let Some(signed_invite) = json_string(request.body, "signed_invite") else {
                return response(400, "invalid_invite", None, Some("application/json"));
            };
            let Some(receipt) = json_string(request.body, "relay_receipt") else {
                return response(
                    400,
                    "relay_receipt_required",
                    None,
                    Some("application/json"),
                );
            };
            // Public relay rendezvous codes are generated by the relay and are
            // intentionally distinct from the daemon's internal invite code.
            // The relay receipt binds this consumed code to the signed invite.
            let Some(invite) = verify_signed_invite_unbound(signed_invite, now) else {
                return response(422, "invalid_invite", None, Some("application/json"));
            };
            if !verify_relay_receipt(
                code,
                signed_invite,
                receipt,
                &invite,
                authority.relay_public_key,
                authority.relay_trust.as_ref(),
                now,
            ) {
                return response(422, "invalid_relay_receipt", None, Some("application/json"));
            }
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            if let Err(error) = authority.stage_peer(invite.clone(), now, store) {
                return pairing_error(error);
            }
            let safety_number = authority.pairing.safety_number().unwrap_or_default();
            let inbox_url = invite
                .inbox_url
                .as_deref()
                .map(|value| format!(r##""{}""##, json_escape(value)))
                .unwrap_or_else(|| "null".to_owned());
            let body = format!(
                r##"{{"staged":true,"state":"verified","safety_verified":false,"safety_number":"{}","account_id":"{}","device_id":"{}","expires_at":{},"inbox_url":{}}}"##,
                json_escape(&safety_number),
                json_escape(&invite.account_id),
                json_escape(&invite.device_id),
                invite.expires_at,
                inbox_url
            );
            response(200, &body, None, Some("application/json"))
        }
        ("GET", "/local-api/pairing/status") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "pairing_unavailable", None, None);
            };
            let snapshot = authority.pairing.snapshot();
            let peer = snapshot
                .peer
                .map(|peer| {
                    let inbox_url = peer
                        .inbox_url
                        .as_deref()
                        .map(|value| format!(r##""{}""##, json_escape(value)))
                        .unwrap_or_else(|| "null".to_owned());
                    format!(
                        r##",\"peer\":{{\"account_id\":\"{}\",\"device_id\":\"{}\",\"expires_at\":{},\"relay_origin\":\"{}\",\"inbox_url\":{}}}"##,
                        json_escape(&peer.account_id),
                        json_escape(&peer.device_id),
                        peer.expires_at,
                        json_escape(&peer.relay_origin),
                        inbox_url,
                    )
                })
                .unwrap_or_default();
            let safety_number = authority
                .pairing
                .safety_number()
                .map(|value| format!(r##",\"safety_number\":\"{}\""##, json_escape(&value)))
                .unwrap_or_default();
            let safety_verified = if snapshot.safety_verified {
                "true"
            } else {
                "false"
            };
            response(
                200,
                &format!(
                    r##"{{"state":"{}","safety_verified":{}{}{} }}"##,
                    snapshot.state.as_str(),
                    safety_verified,
                    peer,
                    safety_number
                )
                .replace(" }", "}"),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/pairing/verify-safety") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "pairing_unavailable", None, None);
            };
            let Some(value) = json_string(request.body, "safety_number") else {
                return response(
                    400,
                    "safety_number_required",
                    None,
                    Some("application/json"),
                );
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            match authority.confirm_safety(value, store) {
                Ok(()) => response(
                    200,
                    r##"{"safety_verified":true}"##,
                    None,
                    Some("application/json"),
                ),
                Err(error) => pairing_error(error),
            }
        }
        ("POST", "/local-api/pairing/unverify-safety") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "pairing_unavailable", None, None);
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            match authority.unverify_safety(store) {
                Ok(()) => response(
                    200,
                    r##"{"safety_verified":false,"messaging_blocked":true}"##,
                    None,
                    Some("application/json"),
                ),
                Err(error) => pairing_error(error),
            }
        }
        ("POST", "/local-api/pairing/approve") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "pairing_unavailable", None, None);
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            match authority.approve_pairing(now, store) {
                Ok(()) => match authority.register_approved_contact(now, store) {
                    Ok(()) => response(
                        200,
                        r##"{"state":"established","approved":true}"##,
                        None,
                        Some("application/json"),
                    ),
                    Err(error) => contact_directory_error(error),
                },
                Err(error) => pairing_error(error),
            }
        }
        ("GET", "/local-api/contacts") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "contacts_unavailable", None, None);
            };
            let payload = match serde_json::to_string(&authority.contacts()) {
                Ok(payload) => payload,
                Err(_) => return response(503, "contacts_unavailable", None, None),
            };
            response(
                200,
                &format!(r##"{{"contacts":{payload}}}"##),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/contacts/alias") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "contacts_unavailable", None, None);
            };
            let Some(account_id) = json_string(request.body, "account_id") else {
                return response(400, "account_id_required", None, Some("application/json"));
            };
            let Some(alias) = json_string(request.body, "alias") else {
                return response(400, "alias_required", None, Some("application/json"));
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            match authority.set_contact_alias(&account_id, &alias, store) {
                Ok(()) => response(200, r##"{"updated":true}"##, None, Some("application/json")),
                Err(error) => contact_directory_error(error),
            }
        }
        ("POST", "/local-api/contacts/block") | ("POST", "/local-api/contacts/unblock") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "contacts_unavailable", None, None);
            };
            let Some(account_id) = json_string(request.body, "account_id") else {
                return response(400, "account_id_required", None, Some("application/json"));
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            let blocked = request.path.ends_with("/block");
            match authority.set_contact_blocked(&account_id, blocked, store) {
                Ok(()) => response(
                    200,
                    if blocked {
                        r##"{"blocked":true}"##
                    } else {
                        r##"{"blocked":false}"##
                    },
                    None,
                    Some("application/json"),
                ),
                Err(error) => contact_directory_error(error),
            }
        }
        ("POST", "/local-api/contacts/delete") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "contacts_unavailable", None, None);
            };
            let Some(account_id) = json_string(request.body, "account_id") else {
                return response(400, "account_id_required", None, Some("application/json"));
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            let removed = match authority.remove_contact(&account_id, store) {
                Ok(contact) => contact,
                Err(error) => return contact_directory_error(error),
            };
            if let Some(conversation_id) = removed.conversation_id.as_deref() {
                if let Some(catalog) = session_catalog.as_deref_mut() {
                    match catalog.remove(conversation_id, store) {
                        Ok(()) | Err(SessionCatalogError::UnknownConversation) => {}
                        Err(error) => return catalog_error(error),
                    }
                } else {
                    let _ = store.delete(
                        RecordClass::ProtocolSession,
                        &format!("mls/session/{conversation_id}"),
                    );
                }
            }
            response(200, r##"{"deleted":true}"##, None, Some("application/json"))
        }
        ("POST", "/local-api/contacts/bind-conversation") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "contacts_unavailable", None, None);
            };
            let Some(account_id) = json_string(request.body, "account_id") else {
                return response(400, "account_id_required", None, Some("application/json"));
            };
            let Some(conversation_id) = json_string(request.body, "conversation_id") else {
                return response(
                    400,
                    "conversation_id_required",
                    None,
                    Some("application/json"),
                );
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            match authority.bind_contact_conversation(&account_id, &conversation_id, store) {
                Ok(()) => response(200, r##"{"bound":true}"##, None, Some("application/json")),
                Err(error) => contact_directory_error(error),
            }
        }
        ("POST", "/local-api/contacts/read") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "contacts_unavailable", None, None);
            };
            let Some(account_id) = json_string(request.body, "account_id") else {
                return response(400, "account_id_required", None, Some("application/json"));
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            match authority.mark_contact_read(&account_id, store) {
                Ok(()) => response(200, r##"{"read":true}"##, None, Some("application/json")),
                Err(error) => contact_directory_error(error),
            }
        }
        ("GET", "/local-api/conversations") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(catalog) = session_catalog.as_deref_mut() else {
                return response(503, "session_unavailable", None, None);
            };
            let payload =
                serde_json::to_string(&catalog.conversation_ids()).unwrap_or_else(|_| "[]".into());
            response(
                200,
                &format!(r##"{{"conversations":{payload}}}"##),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/messages/list") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(conversation_id) = json_string(request.body, "conversation_id") else {
                return response(400, "invalid_conversation", None, Some("application/json"));
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            let limit = json_u64(request.body, "limit")
                .and_then(|value| usize::try_from(value).ok())
                .unwrap_or(200)
                .clamp(1, 200);
            let offset = json_u64(request.body, "offset")
                .and_then(|value| usize::try_from(value).ok())
                .unwrap_or(0);
            let mut messages = Vec::new();
            let page = store.records_with_prefix_page(
                RecordClass::Message,
                "messages/",
                offset,
                limit.saturating_add(1),
            );
            let truncated = page.len() > limit;
            for (key, bytes) in page.into_iter().take(limit) {
                let Ok(message) = serde_json::from_slice::<StoredMessage>(&bytes) else {
                    return response(503, "message_storage_corrupt", None, None);
                };
                if message.conversation_id != conversation_id {
                    continue;
                }
                if message.expires_at != 0 && message.expires_at <= now {
                    let _ = store.delete(RecordClass::Message, &key);
                    continue;
                }
                messages.push(format!(
                    r##"{{"message_id":"{}","direction":"{}","created_at":{},"expires_at":{},"plaintext":"{}"}}"##,
                    json_escape(&message.message_id),
                    json_escape(&message.direction),
                    message.created_at,
                    message.expires_at,
                    hex_bytes(message.text.as_bytes())
                ));
            }
            response(
                200,
                &format!(
                    r##"{{"messages":[{}],"next_offset":{}}}"##,
                    messages.join(","),
                    if truncated {
                        (offset + limit).to_string()
                    } else {
                        "null".into()
                    }
                ),
                None,
                Some("application/json"),
            )
        }
        ("POST", "/local-api/pairing/reject") => {
            if let Err(reply) = authorize_api(bridge, &request, now) {
                return reply;
            }
            let Some(authority) = invite_authority else {
                return response(503, "pairing_unavailable", None, None);
            };
            let Some(store) = session_store.as_deref_mut() else {
                return response(503, "storage_unavailable", None, None);
            };
            match authority.reject_pairing(store) {
                Ok(()) => response(
                    200,
                    r##"{"state":"rejected","rejected":true}"##,
                    None,
                    Some("application/json"),
                ),
                Err(error) => pairing_error(error),
            }
        }
        _ => response(404, "not_found", None, None),
    }
}
