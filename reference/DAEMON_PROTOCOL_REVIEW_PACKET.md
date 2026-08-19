# daemon 1:1 protocol review packet

> **상태: 구현 전 작성된 역사적 후보 검토 기록.** 아래의 `not implemented`,
> 후보 버전 및 미완료 체크리스트는 현재 소스 상태가 아닙니다. 새 daemon/OpenMLS
> 검토 packet이 작성되기 전까지 현재 구현 증거로 사용하지 않습니다.

이 문서는 daemon에 실제 메시징 구현을 추가하기 전 승인 기준이다. 현재 daemon은
`openmls-1` admission gate만 가지고 있으며, 이 문서가 `approved`가 되기 전에는
session·prekey·message API를 열지 않는다.

## 후보

| 항목 | 현재 판단 |
| --- | --- |
| protocol | IETF MLS RFC 9420 기반 OpenMLS |
| 후보 버전 | OpenMLS `0.8.1`을 조사 기준으로 고정. 실제 Cargo lock 추가 시 exact version과 checksum을 별도 기록 |
| license | OpenMLS repository의 MIT license 확인. 의존성 전체 license 검토는 별도 gate |
| crypto provider | `openmls_libcrux_crypto 0.3.1`을 provisional candidate로 선택. production 승인 전 provider review 필요 |
| persistence | `apps/daemon/src/mls_storage.rs`의 namespace/batch 경계를 먼저 구현. OpenMLS `StorageProvider` adapter는 exact dependency 승인 후 연결 |
| group model | 1:1도 각 device를 MLS member로 취급하는 소규모 group. 다중 기기 semantics를 먼저 문서화 |
| ciphersuite 후보 | `MLS_128_DHKEMX25519_CHACHA20POLY1305_SHA256_Ed25519` (libcrux preflight 통과) |
| status | `candidate / not approved / not implemented` |

OpenMLS는 RFC 9420 구현체이며 crypto provider를 교체할 수 있는 구조다. 현재 공식 문서에
기재된 ciphersuite 중 위 X25519/AES-128-GCM/Ed25519 조합을 1차 후보로 삼는다. 이는
OpenMLS 문서가 MTI로 표시한 후보라는 뜻일 뿐, 이 제품에 대한 보안 승인이 아니다. storage는
`StorageProvider` trait을 통해 group state와 key material을 보존하도록 되어 있다. 이는
사용 가능한 API라는 뜻이지, 이 앱의 identity·device·relay·rollback composition이 검토됐다는
뜻은 아니다. [OpenMLS repository](https://github.com/openmls/openmls),
[OpenMLS storage documentation](https://docs.rs/openmls/latest/openmls/storage/index.html)

## 이번 단계에서 고정한 결정

- OpenMLS exact candidate: `0.8.1`
- first ciphersuite candidate: `MLS_128_DHKEMX25519_CHACHA20POLY1305_SHA256_Ed25519`
- daemon protocol identifier: `openmls-1`
- provisional provider: `openmls_libcrux_crypto 0.3.1`. 이 선택은 crypto provider 후보를
  좁힌 것이지 production 승인이 아니다. `openmls_rust_crypto 0.5.1`은 비교·interop fixture
  용도로만 검토한다.
- persistence: OpenMLS provider의 storage API를 직접 평문 파일에 연결하지 않고, daemon
  encrypted store의 revision/atomic transaction adapter를 별도로 작성한다.

현재 구현된 `MlsStateStore`는 `mls/v1/<group>/<item>` namespace만 허용하고 여러 protocol
state 변경을 한 encrypted store revision으로 commit한다. 이는 OpenMLS `StorageProvider`
구현이 아니며, exact OpenMLS API가 확정되기 전의 application-owned persistence boundary다.

현재 identity 경계에는 `MlsCredentialBinding`이 있다. Account Root가 서명한 device
certificate의 필드·signature와 device private-key proof를 함께 묶으며, protocol package hash,
account ID, device ID, validity window가 모두 binding payload에 포함된다. 이 값은 향후
OpenMLS credential에 넣을 application identity material이지 OpenMLS credential 자체가 아니다.

## provider 판정

공식 crate 문서상 `openmls_rust_crypto 0.5.1`의 `OpenMlsRustCrypto`와
`openmls_libcrux_crypto 0.3.1`의 `Provider` 모두 기본 `StorageProvider`가
`openmls_memory_storage::MemoryStorage`다. 따라서 어느 provider를 붙여도 기본값을 그대로
사용하면 재시작 후 MLS state가 보존되지 않으며, 이 프로젝트의 encrypted persistence 요구를
충족하지 못한다. [RustCrypto provider](https://docs.rs/openmls_rust_crypto/latest/src/openmls_rust_crypto/lib.rs.html),
[Libcrux provider](https://docs.rs/openmls_libcrux_crypto/latest/src/openmls_libcrux_crypto/lib.rs.html)

결론은 `libcrux` crypto provider + 별도 reviewed `StorageProvider` adapter 후보이며, 다음
조건 전에는 Cargo feature를 추가하지 않는다.

- custom storage adapter가 OpenMLS current storage version과 atomic revision을 모두 충족
- provider가 선택 cipher suite를 실제 target에서 지원하는지 fixture로 확인
- provider·HPKE·signature·randomness dependency의 license와 security advisory 확인
- independent crypto reviewer가 provider composition을 승인

현재 Cargo에는 OpenMLS `0.8.1`, `openmls_libcrux_crypto 0.3.1`, `openmls_traits 0.5.0`을
exact version으로 추가했고, `mls_provider::verify_candidate_provider`가 선택 ciphersuite
지원 여부를 preflight한다. provider 초기화나 ciphersuite 지원이 실패하면 RustCrypto나
memory-only fallback으로 바꾸지 않고 중단한다. 아직 OpenMLS group/session API나
StorageProvider trait 구현은 연결하지 않았다.

`mls_storage::encode_entity/decode_entity`는 OpenMLS serde Entity/Key를 4 MiB 이하로 제한해
직렬화하는 codec이다. codec만으로 저장 성공을 표시하지 않으며, 다음 adapter는 codec 결과를
반드시 `EncryptedStore::apply_batch` 한 revision에 반영해야 한다.

group-state 영역은 `GroupStateItem` enum으로 join config, own leaf nodes, tree, transcript,
context, confirmation tag, group state, message secrets, resumption PSK, own leaf index,
epoch secrets만 허용한다. 임의 OpenMLS 문자열 key는 이 경계에서 허용하지 않는다.

crypto-state 영역은 `CryptoStateItem` enum으로 signature key pair, HPKE key pair/epoch
keys, KeyPackage, PSK만 허용한다. 외부 식별자는 SHA-256으로 namespace 주소화하며, 같은
식별자라도 항목 종류별로 분리된다. secret 값은 codec 이후 encrypted batch에만 들어간다.

proposal queue는 `proposal-refs` 순서 목록과 SHA-256 주소화된 proposal 본문을 함께 관리한다.
enqueue 중복은 idempotent하며 remove/clear는 순서 목록과 본문을 같은 encrypted revision에서
갱신한다. own-leaf 누적도 codec과 encrypted batch를 통과한다.

현재 trait source의 메서드 수와 `CURRENT_VERSION=1`은
`scripts/verify_light.sh`와 Rust source review로 고정한다. adapter 구현이 이 계약을 모두
구현하기 전에는 OpenMLS provider를 daemon session에 주입하지 않는다.

## 반드시 추가로 고정할 결정

1. exact OpenMLS commit/tag와 Rust toolchain을 lock한다.
2. crypto provider를 하나만 선택하고, debug/content-debug/crypto-debug feature를
   production profile에서 금지한다.
3. Account Root Key와 device signing key가 MLS credential에 어떻게 binding되는지 고정한다.
4. KeyPackage 생성·서명·일회성 prekey reservation·소진·재충전·폐기를 state machine으로 고정한다.
5. `StorageProvider` 레코드를 daemon encrypted store의 atomic revision에 매핑한다. ratchet/group
   state 저장 실패는 message success가 아니며 memory state도 rollback 또는 reset-required로 끝낸다.
6. Welcome/Commit/Application message를 relay opaque envelope에 넣는 canonical encoding과
   replay/dedup ID를 고정한다.
7. device revoke, epoch change, fork, stale commit, old snapshot restore를 fail-closed로 정의한다.
8. OpenMLS test vector와 두 daemon deterministic fixture를 exact dependency version에 묶는다.

## 승인 전 금지

- 현재 browser `vodozemac`/Olm WASM을 daemon에서 재사용
- `crates/protocol`, `crates/core` legacy 구현을 production adapter로 승격
- OpenMLS API를 흉내 낸 자체 ratchet·KDF·AEAD·MLS 구현
- SQLite 또는 JSON 파일에 MLS state를 평문으로 저장
- protocol package가 불명확한 invite를 session으로 자동 승격
- receipt 검증 성공만으로 peer trust 또는 message authorization 부여

## 승인 체크리스트

- [ ] exact crate version, git revision, checksum, Rust toolchain 고정
- [ ] license와 transitive dependency license 확인
- [ ] provisional libcrux provider의 exact feature/dependency audit 완료
- [ ] credential-to-AccountRoot/device binding review 완료
- [ ] KeyPackage/prekey lifecycle vectors 완료
- [ ] encrypted atomic persistence와 rollback fixture 완료
- [ ] reorder/duplicate/replay/tamper/crash/restore-old-state fixture 완료
- [ ] device revoke와 epoch transition fixture 완료
- [ ] relay malicious-envelope fixture 완료
- [ ] independent crypto composition reviewer sign-off 완료

체크리스트가 모두 채워지기 전 상태는 `not approved`이며, 고위험 사용을 허용하지 않는다.
