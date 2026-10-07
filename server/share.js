import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { dirname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The card a shared link shows.
 *
 * The house sells on WhatsApp and Instagram, so a link is passed around far
 * more often than it is typed — and until now it arrived as a bare grey box.
 * This draws the same room the showroom does, at 1200×630: the piece's own
 * palette as the field, its neon down the right, its glow on the floor, the
 * garment lit in the middle of it, and the house's name above. Everything is
 * taken from the piece itself, the same rule the rest of the site follows.
 *
 * Nothing that can go stale is drawn into it — no price, no sizes — so a card
 * stays true however often the admin changes the piece. The words a scraper
 * shows beside it come from the page's own meta tags, which are always current.
 *
 * Cards are cached under storage/share and rebuilt when the piece changes
 * (the cache key carries the piece's updated_at), so a link is never slow.
 */
const W = 1200
const H = 630
// the same places db.js keeps things, worked out without opening the database:
// drawing a card has nothing to do with it, and the build draws one too
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const STORAGE = process.env.HS_STORAGE || join(ROOT, 'storage')
const MEDIA_DIR = join(STORAGE, 'media')
export const SHARE_DIR = join(STORAGE, 'share')

const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
// a theme from the database is a plain object of "r g b" triplets
const tone = (theme, key, fallback) => {
  const v = theme?.[key]
  return Array.isArray(v) && v.length === 3 ? v : fallback
}
const esc = (s) =>
  String(s ?? '').replace(/[<>&'"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[ch])

const DISPLAY = "DejaVu Serif, Georgia, 'Times New Roman', serif"
const SANS = "Inter, 'DejaVu Sans', Helvetica, Arial, sans-serif"

/**
 * Where a photograph actually sits on disk. An uploaded one lives under
 * storage/media; a bundled one is served from the build, or from public/ when
 * the site has not been built yet. Paths are resolved and checked to stay
 * inside those folders, so a stored path can never reach elsewhere.
 */
async function readPhoto(src) {
  if (!src) return null
  const clean = String(src).split(/[?#]/)[0]
  const rel = clean.replace(/^\.?\//, '')
  const places = clean.startsWith('/media/')
    ? [[MEDIA_DIR, clean.slice('/media/'.length)]]
    : [
        [join(ROOT, 'dist'), rel],
        [join(ROOT, 'public'), rel],
      ]
  for (const [root, tail] of places) {
    const path = normalize(join(root, tail))
    if (path !== root && !path.startsWith(root + sep)) continue
    try {
      return await readFile(path)
    } catch {
      /* try the next place */
    }
  }
  return null
}

/** The room, drawn flat: gradients only, the same ones the showroom lights. */
function room(theme) {
  const bg0 = tone(theme, 'bg0', [5, 4, 10])
  const bg1 = tone(theme, 'bg1', [14, 11, 28])
  const bg2 = tone(theme, 'bg2', [46, 36, 84])
  const floor = tone(theme, 'floor', bg0)
  const neon = tone(theme, 'neon', [150, 96, 255])
  const ink = tone(theme, 'ink', [244, 242, 248])
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="field" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${rgb(bg1)}"/>
      <stop offset="0.58" stop-color="${rgb(bg0)}"/>
      <stop offset="1" stop-color="${rgb(floor)}"/>
    </linearGradient>
    <radialGradient id="pool" cx="0.5" cy="0.12" r="0.78">
      <stop offset="0" stop-color="${rgb(bg2, 0.62)}"/>
      <stop offset="1" stop-color="${rgb(bg2, 0)}"/>
    </radialGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${rgb(neon, 0)}"/>
      <stop offset="0.22" stop-color="${rgb(neon, 0.9)}"/>
      <stop offset="0.78" stop-color="${rgb(neon, 0.9)}"/>
      <stop offset="1" stop-color="${rgb(neon, 0)}"/>
    </linearGradient>
    <radialGradient id="bloom" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${rgb(neon, 0.3)}"/>
      <stop offset="1" stop-color="${rgb(neon, 0)}"/>
    </radialGradient>
    <radialGradient id="pad" cx="0.5" cy="1" r="0.6">
      <stop offset="0" stop-color="${rgb(neon, 0.15)}"/>
      <stop offset="1" stop-color="${rgb(neon, 0)}"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#field)"/>
  <rect width="${W}" height="${H}" fill="url(#pool)"/>
  <!-- the glass slab's lit edge, and its light thrown wide into the room -->
  <rect x="${W * 0.8}" y="0" width="${W * 0.2}" height="${H}" fill="url(#bloom)"/>
  <rect x="${W * 0.935}" y="0" width="2" height="${H}" fill="url(#edge)"/>
  <!-- polished floor, catching the neon under the piece -->
  <rect x="0" y="${H * 0.62}" width="${W}" height="${H * 0.38}" fill="url(#pad)"/>
  <rect x="0" y="${H - 3}" width="${W}" height="3" fill="${rgb(ink, 0.05)}"/>
</svg>`
}

/**
 * The house's name and the piece's, set the way the site sets them. A card
 * for the house itself carries the wordmark where a piece would carry its
 * name, so the two never print together.
 */
const MARGIN = 72
// the words have the left of the card; the garment hangs clear to the right of
// this. Letterforms are not measured — the card is drawn without a layout
// engine — so a letterspaced capital is taken at this much of its size, which
// is a little generous, and the line is set to whatever fits inside the column.
const COLUMN = Math.round(W * 0.5) - MARGIN
const PER_CHAR = 0.86

/** The largest size at which `text` fits the column, and how it has to break. */
function setLines(text, max = 56, min = 30) {
  const fits = (s, size) => s.length * size * PER_CHAR <= COLUMN
  const size = Math.min(max, Math.floor(COLUMN / (text.length * PER_CHAR)))
  if (size >= min) return { lines: [text], size }
  // too long to stand on one line: break at the word nearest the middle
  const words = text.split(' ')
  if (words.length < 2) return { lines: [text], size: Math.max(min, size) }
  let best = 1
  for (let i = 1; i < words.length; i++) {
    const here = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length)
    const there = Math.abs(words.slice(0, best).join(' ').length - words.slice(best).join(' ').length)
    if (here < there) best = i
  }
  const lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')]
  const longest = Math.max(...lines.map((l) => l.length))
  let two = Math.min(max, Math.floor(COLUMN / (longest * PER_CHAR)))
  while (two > 18 && !lines.every((l) => fits(l, two))) two--
  return { lines, size: two }
}

/**
 * The house's name and the piece's, set the way the site sets them. A card
 * for the house itself carries the wordmark where a piece would carry its
 * name, so the two never print together. Everything is laid out from the
 * bottom up, so a name that takes two lines pushes its number up rather than
 * printing over it.
 */
function type(product, theme) {
  const ink = tone(theme, 'ink', [244, 242, 248])
  const neon = tone(theme, 'neon', [150, 96, 255])
  const name = String(product.name ?? '').toUpperCase().trim()
  const house = !name || name === 'HOSHA STONE'
  const { lines, size } = setLines(house ? 'HOSHA STONE' : name)

  const taglineY = H - 54
  const lastY = taglineY - 42
  const headline = lines
    .map(
      (line, i) =>
        `<text x="${MARGIN}" y="${lastY - (lines.length - 1 - i) * size * 1.12}" font-family="${DISPLAY}" font-size="${size}" letter-spacing="${(size * 0.1).toFixed(1)}" fill="${rgb(ink, 0.98)}">${esc(line)}</text>`,
    )
    .join('\n  ')
  const numberY = lastY - (lines.length - 1) * size * 1.12 - 52

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  ${
    house
      ? ''
      : `<text x="${MARGIN}" y="92" font-family="${DISPLAY}" font-size="27" letter-spacing="9.5" fill="${rgb(ink, 0.95)}">HOSHA STONE</text>
  <rect x="${MARGIN + 2}" y="118" width="64" height="1" fill="${rgb(neon, 0.9)}"/>`
  }
  <text x="${MARGIN}" y="${numberY}" font-family="${SANS}" font-size="16" letter-spacing="5.6" fill="${rgb(ink, 0.56)}">${esc(
    house ? 'THE HOUSE' : product.number ? `/ ${product.number}` : '/ ARCHIVE',
  )}</text>
  ${headline}
  <text x="${MARGIN}" y="${taglineY}" font-family="${SANS}" font-size="15" letter-spacing="5.2" fill="${rgb(ink, 0.5)}">${esc(
    String(product.tagline || 'Simple. Never ordinary.').toUpperCase(),
  )}</text>
</svg>`
}

/**
 * The card for one piece. The garment is fitted into the right of the frame
 * and given its own neon halo — its silhouette, blurred, in the piece's colour
 * — so it reads as lit rather than pasted on.
 */
export async function shareCard(product) {
  const theme = product.theme ?? {}
  const neon = tone(theme, 'neon', [150, 96, 255])
  const photo = await readPhoto(product.hero?.src)

  const layers = [{ input: Buffer.from(type(product, theme)) }]

  if (photo) {
    const boxW = Math.round(W * 0.38)
    const boxH = Math.round(H * 0.76)
    const garment = await sharp(photo)
      .resize({ width: boxW, height: boxH, fit: 'inside', withoutEnlargement: false })
      .png()
      .toBuffer()
    const { width = boxW, height = boxH } = await sharp(garment).metadata()
    const left = Math.round(W * 0.725 - width / 2)
    const top = Math.round((H - height) / 2 - H * 0.015)

    // the halo: the garment's own shape, in its own neon, blurred wide
    const halo = await sharp({
      create: { width, height, channels: 4, background: { r: neon[0], g: neon[1], b: neon[2], alpha: 0.5 } },
    })
      .composite([{ input: garment, blend: 'dest-in' }])
      .blur(28)
      .png()
      .toBuffer()

    layers.push({ input: halo, left, top }, { input: garment, left, top })
  }

  return sharp(Buffer.from(room(theme)))
    .composite(layers)
    .jpeg({ quality: 86, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toBuffer()
}

/** The house's own card, for the home page and anywhere a piece is not named. */
export async function houseCard(products = []) {
  const first = products[0]
  return shareCard({
    name: 'Hosha Stone',
    number: '',
    tagline: 'Simple. Never ordinary.',
    theme: first?.theme ?? {},
    hero: first?.hero ?? {},
  })
}
