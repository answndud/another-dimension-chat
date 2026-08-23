import { useState } from "react";

interface Props {
  invite: { invite_code: string } | null;
  busy: boolean;
  hasContacts: boolean;
  onCreateInvite: () => void;
  onConsumeInvite: (code: string) => void;
}

export function InvitePanel({ invite, busy, hasContacts, onCreateInvite, onConsumeInvite }: Props) {
  const [inputCode, setInputCode] = useState("");
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!invite) return;
    navigator.clipboard.writeText(invite.invite_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <section className="panel invite-panel" style={{ padding: "14px" }}>
      <h3 style={{ margin: "0 0 10px", fontSize: ".9rem" }}>새 연결</h3>

      <button
        type="button"
        className="primary"
        style={{ width: "100%", marginBottom: "12px" }}
        disabled={busy}
        onClick={onCreateInvite}
      >
        {busy ? "생성 중…" : "초대 코드 만들기"}
      </button>

      {invite && (
        <div style={{ marginBottom: "12px" }}>
          <textarea
            readOnly
            rows={2}
            value={invite.invite_code}
            style={{ width: "100%", fontSize: ".75rem", fontFamily: "monospace" }}
          />
          <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
            <button type="button" className="secondary" style={{ flex: 1, fontSize: ".78rem" }} onClick={copy}>
              {copied ? "✓ 복사됨" : "📋 복사"}
            </button>
          </div>
          <p className="field-note" style={{ fontSize: ".72rem", marginTop: "4px" }}>
            전화나 대면으로 전달하세요. 10분 후 만료됩니다.
          </p>
        </div>
      )}

      {!hasContacts && (
        <>
          <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", margin: "8px 0", paddingTop: "10px" }}>
            <p style={{ margin: "0 0 8px", fontSize: ".8rem", fontWeight: 600 }}>초대 코드로 연결</p>
            <textarea
              rows={2}
              placeholder="받은 초대 코드를 붙여넣으세요"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              style={{ width: "100%", fontSize: ".75rem", fontFamily: "monospace" }}
            />
            <button
              type="button"
              className="secondary"
              style={{ width: "100%", marginTop: "6px", fontSize: ".78rem" }}
              disabled={!inputCode.trim() || busy}
              onClick={() => { onConsumeInvite(inputCode); setInputCode(""); }}
            >
              초대 참여하기
            </button>
          </div>
        </>
      )}
    </section>
  );
}
