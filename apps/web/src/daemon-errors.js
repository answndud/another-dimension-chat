const ERROR_MESSAGES = Object.freeze({
  "invalid-bootstrap": "데몬 시작 주소가 만료되었거나 형식이 올바르지 않습니다. 데몬에서 새 주소를 발급하세요.",
  "unsafe-origin": "신뢰할 수 없는 주소에서는 데몬을 열 수 없습니다. 127.0.0.1 주소를 사용하세요.",
  unavailable: "로컬 보안 데몬에 연결할 수 없습니다. 데몬을 실행한 뒤 새 주소로 다시 여세요.",
  "invalid-session": "브라우저 데몬 세션이 유효하지 않습니다. 데몬에서 새 주소를 발급하세요.",
  session_invalid: "브라우저 데몬 세션이 만료되었습니다. 잠근 뒤 새 세션을 여세요.",
  pairing_not_ready: "상대방의 안전 번호 확인과 승인이 끝나야 메시지를 보낼 수 있습니다.",
  pairing_binding_changed: "상대방의 신원 또는 연결 경로가 바뀌었습니다. 안전 번호를 다시 확인하세요.",
  relay_unavailable: "릴레이에 연결할 수 없습니다. 로컬 암호화 상태는 유지되며 연결 후 재시도하세요.",
  relay_capability_expired: "릴레이 연결 권한이 폐기되었습니다. 새 초대 연결을 시작하세요.",
  recovery_invalid: "복구 백업 검증에 실패했습니다. 원본 파일을 유지한 채 다시 확인하세요.",
  storage_locked: "데몬 저장소가 잠겨 있습니다. 데몬을 다시 잠금 해제하세요.",
});

export function daemonErrorMessage(error) {
  const code = typeof error?.code === "string" ? error.code : "";
  if (code && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (typeof error?.message === "string" && error.message.trim()) return error.message;
  return "요청을 완료하지 못했습니다. 현재 상태를 확인한 뒤 다시 시도하세요.";
}

export function daemonErrorCode(error) {
  return typeof error?.code === "string" && error.code ? error.code : "unknown";
}
