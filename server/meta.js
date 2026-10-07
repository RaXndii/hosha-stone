import { db, getContent } from './db.js'
import { publicCatalogue, publicProduct, publicSettings } from './catalogue.js'
import { DEFAULT_ABOUT } from './seed.js'

/**
 * What a link to a page says about itself before anything has run.
 *
 * WhatsApp, Instagram and every other scraper read the HTML and nothing more —
 * they do not run the site. So the page the server hands back already carries
 * the right title, the right words and the right picture for the place being
 * asked for, written in here rather than set later by the browser. The house
 * sells over exactly those channels, so this is the difference between a link
 * that arrives as the piece and one that arrives as a grey box.
 *
 * The site's own index.html carries the house's defaults; this replaces them
 * for a request that names somewhere in particular.
 */
const HOUSE = 'Hosha Stone'

const esc = (s) =>
  String(s ?? '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' })[c])

/** One line of copy, trimmed to the length a card will actually show. */
const trim = (s, max = 180) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim()
  return t.length <= max ? t : `${t.slice(0, max - 1).replace(/[\s,;:.—-]+\S*$/, '')}…`
}

/** Where this site is answering from — behind a proxy, what the visitor typed. */
export function origin(req) {
  if (process.env.PUBLIC_URL) return String(process.env.PUBLIC_URL).replace(/\/+$/, '')
  const host = req.get('x-forwarded-host') || req.get('host')
  return host ? `${req.protocol}://${host}` : ''
}

const about = () => ({ ...DEFAULT_ABOUT, ...getContent('about', {}) })

const pieceRow = (slug) => db.prepare("SELECT * FROM products WHERE slug = ? AND status = 'published'").get(slug)

/** The piece the showroom opens on at the front door — the first the house lists. */
const firstPiece = () => {
  const row = db
    .prepare(
      `SELECT p.* FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.status = 'published' AND (c.id IS NULL OR (c.hidden = 0 AND c.archived = 0))
       ORDER BY p.featured DESC, p.position ASC, p.id ASC LIMIT 1`,
    )
    .get()
  return row ? publicProduct(row) : null
}

/** The piece, the archive, the story — or the house, when the path names none of them. */
function describe(path, base) {
  const clean = path.replace(/\/+$/, '') || '/'
  const motto = about().motto || 'Simple. Never ordinary.'

  const m = clean.match(/^\/piece\/([\w-]+)$/)
  if (m) {
    const row = pieceRow(m[1])
    if (row) {
      const p = publicProduct(row)
      return {
        title: `${p.name} — ${HOUSE}`,
        description: trim(p.description || p.tagline || motto),
        image: `${base}/share/${p.id}.jpg`,
        url: `${base}/piece/${p.id}`,
        product: p,
        hero: p.hero?.src,
        colour: p.theme?.bg0,
      }
    }
  }
  if (clean === '/browse') {
    return {
      title: `Archive — ${HOUSE}`,
      description: 'Every piece in the house. Choose one to enter its room.',
      image: `${base}/share/house.jpg`,
      url: `${base}/browse`,
    }
  }
  if (clean === '/story') {
    return {
      title: `Story — ${HOUSE}`,
      description: trim(about().body || motto),
      image: `${base}/share/house.jpg`,
      url: `${base}/story`,
    }
  }
  if (clean === '/saved') {
    // what one visitor kept is theirs; it is not for a search engine
    return {
      title: `Kept — ${HOUSE}`,
      description: 'The pieces you kept.',
      image: `${base}/share/house.jpg`,
      url: `${base}/saved`,
      private: true,
    }
  }
  return {
    title: `${HOUSE} — ${motto}`,
    description: trim(about().body || motto),
    image: `${base}/share/house.jpg`,
    url: `${base}/`,
    hero: firstPiece()?.hero?.src,
    colour: firstPiece()?.theme?.bg0,
  }
}

/** A piece, in the words a search engine reads. */
function productLd(p, base) {
  const settings = publicSettings()
  const inStock = p.sizes.some((s) => s.available)
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    sku: p.code || p.number,
    description: p.description || p.tagline || undefined,
    image: [`${base}/share/${p.id}.jpg`],
    brand: { '@type': 'Brand', name: HOUSE },
    category: p.category,
    ...(p.colour ? { color: p.colour } : {}),
    offers: {
      '@type': 'Offer',
      url: `${base}/piece/${p.id}`,
      price: String(p.price),
      priceCurrency: settings.currency || 'USD',
      availability: `https://schema.org/${inStock ? 'InStock' : 'OutOfStock'}`,
      itemCondition: 'https://schema.org/NewCondition',
    },
  }
}

const houseLd = (base) => ({
  '@context': 'https://schema.org',
  '@type': 'ClothingStore',
  name: HOUSE,
  url: `${base}/`,
  image: `${base}/share/house.jpg`,
  description: trim(about().body || ''),
  slogan: about().motto || undefined,
})

/**
 * The tags for this request, as one block of HTML. Injected where index.html
 * says <!--hs:meta-->; without a server the file's own defaults stand.
 */
export function metaFor(req) {
  const base = origin(req)
  const d = describe(req.path, base)
  const ld = d.product ? productLd(d.product, base) : houseLd(base)
  const tag = (attr, name, content) => `<meta ${attr}="${name}" content="${esc(content)}" />`

  return [
    `<title>${esc(d.title)}</title>`,
    tag('name', 'description', d.description),
    `<link rel="canonical" href="${esc(d.url)}" />`,
    d.private ? tag('name', 'robots', 'noindex, follow') : '',
    // a phone's address bar takes the colour of the room the page opens in
    tag('name', 'theme-color', Array.isArray(d.colour) ? `rgb(${d.colour.join(' ')})` : '#04030a'),
    tag('property', 'og:site_name', HOUSE),
    tag('property', 'og:type', d.product ? 'product' : 'website'),
    tag('property', 'og:title', d.title),
    tag('property', 'og:description', d.description),
    tag('property', 'og:url', d.url),
    tag('property', 'og:image', d.image),
    tag('property', 'og:image:width', '1200'),
    tag('property', 'og:image:height', '630'),
    tag('property', 'og:image:alt', d.product ? `${d.product.name} — ${HOUSE}` : HOUSE),
    tag('name', 'twitter:card', 'summary_large_image'),
    tag('name', 'twitter:title', d.title),
    tag('name', 'twitter:description', d.description),
    tag('name', 'twitter:image', d.image),
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`,
    // the one photograph this page opens on, asked for before any script runs:
    // on a phone it is the thing the visitor is waiting to see
    d.hero ? `<link rel="preload" as="image" href="${esc(d.hero)}" fetchpriority="high" />` : '',
  ]
    .filter(Boolean)
    .join('\n    ')
}

/**
 * The catalogue, written into the page so the site can draw without asking
 * for it again (src/lib/catalogue.js). JSON inside a script tag is inert; the
 * one way out of it, a closing tag, is escaped.
 */
export function catalogueFor() {
  return `<script id="hs-catalogue" type="application/json">${JSON.stringify(publicCatalogue()).replace(/</g, '\\u003c')}</script>`
}

/** Every page worth indexing, for /sitemap.xml. */
export function sitemap(req) {
  const base = origin(req)
  const rows = db
    .prepare(
      `SELECT p.slug, p.updated_at FROM products p LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.status = 'published' AND (c.id IS NULL OR (c.hidden = 0 AND c.archived = 0))
       ORDER BY p.featured DESC, p.position ASC, p.id ASC`,
    )
    .all()
  const url = (loc, lastmod, priority) =>
    `  <url><loc>${esc(loc)}</loc>${lastmod ? `<lastmod>${esc(String(lastmod).slice(0, 10))}</lastmod>` : ''}<priority>${priority}</priority></url>`
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[
  url(`${base}/`, null, '1.0'),
  url(`${base}/browse`, null, '0.9'),
  url(`${base}/story`, null, '0.7'),
  ...rows.map((r) => url(`${base}/piece/${r.slug}`, r.updated_at, '0.8')),
].join('\n')}
</urlset>
`
}
