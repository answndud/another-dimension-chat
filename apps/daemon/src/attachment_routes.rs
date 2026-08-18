use super::{authorize_api, hex_decode, json_string, json_u64, response, Request, RouteContext};

pub(crate) fn handle_attachment_route(
    request: &Request<'_>,
    context: &mut RouteContext<'_>,
) -> Option<Vec<u8>> {
    // Network-bearing attachment routes are owned by the staged handlers in
    // http_server.rs. A direct in-process caller must fail closed instead of
    // reintroducing lock-held relay I/O through this legacy dispatcher.
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
