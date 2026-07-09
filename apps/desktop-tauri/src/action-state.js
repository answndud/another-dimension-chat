export function productionTwoProfileReadiness(input, busy) {
  if (busy) {
    return "Running: action in progress";
  }
  if (!input.profileA) {
    return "Invite code needed";
  }
  if (!input.profileB) {
    return "Invite code needed";
  }
  if (input.profileA === input.profileB) {
    return "Invite code must be different from this device";
  }
  if (!input.passphrase) {
    return "Invite code needed";
  }
  return "Ready: room can be created";
}

function inviteCodeSlugChecksum(value) {
  // UI-only checksum for local profile-name disambiguation; not security material.
  let hash = 0x811c9dc5;
  for (const char of String(value ?? "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).padStart(7, "0").slice(0, 7);
}

export function productionInviteCodeProfiles(code, role = "joiner") {
  const connectionCode = String(code ?? "").trim();
  const normalizedCode = connectionCode.toLowerCase();
  const readableSlug =
    normalizedCode
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24)
      .replace(/-+$/g, "") || "code";
  const slugNeedsHash =
    readableSlug !== normalizedCode ||
    connectionCode !== normalizedCode ||
    readableSlug.length !== normalizedCode.length ||
    readableSlug.length > 24;
  const slug = slugNeedsHash
    ? `${readableSlug}-${inviteCodeSlugChecksum(connectionCode)}`
    : connectionCode
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 32);
  const normalizedRole = role === "inviter" ? "inviter" : "joiner";
  const peerRole = normalizedRole === "inviter" ? "joiner" : "inviter";
  return {
    connectionCode,
    role: normalizedRole,
    slug,
    localProfile: `${normalizedRole}-${slug}`,
    peerProfile: `${peerRole}-${slug}`,
  };
}

export function productionInviteCodeProfileName(value) {
  return /^(inviter|joiner)-/.test(String(value ?? "").trim().toLowerCase());
}

export function productionInviteIdentityBoundaryView(input = {}) {
  const profileA = String(input.profileA ?? "").trim();
  const profileB = String(input.profileB ?? "").trim();
  const hasRoom = Boolean(profileA && profileB && profileA !== profileB && input.passphrase);
  const pairwiseProfilesDerived =
    productionInviteCodeProfileName(profileA) && productionInviteCodeProfileName(profileB);
  return [
    "accountless=true",
    "phone_number_required=false",
    "email_required=false",
    "global_account_required=false",
    "searchable_username=false",
    "public_directory=false",
    "central_contact_discovery=false",
    "central_message_server=false",
    "pairwise_identity=true",
    `pairwise_profiles_derived=${pairwiseProfilesDerived}`,
    "invite_code_sensitive=true",
    "invite_code_in_diagnostics=false",
    "qr_required=false",
    "qr_optional_future=true",
    `room_present=${hasRoom}`,
  ].join(" ");
}

const highRiskThreatModelMatrix = [
  {
    attackerClass: "remote_passive_observer",
    status: "mitigated",
    reason:
      "Encrypted manual envelopes and explicit network delivery reduce content exposure, but metadata and global correlation are not fully hidden.",
  },
  {
    attackerClass: "remote_active_attacker",
    status: "mitigated",
    reason:
      "Pairing, envelope, replay, and transport boundaries fail closed, but this is not an audited active-attack proof.",
  },
  {
    attackerClass: "malicious_peer",
    status: "mitigated",
    reason:
      "Signed invites, safety checks, duplicate handling, and malformed payload rejection reduce false-safe states.",
  },
  {
    attackerClass: "local_at_rest_attacker",
    status: "mitigated",
    reason:
      "Passphrase-first encrypted local storage is required, but unlocked or compromised endpoints are outside the claim.",
  },
  {
    attackerClass: "supply_chain_update_attacker",
    status: "mitigated",
    reason:
      "Manual same-release checksum, provenance, and advisory paths reduce update risk without claiming audited supply-chain security.",
  },
  {
    attackerClass: "compromised_endpoint",
    status: "not_protected",
    reason:
      "Malware or full device compromise can observe plaintext, keys, UI, and user actions outside the app boundary.",
  },
  {
    attackerClass: "direct_coercion",
    status: "not_protected",
    reason:
      "The app cannot prevent forced disclosure or forced action; later panic controls are mitigation only.",
  },
  {
    attackerClass: "global_traffic_correlation",
    status: "not_protected",
    reason:
      "Metadata minimization can reduce exposure, but full global traffic-correlation defense is not claimed.",
  },
];

export function productionHighRiskThreatModelClaimMatrix() {
  return highRiskThreatModelMatrix.map((entry) => ({ ...entry }));
}

export function productionHighRiskThreatModelBoundaryView() {
  const matrix = productionHighRiskThreatModelClaimMatrix();
  const claimable = matrix
    .filter((entry) => entry.status === "protected" || entry.status === "mitigated")
    .map((entry) => entry.attackerClass);
  const notProtected = matrix
    .filter((entry) => entry.status === "not_protected")
    .map((entry) => entry.attackerClass);
  return {
    matrix,
    claimable,
    notProtected,
    boundary: [
      "ordinary_use_claim=no-phone#no-email#no-global-account#no-central-contact-discovery#pairwise-invite#user-mediated-encrypted-exchange#redacted-diagnostics",
      `high_risk_matrix=${matrix.map((entry) => `${entry.attackerClass}:${entry.status}`).join(",")}`,
      `claimable_statuses=protected,mitigated`,
      `not_protected=${notProtected.join(",")}`,
      "audited_security_claim=false",
      "briar_cwtch_equivalence_claim=false",
      "compromised_endpoint_safe_claim=false",
      "coercion_safe_claim=false",
      "full_global_traffic_correlation_safe_claim=false",
      "full_censorship_resistance_claim=false",
      "reliable_external_onion_delivery_claim=false",
    ].join(" "),
  };
}

export function productionHighRiskTransportMetadataBoundaryView() {
  return {
    status: "not-ready",
    notReadyReason: "runtime-network-disabled-until-explicit-user-action",
    boundary: [
      "high_risk_transport_mode=onion-only",
      "high_risk_transport_onion_only=true",
      "high_risk_transport_direct_fallback=false",
      "high_risk_transport_dns_endpoint=false",
      "high_risk_transport_ip_endpoint=false",
      "high_risk_transport_explicit_user_permission=true",
      "high_risk_transport_app_launch_bootstrap=false",
      "high_risk_transport_bridge_failure_class=redacted",
      "high_risk_transport_bridge_line_exposed=false",
      "high_risk_transport_onion_endpoint_exposed=false",
      "high_risk_transport_descriptor_exposed=false",
      "high_risk_transport_local_path_exposed=false",
      "high_risk_transport_envelope_size_bucket=bucket-4k",
      "high_risk_transport_optional_send_delay=true",
      "high_risk_transport_timestamp_precision=minute",
      "high_risk_transport_redacted_contact_id=true",
      "high_risk_transport_redacted_session_id=true",
      "high_risk_transport_endpoint_state_separated=true",
      "high_risk_transport_stream_retry_cancel_state_separated=true",
      "high_risk_transport_ready=false",
      "high_risk_transport_not_ready_reason=runtime-network-disabled-until-explicit-user-action",
    ].join(" "),
  };
}

export function productionHighRiskReadinessGateView(input = {}) {
  const threatMatrixAccepted = input.threatMatrixAccepted === true;
  const pairwiseSafetyVerified = input.pairwiseSafetyVerified === true;
  const highRiskTransportReady = input.highRiskTransportReady === true;
  const highRiskTransportExplicitlyDisabled = input.highRiskTransportExplicitlyDisabled === true;
  const productionKeyManagementReady = input.productionKeyManagementReady === true;
  const rollbackMarkerHealthy = input.rollbackMarkerHealthy === true;
  const diagnosticsRedacted = input.diagnosticsRedacted === true;
  const releaseIntegrityAvailable = input.releaseIntegrityAvailable === true;
  const missing = [];
  if (!threatMatrixAccepted) missing.push(["threat-matrix-not-accepted", "accept-threat-model"]);
  if (!pairwiseSafetyVerified) missing.push(["safety-not-verified", "verify-safety-number"]);
  if (!productionKeyManagementReady) {
    missing.push(["key-management-not-ready", "unlock-profile-with-production-key-management"]);
  }
  if (!rollbackMarkerHealthy) missing.push(["rollback-marker-not-healthy", "check-local-data-lifecycle"]);
  if (!diagnosticsRedacted) missing.push(["diagnostics-not-redacted", "use-redacted-support-report"]);
  if (!releaseIntegrityAvailable) missing.push(["release-integrity-missing", "run-release-integrity-gate"]);
  if (!highRiskTransportReady && !highRiskTransportExplicitlyDisabled) {
    missing.push(["transport-neither-ready-nor-disabled", "enable-high-risk-transport-or-mark-disabled"]);
  }
  const baseReady = missing.length === 0;
  const status = baseReady && highRiskTransportReady
    ? "ready"
    : baseReady && highRiskTransportExplicitlyDisabled
      ? "limited"
      : "not_ready";
  const primary = status === "ready"
    ? ["none", "ready"]
    : status === "limited"
      ? ["transport-explicitly-disabled", "enable-high-risk-transport-for-ready"]
      : missing[0] ?? ["unknown", "review-high-risk-checklist"];
  const reasonCodes = status === "limited" ? [primary[0]] : missing.map(([code]) => code);
  const nextActions = status === "limited" ? [primary[1]] : missing.map(([, action]) => action);
  const highRiskReadyClaimAllowed = status === "ready";
  const summary = [
    `high_risk_readiness=${status}`,
    `primary_reason_code=${primary[0]}`,
    `next_action=${primary[1]}`,
    `reason_codes=${reasonCodes.join("#") || "none"}`,
    `next_actions=${nextActions.join("#") || "none"}`,
    `threat_matrix_accepted=${threatMatrixAccepted}`,
    `pairwise_safety_verified=${pairwiseSafetyVerified}`,
    `high_risk_transport_ready=${highRiskTransportReady}`,
    `high_risk_transport_explicitly_disabled=${highRiskTransportExplicitlyDisabled}`,
    `production_key_management_ready=${productionKeyManagementReady}`,
    `rollback_marker_healthy=${rollbackMarkerHealthy}`,
    `diagnostics_redacted=${diagnosticsRedacted}`,
    `release_integrity_available=${releaseIntegrityAvailable}`,
    `high_risk_ready_claim_allowed=${highRiskReadyClaimAllowed}`,
    `public_support_high_risk_claim_allowed=${highRiskReadyClaimAllowed}`,
    `release_high_risk_claim_allowed=${highRiskReadyClaimAllowed}`,
    "unmet_conditions_hidden=false",
  ].join(" ");
  return {
    status,
    primaryReasonCode: primary[0],
    nextAction: primary[1],
    reasonCodes,
    nextActions,
    highRiskReadyClaimAllowed,
    publicSupportHighRiskClaimAllowed: highRiskReadyClaimAllowed,
    releaseHighRiskClaimAllowed: highRiskReadyClaimAllowed,
    unmetConditionsHidden: false,
    summary,
    boundary: `${summary} status_values=ready#limited#not_ready`,
  };
}

export function productionFinalReleaseAcceptanceView(input = {}) {
  const highRiskReadinessValues = new Set(["ready", "limited", "not_ready"]);
  const highRiskReadiness = highRiskReadinessValues.has(input.highRiskReadiness)
    ? input.highRiskReadiness
    : "not_ready";
  const acceptanceBarItems = 27;
  const acceptanceBarCovered = true;
  const p0P1LocalBugAuditComplete = input.p0P1LocalBugAuditComplete === true;
  const p0P1LocalBugsPresent = input.p0P1LocalBugsPresent === true;
  const sourceAcceptanceSuitePassed = input.sourceAcceptanceSuitePassed === true;
  const releaseArtifactConsistencyVerified = input.releaseArtifactConsistencyVerified === true;
  const externalTwoMachineEvidencePresent = input.externalTwoMachineEvidencePresent === true;
  const macosPublicArtifactConsistencyVerified = input.macosPublicArtifactConsistencyVerified === true;
  const windowsPublicArtifactConsistencyVerified = input.windowsPublicArtifactConsistencyVerified === true;
  const emergencyAdvisoryPathReady = input.emergencyAdvisoryPathReady === true;
  const publicCopyClaimsReviewed = input.publicCopyClaimsReviewed === true;
  const supportRedactionVerified = input.supportRedactionVerified === true;
  const publicBetaReady =
    acceptanceBarCovered &&
    p0P1LocalBugAuditComplete &&
    !p0P1LocalBugsPresent &&
    sourceAcceptanceSuitePassed &&
    publicCopyClaimsReviewed &&
    supportRedactionVerified;
  const stableCandidateReady =
    publicBetaReady &&
    externalTwoMachineEvidencePresent &&
    macosPublicArtifactConsistencyVerified &&
    windowsPublicArtifactConsistencyVerified &&
    emergencyAdvisoryPathReady;
  const stablePublicAppReady = stableCandidateReady && releaseArtifactConsistencyVerified;
  const highRiskModeReady = highRiskReadiness === "ready";
  const releaseClass = stablePublicAppReady
    ? "stable"
    : stableCandidateReady
      ? "stable_candidate"
      : "public_beta";
  const releaseDecision =
    stablePublicAppReady && highRiskModeReady
      ? "stable-and-high-risk-ready"
      : stablePublicAppReady
        ? "stable-ready-high-risk-hold"
        : stableCandidateReady && highRiskModeReady
          ? "stable-candidate-ready-high-risk-ready"
          : stableCandidateReady
            ? "stable-candidate-ready-high-risk-hold"
        : "hold";
  const summary = [
    `release_class=${releaseClass}`,
    `acceptance_bar_items=${acceptanceBarItems}`,
    `acceptance_bar_covered=${acceptanceBarCovered}`,
    "payload_recorded=false",
    "passphrase_recorded=false",
    "local_path_recorded=false",
    "key_material_recorded=false",
    `p0_p1_local_bug_audit_complete=${p0P1LocalBugAuditComplete}`,
    `p0_p1_local_bugs_present=${p0P1LocalBugsPresent}`,
    `source_acceptance_suite_passed=${sourceAcceptanceSuitePassed}`,
    `release_artifact_consistency_verified=${releaseArtifactConsistencyVerified}`,
    `external_two_machine_evidence_present=${externalTwoMachineEvidencePresent}`,
    `macos_public_artifact_consistency_verified=${macosPublicArtifactConsistencyVerified}`,
    `windows_public_artifact_consistency_verified=${windowsPublicArtifactConsistencyVerified}`,
    `emergency_advisory_path_ready=${emergencyAdvisoryPathReady}`,
    `public_copy_claims_reviewed=${publicCopyClaimsReviewed}`,
    `support_redaction_verified=${supportRedactionVerified}`,
    `public_beta_ready=${publicBetaReady}`,
    `stable_candidate_ready=${stableCandidateReady}`,
    `stable_public_app_ready=${stablePublicAppReady}`,
    `high_risk_readiness=${highRiskReadiness}`,
    `high_risk_mode_ready=${highRiskModeReady}`,
    `release_decision=${releaseDecision}`,
    "audited_claim=false",
    "briar_cwtch_signal_equivalence_claim=false",
    "compromised_device_safe_claim=false",
    "coercion_safe_claim=false",
    "full_global_correlation_safe_claim=false",
  ].join(" ");
  return {
    acceptanceBarItems,
    acceptanceBarCovered,
    payloadRecorded: false,
    passphraseRecorded: false,
    localPathRecorded: false,
    keyMaterialRecorded: false,
    p0P1LocalBugAuditComplete,
    p0P1LocalBugsPresent,
    sourceAcceptanceSuitePassed,
    releaseArtifactConsistencyVerified,
    externalTwoMachineEvidencePresent,
    macosPublicArtifactConsistencyVerified,
    windowsPublicArtifactConsistencyVerified,
    emergencyAdvisoryPathReady,
    publicCopyClaimsReviewed,
    supportRedactionVerified,
    publicBetaReady,
    stableCandidateReady,
    stablePublicAppReady,
    highRiskReadiness,
    highRiskModeReady,
    releaseClass,
    releaseDecision,
    summary,
    boundary: `${summary} readiness_streams=public_beta#stable_candidate#stable_public_app#high_risk_mode`,
  };
}

export function productionExternalTwoMachineEvidenceView(input = {}) {
  const machineAReportPresent = input.machineAReportPresent === true;
  const machineBReportPresent = input.machineBReportPresent === true;
  const appVersionMatch = input.appVersionMatch === true;
  const buildCommitMatch = input.buildCommitMatch === true;
  const checksumMatch = input.checksumMatch === true;
  const inviteCreated = input.inviteCreated === true;
  const safetyCompared = input.safetyCompared === true;
  const outboundExported = input.outboundExported === true;
  const inboundImported = input.inboundImported === true;
  const retryCancelDeleteVerified = input.retryCancelDeleteVerified === true;
  const broadFailureClass = releaseIntegrityToken(input.broadFailureClass, "none-redacted");
  const broadFailureClassRedacted = broadFailureClass !== "raw" && !/[/.@]/.test(broadFailureClass);
  const forbiddenFieldsPresent = input.forbiddenFieldsPresent === true;
  const localOnlyRehearsal = input.localOnlyRehearsal === true;
  const fabricatedEvidence = input.fabricatedEvidence === true;
  const reportsPresent = machineAReportPresent && machineBReportPresent;
  const flowComplete =
    inviteCreated &&
    safetyCompared &&
    outboundExported &&
    inboundImported &&
    retryCancelDeleteVerified;
  const accepted =
    reportsPresent &&
    appVersionMatch &&
    buildCommitMatch &&
    checksumMatch &&
    flowComplete &&
    broadFailureClassRedacted &&
    !forbiddenFieldsPresent &&
    !localOnlyRehearsal &&
    !fabricatedEvidence;
  const primaryBlocker = fabricatedEvidence
    ? "fabricated-evidence"
    : localOnlyRehearsal
      ? "local-only-rehearsal"
      : !reportsPresent
        ? "missing-peer-report"
        : !appVersionMatch || !buildCommitMatch || !checksumMatch
          ? "build-or-checksum-mismatch"
          : forbiddenFieldsPresent
            ? "forbidden-field-present"
            : !flowComplete
              ? "flow-incomplete"
              : !broadFailureClassRedacted
                ? "failure-class-not-redacted"
                : "none";
  const nextAction = accepted ? "ready-for-maintainer-review" : "collect-real-two-machine-peer-reports";
  const allowedFields =
    "schema_version#app_version#build_commit#platform_pair#checksum_status#machine_a_report_present#machine_b_report_present#invite_created#safety_compared#outbound_exported#inbound_imported#retry_cancel_delete_verified#broad_failure_class";
  const forbiddenFields =
    "invite_body#envelope_payload#onion_endpoint#local_path#profile_name#message_body#passphrase#private_key#key_material#raw_logs";
  const summary = [
    `external_two_machine_evidence_present=${accepted}`,
    `stable_candidate_evidence_present=${accepted}`,
    `primary_blocker=${primaryBlocker}`,
    `next_action=${nextAction}`,
    `machine_a_report_present=${machineAReportPresent}`,
    `machine_b_report_present=${machineBReportPresent}`,
    `app_version_match=${appVersionMatch}`,
    `build_commit_match=${buildCommitMatch}`,
    `checksum_match=${checksumMatch}`,
    `invite_created=${inviteCreated}`,
    `safety_compared=${safetyCompared}`,
    `outbound_exported=${outboundExported}`,
    `inbound_imported=${inboundImported}`,
    `retry_cancel_delete_verified=${retryCancelDeleteVerified}`,
    `broad_failure_class=${broadFailureClass}`,
    `broad_failure_class_redacted=${broadFailureClassRedacted}`,
    `forbidden_fields_present=${forbiddenFieldsPresent}`,
    `local_only_rehearsal=${localOnlyRehearsal}`,
    `fabricated_evidence=${fabricatedEvidence}`,
    "local_only_promoted_to_external=false",
    "reliable_delivery_claim_allowed=false",
    "audited_claim_allowed=false",
    `allowed_fields=${allowedFields}`,
    `forbidden_fields=${forbiddenFields}`,
  ].join(" ");
  return {
    accepted,
    stableCandidateEvidencePresent: accepted,
    primaryBlocker,
    nextAction,
    machineAReportPresent,
    machineBReportPresent,
    appVersionMatch,
    buildCommitMatch,
    checksumMatch,
    inviteCreated,
    safetyCompared,
    outboundExported,
    inboundImported,
    retryCancelDeleteVerified,
    broadFailureClass,
    broadFailureClassRedacted,
    forbiddenFieldsPresent,
    localOnlyRehearsal,
    fabricatedEvidence,
    localOnlyPromotedToExternal: false,
    reliableDeliveryClaimAllowed: false,
    auditedClaimAllowed: false,
    allowedFields,
    forbiddenFields,
    summary,
    boundary: `${summary} evidence_scope=real-two-machine-redacted-peer-reports-only`,
  };
}

function releaseIntegrityToken(value, fallback = "unknown") {
  const token = String(value ?? "")
    .trim()
    .replace(/[^A-Za-z0-9._:/#-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return token || fallback;
}

export function productionVersionIntegrityView(input = {}) {
  const currentVersion = releaseIntegrityToken(input.currentVersion ?? input.appVersion, "0.1.0");
  const buildChannel = releaseIntegrityToken(input.buildChannel, "unknown-channel");
  const buildCommit = releaseIntegrityToken(input.buildCommit, "unknown-commit");
  const latestVersion = releaseIntegrityToken(input.latestVersion, "manual-check-required");
  const currentReleaseTag = releaseIntegrityToken(input.currentReleaseTag, "current-release-tag-unknown");
  const expectedReleaseAuthority = "same-github-release-assets";
  const checksumVerification = "matching-sha256-before-open";
  const emergencyAdvisoryPath = "scripts/prepare_macos_emergency_release_advisory_packet.sh";
  const highRiskReleaseIntegrityGatePath = "scripts/high_risk_release_integrity_gate_once.sh";
  const versionComparison =
    latestVersion === "manual-check-required"
      ? "manual-update-check-required"
      : latestVersion === currentVersion
        ? "same-version"
        : "manual-review-newer-or-different-version";
  const summary = [
    `current_version=${currentVersion}`,
    `build_channel=${buildChannel}`,
    `build_commit=${buildCommit}`,
    `release_tag=${currentReleaseTag}`,
    `latest_version=${latestVersion}`,
    `version_comparison=${versionComparison}`,
    `release_authority=${expectedReleaseAuthority}`,
    `checksum_verification=${checksumVerification}`,
    "auto_update_ready=false",
    "signed_update_manifest_ready=false",
    "rollback_prevention_claimed=false",
    `emergency_advisory_path=${emergencyAdvisoryPath}`,
    `high_risk_release_integrity_gate_path=${highRiskReleaseIntegrityGatePath}`,
    "dependency_lockfile_hash_inputs=3",
    "tauri_csp_permissions_remote_code_boundary=true",
    "high_risk_release_claim_allowed=false",
  ].join(" ");
  return {
    currentVersion,
    buildChannel,
    buildCommit,
    latestVersion,
    currentReleaseTag,
    versionComparison,
    expectedReleaseAuthority,
    checksumVerification,
    emergencyAdvisoryPath,
    highRiskReleaseIntegrityGatePath,
    autoUpdateReady: false,
    signedUpdateManifestReady: false,
    rollbackPreventionClaimed: false,
    manualUpdateRequired: true,
    badReleaseAdvisoryPathReady: true,
    summary,
    boundary: [
      "version_integrity=true",
      `current_version=${currentVersion}`,
      `build_channel=${buildChannel}`,
      `build_commit=${buildCommit}`,
      `version_comparison=${versionComparison}`,
      `expected_release_authority=${expectedReleaseAuthority}`,
      `checksum_verification=${checksumVerification}`,
      "manual_update_required=true",
      "auto_update_ready=false",
      "auto_update_claim=false",
      "signed_update_manifest_ready=false",
      "rollback_warning_policy=manual-warning-only",
      "rollback_prevention_claimed=false",
      "bad_release_advisory_path_ready=true",
      `emergency_advisory_path=${emergencyAdvisoryPath}`,
      `high_risk_release_integrity_gate_path=${highRiskReleaseIntegrityGatePath}`,
      "release_artifact_checksum_policy=same-release-sha256-required",
      "signed_manifest_source_gate=true",
      "dependency_inventory_lockfile_hash_bound=true",
      "tauri_csp_permissions_remote_code_boundary=true",
      "branch_source_release_authority_allowed=false",
      "source_archive_release_authority_allowed=false",
      "high_risk_release_claim_allowed=false",
      "security_ready_claim=false",
    ].join(" "),
  };
}

export function productionPanicLockMitigationView(input = {}) {
  const clipboardTtlMs = Number.isFinite(Number(input.clipboardTtlMs))
    ? Math.max(0, Number(input.clipboardTtlMs))
    : 15_000;
  const emergencyConfirmation = "EMERGENCY WIPE LOCAL DATA";
  const boundary = [
    "panic_lock=true",
    "immediate_lock=true",
    "memory_state_clear=true",
    "private_view_hidden=true",
    "clipboard_clear=true",
    `clipboard_ttl_ms=${clipboardTtlMs}`,
    "pending_secret_action_cancel=true",
    "emergency_wipe=true",
    `emergency_wipe_confirmation=${emergencyConfirmation.replace(/\s+/g, "_")}`,
    "emergency_wipe_separate_from_standard_wipe=true",
    "transcript_visible_when_locked=false",
    "invite_visible_when_locked=false",
    "endpoint_visible_when_locked=false",
    "payload_visible_when_locked=false",
    "copied_secret_in_diagnostics=false",
    "coercion_safe_claim=false",
    "compromised_device_safe_claim=false",
    "mitigation_only=true",
  ].join(" ");
  return {
    boundary,
    clipboardTtlMs,
    emergencyConfirmation,
    panicLockReachable: true,
    emergencyWipeReachable: true,
    mitigationOnly: true,
  };
}

export function productionWindowsRuntimeParityView(input = {}) {
  const platform = releaseIntegrityToken(input.platform, "unknown-platform");
  const summary = [
    "platform_scope=desktop-shared-core",
    "windows_distribution=local-build-candidate-only",
    "app_data_resolver=tauri-app-data",
    "path_separator=platform-native-redacted",
    "raw_local_path_returned=false",
    "support_report_raw_path_allowed=false",
    "profile_semantics=shared-core",
    "message_exchange_semantics=shared-core",
    "delete_wipe_semantics=shared-core",
    "macos_only_wording_allowed=false",
    "windows_public_artifact_ready=false",
    "windows_installer_ready=false",
    "windows_signing_security_boundary=false",
    "shared_core_bypass_allowed=false",
    "auto_update_channel=false",
    `observed_platform=${platform}`,
  ].join(" ");
  return {
    platform,
    platformScope: "desktop-shared-core",
    windowsDistribution: "local-build-candidate-only",
    appDataResolver: "tauri-app-data",
    pathSeparator: "platform-native-redacted",
    profileSemantics: "shared-core",
    messageExchangeSemantics: "shared-core",
    deleteWipeSemantics: "shared-core",
    rawLocalPathReturned: false,
    supportReportRawPathAllowed: false,
    macosOnlyWordingAllowed: false,
    windowsPublicArtifactReady: false,
    windowsInstallerReady: false,
    windowsSigningSecurityBoundary: false,
    sharedCoreBypassAllowed: false,
    autoUpdateChannel: false,
    summary,
    boundary: [
      "windows_runtime_parity=true",
      "platform_scope=desktop-shared-core",
      "windows_distribution=local-build-candidate-only",
      "tauri_app_data_resolver_required=true",
      "local_storage_paths_redacted=true",
      "support_report_raw_path_allowed=false",
      "profile_semantics=shared-core",
      "message_exchange_semantics=shared-core",
      "delete_wipe_semantics=shared-core",
      "macos_only_wording_allowed=false",
      "windows_public_artifact_ready=false",
      "windows_installer_ready=false",
      "windows_signing_security_boundary=false",
      "shared_core_bypass_allowed=false",
      "auto_update_channel=false",
    ].join(" "),
  };
}

export function productionFirstRunDesktopSummaryView(input = {}) {
  const profileInputPresent = Boolean(input.profileInputPresent);
  const profileUnlocked = Boolean(input.profileUnlocked);
  const roomPresent = Boolean(input.roomPresent);
  const safetyVerified = Boolean(input.safetyVerified);
  const messageFlowReady = Boolean(input.messageFlowReady);
  const purpose = "No-central-trusted-server 1:1 private messenger";
  const releaseStatus = "Unsigned public beta; no production security claim";
  const primaryNextAction = !profileInputPresent
    ? "Enter a local profile and passphrase."
    : !profileUnlocked
      ? "Unlock or create the local profile."
      : !roomPresent
        ? "Create an invite room or paste the invite code you received."
        : !safetyVerified
          ? "Compare the safety phrase before messaging."
          : !messageFlowReady
            ? "Write a message and export the encrypted envelope."
            : "Import, decrypt/display, reply, retry, or cancel from the room.";
  return {
    purpose,
    releaseStatus,
    primaryNextAction,
    boundary: [
      "first_run_summary=true",
      "purpose=no-central-trusted-server-1:1-private-messenger",
      "release_status=unsigned-public-beta",
      "primary_next_action_visible=true",
      `profile_input_present=${profileInputPresent}`,
      `profile_unlocked=${profileUnlocked}`,
      `room_present=${roomPresent}`,
      `safety_verified=${safetyVerified}`,
      `message_flow_ready=${messageFlowReady}`,
      "sensitive_communication_claim=false",
      "security_ready_claim=false",
      "network_on_launch=false",
    ].join(" "),
  };
}

const pairwiseInviteGuidanceSteps = {
  create: {
    step: "create-code",
    nextKey: "pairwiseInviteNextShareCode",
  },
  join: {
    step: "paste-received-code",
    nextKey: "pairwiseInviteNextOpenRoom",
  },
  "room-opening": {
    step: "open-room",
    nextKey: "pairwiseInviteNextOpenRoom",
  },
  "room-ready": {
    step: "verify-phrase",
    nextKey: "pairwiseInviteNextVerifyPhrase",
  },
  "saved-room-return": {
    step: "return-saved-room",
    nextKey: "pairwiseInviteNextVerifyOrWrite",
  },
  delete: {
    step: "remove-list-entry",
    nextKey: "pairwiseInviteNextCreateOrPasteAgain",
  },
  regenerate: {
    step: "fresh-code",
    nextKey: "pairwiseInviteNextFreshCode",
  },
  rebuild: {
    step: "rebuild-with-fresh-code",
    nextKey: "pairwiseInviteNextFreshCode",
  },
};

export function productionPairwiseInviteGuidanceView(input = {}) {
  const normalizedStep = String(input.step ?? "").trim() || "create";
  const config = pairwiseInviteGuidanceSteps[normalizedStep] ?? pairwiseInviteGuidanceSteps.create;
  const role = input.role === "inviter" ? "inviter" : input.role === "joiner" ? "joiner" : "unknown";
  const roomPresent = Boolean(input.roomPresent);
  return {
    step: config.step,
    role,
    nextKey: config.nextKey,
    boundary: [
      "pairwise_invite_flow=true",
      `step=${config.step}`,
      `role=${role}`,
      "accountless=true",
      "pairwise_identity=true",
      "one_code_one_room=true",
      "send_code_over_existing_channel=true",
      "verify_phrase_before_messaging=true",
      "searchable_username=false",
      "address_book=false",
      "public_directory=false",
      "central_contact_discovery=false",
      "central_message_server=false",
      "invite_code_in_diagnostics=false",
      "qr_required=false",
      `room_present=${roomPresent}`,
    ].join(" "),
  };
}

export function productionPairwiseInviteCreateView(input = {}) {
  const role = input.role === "inviter" ? "inviter" : input.role === "joiner" ? "joiner" : "inviter";
  const payload = String(input.payload ?? input.code ?? input.connectionCode ?? "").trim();
  const profiles = productionInviteCodeProfiles(payload, role);
  const intendedPeerLabel = role === "inviter" ? "joiner device" : "inviter device";
  const manualSendInstruction =
    role === "inviter"
      ? "Send this invite code to the intended peer over an existing channel."
      : "Paste the received invite code, then compare the safety phrase before messaging.";
  return {
    role,
    localProfile: profiles.localProfile,
    intendedPeerLabel,
    intendedPeerProfile: profiles.peerProfile,
    payload,
    manualSendInstruction,
    boundary: [
      "pairwise_invite_create=true",
      `role=${role}`,
      "accountless=true",
      "local_profile_visible=true",
      "intended_peer_label_visible=true",
      "manual_send_instruction_visible=true",
      "payload_visible_to_user=true",
      "payload_in_diagnostics=false",
      "central_contact_discovery=false",
      "central_message_server=false",
    ].join(" "),
  };
}

const pairwiseInviteImportFailureCopy = {
  malformed: {
    message: "Invite payload could not be read. Ask for a fresh invite and paste only that value.",
    nextAction: "Ask for a fresh invite payload.",
  },
  duplicate: {
    message: "This invite is already pending. Continue the existing pending pairing.",
    nextAction: "Open the existing pending pairing.",
  },
  already_paired: {
    message: "This peer is already paired. Open the existing room or rebuild with a fresh invite.",
    nextAction: "Open the existing room.",
  },
  identity_mismatch: {
    message: "The invite identity does not match this room. Stop and rebuild with a fresh invite.",
    nextAction: "Stop and rebuild with a fresh invite.",
  },
  unsupported: {
    message: "This invite format is not supported by this build.",
    nextAction: "Update or ask for a supported invite.",
  },
  revoked_re_pair_required: {
    message: "This room was revoked. Discard the old session and re-pair with a fresh invite.",
    nextAction: "Re-pair with a fresh invite.",
  },
};

function normalizedPairwiseInviteImportFailureKind(value) {
  const text = String(value?.failure_kind ?? value?.failureKind ?? value?.kind ?? value?.error ?? value ?? "")
    .trim()
    .toLowerCase();
  if (text.includes("revoked_re_pair_required") || text.includes("revoked re-pair")) {
    return "revoked_re_pair_required";
  }
  if (text.includes("already_paired") || text.includes("contactalreadyactive") || text.includes("already paired")) {
    return "already_paired";
  }
  if (text.includes("duplicate") || text.includes("pairingalreadypending") || text.includes("already pending")) {
    return "duplicate";
  }
  if (
    text.includes("identity_mismatch") ||
    text.includes("localpairingpayloadmismatch") ||
    text.includes("samepairwiseidentity") ||
    text.includes("samerendezvousendpoint") ||
    text.includes("noise static") ||
    text.includes("mismatch")
  ) {
    return "identity_mismatch";
  }
  if (text.includes("unsupported") || text.includes("nonproductionpairingpayload")) {
    return "unsupported";
  }
  return "malformed";
}

export function productionPairwiseInviteImportFailureView(input = {}) {
  const kind = normalizedPairwiseInviteImportFailureKind(input);
  const copy = pairwiseInviteImportFailureCopy[kind] ?? pairwiseInviteImportFailureCopy.malformed;
  return {
    kind,
    message: copy.message,
    nextAction: copy.nextAction,
    boundary: [
      "pairwise_invite_import=true",
      `failure=${kind}`,
      "malformed_split=true",
      "duplicate_split=true",
      "already_paired_split=true",
      "identity_mismatch_split=true",
      "unsupported_split=true",
      "revoked_re_pair_required_split=true",
      "malicious_input_fail_closed=true",
      "success_state=false",
      "verified_state=false",
      "delivered_state=false",
      "generic_error=false",
      "payload_returned=false",
      "path_returned=false",
      "endpoint_returned=false",
      "key_material=false",
    ].join(" "),
  };
}

export function productionPairwiseSafetyVerificationFlowView(input = {}) {
  const failureKind = input.failure_kind || input.failureKind || input.kind || "";
  const transcriptPresent = Boolean(
    input.safetyTranscriptBound ||
      input.safety_transcript_bound ||
      input.safetyNumber ||
      input.safetyPhrase,
  );
  const markedMismatch = Boolean(input.markedMismatch) || normalizedPairwiseInviteImportFailureKind(failureKind) === "identity_mismatch";
  const revoked = Boolean(input.revokedRePairRequired) || normalizedPairwiseInviteImportFailureKind(failureKind) === "revoked_re_pair_required";
  const confirmedMatch = Boolean(input.confirmedMatch || input.safetyConfirmed) && transcriptPresent && !markedMismatch && !revoked;
  const state = revoked
    ? "revoked_re_pair_required"
    : markedMismatch
      ? "marked_mismatch"
      : confirmedMatch
        ? "confirmed_match"
        : "compare";
  const rePairRequired = state === "marked_mismatch" || state === "revoked_re_pair_required";
  const nextAction =
    state === "confirmed_match"
      ? "Save the pairwise session draft."
      : rePairRequired
        ? "Rebuild with a fresh invite before trusting this peer."
        : "Compare the safety number and phrase out-of-band.";
  return {
    state,
    nextAction,
    compareRequired: state !== "confirmed_match",
    confirmMatchAllowed: transcriptPresent && !rePairRequired,
    rePairRequired,
    boundary: [
      "pairwise_safety_verification=true",
      `state=${state}`,
      `compare_required=${state !== "confirmed_match"}`,
      `confirm_match_allowed=${transcriptPresent && !rePairRequired}`,
      `re_pair_required=${rePairRequired}`,
      `malicious_input_fail_closed=${rePairRequired}`,
      `false_verified_state=${rePairRequired ? "blocked" : "not_applicable"}`,
      "generic_error=false",
      "safety_transcript_returned=false",
      "payloads_returned=false",
    ].join(" "),
  };
}

const profileUnlockRecoveryCopy = {
  wrong_passphrase: {
    warning: "Profile store did not unlock. Re-enter the profile passphrase.",
    nextAction: "Retry with the profile passphrase.",
  },
  missing_store: {
    warning: "No local profile store is available on this device.",
    nextAction: "Create a new local profile on this device.",
  },
  corrupt_store: {
    warning: "The local profile store cannot be opened safely.",
    nextAction: "Inspect local storage or create a new local profile.",
  },
  migration_needed: {
    warning: "This local profile store needs a supported migration before unlock.",
    nextAction: "Run a supported local store migration.",
  },
  unsupported_unlock_factor: {
    warning: "Unlock requires the profile passphrase. OS keychain-only unlock is not supported.",
    nextAction: "Unlock with the profile passphrase.",
  },
};

const localDataRecoveryCopy = {
  passphrase_loss: {
    warning: "Without the profile passphrase, this device cannot recover the encrypted local profile.",
    nextAction: "Create a new local profile.",
  },
  corrupt_store: {
    warning: "The local profile store cannot be trusted for recovery.",
    nextAction: "Inspect local storage or create a new local profile.",
  },
  migration_failure: {
    warning: "Local store migration failed before data was changed.",
    nextAction: "Retry with a supported local store migration.",
  },
};

function normalizedLocalDataRecoveryKind(value) {
  const text = String(value?.failure_kind ?? value?.failureKind ?? value?.kind ?? value?.redacted_reason ?? value?.error ?? value ?? "")
    .trim()
    .toLowerCase();
  if (text.includes("migration")) {
    return "migration_failure";
  }
  if (text.includes("corrupt") || text.includes("malformed database")) {
    return "corrupt_store";
  }
  return "passphrase_loss";
}

export function productionLocalDataRecoveryView(input = {}) {
  const kind = normalizedLocalDataRecoveryKind(input);
  const copy = localDataRecoveryCopy[kind] ?? localDataRecoveryCopy.passphrase_loss;
  const migrationRequired = kind === "migration_failure";
  const migrationRetryAllowed = kind === "migration_failure";
  const createNewProfileAllowed = kind !== "migration_failure";
  return {
    kind,
    warning: copy.warning,
    nextAction: copy.nextAction,
    migrationRequired,
    migrationRetryAllowed,
    createNewProfileAllowed,
    boundary: [
      "local_data_recovery=true",
      `failure=${kind}`,
      "passphrase_loss_split=true",
      "corrupt_store_split=true",
      "migration_failure_split=true",
      "local_export_backup=encrypted_only",
      "restore_requires_profile_passphrase=true",
      "cloud_backup_sync=false",
      "backup_recovery_claim=false",
      `migration_required=${migrationRequired}`,
      `migration_retry_allowed=${migrationRetryAllowed}`,
      "destructive_migration=false",
      "silent_data_loss=false",
      "rollback_prevention_claim=false",
      "secure_media_deletion_claim=false",
      `create_new_profile=${createNewProfileAllowed}`,
      "raw_path_returned=false",
      "passphrase_returned=false",
      "key_material=false",
    ].join(" "),
  };
}

function normalizedProfileUnlockRecoveryKind(value) {
  const text = String(value?.failure_kind ?? value?.failureKind ?? value?.kind ?? value?.redacted_reason ?? value?.error ?? value ?? "")
    .trim()
    .toLowerCase();
  if (text.includes("migration") || text.includes("future-schema") || text.includes("schema")) {
    return "migration_needed";
  }
  if (text.includes("corrupt") || text.includes("malformed database")) {
    return "corrupt_store";
  }
  if (text.includes("missing_store") || text.includes("missing-store") || text.includes("store-unavailable")) {
    return "missing_store";
  }
  if (text.includes("unsupported") || text.includes("os_keystore") || text.includes("os-keystore") || text.includes("keychain")) {
    return "unsupported_unlock_factor";
  }
  return "wrong_passphrase";
}

export function productionProfileUnlockRecoveryView(input = {}) {
  const kind = normalizedProfileUnlockRecoveryKind(input);
  const copy = profileUnlockRecoveryCopy[kind] ?? profileUnlockRecoveryCopy.wrong_passphrase;
  const retryWithPassphraseAllowed =
    kind === "wrong_passphrase" || kind === "unsupported_unlock_factor";
  const createNewProfileAllowed = kind === "missing_store" || kind === "corrupt_store";
  const migrationRequired = kind === "migration_needed";
  const localDataRecovery =
    kind === "corrupt_store"
      ? productionLocalDataRecoveryView({ kind: "corrupt_store" })
      : kind === "migration_needed"
        ? productionLocalDataRecoveryView({ kind: "migration_failure" })
        : null;
  return {
    kind,
    warning: copy.warning,
    nextAction: copy.nextAction,
    retryWithPassphraseAllowed,
    createNewProfileAllowed,
    migrationRequired,
    boundary: [
      "profile_unlock_recovery=true",
      `failure=${kind}`,
      "wrong_passphrase_split=true",
      "missing_store_split=true",
      "corrupt_store_split=true",
      "migration_needed_split=true",
      "unsupported_unlock_factor_split=true",
      `retry_with_passphrase=${retryWithPassphraseAllowed}`,
      `create_new_profile=${createNewProfileAllowed}`,
      `migration_required=${migrationRequired}`,
      "passphrase_required=true",
      "os_keychain_only_supported=false",
      "cloud_backup_sync=false",
      "backup_recovery_claim=false",
      "rollback_protection_claim=false",
      "secure_media_deletion_claim=false",
      "not_protected_device_compromise=true",
      "raw_path_returned=false",
      "passphrase_returned=false",
      "key_material=false",
      "generic_error=false",
      localDataRecovery?.boundary ?? "local_data_recovery=not_required",
    ].join(" "),
  };
}

export function productionProfileRecoveryActionsView(recovery = {}) {
  const kind = String(recovery?.kind ?? "wrong_passphrase").trim() || "wrong_passphrase";
  const retryEnabled = Boolean(
    recovery?.retryWithPassphraseAllowed ??
      (kind === "wrong_passphrase" || kind === "unsupported_unlock_factor"),
  );
  const createEnabled = Boolean(
    recovery?.createNewProfileAllowed ?? (kind === "missing_store" || kind === "corrupt_store"),
  );
  const rebuildEnabled = kind === "corrupt_store" || kind === "migration_needed";
  const chooseAnotherProfileEnabled = true;
  const copySupportReportEnabled = true;
  const actions = [
    {
      id: "retry",
      label: "Retry passphrase",
      enabled: retryEnabled,
    },
    {
      id: "create",
      label: "Create local profile",
      enabled: createEnabled,
    },
    {
      id: "choose-another-profile",
      label: "Choose another profile",
      enabled: chooseAnotherProfileEnabled,
    },
    {
      id: "rebuild",
      label: "Rebuild local profile",
      enabled: rebuildEnabled,
    },
    {
      id: "copy-support-report",
      label: "Copy redacted support report",
      enabled: copySupportReportEnabled,
    },
  ];
  const primary = actions.find((action) => action.enabled) ?? actions[actions.length - 1];
  return {
    kind,
    actions,
    retryEnabled,
    createEnabled,
    chooseAnotherProfileEnabled,
    rebuildEnabled,
    copySupportReportEnabled,
    primaryAction: primary.id,
    primaryNextAction: primary.label,
    boundary: [
      "profile_recovery_actions=true",
      `failure=${kind}`,
      `retry_enabled=${retryEnabled}`,
      `create_enabled=${createEnabled}`,
      `choose_another_profile_enabled=${chooseAnotherProfileEnabled}`,
      `rebuild_enabled=${rebuildEnabled}`,
      `copy_support_report_enabled=${copySupportReportEnabled}`,
      `primary_action=${primary.id}`,
      "support_report_redacted=true",
      "string_parsing_security_state=false",
      "raw_path_returned=false",
      "passphrase_returned=false",
      "key_material=false",
      "invite_body_returned=false",
      "message_body_returned=false",
      "envelope_payload_returned=false",
    ].join(" "),
  };
}

function redactedSupportReportToken(value, fallback = "unknown") {
  const token = String(value ?? "")
    .trim()
    .replace(/[^A-Za-z0-9._:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);
  return token || fallback;
}

export function productionRedactedSupportReportView(input = {}) {
  const appVersion = redactedSupportReportToken(input.appVersion);
  const buildChannel = redactedSupportReportToken(input.buildChannel);
  const buildCommit = redactedSupportReportToken(input.buildCommit);
  const platform = redactedSupportReportToken(input.platform);
  const releaseClass = redactedSupportReportToken(input.releaseClass, "unsigned-public-beta");
  const activeFlow = redactedSupportReportToken(input.activeFlow, "unknown-flow");
  const redactedErrorCode = redactedSupportReportToken(
    input.redactedErrorCode ?? input.failureClass,
    "unknown-failure",
  );
  const nonSensitiveStatus = redactedSupportReportToken(input.nonSensitiveStatus, "failure");
  const recoveryNextAction = redactedSupportReportToken(input.recoveryNextAction, "inspect-visible-next-action");
  const copyEnabled = activeFlow !== "unknown-flow" && redactedErrorCode !== "unknown-failure";
  const payload = [
    "Another Dimension Chat redacted support report",
    "report_version=1",
    `app_version=${appVersion}`,
    `build_channel=${buildChannel}`,
    `build_commit=${buildCommit}`,
    `platform=${platform}`,
    `release_class=${releaseClass}`,
    `active_flow=${activeFlow}`,
    `redacted_error_code=${redactedErrorCode}`,
    `non_sensitive_status=${nonSensitiveStatus}`,
    `recovery_next_action=${recoveryNextAction}`,
    "passphrase=<redacted>",
    "private_key=<redacted>",
    "invite_body=<redacted>",
    "message_body=<redacted>",
    "envelope_payload=<redacted>",
    "raw_local_path=<redacted>",
    "credential=<redacted>",
    "support_bundle_export=false",
    "raw_logs_included=false",
    "telemetry_upload=false",
  ].join("\n");
  const boundary = [
    "redacted_support_report=true",
    `copy_enabled=${copyEnabled}`,
    "allowed_fields=app-version#build-channel#build-commit#platform#release-class#active-flow#redacted-error-code#non-sensitive-status#recovery-next-action",
    "passphrase_included=false",
    "private_key_included=false",
    "invite_body_included=false",
    "message_body_included=false",
    "envelope_payload_included=false",
    "raw_local_path_included=false",
    "credential_included=false",
    "support_bundle_export=false",
    "audit_evidence_claim=false",
    "external_delivery_evidence_claim=false",
    "security_ready_proof_claim=false",
  ].join(" ");
  return {
    appVersion,
    buildChannel,
    buildCommit,
    platform,
    releaseClass,
    activeFlow,
    redactedErrorCode,
    nonSensitiveStatus,
    recoveryNextAction,
    copyEnabled,
    payload,
    boundary,
  };
}

export function productionMessageDeliveryProductizationView(input = {}) {
  const profileUnlocked = input.profileUnlocked === true;
  const pairwiseInviteReady = input.pairwiseInviteReady === true;
  const mandatorySafetyVerified = input.mandatorySafetyVerified === true;
  const composeReady = input.composeReady === true;
  const outboundExported = input.outboundExported === true;
  const inboundImported = input.inboundImported === true;
  const replyReady = input.replyReady === true;
  const retryAvailable = input.retryAvailable === true;
  const cancelAvailable = input.cancelAvailable === true;
  const localDeleteAvailable = input.localDeleteAvailable === true;
  const currentRoomOwnsState = input.currentRoomOwnsState === true;
  const currentProfileOwnsState = input.currentProfileOwnsState === true;
  const duplicateOrReplayRejected = input.duplicateOrReplayRejected === true;
  const peerMismatchBlocksVerified = input.peerMismatchBlocksVerified === true;
  const supportRedacted = input.supportRedacted === true;
  const currentInputOwned = currentRoomOwnsState && currentProfileOwnsState;
  const recoveryReady = retryAvailable && cancelAvailable && localDeleteAvailable;
  const failClosed = duplicateOrReplayRejected && peerMismatchBlocksVerified;
  const firstMessageRoundTripReady =
    profileUnlocked &&
    pairwiseInviteReady &&
    mandatorySafetyVerified &&
    composeReady &&
    outboundExported &&
    inboundImported &&
    replyReady &&
    currentInputOwned &&
    failClosed &&
    supportRedacted;
  const primaryAction = !currentInputOwned
    ? "delete-or-rebuild"
    : !profileUnlocked
      ? "unlock-profile"
      : !pairwiseInviteReady
        ? "create-or-join-room"
        : !mandatorySafetyVerified || !peerMismatchBlocksVerified
          ? "verify-safety"
          : !composeReady
            ? "write-message"
            : !outboundExported
              ? "export-envelope"
              : !inboundImported
                ? "import-reply"
                : !replyReady || !duplicateOrReplayRejected || !recoveryReady
                  ? "reply-or-recover"
                  : "delete-or-rebuild";
  const boundaryClosed = currentInputOwned && failClosed && supportRedacted;
  const summary = [
    `primary_action=${primaryAction}`,
    `first_message_round_trip_ready=${firstMessageRoundTripReady}`,
    `recovery_ready=${recoveryReady}`,
    `current_input_owned=${currentInputOwned}`,
    `profile_unlocked=${profileUnlocked}`,
    `pairwise_invite_ready=${pairwiseInviteReady}`,
    `mandatory_safety_verified=${mandatorySafetyVerified}`,
    `compose_ready=${composeReady}`,
    `outbound_exported=${outboundExported}`,
    `inbound_imported=${inboundImported}`,
    `reply_ready=${replyReady}`,
    `retry_available=${retryAvailable}`,
    `cancel_available=${cancelAvailable}`,
    `local_delete_available=${localDeleteAvailable}`,
    `duplicate_or_replay_rejected=${duplicateOrReplayRejected}`,
    `peer_mismatch_blocks_verified=${peerMismatchBlocksVerified}`,
    `support_redacted=${supportRedacted}`,
    "false_delivered_allowed=false",
    "false_verified_allowed=false",
    "false_ready_allowed=false",
    "message_body_in_support=false",
    "envelope_payload_in_support=false",
    "invite_body_in_support=false",
    "local_path_in_support=false",
    "key_or_passphrase_in_support=false",
    "support_private_fields_allowed=false",
    `boundary_closed=${boundaryClosed}`,
  ].join(" ");
  return {
    primaryAction,
    firstMessageRoundTripReady,
    recoveryReady,
    currentInputOwned,
    falseDeliveredAllowed: false,
    falseVerifiedAllowed: false,
    falseReadyAllowed: false,
    supportPrivateFieldsAllowed: false,
    boundaryClosed,
    summary,
    boundary: `${summary} vocabulary=unlock-profile#create-or-join-room#verify-safety#write-message#export-envelope#import-reply#reply-or-recover#delete-or-rebuild`,
  };
}

export function productionTwoProfileCurrentAction(state) {
  const input = state?.input ?? {};
  if (state?.busy) {
    return null;
  }
  if (!state?.hasMessageRetentionPolicy) {
    return null;
  }
  if (!input.profileA || !input.profileB || input.profileA === input.profileB || !input.passphrase) {
    return null;
  }
  if (!input.messageTtlSeconds) {
    return null;
  }
  if (state?.sessionsReady) {
    if (!input.message) {
      return "compose";
    }
    return "stored-message";
  }
  if (!state?.hasKnownSessionStatus && state?.hasRecoveredConversation) {
    return "check-session";
  }
  return "full-setup";
}

export function productionTwoProfileResumeTarget(state) {
  if (!state?.sessionsReady) {
    return null;
  }
  if (state?.hasRetryableOutbound) {
    return "retry-send";
  }
  if (state?.hasPendingConversation) {
    return "pending-review";
  }
  if (!state?.hasMessageDraft && state?.hasDeliveredConversation) {
    return "reply-latest";
  }
  return "compose";
}

export function productionTwoProfileShouldShowOutboundRecovery(state) {
  return Boolean(!state?.busy && state?.sessionsReady && state?.hasRetryableOutbound);
}

export function productionTwoProfileShouldClearPendingOutboundNotice(state) {
  return Boolean(
    !state?.busy &&
      state?.hasPendingOutboundNotice &&
      state?.noticeMatchesCurrentRoom &&
      !state?.noticePendingOutboundRetryable,
  );
}

export function productionProfilePreset(peer) {
  const normalizedPeer = String(peer ?? "").trim().toLowerCase();
  if (normalizedPeer === "alice") {
    return { profile: "alice", rendezvousEndpoint: "alice.onion" };
  }
  if (normalizedPeer === "bob") {
    return { profile: "bob", rendezvousEndpoint: "bob.onion" };
  }
  return null;
}

export function productionCounterpartProfile(profile) {
  const normalizedProfile = String(profile ?? "").trim().toLowerCase();
  if (normalizedProfile === "alice") {
    return "bob";
  }
  if (normalizedProfile === "bob") {
    return "alice";
  }
  return null;
}

export function productionTwoProfilePairFromProfiles(profiles, currentA, currentB) {
  const savedProfiles = [
    ...new Set(
      (Array.isArray(profiles) ? profiles : [])
        .map((profile) => String(profile ?? "").trim())
        .filter(Boolean),
    ),
  ];
  const profileA = String(currentA ?? "").trim();
  const profileB = String(currentB ?? "").trim();
  const saved = new Set(savedProfiles);
  if (productionInviteCodeProfileName(profileA) && profileB && !saved.has(profileB)) {
    return { profileA, profileB, changed: false };
  }
  if (profileA && profileB && profileA !== profileB && saved.has(profileA) && saved.has(profileB)) {
    return { profileA, profileB, changed: false };
  }
  if (savedProfiles.length < 2) {
    return { profileA, profileB, changed: false };
  }

  const choosePair = (first) => {
    const second = savedProfiles.find((profile) => profile !== first);
    return second ? [first, second] : null;
  };
  const preferred =
    saved.has("alice") && saved.has("bob")
      ? ["alice", "bob"]
      : saved.has(profileA)
        ? choosePair(profileA)
        : saved.has(profileB)
          ? [savedProfiles.find((profile) => profile !== profileB), profileB]
          : [savedProfiles[0], savedProfiles[1]];
  const [nextA, nextB] = preferred ?? [profileA, profileB];
  if (!nextA || !nextB || nextA === nextB) {
    return { profileA, profileB, changed: false };
  }
  return {
    profileA: nextA,
    profileB: nextB,
    changed: nextA !== profileA || nextB !== profileB,
  };
}

export function productionMessageTtlInputValue(value, allowedTtlSeconds, fallbackTtlSeconds) {
  const allowed = Array.isArray(allowedTtlSeconds)
    ? allowedTtlSeconds.filter((ttlSeconds) => Number.isFinite(ttlSeconds) && ttlSeconds > 0)
    : [];
  if (allowed.length === 0) {
    return null;
  }
  const fallback = Number.parseInt(fallbackTtlSeconds, 10);
  const rawValue = String(value ?? "").trim();
  if (!rawValue) {
    return Number.isFinite(fallback) && allowed.includes(fallback) ? fallback : null;
  }
  const selected = Number.parseInt(rawValue, 10);
  if (Number.isFinite(selected) && allowed.includes(selected)) {
    return selected;
  }
  return null;
}

export function productionOnionReceiveRuntimeView(mode = {}, result = null) {
  if (!mode?.enabled) {
    return {
      state: "stopped",
      label: "Message listening stopped",
      retryable: false,
      duplicateBlocked: false,
    };
  }
  if (mode?.stopRequested) {
    return {
      state: "stopped",
      label: "Message listening stopping",
      retryable: false,
      duplicateBlocked: true,
    };
  }
  if (mode?.inFlight && !result) {
    return {
      state: mode.runtimeState || "receiving",
      label: mode.runtimeLabel || "Listening for new messages",
      retryable: false,
      duplicateBlocked: true,
    };
  }
  if (!result) {
    return {
      state: mode.runtimeState || "receiving",
      label: mode.runtimeLabel || "Listening for new messages",
      retryable: false,
      duplicateBlocked: false,
    };
  }
  if (result.receive_attempt_succeeded || result.endpoint_update_applied) {
    return {
      state: "message-imported",
      label: result.endpoint_update_applied ? "Peer address updated" : "New message received",
      retryable: false,
      duplicateBlocked: false,
    };
  }
  if (result.stream_request_accepted || result.inbound_rend_request_accepted) {
    return {
      state: "peer-connected",
      label: "Peer connected",
      retryable: true,
      duplicateBlocked: false,
    };
  }
  if (!result.persistent_client_ready) {
    return {
      state: "bootstrapping",
      label: "Waiting for Tor restart",
      retryable: true,
      duplicateBlocked: false,
    };
  }
  if (!result.inbound_stream_preparation_ready) {
    return {
      state: "launching-service",
      label: "Waiting for local address",
      retryable: true,
      duplicateBlocked: false,
    };
  }
  if (result.receive_attempt_started) {
    return {
      state: "failed-retryable",
      label: "Message listening will retry",
      retryable: true,
      duplicateBlocked: false,
    };
  }
  return {
    state: "receiving",
    label: "Listening for new messages",
    retryable: true,
    duplicateBlocked: false,
  };
}

export function productionOnionReceiveLoopRefreshPlan(mode = {}, backendLoop = {}) {
  const importSequence = Number.parseInt(backendLoop.import_sequence ?? 0, 10);
  const messageImportCount = Number.parseInt(backendLoop.message_import_count ?? 0, 10);
  const endpointUpdateCount = Number.parseInt(backendLoop.endpoint_update_count ?? 0, 10);
  const lastImportSequence = Number.parseInt(mode.lastProcessedImportSequence ?? 0, 10);
  const lastMessageImportCount = Number.parseInt(mode.lastProcessedMessageImportCount ?? 0, 10);
  const lastEndpointUpdateCount = Number.parseInt(mode.lastProcessedEndpointUpdateCount ?? 0, 10);
  const safeImportSequence = Number.isFinite(importSequence) ? importSequence : 0;
  const safeMessageImportCount = Number.isFinite(messageImportCount) ? messageImportCount : 0;
  const safeEndpointUpdateCount = Number.isFinite(endpointUpdateCount) ? endpointUpdateCount : 0;
  const safeLastImportSequence = Number.isFinite(lastImportSequence) ? lastImportSequence : 0;
  const safeLastMessageImportCount = Number.isFinite(lastMessageImportCount) ? lastMessageImportCount : 0;
  const safeLastEndpointUpdateCount = Number.isFinite(lastEndpointUpdateCount) ? lastEndpointUpdateCount : 0;
  const newImportCount = Math.max(0, safeImportSequence - safeLastImportSequence);
  const newMessageImportCount = Math.max(0, safeMessageImportCount - safeLastMessageImportCount);
  const newEndpointUpdateCount = Math.max(0, safeEndpointUpdateCount - safeLastEndpointUpdateCount);
  const transcriptChanged = newImportCount > 0;
  const messageImported = newMessageImportCount > 0;
  const endpointUpdated = newEndpointUpdateCount > 0;
  return {
    transcriptChanged,
    messageImported,
    endpointUpdated,
    newImportCount,
    newMessageImportCount,
    newEndpointUpdateCount,
    importSequence: safeImportSequence,
    messageImportCount: safeMessageImportCount,
    endpointUpdateCount: safeEndpointUpdateCount,
  };
}

export function productionOnionReceiveFailureMessage(backendLoop = {}) {
  switch (backendLoop.last_failure_kind) {
    case "none":
      return "Waiting for new messages.";
    case "manual-permission":
      return "Turn on network permission before listening for messages.";
    case "persistent-client":
      return "Tor needs to be started again before messages can arrive.";
    case "peer-offline":
      return "Peer is offline; listening will retry.";
    case "receive-timeout":
      return "No message arrived before timeout; listening will retry.";
    case "busy":
      return "Already listening for messages.";
    case "import":
      return "A message could not be imported; listening will retry.";
    case "feature-disabled":
      return "Message listening is not available in this build.";
    default:
      return "Message listening hit a retryable error and will keep trying.";
  }
}

export function productionManualTransferStepLabel(step) {
  const labels = {
    "export-envelope": "export envelope",
    "share-outside-app": "share outside app",
    "load-or-paste-envelope": "load or paste envelope",
    "import-envelope": "import envelope",
    "decrypt-display": "decrypt and display",
    "show-plaintext": "show plaintext",
    "write-reply": "write reply",
    "retry-or-cancel": "retry or cancel",
    "write-new-message": "write a new message",
  };
  return labels[step] ?? "review conversation";
}

export function productionManualPendingOutboundStateView(entry = {}, options = {}) {
  const statuses = entry?.statuses ?? new Set();
  const sentCopyPresent = Boolean(statuses?.has?.("sent"));
  const receivedCopyPresent = Boolean(statuses?.has?.("received"));
  const canceled = entry?.outboundDeliveryState === "canceled";
  const duplicateImport = options.importDecision?.kind === "duplicate" || options.duplicateImport === true;
  const staleOrReplayedImport =
    options.importDecision?.kind === "replay_rejected" ||
    options.staleOrReplayedImport === true ||
    String(options.slotMismatchReason ?? "").includes("stale") ||
    String(options.slotMismatchReason ?? "").includes("replay");
  const envelopeExported = Boolean(options.envelopeExported || options.senderEnvelopeSlotPresent || sentCopyPresent);
  const state = canceled
    ? "canceled"
    : duplicateImport
      ? "duplicate_import"
      : staleOrReplayedImport
        ? "stale_or_replayed_import"
        : !envelopeExported
          ? "ready_to_export"
          : !sentCopyPresent
            ? "exported"
            : "waiting_for_reply";
  const exportAllowed = state === "ready_to_export";
  const importAllowed = state === "exported";
  const retryAllowed = state === "duplicate_import" || state === "stale_or_replayed_import";
  const cancelAllowed =
    state === "ready_to_export" ||
    state === "exported" ||
    state === "waiting_for_reply" ||
    state === "duplicate_import" ||
    state === "stale_or_replayed_import";
  const replyAllowed = receivedCopyPresent && state !== "canceled";
  const nextAction = {
    ready_to_export: "export-envelope",
    exported: "share-outside-app-then-import",
    waiting_for_reply: "wait-for-reply-or-cancel",
    duplicate_import: "ignore-duplicate-import",
    stale_or_replayed_import: "ignore-stale-or-replayed-import",
    canceled: "write-new-message",
  }[state];
  return {
    state,
    exportAllowed,
    importAllowed,
    retryAllowed,
    cancelAllowed,
    replyAllowed,
    nextAction,
    boundary: [
      "manual_pending_outbound=true",
      `state=${state}`,
      `export_allowed=${exportAllowed}`,
      `import_allowed=${importAllowed}`,
      `retry_allowed=${retryAllowed}`,
      `cancel_allowed=${cancelAllowed}`,
      `reply_allowed=${replyAllowed}`,
      "network_io=false",
      "automatic_delivery=false",
      "payload_returned_to_support=false",
      "path_returned=false",
      "key_material=false",
      "plaintext_returned=false",
    ].join(" "),
  };
}

export function productionEncryptedEnvelopeExchangeStepperView(state = {}) {
  const steps = [
    ["compose", Boolean(state.hasOutboundMessageInput || state.hasLocalMessageEnvelope || state.hasInboundEnvelopeInput || state.hasImportedMessage || state.hasReceivedMessage || state.hasTwoProfileReplyDraftInput)],
    ["export-envelope", Boolean(state.hasLocalMessageEnvelope || state.hasInboundEnvelopeInput || state.hasImportedMessage || state.hasReceivedMessage || state.hasTwoProfileReplyDraftInput)],
    ["share-outside-app", Boolean(state.hasRemoteMessageEnvelopeSlot || state.hasInboundEnvelopeInput || state.hasImportedMessage || state.hasReceivedMessage || state.hasTwoProfileReplyDraftInput)],
    ["import-envelope", Boolean(state.hasImportedMessage || state.hasReceivedMessage || state.hasTwoProfileReplyDraftInput)],
    ["decrypt-display", Boolean(state.hasReceivedMessage || state.hasTwoProfileReplyDraftInput)],
    ["reply", Boolean(state.hasTwoProfileReplyDraftInput)],
  ];
  const firstIncomplete = steps.find(([_, complete]) => !complete)?.[0] ?? "complete";
  return {
    currentStep: firstIncomplete,
    steps: steps.map(([step, complete]) => ({
      step,
      label: productionManualTransferStepLabel(step),
      complete,
    })),
    boundary: [
      "encrypted_envelope_stepper=true",
      "default_transport=local_manual_envelope_exchange",
      "compose_export_share_import_decrypt_display_reply=true",
      "network_io=false",
      "automatic_delivery=false",
      "payload_returned_to_support=false",
      "path_returned=false",
      "key_material=false",
      "plaintext_returned_to_support=false",
    ].join(" "),
  };
}

export function productionTwoProfileConversationActionView(entry, senderEnvelopeSlotPresent = false) {
  if (!entry) {
    return {
      nextAction: "Next actions unlock after a completed local roundtrip.",
      rowLabel: "action: unavailable",
      state: "is-waiting",
      focusTarget: null,
      manualTarget: null,
      manualButtonLabel: "Open manual tools",
    };
  }
  const sentCopyPresent = entry.statuses?.has("sent") ?? false;
  const receivedCopyPresent = entry.statuses?.has("received") ?? false;
  if (sentCopyPresent && receivedCopyPresent) {
    const step = productionManualTransferStepLabel("write-reply");
    return {
      nextAction: `Next: ${step} from ${entry.receiver} to ${entry.sender} for message #${entry.messageNumber}.`,
      rowLabel: `action: ${step} from ${entry.receiver}`,
      state: "is-reply",
      focusTarget: "reply-message",
      manualTarget: null,
      manualButtonLabel: "Open manual tools",
    };
  }
  if (receivedCopyPresent) {
    const step = productionManualTransferStepLabel("write-reply");
    return {
      nextAction: `Next: ${step} from ${entry.receiver} to ${entry.sender} for message #${entry.messageNumber}.`,
      rowLabel: `action: ${step} from ${entry.receiver}`,
      state: "is-reply",
      focusTarget: "reply-message",
      manualTarget: null,
      manualButtonLabel: "Open manual tools",
    };
  }
  if (sentCopyPresent && entry.outboundDeliveryState === "canceled") {
    const step = productionManualTransferStepLabel("write-new-message");
    return {
      nextAction: `Next: ${step} from ${entry.sender}. Message #${entry.messageNumber} remains in the transcript.`,
      rowLabel: "action: canceled",
      state: "is-waiting",
      focusTarget: "message",
      manualTarget: null,
      manualButtonLabel: "Open manual tools",
    };
  }
  if (sentCopyPresent && entry.outboundRetryable === true) {
    const needsEndpointRefresh = productionTwoProfileOutboundNeedsEndpointRefresh(entry);
    const step = productionManualTransferStepLabel("retry-or-cancel");
    return {
      nextAction: needsEndpointRefresh
        ? `Next: refresh the peer address, then ${step} message #${entry.messageNumber}.`
        : `Next: ${step} message #${entry.messageNumber}.`,
      rowLabel: needsEndpointRefresh ? "action: refresh address and retry" : "action: retry send",
      state: "is-ready",
      focusTarget: needsEndpointRefresh ? "refresh-endpoint" : "retry-send",
      manualTarget: null,
      manualButtonLabel: "Open manual tools",
    };
  }
  if (sentCopyPresent && senderEnvelopeSlotPresent) {
    const step = productionManualTransferStepLabel("import-envelope");
    return {
      nextAction: `Next: ${step} for message #${entry.messageNumber} into ${entry.receiver}.`,
      rowLabel: `action: ${step} into ${entry.receiver}`,
      state: "is-ready",
      focusTarget: "import-envelope",
      manualTarget: "inbound",
      manualButtonLabel: "Open import tools",
    };
  }
  if (sentCopyPresent) {
    const step = productionManualTransferStepLabel("load-or-paste-envelope");
    return {
      nextAction: `Next: ${step} from ${entry.sender} for message #${entry.messageNumber} into ${entry.receiver}.`,
      rowLabel: `action: ${step} for ${entry.receiver}`,
      state: "is-waiting",
      focusTarget: "remote-envelope",
      manualTarget: "inbound",
      manualButtonLabel: "Open envelope input",
    };
  }
  const step = productionManualTransferStepLabel("export-envelope");
  return {
    nextAction: `Next: ${step} for message #${entry.messageNumber} from ${entry.sender}.`,
    rowLabel: `action: ${step} from ${entry.sender}`,
    state: "is-ready",
    focusTarget: "export-envelope",
    manualTarget: "outbound",
    manualButtonLabel: "Open export tools",
  };
}

export function productionTwoProfileManualLifecycleView(entry, senderEnvelopeSlotPresent = false) {
  const sentCopyPresent = Boolean(entry?.statuses?.has?.("sent"));
  const receivedCopyPresent = Boolean(entry?.statuses?.has?.("received"));
  const canceled = entry?.outboundDeliveryState === "canceled";
  const retryable = entry?.outboundRetryable === true && entry?.outboundDeliveryState === "failed";
  const number = Number.parseInt(entry?.messageNumber, 10) || 0;
  const label = number > 0 ? `message #${number}` : "message";
  const boundary = "manual lifecycle only; network_io=false";
  if (sentCopyPresent && receivedCopyPresent) {
    const step = productionManualTransferStepLabel("write-reply");
    return {
      boundary,
      detail: `${label} has sender and receiver records; next: ${step}.`,
      phase: "complete",
      state: "is-complete",
      step,
    };
  }
  if (receivedCopyPresent) {
    const step = productionManualTransferStepLabel("show-plaintext");
    return {
      boundary,
      detail: `${label} has a receiver record; next: ${step} before writing the reply.`,
      phase: "received",
      state: "is-received",
      step,
    };
  }
  if (canceled) {
    const step = productionManualTransferStepLabel("write-new-message");
    return {
      boundary,
      detail: `${label} was canceled locally; next: ${step}.`,
      phase: "canceled",
      state: "is-canceled",
      step,
    };
  }
  if (retryable) {
    const step = productionManualTransferStepLabel("retry-or-cancel");
    return {
      boundary,
      detail: `${label} is saved; next: ${step} from this device.`,
      phase: "retryable",
      state: "is-retryable",
      step,
    };
  }
  if (sentCopyPresent && senderEnvelopeSlotPresent) {
    const step = productionManualTransferStepLabel("import-envelope");
    return {
      boundary,
      detail: `${label} has a sender record and an envelope slot; next: ${step}.`,
      phase: "import-ready",
      state: "is-import-ready",
      step,
    };
  }
  if (sentCopyPresent) {
    const step = productionManualTransferStepLabel("load-or-paste-envelope");
    return {
      boundary,
      detail: `${label} has a sender record; next: ${step} for receiver import.`,
      phase: "awaiting-import",
      state: "is-awaiting-import",
      step,
    };
  }
  const step = productionManualTransferStepLabel("export-envelope");
  return {
    boundary,
    detail: `${label} is pending local sender export; next: ${step}.`,
    phase: "export-needed",
    state: "is-export-needed",
    step,
  };
}

export function productionTwoProfileOutboundStatusLabel(entry) {
  if (entry?.outboundDeliveryState === "canceled") {
    return "canceled";
  }
  if (entry?.outboundDeliveryState === "sent") {
    return "sent";
  }
  if (entry?.outboundDeliveryState === "failed") {
    const failure = String(entry.outboundFailureKind ?? "").toLowerCase();
    if (failure.includes("localonionendpointnotready")) {
      return "receive stopped";
    }
    if (failure.includes("timeout")) {
      return "send timeout";
    }
    if (failure.includes("storedoutboundenveloperequired")) {
      return "message missing";
    }
    if (
      failure.includes("peer-endpoint-missing") ||
      failure.includes("endpoint-missing") ||
      failure.includes("endpointunavailable") ||
      failure.includes("runtimeownerprofilemismatch")
    ) {
      return "route missing";
    }
    if (failure.includes("stale") || failure.includes("refresh") || failure.includes("endpoint")) {
      return "stale endpoint";
    }
    if (failure.includes("persistentclientnotready") || failure.includes("bootstrap")) {
      return "Tor bootstrap";
    }
    if (failure.includes("manualnetworkpermission")) {
      return "permission off";
    }
    return "peer offline";
  }
  return "pending";
}

export function productionTwoProfileOutboundNeedsEndpointRefresh(entry) {
  const failure = String(entry?.outboundFailureKind ?? "").toLowerCase();
  if (failure.includes("localonionendpointnotready")) {
    return false;
  }
  const endpointMissing =
    failure.includes("peer-endpoint-missing") ||
    failure.includes("endpoint-missing") ||
    failure.includes("endpointunavailable") ||
    failure.includes("runtimeownerprofilemismatch");
  if (endpointMissing) {
    return false;
  }
  return Boolean(
    entry?.outboundDeliveryState === "failed" &&
      (failure.includes("stale") ||
        failure.includes("refresh") ||
        failure.includes("endpoint")),
  );
}

export function productionTwoProfileOutboundActionState(entry, input = {}, inviteCodeMode = false) {
  const sentCopyPresent = Boolean(entry?.statuses?.has?.("sent"));
  const receivedCopyPresent = Boolean(entry?.statuses?.has?.("received"));
  const canceled = entry?.outboundDeliveryState === "canceled";
  const failed = entry?.outboundDeliveryState === "failed";
  const pending = entry?.outboundDeliveryState === "pending";
  const retryable = entry?.outboundRetryable === true;
  const showActions = Boolean(
    (sentCopyPresent || pending || failed || retryable) &&
      !receivedCopyPresent &&
      !canceled &&
      (pending || failed || retryable),
  );
  const sameDirection = Boolean(
    entry?.sender &&
      entry?.receiver &&
      entry.sender === input?.profileA &&
      entry.receiver === input?.profileB,
  );
  return {
    showActions,
    sameDirection,
    canApplyDirection: Boolean(showActions),
    canRunNow: Boolean(showActions && (!inviteCodeMode || sameDirection)),
    canCancelNow: Boolean(showActions && (!inviteCodeMode || sameDirection)),
    disabledReason:
      showActions && inviteCodeMode && !sameDirection
        ? "Only pending messages sent from this device can be retried or canceled here."
        : "",
    cancelDisabledReason:
      showActions && inviteCodeMode && !sameDirection
        ? "Only pending messages sent from this device can be retried or canceled here."
        : "",
  };
}

export function productionTwoProfileOutboundPrimaryAction(entry) {
  const status = productionTwoProfileOutboundStatusLabel(entry);
  if (status === "permission off") {
    return {
      action: "enable-private-delivery",
      labelKey: "enablePrivateDelivery",
      noticeKey: "messageSavedPrivateDeliveryOff",
      recoveryKey: "sendRecoveryPermissionOff",
    };
  }
  if (status === "route missing") {
    const failure = String(entry?.outboundFailureKind ?? "").toLowerCase();
    return {
      action: "prepare-private-route",
      labelKey: "preparePrivateRoute",
      noticeKey: "privateDeliveryRouteNeeded",
      recoveryKey: failure.includes("runtimeownerprofilemismatch")
        ? "sendRecoveryRuntimeMismatch"
        : "sendRecoveryRouteMissing",
    };
  }
  if (productionTwoProfileOutboundNeedsEndpointRefresh(entry)) {
    return {
      action: "refresh-and-retry",
      labelKey: "refreshAndRetry",
      noticeKey: "chatNoticeRefreshAddress",
      recoveryKey: "sendRecoveryStaleEndpoint",
    };
  }
  if (status === "receive stopped") {
    return {
      action: "start-receiving",
      labelKey: "startReceiving",
      noticeKey: "chatNoticeReceiveStopped",
      recoveryKey: "sendRecoveryStartReceiving",
    };
  }
  if (status === "Tor bootstrap") {
    return {
      action: "retry-network",
      labelKey: "retryNetwork",
      noticeKey: "sendFailedGeneric",
      recoveryKey: "sendRecoveryTorBootstrap",
    };
  }
  if (status === "message missing") {
    return {
      action: "retry",
      labelKey: "retrySend",
      noticeKey: "sendFailedGeneric",
      recoveryKey: "sendRecoveryGeneric",
    };
  }
  if (status === "peer offline") {
    return {
      action: "retry",
      labelKey: "retrySend",
      noticeKey: "sendFailedGeneric",
      recoveryKey: "sendRecoveryPeerOffline",
    };
  }
  if (status === "send timeout") {
    return {
      action: "retry",
      labelKey: "retrySend",
      noticeKey: "sendFailedGeneric",
      recoveryKey: "sendRecoveryTimeout",
    };
  }
  return {
    action: "retry",
    labelKey: "retrySend",
    noticeKey: "sendFailedGeneric",
    recoveryKey: "sendRecoveryGeneric",
  };
}

export function productionTwoProfileConversationCompare(left, right, direction = "asc") {
  const order = direction === "desc" ? -1 : 1;
  const normalize = (entry) => {
    const createdAtMs = Number.parseInt(entry?.createdAtMs ?? "", 10);
    const messageNumber = Number.parseInt(entry?.messageNumber ?? "", 10);
    return {
      createdAtMs: Number.isFinite(createdAtMs) && createdAtMs > 0 ? createdAtMs : null,
      messageNumber: Number.isFinite(messageNumber) ? messageNumber : 0,
      route: `${String(entry?.sender ?? "")}:${String(entry?.receiver ?? "")}`,
    };
  };
  const leftKey = normalize(left);
  const rightKey = normalize(right);
  if (
    leftKey.createdAtMs !== null &&
    rightKey.createdAtMs !== null &&
    leftKey.createdAtMs !== rightKey.createdAtMs
  ) {
    return order * (leftKey.createdAtMs - rightKey.createdAtMs);
  }
  if (leftKey.messageNumber !== rightKey.messageNumber) {
    return order * (leftKey.messageNumber - rightKey.messageNumber);
  }
  return order * leftKey.route.localeCompare(rightKey.route);
}

function inviteRoomConversationMetadataKey(entry, fallbackIndex) {
  const sender = String(entry?.sender ?? "").trim();
  const receiver = String(entry?.receiver ?? "").trim();
  const messageNumber = Number.parseInt(entry?.messageNumber ?? "", 10);
  if (sender && receiver && Number.isFinite(messageNumber)) {
    return `${sender}\u0000${receiver}\u0000${messageNumber}`;
  }
  return `fallback\u0000${fallbackIndex}`;
}

function inviteRoomOutboundDeliveryStateRank(state) {
  switch (state) {
    case "sent":
      return 4;
    case "canceled":
      return 3;
    case "failed":
      return 2;
    case "pending":
      return 1;
    default:
      return 0;
  }
}

function mergedInviteRoomConversationMetadataEntries(entries) {
  const merged = new Map();
  (Array.isArray(entries) ? entries : []).forEach((entry, index) => {
    const key = inviteRoomConversationMetadataKey(entry, index);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, {
        ...entry,
        statuses: entry?.statuses instanceof Set ? new Set(entry.statuses) : entry?.statuses,
      });
      return;
    }
    const existingStateRank = inviteRoomOutboundDeliveryStateRank(existing.outboundDeliveryState);
    const nextStateRank = inviteRoomOutboundDeliveryStateRank(entry?.outboundDeliveryState);
    const chosenState = nextStateRank > existingStateRank ? entry : existing;
    const existingStatuses = existing.statuses?.has ? existing.statuses : null;
    const nextStatuses = entry?.statuses?.has ? entry.statuses : null;
    const statuses = existingStatuses || nextStatuses ? new Set() : existing.statuses;
    if (existingStatuses) {
      for (const status of existingStatuses) {
        statuses.add(status);
      }
    }
    if (nextStatuses) {
      for (const status of nextStatuses) {
        statuses.add(status);
      }
    }
    merged.set(key, {
      ...existing,
      message: String(existing?.message ?? "").trim() ? existing.message : entry?.message,
      createdAtMs: Math.max(
        Number.parseInt(existing?.createdAtMs ?? 0, 10) || 0,
        Number.parseInt(entry?.createdAtMs ?? 0, 10) || 0,
      ),
      outboundDeliveryState: chosenState?.outboundDeliveryState,
      outboundFailureKind: chosenState?.outboundFailureKind ?? null,
      outboundRetryable: existing?.outboundRetryable === true || entry?.outboundRetryable === true,
      statuses,
    });
  });
  return [...merged.values()];
}

export function productionInviteRoomConversationMetadata(entries) {
  const sortedEntries = mergedInviteRoomConversationMetadataEntries(entries).sort((left, right) =>
    productionTwoProfileConversationCompare(left, right, "desc"),
  );
  const retryableOutboundEntries = sortedEntries.filter(
    (entry) =>
      entry?.kind !== "received" &&
      !entry?.statuses?.has?.("received") &&
      entry?.outboundRetryable === true &&
      entry?.outboundDeliveryState === "failed",
  );
  const latestRetryableOutbound = retryableOutboundEntries[0] ?? null;
  const latest = sortedEntries.find((entry) => String(entry?.message ?? "").trim());
  const preview = String(latest?.message ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return {
    lastMessagePreview: preview.length > 72 ? `${preview.slice(0, 72)}...` : preview,
    lastMessageAt: latest?.createdAtMs ? Number(latest.createdAtMs) : sortedEntries.length ? Date.now() : 0,
    messageCount: sortedEntries.length,
    retryableOutboundCount: retryableOutboundEntries.length,
    retryableOutboundMessageNumber: latestRetryableOutbound?.messageNumber ?? null,
    retryableOutboundMessage: latestRetryableOutbound?.message ?? "",
    retryableOutboundAction: latestRetryableOutbound
      ? productionTwoProfileOutboundPrimaryAction(latestRetryableOutbound).action
      : "",
  };
}

export function productionTwoProfileRetryableOutboundEntries(entries, input = {}) {
  return (Array.isArray(entries) ? entries : [])
    .filter((entry) => productionTwoProfileOutboundActionState(entry, input, true).canRunNow)
    .sort((left, right) => productionTwoProfileConversationCompare(left, right, "desc"));
}

export function productionTwoProfileLatestRetryableOutbound(entries, input = {}) {
  return productionTwoProfileRetryableOutboundEntries(entries, input)[0] ?? null;
}

export function productionTwoProfileReplySelectionView(state) {
  const selectedDelivered = Boolean(state?.selectedConversationDelivered);
  const latestDelivered = Boolean(state?.latestConversationDelivered);
  const selectedReplyReady = Boolean(state?.selectedDeliveredReplyReady);
  const replyDraft = Boolean(state?.hasTwoProfileReplyDraftInput);
  const canSelect = !selectedReplyReady && (selectedDelivered || latestDelivered);
  return {
    canSelect,
    label: selectedReplyReady ? "Reply target set" : selectedDelivered ? "Use selected reply" : "Reply to latest",
    disabledReason: canSelect
      ? ""
      : selectedReplyReady
        ? replyDraft
          ? "Reply draft is active; send it or select another delivered row."
          : "Reply target is already selected; write the reply."
        : "Load a delivered conversation first.",
  };
}

export function productionManualNextActions(state) {
  const {
    busy,
    hasProfileUnlockInput,
    hasPairingInput,
    hasSessionDraftInput,
    hasSessionDraftSaved,
    hasHandshakeReplyInput,
    hasHandshakeFinishInput,
    hasFinishImportInput,
    hasLocalPairingPayload,
    hasRemotePairingSlot,
    hasRemotePairingInput,
    hasHandshakeInitPayload,
    hasRemoteHandshakeInitSlot,
    hasHandshakeReplyPayload,
    hasRemoteHandshakeReplySlot,
    hasHandshakeFinishPayload,
    hasRemoteHandshakeFinishSlot,
    sessionReadyForMessages,
    hasOutboundMessageInput,
    hasInboundEnvelopeInput,
    hasLocalMessageEnvelope,
    hasRemoteMessageEnvelopeSlot,
    hasImportedMessage,
    hasReceivedMessage,
    hasTwoProfileReplyDraftInput,
    hasTwoProfileReplySelected,
    activeProfile,
    counterpartProfile,
  } = state;

  if (busy) {
    return {
      profile: "Next: wait for the active production action.",
      pairing: "Next: wait for the active production action.",
      message: "Next: wait for the active production action.",
    };
  }

  const profile = hasProfileUnlockInput
    ? "Next: unlock profile."
    : "Next: enter profile and passphrase.";

  let pairing = hasProfileUnlockInput ? "Next: click Unlock profile." : "Next: enter profile and passphrase.";
  if (hasPairingInput) {
    pairing = "Next: click Export pairing.";
  }
  if (hasLocalPairingPayload) {
    pairing = counterpartProfile ? "Next: click Relay pairing to peer." : "Next: click Store pairing.";
  }
  if (hasRemotePairingSlot && !hasRemotePairingInput) {
    pairing = "Next: click Fill remote pairing.";
  }
  if (hasSessionDraftInput && !hasSessionDraftSaved) {
    pairing = "Next: click Save draft.";
  }
  if (hasSessionDraftSaved) {
    pairing = "Next: click Export init.";
  }
  if (hasHandshakeInitPayload) {
    pairing = counterpartProfile ? "Next: click Relay init to peer." : "Next: click Store init.";
  }
  if (hasRemoteHandshakeInitSlot) {
    pairing = "Next: click Fill remote init.";
  }
  if (hasHandshakeReplyInput) {
    pairing = "Next: click Export reply.";
  }
  if (hasHandshakeReplyPayload) {
    pairing = counterpartProfile ? "Next: click Relay reply to peer." : "Next: click Store reply.";
  }
  if (hasRemoteHandshakeReplySlot) {
    pairing = "Next: click Fill remote reply.";
  }
  if (hasHandshakeFinishInput) {
    pairing = "Next: click Export finish.";
  }
  if (hasHandshakeFinishPayload) {
    pairing = counterpartProfile ? "Next: click Relay finish to peer." : "Next: click Store finish.";
  }
  if (hasRemoteHandshakeFinishSlot) {
    pairing = "Next: click Fill remote finish.";
  }
  if (hasFinishImportInput) {
    pairing = "Next: click Import finish.";
  }

  const active = activeProfile ? String(activeProfile).trim().toLowerCase() : "";
  const counterpart = counterpartProfile ? String(counterpartProfile).trim().toLowerCase() : "";
  const activeLabel = active || "active profile";
  const counterpartLabel = counterpart || "counterpart";

  let message = sessionReadyForMessages
    ? `Next: enter message for ${activeLabel} and export envelope.`
    : `Next: check both sessions, or complete ${activeLabel} session state.`;
  if (hasOutboundMessageInput) {
    message = `Next: export envelope from ${activeLabel}.`;
  }
  if (hasLocalMessageEnvelope) {
    message = `Next: click Relay to peer for ${counterpartLabel}.`;
  }
  if (hasRemoteMessageEnvelopeSlot) {
    message = `Next: click Fill remote for ${activeLabel}.`;
  }
  if (hasInboundEnvelopeInput) {
    message = `Next: import envelope for ${activeLabel}.`;
  }
  if (hasImportedMessage && !hasReceivedMessage) {
    message = `Next: click Show plaintext for ${activeLabel}.`;
  }
  if (hasReceivedMessage) {
    message = `Next: review received message for ${activeLabel}.`;
  }
  if (hasTwoProfileReplySelected && (!hasImportedMessage || hasReceivedMessage)) {
    message = `Next: write reply from ${activeLabel} to ${counterpartLabel}.`;
  }
  if (hasTwoProfileReplyDraftInput) {
    message = `Next: send stored-session reply from ${activeLabel} to ${counterpartLabel}.`;
  }

  return { profile, pairing, message };
}

export function productionManualCurrentStepView(state) {
  const nextActions = productionManualNextActions(state ?? {});
  if (state?.busy) {
    return "Running | wait for the active production action.";
  }
  if (!state?.hasProfileUnlockInput) {
    return `Profile | ${nextActions.profile}`;
  }
  const needsReceivedReview = Boolean(state.hasImportedMessage && !state.hasReceivedMessage);
  if (state.hasTwoProfileReplyDraftInput || (state.hasTwoProfileReplySelected && !needsReceivedReview)) {
    return `Reply | ${nextActions.message}`;
  }

  const pairingActive = Boolean(
    state.hasPairingInput ||
      state.hasLocalPairingPayload ||
      state.hasRemotePairingSlot ||
      state.hasSessionDraftInput ||
      state.hasSessionDraftSaved ||
      state.hasHandshakeInitPayload ||
      state.hasRemoteHandshakeInitSlot ||
      state.hasHandshakeReplyInput ||
      state.hasHandshakeReplyPayload ||
      state.hasRemoteHandshakeReplySlot ||
      state.hasHandshakeFinishInput ||
      state.hasHandshakeFinishPayload ||
      state.hasRemoteHandshakeFinishSlot ||
      state.hasFinishImportInput,
  );
  if (pairingActive) {
    return `Pairing | ${nextActions.pairing}`;
  }

  const messageActive = Boolean(
    state.sessionReadyForMessages ||
      state.hasOutboundMessageInput ||
      state.hasLocalMessageEnvelope ||
      state.hasRemoteMessageEnvelopeSlot ||
      state.hasInboundEnvelopeInput ||
      state.hasImportedMessage ||
      state.hasReceivedMessage,
  );
  if (messageActive) {
    return `Message | ${nextActions.message}`;
  }

  return `Pairing | ${nextActions.pairing}`;
}

export function productionManualCurrentFocusTarget(state) {
  if (state?.busy) {
    return null;
  }
  if (!state?.hasProfileUnlockInput) {
    return state?.activeProfile ? "profile-passphrase" : "profile-name";
  }

  const needsReceivedReview = Boolean(state.hasImportedMessage && !state.hasReceivedMessage);
  if (needsReceivedReview) {
    return "show-received";
  }
  if (state.hasTwoProfileReplyDraftInput) {
    return "send-two-profile-message";
  }
  if (state.hasTwoProfileReplySelected) {
    return "two-profile-message";
  }
  if (state.hasReceivedMessage) {
    return "received-message";
  }
  if (state.hasFinishImportInput) {
    return "import-finish";
  }
  if (state.hasRemoteHandshakeFinishSlot) {
    return state.hasFinishImportInput ? "import-finish" : "load-handshake-finish";
  }
  if (state.hasHandshakeFinishPayload) {
    return state.counterpartProfile ? "relay-handshake-finish" : "store-handshake-finish";
  }
  if (state.hasHandshakeFinishInput) {
    return "export-finish";
  }
  if (state.hasRemoteHandshakeReplySlot) {
    return state.hasHandshakeFinishInput ? "export-finish" : "load-handshake-reply";
  }
  if (state.hasHandshakeReplyPayload) {
    return state.counterpartProfile ? "relay-handshake-reply" : "store-handshake-reply";
  }
  if (state.hasHandshakeReplyInput) {
    return "export-reply";
  }
  if (state.hasRemoteHandshakeInitSlot) {
    return state.hasHandshakeReplyInput ? "export-reply" : "load-handshake-init";
  }
  if (state.hasHandshakeInitPayload) {
    return state.counterpartProfile ? "relay-handshake-init" : "store-handshake-init";
  }
  if (state.hasSessionDraftSaved) {
    return "export-init";
  }
  if (state.hasSessionDraftInput) {
    return "save-draft";
  }
  if (state.hasRemotePairingSlot) {
    return state.hasRemotePairingInput ? "save-draft" : "load-pairing";
  }
  if (state.hasLocalPairingPayload) {
    return state.counterpartProfile ? "relay-pairing" : "store-pairing";
  }
  if (state.hasPairingInput) {
    return "export-pairing";
  }
  if (state.hasInboundEnvelopeInput) {
    return "import-envelope";
  }
  if (state.hasRemoteMessageEnvelopeSlot) {
    return "load-message-envelope";
  }
  if (state.hasLocalMessageEnvelope) {
    return state.counterpartProfile ? "relay-message-envelope" : "store-message-envelope";
  }
  if (state.hasOutboundMessageInput) {
    return "export-message-envelope";
  }
  if (state.sessionReadyForMessages) {
    return "message-body";
  }

  return "unlock-profile";
}

export function productionManualPrimaryActions(state) {
  if (state?.busy) {
    return {
      showReceived: false,
      selectReply: false,
      sendReply: false,
    };
  }
  const replyDraft = Boolean(state?.hasTwoProfileReplyDraftInput);
  const replySelected = Boolean(state?.hasTwoProfileReplySelected);
  const needsReceivedReview = Boolean(state?.hasImportedMessage && !state?.hasReceivedMessage);
  return {
    showReceived: needsReceivedReview,
    selectReply: Boolean(replySelected && !replyDraft && !needsReceivedReview),
    sendReply: Boolean(replyDraft && !needsReceivedReview),
  };
}

export function productionManualStatusView(input, slots) {
  const profile = String(input?.profile ?? "").trim() || "No profile";
  const counterpart = productionCounterpartProfile(profile);
  const remoteProfile = counterpart ?? "No counterpart; manually select Alice or Bob";
  const formatSlot = (kind, label) => {
    const localReady = Boolean(slots?.[kind]?.local);
    const remoteReady = Boolean(slots?.[kind]?.remote);
    return (
      `${label}: active_slot(${profile})=${localReady ? "stored" : "empty"} ` +
      `counterpart_slot(${remoteProfile})=${remoteReady ? "ready" : "empty"}`
    );
  };

  return {
    route: `Active=${profile} Remote=${remoteProfile}`,
    direction:
      "Fill local copies the active output field into the matching local input; " +
      "Fill remote copies the stored counterpart payload into the matching remote input.",
    payloads: [
      formatSlot("pairing", "pairing"),
      formatSlot("handshakeInit", "init"),
      formatSlot("handshakeReply", "reply"),
      formatSlot("handshakeFinish", "finish"),
      formatSlot("messageEnvelope", "envelope"),
    ].join(" | "),
    policy:
      "manual_only=true auto_send=false auto_import=false " +
      "button_confirmed_profile_switch=true background_profile_switch=false network_io=false",
    mode: counterpart
      ? "Manual relay uses local memory slots only; manually select the counterpart profile to fill remote payloads."
      : "Manual relay needs a supported active profile; manually select Alice or Bob before filling remote payloads.",
  };
}

export function productionActionAvailability(state) {
  const {
    busy,
    hasProfileUnlockInput,
    hasPairingInput,
    hasSessionDraftInput,
    hasHandshakeReplyInput,
    hasHandshakeFinishInput,
    hasFinishImportInput,
    hasLocalPairingPayload,
    hasHandshakeInitPayload,
    hasHandshakeReplyPayload,
    hasHandshakeFinishPayload,
    hasLocalMessageEnvelope,
    hasOutboundMessageInput,
    hasInboundEnvelopeInput,
    hasReceivedExportInput,
    hasTwoProfileSetupInput,
    hasTwoProfileInput,
    hasTwoProfileSessionsReady,
    hasMessageRetentionPolicy = true,
    selectedMessageInputMatches = true,
  } = state;

  return {
    unlockProfile: !busy && hasProfileUnlockInput,
    exportPairing: !busy && hasPairingInput,
    saveSessionDraft: !busy && hasSessionDraftInput,
    checkSessionState: !busy && hasProfileUnlockInput,
    exportHandshakeInit: !busy && hasProfileUnlockInput,
    exportHandshakeReply: !busy && hasHandshakeReplyInput,
    exportHandshakeFinish: !busy && hasHandshakeFinishInput,
    importHandshakeFinish: !busy && hasFinishImportInput,
    exportMessageEnvelope:
      !busy && hasMessageRetentionPolicy && selectedMessageInputMatches && hasOutboundMessageInput,
    importMessageEnvelope:
      !busy && hasMessageRetentionPolicy && selectedMessageInputMatches && hasInboundEnvelopeInput,
    exportReceivedMessage: !busy && selectedMessageInputMatches && hasReceivedExportInput,
    runTwoProfileRoundtrip:
      !busy && hasMessageRetentionPolicy && hasTwoProfileSetupInput && !hasTwoProfileSessionsReady,
    runTwoProfileMessageRoundtrip:
      !busy && hasMessageRetentionPolicy && hasTwoProfileInput && hasTwoProfileSessionsReady,
    usePairingPayload: !busy && hasLocalPairingPayload,
    useHandshakeInit: !busy && hasHandshakeInitPayload,
    useHandshakeReply: !busy && hasHandshakeReplyPayload,
    useHandshakeFinish: !busy && hasHandshakeFinishPayload,
    useMessageEnvelope: !busy && hasLocalMessageEnvelope,
  };
}

export function productionManualRelayAvailability(state) {
  const {
    busy,
    hasLocalPairingPayload,
    hasRemotePairingSlot,
    hasHandshakeInitPayload,
    hasRemoteHandshakeInitSlot,
    hasHandshakeReplyPayload,
    hasRemoteHandshakeReplySlot,
    hasHandshakeFinishPayload,
    hasRemoteHandshakeFinishSlot,
    hasLocalMessageEnvelope,
    hasRemoteMessageEnvelopeSlot,
    counterpartProfile,
  } = state;
  const enabled = (ready) => !busy && Boolean(ready);

  return {
    usePairingPayload: enabled(hasLocalPairingPayload),
    storePairingPayload: enabled(hasLocalPairingPayload),
    loadPairingPayload: enabled(hasRemotePairingSlot),
    relayPairingPayload: enabled(hasLocalPairingPayload && counterpartProfile),
    useHandshakeInit: enabled(hasHandshakeInitPayload),
    storeHandshakeInit: enabled(hasHandshakeInitPayload),
    loadHandshakeInit: enabled(hasRemoteHandshakeInitSlot),
    relayHandshakeInit: enabled(hasHandshakeInitPayload && counterpartProfile),
    useHandshakeReply: enabled(hasHandshakeReplyPayload),
    storeHandshakeReply: enabled(hasHandshakeReplyPayload),
    loadHandshakeReply: enabled(hasRemoteHandshakeReplySlot),
    relayHandshakeReply: enabled(hasHandshakeReplyPayload && counterpartProfile),
    useHandshakeFinish: enabled(hasHandshakeFinishPayload),
    storeHandshakeFinish: enabled(hasHandshakeFinishPayload),
    loadHandshakeFinish: enabled(hasRemoteHandshakeFinishSlot),
    relayHandshakeFinish: enabled(hasHandshakeFinishPayload && counterpartProfile),
    useMessageEnvelope: enabled(hasLocalMessageEnvelope),
    storeMessageEnvelope: enabled(hasLocalMessageEnvelope),
    loadMessageEnvelope: enabled(hasRemoteMessageEnvelopeSlot),
    relayMessageEnvelope: enabled(hasLocalMessageEnvelope && counterpartProfile),
  };
}

export function productionManualRelayCurrentActions(availability, context = {}) {
  const relayPreferred = (storeKey, relayKey) =>
    Boolean(availability?.[storeKey]) && !availability?.[relayKey];

  return {
    storePairingPayload: relayPreferred("storePairingPayload", "relayPairingPayload"),
    loadPairingPayload: Boolean(availability?.loadPairingPayload && !context.hasRemotePairingInput),
    relayPairingPayload: Boolean(availability?.relayPairingPayload),
    storeHandshakeInit: relayPreferred("storeHandshakeInit", "relayHandshakeInit"),
    loadHandshakeInit: Boolean(availability?.loadHandshakeInit && !context.hasHandshakeReplyInput),
    relayHandshakeInit: Boolean(availability?.relayHandshakeInit),
    storeHandshakeReply: relayPreferred("storeHandshakeReply", "relayHandshakeReply"),
    loadHandshakeReply: Boolean(availability?.loadHandshakeReply && !context.hasHandshakeFinishInput),
    relayHandshakeReply: Boolean(availability?.relayHandshakeReply),
    storeHandshakeFinish: relayPreferred("storeHandshakeFinish", "relayHandshakeFinish"),
    loadHandshakeFinish: Boolean(availability?.loadHandshakeFinish && !context.hasFinishImportInput),
    relayHandshakeFinish: Boolean(availability?.relayHandshakeFinish),
    storeMessageEnvelope: relayPreferred("storeMessageEnvelope", "relayMessageEnvelope"),
    loadMessageEnvelope: Boolean(
      availability?.loadMessageEnvelope &&
        context.selectedNeedsPeerImport &&
        !context.hasInboundEnvelopeInput,
    ),
    relayMessageEnvelope: Boolean(availability?.relayMessageEnvelope),
  };
}

export function productionManualRelaySuccessWarning(profile, counterpart, label) {
  const source = String(profile ?? "").trim().toLowerCase() || "active profile";
  const target = String(counterpart ?? "").trim().toLowerCase() || "peer";
  const payload = String(label ?? "payload").trim().toLowerCase();
  return (
    `Stored ${source} ${payload} slot, selected ${target}, and loaded ${payload} into the remote field. ` +
    "The local output field was cleared; the stored relay slot remains available."
  );
}

export function productionManualRelayDisabledReasons(state) {
  if (state?.busy) {
    return {
      usePairingPayload: "Wait for the active production action.",
      storePairingPayload: "Wait for the active production action.",
      loadPairingPayload: "Wait for the active production action.",
      relayPairingPayload: "Wait for the active production action.",
      useHandshakeInit: "Wait for the active production action.",
      storeHandshakeInit: "Wait for the active production action.",
      loadHandshakeInit: "Wait for the active production action.",
      relayHandshakeInit: "Wait for the active production action.",
      useHandshakeReply: "Wait for the active production action.",
      storeHandshakeReply: "Wait for the active production action.",
      loadHandshakeReply: "Wait for the active production action.",
      relayHandshakeReply: "Wait for the active production action.",
      useHandshakeFinish: "Wait for the active production action.",
      storeHandshakeFinish: "Wait for the active production action.",
      loadHandshakeFinish: "Wait for the active production action.",
      relayHandshakeFinish: "Wait for the active production action.",
      useMessageEnvelope: "Wait for the active production action.",
      storeMessageEnvelope: "Wait for the active production action.",
      loadMessageEnvelope: "Wait for the active production action.",
      relayMessageEnvelope: "Wait for the active production action.",
    };
  }

  const counterpart = String(state?.counterpartProfile ?? "").trim().toLowerCase();
  const active = String(state?.activeProfile ?? "").trim().toLowerCase();
  const selectedExportProfile = String(state?.selectedManualExportProfile ?? "").trim().toLowerCase();
  const selectedImportProfile = String(state?.selectedManualImportProfile ?? "").trim().toLowerCase();
  const remoteReason = (label) =>
    counterpart ? `Store ${counterpart} ${label} first.` : "Select Alice or Bob before filling remote payloads.";
  const selectedExportReason = selectedExportProfile
    ? active && active !== selectedExportProfile
      ? `Select ${selectedExportProfile} in the manual profile panel before exporting this selected message envelope.`
      : `Export selected message envelope from ${selectedExportProfile} first.`
    : "";
  const selectedImportReason = selectedImportProfile
    ? active && active !== selectedImportProfile
      ? `Select ${selectedImportProfile} in the manual profile panel before loading this selected message envelope.`
      : `Load or paste sender envelope for ${selectedImportProfile} first.`
    : "";

  return {
    usePairingPayload: "Export pairing first.",
    storePairingPayload: "Export pairing first.",
    loadPairingPayload: remoteReason("pairing"),
    relayPairingPayload: counterpart ? "Export pairing first." : "Select Alice or Bob before relaying.",
    useHandshakeInit: "Export init first.",
    storeHandshakeInit: "Export init first.",
    loadHandshakeInit: remoteReason("init"),
    relayHandshakeInit: counterpart ? "Export init first." : "Select Alice or Bob before relaying.",
    useHandshakeReply: "Export reply first.",
    storeHandshakeReply: "Export reply first.",
    loadHandshakeReply: remoteReason("reply"),
    relayHandshakeReply: counterpart ? "Export reply first." : "Select Alice or Bob before relaying.",
    useHandshakeFinish: "Export finish first.",
    storeHandshakeFinish: "Export finish first.",
    loadHandshakeFinish: remoteReason("finish"),
    relayHandshakeFinish: counterpart ? "Export finish first." : "Select Alice or Bob before relaying.",
    useMessageEnvelope: selectedExportReason || "Export envelope first.",
    storeMessageEnvelope: selectedExportReason || "Export envelope first.",
    loadMessageEnvelope: selectedImportReason || remoteReason("envelope"),
    relayMessageEnvelope:
      selectedExportReason || (counterpart ? "Export envelope first." : "Select Alice or Bob before relaying."),
  };
}

export function productionTwoProfileResultView(result) {
  const profilesReady =
    result.profile_a_unlocked &&
    result.profile_b_unlocked &&
    result.pairing_payloads_exported;
  const sessionReady =
    result.session_drafts_saved &&
    result.handshake_completed &&
    result.sender_session_ready &&
    result.receiver_session_ready;
  const messageReady =
    result.message_number_reserved &&
    result.encrypted_envelope_exported &&
    result.inbound_message_stored &&
    result.received_status_verified &&
    result.received_export_matches_input;
  const boundaryContained =
    !result.plaintext_returned_to_frontend &&
    !result.store_path_returned &&
    !result.passphrase_retained &&
    !result.key_material_exposed &&
    !result.network_io_attempted &&
    !result.transport_io_opened &&
    !result.runtime_messaging_enabled;
  const canContinue = profilesReady && sessionReady && messageReady && boundaryContained;

  return {
    canContinue,
    profiles:
      `${profilesReady ? "Complete" : "Review"}: profiles unlocked and pairing payloads exported | ` +
      `a=${result.profile_a_unlocked} b=${result.profile_b_unlocked} payloads=${result.pairing_payloads_exported}`,
    session:
      `${sessionReady ? "Complete" : "Review"}: drafts saved, handshake complete, sender and receiver ready | ` +
      `drafts=${result.session_drafts_saved} handshake=${result.handshake_completed} sender=${result.sender_session_ready} receiver=${result.receiver_session_ready}`,
    message:
      `${messageReady ? "Complete" : "Review"}: encrypted envelope stored and received message verified | ` +
      `reserved=${result.message_number_reserved} envelope=${result.encrypted_envelope_exported} inbound=${result.inbound_message_stored} status=${result.received_status_verified} match=${result.received_export_matches_input}`,
    boundary:
      `${boundaryContained ? "Contained" : "Review"}: no plaintext, key material, store path, network I/O, transport I/O, or runtime messaging exposure | ` +
      `plaintext_returned=${result.plaintext_returned_to_frontend} path_returned=${result.store_path_returned} passphrase_retained=${result.passphrase_retained} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    nextStep: canContinue
      ? "Next: reply direction is selected; write a stored-session reply."
      : "Review result rows before continuing.",
  };
}

export function productionProfileUnlockView(result) {
  return {
    storage:
      `opened=${result.storage_opened} app_data=${result.app_data_profile_store} ` +
      `initialized=${result.profile_initialized} marker=${result.profile_marker_present}`,
    identity:
      `created=${result.identity_created} present=${result.identity_private_key_present} ` +
      `public_derivable=${result.identity_public_key_derivable}`,
    boundary:
      `path_returned=${result.store_path_returned} passphrase_retained=${result.passphrase_retained} ` +
      `key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} ` +
      `transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
  };
}

export function productionLocalLifecycleBoundaryView(result = {}, options = {}) {
  const includePaths = options.includePaths !== false;
  const localOnly = true;
  const cloudBackupSync = false;
  const backupRecovery = false;
  const markerOnlyRollback = true;
  const rollbackDetection = result.rollback_detection_ready === true;
  const rollbackPrevention = false;
  const secureDeletion = false;
  const cryptoErasure = result.crypto_erasure_performed === true;
  const keyRecordDeletion =
    result.session_dek_records_deleted === true ||
    result.session_key_records_deleted === true ||
    result.conversation_dek_deleted === true ||
    result.message_key_records_deleted === true;
  const pathReturned = result.store_path_returned === true;
  const passphraseRetained = result.passphrase_retained === true;
  const keyMaterial = result.key_material_exposed === true;
  const networkIo = result.network_io_attempted === true;
  const transportIo = result.transport_io_opened === true;
  const runtime = result.runtime_messaging_enabled === true;
  const plaintext =
    result.plaintext_exposed === true ||
    result.plaintext_returned === true ||
    result.plaintext_returned_after_unlock === true ||
    result.plaintext_returned_to_frontend === true;

  const privacyFlags = [
    `local_only=${localOnly}`,
    `cloud_backup_sync=${cloudBackupSync}`,
    `backup_recovery=${backupRecovery}`,
    `marker_only_rollback=${markerOnlyRollback}`,
    `rollback_detection=${rollbackDetection}`,
    `crypto_erasure=${cryptoErasure}`,
    `key_record_deletion=${keyRecordDeletion}`,
    `rollback_prevention=${rollbackPrevention}`,
    `secure_delete_claim=${secureDeletion}`,
  ];
  const exposureFlags = [
    includePaths ? `path_returned=${pathReturned}` : null,
    `passphrase_retained=${passphraseRetained}`,
    `plaintext=${plaintext}`,
    `key_material=${keyMaterial}`,
    `network_io=${networkIo}`,
    `transport_io=${transportIo}`,
    `runtime=${runtime}`,
  ].filter(Boolean);

  return [...privacyFlags, ...exposureFlags].join(" ");
}

export function productionPairingPayloadView(result) {
  return {
    storage:
      `opened=${result.storage_opened} identity_loaded=${result.identity_private_key_loaded} ` +
      `noise_static_written=${result.noise_static_private_key_written} ` +
      `exported=${result.pairing_payload_exported} format=${result.payload_format}`,
    boundary:
      `path_returned=${result.store_path_returned} passphrase_retained=${result.passphrase_retained} ` +
      `private_key_returned=${result.private_key_material_returned} ` +
      `key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} ` +
      `transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
  };
}

export function productionSessionDraftView(result) {
  return {
    session:
      `plan=${result.session_plan_created} draft=${result.session_draft_written} ` +
      `present=${result.session_draft_present} endpoint=${result.remote_endpoint_state_present} ` +
      `replay=${result.replay_window_present} channel=${result.channel_id_derivable}`,
    storage:
      `opened=${result.storage_opened} local_noise_loaded=${result.local_noise_static_private_key_loaded} ` +
      `local_noise_match=${result.local_noise_static_matches_payload} remote_contact=${result.remote_contact_present}`,
    boundary:
      `payloads_returned=${result.payloads_returned} path_returned=${result.store_path_returned} ` +
      `passphrase_retained=${result.passphrase_retained} key_material=${result.key_material_exposed} ` +
      `network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} ` +
      `runtime=${result.runtime_messaging_enabled}`,
  };
}

export function productionTwoProfileMessageResultView(result) {
  const sessionReady = result.sender_session_ready && result.receiver_session_ready;
  const messageReady =
    result.message_number_reserved &&
    result.encrypted_envelope_exported &&
    result.inbound_message_stored &&
    result.received_status_verified &&
    result.received_export_matches_input;
  const boundaryContained =
    !result.plaintext_returned_to_frontend &&
    !result.store_path_returned &&
    !result.passphrase_retained &&
    !result.key_material_exposed &&
    !result.network_io_attempted &&
    !result.transport_io_opened &&
    !result.runtime_messaging_enabled;
  const canContinue = sessionReady && messageReady && boundaryContained;

  return {
    canContinue,
    profiles:
      `Using existing encrypted profile stores; no pairing payloads exported in this action. ` +
      `sender=${result.sender_profile ?? "unknown"} receiver=${result.receiver_profile ?? "unknown"}`,
    session:
      `${sessionReady ? "Complete" : "Review"}: stored sender and receiver sessions are message-ready | ` +
      `sender=${result.sender_session_ready} receiver=${result.receiver_session_ready}`,
    message:
      `${messageReady ? "Complete" : "Review"}: stored-session envelope imported and received message verified | ` +
      `number=${result.message_number ?? "unknown"} reserved=${result.message_number_reserved} ttl=${result.message_ttl_seconds ?? "unknown"} envelope=${result.encrypted_envelope_exported} inbound=${result.inbound_message_stored} status=${result.received_status_verified} match=${result.received_export_matches_input}`,
    boundary:
      `${boundaryContained ? "Contained" : "Review"}: no plaintext, key material, store path, network I/O, transport I/O, or runtime messaging exposure | ` +
      `plaintext_returned=${result.plaintext_returned_to_frontend} path_returned=${result.store_path_returned} passphrase_retained=${result.passphrase_retained} key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    nextStep: canContinue
      ? "Next: continue from the local roundtrip message and write a stored-session reply."
      : "Review stored-session result rows before continuing.",
  };
}

export function productionTwoProfileRealOnionResultView(result) {
  const firstDelivered = Boolean(
    result?.message_number_reserved &&
      result?.encrypted_envelope_exported &&
      result?.send_attempt_succeeded &&
      result?.receive_attempt_succeeded &&
      result?.inbound_message_stored &&
      result?.received_status_verified &&
      result?.received_export_matches_input,
  );
  const secondDelivered = Boolean(
    result?.second_message_number_reserved &&
      result?.second_encrypted_envelope_exported &&
      result?.second_send_attempt_succeeded &&
      result?.second_receive_attempt_succeeded &&
      result?.second_inbound_message_stored &&
      result?.second_received_status_verified &&
      result?.second_received_export_matches_input,
  );
  const receiveRecorderReady = Boolean(
    result?.receive_mode_recorder_verified &&
      Number(result?.consecutive_receive_attempts ?? 0) >= 2 &&
      Number(result?.consecutive_messages_imported ?? 0) >= 2 &&
      Number(result?.receive_mode_attempt_count ?? 0) >= 2 &&
      Number(result?.receive_mode_import_sequence ?? 0) >= 2 &&
      Number(result?.receive_mode_message_import_count ?? 0) >= 2 &&
      result?.receive_mode_last_network_io_attempted &&
      result?.receive_mode_last_stream_accept_attempted &&
      result?.receive_mode_last_stream_read_write_attempted &&
      result?.receive_mode_last_envelope_io_opened &&
      result?.receive_mode_last_runtime_messaging_enabled,
  );
  const redactedBoundaryContained = Boolean(
    !result?.local_endpoint_returned &&
      !result?.peer_endpoint_returned &&
      !result?.envelope_payload_returned &&
      !result?.plaintext_returned_to_frontend &&
      !result?.store_path_returned &&
      !result?.passphrase_retained &&
      !result?.key_material_exposed,
  );
  const externalDeliveryConfirmed = result?.external_peer_delivery_confirmed === true;
  const localDevRoundtripResult = result?.local_dev_roundtrip_result === true;
  const complete =
    externalDeliveryConfirmed &&
    !localDevRoundtripResult &&
    firstDelivered &&
    secondDelivered &&
    receiveRecorderReady &&
    redactedBoundaryContained;
  const touchedTranscript = Boolean(
    result?.message_number_reserved ||
      result?.second_message_number_reserved ||
      result?.encrypted_envelope_exported ||
      result?.second_encrypted_envelope_exported ||
      result?.send_attempt_started ||
      result?.second_send_attempt_succeeded ||
      result?.inbound_message_stored ||
      result?.second_inbound_message_stored ||
      Number(result?.receive_mode_message_import_count ?? 0) > 0,
  );

  return {
    complete,
    touchedTranscript,
    state: complete ? "Real onion roundtrip completed" : "Real onion roundtrip needs review",
    message:
      `first=#${result?.message_number ?? 0} delivered=${firstDelivered} ` +
      `second=#${result?.second_message_number ?? 0} delivered=${secondDelivered} ` +
      `receive_attempts=${result?.consecutive_receive_attempts ?? 0} ` +
      `imported=${result?.consecutive_messages_imported ?? 0} ` +
      `external_delivery=${externalDeliveryConfirmed} ` +
      `local_dev_roundtrip=${localDevRoundtripResult} ` +
      `recorder=${receiveRecorderReady} ` +
      `redacted=${redactedBoundaryContained}`,
    boundary:
      `feature=${result?.manual_client_attempt_feature_compiled === true} ` +
      `permission=${result?.manual_network_permission_enabled === true} ` +
      `bridge_capable=${result?.bridge_capable_build === true} ` +
      `bridge_configured=${result?.bridge_configured_for_bootstrap === true} ` +
      `next=${result?.next_blocker ?? "unknown"} ` +
      `external_delivery=${externalDeliveryConfirmed} ` +
      `local_dev_roundtrip=${localDevRoundtripResult} ` +
      `endpoint_returned=${Boolean(result?.local_endpoint_returned || result?.peer_endpoint_returned)} ` +
      `envelope_payload=${result?.envelope_payload_returned === true} ` +
      `plaintext=${result?.plaintext_returned_to_frontend === true} ` +
      `path=${result?.store_path_returned === true} ` +
      `passphrase=${result?.passphrase_retained === true} ` +
      `key_material=${result?.key_material_exposed === true} ` +
      `network=${result?.network_io_attempted === true} ` +
      `transport=${result?.transport_io_opened === true} ` +
      `runtime=${result?.runtime_messaging_enabled === true}`,
  };
}

export function productionTwoProfileRealOnionRecoveryPlan(result) {
  if (!result) {
    return {
      action: "none",
      retryable: false,
      waitCancellable: false,
      reason: "not-attempted",
    };
  }
  if (result?.next_blocker === "none") {
    return {
      action: "none",
      retryable: false,
      waitCancellable: false,
      reason: "complete",
    };
  }
  const blockers = Array.isArray(result?.blockers) ? result.blockers : [];
  const text = [result?.next_blocker, ...blockers].join(" ").toLowerCase();
  if (text.includes("manualnetworkpermissionmissing") || result?.manual_network_permission_enabled === false) {
    return {
      action: "enable-private-delivery",
      retryable: true,
      waitCancellable: false,
      reason: "manual-permission",
    };
  }
  if (
    text.includes("bootstrapcancelled")
  ) {
    return {
      action: "bootstrap-cancelled",
      retryable: true,
      waitCancellable: false,
      reason: "network-bootstrap-cancelled",
    };
  }
  if (text.includes("bridgeconfiginvalid")) {
    return {
      action: "prepare-network-or-bridge",
      retryable: true,
      waitCancellable: false,
      reason: "network-or-bridge-invalid-config",
    };
  }
  if (text.includes("obfs4transportmissing")) {
    return {
      action: "prepare-network-or-bridge",
      retryable: true,
      waitCancellable: false,
      reason: "network-or-bridge-transport",
    };
  }
  if (text.includes("obfs4transportinvalid")) {
    return {
      action: "prepare-network-or-bridge",
      retryable: true,
      waitCancellable: false,
      reason: "network-or-bridge-invalid-transport",
    };
  }
  const diagnosticText = (Array.isArray(result?.event_summary) ? result.event_summary : [])
    .filter((event) => String(event).includes("bootstrap_diagnostic"))
    .at(-1) ?? "";
  const diagnosticNextAction =
    String(diagnosticText)
      .split(/\s+/)
      .find((part) => part.startsWith("next_action="))
      ?.slice("next_action=".length) ?? "";
  const bridgeBootstrapRecoveryReason = () => {
    if (result?.bridge_capable_build === false) {
      return "network-or-bridge-capable-build";
    }
    if (
      result?.bridge_capable_build === true &&
      result?.bridge_configured_for_bootstrap === false
    ) {
      return "network-or-bridge-config";
    }
    if (
      diagnosticNextAction === "retry-different-network-or-refresh-bridge-pt" ||
      diagnosticNextAction === "inspect-pt-or-bridge-diagnostics"
    ) {
      return "network-or-bridge-refresh-transport";
    }
    if (diagnosticNextAction === "retry-different-network-or-refresh-bridge") {
      return "network-or-bridge-refresh-config";
    }
    return "network-or-bridge-different-network";
  };
  if (
    text.includes("bootstraptimeout") ||
    text.includes("bootstrapnetworkaccessfailed") ||
    text.includes("censorshiporbridgerequired")
  ) {
    const retryLimit = Number.parseInt(result?.bootstrap_retry_limit ?? 0, 10) || 0;
    const profileAAttempts = Number.parseInt(result?.profile_a_bootstrap_attempts ?? 0, 10) || 0;
    const profileBAttempts = Number.parseInt(result?.profile_b_bootstrap_attempts ?? 0, 10) || 0;
    const attemptsExhausted = retryLimit > 0 && Math.max(profileAAttempts, profileBAttempts) >= retryLimit;
    if (result?.bridge_capable_build === false && attemptsExhausted) {
      return {
        action: "prepare-network-or-bridge",
        retryable: true,
        waitCancellable: false,
        reason: "network-or-bridge-capable-build",
      };
    }
    if (
      result?.bridge_capable_build === true &&
      result?.bridge_configured_for_bootstrap === false &&
      attemptsExhausted
    ) {
      return {
        action: "prepare-network-or-bridge",
        retryable: true,
        waitCancellable: false,
        reason: "network-or-bridge-config",
      };
    }
    if (attemptsExhausted && result?.bridge_configured_for_bootstrap === true) {
      return {
        action: "prepare-network-or-bridge",
        retryable: true,
        waitCancellable: false,
        reason: bridgeBootstrapRecoveryReason(),
      };
    }
    return {
      action: "retry-bootstrap",
      retryable: true,
      waitCancellable: true,
      reason: "network-bootstrap",
    };
  }
  if (
    text.includes("bootstraplocalstatefailed") ||
    text.includes("bootstrapconfigurationfailed") ||
    text.includes("bootstrapunsupported") ||
    text.includes("bootstrapprotocolfailed")
  ) {
    if (
      result?.bridge_capable_build === false ||
      result?.bridge_configured_for_bootstrap === false ||
      diagnosticNextAction
    ) {
      return {
        action: "prepare-network-or-bridge",
        retryable: true,
        waitCancellable: false,
        reason: bridgeBootstrapRecoveryReason(),
      };
    }
    return {
      action: "inspect-diagnostics",
      retryable: false,
      waitCancellable: false,
      reason: "local-bootstrap",
    };
  }
  return {
    action: "retry-private-delivery",
    retryable: true,
    waitCancellable: false,
    reason: "delivery-failed",
  };
}

export function productionBridgeCensorshipBoundaryView(result = {}) {
  return [
    "bridge_lines_local_sensitive=true",
    "bridge_support=configuration_specific",
    "audited_censorship_circumvention_claim=false",
    "reliable_onion_delivery_claim=false",
    "external_peer_evidence_required=true",
    `bridge_configured=${result?.bridge_configured_for_bootstrap === true}`,
    `bridge_capable=${result?.bridge_capable_build === true}`,
  ].join(" ");
}

export function productionTwoProfileSendAttemptUserView(result, messageNumber = 0) {
  const number = Number.parseInt(messageNumber, 10);
  const label = Number.isInteger(number) && number > 0 ? `#${number}` : "";
  const blockerText = sendAttemptBlockerText(result);
  const routeMissing = sendAttemptNeedsRouteSetup(blockerText);
  const endpointRefreshNeeded = sendAttemptNeedsEndpointRefresh(result, blockerText, routeMissing);
  if (result?.send_attempt_succeeded) {
    return {
      state: "Private send written",
      profiles: "Room is ready.",
      session: label ? `Message ${label} was written to the peer route.` : "Message was written to the peer route.",
      message: "Waiting for the other device to receive it.",
      boundary: "External peer delivery is not confirmed until the other device receives it.",
    };
  }
  if (endpointRefreshNeeded) {
    return {
      state: "Peer address refresh needed",
      profiles: "Room is saved.",
      session: "Peer address needs to be refreshed.",
      message: label
        ? `Message ${label} is still saved. Refresh the address, then retry or cancel.`
        : "Message is still saved. Refresh the address, then retry or cancel.",
      boundary: "No message was deleted.",
    };
  }
  if (routeMissing) {
    return {
      state: "Private route needed",
      profiles: "Room is saved.",
      session: "Peer delivery route is not ready.",
      message: label
        ? `Message ${label} is still saved. Set up the delivery route, then retry or cancel.`
        : "Message is still saved. Set up the delivery route, then retry or cancel.",
      boundary: "No private delivery was attempted.",
    };
  }
  if (result?.manual_network_permission_enabled === false) {
    return {
      state: "Private delivery blocked",
      profiles: "Room is saved.",
      session: "Network permission is off.",
      message: label ? `Message ${label} is still saved.` : "Message is still saved.",
      boundary: "No private delivery was attempted.",
    };
  }
  if (result?.send_attempt_started) {
    return {
      state: "Private delivery failed",
      profiles: "Room is saved.",
      session: "The other device may be offline.",
      message: label
        ? `Message ${label} is still saved. Retry or cancel it from the conversation.`
        : "Message is still saved. Retry or cancel it from the conversation.",
      boundary: "The failed send stayed retryable.",
    };
  }
  return {
    state: "Private delivery blocked",
    profiles: "Room is saved.",
    session: "Private delivery is not ready.",
    message: label
      ? `Message ${label} is still saved. Retry when the room is ready.`
      : "Message is still saved. Retry when the room is ready.",
    boundary: "No message was deleted.",
  };
}

function sendAttemptBlockerText(result) {
  const blockers = Array.isArray(result?.blockers) ? result.blockers : [];
  return [result?.next_blocker, result?.warning, ...blockers].join(" ").toLowerCase();
}

function sendAttemptNeedsRouteSetup(blockerText) {
  return (
    blockerText.includes("peer-endpoint-missing") ||
    blockerText.includes("endpoint-missing") ||
    blockerText.includes("endpointunavailable") ||
    blockerText.includes("stored remote endpoint unavailable") ||
    blockerText.includes("runtimeownerprofilemismatch")
  );
}

function sendAttemptNeedsEndpointRefresh(result, blockerText, routeMissing) {
  if (routeMissing) {
    return false;
  }
  return Boolean(
    result?.peer_endpoint_refresh_recommended ||
      result?.retry_recommended_after_endpoint_refresh ||
      blockerText.includes("stale") ||
      blockerText.includes("refresh"),
  );
}

export function productionTwoProfileRealOnionUserView(result) {
  const detailed = productionTwoProfileRealOnionResultView(result);
  const recovery = productionTwoProfileRealOnionRecoveryPlan(result);
  if (detailed.complete) {
    return {
      state: "Private delivery completed",
      profiles: "Room is ready.",
      session: "Both devices exchanged messages.",
      message: "Delivery attempt finished. Continue only after the peer confirms receipt.",
      boundary: "Private delivery completed without showing private details.",
    };
  }
  if (result?.manual_network_permission_enabled === false) {
    return {
      state: "Private delivery blocked",
      profiles: "Room is saved.",
      session: "Network permission is off.",
      message: "Turn on private delivery before trying again.",
      boundary: "No private delivery was attempted.",
    };
  }
  if (recovery.action === "retry-bootstrap") {
    return {
      state: "Private delivery waiting for network",
      profiles: "Room is saved.",
      session: "Delivery network did not finish starting.",
      message: "Wait a moment, then retry private delivery or turn it off.",
      boundary: "No message was sent and the wait can be cancelled.",
    };
  }
  if (recovery.action === "prepare-network-or-bridge") {
    const bridgeBoundary = productionBridgeCensorshipBoundaryView(result);
    const bridgeConfigMissing = recovery.reason === "network-or-bridge-config";
    const bridgeConfigInvalid = recovery.reason === "network-or-bridge-invalid-config";
    const bridgeTransportMissing = recovery.reason === "network-or-bridge-transport";
    const bridgeTransportInvalid = recovery.reason === "network-or-bridge-invalid-transport";
    const bridgeTransportRefresh = recovery.reason === "network-or-bridge-refresh-transport";
    const bridgeConfigRefresh = recovery.reason === "network-or-bridge-refresh-config";
    const differentNetwork = recovery.reason === "network-or-bridge-different-network";
    return {
      state: "Private delivery needs network change",
      profiles: "Room is saved.",
      session: "Delivery network did not finish starting.",
      message: bridgeConfigInvalid
        ? "Replace the private bridge config, then retry private delivery."
        : bridgeTransportRefresh
        ? "Refresh the private bridge config or replace the pluggable transport binary, then retry private delivery."
        : bridgeTransportInvalid
        ? "Replace the pluggable transport binary path, then retry private delivery."
        : bridgeTransportMissing
        ? "Configure the pluggable transport binary, then retry private delivery."
        : bridgeConfigRefresh
        ? "Refresh the private bridge config or change network, then retry private delivery."
        : differentNetwork
        ? "Change network, then retry private delivery."
        : bridgeConfigMissing
        ? "Change network or add private bridge config, then retry private delivery."
        : "Change network or use a bridge-capable build, then retry private delivery.",
      boundary: bridgeConfigInvalid
        ? `No message was sent because the saved bridge config is invalid. ${bridgeBoundary}`
        : bridgeTransportRefresh
        ? `No message was sent after bridge bootstrap exhausted retries with pluggable transport configured. ${bridgeBoundary}`
        : bridgeTransportInvalid
        ? `No message was sent because the saved pluggable transport binary path is invalid. ${bridgeBoundary}`
        : bridgeTransportMissing
        ? `No message was sent because pluggable transport is not configured. ${bridgeBoundary}`
        : bridgeConfigRefresh
        ? `No message was sent after bridge bootstrap exhausted retries. ${bridgeBoundary}`
        : differentNetwork
        ? `No message was sent after network bootstrap exhausted retries. ${bridgeBoundary}`
        : bridgeConfigMissing
        ? `No message was sent and no bridge config was used. ${bridgeBoundary}`
        : `No message was sent and this build did not report bridge support. ${bridgeBoundary}`,
    };
  }
  if (recovery.action === "bootstrap-cancelled") {
    return {
      state: "Private delivery wait canceled",
      profiles: "Room is saved.",
      session: "Network wait canceled",
      message: "Retry private delivery when you are ready.",
      boundary: "No message was sent and the network wait was closed.",
    };
  }
  if (recovery.action === "inspect-diagnostics") {
    return {
      state: "Private delivery needs review",
      profiles: "Room is saved.",
      session: "Delivery network setup stopped before sending.",
      message: "Review developer details before retrying private delivery.",
      boundary: "No message was sent and private details stayed hidden.",
    };
  }
  if (detailed.touchedTranscript) {
    return {
      state: "Private delivery needs review",
      profiles: "Room is saved.",
      session: "Some delivery work finished, but not all messages were confirmed.",
      message: "Review the conversation, then retry or cancel any pending message.",
      boundary: "No private details were shown in the chat view.",
    };
  }
  return {
    state: "Private delivery not ready",
    profiles: "Room is saved.",
    session: "Private delivery setup did not finish.",
    message: "Try again after the private route is ready.",
    boundary: "No private details were shown in the chat view.",
  };
}

export function productionTwoProfileRealOnionResumeProfile(result, input = {}) {
  const receiver = String(result?.receiver_profile ?? "").trim();
  if (receiver) {
    return receiver;
  }
  return String(input?.profileB ?? "").trim();
}

export function chatNoticeForSendReceiveText(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }
  const lower = text.toLowerCase();
  if (
    lower.includes("phrase is different") ||
    lower.includes("verification mismatch") ||
    text.includes("문구가 다르")
  ) {
    return { key: "chatNoticeVerificationMismatch", tone: "danger" };
  }
  if (
    lower.includes("verification confirmed") ||
    lower.includes("write your first message") ||
    text.includes("확인이 끝났") ||
    text.includes("첫 메시지를 작성")
  ) {
    return { key: "messageInputUnlocked", tone: "success" };
  }
  if (
    lower.includes("locked") ||
    lower.includes("verify") ||
    lower.includes("verification required") ||
    text.includes("확인 문구") ||
    text.includes("잠긴")
  ) {
    return { key: "sendLockedUntilVerified", tone: "warning" };
  }
  if (lower.includes("canceled") || lower.includes("cancelled") || text.includes("취소")) {
    return { key: "sendCanceledNotice", tone: "muted" };
  }
  if (
    lower.includes("peer offline") ||
    lower.includes("peer is offline") ||
    lower.includes("connection refused") ||
    text.includes("상대가 오프라인")
  ) {
    return { key: "peerOffline", tone: "warning" };
  }
  if (
    lower.includes("endpoint update") ||
    lower.includes("peer address updated") ||
    text.includes("상대 주소가 갱신")
  ) {
    return { key: "chatNoticeEndpointUpdated", tone: "success" };
  }
  if (
    lower.includes("network permission") ||
    lower.includes("manual onion network permission") ||
    text.includes("네트워크 권한")
  ) {
    return { key: "chatNoticeNetworkPermission", tone: "warning" };
  }
  if (
    lower.includes("bootstrap") ||
    lower.includes("tor restart") ||
    lower.includes("persistentclientnotready")
  ) {
    return { key: "retryNetwork", tone: "warning" };
  }
  if (
    lower.includes("private route") ||
    text.includes("비공개 경로")
  ) {
    return { key: "torBootstrap", tone: "warning" };
  }
  if (
    lower.includes("peer onion address is not ready") ||
    lower.includes("stale endpoint") ||
    lower.includes("refresh") ||
    lower.includes("endpoint") ||
    text.includes("주소")
  ) {
    return { key: "chatNoticeRefreshAddress", tone: "warning" };
  }
  if (lower.includes("timeout") || text.includes("시간 초과")) {
    return { key: "sendTimeout", tone: "warning" };
  }
  if (
    lower.includes("retrying send") ||
    lower.includes("attempting onion delivery") ||
    lower.includes("send running") ||
    lower.includes("sending") ||
    text.includes("전송 다시 시도") ||
    text.includes("전송을 시도") ||
    text.includes("전송 중")
  ) {
    return { key: "chatNoticeSending", tone: "progress" };
  }
  if (
    lower.includes("receive mode stopped") ||
    lower.includes("message listening stopped") ||
    lower.includes("stop receiving") ||
    lower.includes("stop listening") ||
    text.includes("수신을 중지")
  ) {
    return { key: "chatNoticeReceiveStopped", tone: "muted" };
  }
  if (
    lower.includes("receive mode enabled") ||
    lower.includes("receive mode is active") ||
    lower.includes("listening for new messages") ||
    lower.includes("waiting for messages") ||
    lower.includes("polling") ||
    lower.includes("keep this window open") ||
    text.includes("메시지 대기") ||
    text.includes("새 메시지를 기다리는 중") ||
    text.includes("수신 중")
  ) {
    return { key: "chatNoticeReceiving", tone: "success" };
  }
  if (
    lower.includes("conversation updated after import") ||
    lower.includes("imported message") ||
    lower.includes("message received") ||
    text.includes("수신됨")
  ) {
    return { key: "chatNoticeReceived", tone: "success" };
  }
  if (
    lower.includes("sent") ||
    lower.includes("delivered") ||
    lower.includes("completed") ||
    text.includes("전송됨") ||
    text.includes("전달됨")
  ) {
    return { key: "chatNoticeSent", tone: "success" };
  }
  if (lower.includes("failed") || text.includes("실패")) {
    return { key: "sendFailedGeneric", tone: "warning" };
  }
  return null;
}

export function chatNoticeForProductionState(message) {
  const lower = String(message ?? "").toLowerCase();
  if (!lower) {
    return null;
  }
  if (lower.includes("receive mode stopped") || lower.includes("message listening stopped")) {
    return { key: "chatNoticeReceiveStopped", tone: "muted" };
  }
  if (
    lower.includes("receive mode") ||
    lower.includes("listening for new messages") ||
    lower.includes("message listening will retry")
  ) {
    return lower.includes("retry")
      ? { key: "receiveRetrying", tone: "warning" }
      : { key: "chatNoticeReceiving", tone: "success" };
  }
  if (lower.includes("send") && (lower.includes("running") || lower.includes("retry"))) {
    return { key: "chatNoticeSending", tone: "progress" };
  }
  if (lower.includes("send") && lower.includes("failed")) {
    return { key: "sendFailedGeneric", tone: "warning" };
  }
  if (lower.includes("pending send canceled")) {
    return { key: "sendCanceledNotice", tone: "muted" };
  }
  if (lower.includes("conversation updated after import")) {
    return { key: "chatNoticeReceived", tone: "success" };
  }
  return null;
}

export function productionSessionStateView(result) {
  return {
    session:
      `draft=${result.session_draft_present} channel=${result.channel_id_derivable} ` +
      `role=${result.local_role_available} endpoint=${result.remote_endpoint_state_present} ` +
      `replay=${result.replay_window_present} transport=${result.session_transport_state_present} ` +
      `runtime=${result.runtime_material_reconstructable} message=${result.ready_for_message_envelope}`,
    pairingBoundary:
      `path_returned=${result.store_path_returned} passphrase_retained=${result.passphrase_retained} ` +
      `key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} ` +
      `transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
    messageBoundary:
      `session_ready=${result.ready_for_message_envelope} outbound_io=${result.outbound_envelope_io_ready} ` +
      `network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} ` +
      `runtime=${result.runtime_messaging_enabled}`,
  };
}

export function productionSessionLifecycleView(result) {
  return {
    lifecycle:
      `draft=${result.session_draft_present} endpoint=${result.remote_endpoint_state_present} ` +
      `endpoint_status=${result.remote_endpoint_status_present} replay=${result.replay_window_present} ` +
      `pending_handshake=${result.pending_handshake_state_present} ` +
      `transport=${result.session_transport_state_present} resume=${result.session_resume_ready} ` +
      `deleted=${result.session_deleted} closed=${result.session_resume_closed}`,
    boundary:
      `message_records_preserved=${result.message_records_preserved} ` +
      productionLocalLifecycleBoundaryView(result),
  };
}

export function productionTwoProfileSessionStatusView(result) {
  const bothReady = result.both_ready_for_message_envelope;
  return {
    state: bothReady ? "Both profiles message-ready" : "Two-profile session needs work",
    status:
      `${result.profile_a}: ready=${result.profile_a_ready_for_message_envelope} ` +
      `endpoint=${result.profile_a_remote_endpoint_state_present} ` +
      `transport=${result.profile_a_session_transport_state_present} ` +
      `runtime=${result.profile_a_runtime_material_reconstructable} ` +
      `outbound=${result.profile_a_outbound_envelope_io_ready} | ` +
      `${result.profile_b}: ready=${result.profile_b_ready_for_message_envelope} ` +
      `endpoint=${result.profile_b_remote_endpoint_state_present} ` +
      `transport=${result.profile_b_session_transport_state_present} ` +
      `runtime=${result.profile_b_runtime_material_reconstructable} ` +
      `outbound=${result.profile_b_outbound_envelope_io_ready}`,
    boundary:
      `path_returned=${result.store_path_returned} passphrase_retained=${result.passphrase_retained} ` +
      `key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} ` +
      `transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
  };
}

export function productionTwoProfileSessionSummaryView(result) {
  const view = productionTwoProfileSessionStatusView(result);
  const direction = `${result.profile_a ?? "profile-a"} -> ${result.profile_b ?? "profile-b"}`;
  return {
    profiles: `Existing profile stores checked: ${direction}`,
    session: `${view.state}: ${view.status}`,
    boundary: view.boundary,
  };
}

export function productionProfileMessageReadiness(profile, singleProfileState, twoProfileStatus) {
  const normalizedProfile = String(profile ?? "").trim().toLowerCase();
  if (!normalizedProfile) {
    return false;
  }
  if (twoProfileStatus?.profile_a === normalizedProfile) {
    return twoProfileStatus.profile_a_ready_for_message_envelope === true;
  }
  if (twoProfileStatus?.profile_b === normalizedProfile) {
    return twoProfileStatus.profile_b_ready_for_message_envelope === true;
  }
  return singleProfileState?.ready_for_message_envelope === true;
}

export function productionManualMessageStatusView(state) {
  const active = state?.activeProfile || "active profile";
  const counterpart = state?.counterpartProfile || "counterpart";
  const selected = state?.selectedMessageLabel || "none";
  const selectedInput = state?.selectedMessageInputMatches === false ? "stale" : "matched";
  const messageNumber = Number.isInteger(state?.messageNumber) ? state.messageNumber : "invalid";
  const numberMode = state?.autoMessageNumber ? "auto" : "manual";
  const session = state?.sessionReadyForMessages ? "ready" : "not-ready";
  const localEnvelope = state?.hasLocalMessageEnvelope ? "present" : "empty";
  const remoteSlot = state?.hasRemoteMessageEnvelopeSlot ? "ready" : "empty";
  const remoteEnvelope = state?.hasInboundEnvelopeInput ? "loaded" : "empty";
  const received = state?.hasReceivedMessage ? "present" : "empty";
  const reply = state?.hasTwoProfileReplyDraftInput
    ? "draft"
    : state?.hasTwoProfileReplySelected
      ? "selected"
      : "none";
  return (
    `selected=${selected} selected_input=${selectedInput} active=${active} remote=${counterpart} number=${messageNumber} mode=${numberMode} session=${session} ` +
    `local_envelope=${localEnvelope} remote_slot=${remoteSlot} remote_envelope=${remoteEnvelope} ` +
    `received=${received} reply=${reply}`
  );
}

export function productionManualMessageCheckView(state) {
  let check = "Manual check: verify active profile, message number, and envelope source.";
  if (!state?.counterpartProfile) {
    check = "Manual check: select Alice or Bob before using stored remote payloads.";
  } else if (!Number.isInteger(state?.messageNumber)) {
    check = "Manual check: enter the message number before export or import.";
  } else if (state?.selectedMessageInputMatches === false) {
    check = "Manual check: selected message and manual number/body differ; reselect the row before export or import.";
  } else if (state?.hasTwoProfileReplyDraftInput) {
    check = "Manual check: reply draft is ready; send the stored-session reply.";
  } else if (state?.hasImportedMessage && !state?.hasReceivedMessage) {
    check = "Manual check: imported envelope is decrypted; click Show plaintext before writing the reply.";
  } else if (state?.hasTwoProfileReplySelected) {
    check = "Manual check: reply target is selected; write the reply or show plaintext for local review.";
  } else if (state?.hasInboundEnvelopeInput && !state?.hasRemoteMessageEnvelopeSlot) {
    check = "Manual check: pasted envelope is not from the stored remote slot; verify source.";
  } else if (state?.hasLocalMessageEnvelope && !state?.hasRemoteMessageEnvelopeSlot) {
    check = "Manual check: store the local envelope before switching profile.";
  } else if (state?.hasRemoteMessageEnvelopeSlot && !state?.hasInboundEnvelopeInput) {
    check = "Manual check: load the remote envelope manually before import.";
  }
  return check;
}

export function productionHandshakePayloadView(result) {
  return {
    state:
      `role=${result.role_allowed} input_read=${result.input_payload_read} ` +
      `input_decodable=${result.input_payload_decodable} output=${result.output_payload_created} ` +
      `state=${result.state_written} transport=${result.transport_state_persisted}`,
    boundary:
      `key_material=${result.key_material_exposed} network_io=${result.network_io_attempted} ` +
      `transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
  };
}

export function productionHandshakeFinishImportView(result) {
  return {
    state:
      `role=${result.role_allowed} finish_read=${result.finish_payload_read} ` +
      `decodable=${result.finish_payload_decodable} remote_static=${result.remote_static_verified} ` +
      `transport=${result.transport_state_persisted}`,
    boundary:
      `payloads_returned=${result.payloads_returned} key_material=${result.key_material_exposed} ` +
      `network_io=${result.network_io_attempted} transport_io=${result.transport_io_opened} ` +
      `runtime=${result.runtime_messaging_enabled}`,
  };
}

export function productionMessageEnvelopeExportView(result) {
  return {
    outbound:
      `number=${result.selected_message_number} auto=${result.auto_message_number} ` +
      `ttl=${result.message_ttl_seconds ?? "unknown"} ` +
      `counter=${result.auto_counter_written} skipped=${result.existing_message_slot_skipped} ` +
      `expired_purged=${result.expired_outbound_messages_purged ?? 0} ` +
      `reserved=${result.message_number_reserved} pending=${result.pending_message_record_written} ` +
      `indexed=${result.local_message_index_written} transport=${result.session_transport_ready} ` +
      `encrypted=${result.encrypted_envelope_written} export=${result.encrypted_envelope_present}`,
    boundary:
      `plaintext_returned=${result.plaintext_returned} key_material=${result.key_material_exposed} ` +
      `network_send=${result.network_send_attempted} transport_io=${result.transport_io_opened} ` +
      `runtime=${result.runtime_messaging_enabled}`,
  };
}

export function productionMessageEnvelopeImportView(result) {
  return {
    inbound:
      `read=${result.envelope_read} decodable=${result.envelope_decodable} ` +
      `transport=${result.session_transport_ready} replay=${result.replay_accepted} ` +
      `decrypted=${result.plaintext_decrypted} stored=${result.received_message_written} ` +
      `expired_purged=${result.expired_received_message_purged === true} ` +
      `status=${result.received_message_matches_session}`,
    boundary:
      `plaintext_returned=${result.plaintext_returned} key_material=${result.key_material_exposed} ` +
      `network_receive=${result.network_receive_attempted} transport_io=${result.transport_io_opened} ` +
      `runtime=${result.runtime_messaging_enabled}`,
  };
}

export function productionReceivedMessageExportView(result) {
  return {
    inbound:
      `present=${result.received_message_record_present} ` +
      `decodable=${result.received_message_record_decodable} ` +
      `session=${result.received_message_matches_session} ` +
      `expired_purged=${result.expired_received_message_purged === true} ` +
      `ttl=${result.message_ttl_seconds ?? "unknown"} ` +
      `expires=${result.expires_at_ms ?? "none"} ` +
      `expired=${result.expired === true} ` +
      `displayed=${result.plaintext_returned_after_unlock}`,
    boundary:
      `plaintext_after_unlock=${result.plaintext_returned_after_unlock} ` +
      `key_material=${result.key_material_exposed} network_receive=${result.network_receive_attempted} ` +
      `transport_io=${result.transport_io_opened} runtime=${result.runtime_messaging_enabled}`,
  };
}
