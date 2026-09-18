import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import type { ContactInput, NewsletterInput, ReservationInput } from './validation';

const dbPath = process.env.DB_PATH ?? 'data/boca-maldita.db';
mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;

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
`);

export interface ReservationRecord {
  id: number;
  reference: string;
}

const countStmt = db.prepare('SELECT COUNT(*) AS count FROM reservations');

export function insertReservation(input: ReservationInput): ReservationRecord {
  const { count } = countStmt.get() as { count: number };
  const reference = `BM-${String(count + 1).padStart(4, '0')}`;

  const info = db
    .prepare(
      `INSERT INTO reservations (reference, name, email, phone, date, time, guests, area, occasion, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(reference, input.name, input.email, input.phone, input.date, input.time, input.guests, input.area, input.occasion, input.notes ?? '');

  return { id: Number(info.lastInsertRowid), reference };
}

export function insertContact(input: ContactInput): { id: number } {
  const info = db
    .prepare(`INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)`)
    .run(input.nome, input.email, input.assunto, input.mensagem);

  return { id: Number(info.lastInsertRowid) };
}

export function isNewsletterSubscribed(email: string): boolean {
  return db.prepare('SELECT 1 FROM newsletter_subscriptions WHERE email = ?').get(email) !== undefined;
}

export function insertNewsletter(input: NewsletterInput): { id: number } {
  const info = db.prepare('INSERT INTO newsletter_subscriptions (email) VALUES (?)').run(input.email);
  return { id: Number(info.lastInsertRowid) };
}