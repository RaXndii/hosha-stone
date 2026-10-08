import { Router } from 'express'
import multer from 'multer'
import { db, tx, getContent, setContent, logActivity } from '../db.js'
import {
  requireAdmin, verifyPassword, hashPassword, dummyHash, createSession, destroySession, destroyOtherSessions,
  userFromRequest, limited, clearLimit, needsSetup, checkSetupCode, clearSetupCode,
} from '../auth.js'
import { adminProduct, publicProduct } from '../catalogue.js'
import { processImage, removeImageFiles, removeProductMedia, copyProductMedia, mediaUrl } from '../media.js'
import { FILM_MAX, FILM_TMP, prepareFilm, removeFilmFiles } from '../film.js'
import { mkdirSync } from 'node:fs'
import { readFile, rm } from 'node:fs/promises'
import { HttpError, clean, cleanLong, slugify, validateProduct, VIEWS, STATUSES, ORDER_STATUSES, SEASONS, BADGES, SIZE_SYSTEMS } from '../validate.js'
import { DEFAULT_ABOUT, DEFAULT_SETTINGS, DEFAULT_SIZE_GUIDE } from '../seed.js'

export const adminRouter = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 12, fields: 40 } })
const secureCookie = (req) => req.secure || process.env.NODE_ENV === 'production'
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/

function checkPassword(pw) {
  if (typeof pw !== 'string' || pw.length < 10) return 'Use at least 10 characters.'
  if (pw.length > 200) return 'That password is too long.'
  if (!/[a-zA-Z]/.test(pw) || !/[0-9\W]/.test(pw)) return 'Mix letters with numbers or symbols.'
  return null
}

/* ================================================================ session */

adminRouter.get('/session', (req, res) => {
  const user = userFromRequest(req)
  res.json({ user, needsSetup: !user && needsSetup() })
})

adminRouter.post('/setup', async (req, res) => {
  if (limited(`setup:${req.ip}`, 8, 15 * 60e3)) throw new HttpError(429, 'Too many attempts — wait a few minutes.')
  if (!needsSetup()) throw new HttpError(409, 'The owner account already exists. Sign in instead.')
  const { code, name, email, password } = req.body ?? {}
  const f = {}
  if (!checkSetupCode(code)) f.code = 'That setup code is not right. It is printed in the server’s console.'
  if (!clean(name, 60)) f.name = 'Add your name.'
  if (!EMAIL.test(String(email ?? ''))) f.email = 'Enter a valid email.'
  const pwErr = checkPassword(password)
  if (pwErr) f.password = pwErr
  if (Object.keys(f).length) throw new HttpError(422, 'Check the highlighted fields.', f)
  const hash = await hashPassword(password)
  const { lastInsertRowid: id } = db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)').run(String(email).trim(), clean(name, 60), hash)
  clearSetupCode()
  logActivity(id, 'created the owner account')
  createSession(res, id, secureCookie(req))
  res.status(201).json({ user: { id, email, name: clean(name, 60) } })
})

adminRouter.post('/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase().slice(0, 254)
  const password = String(req.body?.password ?? '')
  const ipKey = `login-ip:${req.ip}`, emailKey = `login-email:${email}`
  if (limited(ipKey, 10, 15 * 60e3, false) || limited(emailKey, 6, 15 * 60e3, false)) {
    throw new HttpError(429, 'Too many attempts. Wait 15 minutes and try again.')
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  const ok = await verifyPassword(password, user?.password_hash ?? (await dummyHash()))
  if (!user || !ok) {
    limited(ipKey, 10, 15 * 60e3)
    limited(emailKey, 6, 15 * 60e3)
    throw new HttpError(401, 'That email and password don’t match.')
  }
  clearLimit(emailKey)
  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id)
  createSession(res, user.id, secureCookie(req))
  res.json({ user: { id: user.id, email: user.email, name: user.name } })
})

adminRouter.post('/logout', (req, res) => {
  destroySession(req, res)
  res.json({ ok: true })
})

/* everything below requires a signed-in admin */
adminRouter.use(requireAdmin)

adminRouter.put('/account/password', async (req, res) => {
  const { current, next } = req.body ?? {}
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id)
  if (!(await verifyPassword(String(current ?? ''), row.password_hash))) throw new HttpError(422, 'Check the highlighted fields.', { current: 'That is not your current password.' })
  const err = checkPassword(next)
  if (err) throw new HttpError(422, 'Check the highlighted fields.', { next: err })
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(await hashPassword(next), req.user.id)
  destroyOtherSessions(req.user.id, req)
  logActivity(req.user.id, 'changed their password')
  res.json({ ok: true })
})

/* ================================================================ overview */

adminRouter.get('/overview', (_req, res) => {
  const count = (sql, ...a) => db.prepare(sql).get(...a).n
  res.json({
    apparel: count("SELECT COUNT(*) n FROM products WHERE status != 'archived'"),
    published: count("SELECT COUNT(*) n FROM products WHERE status = 'published'"),
    drafts: count("SELECT COUNT(*) n FROM products WHERE status = 'draft'"),
    archived: count("SELECT COUNT(*) n FROM products WHERE status = 'archived'"),
    orders: count('SELECT COUNT(*) n FROM orders'),
    newOrders: count("SELECT COUNT(*) n FROM orders WHERE status = 'new'"),
    lowStock: db.prepare(`SELECT p.id, p.name, p.number FROM products p WHERE p.status = 'published'
      AND (SELECT COUNT(*) FROM product_sizes s WHERE s.product_id = p.id AND s.available = 1) <= 1`).all(),
    recent: db.prepare(`SELECT p.id, p.name, p.number, p.status, p.updated_at FROM products p ORDER BY p.updated_at DESC LIMIT 5`).all()
      .map((r) => ({ ...r, thumb: db.prepare('SELECT thumb FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, position LIMIT 1').get(r.id)?.thumb ?? null })),
    latestOrders: db.prepare('SELECT id, ref, product_name, size, total, status, created_at, contact_method FROM orders ORDER BY id DESC LIMIT 5').all(),
    activity: db.prepare(`SELECT a.action, a.subject, a.created_at, u.name FROM activity a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 8`).all(),
  })
})

adminRouter.get('/meta', (_req, res) => {
  const last = db.prepare("SELECT number FROM products WHERE number GLOB '[0-9]*' ORDER BY CAST(number AS INTEGER) DESC LIMIT 1").get()
  res.json({
    seasons: SEASONS,
    badges: BADGES,
    views: Object.entries(VIEWS).map(([id, v]) => ({ id, label: v.label, kind: v.kind, angle: v.angle })),
    sizeSystems: SIZE_SYSTEMS,
    nextNumber: String((last ? parseInt(last.number, 10) : 0) + 1).padStart(3, '0'),
    statuses: STATUSES,
    orderStatuses: ORDER_STATUSES,
  })
})

/* ================================================================ apparel */

const getProduct = (id) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(Number(id))
  if (!row) throw new HttpError(404, 'That piece no longer exists.')
  return row
}
const categoryExists = (id) => !!db.prepare('SELECT 1 FROM categories WHERE id = ? AND archived = 0').get(id)
const uniqueSlug = (base, exceptId = 0) => {
  let slug = base || 'piece'
  for (let i = 2; db.prepare('SELECT 1 FROM products WHERE slug = ? AND id != ?').get(slug, exceptId); i++) slug = `${base}-${i}`
  return slug
}
const garmentCount = (id) => db.prepare('SELECT view FROM product_images WHERE product_id = ?').all(id).filter((i) => VIEWS[i.view]?.kind === 'garment').length

adminRouter.get('/products', (req, res) => {
  const status = STATUSES.includes(req.query.status) ? req.query.status : null
  const q = clean(req.query.q, 60).toLowerCase()
  const rows = db.prepare(`SELECT p.*, c.label AS category_label FROM products p LEFT JOIN categories c ON c.id = p.category_id
    ${status ? 'WHERE p.status = ?' : ''} ORDER BY p.updated_at DESC`).all(...(status ? [status] : []))
  const list = rows
    .filter((r) => !q || [r.name, r.number, r.style_code, r.category_label, r.description, r.colour].some((v) => String(v ?? '').toLowerCase().includes(q)))
    .map((r) => ({
      id: r.id, slug: r.slug, number: r.number, name: r.name, price: r.price, was: r.was, status: r.status, featured: !!r.featured,
      category: r.category_label ?? '—', createdAt: r.created_at, updatedAt: r.updated_at,
      sizes: db.prepare('SELECT label, available FROM product_sizes WHERE product_id = ? ORDER BY position').all(r.id).map((s) => ({ label: s.label, available: !!s.available })),
      thumb: db.prepare('SELECT thumb FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, position LIMIT 1').get(r.id)?.thumb ?? null,
    }))
  res.json(list)
})

adminRouter.get('/products/:id', (req, res) => res.json(adminProduct(getProduct(req.params.id))))
adminRouter.get('/products/:id/preview', (req, res) => res.json(publicProduct(getProduct(req.params.id))))

function writeProduct(id, v) {
  db.prepare(`UPDATE products SET number=?, style_code=?, name=?, short=?, line=?, tagline=?, description=?, category_id=?,
    season=?, colour=?, badge=?, price=?, was=?, featured=?, accent=?, updated_at=datetime('now') WHERE id=?`)
    .run(v.number, v.style_code, v.name, v.short, v.line, v.tagline, v.description, v.category_id, v.season, v.colour,
      v.badge, v.price, v.was, v.featured, v.accent, id)
  db.prepare('DELETE FROM product_sizes WHERE product_id = ?').run(id)
  const ins = db.prepare('INSERT INTO product_sizes (product_id, label, available, position) VALUES (?, ?, ?, ?)')
  v.sizes.forEach((s, i) => ins.run(id, s.label, s.available, i))
}

adminRouter.post('/products', (req, res) => {
  const v = validateProduct(req.body ?? {}, {
    categoryExists,
    numberTaken: (n) => !!db.prepare('SELECT 1 FROM products WHERE number = ?').get(n),
  })
  const id = tx(() => {
    const { lastInsertRowid } = db.prepare("INSERT INTO products (slug, number, name, status) VALUES (?, ?, ?, 'draft')")
      .run(uniqueSlug(slugify(`${v.name}-${v.number}`)), v.number, v.name)
    writeProduct(lastInsertRowid, v)
    return Number(lastInsertRowid)
  })
  logActivity(req.user.id, 'created draft', `${v.number} ${v.name}`)
  res.status(201).json(adminProduct(getProduct(id)))
})

adminRouter.patch('/products/:id', (req, res) => {
  const row = getProduct(req.params.id)
  const publishing = row.status === 'published'
  const v = validateProduct(req.body ?? {}, {
    categoryExists,
    numberTaken: (n) => !!db.prepare('SELECT 1 FROM products WHERE number = ? AND id != ?').get(n, row.id),
    publishing,
  })
  tx(() => {
    writeProduct(row.id, v)
    // the address follows the name only while the piece is unpublished; a live link never breaks
    if (row.status !== 'published') db.prepare('UPDATE products SET slug = ? WHERE id = ?').run(uniqueSlug(slugify(`${v.name}-${v.number}`), row.id), row.id)
  })
  logActivity(req.user.id, 'edited', `${v.number} ${v.name}`)
  res.json(adminProduct(getProduct(row.id)))
})

adminRouter.post('/products/:id/status', (req, res) => {
  const row = getProduct(req.params.id)
  const status = req.body?.status
  if (!STATUSES.includes(status)) throw new HttpError(422, 'Unknown status.')
  if (status === 'published') {
    // a piece goes live only when it is complete
    validateProduct({ ...adminProduct(row), styleCode: row.style_code }, {
      categoryExists,
      numberTaken: (n) => !!db.prepare('SELECT 1 FROM products WHERE number = ? AND id != ?').get(n, row.id),
      publishing: true,
    })
    if (!garmentCount(row.id)) throw new HttpError(422, 'Some details need attention.', { images: 'Add at least one photo of the whole piece (front, back or side) before publishing.' })
  }
  db.prepare(`UPDATE products SET status = ?, updated_at = datetime('now'),
    published_at = CASE WHEN ? = 'published' AND published_at IS NULL THEN datetime('now') ELSE published_at END WHERE id = ?`).run(status, status, row.id)
  logActivity(req.user.id, status === 'published' ? 'published' : status === 'archived' ? 'archived' : 'moved to drafts', `${row.number} ${row.name}`)
  res.json(adminProduct(getProduct(row.id)))
})

adminRouter.post('/products/:id/duplicate', async (req, res) => {
  const row = getProduct(req.params.id)
  let number = `${row.number}-COPY`.slice(0, 24)
  for (let i = 2; db.prepare('SELECT 1 FROM products WHERE number = ?').get(number); i++) number = `${row.number}-COPY${i}`.slice(0, 24)
  const newId = tx(() => {
    const { lastInsertRowid } = db.prepare(`INSERT INTO products (slug, number, style_code, name, short, line, tagline, description, category_id,
      season, colour, badge, price, was, currency, featured, status, accent, theme, position)
      SELECT ?, ?, style_code, name || ' (copy)', short, line, tagline, description, category_id, season, colour, badge, price, was, currency, 0, 'draft', accent, theme, position
      FROM products WHERE id = ?`).run(uniqueSlug(slugify(`${row.name}-${number}`)), number, row.id)
    const nid = Number(lastInsertRowid)
    db.prepare('INSERT INTO product_sizes (product_id, label, available, position) SELECT ?, label, available, position FROM product_sizes WHERE product_id = ?').run(nid, row.id)
    // photographs are copied, so either piece can be edited without touching the other
    const rewrite = (u) => (u && u.startsWith(`/media/${row.id}/`) ? u.replace(`/media/${row.id}/`, `/media/${nid}/`) : u)
    const newId = {}
    for (const i of db.prepare('SELECT * FROM product_images WHERE product_id = ?').all(row.id)) {
      const r = db.prepare(`INSERT INTO product_images (product_id, view, label, src, turn, thumb, focus, width, height, tone, position, is_primary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(nid, i.view, i.label, rewrite(i.src), rewrite(i.turn), rewrite(i.thumb), i.focus, i.width, i.height, i.tone, i.position, i.is_primary)
      newId[i.id] = Number(r.lastInsertRowid)
    }
    // its film is copied with the photographs; the details marked on it point at the copy's own photographs
    const film = readFilm(row)
    if (film) db.prepare('UPDATE products SET film = ? WHERE id = ?').run(JSON.stringify(Object.fromEntries(Object.entries(film).map(([k, v]) => [k, typeof v === 'string' ? rewrite(v) : v]))), nid)
    if (row.stage) db.prepare('UPDATE products SET stage = ? WHERE id = ?').run(row.stage, nid)
    if (row.inside) db.prepare('UPDATE products SET inside = ? WHERE id = ?').run(row.inside.replaceAll(`/media/${row.id}/`, `/media/${nid}/`), nid)
    const spots = (() => { try { return JSON.parse(row.spots || 'null') } catch { return null } })()
    if (Array.isArray(spots)) db.prepare('UPDATE products SET spots = ? WHERE id = ?').run(JSON.stringify(spots.map((sp) => ({ ...sp, photo: sp.photo ? newId[sp.photo] ?? null : null }))), nid)
    return nid
  })
  await copyProductMedia(row.id, newId)
  logActivity(req.user.id, 'duplicated', `${row.number} → ${number}`)
  res.status(201).json(adminProduct(getProduct(newId)))
})

adminRouter.delete('/products/:id', async (req, res) => {
  const row = getProduct(req.params.id)
  if (row.status === 'published') throw new HttpError(409, 'Archive the piece before deleting it — published pieces can’t be deleted directly.')
  if (String(req.body?.confirm ?? '').toUpperCase() !== row.number) throw new HttpError(422, `Type the piece number (${row.number}) to confirm deletion.`)
  db.prepare('DELETE FROM products WHERE id = ?').run(row.id)
  await removeProductMedia(row.id)
  logActivity(req.user.id, 'deleted', `${row.number} ${row.name}`)
  res.json({ ok: true })
})

/* ---------------------------------------------------------------- photos */

const uploadPhotos = (req, res, next) => upload.array('photos', 12)(req, res, (err) => {
  if (!err) return next()
  if (err.code === 'LIMIT_FILE_SIZE') return next(new HttpError(413, 'One of those photos is over 15 MB. Export it smaller and try again.'))
  if (err.code === 'LIMIT_FILE_COUNT') return next(new HttpError(413, 'Upload at most 12 photos at a time.'))
  next(new HttpError(400, 'The upload could not be read. Try again.'))
})

adminRouter.post('/products/:id/images', uploadPhotos, async (req, res) => {
  const row = getProduct(req.params.id)
  const files = req.files ?? []
  if (!files.length) throw new HttpError(422, 'Choose at least one photo.')
  const views = [].concat(req.body.views ?? [])
  const cutout = req.body.cutout !== '0'
  const results = []
  for (let k = 0; k < files.length; k++) {
    const view = VIEWS[views[k]] ? views[k] : (k === 0 && !garmentCount(row.id) ? 'front' : 'detail')
    try {
      const m = await processImage(files[k].buffer, row.id, { view, cutout })
      const pos = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 p FROM product_images WHERE product_id = ?').get(row.id).p
      const primary = VIEWS[view].kind === 'garment' && !garmentCount(row.id) ? 1 : 0
      if (primary) db.prepare('UPDATE product_images SET is_primary = 0 WHERE product_id = ?').run(row.id)
      const { lastInsertRowid } = db.prepare(`INSERT INTO product_images (product_id, view, label, src, turn, thumb, width, height, tone, position, is_primary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(row.id, view, '', m.src, m.turn, m.thumb, m.width, m.height, m.tone ? JSON.stringify(m.tone) : null, pos, primary)
      results.push({ name: clean(files[k].originalname, 80), ok: true, id: Number(lastInsertRowid), cut: m.cut, view })
    } catch (e) {
      results.push({ name: clean(files[k].originalname, 80), ok: false, error: e instanceof HttpError ? e.message : 'That photo could not be processed.' })
    }
  }
  db.prepare("UPDATE products SET updated_at = datetime('now') WHERE id = ?").run(row.id)
  logActivity(req.user.id, 'added photos to', `${row.number} ${row.name}`)
  res.status(results.some((r) => r.ok) ? 201 : 422).json({ results, product: adminProduct(getProduct(row.id)) })
})

adminRouter.patch('/products/:id/images', (req, res) => {
  const row = getProduct(req.params.id)
  const ids = new Set(db.prepare('SELECT id FROM product_images WHERE product_id = ?').all(row.id).map((r) => r.id))
  const { order, primary, views, labels } = req.body ?? {}
  tx(() => {
    if (Array.isArray(order)) order.map(Number).filter((i) => ids.has(i)).forEach((i, k) => db.prepare('UPDATE product_images SET position = ? WHERE id = ?').run(k, i))
    if (views && typeof views === 'object') {
      for (const [i, v] of Object.entries(views)) {
        if (!ids.has(Number(i)) || !VIEWS[v]) continue
        const img = db.prepare('SELECT view, turn FROM product_images WHERE id = ?').get(Number(i))
        // a detail photograph has no cut-out frames, so it cannot become a turning view
        if (VIEWS[v].kind === 'garment' && !img.turn) throw new HttpError(422, 'That photo was uploaded as a detail. Upload it again as a whole-piece view.')
        db.prepare('UPDATE product_images SET view = ? WHERE id = ?').run(v, Number(i))
      }
    }
    if (labels && typeof labels === 'object') for (const [i, l] of Object.entries(labels)) if (ids.has(Number(i))) db.prepare('UPDATE product_images SET label = ? WHERE id = ?').run(clean(l, 40), Number(i))
    if (primary !== undefined) {
      const img = db.prepare('SELECT view FROM product_images WHERE id = ? AND product_id = ?').get(Number(primary), row.id)
      if (!img) throw new HttpError(404, 'That photo is no longer there.')
      if (VIEWS[img.view]?.kind !== 'garment') throw new HttpError(422, 'The main photo must show the whole piece, not a detail.')
      db.prepare('UPDATE product_images SET is_primary = (id = ?) WHERE product_id = ?').run(Number(primary), row.id)
    }
    db.prepare("UPDATE products SET updated_at = datetime('now') WHERE id = ?").run(row.id)
  })
  res.json(adminProduct(getProduct(row.id)))
})

adminRouter.delete('/products/:id/images/:imageId', async (req, res) => {
  const row = getProduct(req.params.id)
  const img = db.prepare('SELECT * FROM product_images WHERE id = ? AND product_id = ?').get(Number(req.params.imageId), row.id)
  if (!img) throw new HttpError(404, 'That photo is no longer there.')
  if (row.status === 'published' && VIEWS[img.view]?.kind === 'garment' && garmentCount(row.id) <= 1) {
    throw new HttpError(409, 'This is the last whole-piece photo of a published piece. Add another first, or unpublish the piece.')
  }
  tx(() => {
    db.prepare('DELETE FROM product_images WHERE id = ?').run(img.id)
    if (img.is_primary) {
      const next = db.prepare('SELECT id, view FROM product_images WHERE product_id = ? ORDER BY position').all(row.id).find((i) => VIEWS[i.view]?.kind === 'garment')
      if (next) db.prepare('UPDATE product_images SET is_primary = 1 WHERE id = ?').run(next.id)
    }
  })
  // bundled photographs (the house's originals) are never deleted from disk
  if (img.src.startsWith(`/media/${row.id}/`)) await removeImageFiles(img)
  res.json(adminProduct(getProduct(row.id)))
})

/* ---------------------------------------------------------------- the film */

// a film is written to disk as it arrives, not held in memory
mkdirSync(FILM_TMP, { recursive: true })
const filmUpload = multer({
  storage: multer.diskStorage({ destination: FILM_TMP, filename: (_req, _file, cb) => cb(null, `up-${Date.now()}-${Math.random().toString(36).slice(2)}`) }),
  limits: { fileSize: FILM_MAX, files: 3, fields: 10 },
}).fields([{ name: 'film', maxCount: 1 }, { name: 'poster', maxCount: 1 }, { name: 'cover', maxCount: 1 }])
const takeFilm = (req, res, next) => filmUpload(req, res, (err) => {
  if (!err) return next()
  if (err.code === 'LIMIT_FILE_SIZE') return next(new HttpError(413, `That film is over ${FILM_MAX / 1048576} MB. Export it shorter or smaller and try again.`))
  next(new HttpError(400, 'The upload could not be read. Try again.'))
})
const dropUploads = (req) => Promise.all(Object.values(req.files ?? {}).flat().map((f) => rm(f.path, { force: true }).catch(() => {})))
const readFilm = (row) => { try { return row.film ? JSON.parse(row.film) : null } catch { return null } }

adminRouter.post('/products/:id/film', takeFilm, async (req, res) => {
  try {
    const row = getProduct(req.params.id)
    const film = req.files?.film?.[0]
    if (!film) throw new HttpError(422, 'Choose a film to upload.')
    const frame = async (name) => {
      const f = req.files?.[name]?.[0]
      if (!f || f.size > 8 * 1024 * 1024) return null
      return readFile(f.path)
    }
    const prepared = await prepareFilm(film.path, row.id, { frames: { poster: await frame('poster'), cover: await frame('cover') }, duration: req.body?.duration })
    const before = readFilm(row)
    db.prepare("UPDATE products SET film = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(prepared), row.id)
    await removeFilmFiles(before)
    logActivity(req.user.id, 'added a film to', `${row.number} ${row.name}`)
    res.status(201).json(adminProduct(getProduct(row.id)))
  } finally {
    await dropUploads(req)
  }
})

adminRouter.delete('/products/:id/film', async (req, res) => {
  const row = getProduct(req.params.id)
  const before = readFilm(row)
  db.prepare("UPDATE products SET film = NULL, updated_at = datetime('now') WHERE id = ?").run(row.id)
  await removeFilmFiles(before)
  logActivity(req.user.id, 'removed the film from', `${row.number} ${row.name}`)
  res.json(adminProduct(getProduct(row.id)))
})

/* ---------------------------------------------------------------- the details marked on the piece */

adminRouter.put('/products/:id/spots', (req, res) => {
  const row = getProduct(req.params.id)
  const list = req.body?.spots
  if (!Array.isArray(list)) throw new HttpError(422, 'Send the list of details.')
  if (list.length > 8) throw new HttpError(422, 'Mark at most eight details — the ones that matter most.')
  const prints = new Set(db.prepare('SELECT id, view FROM product_images WHERE product_id = ?').all(row.id).filter((i) => VIEWS[i.view]?.kind === 'print').map((i) => i.id))
  const spots = list.map((sp, i) => {
    const at = Array.isArray(sp?.at) ? sp.at.map(Number) : []
    if (at.length !== 2 || at.some((v) => !Number.isFinite(v) || v < 0 || v > 1)) throw new HttpError(422, `Detail ${i + 1} isn’t on the photo.`)
    const label = clean(sp.label, 40)
    if (!label) throw new HttpError(422, `Give detail ${i + 1} a name.`)
    const photo = sp.photo === null || sp.photo === undefined || sp.photo === '' ? null : Number(sp.photo)
    if (photo !== null && !prints.has(photo)) throw new HttpError(422, `The photo chosen for “${label}” is no longer there.`)
    return { at: at.map((v) => Math.round(v * 1000) / 1000), label, note: clean(sp.note, 140), photo }
  })
  db.prepare("UPDATE products SET spots = ?, updated_at = datetime('now') WHERE id = ?").run(spots.length ? JSON.stringify(spots) : null, row.id)
  logActivity(req.user.id, 'marked details on', `${row.number} ${row.name}`)
  res.json(adminProduct(getProduct(row.id)))
})

/* ================================================================ categories */

const categoryList = () => db.prepare(`SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status != 'archived') AS products
  FROM categories c ORDER BY c.archived, c.position, c.id`).all()
  .map((c) => ({ id: c.id, slug: c.slug, label: c.label, hidden: !!c.hidden, archived: !!c.archived, products: c.products }))

adminRouter.get('/categories', (_req, res) => res.json(categoryList()))

adminRouter.post('/categories', (req, res) => {
  const label = clean(req.body?.label, 30)
  if (!label) throw new HttpError(422, 'Name the category.', { label: 'Name the category.' })
  const slug = slugify(label)
  if (!slug) throw new HttpError(422, 'Use letters or numbers in the name.', { label: 'Use letters or numbers in the name.' })
  if (db.prepare('SELECT 1 FROM categories WHERE slug = ?').get(slug)) throw new HttpError(409, `“${label}” already exists.`, { label: 'That category already exists.' })
  const pos = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 p FROM categories').get().p
  db.prepare('INSERT INTO categories (slug, label, position) VALUES (?, ?, ?)').run(slug, label, pos)
  logActivity(req.user.id, 'created category', label)
  res.status(201).json(categoryList())
})

adminRouter.patch('/categories/:id', (req, res) => {
  const id = Number(req.params.id)
  const c = db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
  if (!c) throw new HttpError(404, 'That category no longer exists.')
  const { label, hidden, archived, move } = req.body ?? {}
  tx(() => {
    if (label !== undefined) {
      const l = clean(label, 30)
      if (!l) throw new HttpError(422, 'Name the category.', { label: 'Name the category.' })
      // the label changes; the address customers use (the slug) stays, so links keep working
      db.prepare('UPDATE categories SET label = ? WHERE id = ?').run(l, id)
    }
    if (hidden !== undefined) db.prepare('UPDATE categories SET hidden = ? WHERE id = ?').run(hidden ? 1 : 0, id)
    if (archived !== undefined) db.prepare('UPDATE categories SET archived = ?, hidden = ? WHERE id = ?').run(archived ? 1 : 0, archived ? 1 : c.hidden, id)
    if (move === 'up' || move === 'down') {
      const list = db.prepare('SELECT id FROM categories WHERE archived = 0 ORDER BY position, id').all().map((r) => r.id)
      const i = list.indexOf(id)
      const j = move === 'up' ? i - 1 : i + 1
      if (i >= 0 && j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]]
      list.forEach((cid, k) => db.prepare('UPDATE categories SET position = ? WHERE id = ?').run(k, cid))
    }
  })
  logActivity(req.user.id, 'updated category', c.label)
  res.json(categoryList())
})

adminRouter.delete('/categories/:id', (req, res) => {
  const id = Number(req.params.id)
  const c = db.prepare('SELECT * FROM categories WHERE id = ?').get(id)
  if (!c) throw new HttpError(404, 'That category no longer exists.')
  const n = db.prepare('SELECT COUNT(*) n FROM products WHERE category_id = ?').get(id).n
  if (n) throw new HttpError(409, `${c.label} still holds ${n} piece${n === 1 ? '' : 's'}. Move them or archive the category instead.`)
  db.prepare('DELETE FROM categories WHERE id = ?').run(id)
  logActivity(req.user.id, 'deleted category', c.label)
  res.json(categoryList())
})

/* ================================================================ orders */

adminRouter.get('/orders', (req, res) => {
  const status = ORDER_STATUSES.includes(req.query.status) ? req.query.status : null
  res.json(db.prepare(`SELECT o.*, p.slug, (SELECT thumb FROM product_images i WHERE i.product_id = o.product_id ORDER BY is_primary DESC, position LIMIT 1) AS thumb
    FROM orders o LEFT JOIN products p ON p.id = o.product_id ${status ? 'WHERE o.status = ?' : ''} ORDER BY o.id DESC LIMIT 500`).all(...(status ? [status] : [])))
})

adminRouter.patch('/orders/:id', (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(Number(req.params.id))
  if (!o) throw new HttpError(404, 'That order no longer exists.')
  const status = req.body?.status ?? o.status
  if (!ORDER_STATUSES.includes(status)) throw new HttpError(422, 'Unknown status.')
  const note = req.body?.note !== undefined ? cleanLong(req.body.note, 500) : o.note
  db.prepare("UPDATE orders SET status = ?, note = ?, updated_at = datetime('now') WHERE id = ?").run(status, note, o.id)
  if (status !== o.status) logActivity(req.user.id, `marked order ${status}`, o.ref)
  res.json(db.prepare('SELECT * FROM orders WHERE id = ?').get(o.id))
})

/* ================================================================ about + settings */

adminRouter.get('/about', (_req, res) => res.json(getContent('about', DEFAULT_ABOUT)))

adminRouter.put('/about', (req, res) => {
  const b = req.body ?? {}
  const f = {}
  const about = {
    title: clean(b.title, 140),
    body: cleanLong(b.body, 2000),
    motto: clean(b.motto, 80),
    sections: (Array.isArray(b.sections) ? b.sections : []).slice(0, 6)
      .map((s) => ({ heading: clean(s?.heading, 80), text: cleanLong(s?.text, 1500) }))
      .filter((s) => s.heading || s.text),
    image: typeof b.image === 'string' && b.image.startsWith('/media/about/') ? b.image : null,
  }
  if (!about.title) f.title = 'Give the page a title.'
  if (!about.body) f.body = 'Write a few lines about the house.'
  if (Object.keys(f).length) throw new HttpError(422, 'Check the highlighted fields.', f)
  setContent('about', about)
  logActivity(req.user.id, 'updated the About page')
  res.json(about)
})

adminRouter.post('/about/image', uploadPhotos, async (req, res) => {
  const file = req.files?.[0]
  if (!file) throw new HttpError(422, 'Choose a photo.')
  const m = await processImage(file.buffer, 'about', { view: 'detail' })
  res.status(201).json({ src: m.src })
})

adminRouter.get('/settings', (_req, res) => res.json({ ...DEFAULT_SETTINGS, ...getContent('settings', {}) }))

adminRouter.put('/settings', (req, res) => {
  const b = req.body ?? {}
  const f = {}
  const fee = Number(b.deliveryFee)
  const whatsapp = String(b.whatsapp ?? '').replace(/[^\d]/g, '')
  const instagram = clean(b.instagram, 30).replace(/^@/, '')
  if (!Number.isFinite(fee) || fee < 0 || fee > 1000) f.deliveryFee = 'Use a number like 1 or 2.50.'
  if (whatsapp.length < 8 || whatsapp.length > 15) f.whatsapp = 'Use the full number with country code, e.g. +964 750 163 9395.'
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(instagram)) f.instagram = 'Use the handle only, e.g. hoshawestman.'
  if (Object.keys(f).length) throw new HttpError(422, 'Check the highlighted fields.', f)
  const settings = { ...DEFAULT_SETTINGS, ...getContent('settings', {}), deliveryFee: Math.round(fee * 100) / 100, whatsapp, instagram }
  setContent('settings', settings)
  logActivity(req.user.id, 'updated ordering settings')
  res.json(settings)
})

/* ---------------------------------------------------------------- size guide */

/**
 * The house's own measurements, of the garment laid flat. Everything is
 * checked here: a measurement is a number in a believable range or it is left
 * out, so an empty cell is shown as "—" rather than as a wrong number.
 */
const MEASURES = ['chest', 'length', 'shoulder', 'sleeve']

const measurement = (v) => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0 || n > 300) return null
  return Math.round(n * 10) / 10
}

adminRouter.get('/size-guide', (_req, res) => res.json(getContent('sizeGuide', DEFAULT_SIZE_GUIDE)))

adminRouter.put('/size-guide', (req, res) => {
  const b = req.body ?? {}
  const slugs = new Set(db.prepare('SELECT slug FROM categories').all().map((c) => c.slug))
  const tables = (Array.isArray(b.tables) ? b.tables : [])
    .filter((t) => t && (t.category === 'all' || slugs.has(t.category)))
    .slice(0, 20)
    .map((t) => ({
      category: t.category,
      rows: (Array.isArray(t.rows) ? t.rows : [])
        .slice(0, 16)
        .map((r) => ({ size: clean(r?.size, 6), ...Object.fromEntries(MEASURES.map((m) => [m, measurement(r?.[m])])) }))
        .filter((r) => r.size),
    }))
    // a table with no measurement in it at all says nothing; it is not kept
    .filter((t) => t.rows.some((r) => MEASURES.some((m) => r[m] !== null)))

  const guide = { unit: b.unit === 'in' ? 'in' : 'cm', note: cleanLong(b.note, 400), tables }
  setContent('sizeGuide', guide)
  logActivity(req.user.id, 'updated the size guide')
  res.json(guide)
})

export { mediaUrl }
