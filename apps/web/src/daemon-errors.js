const GENERIC_ERROR_MESSAGE = "요청을 완료하지 못했습니다. 현재 상태를 확인한 뒤 다시 시도하세요.";

const SESSION_MESSAGE = "로컬 보안 세션이 유효하지 않습니다. 터미널에서 새 시작 주소를 발급해 다시 여세요.";
const INPUT_MESSAGE = "입력값이 올바르지 않습니다. 화면의 필수 항목을 확인한 뒤 다시 시도하세요.";
const STORAGE_MESSAGE = "암호화 저장소 작업을 완료하지 못했습니다. 보안 서비스 상태와 남은 저장 공간을 확인하세요.";
const PAIRING_MESSAGE = "연결 확인을 완료하지 못했습니다. 초대 만료 여부와 상대방의 안전 번호를 다시 확인하세요.";
const CONTACT_MESSAGE = "연락처 상태를 변경하지 못했습니다. 현재 차단·연결 상태를 새로고침한 뒤 다시 시도하세요.";
const DEVICE_MESSAGE = "기기 상태를 변경하지 못했습니다. 현재 기기 목록과 연결 코드를 다시 확인하세요.";
const SESSION_CRYPTO_MESSAGE = "암호화 대화 상태가 일치하지 않습니다. 전송을 멈추고 상대방의 신원과 대화 상태를 다시 확인하세요.";
const ATTACHMENT_MESSAGE = "첨부파일을 안전하게 처리하지 못했습니다. 원본을 유지한 채 파일 크기와 전송 상태를 확인하세요.";
const DELIVERY_MESSAGE = "암호문 전달 상태를 확인하지 못했습니다. 중복 전송하지 말고 현재 전달 상태를 새로고침하세요.";
const RELAY_MESSAGE = "전달 경로에 연결할 수 없습니다. 로컬 암호화 상태는 유지되며 연결이 복구된 뒤 재시도하세요.";

const groupedMessages = [
  [SESSION_MESSAGE, [
    "invalid-bootstrap", "invalid-session", "session_invalid", "invalid_bootstrap",
    "invalid_origin", "invalid_host", "csrf_required", "bootstrap_consumed",
    "bridge_rejected", "bridge_unavailable", "request_timeout", "request_too_large",
    "invalid_request", "ui_not_found", "not_found", "exchange-failed",
  ]],
  [INPUT_MESSAGE, [
    "account_id_required", "conversation_id_required", "device_id_required", "alias_required",
    "link_code_required", "link_request_required", "relay_receipt_required",
    "safety_number_required", "tls_pin_required", "invalid_expiry", "invalid_message_expiry",
  ]],
  [STORAGE_MESSAGE, [
    "storage_locked", "storage_unavailable", "message_storage_corrupt",
    "message_storage_unavailable", "session_storage_unavailable", "daemon_busy",
    "daemon_shutting_down", "staged_route_required",
    "recovery_export_unavailable", "recovery_invalid",
    "invalid_recovery_artifact", "wipe_incomplete", "attachment_state_unavailable",
  ]],
  [PAIRING_MESSAGE, [
    "pairing_not_ready", "pairing_binding_changed", "pairing_unavailable",
    "pairing_invalid_transition", "pairing_expired", "pairing_duplicate", "self_invite",
    "safety_number_mismatch", "invalid_invite", "invite_unavailable",
    "invalid_relay_receipt", "randomness_unavailable",
    "invalid_pairing_response", "invite_missing_conversation", "pairing_conversation_mismatch",
    "pairing_conversation_unknown", "pairing_rendezvous_unavailable", "pairing_rendezvous_unknown",
    "peer_unavailable", "peer_protocol_unavailable", "peer_expired", "conversation_binding_changed",
  ]],
  [CONTACT_MESSAGE, [
    "contact_blocked", "contacts_unavailable", "contact_device_conflict", "contact_not_found",
    "contacts_storage_corrupt", "invalid_contact_state", "invalid_alias",
    "conversation_exists", "conversation_not_found", "invalid_conversation",
  ]],
  [DEVICE_MESSAGE, [
    "current_device_revoke_forbidden", "device_account_mismatch", "device_already_registered",
    "device_already_revoked", "device_change_delivery_pending", "device_link_expired",
    "device_not_found", "device_registry_invalid", "device_unavailable",
    "invalid_device_link_code", "invalid_device_link_request", "root_authority_unavailable",
    "identity_unavailable",
  ]],
  [SESSION_CRYPTO_MESSAGE, [
    "session_operation_failed", "session_unavailable", "invalid_key_package", "invalid_welcome",
    "invalid_ciphertext", "invalid_message", "message_decrypt_failed", "message_encoding_failed",
    "protocol_unavailable", "protocol_version_unsupported", "clock_skew",
  ]],
  [ATTACHMENT_MESSAGE, [
    "attachment_chunk_not_found", "attachment_not_complete", "attachment_not_found",
    "attachment_session_failed", "attachment_verification_failed", "descriptor_unavailable",
    "invalid_attachment", "invalid_attachment_chunk", "invalid_attachment_descriptor",
    "invalid_attachment_id", "invalid_attachment_index", "invalid_attachment_size",
    "invalid_blob_chunk", "invalid_blob_id", "invalid_blob_offset", "invalid_blob_total",
  ]],
  [DELIVERY_MESSAGE, [
    "delivery_endpoint_mismatch", "delivery_not_found", "delivery_not_retriable",
    "delivery_not_retryable", "delivery_retry_backoff", "delivery_retry_exhausted",
    "delivery_state_changed", "delivery_state_unavailable", "delivery_unavailable", "duplicate_delivery",
    "invalid_delivery_digest", "invalid_delivery_envelope", "invalid_delivery_ids",
    "invalid_relay_envelope",
  ]],
  [RELAY_MESSAGE, [
    "relay_unavailable", "relay_rejected", "relay_capability_expired", "relay_retrust_required",
    "relay_trust_unavailable", "unsupported_relay_endpoint", "invalid_inbox_url",
    "invalid_tls_pin", "tls_pin_requires_https", "rate_limit_exceeded", "invite_queue_full",
    "relay_state_corrupt", "relay_state_exceeds_limit",
  ]],
];

const ERROR_MESSAGES = Object.freeze(Object.fromEntries(
  groupedMessages.flatMap(([message, codes]) => codes.map((code) => [code, message])),
));

export function hasDaemonErrorGuidance(code) {
  return typeof code === "string" && Object.hasOwn(ERROR_MESSAGES, code);
}

export function daemonErrorMessage(error) {
  const code = typeof error?.code === "string" ? error.code : "";
  if (hasDaemonErrorGuidance(code)) return ERROR_MESSAGES[code];
  // A coded daemon failure is an internal contract value, not user-facing copy.
  if (code) return GENERIC_ERROR_MESSAGE;
  if (typeof error?.message === "string" && error.message.trim()) return error.message;
  return GENERIC_ERROR_MESSAGE;
}

export function daemonErrorCode(error) {
  return typeof error?.code === "string" && error.code ? error.code : "unknown";
}
