import express from 'express'
import compression from 'compression'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT, MEDIA_DIR } from './db.js'
import { addNewPieces, seedIfEmpty } from './seed.js'
import { cookies, issueSetupCode } from './auth.js'
import { publicRouter } from './routes/public.js'
import { adminRouter } from './routes/admin.js'
import { shareRouter } from './routes/share.js'
import { catalogueFor, metaFor, openingFor, origin, sitemap } from './meta.js'
import { HttpError } from './validate.js'

/**
 * The Hosha Stone server: the customer site (built into dist/), the admin at
 * /admin, the JSON API at /api, and uploaded photographs at /media.
 *
 *   npm run build && npm start      production, one process
 *   npm run server + npm run dev    development (Vite proxies /api and /media here)
 */
const PORT = Number(process.env.PORT) || 8787
const DIST = join(ROOT, 'dist')
const app = express()

app.disable('x-powered-by')
// behind a proxy (Render, Railway, nginx) req.ip and req.secure come from it
if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : process.env.TRUST_PROXY)

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
    // location only for the site's own pages: the order form asks for it, with the customer's say-so
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
  })
  if (req.path.startsWith('/api/admin') || req.path.startsWith('/admin')) res.set('Cache-Control', 'no-store')
  next()
})
// text goes out compressed — Brotli where the browser takes it, gzip otherwise.
// Unpacked, the site's script is three times the size; on a phone over a
// cellular connection that difference is most of the wait. Photographs are
// already compressed and are left alone.
app.use(compression())
app.use(express.json({ limit: '200kb' }))
app.use(cookies)

app.use('/api', publicRouter)
app.use('/api/admin', adminRouter)
app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found.')))

// the picture a shared link shows, drawn from the piece itself
app.use('/share', shareRouter)

// uploaded photographs: named by random id, so they can be cached for good
app.use('/media', express.static(MEDIA_DIR, { immutable: true, maxAge: '365d', index: false, dotfiles: 'deny' }))

app.get('/robots.txt', (req, res) => {
  const base = origin(req)
  res.type('text/plain').send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /saved

Sitemap: ${base}/sitemap.xml
`)
})

app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(sitemap(req))
})

if (existsSync(DIST)) {
  app.use('/assets', express.static(join(DIST, 'assets'), { immutable: true, maxAge: '365d' }))
  // a font file is never changed under the same name (src/fonts.css)
  app.use('/fonts', express.static(join(DIST, 'fonts'), { immutable: true, maxAge: '365d' }))
  app.use(express.static(DIST, { index: false, maxAge: '1h' }))
  app.get(/^\/admin(\/.*)?$/, (_req, res) => res.sendFile(join(DIST, 'admin', 'index.html')))

  // every page is the same file; only the tags in its head differ, and those
  // are what a link pasted into WhatsApp or Instagram is read from
  const SHELL = join(DIST, 'index.html')
  const META = /<!--hs:meta-->[\s\S]*?<!--\/hs:meta-->/
  const OPENING = /<!--hs:opening-->[\s\S]*?<!--\/hs:opening-->/
  let shell = null
  app.get(/^\/(?!api\/|media\/|share\/).*/, (req, res) => {
    try {
      shell ??= readFileSync(SHELL, 'utf8')
      // (as functions, so a "$" in a name or a motto is never read as a replacement pattern)
      res.type('html').send(shell.replace(META, () => `${metaFor(req)}\n    ${catalogueFor()}`).replace(OPENING, () => openingFor()))
    } catch {
      res.sendFile(SHELL)
    }
  })
}

app.use((err, req, res, _next) => {
  const status = err instanceof HttpError ? err.status : err?.type === 'entity.too.large' ? 413 : err?.type === 'entity.parse.failed' ? 400 : 500
  if (status === 500) console.error(new Date().toISOString(), req.method, req.path, err)
  res.status(status).json({
    error: status === 500 ? 'Something went wrong on the server. Nothing was changed — try again.' : err.message || 'Request refused.',
    ...(err?.fields ? { fields: err.fields } : {}),
  })
})

if (seedIfEmpty()) console.log('  Seeded the database with the house’s current pieces.')
for (const name of addNewPieces()) console.log(`  Added a new piece from the bundled catalogue: ${name}`)
app.listen(PORT, () => {
  console.log(`\n  Hosha Stone  →  http://localhost:${PORT}\n  Admin        →  http://localhost:${PORT}/admin`)
  const code = issueSetupCode()
  if (code) console.log(`\n  No admin account yet. Open /admin and use this one-time setup code:\n\n      ${code}\n`)
})
