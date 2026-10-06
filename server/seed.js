import { db, getContent, setContent, tx } from './db.js'
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

// bundled assets are referenced from the site root once a server serves them
const abs = (p) => (p ? p.replace(/^\.\//, '/') : p)
const VIEW_OF = { 0: 'front', 45: 'three-quarter-right', 90: 'right', 135: 'three-quarter-back-right', 180: 'back', 225: 'three-quarter-back-left', 270: 'left', 315: 'three-quarter-left' }

/** A fresh database starts with the house as it stands today. */
export function seedIfEmpty() {
  if (getContent('about') === undefined) setContent('about', DEFAULT_ABOUT)
  if (getContent('settings') === undefined) setContent('settings', DEFAULT_SETTINGS)
  if (db.prepare('SELECT COUNT(*) n FROM categories').get().n > 0) return false

  tx(() => {
    const cat = db.prepare('INSERT INTO categories (slug, label, position) VALUES (?, ?, ?)')
    STATIC_CATEGORIES.filter((c) => c.id !== 'all').forEach((c, i) => cat.run(c.id, c.label, i))
    cat.run('jeans', 'Jeans', STATIC_CATEGORIES.length)
    const catId = (slug) => db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug)?.id ?? null

    const ins = db.prepare(`INSERT INTO products
      (slug, number, style_code, name, short, line, tagline, description, category_id, season, colour, badge,
       price, was, featured, status, theme, position, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, datetime('now'))`)
    const size = db.prepare('INSERT INTO product_sizes (product_id, label, available, position) VALUES (?, ?, ?, ?)')
    const img = db.prepare(`INSERT INTO product_images (product_id, view, label, src, turn, thumb, focus, position, is_primary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)

    STATIC_PRODUCTS.forEach((p, i) => {
      const { lastInsertRowid: id } = ins.run(
        p.id, p.number, p.code ?? '', p.name, p.short ?? '', p.line ?? '', p.tagline ?? '', p.description ?? '',
        catId(p.category), 'all-season', p.colour ?? '', p.badge ?? '', p.price, p.was ?? null,
        i === 0 ? 1 : 0, JSON.stringify(p.theme), i,
      )
      p.sizes.forEach((s, k) => size.run(id, s.label, s.available ? 1 : 0, k))
      p.gallery.forEach((g, k) => {
        const garment = g.kind === 'garment'
        // the stage photograph of the front is the dedicated hero cut-out
        const src = garment && g.angle === 0 && p.hero?.src ? abs(p.hero.src) : abs(g.src)
        img.run(id, garment ? VIEW_OF[g.angle ?? 0] ?? 'front' : 'detail', g.label ?? '', src, abs(g.turn) ?? null, src, g.focus ?? null, k, k === 0 ? 1 : 0)
      })
    })
  })
  return true
}
