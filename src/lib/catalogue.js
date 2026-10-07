import { PRODUCTS, setCatalogue } from '../data/showroom.js'
import { setOrderSettings } from '../data/order.js'
import { setSizeGuide } from '../data/sizeGuide.js'

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

/**
 * The catalogue the server wrote into the page itself, if it did. It is the
 * same JSON /api/catalogue answers with, but it arrives with the HTML — so the
 * site can draw the moment its script runs, instead of first asking the
 * server a second time and waiting on the answer. On a phone that second
 * round trip is a few hundred milliseconds before anything at all is shown.
 */
function inlined() {
  const el = document.getElementById('hs-catalogue')
  if (!el) return null
  try { return JSON.parse(el.textContent) } catch { return null } finally { el.remove() }
}

function install(data) {
  setCatalogue({ ...data, source: 'server' })
  if (data.settings) setOrderSettings(data.settings)
  if (data.sizeGuide) setSizeGuide(data.sizeGuide)
}

export async function loadCatalogue() {
  const ready = inlined()
  if (ready) install(ready)
  else {
    try {
      install(await getJson('/api/catalogue'))
    } catch {
      // no server: the bundled catalogue stays in place
    }
  }

  const m = window.location.hash.match(/^#\/preview\/(\d+)$/)
  if (m) {
    try {
      const piece = await getJson(`/api/admin/products/${m[1]}/preview`)
      setCatalogue({ products: [piece, ...PRODUCTS.filter((p) => p.id !== piece.id)], source: 'server' })
      PREVIEW = piece
      window.history.replaceState(null, '', `/piece/${piece.id}`)
    } catch {
      window.history.replaceState(null, '', '/')
    }
  }
}
