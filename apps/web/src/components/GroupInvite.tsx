import { useState } from "react";
import type { Contact } from "../lib/daemon-bridge";

interface Props {
  contacts: Contact[];
  selected: string;
  busy?: boolean;
  onInvite: (accountIds: string[]) => void;
}

export function GroupInvite({ contacts, selected, busy, onInvite }: Props) {
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
    </section>
  );
}
