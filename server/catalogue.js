import { db, getContent } from './db.js'
import { VIEWS } from './validate.js'
import { deriveTheme } from './media.js'
import { DEFAULT_ABOUT, DEFAULT_SETTINGS, DEFAULT_SIZE_GUIDE } from './seed.js'

/**
 * Database rows → the product shape the site already speaks (see
 * src/data/static-catalogue.js). Nothing on the customer side had to change
 * to read from the server: the showroom, the turntable, the archive, search
 * and the order flow all receive exactly what they used to import.
 */
const imagesOf = (productId) =>
  db.prepare('SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, position ASC, id ASC').all(productId)
const sizesOf = (productId) =>
  db.prepare('SELECT label, available FROM product_sizes WHERE product_id = ? ORDER BY position ASC').all(productId)

const parse = (json) => { try { return json ? JSON.parse(json) : null } catch { return null } }

/** The film as the site plays it, or nothing if there is none (or it is incomplete). */
export function filmOf(row) {
  const f = parse(row.film)
  if (!f?.src) return undefined
  return { src: f.src, small: f.small || f.src, ...(f.webm ? { webm: f.webm } : {}), poster: f.poster || '', cover: f.cover || f.poster || '', duration: Number(f.duration) || 0 }
}

/**
 * The inside of a piece that opens: its photograph laid where it falls over
 * the front, the line of the zip, and the details marked inside. Anything
 * malformed and the piece simply does not open.
 */
export function insideOf(row) {
  const i = parse(row.inside)
  const num = (v) => Number.isFinite(v)
  const unit = (v) => num(v) && v >= 0 && v <= 1
  if (!i?.src || !Array.isArray(i.at) || i.at.length !== 4 || !i.at.every(num)) return undefined
  if (!i.zip || !unit(i.zip.x) || !unit(i.zip.top) || !unit(i.zip.bottom) || i.zip.bottom <= i.zip.top) return undefined
  const spots = (Array.isArray(i.spots) ? i.spots : [])
    .filter((s) => Array.isArray(s?.at) && s.at.length === 2 && s.at.every(unit) && s.label)
    .map((s, k) => ({ id: `inside-${k}`, at: s.at, label: s.label, note: s.note || '' }))
  return { src: i.src, at: i.at, zip: { x: i.zip.x, top: i.zip.top, bottom: i.zip.bottom }, spots }
}

/**
 * The details marked on the front view. A spot that opened a photograph the
 * house has since removed still marks its detail; it takes the visitor in
 * close on the piece instead.
 */
export function spotsOf(row, images) {
  const list = parse(row.spots)
  if (!Array.isArray(list)) return undefined
  const ids = new Set(images.map((i) => i.id))
  const out = list
    .filter((s) => Array.isArray(s?.at) && s.at.length === 2 && s.at.every((v) => Number.isFinite(v) && v >= 0 && v <= 1) && s.label)
    .map((s, i) => ({ id: `spot-${i}`, at: s.at, label: s.label, note: s.note || '', ...(ids.has(s.photo) ? { photo: `img-${s.photo}` } : {}) }))
  return out.length ? out : undefined
}

export function themeFor(row, images = imagesOf(row.id)) {
  const primary = images.find((i) => VIEWS[i.view]?.kind === 'garment')
  const tone = primary?.tone ? JSON.parse(primary.tone) : null
  // a stored theme (the house's original pieces) stands unless the piece has a toned photograph or an accent
  if (row.theme && !tone && !row.accent) return JSON.parse(row.theme)
  return deriveTheme(tone, row.accent)
}

export function publicProduct(row) {
  const images = imagesOf(row.id)
  const garments = images.filter((i) => VIEWS[i.view]?.kind === 'garment')
  const hero = garments[0]
  const cat = row.category_id ? db.prepare('SELECT slug FROM categories WHERE id = ?').get(row.category_id) : null
  const sizes = sizesOf(row.id).map((s) => ({ label: s.label, available: !!s.available }))
  // the turntable takes one photograph per angle: the first of each
  const seenAngle = new Set()
  return {
    id: row.slug,
    number: row.number,
    code: row.style_code || row.number,
    name: row.name,
    short: row.short || row.name.split(' ')[0],
    line: row.line || row.name.split(' ')[0],
    tagline: row.tagline,
    description: row.description,
    category: cat?.slug ?? 'uncategorised',
    season: row.season,
    colour: row.colour,
    badge: row.badge || (row.featured ? 'Featured' : ''),
    featured: !!row.featured,
    price: row.price,
    was: row.was ?? undefined,
    currency: row.currency,
    added: row.published_at || row.created_at,
    // how many visitors have kept it — counted, never estimated
    kept: db.prepare('SELECT COUNT(*) AS n FROM hearts WHERE product_id = ?').get(row.id).n,
    sizes,
    theme: themeFor(row, images),
    hero: { src: hero?.src ?? images[0]?.src ?? '' },
    film: filmOf(row),
    spots: spotsOf(row, images),
    inside: insideOf(row),
    gallery: images.map((i) => {
      const v = VIEWS[i.view] ?? VIEWS.front
      const angleFree = v.kind === 'garment' && i.turn && !seenAngle.has(v.angle)
      if (angleFree) seenAngle.add(v.angle)
      return {
        id: `img-${i.id}`,
        label: i.label || v.label,
        kind: v.kind,
        src: i.src,
        thumb: i.thumb ?? i.src,
        ...(angleFree ? { angle: v.angle, turn: i.turn } : {}),
        ...(i.focus ? { focus: i.focus } : {}),
      }
    }),
  }
}

/** What customers may see: published pieces in visible categories, featured first. */
export function publicCatalogue() {
  const rows = db.prepare(`SELECT p.* FROM products p LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.status = 'published' AND (c.id IS NULL OR (c.hidden = 0 AND c.archived = 0))
    ORDER BY p.featured DESC, p.position ASC, p.id ASC`).all()
  const products = rows.map(publicProduct).filter((p) => p.hero.src && p.sizes.length)
  const categories = db.prepare('SELECT slug, label FROM categories WHERE hidden = 0 AND archived = 0 ORDER BY position, id').all()
    .map((c) => ({ id: c.slug, label: c.label }))
  return {
    products,
    categories,
    about: getContent('about', DEFAULT_ABOUT),
    sizeGuide: getContent('sizeGuide', DEFAULT_SIZE_GUIDE),
    settings: publicSettings(),
  }
}

export function publicSettings() {
  const s = { ...DEFAULT_SETTINGS, ...getContent('settings', {}) }
  return { deliveryFee: s.deliveryFee, currency: s.currency, whatsapp: s.whatsapp, instagram: s.instagram }
}

/** The admin's view of a piece: everything, including drafts and raw fields. */
export function adminProduct(row) {
  const images = imagesOf(row.id)
  return {
    id: row.id,
    slug: row.slug,
    number: row.number,
    styleCode: row.style_code,
    name: row.name,
    short: row.short,
    line: row.line,
    tagline: row.tagline,
    description: row.description,
    categoryId: row.category_id,
    season: row.season,
    colour: row.colour,
    badge: row.badge,
    price: row.price,
    was: row.was,
    currency: row.currency,
    featured: !!row.featured,
    status: row.status,
    accent: row.accent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    sizes: sizesOf(row.id).map((s) => ({ label: s.label, available: !!s.available })),
    images: images.map((i) => ({ id: i.id, view: i.view, label: i.label, src: i.src, thumb: i.thumb ?? i.src, turn: i.turn, primary: !!i.is_primary, width: i.width, height: i.height })),
    film: parse(row.film),
    inside: parse(row.inside),
    spots: (parse(row.spots) ?? []).map((sp) => ({ at: sp.at, label: sp.label, note: sp.note || '', photo: images.some((i) => i.id === sp.photo) ? sp.photo : null })),
    theme: themeFor(row, images),
  }
}
