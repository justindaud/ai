import { getDb } from '@/lib/db';

export type ChatRole = 'user' | 'assistant' | 'system';

function nowIso() {
  return new Date().toISOString();
}

function ensureSchema() {
  const db = getDb(false);
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(session_id) REFERENCES sessions(id)
    );
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at);
  `);
}

function genId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export function createSession(title: string = 'New Chat') {
  ensureSchema();
  const db = getDb(false);
  const id = genId('sess');
  const ts = nowIso();
  db.prepare(
    `INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)`
  ).run(id, title, ts, ts);
  return { id, title, created_at: ts, updated_at: ts };
}

export function listSessions(query?: string) {
  ensureSchema();
  const db = getDb(true);
  if (query && query.trim()) {
    const q = `%${query.trim().toLowerCase()}%`;
    return db.prepare(
      `SELECT * FROM sessions WHERE lower(title) LIKE ? ORDER BY datetime(updated_at) DESC LIMIT 200`
    ).all(q) as any[];
  }
  return db.prepare(
    `SELECT * FROM sessions ORDER BY datetime(updated_at) DESC LIMIT 200`
  ).all() as any[];
}

export function addMessage(sessionId: string, role: ChatRole, content: string) {
  ensureSchema();
  const db = getDb(false);
  const id = genId('msg');
  const ts = nowIso();
  db.prepare(
    `INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(id, sessionId, role, content, ts);
  db.prepare(`UPDATE sessions SET updated_at = ? WHERE id = ?`).run(ts, sessionId);
  return { id, session_id: sessionId, role, content, created_at: ts };
}

export function getMessages(sessionId: string) {
  ensureSchema();
  const db = getDb(true);
  return db.prepare(
    `SELECT id, session_id, role, content, created_at FROM messages WHERE session_id = ? ORDER BY datetime(created_at) ASC`
  ).all(sessionId) as any[];
}

export function getOrCreateSession(sessionId?: string, title?: string) {
  ensureSchema();
  const db = getDb(false);
  if (sessionId) {
    const row = db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(sessionId) as any;
    if (row) return row;
  }
  return createSession(title);
}
