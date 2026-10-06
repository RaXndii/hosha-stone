/**
 * Server-side validation. Everything the admin or a customer sends is checked
 * here, whatever the browser already checked: the browser can be bypassed.
 */
export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

// control characters out, whitespace tidied, length capped
export function clean(v, max = 200) {
  if (v === undefined || v === null) return ''
  // eslint-disable-next-line no-control-regex -- stripping control characters is the point
  return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max)
}
export const cleanLong = (v, max = 4000) => clean(v, max).replace(/\r\n/g, '\n')

export const slugify = (s) =>
  String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

export const SEASONS = ['all-season', 'spring', 'summer', 'autumn', 'winter']
export const STATUSES = ['draft', 'published', 'archived']
export const ORDER_STATUSES = ['new', 'contacted', 'confirmed', 'completed', 'cancelled']
export const BADGES = ['', 'New', 'Featured', 'Archive', 'Limited']
export const VIEWS = {
  front: { angle: 0, kind: 'garment', label: 'Front view' },
  'three-quarter-left': { angle: 315, kind: 'garment', label: 'Three-quarter view' },
  left: { angle: 270, kind: 'garment', label: 'Side view' },
  'three-quarter-back-left': { angle: 225, kind: 'garment', label: 'Three-quarter back' },
  back: { angle: 180, kind: 'garment', label: 'Back view' },
  'three-quarter-back-right': { angle: 135, kind: 'garment', label: 'Three-quarter back' },
  right: { angle: 90, kind: 'garment', label: 'Side view' },
  'three-quarter-right': { angle: 45, kind: 'garment', label: 'Three-quarter view' },
  detail: { angle: null, kind: 'print', label: 'Detail' },
}
const LETTER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']
const WAIST = Array.from({ length: 10 }, (_, i) => String(26 + i * 2)) // 26 … 44
export const SIZE_SYSTEMS = { letter: LETTER, waist: WAIST, one: ['One size'] }
export const ALL_SIZES = [...LETTER, ...WAIST, 'One size']

const money = (v) => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 && n < 1e6 ? Math.round(n * 100) / 100 : NaN
}
const HEX = /^#[0-9a-f]{6}$/i

/**
 * Apparel as the admin sends it → clean values, or HttpError(422) naming
 * every field that is wrong. `publishing` applies the stricter rules a piece
 * must meet before customers can see it.
 */
export function validateProduct(body, { categoryExists, numberTaken, publishing }) {
  const f = {}
  const out = {
    name: clean(body.name, 80),
    number: clean(body.number, 24).toUpperCase().replace(/\s+/g, '-'),
    style_code: clean(body.styleCode, 24).toUpperCase(),
    short: clean(body.short, 24),
    line: clean(body.line, 24),
    tagline: clean(body.tagline, 120),
    description: cleanLong(body.description, 1200),
    colour: clean(body.colour, 30),
    badge: clean(body.badge, 20),
    season: clean(body.season, 20) || 'all-season',
    category_id: body.categoryId === null || body.categoryId === '' || body.categoryId === undefined ? null : Number(body.categoryId),
    price: money(body.price),
    was: money(body.was),
    featured: body.featured ? 1 : 0,
    accent: body.accent ? clean(body.accent, 7) : null,
  }
  if (!out.name) f.name = 'Give the piece a name.'
  if (!out.number) f.number = 'Give it a piece number, e.g. 006.'
  else if (!/^[A-Z0-9][A-Z0-9-]{0,23}$/.test(out.number)) f.number = 'Use letters, numbers and dashes only.'
  else if (numberTaken(out.number)) f.number = `Piece number ${out.number} is already used.`
  if (out.price === null) { if (publishing) f.price = 'Set a price before publishing.'; else out.price = 0 }
  else if (Number.isNaN(out.price)) f.price = 'Price must be a number, like 72 or 72.50.'
  if (Number.isNaN(out.was)) f.was = 'Original price must be a number.'
  else if (out.was !== null && out.price !== null && !Number.isNaN(out.price) && out.was <= out.price) f.was = 'The original price should be higher than the price.'
  if (out.category_id !== null && (!Number.isInteger(out.category_id) || !categoryExists(out.category_id))) f.categoryId = 'Choose a category that exists.'
  if (!SEASONS.includes(out.season)) f.season = 'Choose a season.'
  if (!BADGES.includes(out.badge)) f.badge = 'Choose a tag from the list.'
  if (out.accent && !HEX.test(out.accent)) f.accent = 'Accent must be a colour like #8a5cff.'

  const sizes = Array.isArray(body.sizes) ? body.sizes : []
  const seen = new Set()
  out.sizes = []
  for (const s of sizes.slice(0, 20)) {
    const label = clean(s?.label, 10)
    if (!ALL_SIZES.includes(label)) { f.sizes = `“${label}” is not a size we recognise.`; continue }
    if (seen.has(label)) continue
    seen.add(label)
    out.sizes.push({ label, available: s.available ? 1 : 0 })
  }
  if (publishing) {
    if (!out.price) f.price = 'Set a price before publishing.'
    if (out.category_id === null) f.categoryId = 'Choose a category before publishing.'
    if (!out.sizes.length) f.sizes = 'Add at least one size before publishing.'
    else if (!out.sizes.some((s) => s.available)) f.sizes = 'At least one size must be available to publish.'
  }
  if (Object.keys(f).length) throw new HttpError(422, 'Some details need attention.', f)
  return out
}

export function validateOrder(body) {
  const f = {}
  const out = {
    ref: clean(body.ref, 16).toUpperCase(),
    productId: clean(body.productId, 80),
    size: clean(body.size, 10),
    customerName: clean(body.customerName, 60),
    location: clean(body.location, 120),
    language: body.language === 'ku' ? 'ku' : 'en',
    contactMethod: body.contactMethod === 'instagram' ? 'instagram' : body.contactMethod === 'whatsapp' ? 'whatsapp' : null,
  }
  if (!/^HS-[A-Z0-9]{5}$/.test(out.ref)) f.ref = 'invalid'
  if (!out.productId) f.productId = 'missing'
  if (!out.size) f.size = 'missing'
  if (out.customerName.length < 2) f.customerName = 'missing'
  if (out.location.length < 2) f.location = 'missing'
  if (!out.contactMethod) f.contactMethod = 'missing'
  if (Object.keys(f).length) throw new HttpError(422, 'Order request incomplete.', f)
  return out
}
