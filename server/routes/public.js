import { Router } from 'express'
import { db } from '../db.js'
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
