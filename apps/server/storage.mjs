import { chmod, lstat, readFile as defaultReadFile, unlink } from "node:fs/promises";
import Database from "better-sqlite3";

/**
 * Small durable state boundary used by the relay while the SQLite adapter is
 * evaluated. The state file is never rewritten in place: a completed atomic
 * writer is the only commit point, and a valid `.tmp` file is recoverable on
 * the next startup.
 */
export async function createJsonStateStore({
  file,
  initial,
  validate,
  parse = JSON.parse,
  serialize = (value) => JSON.stringify(value),
  read = defaultReadFile,
  write,
  onCorrupt = (source) => new Error(`state_corrupt:${source}`),
}) {
  if (typeof file !== "string" || !file) throw new Error("state_file_required");
  if (typeof write !== "function") throw new Error("state_writer_required");
  const temporary = `${file}.tmp`;
  const parseState = (raw, source) => {
    let value;
    try { value = parse(raw); } catch { throw onCorrupt(source); }
    if (!validate(value)) throw new Error(`state_invalid:${source}`);
    return value;
  };
  const readRegular = async (path) => {
    const info = await lstat(path).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
    if (!info) return null;
    if (!info.isFile() || info.isSymbolicLink()) throw new Error(`state_not_regular_file:${path}`);
    return read(path, "utf8");
  };

  let raw = await readRegular(file);
  if (raw === null) {
    const recovery = await readRegular(temporary);
    if (recovery !== null) {
      const recovered = parseState(recovery, "recovery");
      await write(file, recovery);
      raw = recovery;
      return makeStore(recovered);
    }
    return makeStore(initial());
  }
  return makeStore(parseState(raw, "primary"));

  function makeStore(state) {
    let current = state;
    let chain = Promise.resolve();
    return {
      get: () => current,
      replace(next) {
        if (!validate(next)) return Promise.reject(new Error("state_invalid:next"));
        current = next;
        const snapshot = serialize(next);
        const operation = chain.then(() => write(file, snapshot));
        chain = operation.catch(() => {});
        return operation;
      },
      update(mutator) {
        const next = mutator(current);
        return this.replace(next);
      },
      flush: () => chain,
    };
  }
}

export function createSqliteStateStore({ file, key, initial, validate, serialize = (value) => JSON.stringify(value), parse = JSON.parse }) {
  if (typeof file !== "string" || !file || typeof key !== "string" || !key) throw new Error("sqlite_state_identity_required");
  const db = new Database(file);
  db.pragma("journal_mode = DELETE");
  db.pragma("synchronous = FULL");
  db.exec("CREATE TABLE IF NOT EXISTS relay_state (state_key TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at INTEGER NOT NULL)");
  const read = db.prepare("SELECT payload FROM relay_state WHERE state_key = ?").get(key);
  let current;
  if (read) {
    try { current = parse(read.payload); } catch { db.close(); throw new Error(`sqlite_state_corrupt:${key}`); }
    if (!validate(current)) { db.close(); throw new Error(`sqlite_state_invalid:${key}`); }
  } else {
    current = initial();
    if (!validate(current)) { db.close(); throw new Error(`sqlite_state_invalid:initial:${key}`); }
  }
  const upsert = db.prepare("INSERT INTO relay_state (state_key, payload, updated_at) VALUES (?, ?, ?) ON CONFLICT(state_key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at");
  const commit = db.transaction((next) => upsert.run(key, serialize(next), Date.now()));
  return {
    get: () => current,
    replace(next) {
      if (!validate(next)) throw new Error(`sqlite_state_invalid:next:${key}`);
      commit(next);
      current = next;
    },
    flush: () => {},
    close: () => db.close(),
  };
}

export async function createSqliteRelayStore({
  file,
  inboxLegacyFile,
  inviteLegacyFile,
  writeLegacy,
  beforeCommit = null,
}) {
  if (typeof file !== "string" || !file || typeof inboxLegacyFile !== "string" || typeof inviteLegacyFile !== "string") {
    throw new Error("sqlite_relay_files_required");
  }
  if (typeof writeLegacy !== "function") throw new Error("sqlite_relay_writer_required");

  const readLegacy = async (path, label) => {
    const readRegular = async (candidate) => {
      const info = await lstat(candidate).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
      if (!info) return null;
      if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Server ${label} state is not a regular file.`);
      return defaultReadFile(candidate, "utf8");
    };
    let raw = await readRegular(path);
    if (raw === null) {
      const temporary = await readRegular(`${path}.tmp`);
      if (temporary === null) return null;
      try { JSON.parse(temporary); } catch { throw new Error(`Server ${label} recovery file is corrupt.`); }
      await writeLegacy(path, temporary);
      await unlink(`${path}.tmp`).catch(() => {});
      raw = temporary;
    }
    let parsed;
    try { parsed = JSON.parse(raw); } catch { throw new Error(`Server ${label} file is corrupt; refusing to discard it.`); }
    if (!Array.isArray(parsed)) throw new Error(`Server ${label} file must contain an array.`);
    return parsed;
  };

  const existingDatabase = await lstat(file).catch((error) => error.code === "ENOENT" ? null : Promise.reject(error));
  if (existingDatabase && (!existingDatabase.isFile() || existingDatabase.isSymbolicLink())) {
    throw new Error("Relay SQLite database must be a regular file, not a symlink.");
  }
  const db = new Database(file);
  try {
    await chmod(file, 0o600).catch(() => {});
    db.pragma("journal_mode = DELETE");
    db.pragma("synchronous = FULL");
    if (db.pragma("integrity_check", { simple: true }) !== "ok") throw new Error("Relay SQLite integrity check failed.");
    db.exec(`
      CREATE TABLE IF NOT EXISTS relay_inbox (
        id TEXT PRIMARY KEY,
        envelope TEXT NOT NULL,
        received_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS relay_inbox_received_at ON relay_inbox(received_at);
      CREATE TABLE IF NOT EXISTS relay_invite_codes (
        code_hash TEXT PRIMARY KEY,
        version INTEGER NOT NULL,
        invite TEXT NOT NULL,
        invite_digest TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS relay_invite_codes_expires_at ON relay_invite_codes(expires_at);
    `);

    const inboxCount = db.prepare("SELECT COUNT(*) AS count FROM relay_inbox").get().count;
    const inviteCount = db.prepare("SELECT COUNT(*) AS count FROM relay_invite_codes").get().count;
    const inboxLegacy = inboxCount === 0 ? await readLegacy(inboxLegacyFile, "inbox") : null;
    const inviteLegacy = inviteCount === 0 ? await readLegacy(inviteLegacyFile, "invite-code") : null;
    const migrate = db.transaction((inbox, invites) => {
      const insertInbox = db.prepare("INSERT OR IGNORE INTO relay_inbox (id, envelope, received_at) VALUES (?, ?, ?)");
      for (const item of inbox || []) {
        if (typeof item?.id === "string" && typeof item.envelope === "string" && Number.isSafeInteger(item.receivedAt)) {
          insertInbox.run(item.id, item.envelope, item.receivedAt);
        }
      }
      const insertInvite = db.prepare("INSERT OR IGNORE INTO relay_invite_codes (code_hash, version, invite, invite_digest, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)");
      for (const record of invites || []) {
        if (record?.version === 1 && typeof record.codeHash === "string" && typeof record.invite === "string" && typeof record.inviteDigest === "string" && Number.isSafeInteger(record.createdAt) && Number.isSafeInteger(record.expiresAt)) {
          insertInvite.run(record.codeHash, record.version, record.invite, record.inviteDigest, record.createdAt, record.expiresAt);
        }
      }
    });
    if (inboxCount === 0 && inboxLegacy) migrate(inboxLegacy, null);
    if (inviteCount === 0 && inviteLegacy) migrate(null, inviteLegacy);
    if (inboxLegacy || inviteLegacy || inboxCount > 0 || inviteCount > 0) {
      await unlink(inboxLegacyFile).catch(() => {});
      await unlink(`${inboxLegacyFile}.tmp`).catch(() => {});
      await unlink(inviteLegacyFile).catch(() => {});
      await unlink(`${inviteLegacyFile}.tmp`).catch(() => {});
    }
  } catch (error) {
    db.close();
    throw error;
  }

  const listInbox = (cutoff = 0) => db.prepare("SELECT id, envelope, received_at AS receivedAt FROM relay_inbox WHERE received_at >= ? ORDER BY received_at ASC, id ASC").all(cutoff);
  const listInviteCodes = (now = Date.now()) => db.prepare("SELECT version, code_hash AS codeHash, invite, invite_digest AS inviteDigest, created_at AS createdAt, expires_at AS expiresAt FROM relay_invite_codes WHERE expires_at > ? ORDER BY created_at ASC, code_hash ASC").all(now);
  const purgeInbox = db.prepare("DELETE FROM relay_inbox WHERE received_at < ?");
  const purgeInviteCodes = db.prepare("DELETE FROM relay_invite_codes WHERE expires_at <= ?");
  const trimInbox = db.prepare("DELETE FROM relay_inbox WHERE id NOT IN (SELECT id FROM relay_inbox ORDER BY received_at DESC, id DESC LIMIT ?)");
  const replaceInbox = db.transaction((items) => {
    db.exec("DELETE FROM relay_inbox");
    const insert = db.prepare("INSERT OR IGNORE INTO relay_inbox (id, envelope, received_at) VALUES (?, ?, ?)");
    for (const item of items) insert.run(item.id, item.envelope, item.receivedAt);
  });
  const replaceInviteCodes = db.transaction((records) => {
    db.exec("DELETE FROM relay_invite_codes");
    const insert = db.prepare("INSERT OR IGNORE INTO relay_invite_codes (code_hash, version, invite, invite_digest, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)");
    for (const record of records) insert.run(record.codeHash, record.version, record.invite, record.inviteDigest, record.createdAt, record.expiresAt);
  });
  return {
    listInbox,
    listInviteCodes,
    purgeInbox: (cutoff) => purgeInbox.run(cutoff),
    purgeInviteCodes: (now) => purgeInviteCodes.run(now),
    trimInbox: (limit) => trimInbox.run(limit),
    replaceInbox(items) {
      beforeCommit?.("inbox");
      replaceInbox(items);
    },
    replaceInviteCodes(records) {
      beforeCommit?.("invite-codes");
      replaceInviteCodes(records);
    },
    close: () => db.close(),
  };
}
