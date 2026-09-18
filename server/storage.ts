import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { ContactInput, NewsletterInput, ReservationInput } from './validation';

export interface ReservationRecord {
  id: number;
  reference: string;
}

export interface Storage {
  init(): Promise<void>;
  createReservation(input: ReservationInput): Promise<ReservationRecord>;
  createContact(input: ContactInput): Promise<{ id: number }>;
  hasNewsletter(email: string): Promise<boolean>;
  createNewsletter(input: NewsletterInput): Promise<{ id: number }>;
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  deleteSetting(key: string): Promise<void>;
  isOpen(): boolean;
  close(): Promise<void>;
}

const TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    guests INTEGER NOT NULL,
    area TEXT NOT NULL,
    occasion TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

const UPSERT_SETTING_SQL = `
  INSERT INTO settings (key, value) VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`;

function toReference(count: number): string {
  return `BM-${String(count + 1).padStart(4, '0')}`;
}

async function createSqliteStorage(): Promise<Storage> {
  const { DatabaseSync } = await import('node:sqlite');
  const dbPath = process.env.DB_PATH ?? 'data/boca-maldita.db';
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`PRAGMA journal_mode = WAL;\n${TABLE_SCHEMA}`);

  return {
    async init() {},
    async createReservation(input) {
      const { count } = db.prepare('SELECT COUNT(*) AS count FROM reservations').get() as { count: number };
      const reference = toReference(count);
      const info = db
        .prepare(
          `INSERT INTO reservations (reference, name, email, phone, date, time, guests, area, occasion, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(reference, input.name, input.email, input.phone, input.date, input.time, input.guests, input.area, input.occasion, input.notes ?? '');
      return { id: Number(info.lastInsertRowid), reference };
    },
    async createContact(input) {
      const info = db
        .prepare(`INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)`)
        .run(input.nome, input.email, input.assunto, input.mensagem);
      return { id: Number(info.lastInsertRowid) };
    },
    async hasNewsletter(email) {
      return db.prepare('SELECT 1 FROM newsletter_subscriptions WHERE email = ?').get(email) !== undefined;
    },
    async createNewsletter(input) {
      const info = db.prepare('INSERT INTO newsletter_subscriptions (email) VALUES (?)').run(input.email);
      return { id: Number(info.lastInsertRowid) };
    },
    async getSetting(key) {
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
      return row?.value ?? null;
    },
    async setSetting(key, value) {
      db.prepare(UPSERT_SETTING_SQL).run(key, value);
    },
    async deleteSetting(key) {
      db.prepare('DELETE FROM settings WHERE key = ?').run(key);
    },
    isOpen() {
      return db.isOpen;
    },
    async close() {
      db.close();
    },
  };
}

interface LibsqlRows {
  rows: Array<Record<string, unknown>>;
  lastInsertRowid?: number | bigint;
}

interface MinimalLibsqlClient {
  executeMultiple(sql: string): Promise<unknown>;
  execute(query: { sql: string; args?: unknown[] } | string): Promise<LibsqlRows>;
  close(): Promise<void>;
}

function createTursoStorage(client: MinimalLibsqlClient): Storage {

  return {
    async init() {
      await client.executeMultiple(TABLE_SCHEMA);
    },
    async createReservation(input) {
      const { rows } = await client.execute('SELECT COUNT(*) AS count FROM reservations');
      const count = Number(rows[0]?.count ?? 0);
      const reference = toReference(count);
      const result = await client.execute({
        sql: `INSERT INTO reservations (reference, name, email, phone, date, time, guests, area, occasion, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [reference, input.name, input.email, input.phone, input.date, input.time, input.guests, input.area, input.occasion, input.notes ?? ''],
      });
      return { id: Number(result.lastInsertRowid), reference };
    },
    async createContact(input) {
      const result = await client.execute({
        sql: `INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)`,
        args: [input.nome, input.email, input.assunto, input.mensagem],
      });
      return { id: Number(result.lastInsertRowid) };
    },
    async hasNewsletter(email) {
      const { rows } = await client.execute({
        sql: 'SELECT 1 FROM newsletter_subscriptions WHERE email = ?',
        args: [email],
      });
      return rows.length > 0;
    },
    async createNewsletter(input) {
      const result = await client.execute({
        sql: 'INSERT INTO newsletter_subscriptions (email) VALUES (?)',
        args: [input.email],
      });
      return { id: Number(result.lastInsertRowid) };
    },
    async getSetting(key) {
      const { rows } = await client.execute({
        sql: 'SELECT value FROM settings WHERE key = ?',
        args: [key],
      });
      const value = rows[0]?.value;
      return typeof value === 'string' ? value : null;
    },
    async setSetting(key, value) {
      await client.execute({ sql: UPSERT_SETTING_SQL, args: [key, value] });
    },
    async deleteSetting(key) {
      await client.execute({ sql: 'DELETE FROM settings WHERE key = ?', args: [key] });
    },
    isOpen() {
      return true;
    },
    async close() {
      await client.close();
    },
  };
}

export function createMemoryStorage(): Storage {
  const reservations: Array<{ reference: string; input: ReservationInput }> = [];
  const contacts: Array<{ id: number }> = [];
  const newsletters: string[] = [];
  const settings = new Map<string, string>();

  return {
    async init() {},
    async createReservation(input) {
      const reference = toReference(reservations.length);
      reservations.push({ reference, input });
      return { id: reservations.length, reference };
    },
    async createContact(input) {
      const id = contacts.length + 1;
      contacts.push({ id });
      void input;
      return { id };
    },
    async hasNewsletter(email) {
      return newsletters.includes(email);
    },
    async createNewsletter(input) {
      const id = newsletters.length + 1;
      newsletters.push(input.email);
      void id;
      return { id };
    },
    async getSetting(key) {
      return settings.get(key) ?? null;
    },
    async setSetting(key, value) {
      settings.set(key, value);
    },
    async deleteSetting(key) {
      settings.delete(key);
    },
    isOpen() {
      return true;
    },
    async close() {},
  };
}

export async function createStorage(): Promise<Storage> {
  const tursoUrl = (process.env.TURSO_URL ?? '').trim();
  const tursoToken = (process.env.TURSO_AUTH_TOKEN ?? '').trim();

  if (tursoUrl && tursoToken) {
    try {
      const { createClient } = await import('@libsql/client/web');
      const client = createClient({ url: tursoUrl, authToken: tursoToken }) as unknown as MinimalLibsqlClient;
      return createTursoStorage(client);
    } catch (err) {
      console.warn('[storage] Turso indisponível — a usar armazenamento em memória:', err);
      return createMemoryStorage();
    }
  }

  if (process.env.VERCEL) {
    console.warn('[storage] VERCEL sem Turso configurado — a usar armazenamento em memória (não persistente).');
    return createMemoryStorage();
  }

  try {
    return await createSqliteStorage();
  } catch (err) {
    console.warn('[storage] SQLite local indisponível — a usar armazenamento em memória:', err);
    return createMemoryStorage();
  }
}