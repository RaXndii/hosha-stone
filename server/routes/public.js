import { Router } from 'express'
import { db, tx } from '../db.js'
import { limited } from '../auth.js'
import { publicCatalogue, publicSettings } from '../catalogue.js'
import { HttpError, validateOrder } from '../validate.js'

/** What the customer-facing site reads and writes. No authentication, and nothing here can change a product. */
export const publicRouter = Router()

publicRouter.get('/catalogue', (_req, res) => {
  res.set('Cache-Control', 'no-cache')
  res.json(publicCatalogue())
})

/**
 * An order request is recorded when the customer continues to WhatsApp or
 * Instagram — before they have sent anything, so it starts as NEW. The price
 * is taken from the database, never from the browser.
 */
publicRouter.post('/orders', (req, res) => {
  if (limited(`order:${req.ip}`, 12, 15 * 60e3)) throw new HttpError(429, 'Too many requests — try again in a few minutes.')
  const o = validateOrder(req.body ?? {})
  const p = db.prepare("SELECT * FROM products WHERE slug = ? AND status = 'published'").get(o.productId)
  if (!p) throw new HttpError(404, 'That piece is not available.')
  const size = db.prepare('SELECT available FROM product_sizes WHERE product_id = ? AND label = ?').get(p.id, o.size)
  if (!size?.available) throw new HttpError(409, 'That size is not available.')
  const existing = db.prepare('SELECT ref FROM orders WHERE ref = ?').get(o.ref)
  if (existing) return res.json({ ref: existing.ref }) // the same request sent twice
  const fee = Number(publicSettings().deliveryFee) || 0
  db.prepare(`INSERT INTO orders (ref, product_id, product_number, product_name, size, price, delivery_fee, total,
    customer_name, location, language, contact_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(o.ref, p.id, p.number, p.name, o.size, p.price, fee, p.price + fee, o.customerName, o.location, o.language, o.contactMethod)
  res.status(201).json({ ref: o.ref })
})

/**
 * What this visitor has kept. The browser sends its whole list each time —
 * the hearts it holds now — and the server makes its record match, so a
 * double tap, a second tab or a list kept before this existed all come out
 * right. The visitor is a random id the browser made for itself; nothing
 * here knows who anyone is.
 *
 * Counts are a little open to someone determined to inflate them (a new id
 * each time), which the rate limit keeps small. They are shown as what they
 * are — how many people kept a piece — and never turned into a rating.
 */
const VISITOR = /^[A-Za-z0-9_-]{16,64}$/

publicRouter.post('/hearts', (req, res) => {
  if (limited(`hearts:${req.ip}`, 40, 10 * 60e3)) throw new HttpError(429, 'Too many requests — try again in a few minutes.')
  const { visitor, kept } = req.body ?? {}
  if (typeof visitor !== 'string' || !VISITOR.test(visitor)) throw new HttpError(422, 'Unknown visitor.')
  if (!Array.isArray(kept) || kept.length > 200) throw new HttpError(422, 'Send the list of kept pieces.')

  const wanted = new Map()
  for (const slug of kept) {
    if (typeof slug !== 'string') continue
    const row = db.prepare("SELECT id FROM products WHERE slug = ? AND status = 'published'").get(slug)
    if (row) wanted.set(row.id, slug)
  }
  const had = db.prepare('SELECT h.product_id AS id, p.slug FROM hearts h JOIN products p ON p.id = h.product_id WHERE h.visitor = ?').all(visitor)
  const touched = new Map(had.map((r) => [r.id, r.slug]))
  tx(() => {
    for (const r of had) if (!wanted.has(r.id)) db.prepare('DELETE FROM hearts WHERE product_id = ? AND visitor = ?').run(r.id, visitor)
    for (const [id, slug] of wanted) {
      db.prepare('INSERT OR IGNORE INTO hearts (product_id, visitor) VALUES (?, ?)').run(id, visitor)
      touched.set(id, slug)
    }
  })
  const counts = {}
  for (const [id, slug] of touched) counts[slug] = db.prepare('SELECT COUNT(*) AS n FROM hearts WHERE product_id = ?').get(id).n
  res.json({ counts })
})
