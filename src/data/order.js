/**
 * Direct ordering: the site prepares the request, the visitor sends it
 * themselves on WhatsApp or Instagram, and the house confirms it there.
 * Nothing is sent by the site, and nothing is charged.
 *
 * The fee and contacts below are defaults; the server's settings (managed in
 * /admin → Settings) replace them at start-up, and every total and message
 * follows.
 */
import { PRODUCTS, SOURCE, pad2 } from './showroom.js'

export const BRAND = 'Hosha Stone'
export let DELIVERY_FEE = 1
export let WHATSAPP = '9647501639395' // +964 750 163 9395, digits only for wa.me
export let INSTAGRAM = 'hoshawestman'

export function setOrderSettings(s) {
  if (Number.isFinite(Number(s.deliveryFee))) DELIVERY_FEE = Number(s.deliveryFee)
  if (s.whatsapp) WHATSAPP = String(s.whatsapp).replace(/[^\d]/g, '')
  if (s.instagram) INSTAGRAM = String(s.instagram).replace(/^@/, '')
}

export const LANGUAGES = [
  { id: 'en', label: 'English' },
  { id: 'ku', label: 'کوردی' },
]

const money = (n) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`
// inside right-to-left Sorani text an amount is isolated as left-to-right, so it reads $72, not 72$
const ltr = (t) => `⁦${t}⁩`

/**
 * The one order object every view and message reads from.
 * Returns { order, errors } — errors keyed by field, empty when it can be sent.
 */
export function buildOrder({ productId, size, customerName = '', location = '', language = 'en', contactMethod = null, ref = null }) {
  const product = PRODUCTS.find((p) => p.id === productId)
  const errors = {}
  if (!product || typeof product.price !== 'number') errors.product = 'unavailable'
  const s = product?.sizes.find((z) => z.label === size)
  if (!size) errors.size = 'missing'
  else if (!s || !s.available) errors.size = 'unavailable'
  if (customerName.trim().length < 2) errors.customerName = 'missing'
  if (location.trim().length < 2) errors.location = 'missing'
  if (!contactMethod) errors.contactMethod = 'missing'

  const price = product?.price ?? 0
  const order = {
    productId,
    productNumber: product?.number ?? '',
    productName: product?.name ?? '',
    productImage: product?.hero?.src ?? null,
    size: size ?? '',
    price,
    deliveryFee: DELIVERY_FEE,
    total: price + DELIVERY_FEE,
    customerName: customerName.trim(),
    location: location.trim(),
    language,
    contactMethod,
    ref,
  }
  return { order, errors }
}

/** The message the visitor will send — the same order, in their language. */
export function orderMessage(o) {
  if (o.language === 'ku') {
    return [
      `داواکاریی ${BRAND}`,
      '',
      `ناوی کڕیار: ${o.customerName}`,
      `شوێن: ${o.location}`,
      '',
      `داواکاری بۆ جلی ژمارە ${o.productNumber}`,
      `ناوی جل: ${o.productName}`,
      `سایز: ${o.size}`,
      '',
      `نرخی جل: ${ltr(money(o.price))}`,
      `کرێی گەیاندن: ${ltr(money(o.deliveryFee))}`,
      `کۆی گشتی: ${ltr(money(o.total))}`,
      ...(o.ref ? ['', `ژمارەی داواکاری: ${ltr(o.ref)}`] : []),
    ].join('\n')
  }
  return [
    `${BRAND} — Order request`,
    '',
    `Name: ${o.customerName}`,
    `Location: ${o.location}`,
    '',
    `Piece: ${BRAND} / ${o.productNumber}`,
    `Product: ${o.productName}`,
    `Size: ${o.size}`,
    '',
    `Price: ${money(o.price)}`,
    `Delivery: ${money(o.deliveryFee)}`,
    `Total: ${money(o.total)}`,
    ...(o.ref ? ['', `Ref: ${o.ref}`] : []),
  ].join('\n')
}

/** Where each channel opens. WhatsApp carries the message; Instagram cannot, so it is copied. */
export const whatsappUrl = (o) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(orderMessage(o))}`
export const instagramUrl = () => `https://ig.me/m/${INSTAGRAM}`

/** A short reference the house can match to the customer's message — only when a server records it. */
export function newRef() {
  if (SOURCE !== 'server') return null
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const b = new Uint8Array(5)
  crypto.getRandomValues(b)
  return 'HS-' + [...b].map((x) => A[x % A.length]).join('')
}

/** Record the request with the house. Fire and forget: the customer's own message is what counts. */
export function recordOrder(o) {
  if (!o.ref) return
  try {
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({ ref: o.ref, productId: o.productId, size: o.size, customerName: o.customerName, location: o.location, language: o.language, contactMethod: o.contactMethod }),
    }).catch(() => {})
  } catch { /* the message still goes */ }
}

export { money, pad2 }
