import type { Contact } from "../lib/daemon-bridge";

interface Props {
  contacts: Contact[];
  selectedContact: string;
  onSelect: (accountId: string) => void;
}

export function ContactList({ contacts, selectedContact, onSelect }: Props) {
  const filtered = contacts.filter((c) => c.state !== "blocked");
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
        {filtered.length === 0 ? (
          <p className="field-note">아직 연결된 대화 상대가 없습니다.</p>
        ) : (
          filtered.map((contact) => (
            <button
              key={contact.account_id}
              type="button"
              className={`daemon-contact-item${selectedContact === contact.account_id ? " active" : ""}`}
              onClick={() => onSelect(contact.account_id)}
            >
              <strong>{contact.alias || contact.account_id.slice(0, 18)}</strong>
              <span>{contact.state}</span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
