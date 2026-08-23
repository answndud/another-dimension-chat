import { useState } from "react";
import type { Contact } from "../lib/daemon-bridge";

interface Props {
  contacts: Contact[];
  selected: string;
  busy?: boolean;
  onInvite: (accountIds: string[]) => void;
  onRemoveMember?: (conversationId: string, deviceCredential: string) => void;
}

export function GroupInvite({ contacts, selected, busy, onInvite, onRemoveMember }: Props) {
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const toggle = (accountId: string) => {
    setSelectedMembers((current) =>
      current.includes(accountId)
        ? current.filter((id) => id !== accountId)
        : [...current, accountId]
    );
  };

  return (
    <section className="panel group-invite">
      <h2>그룹 초대</h2>
      {contacts.filter((contact) => contact.account_id !== selected).length === 0 ? (
        <p className="field-note">추가할 연결된 연락처가 없습니다.</p>
      ) : (
        <div className="group-member-list">
          {contacts
            .filter((contact) => contact.account_id !== selected)
            .map((contact) => (
              <label key={contact.account_id} className="group-member">
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(contact.account_id)}
                  onChange={() => toggle(contact.account_id)}
                  disabled={!contact.conversation_id || busy}
                />
                <span>{contact.alias || contact.account_id}</span>
              </label>
            ))}
        </div>
      )}
      <button
        type="button"
        disabled={selectedMembers.length === 0 || busy}
        onClick={() => {
          onInvite(selectedMembers);
          setSelectedMembers([]);
        }}
      >
        그룹에 추가
      </button>
      {onRemoveMember && selected && (
        <div style={{ marginTop: "12px", borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: "10px" }}>
          <p style={{ fontSize: ".78rem", fontWeight: 600, margin: "0 0 6px" }}>그룹 멤버 제거</p>
          {contacts
            .filter((c) => c.account_id !== selected && c.conversation_id)
            .map((contact) => (
              <button
                key={contact.account_id}
                type="button"
                className="danger"
                style={{ width: "100%", fontSize: ".75rem", padding: "4px 8px", marginBottom: "4px" }}
                disabled={busy}
                onClick={() => {
                  if (contact.conversation_id) {
                    onRemoveMember(contact.conversation_id, contact.account_id);
                  }
                }}
              >
                {contact.alias || contact.account_id.slice(0, 16)} 제거
              </button>
            ))}
        </div>
      )}
    </section>
  );
}
