import { useState } from "react";

interface Props {
  safetyNumber: string;
  peerAccountId: string;
  busy: boolean;
  onConfirm: (safetyNumber: string) => void;
  onReject: () => void;
}

export function PairingApproval({ safetyNumber, peerAccountId, busy, onConfirm, onReject }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const groups = safetyNumber.match(/.{1,5}/g) || [safetyNumber];

  return (
    <section className="panel pairing-approval" style={{ padding: "14px", border: "1px solid rgba(255,200,0,.3)" }}>
      <h3 style={{ margin: "0 0 8px", fontSize: ".9rem", color: "#ffc800" }}>⚠️ 안전번호 확인</h3>
      <p style={{ margin: "0 0 8px", fontSize: ".78rem", color: "var(--muted)" }}>
        {peerAccountId && <code style={{ fontSize: ".7rem" }}>{peerAccountId.slice(0, 20)}…</code>}와의 연결 요청입니다.
      </p>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "4px", margin: "10px 0",
        fontFamily: "monospace", fontSize: ".85rem", fontWeight: 700,
        justifyContent: "center", padding: "10px",
        background: "rgba(0,0,0,.3)", borderRadius: "8px",
      }}>
        {groups.map((group, i) => (
          <span key={i}>{group}</span>
        ))}
      </div>
      <p className="field-note" style={{ fontSize: ".72rem", margin: "0 0 10px" }}>
        위 번호를 전화나 대면으로 상대방과 대조하세요. 번호가 일치할 때만 승인하세요.
      </p>
      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: ".78rem", marginBottom: "10px" }}>
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
        안전번호가 일치하는 것을 확인했습니다
      </label>
      <div style={{ display: "flex", gap: "6px" }}>
        <button
          type="button"
          className="primary"
          style={{ flex: 1, fontSize: ".8rem" }}
          disabled={!confirmed || busy}
          onClick={() => onConfirm(safetyNumber)}
        >
          {busy ? "처리 중…" : "✓ 승인"}
        </button>
        <button
          type="button"
          className="danger"
          style={{ fontSize: ".8rem", padding: "6px 12px" }}
          disabled={busy}
          onClick={onReject}
        >
          거절
        </button>
      </div>
    </section>
  );
}
