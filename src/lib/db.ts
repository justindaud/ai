import Database from 'better-sqlite3';

let rwInstance: Database.Database | null = null;
let roInstance: Database.Database | null = null;

export function getDb(readonly = true) {
  if (readonly) {
    if (!roInstance) {
      roInstance = new Database('hotel.db', { readonly: true });
    }
    return roInstance;
  }
  if (!rwInstance) {
    rwInstance = new Database('hotel.db');
  }
  return rwInstance;
}


