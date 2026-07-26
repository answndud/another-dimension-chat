# Support

Another Dimension Chat is a web-first experimental prototype. It is not
audited, not production-ready, and sensitive communication is prohibited.
Each user may run the local server on their own device; local development uses
the Vite web runtime or the bundled static server. The old macOS DMG is a
legacy artifact, not the primary product path.

## Public support

Keep reports redacted and limited to:

- app version or commit
- browser and platform
- broad failure class
- recovery action reached
- whether the local web build loaded
- whether the local server health endpoint loaded
- whether the peer endpoint was loopback, LAN, VPN, or reverse-proxy HTTPS
- whether `scripts/check_https_endpoint.mjs` passed, without including its URL

Never post invite codes, sealed envelopes, message text, safety phrases,
profile names, passphrases, private keys, browser storage exports, raw logs,
local paths, crash dumps, private local UI URLs, or screenshots of private rooms.

한국어 요약: 초대·봉투·안전 문구·프로필 이름·암호 문구·개인키·브라우저 백업·원본
로그·private UI 주소는 절대 공개하지 마세요. 지원 문의에는 버전, 운영체제·브라우저,
일반적인 오류 종류와 마지막으로 성공한 복구 단계만 적습니다.

## Recovery boundary

- If the peer server is unreachable, use the prepared outgoing envelope in the
  manual copy/paste flow; a failed automatic send is not recorded as delivered.
- After a server restart or endpoint change, create and exchange a fresh signed
  invite. Existing queued envelopes remain available only when the same data
  directory is retained.
- If an inbox capability is exposed, stop the server and start with a new data
  directory. Retain the old queue privately only as long as recovery requires.

## Incident response order

1. Stop the local server and do not reopen the private UI URL.
2. If an invite or capability may have leaked, move the old data directory aside
   and start a new one; do not publish the old queue or logs.
3. Treat a changed release hash, signing key fingerprint, browser bundle, or
   safety phrase as a stop condition. Do not send a message until a separately
   verified release and fresh pairing are available.
4. For a lost device, assume its unlocked browser profile and local data are
   compromised. Rotate invites and pair again from a clean device; a wipe button
   cannot prove secure deletion from a hostile operating system.
5. Report only redacted facts through the private security channel.

## Security reports

Use GitHub private vulnerability reporting when available. If it is
unavailable, publish only a minimal redacted request for a private contact
path. Do not include exploit details or sensitive material in a public issue.

## Legacy macOS artifacts

The repository contains historical macOS installation notes and release
artifacts. They are not the current product distribution route and do not
represent web hosting, production readiness, or a security guarantee.
