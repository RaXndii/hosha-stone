import { Router } from 'express'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { db } from '../db.js'
import { publicProduct } from '../catalogue.js'
import { SHARE_DIR, houseCard, shareCard } from '../share.js'

/**
 * The picture a shared link shows: /share/<piece>.jpg, and /share/house.jpg
 * for the house itself. Drawn once and kept, under a name that carries when
 * the piece last changed — so editing a piece in the admin draws a new card,
 * and nothing else ever redraws one.
 *
 * A card is only ever decoration around a link. If one cannot be drawn the
 * house's own card is sent instead, and if that fails too the link simply
 * arrives without a picture, exactly as it used to.
 */
export const shareRouter = Router()

const DAY = 86400

async function cached(key, draw) {
  const file = join(SHARE_DIR, `${createHash('sha256').update(key).digest('hex').slice(0, 24)}.jpg`)
  try {
    return await readFile(file)
  } catch {
    /* not drawn yet */
  }
  const buffer = await draw()
  try {
    await mkdir(SHARE_DIR, { recursive: true })
    await writeFile(file, buffer)
  } catch {
    // a read-only disk costs the cache, not the card
  }
  return buffer
}

const published = () =>
  db
    .prepare(
      `SELECT p.* FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.status = 'published' AND (c.id IS NULL OR (c.hidden = 0 AND c.archived = 0))
       ORDER BY p.featured DESC, p.position ASC, p.id ASC`,
    )
    .all()

const house = () => cached(`house:${published()[0]?.updated_at ?? 'none'}`, () => houseCard(published().slice(0, 1).map(publicProduct)))

shareRouter.get('/:file', async (req, res) => {
  const name = String(req.params.file ?? '')
  if (!name.endsWith('.jpg')) return res.status(404).end()
  const slug = name.slice(0, -4)
  res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': `public, max-age=${DAY}` })

  try {
    if (slug === 'house') return res.send(await house())
    const row = db.prepare("SELECT * FROM products WHERE slug = ? AND status = 'published'").get(slug)
    if (!row) return res.send(await house())
    return res.send(await cached(`piece:${row.slug}:${row.updated_at}`, () => shareCard(publicProduct(row))))
  } catch {
    try {
      return res.send(await house())
    } catch {
      return res.status(404).end()
    }
  }
})
