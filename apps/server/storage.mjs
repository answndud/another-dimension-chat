import { lstat, readFile as defaultReadFile } from "node:fs/promises";
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
  db.pragma("journal_mode = WAL");
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
