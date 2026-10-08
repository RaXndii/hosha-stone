import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * One SQLite file holds everything the house manages: the admins, their
 * sessions, categories, apparel (with its sizes and photographs), order
 * requests, the About text and the ordering settings. Photographs themselves
 * live on disk under storage/media — the database keeps only their paths.
 */
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const STORAGE = process.env.HS_STORAGE || join(ROOT, 'storage')
export const MEDIA_DIR = join(STORAGE, 'media')
mkdirSync(MEDIA_DIR, { recursive: true })

export const db = new DatabaseSync(process.env.HS_DB || join(STORAGE, 'hosha.db'))
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 4000;')

const MIGRATIONS = [
  `
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT
  );
  CREATE TABLE sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );
  CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    hidden INTEGER NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    number TEXT NOT NULL UNIQUE COLLATE NOCASE,
    style_code TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL,
    short TEXT NOT NULL DEFAULT '',
    line TEXT NOT NULL DEFAULT '',
    tagline TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    season TEXT NOT NULL DEFAULT 'all-season',
    colour TEXT NOT NULL DEFAULT '',
    badge TEXT NOT NULL DEFAULT '',
    price REAL NOT NULL DEFAULT 0,
    was REAL,
    currency TEXT NOT NULL DEFAULT 'USD',
    featured INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
    accent TEXT,
    theme TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    published_at TEXT
  );
  CREATE TABLE product_sizes (
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    available INTEGER NOT NULL DEFAULT 1,
    position INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, label)
  );
  CREATE TABLE product_images (
    id INTEGER PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    view TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    src TEXT NOT NULL,
    turn TEXT,
    thumb TEXT,
    focus TEXT,
    width INTEGER,
    height INTEGER,
    tone TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    is_primary INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    ref TEXT NOT NULL UNIQUE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_number TEXT NOT NULL,
    product_name TEXT NOT NULL,
    size TEXT NOT NULL,
    price REAL NOT NULL,
    delivery_fee REAL NOT NULL,
    total REAL NOT NULL,
    customer_name TEXT NOT NULL,
    location TEXT NOT NULL,
    language TEXT NOT NULL,
    contact_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','confirmed','completed','cancelled')),
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE content (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE activity (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX idx_products_status ON products(status);
  CREATE INDEX idx_images_product ON product_images(product_id, position);
  CREATE INDEX idx_orders_created ON orders(created_at);
  `,
  // who kept which piece: an anonymous id the visitor's browser made up, never
  // a person — enough to count each visitor once, and nothing more
  `
  CREATE TABLE hearts (
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    visitor TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (product_id, visitor)
  );
  CREATE INDEX idx_hearts_product ON hearts(product_id);
  `,
  // a piece's film (JSON: src, small, poster, cover, duration) and the details
  // marked on its front view (JSON: [{ at: [x, y], label, note, photo }])
  `
  ALTER TABLE products ADD COLUMN film TEXT;
  ALTER TABLE products ADD COLUMN spots TEXT;
  `,
]

const { user_version: version } = db.prepare('PRAGMA user_version').get()
for (let v = version; v < MIGRATIONS.length; v++) {
  db.exec('BEGIN')
  try {
    db.exec(MIGRATIONS[v])
    db.exec(`PRAGMA user_version = ${v + 1}`)
    db.exec('COMMIT')
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

/** Run fn inside one transaction; any throw undoes all of it. */
export function tx(fn) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const out = fn()
    db.exec('COMMIT')
    return out
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}

export const getContent = (key, fallback) => {
  const row = db.prepare('SELECT value FROM content WHERE key = ?').get(key)
  return row ? JSON.parse(row.value) : fallback
}
export const setContent = (key, value) =>
  db.prepare(`INSERT INTO content (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`).run(key, JSON.stringify(value))

export const logActivity = (userId, action, subject = '') =>
  db.prepare('INSERT INTO activity (user_id, action, subject) VALUES (?, ?, ?)').run(userId ?? null, action, String(subject).slice(0, 200))
