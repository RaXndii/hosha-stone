import sharp from 'sharp'
import { randomUUID } from 'node:crypto'
import { mkdir, rm, cp } from 'node:fs/promises'
import { join } from 'node:path'
import { MEDIA_DIR } from './db.js'
import { HttpError } from './validate.js'

/**
 * Photographs, prepared the way the site presents them.
 *
 * A whole-garment photograph becomes a cut-out: if it was shot on a plain
 * studio background, the background is removed (filled in from the edges by
 * colour, plus any studio-coloured gaps trapped between sleeve and body), the
 * piece is trimmed tight and its edge softened, and it is written as WebP at
 * three sizes — the stage and turntable frame for desks (≤1800px tall), a
 * lighter one for phones (≤960px), and a thumbnail. A PNG/WebP that already
 * has transparency is used as it is. A photograph on a busy background keeps
 * its background and says so, rather than being cut badly.
 *
 * A detail photograph keeps its full frame (≤1800px long side) and a thumbnail.
 *
 * Files are named by a random id, never by what the browser called them.
 */
sharp.cache(false)
const MAX_BYTES = 15 * 1024 * 1024
const ACCEPT = new Set(['jpeg', 'png', 'webp', 'avif', 'heif', 'tiff'])
const WORK_MAX = 2000

export const mediaUrl = (productId, file) => `/media/${productId}/${file}`

export async function inspect(buffer) {
  if (!buffer?.length) throw new HttpError(422, 'That file is empty.')
  if (buffer.length > MAX_BYTES) throw new HttpError(413, `That photo is ${(buffer.length / 1048576).toFixed(1)} MB — the limit is 15 MB. Export it smaller and try again.`)
  let meta
  try { meta = await sharp(buffer, { failOn: 'error' }).metadata() } catch { throw new HttpError(422, 'That file is not a photo we can read. Use JPG, PNG, WebP or AVIF.') }
  if (!ACCEPT.has(meta.format)) throw new HttpError(422, `${String(meta.format).toUpperCase()} files are not supported. Use JPG, PNG, WebP or AVIF.`)
  if ((meta.width ?? 0) < 300 || (meta.height ?? 0) < 300) throw new HttpError(422, `That photo is only ${meta.width}×${meta.height}px — use one at least 600px tall so it looks sharp.`)
  if (meta.width * meta.height > 60e6) throw new HttpError(422, 'That photo is too large to process (over 60 megapixels).')
  return meta
}

/* ---------------------------------------------------------------- cut-out */

function largestComponents(mask, w, h) {
  const lab = new Int32Array(w * h)
  const sizes = [0]
  let id = 0
  const st = new Int32Array(w * h)
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || lab[s]) continue
    id++
    let top = 0, n = 0
    st[top++] = s
    lab[s] = id
    while (top) {
      const i = st[--top]; n++
      const x = i % w, y = (i / w) | 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        const j = ny * w + nx
        if (mask[j] && !lab[j]) { lab[j] = id; st[top++] = j }
      }
    }
    sizes.push(n)
  }
  const biggest = Math.max(0, ...sizes)
  const out = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) if (lab[i] && sizes[lab[i]] >= biggest * 0.15) out[i] = 1
  return out
}

/** RGBA buffer in → RGBA with the background removed, or null if the background is not plain. */
function cutOut(data, w, h) {
  const px = (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]
  // the studio colour: the median of the border
  const border = []
  for (let x = 0; x < w; x += 2) { border.push(px(x), px((h - 1) * w + x)) }
  for (let y = 0; y < h; y += 2) { border.push(px(y * w), px(y * w + w - 1)) }
  const med = [0, 1, 2].map((c) => border.map((p) => p[c]).sort((a, b) => a - b)[border.length >> 1])
  const dist = (i) => Math.hypot(data[i * 4] - med[0], data[i * 4 + 1] - med[1], data[i * 4 + 2] - med[2])
  const near = border.filter((p) => Math.hypot(p[0] - med[0], p[1] - med[1], p[2] - med[2]) < 30).length / border.length
  if (near < 0.7) return null

  const T = 30
  const bg = new Uint8Array(w * h)
  const st = new Int32Array(w * h)
  let top = 0
  const push = (i) => { if (!bg[i] && dist(i) < T) { bg[i] = 1; st[top++] = i } }
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x) }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1) }
  while (top) {
    const i = st[--top]
    const x = i % w, y = (i / w) | 0
    if (x > 0) push(i - 1); if (x < w - 1) push(i + 1); if (y > 0) push(i - w); if (y < h - 1) push(i + w)
  }
  // studio colour trapped inside the outline (between a cuff and the hem)
  const seen = new Uint8Array(w * h)
  const minPatch = Math.max(12, Math.round(w * h * 0.00015))
  for (let s = 0; s < w * h; s++) {
    if (bg[s] || seen[s] || dist(s) >= T * 0.8) continue
    const comp = [s]
    seen[s] = 1
    for (let k = 0; k < comp.length; k++) {
      const i = comp[k], x = i % w, y = (i / w) | 0
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (j >= 0 && !bg[j] && !seen[j] && dist(j) < T * 0.8) { seen[j] = 1; comp.push(j) }
      }
    }
    if (comp.length >= minPatch) for (const i of comp) bg[i] = 1
  }
  const fg = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) fg[i] = bg[i] ? 0 : 1
  const keep = largestComponents(fg, w, h)
  if (keep.reduce((a, b) => a + b, 0) < w * h * 0.03) return null

  // how far each kept pixel is from the background, up to the width of a soft photographic edge
  const BAND = Math.max(3, Math.round(Math.max(w, h) / 500))
  const depth = new Uint8Array(w * h).fill(255)
  let ring = []
  for (let i = 0; i < w * h; i++) {
    if (!keep[i]) continue
    const x = i % w, y = (i / w) | 0
    if ((x > 0 && !keep[i - 1]) || (x < w - 1 && !keep[i + 1]) || (y > 0 && !keep[i - w]) || (y < h - 1 && !keep[i + w])) { depth[i] = 1; ring.push(i) }
  }
  for (let d = 2; d <= BAND + 2 && ring.length; d++) {
    const next = []
    for (const i of ring) {
      const x = i % w, y = (i / w) | 0
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
        if (j >= 0 && keep[j] && depth[j] === 255) { depth[j] = d; next.push(j) }
      }
    }
    ring = next
  }
  // across the edge band, opacity follows how unlike the studio each pixel is,
  // so a soft photographic edge fades out instead of leaving a grey outline
  const out = Buffer.from(data)
  for (let i = 0; i < w * h; i++) {
    if (!keep[i]) { out[i * 4 + 3] = 0; continue }
    if (depth[i] > BAND) { out[i * 4 + 3] = 255; continue }
    const a = Math.max(0, Math.min(1, (dist(i) - T * 0.7) / (T * 2.6)))
    // deeper pixels are trusted more: the very edge fades, the band behind it firms up
    const firm = (depth[i] - 1) / BAND
    out[i * 4 + 3] = Math.round(255 * Math.min(1, a + firm * firm))
  }
  // and the band takes the colour of the cloth just inside it — no studio halo
  const R = BAND + 2
  for (let i = 0; i < w * h; i++) {
    if (!keep[i] || depth[i] > BAND) continue
    const x = i % w, y = (i / w) | 0
    let r = 0, g = 0, b = 0, k = 0
    for (let dy = -R; dy <= R; dy += 1) for (let dx = -R; dx <= R; dx += 1) {
      const xx = x + dx, yy = y + dy
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue
      const j = yy * w + xx
      if (keep[j] && depth[j] > BAND) { r += data[j * 4]; g += data[j * 4 + 1]; b += data[j * 4 + 2]; k++ }
    }
    if (k) {
      // blend toward the inner colour more the closer the pixel is to the background
      const t = 1 - (depth[i] - 1) / BAND
      out[i * 4] = Math.round(data[i * 4] * (1 - t) + (r / k) * t)
      out[i * 4 + 1] = Math.round(data[i * 4 + 1] * (1 - t) + (g / k) * t)
      out[i * 4 + 2] = Math.round(data[i * 4 + 2] * (1 - t) + (b / k) * t)
    }
  }
  return out
}

/** The cloth's colour: its mean, and its most vivid colour if it has a real one (a label, a lining). */
function toneOf(data, w, h) {
  let r = 0, g = 0, b = 0, n = 0, vr = 0, vg = 0, vb = 0, vn = 0
  for (let i = 0; i < w * h; i += 3) {
    if (data[i * 4 + 3] < 250) continue
    const R = data[i * 4], G = data[i * 4 + 1], B = data[i * 4 + 2]
    r += R; g += G; b += B; n++
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B)
    if (mx > 70 && (mx - mn) / mx > 0.45) { vr += R; vg += G; vb += B; vn++ }
  }
  if (!n) return null
  return {
    mean: [r / n, g / n, b / n].map(Math.round),
    vivid: vn > n * 0.004 ? [vr / vn, vg / vn, vb / vn].map(Math.round) : null,
  }
}

async function writeWebp(img, file, opts = {}) {
  return img.webp({ quality: 90, alphaQuality: 100, effort: 5, ...opts }).toFile(file)
}

/**
 * Prepare one uploaded photograph for a product.
 * → { src, turn, thumb, width, height, tone, cut }
 */
export async function processImage(buffer, productId, { view, cutout = true }) {
  await inspect(buffer)
  const dir = join(MEDIA_DIR, String(productId))
  await mkdir(dir, { recursive: true })
  const id = randomUUID()
  const base = sharp(buffer, { failOn: 'error' }).rotate().toColourspace('srgb')

  if (view === 'detail') {
    const big = await writeWebp(base.clone().resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true }), join(dir, `${id}.webp`), { quality: 86 })
    await writeWebp(base.clone().resize({ width: 480, height: 480, fit: 'inside' }), join(dir, `${id}-thumb.webp`), { quality: 80 })
    return { src: mediaUrl(productId, `${id}.webp`), turn: null, thumb: mediaUrl(productId, `${id}-thumb.webp`), width: big.width, height: big.height, tone: null, cut: false }
  }

  // work at a manageable size, with alpha
  const { data, info } = await base.clone().resize({ width: WORK_MAX, height: WORK_MAX, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const w = info.width, h = info.height
  let rgba = data
  let cut = false
  let alreadyCut = false
  for (let x = 0; x < w && !alreadyCut; x += 4) if (data[x * 4 + 3] < 200 || data[((h - 1) * w + x) * 4 + 3] < 200) alreadyCut = true
  if (alreadyCut) cut = true
  else if (cutout) {
    const c = cutOut(data, w, h)
    if (c) { rgba = c; cut = true }
  }
  const tone = toneOf(rgba, w, h)

  let piece = sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
  if (cut) piece = sharp(await piece.png().toBuffer()).trim({ threshold: 1 })
  const trimmed = await piece.png().toBuffer({ resolveWithObject: true })
  const tw = trimmed.info.width, th = trimmed.info.height
  // small originals are enlarged at most 2× — never invented beyond that
  const targetH = Math.min(1800, Math.max(th, Math.min(th * 2, 1400)))
  const scale = targetH / th
  const big = sharp(trimmed.data).resize(Math.round(tw * scale), Math.round(th * scale), { kernel: 'lanczos3' })
  const bigOut = await writeWebp(scale > 1.05 ? big.sharpen({ sigma: 0.8, m1: 0.6, m2: 1.4 }) : big, join(dir, `${id}-tt@2.webp`))
  const phoneH = Math.min(960, Math.round(th * scale))
  await writeWebp(sharp(trimmed.data).resize({ height: phoneH, kernel: 'lanczos3' }), join(dir, `${id}-tt.webp`), { quality: 86 })
  await writeWebp(sharp(trimmed.data).resize({ width: 480, height: 480, fit: 'inside' }), join(dir, `${id}-thumb.webp`), { quality: 80 })

  return {
    src: mediaUrl(productId, `${id}-tt@2.webp`),
    turn: mediaUrl(productId, `${id}-tt`),
    thumb: mediaUrl(productId, `${id}-thumb.webp`),
    width: bigOut.width,
    height: bigOut.height,
    tone,
    cut,
  }
}

export const removeProductMedia = (productId) => rm(join(MEDIA_DIR, String(productId)), { recursive: true, force: true })
export const copyProductMedia = (fromId, toId) => cp(join(MEDIA_DIR, String(fromId)), join(MEDIA_DIR, String(toId)), { recursive: true }).catch(() => {})
export async function removeImageFiles(img) {
  for (const url of [img.src, img.thumb, img.turn && `${img.turn}.webp`, img.turn && `${img.turn}@2.webp`]) {
    if (!url || !url.startsWith('/media/')) continue
    await rm(join(MEDIA_DIR, url.slice('/media/'.length)), { force: true }).catch(() => {})
  }
}

/* ---------------------------------------------------------------- theme */

const rgbToHsl = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
  const l = (mx + mn) / 2
  if (mx === mn) return [0, 0, l]
  const d = mx - mn
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}
const hsl = (h, s, l) => {
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l))
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [r, g, b].map((v) => Math.round((v + m) * 255))
}
const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

/**
 * The room a piece is shown in, derived from the piece: garment → palette →
 * light → room → neon. A coloured cloth tints the room; a black or neutral
 * piece keeps a dark room and takes its one colour from a vivid detail (or
 * from the accent the admin chose).
 */
export function deriveTheme(tone, accentHex) {
  const mean = tone?.mean ?? [24, 22, 30]
  const [mh, ms, ml] = rgbToHsl(mean)
  const coloured = ms > 0.18 && ml > 0.08
  let neonHue = 268, neonSat = 0.85
  if (accentHex) [neonHue, neonSat] = rgbToHsl(hexToRgb(accentHex))
  else if (tone?.vivid) [neonHue, neonSat] = rgbToHsl(tone.vivid)
  else if (coloured) neonHue = mh
  neonSat = Math.max(0.6, neonSat)
  const roomHue = coloured ? mh : neonHue
  const roomSat = coloured ? Math.min(0.75, ms * 1.3 + 0.2) : 0.18
  return {
    bg0: hsl(roomHue, roomSat * 0.7, 0.03),
    bg1: hsl(roomHue, roomSat, 0.085),
    bg2: hsl(roomHue, roomSat * 0.85, 0.27),
    light: hsl(roomHue, coloured ? 0.55 : 0.3, 0.86),
    floor: hsl(roomHue, roomSat * 0.7, 0.045),
    neon: hsl(neonHue, neonSat, 0.6),
    accent: hsl(neonHue, Math.min(0.8, neonSat), 0.72),
    glass: hsl(roomHue, 0.45, 0.92),
    ink: hsl(roomHue, 0.18, 0.95),
    ink2: hsl(roomHue, 0.1, 0.62),
  }
}
