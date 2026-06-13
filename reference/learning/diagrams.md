# Diagrams

이 문서는 technical guide에서 반복해서 사용할 수 있는 Mermaid diagram 모음이다.

## 1. 전체 개념 지도

```mermaid
flowchart TD
  UserA["User A"] --> ProfileA["Local profile"]
  UserB["User B"] --> ProfileB["Local profile"]
  ProfileA --> Pairing["Pairing payload and safety material"]
  ProfileB --> Pairing
  Pairing --> Session["Pairwise session"]
  Session --> Envelope["Encrypted envelope"]
  Envelope --> Storage["Local encrypted storage"]
  Envelope --> Transport["Manual or explicit advanced transport"]
  Transport --> Import["Explicit import/receive"]
  Import --> Replay["Replay window"]
  Replay --> Conversation["Local conversation view"]
```

## 2. 중앙 신뢰와 metadata

```mermaid
flowchart LR
  Phone["Phone/email identity"] --> Server["Central service"]
  Discovery["Contact discovery"] --> Server
  Messages["Message relay/mailbox"] --> Server
  Push["Push notification"] --> Server
  Backup["Cloud backup"] --> Server
  Server --> Metadata["Metadata and authority"]
  Metadata --> Risks["Correlation, recovery, policy, availability risks"]
```

## 3. Key와 signature

```mermaid
sequenceDiagram
  participant A as Alice device
  participant B as Bob device
  A->>A: Generate private/public key pair
  A->>A: Build canonical pairing payload
  A->>A: Sign payload with private key
  A->>B: Share payload
  B->>B: Verify signature with Alice public key
  B->>B: Show safety material for human check
```

## 4. Pairing과 safety verification

```mermaid
flowchart TD
  Invite["Invite or pairing material"] --> Decode["Decode payload"]
  Decode --> Verify["Verify signature and shape"]
  Verify --> Transcript["Build safety transcript"]
  Transcript --> Compare["Users compare safety material"]
  Compare -->|match| Trust["Proceed with session"]
  Compare -->|mismatch| Stop["Stop and re-pair"]
```

## 5. Envelope와 replay

```mermaid
flowchart LR
  Plain["Plain message"] --> Encrypt["Encrypt"]
  Encrypt --> Pad["Pad to bucket"]
  Pad --> Envelope["ADENV1 envelope"]
  Envelope --> Import["Receiver imports envelope"]
  Import --> Trial["Check message number on cloned replay state"]
  Trial --> Decrypt["Decrypt and validate"]
  Decrypt -->|success| Commit["Commit replay state"]
  Decrypt -->|fail| NoCommit["Do not advance replay state"]
```

## 6. Local encrypted storage

```mermaid
flowchart TD
  Start["App starts"] --> Locked["Store locked"]
  Locked --> Passphrase["User enters passphrase"]
  Passphrase --> Unlock["Attempt SQLCipher unlock"]
  Unlock -->|success| Records["Read/write encrypted records"]
  Unlock -->|wrong passphrase| Reject["Reject without returning records"]
  Records --> Delete["Local delete actions"]
  Delete --> NonClaim["No secure deletion from media claim"]
```

## 7. Transport decision

```mermaid
flowchart TD
  Message["Encrypted envelope ready"] --> Default["Default: manual exchange"]
  Message --> Advanced["Advanced: onion/Tor path"]
  Default --> UserAction["User exports/imports explicitly"]
  Advanced --> Permission["Explicit network permission/preflight"]
  Permission -->|ready| Attempt["Bounded network attempt"]
  Permission -->|not ready| FailClosed["Fail closed"]
  Attempt --> Evidence["Needs field evidence before reliability claim"]
```

## 8. Rust core와 Tauri shell

```mermaid
flowchart LR
  UI["Tauri frontend"] --> Commands["Tauri commands"]
  Commands --> Core["crates/core"]
  Core --> Pairing["pairing"]
  Core --> Protocol["protocol"]
  Core --> Storage["storage"]
  Core --> Transport["transport"]
  Core --> Identity["identity"]
  Commands --> Status["Redacted status"]
  Status --> UI
```

## 9. Release와 claim gate

```mermaid
flowchart TD
  Build["Build artifact"] --> Checksum["Checksum/provenance"]
  Checksum --> Release["Same GitHub Release assets"]
  Release --> Install["User verifies and installs"]
  Install --> ClaimGate["Claim gate"]
  Tests["Tests/verifiers"] --> ClaimGate
  Review["External review/audit evidence"] --> ClaimGate
  Field["Field evidence"] --> ClaimGate
  ClaimGate -->|not enough evidence| NonClaim["Keep beta/non-production/non-audited wording"]
  ClaimGate -->|enough evidence| StrongerClaim["Only then consider stronger claim"]
```
