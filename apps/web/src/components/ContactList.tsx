import type { Contact } from "../lib/daemon-bridge";
import { useState } from "react";

interface Props {
  contacts: Contact[];
  selectedContact: string;
  onSelect: (accountId: string) => void;
  onBlock?: (accountId: string) => void;
  onUnblock?: (accountId: string) => void;
}

export function ContactList({ contacts, selectedContact, onSelect, onBlock, onUnblock }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aliasInput, setAliasInput] = useState("");
  const blocked = contacts.filter((c) => c.state === "blocked");
  const active = contacts.filter((c) => c.state !== "blocked");
  return (
    <section className="daemon-directory">
      <div className="row-between">
        <div>
          <h2>연락처</h2>
          <p className="field-note">연락처와 별칭은 이 기기의 암호화 저장소에만 보관됩니다.</p>
        </div>
        <span className="pill">{contacts.length}명</span>
      </div>
      <div className="daemon-contact-list">
        {active.length === 0 ? (
          <p className="field-note">아직 연결된 대화 상대가 없습니다.</p>
        ) : (
          <>
          {active.map((contact) => (
            <div key={contact.account_id} style={{ display: "flex", flexDirection: "column", gap: "2px", marginBottom: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <button
                  type="button"
                  className={`daemon-contact-item${selectedContact === contact.account_id ? " active" : ""}`}
                  style={{ flex: 1, textAlign: "left" }}
                  onClick={() => onSelect(contact.account_id)}
                >
                  <strong>{contact.alias || contact.account_id.slice(0, 18)}</strong>
                  <span style={{ fontSize: ".7rem" }}>{contact.state}</span>
                </button>
                {onBlock && (
                  <button type="button" className="danger" style={{ fontSize: ".68rem", padding: "3px 6px" }}
                    onClick={() => onBlock(contact.account_id)}>
                    차단
                  </button>
                )}
              </div>
              {editingId === contact.account_id ? (
                <input
                  autoFocus
                  value={aliasInput}
                  placeholder="별칭 입력"
                  onChange={(e) => setAliasInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { setEditingId(null); }}}
                  onBlur={() => setEditingId(null)}
                  style={{ fontSize: ".72rem", padding: "2px 6px", borderRadius: "4px" }}
                />
              ) : (
                <button type="button" onClick={() => { setEditingId(contact.account_id); setAliasInput(contact.alias || ""); }}
                  style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: ".68rem", textAlign: "left", padding: "0 4px" }}>
                  ✏️ 별칭 편집
                </button>
              )}
            </div>
          ))}
          {blocked.length > 0 && (
            <details style={{ marginTop: "8px" }}>
              <summary style={{ fontSize: ".75rem", color: "var(--muted)", cursor: "pointer" }}>차단된 연락처 ({blocked.length})</summary>
              {blocked.map((c) => (
                <div key={c.account_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                  <span style={{ fontSize: ".75rem" }}>{c.alias || c.account_id.slice(0, 18)}</span>
                  {onUnblock && (
                    <button type="button" className="secondary" style={{ fontSize: ".68rem", padding: "2px 6px" }}
                      onClick={() => onUnblock(c.account_id)}>차단 해제</button>
                  )}
                </div>
              ))}
            </details>
          )}
          </>
        )}
      </div>
    </section>
  );
}
