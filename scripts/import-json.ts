import Database from 'better-sqlite3';
import { createReadStream, existsSync } from 'node:fs';
import { pipeline } from 'node:stream';
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

// Streaming import from a large JSON array file into SQLite.
// Defaults to ../Pulang2.etl_merged_ih&fr2.json relative to project root.

const argPath = process.argv[2];
const defaultPath = path.resolve(process.cwd(), '..', 'Pulang2.etl_merged_ih&fr2.json');
const srcPath = argPath || defaultPath;

if (!existsSync(srcPath)) {
  console.error('Source JSON not found at:', srcPath);
  console.error('Usage: tsx scripts/import-json.ts <path-to-json>');
  process.exit(1);
}

const db = new Database('hotel.db');
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS stays (
  id TEXT PRIMARY KEY,
  name TEXT,
  arrival TEXT,
  depart TEXT,
  room_number TEXT,
  room_type TEXT,
  arrangement TEXT,
  age INTEGER,
  local_region TEXT,
  room_rate REAL,
  adult INTEGER,
  child INTEGER,
  sob TEXT,
  night INTEGER,
  ci_time TEXT,
  co_time TEXT,
  segment_ih TEXT,
  created TEXT
);
CREATE INDEX IF NOT EXISTS idx_arrival ON stays(arrival);
CREATE INDEX IF NOT EXISTS idx_depart ON stays(depart);
CREATE INDEX IF NOT EXISTS idx_segment ON stays(segment_ih);
`);

const insert = db.prepare(`
INSERT OR REPLACE INTO stays
(id, name, arrival, depart, room_number, room_type, arrangement, age, local_region, room_rate, adult, child, sob, night, ci_time, co_time, segment_ih, created)
VALUES
(@id, @name, @arrival, @depart, @room_number, @room_type, @arrangement, @age, @local_region, @room_rate, @adult, @child, @sob, @night, @ci_time, @co_time, @segment_ih, @created)
`);
const insertMany = db.transaction((rows: any[]) => rows.forEach((r) => insert.run(r)));

const BATCH = 1000;
let batch: any[] = [];

pipeline(
  createReadStream(srcPath),
  parser(),
  streamArray(),
  async function* (source: any) {
    for await (const { value } of source) {
      const doc = value;
      // Helpers to normalize values into SQLite-acceptable bindings
      const toStringOrNull = (v: any): string | null => {
        if (v == null) return null;
        // Normalize Excel-like wrappers and trim
        const s = String(v)
          .replace(/^[=]"?|"$/g, '')
          .trim();
        return s.length ? s : null;
      };

      const toIntOrNull = (v: any): number | null => {
        if (v == null) return null;
        if (typeof v === 'boolean') return v ? 1 : 0;
        const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10);
        return Number.isFinite(n) ? n : null;
      };

      const toNumber = (v: any): number => {
        if (v == null) return 0;
        if (typeof v === 'number') return v;
        if (typeof v === 'boolean') return v ? 1 : 0;
        const s = String(v).trim();
        if (!s) return 0;
        // Replace thousands separators and decimal commas
        const normalized = s
          .replace(/^[=]"?|"$/g, '')
          .replace(/\s+/g, '')
          .replace(/\.(?=.*\.)/g, '') // keep last dot only
          .replace(/,(?=.*,)/g, '') // keep last comma only
          .replace(/,/g, '.');
        const n = Number(normalized);
        return Number.isFinite(n) ? n : 0;
      };

      batch.push({
        id: doc?._id?.$oid ?? randomUUID(),
        name: toStringOrNull(doc?.Name),
        arrival: toStringOrNull(doc?.Arrival),
        depart: toStringOrNull(doc?.Depart),
        room_number: toStringOrNull(doc?.Room_Number),
        room_type: toStringOrNull(doc?.Room_Type),
        arrangement: toStringOrNull(doc?.Arrangement),
        age: toIntOrNull(doc?.Age),
        local_region: toStringOrNull(doc?.['Local Region']),
        room_rate: toNumber(doc?.Room_Rate ?? 0),
        adult: toIntOrNull(doc?.Adult),
        child: toIntOrNull(doc?.Child),
        sob: toStringOrNull(doc?.SOB),
        night: toIntOrNull(doc?.Night),
        ci_time: toStringOrNull(doc?.CI_Time),
        co_time: toStringOrNull(doc?.CO_Time),
        segment_ih: toStringOrNull(doc?.Segment_ih),
        created: toStringOrNull(doc?.Created),
      });
      if (batch.length >= BATCH) {
        insertMany(batch);
        batch = [];
      }
    }
    if (batch.length) insertMany(batch);
  },
  (err: any) => {
    if (err) {
      console.error('Import failed', err);
      process.exit(1);
    }
    console.log('Import done');
  }
);


