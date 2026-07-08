# Glossary

이 문서는 Another Dimension Chat technical guide에서 반복해서 나오는 용어를 초보자용으로 정리한다.

## Account

서비스가 사용자를 식별하기 위해 발급하거나 관리하는 계정이다.

이 프로젝트의 v0.1 방향은 global account를 기본값으로 두지 않는다. global account가 생기면 account provider가 사용자의 존재, 접속, 복구, 정책 집행에 영향을 줄 수 있기 때문이다.

## Audit

독립적인 전문가나 팀이 설계와 구현을 검토하고 취약점을 찾는 과정이다.

테스트 통과, 코드 리뷰, AI 검토, checklist 완료는 audit와 다르다. 현재 프로젝트는 audited claim을 하지 않는다.

## Backup

데이터를 다른 위치에 복사해 복구할 수 있게 하는 기능이다.

cloud backup은 편리하지만, 누가 백업을 저장하고 복구 authority를 가지는지 문제가 생긴다. 이 프로젝트는 cloud backup을 v0.1 기본값으로 두지 않는다.

## Bridge

Tor 같은 네트워크에서 접속 차단을 우회하기 위해 사용하는 중간 연결 수단이다.

bridge config를 다룬다고 해서 censorship-resistant claim이 바로 생기지는 않는다. bridge lifecycle, 사용자 설정, 실패 복구, field evidence가 필요하다.

## Central Contact Discovery

사용자의 연락처나 식별자를 서버에 보내 상대가 서비스에 있는지 찾는 기능이다.

편리하지만, 서버가 social graph를 알 수 있다. 이 프로젝트는 v0.1 기본값에서 제외한다.

## Central Message Server

메시지를 중간에서 받아 저장하거나 전달하는 서버다.

offline delivery를 쉽게 만들 수 있지만, delivery metadata와 availability authority가 중앙에 생긴다.

## Checksum

파일이 바뀌었는지 확인하기 위한 짧은 fingerprint다.

예를 들어 `.sha256` 파일은 DMG가 release asset과 일치하는지 확인하는 데 쓸 수 있다. 하지만 checksum은 앱 내부 protocol이 안전하다는 proof가 아니다.

## Ciphertext

암호화된 데이터다.

누군가 ciphertext를 보더라도 private key나 session key 없이 원문을 읽기 어려워야 한다. 단, ciphertext의 크기, 시간, 송수신 패턴 같은 metadata가 남을 수 있다.

## Claim

프로젝트가 공개적으로 "우리는 이것을 제공한다"고 말하는 주장이다.

보안 프로젝트에서는 claim이 특히 중요하다. 구현 일부가 있다고 해서 production-ready, audited, safe for sensitive communication 같은 claim이 자동으로 열리지 않는다.

## Cloud Backup

사용자의 데이터를 cloud provider나 service server에 저장해 복구하는 기능이다.

편리하지만 backup encryption, key recovery, account recovery, server trust 문제가 생긴다. 이 프로젝트는 v0.1 기본값으로 두지 않는다.

## Contact Discovery

상대방을 찾는 기능이다.

전화번호 주소록 업로드, 이메일 검색, username 검색 등이 흔한 방식이다. 이 프로젝트는 검색 가능한 global discovery를 기본값으로 두지 않는다.

## Descriptor

onion service처럼 네트워크 endpoint를 찾기 위해 공개하거나 교환하는 설명 정보다.

descriptor가 있다고 해서 메시지가 안정적으로 전달된다는 뜻은 아니다. publication, fetch, expiry, rotation, failure handling이 필요하다.

## Dev-Insecure

개발과 테스트를 위해 의도적으로 약하게 만든 기능이나 build feature다.

이 프로젝트에서는 `dev-insecure` feature 뒤에 prototype behavior를 격리한다. 실제 커뮤니케이션에 사용하면 안 된다.

## DMG

macOS 앱 배포에 자주 쓰이는 disk image 파일 형식이다.

현재 public beta는 unsigned macOS Apple Silicon DMG로 배포된다. unsigned이므로 checksum 확인과 macOS 차단 해제 절차가 필요하다.

## E2EE

End-to-end encryption의 줄임말이다. 보내는 쪽과 받는 쪽만 내용을 읽을 수 있게 하는 암호화 방식이다.

하지만 E2EE가 있다고 해서 metadata, identity, device compromise, malicious contact, traffic correlation, backup leak, release compromise 문제가 모두 사라지는 것은 아니다.

## Envelope

메시지를 담는 포장 단위다.

이 프로젝트에서는 message number, channel, type, padded ciphertext 같은 정보를 가진 envelope를 사용한다. 원문 메시지 자체를 그대로 운반하지 않고, protocol이 처리할 수 있는 형식으로 감싼다.

## Fail-Closed

조건이 불충분하면 위험한 행동을 하지 않고 멈추는 방식이다.

예를 들어 network permission이나 preflight가 준비되지 않았으면 onion/Tor path가 조용히 fallback하거나 임의로 네트워크를 열지 않고 실패해야 한다.

## Global Account

어디서나 검색/로그인/복구할 수 있는 전역 계정이다.

편리하지만 account authority, recovery flow, global identity correlation 문제가 생긴다.

## Identity

상대가 누구인지 식별하는 개념이다.

보안 메신저에서 identity는 username보다 깊다. 어떤 key가 어떤 사람과 연결되는지, 그 연결을 사용자가 어떻게 확인하는지가 중요하다.

## Invite Code

상대와 pairing을 시작하기 위해 전달하는 초대 정보다.

invite code는 공개 issue나 log에 올리면 안 된다. pairing payload, endpoint, safety material과 연결될 수 있기 때문이다.

## Key Material

private key, seed, passphrase-derived key, session key처럼 암호화나 서명에 직접 영향을 주는 민감한 재료다.

절대 public issue, log, screenshot, 문서 예시에 넣으면 안 된다.

## Metadata

메시지 내용 자체가 아니라 메시지를 둘러싼 정보다.

예: 누가 누구와 대화하는지, 언제 접속했는지, 메시지 크기, delivery 시점, IP/network pattern, contact graph.

E2EE가 있어도 metadata는 남을 수 있다.

## Non-Claim

아직 제공하지 않는다고 명확히 말하는 것이다.

이 프로젝트는 not audited, not production-ready, sensitive communication prohibited 같은 non-claim을 유지한다.

## Nonce

한 번만 쓰이도록 만든 값이다.

nonce는 replay나 중복을 줄이고, payload freshness를 표현하는 데 쓰인다. nonce 자체가 모든 replay 문제를 해결하는 것은 아니며, protocol state와 함께 봐야 한다.

## Onion Service

Tor network에서 `.onion` endpoint로 접근할 수 있는 서비스다.

onion service를 쓰면 일부 network metadata가 줄어들 수 있지만, reliable delivery나 censorship resistance가 자동으로 보장되지는 않는다.

## Padding

데이터 크기를 숨기거나 맞추기 위해 더미 bytes를 붙이는 방식이다.

padding은 message length leak을 줄이는 데 도움을 줄 수 있지만, 모든 traffic analysis를 막는 것은 아니다.

## Pairing

두 사용자가 서로를 연결하고, 앞으로 사용할 identity/key/session material을 맞추는 과정이다.

pairing은 "상대 추가" 버튼보다 깊다. 정말 그 상대인지 확인할 safety material이 필요하다.

## Passphrase

사용자가 기억하거나 입력하는 비밀 문구다.

local encrypted storage unlock에 쓸 수 있다. passphrase는 public report나 screenshot에 들어가면 안 된다.

## Private Key

소유자만 가지고 있어야 하는 key다.

private key가 유출되면 signature나 decrypt boundary가 깨질 수 있다. public issue, logs, docs에 절대 넣으면 안 된다.

## Public Key

상대에게 공개할 수 있는 key다.

public key는 signature 검증이나 key agreement에 쓰일 수 있다. 하지만 public key가 누구의 것인지 확인하는 절차가 필요하다.

## Replay Attack

공격자가 과거에 봤던 메시지를 다시 보내는 공격이다.

메시지가 암호화되어 있어도 같은 ciphertext나 message number를 다시 보내면 receiver가 혼란을 겪을 수 있다. replay window가 필요하다.

## Replay Window

최근에 본 message number를 기억해 duplicate나 너무 오래된 메시지를 거부하는 구조다.

중요한 점은 decrypt/validation 성공 전에는 replay state를 확정하지 않는 것이다.

## Safety Material

사용자가 상대와 직접 비교할 수 있는 safety number, phrase, transcript 같은 확인 자료다.

이 자료는 상대가 정말 같은 key/session을 보고 있는지 확인하는 UX와 연결된다.

## Signature

private key로 만든 증명이며, public key로 검증할 수 있다.

signature는 "이 payload가 해당 private key 소유자에 의해 만들어졌다"는 근거를 준다. 하지만 그 key가 실제 사람과 연결되는지는 별도 safety verification 문제다.

## SQLCipher

SQLite database를 암호화하는 데 쓰이는 기술이다.

이 프로젝트에서는 local encrypted storage boundary 설명에 등장한다. SQLCipher가 있다고 해서 rollback prevention, cloud recovery, secure deletion from media가 자동으로 제공되는 것은 아니다.

## Tauri

Rust backend와 web frontend를 조합해 desktop app을 만드는 framework다.

이 프로젝트에서는 Tauri shell이 user interaction을 담당하고, security-sensitive meaning은 Rust core가 소유한다.

## Threat Model

어떤 공격자를 고려하고, 무엇을 보호하고, 무엇은 보호하지 않는지 정리한 문서다.

threat model이 없으면 "안전하다"는 말이 너무 넓어진다.

## Transport

메시지를 한쪽에서 다른 쪽으로 옮기는 방식이다.

manual envelope exchange, file share, LAN, Tor/onion, relay server 등 다양한 transport가 가능하다. transport choice는 metadata와 reliability claim에 직접 영향을 준다.
