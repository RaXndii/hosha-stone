/**
 * The live catalogue. Every page reads products, categories and the house's
 * words from here. At start-up main.jsx asks the server for the published
 * catalogue and installs it with setCatalogue(); these are live bindings, so
 * every importer sees the server's data. With no server, the bundled
 * catalogue stays in place.
 */
import { STATIC_CATEGORIES, STATIC_PRODUCTS, STATIC_STORY } from './static-catalogue.js'

export let PRODUCTS = STATIC_PRODUCTS
export let CATEGORIES = STATIC_CATEGORIES
export let STORY = STATIC_STORY
export let ABOUT = {
  title: 'A small number of garments each season.',
  body: 'More than just clothes. It’s a feeling. A mindset. Hosha Stone is for those who keep it real — pieces that stay simple, and are never ordinary.',
  motto: 'Simple. Never ordinary.',
  sections: [],
  image: null,
}
// 'static' until the server has answered
export let SOURCE = 'static'

export function setCatalogue({ products, categories, about, source = 'server' }) {
  if (Array.isArray(products)) PRODUCTS = products
  if (Array.isArray(categories)) CATEGORIES = [{ id: 'all', label: 'All' }, ...categories.filter((c) => c.id !== 'all')]
  if (about) ABOUT = { ...ABOUT, ...about }
  SOURCE = source
}

export const inCategory = (categoryId) =>
  categoryId === 'all' ? PRODUCTS : PRODUCTS.filter((p) => p.category === categoryId)

export const countIn = (categoryId) => inCategory(categoryId).length

/** theme → the CSS variables the page reads */
export const themeVars = (theme) => {
  const out = {}
  for (const [key, rgb] of Object.entries(theme)) out[`--sr-${key}`] = rgb.join(' ')
  return out
}

export const pad2 = (n) => String(n).padStart(2, '0')

/** The views the turntable can use: every whole-garment photograph with an angle. */
export const turnViews = (product) =>
  product.gallery.filter((g) => g.kind === 'garment' && g.turn && typeof g.angle === 'number')

/** Close photographs, shown on their own in the closer look. */
export const details = (product) => product.gallery.filter((g) => g.kind === 'print')
