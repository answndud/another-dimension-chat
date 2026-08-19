# 내부 품질 게이트

이 문서는 현재 source revision을 내부적으로 평가하는 짧은 기준표다. 통과는
기능 회귀가 없다는 뜻이지 독립 보안 감사나 고위험 사용 승인을 뜻하지 않는다.

## 실행 순서

```sh
export CARGO_BUILD_JOBS=2
export CARGO_INCREMENTAL=0
scripts/verify_light.sh
scripts/verify_full.sh --release
```

`verify_light.sh`는 Rust workspace check와 Rust 정적 web build를 확인한다.
`verify_full.sh --release`는 release 바이너리, shell launcher, 두 daemon의
초대·안전 번호·MLS 연결·양방향 메시지·첨부파일·relay 중복 재시도·재시작
보존을 하나의 loopback smoke로 확인한다. 장시간 전체 테스트를 기본 게이트로
사용하지 않는다.

## 내부 점수 조건

| 영역 | 내부 10점 조건 | 현재 증거 |
| --- | --- | --- |
| 기술 기능 | pairing부터 양방향 메시지·첨부파일·재시작 후 보존까지 smoke 통과 | `scripts/smoke_p0.sh` |
| 코드·설계 보안 | loopback bridge 인증, fail-closed 저장소/MLS/device, bounded relay, Node 없는 release 경로 | source + `verify_full.sh --release` |
| 사용성 | 실행·잠금·초대·안전번호·전송 실패·복구·삭제에 다음 행동과 위험 설명 표시 | UI source + in-app browser 확인 |

다음 중 하나라도 없으면 내부 10점으로 판정하지 않는다.

- smoke가 사용하는 동일 release 바이너리와 현재 web asset이 아님
- bridge 세션·Origin·CSRF·UI version 검사가 우회됨
- relay 상태·본문·queue·invite·blob 상한이 사라짐
- UI 오류에 사용자가 선택할 다음 행동이 없음
- release archive에 Node runtime, `node_modules`, debug target, private key가 포함됨

## 외부 증거와 분리되는 항목

독립 암호 구현 감사, 운영 signing key의 오프라인 다자 승인과 실제 교체 훈련,
깨끗한 Apple Silicon macOS·정확한 Chromium에서의 외부 사용자 여정은 이 게이트가
생성하지 않는다. 그 증거가 없으면 `high-risk-disabled`를 유지한다.
