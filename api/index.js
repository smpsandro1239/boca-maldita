/* gerado por scripts/build-api.mjs — não editar manualmente */

// server/lib/app.ts
import "dotenv/config";
import express from "express";
import { existsSync } from "node:fs";
import path2 from "node:path";

// server/lib/storage.ts
import { mkdirSync } from "node:fs";
import path from "node:path";
var TABLE_SCHEMA = `
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
    status TEXT NOT NULL DEFAULT 'confirmed',
    ip_address TEXT,
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

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    service_rating INTEGER NOT NULL,
    food_rating INTEGER NOT NULL,
    ambience_rating INTEGER NOT NULL,
    comment TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS closed_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    repeat TEXT NOT NULL DEFAULT 'none',
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;
var UPSERT_SETTING_SQL = `
  INSERT INTO settings (key, value) VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`;
function toReference(count) {
  return `BM-${String(count + 1).padStart(4, "0")}`;
}
function normalizePhone(value) {
  return value.replace(/[\s-]/g, "").replace(/^\+/, "");
}
async function createSqliteStorage() {
  const { DatabaseSync } = await import("node:sqlite");
  const dbPath = process.env.DB_PATH ?? "data/boca-maldita.db";
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`PRAGMA journal_mode = WAL;
${TABLE_SCHEMA}`);
  const reservationColumns = () => {
    const cols = db.prepare("PRAGMA table_info(reservations)").all();
    return new Set(cols.map((c) => c.name));
  };
  return {
    async init() {
      const cols = reservationColumns();
      if (!cols.has("status")) db.exec(`ALTER TABLE reservations ADD COLUMN status TEXT NOT NULL DEFAULT 'confirmed'`);
      if (!cols.has("ip_address")) db.exec(`ALTER TABLE reservations ADD COLUMN ip_address TEXT`);
    },
    async createReservation(input, meta) {
      const tmpReference = `BM-TMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const info = db.prepare(
        `INSERT INTO reservations (reference, name, email, phone, date, time, guests, area, occasion, notes, status, ip_address)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)`
      ).run(tmpReference, input.name, input.email, input.phone, input.date, input.time, input.guests, input.area, input.occasion, input.notes ?? "", meta?.ip ?? null);
      const id = Number(info.lastInsertRowid);
      const reference = toReference(id - 1);
      db.prepare("UPDATE reservations SET reference = ? WHERE id = ?").run(reference, id);
      return { id, reference };
    },
    async countByDate(date) {
      const { count } = db.prepare("SELECT COUNT(*) AS count FROM reservations WHERE date = ?").get(date);
      return Number(count);
    },
    async countByClientOnDate(date, email, phone) {
      const phoneNorm = normalizePhone(phone);
      const { count } = db.prepare(
        `SELECT COUNT(*) AS count FROM reservations
           WHERE date = ? AND (lower(email) = lower(?) OR replace(replace(phone, ' ', ''), '-', '') = ?)`
      ).get(date, email, phoneNorm);
      return Number(count);
    },
    async updateReservation(id, input) {
      const info = db.prepare(
        `UPDATE reservations SET name = ?, email = ?, phone = ?, date = ?, time = ?, guests = ?, area = ?, occasion = ?, notes = ? WHERE id = ?`
      ).run(input.name, input.email, input.phone, input.date, input.time, input.guests, input.area, input.occasion, input.notes ?? "", id);
      return Number(info.changes) > 0;
    },
    async listReservations() {
      const rows = db.prepare(
        `SELECT id, reference, name, email, phone, date, time, guests, area, occasion, notes, status, ip_address, created_at
           FROM reservations ORDER BY id DESC`
      ).all();
      return rows;
    },
    async deleteReservation(id) {
      const info = db.prepare("DELETE FROM reservations WHERE id = ?").run(id);
      return Number(info.changes) > 0;
    },
    async createContact(input) {
      const info = db.prepare(`INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)`).run(input.nome, input.email, input.assunto, input.mensagem);
      return { id: Number(info.lastInsertRowid) };
    },
    async listContacts() {
      const rows = db.prepare(`SELECT id, name, email, subject, message, created_at FROM contacts ORDER BY id DESC`).all();
      return rows;
    },
    async deleteContact(id) {
      const info = db.prepare("DELETE FROM contacts WHERE id = ?").run(id);
      return Number(info.changes) > 0;
    },
    async hasNewsletter(email) {
      return db.prepare("SELECT 1 FROM newsletter_subscriptions WHERE email = ?").get(email) !== void 0;
    },
    async createNewsletter(input) {
      const info = db.prepare("INSERT INTO newsletter_subscriptions (email) VALUES (?)").run(input.email);
      return { id: Number(info.lastInsertRowid) };
    },
    async listNewsletter() {
      const rows = db.prepare(`SELECT id, email, created_at FROM newsletter_subscriptions ORDER BY id DESC`).all();
      return rows;
    },
    async deleteNewsletter(id) {
      const info = db.prepare("DELETE FROM newsletter_subscriptions WHERE id = ?").run(id);
      return Number(info.changes) > 0;
    },
    async createReview(input, meta) {
      const info = db.prepare(
        `INSERT INTO reviews (name, service_rating, food_rating, ambience_rating, comment, status, ip_address)
           VALUES (?, ?, ?, ?, ?, 'pending', ?)`
      ).run(input.name, input.serviceRating, input.foodRating, input.ambienceRating, input.comment, meta?.ip ?? null);
      return { id: Number(info.lastInsertRowid) };
    },
    async listReviews(onlyApproved) {
      const rows = onlyApproved ? db.prepare(
        `SELECT id, name, service_rating, food_rating, ambience_rating, comment, status, created_at
               FROM reviews WHERE status = 'approved' ORDER BY id DESC`
      ).all() : db.prepare(
        `SELECT id, name, service_rating, food_rating, ambience_rating, comment, status, created_at
               FROM reviews ORDER BY id DESC`
      ).all();
      return rows;
    },
    async setReviewStatus(id, status) {
      const info = db.prepare("UPDATE reviews SET status = ? WHERE id = ?").run(status, id);
      return Number(info.changes) > 0;
    },
    async deleteReview(id) {
      const info = db.prepare("DELETE FROM reviews WHERE id = ?").run(id);
      return Number(info.changes) > 0;
    },
    async listClosedPeriods() {
      const rows = db.prepare(
        `SELECT id, title, start_date, end_date, repeat, note, created_at
           FROM closed_periods ORDER BY start_date ASC, id ASC`
      ).all();
      return rows;
    },
    async createClosedPeriod(input) {
      const info = db.prepare(
        `INSERT INTO closed_periods (title, start_date, end_date, repeat, note)
           VALUES (?, ?, ?, ?, ?)`
      ).run(input.title, input.startDate, input.endDate || null, input.repeat, input.note);
      return { id: Number(info.lastInsertRowid) };
    },
    async deleteClosedPeriod(id) {
      const info = db.prepare("DELETE FROM closed_periods WHERE id = ?").run(id);
      return Number(info.changes) > 0;
    },
    async getSetting(key) {
      const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
      return row?.value ?? null;
    },
    async setSetting(key, value) {
      db.prepare(UPSERT_SETTING_SQL).run(key, value);
    },
    async deleteSetting(key) {
      db.prepare("DELETE FROM settings WHERE key = ?").run(key);
    },
    isOpen() {
      return db.isOpen;
    },
    async close() {
      db.close();
    }
  };
}
function createTursoStorage(client) {
  return {
    async init() {
      await client.executeMultiple(TABLE_SCHEMA);
      const cols = await client.execute({ sql: "PRAGMA table_info(reservations)" });
      const names = new Set(cols.rows.map((r) => String(r.name ?? "")));
      if (!names.has("status")) {
        await client.execute({ sql: "ALTER TABLE reservations ADD COLUMN status TEXT NOT NULL DEFAULT 'confirmed'" });
      }
      if (!names.has("ip_address")) {
        await client.execute({ sql: "ALTER TABLE reservations ADD COLUMN ip_address TEXT" });
      }
    },
    async createReservation(input, meta) {
      const tmpReference = `BM-TMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const result = await client.execute({
        sql: `INSERT INTO reservations (reference, name, email, phone, date, time, guests, area, occasion, notes, status, ip_address)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)`,
        args: [tmpReference, input.name, input.email, input.phone, input.date, input.time, input.guests, input.area, input.occasion, input.notes ?? "", meta?.ip ?? null]
      });
      const id = Number(result.lastInsertRowid);
      const reference = toReference(id - 1);
      await client.execute({
        sql: "UPDATE reservations SET reference = ? WHERE id = ?",
        args: [reference, id]
      });
      return { id, reference };
    },
    async countByDate(date) {
      const { rows } = await client.execute({ sql: "SELECT COUNT(*) AS count FROM reservations WHERE date = ?", args: [date] });
      return Number(rows[0]?.count ?? 0);
    },
    async countByClientOnDate(date, email, phone) {
      const phoneNorm = normalizePhone(phone);
      const { rows } = await client.execute({
        sql: `SELECT COUNT(*) AS count FROM reservations
              WHERE date = ? AND (lower(email) = lower(?) OR replace(replace(phone, ' ', ''), '-', '') = ?)`,
        args: [date, email, phoneNorm]
      });
      return Number(rows[0]?.count ?? 0);
    },
    async updateReservation(id, input) {
      await client.execute({
        sql: `UPDATE reservations SET name = ?, email = ?, phone = ?, date = ?, time = ?, guests = ?, area = ?, occasion = ?, notes = ? WHERE id = ?`,
        args: [input.name, input.email, input.phone, input.date, input.time, input.guests, input.area, input.occasion, input.notes ?? "", id]
      });
      return true;
    },
    async listReservations() {
      const { rows } = await client.execute({
        sql: `SELECT id, reference, name, email, phone, date, time, guests, area, occasion, notes, status, ip_address, created_at
              FROM reservations ORDER BY id DESC`
      });
      return rows;
    },
    async deleteReservation(id) {
      await client.execute({ sql: "DELETE FROM reservations WHERE id = ?", args: [id] });
      return true;
    },
    async createContact(input) {
      const result = await client.execute({
        sql: `INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)`,
        args: [input.nome, input.email, input.assunto, input.mensagem]
      });
      return { id: Number(result.lastInsertRowid) };
    },
    async listContacts() {
      const { rows } = await client.execute({
        sql: "SELECT id, name, email, subject, message, created_at FROM contacts ORDER BY id DESC"
      });
      return rows;
    },
    async deleteContact(id) {
      await client.execute({ sql: "DELETE FROM contacts WHERE id = ?", args: [id] });
      return true;
    },
    async hasNewsletter(email) {
      const { rows } = await client.execute({
        sql: "SELECT 1 FROM newsletter_subscriptions WHERE email = ?",
        args: [email]
      });
      return rows.length > 0;
    },
    async createNewsletter(input) {
      const result = await client.execute({
        sql: "INSERT INTO newsletter_subscriptions (email) VALUES (?)",
        args: [input.email]
      });
      return { id: Number(result.lastInsertRowid) };
    },
    async listNewsletter() {
      const { rows } = await client.execute({
        sql: "SELECT id, email, created_at FROM newsletter_subscriptions ORDER BY id DESC"
      });
      return rows;
    },
    async deleteNewsletter(id) {
      await client.execute({ sql: "DELETE FROM newsletter_subscriptions WHERE id = ?", args: [id] });
      return true;
    },
    async createReview(input, meta) {
      const result = await client.execute({
        sql: `INSERT INTO reviews (name, service_rating, food_rating, ambience_rating, comment, status, ip_address)
              VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
        args: [input.name, input.serviceRating, input.foodRating, input.ambienceRating, input.comment, meta?.ip ?? null]
      });
      return { id: Number(result.lastInsertRowid) };
    },
    async listReviews(onlyApproved) {
      const { rows } = await client.execute(
        onlyApproved ? {
          sql: `SELECT id, name, service_rating, food_rating, ambience_rating, comment, status, created_at
                    FROM reviews WHERE status = 'approved' ORDER BY id DESC`
        } : {
          sql: `SELECT id, name, service_rating, food_rating, ambience_rating, comment, status, created_at
                    FROM reviews ORDER BY id DESC`
        }
      );
      return rows;
    },
    async setReviewStatus(id, status) {
      await client.execute({
        sql: "UPDATE reviews SET status = ? WHERE id = ?",
        args: [status, id]
      });
      return true;
    },
    async deleteReview(id) {
      await client.execute({ sql: "DELETE FROM reviews WHERE id = ?", args: [id] });
      return true;
    },
    async listClosedPeriods() {
      const { rows } = await client.execute({
        sql: `SELECT id, title, start_date, end_date, repeat, note, created_at
              FROM closed_periods ORDER BY start_date ASC, id ASC`
      });
      return rows;
    },
    async createClosedPeriod(input) {
      const result = await client.execute({
        sql: `INSERT INTO closed_periods (title, start_date, end_date, repeat, note)
              VALUES (?, ?, ?, ?, ?)`,
        args: [input.title, input.startDate, input.endDate || null, input.repeat, input.note]
      });
      return { id: Number(result.lastInsertRowid) };
    },
    async deleteClosedPeriod(id) {
      await client.execute({ sql: "DELETE FROM closed_periods WHERE id = ?", args: [id] });
      return true;
    },
    async getSetting(key) {
      const { rows } = await client.execute({
        sql: "SELECT value FROM settings WHERE key = ?",
        args: [key]
      });
      const value = rows[0]?.value;
      return typeof value === "string" ? value : null;
    },
    async setSetting(key, value) {
      await client.execute({ sql: UPSERT_SETTING_SQL, args: [key, value] });
    },
    async deleteSetting(key) {
      await client.execute({ sql: "DELETE FROM settings WHERE key = ?", args: [key] });
    },
    isOpen() {
      return true;
    },
    async close() {
      await client.close();
    }
  };
}
function createMemoryStorage() {
  const maxId = { reservations: 0, contacts: 0, newsletters: 0, reviews: 0, closedPeriods: 0 };
  const reservations = [];
  const contacts = [];
  const newsletters = [];
  const newsletterEmails = /* @__PURE__ */ new Set();
  const reviews = [];
  const closedPeriods = [];
  const settings = /* @__PURE__ */ new Map();
  const createdAt = () => (/* @__PURE__ */ new Date()).toISOString();
  return {
    async init() {
    },
    async createReservation(input, meta) {
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
        notes: input.notes ?? "",
        status: "confirmed",
        ip_address: meta?.ip ?? "",
        created_at: createdAt()
      });
      return { id: maxId.reservations, reference };
    },
    async countByDate(date) {
      return reservations.filter((r) => r.date === date).length;
    },
    async countByClientOnDate(date, email, phone) {
      const phoneNorm = normalizePhone(phone);
      return reservations.filter(
        (r) => r.date === date && (r.email.toLowerCase() === email.toLowerCase() || normalizePhone(r.phone) === phoneNorm)
      ).length;
    },
    async updateReservation(id, input) {
      const index = reservations.findIndex((r) => r.id === id);
      if (index === -1) return false;
      reservations[index] = {
        ...reservations[index],
        name: input.name,
        email: input.email,
        phone: input.phone,
        date: input.date,
        time: input.time,
        guests: input.guests,
        area: input.area,
        occasion: input.occasion,
        notes: input.notes ?? ""
      };
      return true;
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
    async createReview(input, meta) {
      maxId.reviews += 1;
      const id = maxId.reviews;
      reviews.push({
        id,
        name: input.name,
        service_rating: input.serviceRating,
        food_rating: input.foodRating,
        ambience_rating: input.ambienceRating,
        comment: input.comment,
        status: "pending",
        created_at: createdAt()
      });
      return { id };
    },
    async listReviews(onlyApproved) {
      return reviews.filter((r) => !onlyApproved || r.status === "approved").map((r) => ({ ...r })).reverse();
    },
    async setReviewStatus(id, status) {
      const found = reviews.find((r) => r.id === id);
      if (!found) return false;
      found.status = status;
      return true;
    },
    async deleteReview(id) {
      const index = reviews.findIndex((r) => r.id === id);
      if (index === -1) return false;
      reviews.splice(index, 1);
      return true;
    },
    async listClosedPeriods() {
      return [...closedPeriods].sort((a, b) => a.start_date < b.start_date ? -1 : a.start_date > b.start_date ? 1 : a.id - b.id);
    },
    async createClosedPeriod(input) {
      maxId.closedPeriods += 1;
      const id = maxId.closedPeriods;
      closedPeriods.push({
        id,
        title: input.title,
        start_date: input.startDate,
        end_date: input.endDate || null,
        repeat: input.repeat,
        note: input.note,
        created_at: createdAt()
      });
      return { id };
    },
    async deleteClosedPeriod(id) {
      const index = closedPeriods.findIndex((c) => c.id === id);
      if (index === -1) return false;
      closedPeriods.splice(index, 1);
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
    async close() {
    }
  };
}
async function createStorage() {
  const tursoUrl = (process.env.TURSO_URL ?? "").trim();
  const tursoToken = (process.env.TURSO_AUTH_TOKEN ?? "").trim();
  if (tursoUrl && tursoToken) {
    try {
      const { createClient } = await import("@libsql/client/web");
      const client = createClient({ url: tursoUrl, authToken: tursoToken });
      return createTursoStorage(client);
    } catch (err) {
      console.warn("[storage] Turso indispon\xEDvel \u2014 a usar armazenamento em mem\xF3ria:", err);
      return createMemoryStorage();
    }
  }
  if (process.env.VERCEL) {
    console.warn("[storage] VERCEL sem Turso configurado \u2014 a usar armazenamento em mem\xF3ria (n\xE3o persistente).");
    return createMemoryStorage();
  }
  try {
    return await createSqliteStorage();
  } catch (err) {
    console.warn("[storage] SQLite local indispon\xEDvel \u2014 a usar armazenamento em mem\xF3ria:", err);
    return createMemoryStorage();
  }
}

// server/lib/validation.ts
import { z } from "zod";

// shared/contracts.ts
var MENU_CATEGORIES = ["diarias", "carnes", "mar", "entradas", "acompanhamentos", "sobremesas", "vinhos", "bebidas"];

// server/lib/validation.ts
var AVAILABLE_TIMES = [
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00"
];
var nameField = z.string().trim().min(2, "O nome \xE9 obrigat\xF3rio (m\xEDnimo de 2 caracteres).").max(120, "O nome \xE9 demasiado longo.");
var emailField = z.string().trim().email("Endere\xE7o de email inv\xE1lido.").max(200, "Endere\xE7o de email demasiado longo.");
var phoneField = z.string().trim().regex(/^\+?[0-9\s-]{6,20}$/, "N\xFAmero de telefone inv\xE1lido.");
var reservationSchema = z.object({
  name: nameField,
  email: emailField,
  phone: phoneField,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inv\xE1lida.").refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }, "Data inv\xE1lida.").refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(year, month - 1, day) >= today;
  }, "A data tem de ser hoje ou uma data futura."),
  time: z.enum(AVAILABLE_TIMES, { message: "Hora n\xE3o dispon\xEDvel para reserva." }),
  guests: z.number().int("N\xFAmero de convidados inv\xE1lido.").min(1).max(16, "M\xE1ximo de 16 convidados por reserva."),
  area: z.string().trim().min(2, "Selecione uma \xE1rea do restaurante.").max(120),
  occasion: z.string().trim().min(1, "A ocasi\xE3o \xE9 obrigat\xF3ria.").max(120),
  notes: z.string().trim().max(1e3, "Notas demasiado longas.").optional().default(""),
  check: z.string().trim().max(20).optional().default(""),
  checkQuestion: z.string().trim().max(40).optional().default(""),
  honeypot: z.string().trim().max(200).optional().default("")
}).strict();
var reservationProtectionSchema = z.object({
  enabled: z.boolean(),
  pauseForm: z.boolean(),
  dailyCapacity: z.number().int("Capacidade inv\xE1lida.").min(1).max(1e4, "Capacidade demasiado alta."),
  maxPerClient: z.number().int("Limite inv\xE1lido.").min(1).max(100, "Limite demasiado alto."),
  rateLimit: z.boolean(),
  requireCheck: z.boolean()
}).strict();
var dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inv\xE1lida.").refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}, "Data inv\xE1lida.");
var closedPeriodSchema = z.object({
  title: z.string().trim().min(2, "Indique um motivo (m\xEDnimo de 2 caracteres).").max(160, "O motivo \xE9 demasiado longo."),
  startDate: dateKeySchema,
  endDate: z.union([dateKeySchema, z.literal("")]).optional().default(""),
  repeat: z.enum(["none", "weekly", "yearly"], { message: "Repeti\xE7\xE3o inv\xE1lida." }).optional().default("none"),
  note: z.string().trim().max(500, "A nota \xE9 demasiado longa.").optional().default("")
}).strict().refine((value) => !value.endDate || value.endDate >= value.startDate, {
  message: "A data final tem de ser igual ou posterior \xE0 data inicial.",
  path: ["endDate"]
});
var diariaScheduleSchema = z.object({
  anchorDate: dateKeySchema,
  repeat: z.enum(["none", "weekly", "biweekly", "monthly"], { message: "Repeti\xE7\xE3o inv\xE1lida." }),
  activeFrom: dateKeySchema.optional(),
  activeTo: z.union([dateKeySchema, z.literal(""), z.null()]).optional(),
  lunch: z.boolean().optional().default(true),
  dinner: z.boolean().optional().default(true),
  itemIds: z.array(z.string().trim().min(1, "Identificador de prato inv\xE1lido.")).min(1, "Escolha pelo menos um prato para este dia.").max(4, "M\xE1ximo de 4 pratos por dia (2 carnes e 2 peixes).")
}).strict().refine((value) => value.lunch || value.dinner, {
  message: "Selecione pelo menos o almo\xE7o ou o jantar.",
  path: ["lunch"]
}).transform((value) => ({
  ...value,
  activeFrom: value.activeFrom || value.anchorDate,
  activeTo: value.activeTo || null
}));
var adminReservationSchema = z.object({
  name: nameField,
  email: emailField,
  phone: phoneField,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inv\xE1lida.").refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }, "Data inv\xE1lida."),
  time: z.enum(AVAILABLE_TIMES, { message: "Hora n\xE3o dispon\xEDvel para reserva." }),
  guests: z.number().int("N\xFAmero de convidados inv\xE1lido.").min(1).max(16, "M\xE1ximo de 16 convidados por reserva."),
  area: z.string().trim().min(2, "Selecione uma \xE1rea do restaurante.").max(120),
  occasion: z.string().trim().min(1, "A ocasi\xE3o \xE9 obrigat\xF3ria.").max(120),
  notes: z.string().trim().max(1e3, "Notas demasiado longas.").optional().default("")
}).strict();
var contactSchema = z.object({
  nome: nameField,
  email: emailField,
  assunto: z.string().trim().min(1, "O assunto \xE9 obrigat\xF3rio.").max(120),
  mensagem: z.string().trim().min(5, "A mensagem \xE9 demasiado curta.").max(5e3, "A mensagem \xE9 demasiado longa.")
}).strict();
var newsletterSchema = z.object({
  email: emailField
}).strict();
var reviewSchema = z.object({
  name: nameField,
  serviceRating: z.number().int("Classifica\xE7\xE3o inv\xE1lida.").min(1).max(5),
  foodRating: z.number().int("Classifica\xE7\xE3o inv\xE1lida.").min(1).max(5),
  ambienceRating: z.number().int("Classifica\xE7\xE3o inv\xE1lida.").min(1).max(5),
  comment: z.string().trim().min(5, "A sua opini\xE3o \xE9 demasiado curta.").max(1e3, "A opini\xE3o \xE9 demasiado longa.")
}).strict();
var reviewStatusSchema = z.object({
  status: z.enum(["approved", "pending", "rejected"], { message: "Estado inv\xE1lido." })
}).strict();
var adminLoginSchema = z.object({
  token: z.string().trim().min(1, "Introduza o token de administrador.").max(200, "Token demasiado longo.")
}).strict();
var adminTokenUpdateSchema = z.object({
  token: z.string().trim().min(16, "O token tem de ter pelo menos 16 caracteres.").max(200, "O token \xE9 demasiado longo.").regex(/[A-Z]/, "O token tem de conter pelo menos uma letra mai\xFAscula.").regex(/[a-z]/, "O token tem de conter pelo menos uma letra min\xFAscula.").regex(/[0-9]/, "O token tem de conter pelo menos um n\xFAmero.").regex(/[^A-Za-z0-9]/, "O token tem de conter pelo menos um car\xE1cter especial.")
}).strict();
var siteSettingsSchema = z.object({
  contactEmail: emailField
}).strict();
var assetUrlField = z.string().trim().min(1, "O link da imagem \xE9 obrigat\xF3rio.").max(2e3, "O link da imagem \xE9 demasiado longo.").refine((value) => /^https?:\/\//i.test(value), "O link tem de come\xE7ar por http:// ou https://.");
var imageAssetOverrideSchema = z.object({
  id: z.string().trim().min(1).max(80),
  url: assetUrlField,
  scale: z.number().min(1).max(3).optional(),
  px: z.number().min(0).max(100).optional(),
  py: z.number().min(0).max(100).optional()
}).strict();
var assetOverridesSchema = z.object({
  overrides: z.array(imageAssetOverrideSchema).max(200, "Demasiadas substitui\xE7\xF5es.")
}).strict();
var imageField = z.string().trim().max(2e3, "O link da imagem \xE9 demasiado longo.").optional().default("").refine((value) => value === "" || /^https?:\/\//i.test(value), "O link da imagem tem de come\xE7ar por http:// ou https://.");
var menuItemSchema = z.object({
  id: z.string().trim().min(1, "O identificador \xE9 obrigat\xF3rio.").max(80),
  name: z.string().trim().min(1, "O nome do prato \xE9 obrigat\xF3rio.").max(120),
  price: z.number({ invalid_type_error: "Pre\xE7o inv\xE1lido." }).nonnegative("Pre\xE7o inv\xE1lido.").max(1e4, "Pre\xE7o demasiado alto."),
  currency: z.string().trim().min(1).max(10).default("\u20AC"),
  category: z.enum(MENU_CATEGORIES, { message: "Categoria inv\xE1lida." }),
  badge: z.string().trim().max(80).optional().default(""),
  tagline: z.string().trim().max(160).optional().default(""),
  description: z.string().trim().min(1, "A descri\xE7\xE3o \xE9 obrigat\xF3ria.").max(2e3),
  imageUrl: imageField,
  dryAgedDays: z.number().int().min(0).max(300).optional(),
  servesCount: z.string().trim().max(80).optional().default(""),
  origin: z.string().trim().max(200).optional().default(""),
  pairingWine: z.string().trim().max(200).optional().default(""),
  producer: z.string().trim().max(200).optional().default(""),
  vintage: z.string().trim().max(80).optional().default(""),
  isChefSpecial: z.boolean().optional().default(false),
  dailyKind: z.enum(["carne", "peixe"]).optional(),
  visible: z.boolean().optional().default(true),
  order: z.number().int().min(0).optional()
}).strict().nullable();
var menuItemsSchema = z.object({
  items: z.array(menuItemSchema).max(300, "Demasiados pratos.")
}).strict();
var siteContentSchema = z.object({
  contactEmail: emailField,
  phone: z.string().trim().max(40).optional().default(""),
  whatsapp: z.string().trim().max(40).optional().default(""),
  address: z.string().trim().max(200).optional().default(""),
  hours: z.string().trim().max(400).optional().default(""),
  headline: z.string().trim().max(160).optional().default(""),
  heroSubtitle: z.string().trim().max(240).optional().default(""),
  aboutTitle: z.string().trim().max(160).optional().default(""),
  aboutText: z.string().trim().max(4e3).optional().default(""),
  instagram: z.string().trim().max(200).optional().default(""),
  facebook: z.string().trim().max(200).optional().default(""),
  videoUrl: z.string().trim().max(2e3).optional().default(""),
  testimonialText: z.string().trim().max(400).optional().default(""),
  testimonialName: z.string().trim().max(120).optional().default(""),
  testimonialRole: z.string().trim().max(120).optional().default(""),
  testimonialStars: z.string().trim().max(1).regex(/^[1-5]$/, "A classifica\xE7\xE3o deve ser um n\xFAmero entre 1 e 5.").optional().default("")
}).strict();
var idParamSchema = z.coerce.number().int().positive();

// server/lib/email.ts
function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
var transporterPromise = null;
function getTransporter() {
  const host = (process.env.SMTP_HOST ?? "").trim();
  if (!host) {
    return Promise.resolve(null);
  }
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const nodemailer = await import("nodemailer");
      return nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: (process.env.SMTP_SECURE ?? "").toLowerCase() === "true",
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : void 0,
        connectionTimeout: 8e3,
        greetingTimeout: 8e3,
        socketTimeout: 15e3
      });
    })();
  }
  return transporterPromise;
}
function buildConfirmationHtml(payload) {
  const lines = [
    `<div style="font-family:Georgia,serif;background:#0C0D0E;padding:32px 16px;color:#F7F5F0;">`,
    `  <div style="max-width:560px;margin:0 auto;border:1px solid #282A30;background:#141518;padding:32px;">`,
    `    <p style="font-family:monospace;letter-spacing:0.2em;color:#D4A373;font-size:12px;text-transform:uppercase;margin:0 0 8px;">Boca Maldita \xB7 Fine Dining &amp; Grill</p>`,
    `    <h1 style="font-size:28px;margin:0 0 16px;">Confirma\xE7\xE3o de reserva</h1>`,
    `    <p style="color:#A6A8AD;margin:0 0 24px;">A sua reserva foi registada. Guarde a refer\xEAncia <strong style="color:#D4A373;">${escapeHtml(payload.reference)}</strong> e apresente-a ao chegar.</p>`,
    `    <table style="width:100%;border-collapse:collapse;color:#F7F5F0;font-size:14px;">`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;width:38%;">Nome</td><td style="padding:8px 0;">${escapeHtml(payload.name)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Telefone</td><td style="padding:8px 0;">${escapeHtml(payload.phone)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Data</td><td style="padding:8px 0;">${escapeHtml(payload.date)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Hora</td><td style="padding:8px 0;">${escapeHtml(payload.time)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Convidados</td><td style="padding:8px 0;">${escapeHtml(payload.guests)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">\xC1rea</td><td style="padding:8px 0;">${escapeHtml(payload.area)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Ocasi\xE3o</td><td style="padding:8px 0;">${escapeHtml(payload.occasion)}</td></tr>`,
    payload.notes ? `      <tr><td style="padding:8px 0;color:#A6A8AD;vertical-align:top;">Notas</td><td style="padding:8px 0;">${escapeHtml(payload.notes)}</td></tr>` : "",
    `    </table>`,
    `    <p style="color:#A6A8AD;font-size:13px;margin:24px 0 0;">Rua de Vila de Prado, Vila Verde \xB7 geral@bocamaldita.pt</p>`,
    `  </div>`,
    `</div>`
  ];
  return lines.join("\n");
}
async function sendReservationConfirmation(payload) {
  const transporter = await getTransporter();
  if (!transporter) {
    console.warn("[email] SMTP n\xE3o configurado \u2014 confirma\xE7\xE3o de reserva n\xE3o enviada.");
    return false;
  }
  try {
    await transporter.sendMail({
      from: (process.env.MAIL_FROM ?? "").trim() || "Boca Maldita <smpsandro1239@gmail.com>",
      to: payload.email,
      subject: `Confirma\xE7\xE3o de reserva ${payload.reference} \u2014 Boca Maldita`,
      html: buildConfirmationHtml(payload)
    });
    console.log("[email] Confirma\xE7\xE3o enviada", payload.reference, "->", payload.email);
    return true;
  } catch (err) {
    console.error("[email] Erro ao enviar confirma\xE7\xE3o:", err);
    return false;
  }
}
function buildWelcomeHtml() {
  return [
    `<div style="font-family:Georgia,serif;background:#0C0D0E;padding:32px 16px;color:#F7F5F0;">`,
    `  <div style="max-width:560px;margin:0 auto;border:1px solid #282A30;background:#141518;padding:32px;">`,
    `    <p style="font-family:monospace;letter-spacing:0.2em;color:#D4A373;font-size:12px;text-transform:uppercase;margin:0 0 8px;">Boca Maldita \xB7 Boletim Exclusivo</p>`,
    `    <h1 style="font-size:28px;margin:0 0 16px;">Bem-vindo ao clube exclusivo</h1>`,
    `    <p style="color:#A6A8AD;margin:0 0 16px;font-size:14px;line-height:1.6;">Receber\xE1 convites priorit\xE1rios para experi\xEAncias gastron\xF3micas sazonais, cortes raros e acesso antecipado \xE0s datas mais desejadas.</p>`,
    `    <p style="color:#A6A8AD;margin:0;font-size:14px;line-height:1.6;">Fique atento \xE0 caixa de entrada \u2014 o pr\xF3ximo convite chega em breve.</p>`,
    `    <p style="color:#686B73;font-size:12px;margin:24px 0 0;">Boca Maldita \xB7 Fine Dining &amp; Grill \xB7 Avenida do C\xE1vado, Vila de Prado, Vila Verde</p>`,
    `  </div>`,
    `</div>`
  ].join("\n");
}
async function sendNewsletterWelcome(email) {
  const transporter = await getTransporter();
  if (!transporter) {
    console.warn("[email] SMTP n\xE3o configurado \u2014 boas-vindas do boletim n\xE3o enviada.");
    return false;
  }
  try {
    await transporter.sendMail({
      from: (process.env.MAIL_FROM ?? "").trim() || "Boca Maldita <smpsandro1239@gmail.com>",
      to: email,
      subject: "Bem-vindo ao Boletim Exclusivo \u2014 Boca Maldita",
      html: buildWelcomeHtml()
    });
    return true;
  } catch (err) {
    console.error("[email] Erro ao enviar boas-vindas do boletim:", err);
    return false;
  }
}
function getAdminInbox() {
  const contactEmail = (process.env.SITE_CONTACT_EMAIL ?? "").trim();
  if (contactEmail) return contactEmail;
  const from = (process.env.MAIL_FROM ?? "").trim();
  const match = /<([^>]+)>/.exec(from);
  if (match) return match[1];
  const fallback = from || "smpsandro1239@gmail.com";
  return fallback;
}
function buildContactHtml(payload) {
  return [
    `<div style="font-family:Georgia,serif;background:#0C0D0E;padding:32px 16px;color:#F7F5F0;">`,
    `  <div style="max-width:560px;margin:0 auto;border:1px solid #282A30;background:#141518;padding:32px;">`,
    `    <p style="font-family:monospace;letter-spacing:0.2em;color:#D4A373;font-size:12px;text-transform:uppercase;margin:0 0 8px;">Boca Maldita \xB7 Nova Mensagem de Contacto</p>`,
    `    <h1 style="font-size:24px;margin:0 0 16px;">${escapeHtml(payload.assunto)}</h1>`,
    `    <table style="width:100%;border-collapse:collapse;color:#F7F5F0;font-size:14px;">`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;width:38%;">Nome</td><td style="padding:8px 0;">${escapeHtml(payload.nome)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Email</td><td style="padding:8px 0;">${escapeHtml(payload.email)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;vertical-align:top;">Mensagem</td><td style="padding:8px 0;white-space:pre-line;">${escapeHtml(payload.mensagem)}</td></tr>`,
    `    </table>`,
    `    <p style="color:#A6A8AD;font-size:13px;margin:24px 0 0;">Responda diretamente a este email para contactar o remetente.</p>`,
    `  </div>`,
    `</div>`
  ].join("\n");
}
async function sendContactNotification(payload) {
  const transporter = await getTransporter();
  if (!transporter) {
    console.warn("[email] SMTP n\xE3o configurado \u2014 notifica\xE7\xE3o de contacto n\xE3o enviada.");
    return false;
  }
  try {
    await transporter.sendMail({
      from: (process.env.MAIL_FROM ?? "").trim() || "Boca Maldita <smpsandro1239@gmail.com>",
      to: getAdminInbox(),
      subject: `Nova mensagem de ${payload.nome} \u2014 ${payload.assunto}`,
      html: buildContactHtml(payload)
    });
    return true;
  } catch (err) {
    console.error("[email] Erro ao enviar notifica\xE7\xE3o de contacto:", err);
    return false;
  }
}
function buildReservationAdminHtml(payload) {
  return [
    `<div style="font-family:Georgia,serif;background:#0C0D0E;padding:32px 16px;color:#F7F5F0;">`,
    `  <div style="max-width:560px;margin:0 auto;border:1px solid #282A30;background:#141518;padding:32px;">`,
    `    <p style="font-family:monospace;letter-spacing:0.2em;color:#D4A373;font-size:12px;text-transform:uppercase;margin:0 0 8px;">Boca Maldita \xB7 Novo Pedido de Reserva</p>`,
    `    <h1 style="font-size:24px;margin:0 0 8px;">Reserva ${escapeHtml(payload.reference)}</h1>`,
    `    <p style="color:#A6A8AD;margin:0 0 20px;font-size:13px;">Ver detalhes e gerir a reserva no painel de administra\xE7\xE3o.</p>`,
    `    <table style="width:100%;border-collapse:collapse;color:#F7F5F0;font-size:14px;">`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;width:38%;">Nome</td><td style="padding:8px 0;">${escapeHtml(payload.name)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Email</td><td style="padding:8px 0;">${escapeHtml(payload.email)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Telefone</td><td style="padding:8px 0;">${escapeHtml(payload.phone)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Data</td><td style="padding:8px 0;">${escapeHtml(payload.date)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Hora</td><td style="padding:8px 0;">${escapeHtml(payload.time)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Convidados</td><td style="padding:8px 0;">${escapeHtml(payload.guests)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">\xC1rea</td><td style="padding:8px 0;">${escapeHtml(payload.area)}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Ocasi\xE3o</td><td style="padding:8px 0;">${escapeHtml(payload.occasion)}</td></tr>`,
    payload.notes ? `      <tr><td style="padding:8px 0;color:#A6A8AD;vertical-align:top;">Notas</td><td style="padding:8px 0;white-space:pre-line;">${escapeHtml(payload.notes)}</td></tr>` : "",
    `    </table>`,
    `  </div>`,
    `</div>`
  ].join("\n");
}
async function sendReservationAdminNotification(payload) {
  const transporter = await getTransporter();
  if (!transporter) {
    console.warn("[email] SMTP n\xE3o configurado \u2014 notifica\xE7\xE3o de reserva n\xE3o enviada.");
    return false;
  }
  try {
    await transporter.sendMail({
      from: (process.env.MAIL_FROM ?? "").trim() || "Boca Maldita <smpsandro1239@gmail.com>",
      to: getAdminInbox(),
      subject: `Nova reserva ${payload.reference} \u2014 ${payload.name} \u2014 ${payload.date} ${payload.time}`,
      html: buildReservationAdminHtml(payload)
    });
    console.log("[email] Notifica\xE7\xE3o de reserva enviada", payload.reference, "->", getAdminInbox());
    return true;
  } catch (err) {
    console.error("[email] Erro ao enviar notifica\xE7\xE3o de reserva:", err);
    return false;
  }
}
var REPEAT_LABELS_EMAIL = {
  none: "Data \xFAnica",
  weekly: "Repete todas as semanas",
  yearly: "Repete todos os anos"
};
function buildClosedDayConflictHtml(payload) {
  const rowsHtml = payload.rows.map(
    (row) => `      <tr><td style="padding:8px 0;color:#A6A8AD;">${escapeHtml(row.date)}</td><td style="padding:8px 0;color:#F7F5F0;font-family:monospace;">${escapeHtml(row.reference)}</td><td style="padding:8px 0;color:#F7F5F0;">${escapeHtml(row.name)}</td><td style="padding:8px 0;color:#F7F5F0;">${escapeHtml(row.time)}</td><td style="padding:8px 0;color:#F7F5F0;">${escapeHtml(row.guests)}</td></tr>`
  ).join("\n");
  return [
    `<div style="font-family:Georgia,serif;background:#0C0D0E;padding:32px 16px;color:#F7F5F0;">`,
    `  <div style="max-width:560px;margin:0 auto;border:1px solid #7C2D12;background:#1C1917;padding:32px;">`,
    `    <p style="font-family:monospace;letter-spacing:0.2em;color:#FB923C;font-size:12px;text-transform:uppercase;margin:0 0 8px;">Boca Maldita \xB7 Alerta de Conflito</p>`,
    `    <h1 style="font-size:24px;margin:0 0 12px;">\u26A0 Marcou um dia fechado com reservas ativas</h1>`,
    `    <p style="color:#A6A8AD;margin:0 0 20px;font-size:14px;line-height:1.6;">Marcou o per\xEDodo <strong style="color:#F7F5F0;">\u201C${escapeHtml(payload.title)}\u201D</strong> como fechado, mas existem <strong style="color:#FB923C;">${payload.total} reserva${payload.total === 1 ? "" : "s"}</strong> nesse per\xEDodo. Confirme no painel de administra\xE7\xE3o se deseja contactar estas pessoas ou ajustar a data.</p>`,
    `    <table style="width:100%;border-collapse:collapse;color:#F7F5F0;font-size:13px;">`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;width:38%;">Per\xEDodo</td><td style="padding:8px 0;">${escapeHtml(payload.startDate)}${payload.endDate ? ` \u2192 ${escapeHtml(payload.endDate)}` : ""}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Repeti\xE7\xE3o</td><td style="padding:8px 0;">${escapeHtml(REPEAT_LABELS_EMAIL[payload.repeat] ?? payload.repeat)}</td></tr>`,
    `    </table>`,
    `    <table style="width:100%;border-collapse:collapse;color:#F7F5F0;font-size:13px;margin-top:8px;border-top:1px solid #282A30;">`,
    `      <thead><tr><td style="padding:8px 0;color:#A6A8AD;border-bottom:1px solid #282A30;">Data</td><td style="padding:8px 0;color:#A6A8AD;border-bottom:1px solid #282A30;">Ref.</td><td style="padding:8px 0;color:#A6A8AD;border-bottom:1px solid #282A30;">Nome</td><td style="padding:8px 0;color:#A6A8AD;border-bottom:1px solid #282A30;">Hora</td><td style="padding:8px 0;color:#A6A8AD;border-bottom:1px solid #282A30;">Pessoas</td></tr></thead>`,
    `      <tbody>`,
    rowsHtml,
    `      </tbody>`,
    `    </table>`,
    `    <p style="color:#A6A8AD;font-size:13px;margin:24px 0 0;">As reservas online nesse(s) dia(s) ficaram bloqueadas a partir de agora. Este alerta n\xE3o bloqueia reservas j\xE1 registadas \u2014 resolva cada caso no separador Reservas.</p>`,
    `  </div>`,
    `</div>`
  ].join("\n");
}
async function sendClosedDayConflictEmail(payload) {
  const transporter = await getTransporter();
  if (!transporter) {
    console.warn("[email] SMTP n\xE3o configurado \u2014 alerta de conflito n\xE3o enviado.");
    return false;
  }
  try {
    await transporter.sendMail({
      from: (process.env.MAIL_FROM ?? "").trim() || "Boca Maldita <smpsandro1239@gmail.com>",
      to: getAdminInbox(),
      subject: `\u26A0 Alerta: ${payload.total} reserva${payload.total === 1 ? "" : "s"} num dia fechado (\u201C${payload.title}\u201D) \u2014 Boca Maldita`,
      html: buildClosedDayConflictHtml(payload)
    });
    return true;
  } catch (err) {
    console.error("[email] Erro ao enviar alerta de conflito:", err);
    return false;
  }
}

// server/lib/blockedDates.ts
function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return { year, month, day };
}
function isDateBlocked(date, period) {
  const end = period.end_date && period.end_date >= period.start_date ? period.end_date : period.start_date;
  if (period.repeat === "weekly") {
    const dayOfWeek = (dateKey) => {
      const { year, month, day } = parseDateKey(dateKey);
      return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    };
    const startDow = dayOfWeek(period.start_date);
    const spanDays = Math.round(
      (new Date(Date.UTC(parseDateKey(end).year, parseDateKey(end).month - 1, parseDateKey(end).day)).getTime() - new Date(Date.UTC(parseDateKey(period.start_date).year, parseDateKey(period.start_date).month - 1, parseDateKey(period.start_date).day)).getTime()) / 864e5
    );
    const rel = (dayOfWeek(date) - startDow + 7) % 7;
    return rel <= spanDays;
  }
  if (period.repeat === "yearly") {
    const { month, day } = parseDateKey(date);
    const s = parseDateKey(period.start_date);
    const e = parseDateKey(end);
    const key = (m, d) => m * 100 + d;
    const sd = key(s.month, s.day);
    const ed = key(e.month, e.day);
    const cd = key(month, day);
    if (sd <= ed) return cd >= sd && cd <= ed;
    return cd >= sd || cd <= ed;
  }
  return date >= period.start_date && date <= end;
}

// server/lib/closedPeriodConflicts.ts
function reservationDateKey(date) {
  return String(date).split(/[T ]/)[0] || String(date);
}
function findClosedPeriodConflicts(reservations, period) {
  const rows = reservations.filter((r) => isDateBlocked(reservationDateKey(r.date), period)).map((r) => ({
    reference: r.reference,
    name: r.name,
    date: reservationDateKey(r.date),
    time: r.time,
    guests: r.guests
  })).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  const byDate = /* @__PURE__ */ new Map();
  for (const row of rows) {
    byDate.set(row.date, (byDate.get(row.date) ?? 0) + 1);
  }
  const dates = [...byDate.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
  return { total: rows.length, rows, dates };
}

// server/lib/checkExpression.ts
function solveCheckExpression(expression) {
  const match = /^\s*(\d{1,3})\s*([+-])\s*(\d{1,3})\s*$/.exec(expression);
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[3]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return match[2] === "+" ? a + b : a - b;
}

// server/lib/diarias.ts
var LUNCH_CUTOFF_HOUR = 16;
var RESTAURANT_TIME_ZONE = "Europe/Lisbon";
var lisbonFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: RESTAURANT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23"
});
function lisbonParts(now) {
  const parts = lisbonFormatter.formatToParts(now);
  const get = (type) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour")
  };
}
function currentMeal(now = /* @__PURE__ */ new Date()) {
  return lisbonParts(now).hour < LUNCH_CUTOFF_HOUR ? "lunch" : "dinner";
}
function parseDateKey2(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}
function diffDays(from, to) {
  return Math.round((parseDateKey2(to).getTime() - parseDateKey2(from).getTime()) / 864e5);
}
function todayKey(now = /* @__PURE__ */ new Date()) {
  const { year, month, day } = lisbonParts(now);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
function scheduleAppliesOn(schedule, date) {
  if (date < schedule.anchorDate) return false;
  if (date < schedule.activeFrom) return false;
  if (schedule.activeTo && date > schedule.activeTo) return false;
  switch (schedule.repeat) {
    case "none":
      return date === schedule.anchorDate;
    case "weekly":
      return diffDays(schedule.anchorDate, date) % 7 === 0;
    case "biweekly":
      return diffDays(schedule.anchorDate, date) % 14 === 0;
    case "monthly": {
      const anchor = parseDateKey2(schedule.anchorDate);
      const day = parseDateKey2(date);
      return day.getDate() === anchor.getDate();
    }
  }
}
function resolveDiariasDay(schedules, menuItems, date) {
  const byId = /* @__PURE__ */ new Map();
  for (const item of menuItems) {
    if (item.visible === false) continue;
    byId.set(item.id, item);
  }
  const lunch = [];
  const dinner = [];
  const seenLunch = /* @__PURE__ */ new Set();
  const seenDinner = /* @__PURE__ */ new Set();
  let hasSchedule = false;
  let lunchServed = false;
  let dinnerServed = false;
  for (const schedule of schedules) {
    if (!scheduleAppliesOn(schedule, date)) continue;
    hasSchedule = true;
    if (schedule.lunch) lunchServed = true;
    if (schedule.dinner) dinnerServed = true;
    for (const id of schedule.itemIds) {
      const item = byId.get(id);
      if (!item) continue;
      if (schedule.lunch && !seenLunch.has(id)) {
        seenLunch.add(id);
        lunch.push(item);
      }
      if (schedule.dinner && !seenDinner.has(id)) {
        seenDinner.add(id);
        dinner.push(item);
      }
      if (lunch.length >= 4 && dinner.length >= 4) break;
    }
  }
  return {
    lunch: lunch.slice(0, 4),
    dinner: dinner.slice(0, 4),
    hasSchedule,
    servedMeals: { lunch: lunchServed, dinner: dinnerServed }
  };
}
function isDiariaSchedule(value) {
  if (!value || typeof value !== "object") return false;
  const record = value;
  return typeof record.id === "string" && typeof record.anchorDate === "string" && typeof record.repeat === "string" && typeof record.activeFrom === "string" && (record.activeTo === null || typeof record.activeTo === "string") && typeof record.lunch === "boolean" && typeof record.dinner === "boolean" && Array.isArray(record.itemIds);
}
function normalizeDiariaSchedule(value) {
  if (!isDiariaSchedule(value)) return null;
  const record = value;
  return {
    ...record,
    activeTo: record.activeTo || null,
    itemIds: record.itemIds.filter((id) => typeof id === "string" && id.trim().length > 0).slice(0, 4)
  };
}
var DEFAULT_DIARIA_ITEM_IDS = [
  "diaria-bife-minhota",
  "diaria-pescada-minhota",
  "diaria-frango-churrasco",
  "diaria-sardinha-assada"
];
var SEED_ANCHOR_MONDAY = "2024-01-01";
function buildDefaultDiariaSchedules() {
  return [0, 1, 2, 3, 4].map((offset) => {
    const anchorDate = /* @__PURE__ */ new Date(`${SEED_ANCHOR_MONDAY}T12:00:00Z`);
    anchorDate.setUTCDate(anchorDate.getUTCDate() + offset);
    const date = anchorDate.toISOString().slice(0, 10);
    return {
      id: `default-${date}`,
      anchorDate: date,
      repeat: "weekly",
      activeFrom: date,
      activeTo: null,
      lunch: true,
      dinner: false,
      itemIds: [...DEFAULT_DIARIA_ITEM_IDS]
    };
  });
}

// server/lib/auth.ts
import { randomBytes, timingSafeEqual } from "node:crypto";
var SESSION_COOKIE = "bmtauth";
var CSRF_COOKIE = "bmcsrf";
var SESSIONS_KEY = "admin_sessions";
var SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1e3;
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const raw = part.slice(eq + 1).trim();
    if (!key || !raw) continue;
    try {
      out[key] = decodeURIComponent(raw);
    } catch {
      out[key] = raw;
    }
  }
  return out;
}
function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
async function purgeExpiredSessions(store) {
  const stored = await store.getSetting(SESSIONS_KEY);
  if (!stored) return {};
  let map;
  try {
    map = JSON.parse(stored);
  } catch {
    await store.deleteSetting(SESSIONS_KEY);
    return {};
  }
  const now = Date.now();
  const live = {};
  let changed = false;
  for (const [sid, entry] of Object.entries(map)) {
    if (entry && typeof entry.createdAt === "number" && now - entry.createdAt < SESSION_TTL_MS) {
      live[sid] = entry;
    } else {
      changed = true;
    }
  }
  if (changed) {
    if (Object.keys(live).length === 0) await store.deleteSetting(SESSIONS_KEY);
    else await store.setSetting(SESSIONS_KEY, JSON.stringify(live));
  }
  return live;
}
async function getSession(store, sid) {
  const map = await purgeExpiredSessions(store);
  const entry = map[sid];
  if (!entry) return null;
  if (Date.now() - entry.createdAt >= SESSION_TTL_MS) return null;
  return entry;
}
async function createSession(store) {
  const map = await purgeExpiredSessions(store);
  const sid = randomBytes(24).toString("base64url");
  const csrf = randomBytes(24).toString("base64url");
  map[sid] = { csrf, createdAt: Date.now() };
  await store.setSetting(SESSIONS_KEY, JSON.stringify(map));
  return { sid, csrf };
}
async function deleteSession(store, sid) {
  const map = await purgeExpiredSessions(store);
  if (!map[sid]) return;
  delete map[sid];
  await store.setSetting(SESSIONS_KEY, JSON.stringify(map));
}
async function destroyAllSessions(store) {
  await store.deleteSetting(SESSIONS_KEY);
}
async function requireAdmin(req, res, store, getEffectiveToken, opts) {
  const sid = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (sid) {
    const session = await getSession(store, sid);
    if (session) {
      if (opts.requireCsrf) {
        const csrf = req.headers["x-csrf-token"];
        if (typeof csrf !== "string" || !csrf || !timingSafeEqualStr(csrf, session.csrf)) {
          res.status(403).json({ error: "Token CSRF inv\xE1lido." });
          return null;
        }
      }
      return { via: "cookie" };
    }
  }
  const header = req.headers["x-admin-token"];
  if (typeof header === "string" && header.trim()) {
    const effectiveToken2 = await getEffectiveToken();
    if (timingSafeEqualStr(header.trim(), effectiveToken2)) {
      return { via: "header" };
    }
  }
  const effectiveToken = await getEffectiveToken();
  if (effectiveToken) {
    res.status(401).json({ error: "Sess\xE3o expirada ou token inv\xE1lido." });
  } else {
    res.status(503).json({
      error: "Administra\xE7\xE3o desativada: defina a vari\xE1vel ADMIN_TOKEN no servidor."
    });
  }
  return null;
}

// server/lib/app.ts
var distDir = "";
if (!process.env.VERCEL) {
  distDir = path2.resolve(process.cwd(), "dist");
}
var IMAGE_OVERRIDES_KEY = "image_asset_overrides";
var SITE_CONTACT_EMAIL_KEY = "site_contact_email";
var MENU_ITEMS_KEY = "menu_items";
var SITE_CONTENT_KEY = "site_content";
var RESERVATION_PROTECTION_KEY = "reservation_protection";
var ADMIN_TOKEN_KEY = "admin_token";
var DIARIA_SCHEDULES_KEY = "diaria_schedules";
var DEFAULT_CONTACT_EMAIL = (process.env.SITE_CONTACT_EMAIL ?? "").trim() || "smpsandro1239@gmail.com";
var RATE_WINDOW_MS = 15 * 60 * 1e3;
var RATE_MAX_HITS = 5;
async function getPublicClosedPeriods(storage) {
  const rows = await storage.listClosedPeriods();
  return rows.map((r) => ({
    title: r.title,
    startDate: r.start_date,
    ...r.end_date && r.end_date !== r.start_date ? { endDate: r.end_date } : {},
    repeat: r.repeat
  }));
}
async function getClosedPeriodForDate(storage, date) {
  const periods = await storage.listClosedPeriods();
  for (const period of periods) {
    if (isDateBlocked(date, period)) {
      return { title: period.title };
    }
  }
  return null;
}
async function getDiariaSchedules(storage) {
  const raw = await storage.getSetting(DIARIA_SCHEDULES_KEY);
  if (raw === null || raw === void 0 || raw === "") return buildDefaultDiariaSchedules();
  try {
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [];
    const out = [];
    for (const value of list) {
      const normalized = normalizeDiariaSchedule(value);
      if (normalized) out.push(normalized);
    }
    return out;
  } catch {
    return buildDefaultDiariaSchedules();
  }
}
async function saveDiariaSchedules(storage, schedules) {
  await storage.setSetting(DIARIA_SCHEDULES_KEY, JSON.stringify(schedules));
}
async function getMenuItemsForApi(storage) {
  const raw = await storage.getSetting(MENU_ITEMS_KEY);
  const items = raw ? parseStoredJson(raw).items : null;
  if (!Array.isArray(items)) return [];
  return items.filter(
    (item) => !!item && typeof item === "object" && typeof item.id === "string"
  ).map((item) => ({ id: item.id, visible: item.visible }));
}
var DEFAULT_RESERVATION_PROTECTION = {
  enabled: false,
  pauseForm: false,
  dailyCapacity: 40,
  maxPerClient: 2,
  rateLimit: true,
  requireCheck: true
};
var DEFAULT_SITE_CONTENT = {
  contactEmail: DEFAULT_CONTACT_EMAIL,
  phone: "+351 253 031 890",
  whatsapp: "",
  address: "",
  hours: "",
  headline: "",
  heroSubtitle: "",
  aboutTitle: "",
  aboutText: "",
  instagram: "https://www.instagram.com/bocamaldita/",
  facebook: "https://web.facebook.com/malditaboca",
  videoUrl: "https://www.facebook.com/malditaboca/videos/at%C3%A9-j%C3%A1-/758681031592904/",
  testimonialText: "Uma experi\xEAncia carn\xEDvora inesquec\xEDvel em Vila de Prado. O ponto da carne maturada e os aromas a lenha s\xE3o de uma perfei\xE7\xE3o rara.",
  testimonialName: "In\xEAs Barreto",
  testimonialRole: "Cr\xEDtica Gastron\xF3mica",
  testimonialStars: "5"
};
function parseStoredJson(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd) {
    const first = fwd.split(",")[0].trim();
    if (first) return first;
  }
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}
function parseReservationProtection(raw) {
  const parsed = parseStoredJson(raw);
  return {
    enabled: parsed.enabled === true,
    pauseForm: parsed.pauseForm === true,
    dailyCapacity: typeof parsed.dailyCapacity === "number" && parsed.dailyCapacity > 0 ? parsed.dailyCapacity : DEFAULT_RESERVATION_PROTECTION.dailyCapacity,
    maxPerClient: typeof parsed.maxPerClient === "number" && parsed.maxPerClient > 0 ? parsed.maxPerClient : DEFAULT_RESERVATION_PROTECTION.maxPerClient,
    rateLimit: parsed.rateLimit !== false,
    requireCheck: parsed.requireCheck !== false
  };
}
async function getReservationProtection(storage) {
  const raw = await storage.getSetting(RESERVATION_PROTECTION_KEY);
  return parseReservationProtection(raw);
}
var adminToken = (process.env.ADMIN_TOKEN ?? "").trim();
async function getEffectiveAdminToken(storage) {
  const stored = await storage.getSetting(ADMIN_TOKEN_KEY);
  return stored?.trim() || adminToken;
}
async function createApp() {
  let storage;
  try {
    storage = await createStorage();
    await storage.init();
  } catch (err) {
    console.error("[app] Falha ao inicializar armazenamento \u2014 a usar mem\xF3ria:", err);
    storage = createMemoryStorage();
  }
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "200kb" }));
  const ipHits = /* @__PURE__ */ new Map();
  function allowIpHit(ip) {
    if (!ip) return true;
    const now = Date.now();
    const entry = ipHits.get(ip);
    if (!entry || now - entry.startedAt >= RATE_WINDOW_MS) {
      ipHits.set(ip, { count: 1, startedAt: now });
      return true;
    }
    entry.count += 1;
    return entry.count <= RATE_MAX_HITS;
  }
  const loginHits = /* @__PURE__ */ new Map();
  function allowLoginHit(ip) {
    if (!ip) return true;
    const now = Date.now();
    const entry = loginHits.get(ip);
    if (!entry || now - entry.startedAt >= RATE_WINDOW_MS) {
      loginHits.set(ip, { count: 1, startedAt: now });
      return true;
    }
    entry.count += 1;
    return entry.count <= RATE_MAX_HITS;
  }
  app.use((req, res, next) => {
    const allowed = process.env.APP_URL ?? "http://localhost:3000";
    const origin = req.headers.origin;
    const isLocal = origin && (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:"));
    if (origin && (origin === allowed || isLocal)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Admin-Token");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
    } else {
      next();
    }
  });
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", database: storage.isOpen() });
  });
  app.get("/api/reservations-config", async (_req, res, next) => {
    try {
      const protection = await getReservationProtection(storage);
      const closedPeriods = await getPublicClosedPeriods(storage);
      res.json({
        protectionEnabled: protection.enabled,
        paused: protection.enabled && protection.pauseForm,
        requireCheck: protection.enabled && protection.requireCheck,
        closedPeriods
      });
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/reservations", async (req, res, next) => {
    try {
      const parsed = reservationSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const closed = await getClosedPeriodForDate(storage, parsed.data.date);
      if (closed) {
        return res.status(423).json({
          error: `N\xE3o \xE9 poss\xEDvel reservar para esta data: ${closed.title}. Escolha outro dia ou ligue ${DEFAULT_SITE_CONTENT.phone}.`
        });
      }
      const protection = await getReservationProtection(storage);
      let ip;
      if (protection.enabled) {
        ip = getClientIp(req);
        if (protection.pauseForm) {
          return res.status(423).json({
            error: `As reservas online est\xE3o temporariamente pausadas. Ligue ${DEFAULT_SITE_CONTENT.phone} para reservar.`
          });
        }
        if (protection.requireCheck) {
          const answer = solveCheckExpression(parsed.data.checkQuestion);
          const checkOk = answer !== null && Number(parsed.data.check) === answer;
          const honeypotEmpty = !parsed.data.honeypot;
          if (!checkOk || !honeypotEmpty) {
            return res.status(400).json({ error: "Verifica\xE7\xE3o anti-rob\xF4 incorreta. Tente de novo." });
          }
        }
        if (protection.rateLimit && !allowIpHit(ip)) {
          return res.status(429).json({ error: "Demasiados pedidos de reserva. Aguarde alguns minutos." });
        }
        if (await storage.countByDate(parsed.data.date) >= protection.dailyCapacity) {
          return res.status(409).json({ error: `Lota\xE7\xE3o esgotada para esta data. Tente outra data ou ligue ${DEFAULT_SITE_CONTENT.phone}.` });
        }
        if (await storage.countByClientOnDate(parsed.data.date, parsed.data.email, parsed.data.phone) >= protection.maxPerClient) {
          return res.status(409).json({ error: "J\xE1 existem reservas para esta data com este contacto." });
        }
      }
      const { id, reference } = await storage.createReservation(parsed.data, { ip });
      await Promise.all([
        sendReservationConfirmation({ ...parsed.data, reference }).catch((err) => {
          console.error("[email] Falha no envio de confirma\xE7\xE3o:", err);
        }),
        sendReservationAdminNotification({ ...parsed.data, reference }).catch((err) => {
          console.error("[email] Falha no envio de notifica\xE7\xE3o de reserva:", err);
        })
      ]);
      res.status(201).json({ id, reference });
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/contacts", async (req, res, next) => {
    try {
      const parsed = contactSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      if (!allowIpHit(getClientIp(req))) {
        return res.status(429).json({ error: "Demasiados pedidos de contacto. Aguarde alguns minutos." });
      }
      const { id } = await storage.createContact(parsed.data);
      await sendContactNotification({
        nome: parsed.data.nome ?? "",
        email: parsed.data.email ?? "",
        assunto: parsed.data.assunto ?? "",
        mensagem: parsed.data.mensagem ?? ""
      }).catch((err) => {
        console.error("[email] Falha no envio de notifica\xE7\xE3o de contacto:", err);
      });
      res.status(201).json({ id });
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/newsletter", async (req, res, next) => {
    try {
      const parsed = newsletterSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      if (await storage.hasNewsletter(parsed.data.email)) {
        return res.status(409).json({ error: "Este email j\xE1 est\xE1 subscrito no boletim." });
      }
      if (!allowIpHit(getClientIp(req))) {
        return res.status(429).json({ error: "Demasiadas subscri\xE7\xF5es. Aguarde alguns minutos." });
      }
      const { id } = await storage.createNewsletter(parsed.data);
      await sendNewsletterWelcome(parsed.data.email).catch((err) => {
        console.error("[email] Falha no envio de boas-vindas do boletim:", err);
      });
      res.status(201).json({ id });
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/site", async (_req, res, next) => {
    try {
      const contactEmail = await storage.getSetting(SITE_CONTACT_EMAIL_KEY) ?? DEFAULT_CONTACT_EMAIL;
      res.json({ contactEmail });
    } catch (err) {
      next(err);
    }
  });
  app.put("/api/site", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      const parsed = siteSettingsSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      await storage.setSetting(SITE_CONTACT_EMAIL_KEY, parsed.data.contactEmail);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/admin/login", async (req, res, next) => {
    try {
      const ip = getClientIp(req);
      if (!allowLoginHit(ip)) {
        return res.status(429).json({ error: "Demasiadas tentativas de login. Aguarde alguns minutos." });
      }
      const parsed = adminLoginSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: "Introduza o token de administrador." });
      }
      const effective = await getEffectiveAdminToken(storage);
      if (!effective || !timingSafeEqualStr(parsed.data.token, effective)) {
        return res.status(401).json({ error: "Token de administrador inv\xE1lido." });
      }
      const { sid, csrf } = await createSession(storage);
      res.cookie(SESSION_COOKIE, sid, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: SESSION_TTL_MS
      });
      res.cookie(CSRF_COOKIE, csrf, {
        httpOnly: false,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: SESSION_TTL_MS
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/admin/session", async (req, res) => {
    const identity = await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: false });
    if (!identity) return;
    res.json({ authenticated: true });
  });
  app.post("/api/admin/logout", async (req, res) => {
    const sid = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (sid) await deleteSession(storage, sid);
    res.cookie(SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0, expires: /* @__PURE__ */ new Date(0) });
    res.cookie(CSRF_COOKIE, "", { httpOnly: false, secure: true, sameSite: "strict", path: "/", maxAge: 0, expires: /* @__PURE__ */ new Date(0) });
    res.json({ ok: true });
  });
  app.get("/api/admin/verify-token", async (req, res) => {
    if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: false })) return;
    res.json({ ok: true });
  });
  app.get("/api/admin/assets", async (_req, res, next) => {
    try {
      const effective = await getEffectiveAdminToken(storage);
      const raw = await storage.getSetting(IMAGE_OVERRIDES_KEY);
      const stored = parseStoredJson(raw);
      const overrides = {};
      for (const [id, value] of Object.entries(stored)) {
        overrides[id] = typeof value === "string" ? { url: value } : value;
      }
      res.json({ enabled: effective !== "", overrides });
    } catch (err) {
      next(err);
    }
  });
  app.put("/api/admin/assets", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      const parsed = assetOverridesSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const overrides = {};
      for (const item of parsed.data.overrides) {
        const entry = { url: item.url };
        if (item.scale != null) entry.scale = item.scale;
        if (item.px != null) entry.px = item.px;
        if (item.py != null) entry.py = item.py;
        overrides[item.id] = entry;
      }
      await storage.setSetting(IMAGE_OVERRIDES_KEY, JSON.stringify(overrides));
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
  app.delete("/api/admin/assets", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      await storage.deleteSetting(IMAGE_OVERRIDES_KEY);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/menus", async (_req, res, next) => {
    try {
      const raw = await storage.getSetting(MENU_ITEMS_KEY);
      const items = raw ? parseStoredJson(raw).items : null;
      res.json({ items: Array.isArray(items) ? items : null });
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/diarias", async (req, res, next) => {
    try {
      const queryDate = typeof req.query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date) ? req.query.date : todayKey();
      const schedules = await getDiariaSchedules(storage);
      const menuItems = await getMenuItemsForApi(storage);
      const resolved = resolveDiariasDay(schedules, menuItems, queryDate);
      const closed = await getClosedPeriodForDate(storage, queryDate);
      res.json({
        date: queryDate,
        currentMeal: closed ? "closed" : currentMeal(),
        lunch: resolved.lunch,
        dinner: resolved.dinner,
        hasSchedule: resolved.hasSchedule,
        servedMeals: resolved.servedMeals,
        closedTitle: closed?.title ?? null
      });
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/admin/menus", async (_req, res, next) => {
    try {
      const raw = await storage.getSetting(MENU_ITEMS_KEY);
      const items = raw ? parseStoredJson(raw).items : null;
      res.json({ items: Array.isArray(items) ? items : null });
    } catch (err) {
      next(err);
    }
  });
  app.put("/api/admin/menus", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      const parsed = menuItemsSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      await storage.setSetting(
        MENU_ITEMS_KEY,
        JSON.stringify({ items: parsed.data.items.filter((item) => item !== null) })
      );
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
  app.delete("/api/admin/menus", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      await storage.deleteSetting(MENU_ITEMS_KEY);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/admin/diarias", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      res.json({ schedules: await getDiariaSchedules(storage) });
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/admin/diarias", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      const parsed = diariaScheduleSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const schedules = await getDiariaSchedules(storage);
      const schedule = {
        id: `diaria_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        anchorDate: parsed.data.anchorDate,
        repeat: parsed.data.repeat,
        activeFrom: parsed.data.activeFrom,
        activeTo: parsed.data.activeTo,
        lunch: parsed.data.lunch,
        dinner: parsed.data.dinner,
        itemIds: parsed.data.itemIds.slice(0, 4)
      };
      schedules.push(schedule);
      await saveDiariaSchedules(storage, schedules);
      res.json({ ok: true, schedule });
    } catch (err) {
      next(err);
    }
  });
  app.put("/api/admin/diarias/:id", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      const parsed = diariaScheduleSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const id = String(req.params.id ?? "");
      const schedules = await getDiariaSchedules(storage);
      const index = schedules.findIndex((s) => s.id === id);
      if (index === -1) {
        return res.status(404).json({ error: "Agendamento n\xE3o encontrado." });
      }
      const schedule = {
        id,
        anchorDate: parsed.data.anchorDate,
        repeat: parsed.data.repeat,
        activeFrom: parsed.data.activeFrom,
        activeTo: parsed.data.activeTo,
        lunch: parsed.data.lunch,
        dinner: parsed.data.dinner,
        itemIds: parsed.data.itemIds.slice(0, 4)
      };
      schedules[index] = schedule;
      await saveDiariaSchedules(storage, schedules);
      res.json({ ok: true, schedule });
    } catch (err) {
      next(err);
    }
  });
  app.delete("/api/admin/diarias/:id", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      const id = String(req.params.id ?? "");
      const schedules = await getDiariaSchedules(storage);
      const filtered = schedules.filter((s) => s.id !== id);
      if (filtered.length === schedules.length) {
        return res.status(404).json({ error: "Agendamento n\xE3o encontrado." });
      }
      await saveDiariaSchedules(storage, filtered);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/site-content", async (_req, res, next) => {
    try {
      const stored = parseStoredJson(await storage.getSetting(SITE_CONTENT_KEY));
      const contactEmail = await storage.getSetting(SITE_CONTACT_EMAIL_KEY) ?? DEFAULT_CONTACT_EMAIL;
      const merged = {};
      for (const key of Object.keys(DEFAULT_SITE_CONTENT)) {
        const value = stored?.[key];
        merged[key] = typeof value === "string" && value.trim() ? value : DEFAULT_SITE_CONTENT[key];
      }
      merged.contactEmail = contactEmail || DEFAULT_SITE_CONTENT.contactEmail;
      res.json(merged);
    } catch (err) {
      next(err);
    }
  });
  app.put("/api/admin/site-content", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      const parsed = siteContentSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      await storage.setSetting(SITE_CONTENT_KEY, JSON.stringify(parsed.data));
      await storage.setSetting(SITE_CONTACT_EMAIL_KEY, parsed.data.contactEmail);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/admin/reservation-protection", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      res.json(await getReservationProtection(storage));
    } catch (err) {
      next(err);
    }
  });
  app.put("/api/admin/reservation-protection", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      const parsed = reservationProtectionSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      await storage.setSetting(RESERVATION_PROTECTION_KEY, JSON.stringify(parsed.data));
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/admin/reservations", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      res.json({ items: await storage.listReservations() });
    } catch (err) {
      next(err);
    }
  });
  app.delete("/api/admin/reservations/:id", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      const idResult = idParamSchema.safeParse(req.params.id);
      if (!idResult.success) {
        return res.status(400).json({ error: "ID inv\xE1lido." });
      }
      res.json({ ok: await storage.deleteReservation(idResult.data) });
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/admin/reservations", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      const parsed = adminReservationSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const { id, reference } = await storage.createReservation(parsed.data);
      res.status(201).json({ id, reference });
    } catch (err) {
      next(err);
    }
  });
  app.put("/api/admin/reservations/:id", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      const idResult = idParamSchema.safeParse(req.params.id);
      if (!idResult.success) {
        return res.status(400).json({ error: "ID inv\xE1lido." });
      }
      const parsed = adminReservationSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const ok = await storage.updateReservation(idResult.data, parsed.data);
      if (!ok) {
        return res.status(404).json({ error: "Reserva n\xE3o encontrada." });
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/admin/contacts", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      res.json({ items: await storage.listContacts() });
    } catch (err) {
      next(err);
    }
  });
  app.delete("/api/admin/contacts/:id", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      const idResult = idParamSchema.safeParse(req.params.id);
      if (!idResult.success) {
        return res.status(400).json({ error: "ID inv\xE1lido." });
      }
      res.json({ ok: await storage.deleteContact(idResult.data) });
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/admin/newsletter", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      res.json({ items: await storage.listNewsletter() });
    } catch (err) {
      next(err);
    }
  });
  app.delete("/api/admin/newsletter/:id", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      const idResult = idParamSchema.safeParse(req.params.id);
      if (!idResult.success) {
        return res.status(400).json({ error: "ID inv\xE1lido." });
      }
      res.json({ ok: await storage.deleteNewsletter(idResult.data) });
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/reviews", async (req, res, next) => {
    try {
      const parsed = reviewSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      if (!allowIpHit(getClientIp(req))) {
        return res.status(429).json({ error: "Demasiadas avalia\xE7\xF5es. Aguarde alguns minutos." });
      }
      const { id } = await storage.createReview(parsed.data, { ip: getClientIp(req) });
      res.status(201).json({ id });
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/reviews", async (_req, res, next) => {
    try {
      res.json({ items: await storage.listReviews(true) });
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/admin/reviews", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      res.json({ items: await storage.listReviews() });
    } catch (err) {
      next(err);
    }
  });
  app.put("/api/admin/reviews/:id", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      const idResult = idParamSchema.safeParse(req.params.id);
      if (!idResult.success) {
        return res.status(400).json({ error: "ID inv\xE1lido." });
      }
      const parsed = reviewStatusSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const ok = await storage.setReviewStatus(idResult.data, parsed.data.status);
      if (!ok) {
        return res.status(404).json({ error: "Avalia\xE7\xE3o n\xE3o encontrada." });
      }
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
  app.delete("/api/admin/reviews/:id", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      const idResult = idParamSchema.safeParse(req.params.id);
      if (!idResult.success) {
        return res.status(400).json({ error: "ID inv\xE1lido." });
      }
      res.json({ ok: await storage.deleteReview(idResult.data) });
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/admin/closed-days", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      res.json({ items: await storage.listClosedPeriods() });
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/admin/closed-days", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      const parsed = closedPeriodSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const { id } = await storage.createClosedPeriod(parsed.data);
      const conflicts = findClosedPeriodConflicts(await storage.listReservations(), {
        start_date: parsed.data.startDate,
        end_date: parsed.data.endDate || null,
        repeat: parsed.data.repeat
      });
      if (conflicts.total > 0) {
        await sendClosedDayConflictEmail({
          title: parsed.data.title,
          startDate: parsed.data.startDate,
          endDate: parsed.data.endDate || void 0,
          repeat: parsed.data.repeat,
          total: conflicts.total,
          rows: conflicts.rows
        });
      }
      res.status(201).json({ id, conflicts: { total: conflicts.total, dates: conflicts.dates } });
    } catch (err) {
      next(err);
    }
  });
  app.delete("/api/admin/closed-days/:id", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      const idResult = idParamSchema.safeParse(req.params.id);
      if (!idResult.success) {
        return res.status(400).json({ error: "ID inv\xE1lido." });
      }
      res.json({ ok: await storage.deleteClosedPeriod(idResult.data) });
    } catch (err) {
      next(err);
    }
  });
  app.put("/api/admin/security/token", async (req, res, next) => {
    try {
      if (!await requireAdmin(req, res, storage, () => getEffectiveAdminToken(storage), { requireCsrf: req.method !== "GET" })) return;
      const parsed = adminTokenUpdateSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({
          error: "O token n\xE3o cumpre os requisitos. Necessita de: pelo menos 16 caracteres, mai\xFAsculas, min\xFAsculas, um n\xFAmero e um car\xE1cter especial.",
          issues: parsed.error.issues.map((issue) => issue.message)
        });
      }
      if (parsed.data.token === await getEffectiveAdminToken(storage)) {
        return res.status(400).json({ error: "O novo token \xE9 igual ao atual." });
      }
      await storage.setSetting(ADMIN_TOKEN_KEY, parsed.data.token);
      await destroyAllSessions(storage);
      res.cookie(SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0, expires: /* @__PURE__ */ new Date(0) });
      res.cookie(CSRF_COOKIE, "", { httpOnly: false, secure: true, sameSite: "strict", path: "/", maxAge: 0, expires: /* @__PURE__ */ new Date(0) });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
  if (!process.env.VERCEL && existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
      res.sendFile(path2.join(distDir, "index.html"));
    });
  }
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Erro interno do servidor." });
  });
  return { app, storage };
}

// scripts/api-entry.ts
process.removeAllListeners("warning");
process.on("warning", (warning) => {
  if (warning.name === "DeprecationWarning" && warning.message.includes("url.parse")) return;
  if (warning.stack) console.error(warning.stack);
  else console.error(`${warning.name}: ${warning.message}`);
});
var instance = null;
async function handler(req, res, next) {
  try {
    if (!instance) {
      instance = await createApp();
    }
    instance.app(req, res, next);
  } catch (err) {
    console.error("[api] Erro na fun\xE7\xE3o:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Erro interno do servidor.", detail: err instanceof Error ? err.message : String(err) });
    } else {
      next(err);
    }
  }
}
export {
  handler as default
};
