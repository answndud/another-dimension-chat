export function transcriptRetentionView(entry) {
  const ttlSeconds = Number.parseInt(entry?.ttlSeconds ?? entry?.ttl_seconds ?? 0, 10);
  if (entry?.expired === true) {
    return {
      label: "retention: expired",
      state: "is-expired",
    };
  }
  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
    return {
      label: "retention: legacy",
      state: "is-unknown",
    };
  }
  return {
    label: `retention: ${retentionDurationLabel(ttlSeconds)} active`,
    state: "is-active",
  };
}

function retentionDurationLabel(ttlSeconds) {
  if (ttlSeconds % 86400 === 0) {
    return `${ttlSeconds / 86400}d`;
  }
  if (ttlSeconds % 3600 === 0) {
    return `${ttlSeconds / 3600}h`;
  }
  if (ttlSeconds % 60 === 0) {
    return `${ttlSeconds / 60}m`;
  }
  return `${ttlSeconds}s`;
}
