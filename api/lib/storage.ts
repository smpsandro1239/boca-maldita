import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { ContactInput, NewsletterInput, ReservationInput } from './validation';

export interface ReservationRecord {
  id: number;
  reference: string;
}

export interface ReservationRow {
  id: number;
  reference: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  area: string;
  occasion: string;
  notes: string;
  created_at: string;
}

export interface ContactRow {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

export interface NewsletterRow {
  id: number;
  email: string;
  created_at: string;
}

export interface Storage {
  init(): Promise<void>;
  createReservation(input: ReservationInput): Promise<ReservationRecord>;
  listReservations(): Promise<ReservationRow[]>;
  deleteReservation(id: number): Promise<boolean>;
  createContact(input: ContactInput): Promise<{ id: number }>;
  listContacts(): Promise<ContactRow[]>;
  deleteContact(id: number): Promise<boolean>;
  hasNewsletter(email: string): Promise<boolean>;
  createNewsletter(input: NewsletterInput): Promise<{ id: number }>;
  listNewsletter(): Promise<NewsletterRow[]>;
  deleteNewsletter(id: number): Promise<boolean>;
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
    async listReservations() {
      const rows = db
        .prepare(
          `SELECT id, reference, name, email, phone, date, time, guests, area, occasion, notes, created_at
           FROM reservations ORDER BY id DESC`,
        )
        .all() as unknown as ReservationRow[];
      return rows;
    },
    async deleteReservation(id) {
      const info = db.prepare('DELETE FROM reservations WHERE id = ?').run(id);
      return Number(info.changes) > 0;
    },
    async createContact(input) {
      const info = db
        .prepare(`INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)`)
        .run(input.nome, input.email, input.assunto, input.mensagem);
      return { id: Number(info.lastInsertRowid) };
    },
    async listContacts() {
      const rows = db
        .prepare(`SELECT id, name, email, subject, message, created_at FROM contacts ORDER BY id DESC`)
        .all() as unknown as ContactRow[];
      return rows;
    },
    async deleteContact(id) {
      const info = db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
      return Number(info.changes) > 0;
    },
    async hasNewsletter(email) {
      return db.prepare('SELECT 1 FROM newsletter_subscriptions WHERE email = ?').get(email) !== undefined;
    },
    async createNewsletter(input) {
      const info = db.prepare('INSERT INTO newsletter_subscriptions (email) VALUES (?)').run(input.email);
      return { id: Number(info.lastInsertRowid) };
    },
    async listNewsletter() {
      const rows = db
        .prepare(`SELECT id, email, created_at FROM newsletter_subscriptions ORDER BY id DESC`)
        .all() as unknown as NewsletterRow[];
      return rows;
    },
    async deleteNewsletter(id) {
      const info = db.prepare('DELETE FROM newsletter_subscriptions WHERE id = ?').run(id);
      return Number(info.changes) > 0;
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
    async listReservations() {
      const { rows } = await client.execute({
        sql: `SELECT id, reference, name, email, phone, date, time, guests, area, occasion, notes, created_at
              FROM reservations ORDER BY id DESC`,
      });
      return rows as unknown as ReservationRow[];
    },
    async deleteReservation(id) {
      await client.execute({ sql: 'DELETE FROM reservations WHERE id = ?', args: [id] });
      return true;
    },
    async createContact(input) {
      const result = await client.execute({
        sql: `INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)`,
        args: [input.nome, input.email, input.assunto, input.mensagem],
      });
      return { id: Number(result.lastInsertRowid) };
    },
    async listContacts() {
      const { rows } = await client.execute({
        sql: 'SELECT id, name, email, subject, message, created_at FROM contacts ORDER BY id DESC',
      });
      return rows as unknown as ContactRow[];
    },
    async deleteContact(id) {
      await client.execute({ sql: 'DELETE FROM contacts WHERE id = ?', args: [id] });
      return true;
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
    async listNewsletter() {
      const { rows } = await client.execute({
        sql: 'SELECT id, email, created_at FROM newsletter_subscriptions ORDER BY id DESC',
      });
      return rows as unknown as NewsletterRow[];
    },
    async deleteNewsletter(id) {
      await client.execute({ sql: 'DELETE FROM newsletter_subscriptions WHERE id = ?', args: [id] });
      return true;
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
  const maxId = { reservations: 0, contacts: 0, newsletters: 0 };
  const reservations: Array<ReservationRow> = [];
  const contacts: Array<ContactRow> = [];
  const newsletters: Array<NewsletterRow> = [];
  const newsletterEmails = new Set<string>();
  const settings = new Map<string, string>();
  const createdAt = () => new Date().toISOString();

  return {
    async init() {},
    async createReservation(input) {
      maxId.reservations += 1;
      const reference = toReference(maxId.reservations - 1);
      reservations.push({
        id: maxId.reservations,
        reference,
        name: input.name,
        email: input.email,
        phone: input.phone,
        date: input.date,
        time: input.time,
        guests: input.guests,
        area: input.area,
        occasion: input.occasion,
        notes: input.notes ?? '',
        created_at: createdAt(),
      });
      return { id: maxId.reservations, reference };
    },
    async listReservations() {
      return reservations.map((r) => ({ ...r })).reverse();
    },
    async deleteReservation(id) {
      const index = reservations.findIndex((r) => r.id === id);
      if (index === -1) return false;
      reservations.splice(index, 1);
      return true;
    },
    async createContact(input) {
      maxId.contacts += 1;
      const id = maxId.contacts;
      contacts.push({ id, name: input.nome, email: input.email, subject: input.assunto, message: input.mensagem, created_at: createdAt() });
      return { id };
    },
    async listContacts() {
      return contacts.map((c) => ({ ...c })).reverse();
    },
    async deleteContact(id) {
      const index = contacts.findIndex((c) => c.id === id);
      if (index === -1) return false;
      contacts.splice(index, 1);
      return true;
    },
    async hasNewsletter(email) {
      return newsletterEmails.has(email);
    },
    async createNewsletter(input) {
      const email = input.email.toLowerCase();
      if (newsletterEmails.has(email)) return { id: -1 };
      maxId.newsletters += 1;
      const id = maxId.newsletters;
      newsletterEmails.add(email);
      newsletters.push({ id, email, created_at: createdAt() });
      return { id };
    },
    async listNewsletter() {
      return newsletters.map((n) => ({ ...n })).reverse();
    },
    async deleteNewsletter(id) {
      const index = newsletters.findIndex((n) => n.id === id);
      if (index === -1) return false;
      newsletterEmails.delete(newsletters[index].email.toLowerCase());
      newsletters.splice(index, 1);
      return true;
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