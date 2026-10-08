import { db, getContent, setContent, tx } from './db.js'
import { removeProductMedia } from './media.js'
import { STATIC_CATEGORIES, STATIC_PRODUCTS } from '../src/data/static-catalogue.js'

export const DEFAULT_ABOUT = {
  title: 'A small number of garments each season.',
  body: 'More than just clothes. It’s a feeling. A mindset. Hosha Stone is for those who keep it real — pieces that stay simple, and are never ordinary.',
  motto: 'Simple. Never ordinary.',
  sections: [],
  image: null,
}
export const DEFAULT_SETTINGS = {
  deliveryFee: 1,
  currency: 'USD',
  whatsapp: '9647501639395',
  instagram: 'hoshawestman',
}

/**
 * The size guide starts empty on purpose.
 *
 * Measurements are the house's own: a wrong number here is a garment that
 * does not fit and a return, so none are invented. Until the house fills
 * these in (/admin → Settings → Size guide) the site says plainly that they
 * have not been published and offers to answer on WhatsApp, which is true
 * and useful; a made-up table would be neither.
 *
 * tables: [{ category: <slug | 'all'>, rows: [{ size, chest, length, shoulder, sleeve }] }]
 * Measurements are of the garment laid flat, in the unit given.
 */
export const DEFAULT_SIZE_GUIDE = { unit: 'cm', note: '', tables: [] }

// bundled assets are referenced from the site root once a server serves them
const abs = (p) => (p ? p.replace(/^\.\//, '/') : p)
// a photograph the site ships with has a small copy in public/thumb (scripts/thumbs.mjs)
const thumbOf = (src) => (/^\/[\w.-]+\.webp$/.test(src ?? '') ? `/thumb${src}` : src)
const VIEW_OF = { 0: 'front', 45: 'three-quarter-right', 90: 'right', 135: 'three-quarter-back-right', 180: 'back', 225: 'three-quarter-back-left', 270: 'left', 315: 'three-quarter-left' }

/** The newest revision of the bundled catalogue: each piece says which it arrived in (`since`). */
const REVISION = Math.max(1, ...STATIC_PRODUCTS.map((p) => p.since ?? 1))

/**
 * One bundled piece into the database: its sizes, its photographs, its film
 * and the details marked on it. A spot that opens a photograph names it by
 * the photograph's new id. If the piece's number is already taken (the house
 * numbered something else that way since), it takes the next free one.
 */
function insertPiece(p, { position, featured }) {
  const catId = db.prepare('SELECT id FROM categories WHERE slug = ?').get(p.category)?.id ?? null
  let number = p.number
  for (let n = Number(p.number) + 1; db.prepare('SELECT 1 FROM products WHERE number = ?').get(number); n++) number = String(n).padStart(3, '0')
  const film = p.film ? JSON.stringify({ ...p.film, src: abs(p.film.src), small: abs(p.film.small), webm: abs(p.film.webm), poster: abs(p.film.poster), cover: abs(p.film.cover) }) : null
  const { lastInsertRowid } = db.prepare(`INSERT INTO products
    (slug, number, style_code, name, short, line, tagline, description, category_id, season, colour, badge,
     price, was, featured, status, theme, position, film, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, datetime('now'))`).run(
    p.id, number, p.code ?? '', p.name, p.short ?? '', p.line ?? '', p.tagline ?? '', p.description ?? '',
    catId, 'all-season', p.colour ?? '', p.badge ?? '', p.price, p.was ?? null,
    featured ? 1 : 0, JSON.stringify(p.theme), position, film,
  )
  const id = Number(lastInsertRowid)
  const size = db.prepare('INSERT INTO product_sizes (product_id, label, available, position) VALUES (?, ?, ?, ?)')
  p.sizes.forEach((s, k) => size.run(id, s.label, s.available ? 1 : 0, k))
  const img = db.prepare(`INSERT INTO product_images (product_id, view, label, src, turn, thumb, focus, position, is_primary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const imageId = {}
  p.gallery.forEach((g, k) => {
    const garment = g.kind === 'garment'
    // the stage photograph of the front is the dedicated hero cut-out
    const src = garment && g.angle === 0 && p.hero?.src ? abs(p.hero.src) : abs(g.src)
    const r = img.run(id, garment ? VIEW_OF[g.angle ?? 0] ?? 'front' : 'detail', g.label ?? '', src, abs(g.turn) ?? null, thumbOf(src), g.focus ?? null, k, k === 0 ? 1 : 0)
    imageId[g.id] = Number(r.lastInsertRowid)
  })
  if (p.stage) db.prepare('UPDATE products SET stage = ? WHERE id = ?').run(p.stage, id)
  if (p.inside) db.prepare('UPDATE products SET inside = ? WHERE id = ?').run(JSON.stringify({ ...p.inside, src: abs(p.inside.src) }), id)
  if (p.spots?.length) {
    const spots = p.spots.map(({ at, label, note, photo }) => ({ at, label, note: note ?? '', photo: photo ? imageId[photo] ?? null : null }))
    db.prepare('UPDATE products SET spots = ? WHERE id = ?').run(JSON.stringify(spots), id)
  }
  return id
}

/** A fresh database starts with the house as it stands today. */
export function seedIfEmpty() {
  if (getContent('about') === undefined) setContent('about', DEFAULT_ABOUT)
  if (getContent('settings') === undefined) setContent('settings', DEFAULT_SETTINGS)
  if (getContent('sizeGuide') === undefined) setContent('sizeGuide', DEFAULT_SIZE_GUIDE)
  if (db.prepare('SELECT COUNT(*) n FROM categories').get().n > 0) return false

  tx(() => {
    const cat = db.prepare('INSERT INTO categories (slug, label, position) VALUES (?, ?, ?)')
    STATIC_CATEGORIES.filter((c) => c.id !== 'all').forEach((c, i) => cat.run(c.id, c.label, i))
    cat.run('jeans', 'Jeans', STATIC_CATEGORIES.length)
    STATIC_PRODUCTS.forEach((p, i) => insertPiece(p, { position: i, featured: i === 0 }))
    setContent('catalogueRevision', REVISION)
  })
  return true
}

/**
 * Pieces added to the bundled catalogue after this database was made arrive
 * once, on the next start, first in the room. A piece the house has since
 * deleted in /admin is not brought back: each revision is offered only once.
 *
 * A piece that `replaces` another (by its slug) takes that piece's place
 * instead: the old one, its photographs and its film are deleted, and the
 * new one stands where it stood, under its number. Orders keep the old
 * piece's number and name as they were written.
 * → the names of the pieces added
 */
export function addNewPieces() {
  const have = getContent('catalogueRevision', 1)
  if (have >= REVISION) return []
  const bySlug = (slug) => db.prepare('SELECT id, number, position, featured FROM products WHERE slug = ?').get(slug)
  const due = STATIC_PRODUCTS.filter((p) => (p.since ?? 1) > have)
  const fresh = due.filter((p) => !p.replaces && !bySlug(p.id))
  const renewed = due.filter((p) => p.replaces)
  const gone = []
  tx(() => {
    const top = db.prepare('SELECT COALESCE(MIN(position), 0) AS p FROM products').get().p
    fresh.forEach((p, i) => insertPiece(p, { position: top - fresh.length + i, featured: true }))
    for (const p of renewed) {
      const old = bySlug(p.replaces)
      if (old) {
        db.prepare('DELETE FROM products WHERE id = ?').run(old.id)
        gone.push(old.id)
      }
      // a piece of the same slug left behind would stop the new one: it goes too
      const clash = p.id !== p.replaces && bySlug(p.id)
      if (clash) { db.prepare('DELETE FROM products WHERE id = ?').run(clash.id); gone.push(clash.id) }
      const last = db.prepare('SELECT COALESCE(MAX(position), 0) AS p FROM products').get().p
      insertPiece(old ? { ...p, number: old.number } : p, { position: old ? old.position : last + 1, featured: old ? !!old.featured : false })
    }
    setContent('catalogueRevision', REVISION)
  })
  for (const id of gone) removeProductMedia(id).catch(() => {})
  return [...fresh, ...renewed].map((p) => p.name)
}
