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

/**
 * The build's scripts and stylesheets as they were compressed at build time
 * (scripts/compress.mjs) — Brotli at its strongest, or gzip — sent as they
 * are, so nothing is compressed again per visitor. Anything without a
 * compressed copy falls through to the ordinary static files.
 */
const TYPES = { '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json' }
function precompressed(dir, cacheControl) {
  const known = new Map()
  const has = (file) => {
    if (!known.has(file)) known.set(file, existsSync(file))
    return known.get(file)
  }
  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    const m = req.path.match(/^\/([\w.-]+)(\.js|\.css|\.svg|\.json|\.webmanifest)$/)
    if (!m || m[1].includes('..')) return next()
    const accept = req.get('accept-encoding') || ''
    const [encoding, ext] = /\bbr\b/.test(accept) ? ['br', '.br'] : /\bgzip\b/.test(accept) ? ['gzip', '.gz'] : []
    const file = encoding && join(dir, `${m[1]}${m[2]}${ext}`)
    if (!file || !has(file)) return next()
    res.set({ 'Content-Type': TYPES[m[2]], 'Content-Encoding': encoding, Vary: 'Accept-Encoding', 'Cache-Control': cacheControl })
    res.sendFile(file, (err) => { if (err && !res.headersSent) next() })
  }
}

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
  app.use('/assets', precompressed(join(DIST, 'assets'), 'public, max-age=31536000, immutable'))
  app.use('/assets', express.static(join(DIST, 'assets'), { immutable: true, maxAge: '365d' }))
  // a font file is never changed under the same name (src/fonts.css)
  app.use('/fonts', express.static(join(DIST, 'fonts'), { immutable: true, maxAge: '365d' }))
  app.use(precompressed(DIST, 'public, max-age=3600'))
  app.use(express.static(DIST, {
    index: false,
    maxAge: '1h',
    setHeaders(res, path) {
      // a photograph or film can be replaced under its own name, so it is asked
      // after again within the hour — but the copy a phone already has is
      // shown at once meanwhile, and while it asks
      if (/\.(webp|avif|jpe?g|png|mp4|webm)$/.test(path)) res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=2592000')
      // the service worker is always checked for a newer one (src/sw.js)
      if (/[\\/]sw\.js$/.test(path)) res.set('Cache-Control', 'no-cache')
    },
  }))
  app.get(/^\/admin(\/.*)?$/, (_req, res) => res.sendFile(join(DIST, 'admin', 'index.html')))

  // every page is the same file; only the tags in its head differ, and those
  // are what a link pasted into WhatsApp or Instagram is read from
  const SHELL = join(DIST, 'index.html')
  const META = /<!--hs:meta-->[\s\S]*?<!--\/hs:meta-->/
  const OPENING = /<!--hs:opening-->[\s\S]*?<!--\/hs:opening-->/
  // a page that is its own script (the archive, the story) has it fetched with
  // the page itself rather than once the main script has asked for it — on a
  // phone, one round trip less before it can draw (vite.config.js: manifest)
  const PAGES = { browse: 'src/components/browse/Browse.jsx', saved: 'src/components/browse/Browse.jsx', story: 'src/components/story/Story.jsx' }
  let manifest = null
  try { manifest = JSON.parse(readFileSync(join(DIST, '.vite', 'manifest.json'), 'utf8')) } catch { /* built without one: no hints */ }
  const preloads = (path) => {
    const key = PAGES[path.replace(/^\/+|\/+$/g, '')]
    const entry = key && manifest?.[key]
    if (!entry) return ''
    // (what the page already loads for every page is left to it)
    return [entry.file, ...(entry.imports ?? []).map((k) => manifest[k]?.file)]
      .filter((f) => f && !shell.includes(f))
      .map((f) => `<link rel="modulepreload" crossorigin href="/${f}" />`)
      .concat((entry.css ?? []).filter((f) => !shell.includes(f)).map((f) => `<link rel="stylesheet" crossorigin href="/${f}" />`))
      .join('\n    ')
  }
  let shell = null
  app.get(/^\/(?!api\/|media\/|share\/).*/, (req, res) => {
    try {
      shell ??= readFileSync(SHELL, 'utf8')
      // (as functions, so a "$" in a name or a motto is never read as a replacement pattern)
      res.type('html').send(shell.replace(META, () => `${metaFor(req)}\n    ${preloads(req.path)}\n    ${catalogueFor()}`).replace(OPENING, () => openingFor()))
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
