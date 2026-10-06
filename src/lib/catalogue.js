import { PRODUCTS, setCatalogue } from '../data/showroom.js'
import { setOrderSettings } from '../data/order.js'

/**
 * Start-up: ask the server for the published catalogue and install it. If no
 * server answers (a static preview), the bundled catalogue stays — the site
 * works either way.
 *
 * #/preview/<id> is the admin's preview: the piece is fetched with the admin's
 * session (drafts included), placed in this tab's catalogue only, and shown in
 * the real showroom. Customers never see it — the preview call needs a session.
 */
export let PREVIEW = null

const getJson = async (url, ms = 6000) => {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    const r = await fetch(url, { credentials: 'same-origin', signal: ctrl.signal, headers: { Accept: 'application/json' } })
    if (!r.ok) throw new Error(String(r.status))
    if (!(r.headers.get('content-type') || '').includes('json')) throw new Error('not json')
    return await r.json()
  } finally {
    clearTimeout(t)
  }
}

export async function loadCatalogue() {
  try {
    const data = await getJson('./api/catalogue')
    setCatalogue({ ...data, source: 'server' })
    if (data.settings) setOrderSettings(data.settings)
  } catch {
    // no server: the bundled catalogue stays in place
  }

  const m = window.location.hash.match(/^#\/preview\/(\d+)$/)
  if (m) {
    try {
      const piece = await getJson(`./api/admin/products/${m[1]}/preview`)
      setCatalogue({ products: [piece, ...PRODUCTS.filter((p) => p.id !== piece.id)], source: 'server' })
      PREVIEW = piece
      window.history.replaceState(null, '', `#/piece/${piece.id}`)
    } catch {
      window.history.replaceState(null, '', '#/')
    }
  }
}
