import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { DaemonBridge } from "../lib/daemon-bridge";

interface Props {
  bridge: DaemonBridge | null;
  busy: boolean;
}

export function DeviceLinkPanel({ bridge, busy }: Props) {
  const [requestString, setRequestString] = useState("");
  const [linkCode, setLinkCode] = useState("");
  const [approvalString, setApprovalString] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"idle" | "show-qr" | "enter-approval">("idle");

  // This device generates a link request (new device side)
  const generateLinkRequest = async () => {
    if (!bridge) return;
    setError("");
    try {
      const result = await bridge.deviceLinkRequest();
      setRequestString(result.request);
      setLinkCode(result.code);
      setStep("show-qr");
    } catch (e) {
      setError(e instanceof Error ? e.message : "링크 요청 생성 실패");
    }
  };

  // This device approves a link request (existing device side)
  const approveLinkRequest = async () => {
    if (!bridge || !requestString.trim() || !linkCode.trim()) return;
    setError("");
    try {
      const result = await bridge.deviceLinkApprove(requestString.trim(), linkCode.trim());
      setApprovalString(result.approval);
      setStep("enter-approval");
    } catch (e) {
      setError(e instanceof Error ? e.message : "승인 실패");
    }
  };

  return (
    <section className="panel" style={{ flex: 1 }}>
      <h2>기기 연결</h2>
      <p className="field-note">
        새 기기를 기존 계정에 연결합니다. QR 코드를 스캔하거나 코드를 복사해 전달하세요.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
        <button
          type="button"
          className="primary"
          disabled={busy || !bridge}
          onClick={() => { void generateLinkRequest(); }}
        >
          📱 새 기기 링크 요청 생성
        </button>

        {step === "show-qr" && requestString && (
          <div style={{ textAlign: "center", padding: "12px", background: "white", borderRadius: "8px" }}>
            <QRCodeSVG value={requestString} size={200} />
            <p className="field-note" style={{ color: "#333", marginTop: "8px" }}>
              기존 기기에서 이 QR 코드를 스캔하거나 아래 코드를 입력하세요.
            </p>
            <textarea readOnly rows={2} value={requestString} style={{ width: "100%", fontSize: ".7rem", fontFamily: "monospace", color: "#333" }} />
            <p style={{ fontSize: ".78rem", color: "#333" }}>연결 코드: <strong>{linkCode}</strong></p>
          </div>
        )}

        <details>
          <summary style={{ cursor: "pointer", fontSize: ".85rem" }}>기존 기기로 승인하기</summary>
          <label style={{ display: "block", marginTop: "8px" }}>
            새 기기의 링크 요청:
            <textarea
              rows={2}
              value={requestString}
              onChange={(e) => setRequestString(e.target.value)}
              placeholder="ADDLINKREQ1..."
              style={{ width: "100%", fontSize: ".72rem", fontFamily: "monospace" }}
            />
          </label>
          <label style={{ display: "block", marginTop: "6px" }}>
            연결 코드:
            <input
              value={linkCode}
              onChange={(e) => setLinkCode(e.target.value)}
              placeholder="ABCD-EFGH-..."
              style={{ width: "100%", fontSize: ".78rem" }}
            />
          </label>
          <button
            type="button"
            className="secondary"
            style={{ width: "100%", marginTop: "6px" }}
            disabled={!requestString.trim() || !linkCode.trim() || busy}
            onClick={() => { void approveLinkRequest(); }}
          >
            기기 연결 승인
          </button>
        </details>

        {step === "enter-approval" && approvalString && (
          <div style={{ padding: "10px", background: "rgba(0,255,0,.1)", borderRadius: "8px" }}>
            <p style={{ fontSize: ".82rem", fontWeight: 600, margin: "0 0 6px" }}>✅ 승인 완료!</p>
            <p style={{ fontSize: ".75rem", margin: "0 0 6px" }}>아래 승인 코드를 새 기기에 붙여넣으세요:</p>
            <textarea readOnly rows={3} value={approvalString} style={{ width: "100%", fontSize: ".7rem", fontFamily: "monospace" }} />
          </div>
        )}

        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </section>
  );
}
