/* gerado por scripts/build-api.mjs — não editar manualmente */
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// scripts/api-entry.ts
var api_entry_exports = {};
__export(api_entry_exports, {
  default: () => handler
});
module.exports = __toCommonJS(api_entry_exports);

// api/lib/app.ts
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_node_fs2 = require("node:fs");
var import_node_path2 = __toESM(require("node:path"), 1);

// api/lib/storage.ts
var import_node_fs = require("node:fs");
var import_node_path = __toESM(require("node:path"), 1);
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
var UPSERT_SETTING_SQL = `
  INSERT INTO settings (key, value) VALUES (?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value
`;
function toReference(count) {
  return `BM-${String(count + 1).padStart(4, "0")}`;
}
async function createSqliteStorage() {
  const { DatabaseSync } = await import("node:sqlite");
  const dbPath = process.env.DB_PATH ?? "data/boca-maldita.db";
  (0, import_node_fs.mkdirSync)(import_node_path.default.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`PRAGMA journal_mode = WAL;
${TABLE_SCHEMA}`);
  return {
    async init() {
    },
    async createReservation(input) {
      const { count } = db.prepare("SELECT COUNT(*) AS count FROM reservations").get();
      const reference = toReference(count);
      const info = db.prepare(
        `INSERT INTO reservations (reference, name, email, phone, date, time, guests, area, occasion, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(reference, input.name, input.email, input.phone, input.date, input.time, input.guests, input.area, input.occasion, input.notes ?? "");
      return { id: Number(info.lastInsertRowid), reference };
    },
    async createContact(input) {
      const info = db.prepare(`INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)`).run(input.nome, input.email, input.assunto, input.mensagem);
      return { id: Number(info.lastInsertRowid) };
    },
    async hasNewsletter(email) {
      return db.prepare("SELECT 1 FROM newsletter_subscriptions WHERE email = ?").get(email) !== void 0;
    },
    async createNewsletter(input) {
      const info = db.prepare("INSERT INTO newsletter_subscriptions (email) VALUES (?)").run(input.email);
      return { id: Number(info.lastInsertRowid) };
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
    },
    async createReservation(input) {
      const { rows } = await client.execute("SELECT COUNT(*) AS count FROM reservations");
      const count = Number(rows[0]?.count ?? 0);
      const reference = toReference(count);
      const result = await client.execute({
        sql: `INSERT INTO reservations (reference, name, email, phone, date, time, guests, area, occasion, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [reference, input.name, input.email, input.phone, input.date, input.time, input.guests, input.area, input.occasion, input.notes ?? ""]
      });
      return { id: Number(result.lastInsertRowid), reference };
    },
    async createContact(input) {
      const result = await client.execute({
        sql: `INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)`,
        args: [input.nome, input.email, input.assunto, input.mensagem]
      });
      return { id: Number(result.lastInsertRowid) };
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
  const reservations = [];
  const contacts = [];
  const newsletters = [];
  const settings = /* @__PURE__ */ new Map();
  return {
    async init() {
    },
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

// api/lib/validation.ts
var import_zod = require("zod");
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
var nameField = import_zod.z.string().trim().min(2, "O nome \xE9 obrigat\xF3rio (m\xEDnimo de 2 caracteres).").max(120, "O nome \xE9 demasiado longo.");
var emailField = import_zod.z.string().trim().email("Endere\xE7o de email inv\xE1lido.").max(200, "Endere\xE7o de email demasiado longo.");
var phoneField = import_zod.z.string().trim().regex(/^\+?[0-9\s-]{6,20}$/, "N\xFAmero de telefone inv\xE1lido.");
var reservationSchema = import_zod.z.object({
  name: nameField,
  email: emailField,
  phone: phoneField,
  date: import_zod.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inv\xE1lida.").refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }, "Data inv\xE1lida.").refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(year, month - 1, day) >= today;
  }, "A data tem de ser hoje ou uma data futura."),
  time: import_zod.z.enum(AVAILABLE_TIMES, { message: "Hora n\xE3o dispon\xEDvel para reserva." }),
  guests: import_zod.z.number().int("N\xFAmero de convidados inv\xE1lido.").min(1).max(16, "M\xE1ximo de 16 convidados por reserva."),
  area: import_zod.z.string().trim().min(2, "Selecione uma \xE1rea do restaurante.").max(120),
  occasion: import_zod.z.string().trim().min(1, "A ocasi\xE3o \xE9 obrigat\xF3ria.").max(120),
  notes: import_zod.z.string().trim().max(1e3, "Notas demasiado longas.").optional().default("")
}).strict();
var contactSchema = import_zod.z.object({
  nome: nameField,
  email: emailField,
  assunto: import_zod.z.string().trim().min(1, "O assunto \xE9 obrigat\xF3rio.").max(120),
  mensagem: import_zod.z.string().trim().min(5, "A mensagem \xE9 demasiado curta.").max(5e3, "A mensagem \xE9 demasiado longa.")
}).strict();
var newsletterSchema = import_zod.z.object({
  email: emailField
}).strict();
var siteSettingsSchema = import_zod.z.object({
  contactEmail: emailField
}).strict();
var assetUrlField = import_zod.z.string().trim().min(1, "O link da imagem \xE9 obrigat\xF3rio.").max(2e3, "O link da imagem \xE9 demasiado longo.").refine((value) => /^https?:\/\//i.test(value), "O link tem de come\xE7ar por http:// ou https://.");
var assetOverridesSchema = import_zod.z.object({
  overrides: import_zod.z.array(
    import_zod.z.object({
      id: import_zod.z.string().trim().min(1).max(80),
      url: assetUrlField
    })
  ).max(100, "Demasiadas substitui\xE7\xF5es.")
}).strict();

// api/lib/email.ts
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
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : void 0
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
    `    <p style="color:#A6A8AD;margin:0 0 24px;">A sua reserva foi registada. Guarde a refer\xEAncia <strong style="color:#D4A373;">${payload.reference}</strong> e apresente-a ao chegar.</p>`,
    `    <table style="width:100%;border-collapse:collapse;color:#F7F5F0;font-size:14px;">`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;width:38%;">Nome</td><td style="padding:8px 0;">${payload.name}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Telefone</td><td style="padding:8px 0;">${payload.phone}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Data</td><td style="padding:8px 0;">${payload.date}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Hora</td><td style="padding:8px 0;">${payload.time}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Convidados</td><td style="padding:8px 0;">${payload.guests}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">\xC1rea</td><td style="padding:8px 0;">${payload.area}</td></tr>`,
    `      <tr><td style="padding:8px 0;color:#A6A8AD;">Ocasi\xE3o</td><td style="padding:8px 0;">${payload.occasion}</td></tr>`,
    payload.notes ? `      <tr><td style="padding:8px 0;color:#A6A8AD;vertical-align:top;">Notas</td><td style="padding:8px 0;">${payload.notes}</td></tr>` : "",
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
    return true;
  } catch (err) {
    console.error("[email] Erro ao enviar confirma\xE7\xE3o:", err);
    return false;
  }
}

// api/lib/app.ts
var distDir = "";
if (!process.env.VERCEL) {
  distDir = import_node_path2.default.resolve(process.cwd(), "dist");
}
var IMAGE_OVERRIDES_KEY = "image_asset_overrides";
var SITE_CONTACT_EMAIL_KEY = "site_contact_email";
var DEFAULT_CONTACT_EMAIL = (process.env.SITE_CONTACT_EMAIL ?? "").trim() || "smpsandro1239@gmail.com";
var adminToken = (process.env.ADMIN_TOKEN ?? "").trim();
function adminUnauthorized(res) {
  if (adminToken) {
    res.status(401).json({ error: "Token de administrador inv\xE1lido." });
  } else {
    res.status(503).json({
      error: "Administra\xE7\xE3o desativada: defina a vari\xE1vel ADMIN_TOKEN no servidor."
    });
  }
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
  const app = (0, import_express.default)();
  app.disable("x-powered-by");
  app.use(import_express.default.json({ limit: "200kb" }));
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
  app.post("/api/reservations", async (req, res, next) => {
    try {
      const parsed = reservationSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const { id, reference } = await storage.createReservation(parsed.data);
      sendReservationConfirmation({ ...parsed.data, reference }).catch((err) => {
        console.error("[email] Falha no envio de confirma\xE7\xE3o:", err);
      });
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
      const { id } = await storage.createContact(parsed.data);
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
      const { id } = await storage.createNewsletter(parsed.data);
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
      if (!adminToken || req.headers["x-admin-token"] !== adminToken) {
        return adminUnauthorized(res);
      }
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
  app.get("/api/admin/assets", async (_req, res, next) => {
    try {
      const raw = await storage.getSetting(IMAGE_OVERRIDES_KEY);
      res.json({ enabled: adminToken !== "", overrides: raw ? JSON.parse(raw) : {} });
    } catch (err) {
      next(err);
    }
  });
  app.put("/api/admin/assets", async (req, res, next) => {
    try {
      if (!adminToken || req.headers["x-admin-token"] !== adminToken) {
        return adminUnauthorized(res);
      }
      const parsed = assetOverridesSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0].message });
      }
      const overrides = {};
      for (const item of parsed.data.overrides) {
        overrides[item.id] = item.url;
      }
      await storage.setSetting(IMAGE_OVERRIDES_KEY, JSON.stringify(overrides));
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
  app.delete("/api/admin/assets", async (req, res, next) => {
    try {
      if (!adminToken || req.headers["x-admin-token"] !== adminToken) {
        return adminUnauthorized(res);
      }
      await storage.deleteSetting(IMAGE_OVERRIDES_KEY);
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
  if (!process.env.VERCEL && (0, import_node_fs2.existsSync)(distDir)) {
    app.use(import_express.default.static(distDir));
    app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
      res.sendFile(import_node_path2.default.join(distDir, "index.html"));
    });
  }
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Erro interno do servidor." });
  });
  return { app, storage };
}

// scripts/api-entry.ts
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
