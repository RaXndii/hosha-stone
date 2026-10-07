import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { PRODUCTS, SOURCE } from '../data/showroom.js'

/**
 * What the visitor carries between pages: the bag, and the pieces they have
 * saved. Favourites are kept across visits when the browser allows it; the bag
 * lasts for the visit. Heart and bag stay separate actions everywhere.
 *
 * `saved` is the raw list of what was ever kept; `kept` is the pieces of it
 * the house still has. A piece the admin unpublishes stops being counted and
 * stops being shown, but is not forgotten — if it returns, so does the heart.
 * Only `kept` is ever counted or listed, so the number in the header and the
 * pieces in the room can never disagree.
 *
 * Each piece also says how many people have kept it (`keptBy`). The server
 * counts it; this browser tells the server its own list under an anonymous
 * id it makes up for itself, and shows its own tap at once rather than
 * waiting for the answer. The number is shown only once it says something —
 * from KEPT_SHOWN_FROM people — and only ever as what it is.
 */
const ShopContext = createContext(null)
const KEY = 'hs-saved'
const VISITOR = 'hs-visitor'
const SYNCED = 'hs-hearts-synced'
export const KEPT_SHOWN_FROM = 12

const store = {
  get(k) { try { return window.localStorage.getItem(k) } catch { return null } },
  set(k, v) { try { window.localStorage.setItem(k, v) } catch { /* private mode: for this visit only */ } },
}

/** A random id for this browser — not a person, and not derived from one. */
function visitorId() {
  let id = store.get(VISITOR)
  if (id && /^[A-Za-z0-9_-]{16,64}$/.test(id)) return id
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  id = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  store.set(VISITOR, id)
  return id
}

export function ShopProvider({ children }) {
  const [bag, setBag] = useState(0)
  const [saved, setSaved] = useState(() => {
    try {
      const list = JSON.parse(store.get(KEY) || '[]')
      return Array.isArray(list) ? list.filter((id) => typeof id === 'string') : []
    } catch {
      return []
    }
  })
  const [counts, setCounts] = useState(() => Object.fromEntries(PRODUCTS.map((p) => [p.id, Number(p.kept) || 0])))
  useEffect(() => { store.set(KEY, JSON.stringify(saved)) }, [saved])

  // tell the server this browser's list — the whole list, so it can only ever
  // come out right — a moment after the last tap, not once per tap
  const savedRef = useRef(saved)
  useEffect(() => { savedRef.current = saved }, [saved])
  const timer = useRef(0)
  const sync = useCallback(() => {
    if (SOURCE !== 'server') return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      fetch('/api/hearts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({ visitor: visitorId(), kept: savedRef.current }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data?.counts) setCounts((c) => ({ ...c, ...data.counts })) })
        .catch(() => { /* the heart is still kept here; the count catches up next time */ })
    }, 350)
  }, [])

  // hearts kept before the house counted them are counted once, on the next visit
  useEffect(() => {
    if (SOURCE !== 'server' || store.get(SYNCED) || !savedRef.current.length) return
    store.set(SYNCED, '1')
    sync()
  }, [sync])

  const toggleSaved = useCallback((id, on) => {
    setSaved((list) => (on ? [...new Set([...list, id])] : list.filter((x) => x !== id)))
    // this visitor's own tap shows at once; the server's answer then settles it
    setCounts((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + (on ? 1 : -1)) }))
    sync()
  }, [sync])
  const addToBag = useCallback(() => setBag((b) => b + 1), [])

  // in the house's own order, not the order they were kept in
  const kept = useMemo(() => PRODUCTS.filter((p) => saved.includes(p.id)), [saved])
  const keptBy = useCallback((id) => counts[id] ?? 0, [counts])

  const value = useMemo(() => ({ bag, saved, kept, keptBy, toggleSaved, addToBag }), [bag, saved, kept, keptBy, toggleSaved, addToBag])
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

export const useShop = () => useContext(ShopContext)
