export function combinedTwoProfileTranscriptTsv(profileA, profileAResult, profileB, profileBResult) {
  const header = "source_profile\tdirection\tmessage_number\tcreated_at_ms\tttl_seconds\texpires_at_ms\tmessage";
  const rows = [
    ...prefixedTranscriptRows(profileA, profileAResult?.transcript_tsv),
    ...prefixedTranscriptRows(profileB, profileBResult?.transcript_tsv),
  ]
    .sort((left, right) => (
      left.createdAtMs - right.createdAtMs ||
      left.messageNumber - right.messageNumber ||
      left.sourceProfile.localeCompare(right.sourceProfile) ||
      left.direction.localeCompare(right.direction)
    ))
    .map((row) => row.line);
  return `${[header, ...rows].join("\n")}\n`;
}

function prefixedTranscriptRows(profile, transcriptTsv) {
  return String(transcriptTsv ?? "")
    .split(/\r?\n/)
    .slice(1)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const columns = line.split("\t");
      return {
        sourceProfile: profile,
        direction: columns[0] ?? "",
        messageNumber: Number.parseInt(columns[1] ?? "0", 10) || 0,
        createdAtMs: Number.parseInt(columns[2] ?? "0", 10) || 0,
        line: `${profile}\t${line}`,
      };
    });
}
