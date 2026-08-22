import { useState, useCallback } from "react";
import type { DaemonBridge } from "../lib/daemon-bridge";

interface Props {
  bridge: DaemonBridge | null;
  busy: boolean;
  error: string;
  notice: string;
}

export function Setup({ bridge, busy, error, notice }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [localBusy, setLocalBusy] = useState(false);
  const [setupError, setSetupError] = useState("");

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bridge || !displayName.trim()) return;
    setLocalBusy(true);
    setSetupError("");
    try {
      await bridge.setupProfile(displayName.trim());
      window.location.reload();
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : "프로필 생성 실패");
    } finally {
      setLocalBusy(false);
    }
  }, [bridge, displayName]);

  return (
    <main className="daemon-gate daemon-setup" aria-labelledby="daemon-setup-title" aria-busy={busy || localBusy}>
      <div className="daemon-gate-mark" aria-hidden="true">⊡</div>
      <p className="eyebrow">ANOTHER DIMENSION</p>
      <h1 id="daemon-setup-title">처음 설정</h1>
      <p className="lede">
        이 기기에서 사용할 보안 프로필을 준비합니다. 표시 이름을 정하고 복구 파일을 저장하면 채팅을 시작할 수 있습니다.
      </p>
      <div className="notice" role="status">{notice || "계정은 이 기기에만 만들어집니다."}</div>
      <form onSubmit={handleSubmit} className="daemon-setup-form">
        <label>
          표시 이름
          <input
            maxLength={80}
            autoComplete="nickname"
            placeholder="예: Alice"
            required
            disabled={busy || localBusy}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </label>
        <button type="submit" className="primary" disabled={busy || localBusy}>
          {busy || localBusy ? "계정 준비 중…" : "내 계정 만들기"}
        </button>
      </form>
      <p className="field-note">암호화 키와 메시지는 이 기기의 보안 서비스가 관리합니다.</p>
      {(error || setupError) && <p className="error" role="alert">{error || setupError}</p>}
    </main>
  );
}
