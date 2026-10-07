import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { PRODUCTS } from '../data/showroom.js'

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
 */
const ShopContext = createContext(null)
const KEY = 'hs-saved'

export function ShopProvider({ children }) {
  const [bag, setBag] = useState(0)
  const [saved, setSaved] = useState(() => {
    try {
      const list = JSON.parse(window.localStorage.getItem(KEY) || '[]')
      return Array.isArray(list) ? list.filter((id) => typeof id === 'string') : []
    } catch {
      return []
    }
  })
  useEffect(() => {
    try { window.localStorage.setItem(KEY, JSON.stringify(saved)) } catch { /* private mode: keep it for the visit */ }
  }, [saved])

  const toggleSaved = useCallback((id, on) => {
    setSaved((list) => (on ? [...new Set([...list, id])] : list.filter((x) => x !== id)))
  }, [])
  const addToBag = useCallback(() => setBag((b) => b + 1), [])

  // in the house's own order, not the order they were kept in
  const kept = useMemo(() => PRODUCTS.filter((p) => saved.includes(p.id)), [saved])

  const value = useMemo(() => ({ bag, saved, kept, toggleSaved, addToBag }), [bag, saved, kept, toggleSaved, addToBag])
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

export const useShop = () => useContext(ShopContext)
