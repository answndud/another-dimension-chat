const STATUS_BY_ERROR = Object.freeze({
  request_too_large: 413,
  request_timeout: 408,
  content_type_not_allowed: 400,
  blob_offset_mismatch: 409,
  blob_metadata_mismatch: 409,
  blob_quota_exceeded: 507,
});

export function errorCode(error, fallback = "server_error") {
  const code = typeof error?.code === "string" && error.code
    ? error.code
    : typeof error?.message === "string" && error.message
      ? error.message
      : fallback;
  return /^[a-z][a-z0-9_:-]*$/.test(code) ? code : fallback;
}

export function errorStatus(error, fallback = 400) {
  return STATUS_BY_ERROR[errorCode(error)] || fallback;
}

export function errorBody(error, fields = {}) {
  return { ...fields, error: errorCode(error) };
}
