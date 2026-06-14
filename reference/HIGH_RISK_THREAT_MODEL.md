# High-Risk Threat Model

This file is the public source matrix for High-Risk Mode claims. It is not an
audit result, not a state-actor-safe claim, and not permission for sensitive
communication.

Claim rule: public copy may use only `protected` or `mitigated` entries as
implemented targets. `not_protected` entries must stay visible wherever
High-Risk Mode is described.

| Attacker class | Status | Reason |
| --- | --- | --- |
| `remote_passive_observer` | `mitigated` | Encrypted manual envelopes and explicit network delivery reduce content exposure, but metadata and global correlation are not fully hidden. |
| `remote_active_attacker` | `mitigated` | Pairing, envelope, replay, and transport boundaries fail closed, but this is not an audited active-attack proof. |
| `malicious_peer` | `mitigated` | Signed invites, safety checks, duplicate handling, and malformed payload rejection reduce false-safe states. |
| `local_at_rest_attacker` | `mitigated` | Passphrase-first encrypted local storage is required, but unlocked or compromised endpoints are outside the claim. |
| `supply_chain_update_attacker` | `mitigated` | Manual same-release checksum, provenance, and advisory paths reduce update risk without claiming audited supply-chain security. |
| `compromised_endpoint` | `not_protected` | Malware or full device compromise can observe plaintext, keys, UI, and user actions outside the app boundary. |
| `direct_coercion` | `not_protected` | The app cannot prevent forced disclosure or forced action; later panic controls are mitigation only. |
| `global_traffic_correlation` | `not_protected` | Metadata minimization can reduce exposure, but full global traffic-correlation defense is not claimed. |

Machine-readable boundary:

```text
high_risk_matrix=remote_passive_observer:mitigated,remote_active_attacker:mitigated,malicious_peer:mitigated,local_at_rest_attacker:mitigated,supply_chain_update_attacker:mitigated,compromised_endpoint:not_protected,direct_coercion:not_protected,global_traffic_correlation:not_protected
claimable_statuses=protected,mitigated
not_protected=compromised_endpoint,direct_coercion,global_traffic_correlation
readiness_condition_set=safety-verification#high-risk-transport-runtime#emergency-controls#clipboard-expiry#local-storage-evidence#release-integrity
audited_security_claim=false
full_censorship_resistance_claim=false
briar_cwtch_equivalence_claim=false
compromised_endpoint_safe_claim=false
coercion_safe_claim=false
full_global_traffic_correlation_safe_claim=false
reliable_external_onion_delivery_claim=false
```

High-Risk Mode readiness must expose unmet local/source conditions with this
same vocabulary:

- `safety-verification`
- `high-risk-transport-runtime`
- `emergency-controls`
- `clipboard-expiry`
- `local-storage-evidence`
- `release-integrity`

Missing conditions are actionable status, not public permission to claim
High-Risk readiness.
