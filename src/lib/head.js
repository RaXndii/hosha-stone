import { ABOUT } from '../data/showroom.js'

/**
 * The page's own name and address, kept true as the visitor moves.
 *
 * The server writes these into the HTML of whatever page was asked for
 * (server/meta.js) — that is the copy a scraper reads, and the only one it
 * ever will. This keeps them right afterwards, while the visitor moves from
 * piece to piece without the page being asked for again: the name in the tab
 * and in a bookmark, and the address a crawler that does run the site reads.
 *
 * Nothing here is load-bearing for a shared link. It is the same information,
 * said again, so the browser and the server never disagree.
 */
const HOUSE = 'Hosha Stone'

const el = (selector, make) => {
  let node = document.head.querySelector(selector)
  if (!node) {
    node = make()
    document.head.appendChild(node)
  }
  return node
}

const meta = (key, attr, value) => {
  if (value == null) return
  el(`meta[${attr}="${key}"]`, () => {
    const m = document.createElement('meta')
    m.setAttribute(attr, key)
    return m
  }).setAttribute('content', value)
}

const trim = (s, max = 180) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim()
  return t.length <= max ? t : `${t.slice(0, max - 1).replace(/[\s,;:.—-]+\S*$/, '')}…`
}

/**
 * On a phone the address bar and the status bar take this colour. Each room
 * has its own, so the browser's chrome is the room's deepest edge rather than
 * one fixed colour laid across every piece.
 */
export const roomColour = (rgb) => meta('theme-color', 'name', `rgb(${rgb.join(' ')})`)
const ARCHIVE_EDGE = [4, 3, 8]

export function setHead({ title, description, path = window.location.pathname, image }) {
  const url = window.location.origin + path
  document.title = title
  meta('description', 'name', description)
  meta('og:title', 'property', title)
  meta('og:description', 'property', description)
  meta('og:url', 'property', url)
  meta('twitter:title', 'name', title)
  meta('twitter:description', 'name', description)
  if (image) {
    meta('og:image', 'property', window.location.origin + image)
    meta('twitter:image', 'name', window.location.origin + image)
  }
  el('link[rel="canonical"]', () => {
    const l = document.createElement('link')
    l.rel = 'canonical'
    return l
  }).setAttribute('href', url)
}

export const pieceHead = (product) => {
  setHead({
    title: `${product.name} — ${HOUSE}`,
    description: trim(product.description || product.tagline || ABOUT.motto),
    path: `/piece/${product.id}`,
    image: `/share/${product.id}.jpg`,
  })
  if (product.theme?.bg0) roomColour(product.theme.bg0)
}

const PAGES = {
  home: { title: `${HOUSE} — ${ABOUT.motto}`, description: () => trim(ABOUT.body), path: '/' },
  browse: { title: `Archive — ${HOUSE}`, description: () => 'Every piece in the house. Choose one to enter its room.', path: '/browse' },
  saved: { title: `Kept — ${HOUSE}`, description: () => 'The pieces you kept.', path: '/saved' },
  story: { title: `Story — ${HOUSE}`, description: () => trim(ABOUT.body), path: '/story' },
}

export const pageHead = (name, theme) => {
  const p = PAGES[name] ?? PAGES.home
  setHead({ title: p.title, description: p.description(), path: p.path, image: '/share/house.jpg' })
  roomColour(theme?.bg0 ?? ARCHIVE_EDGE)
}
