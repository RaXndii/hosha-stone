import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

/**
 * What the visitor carries between pages: the bag, and the pieces they have
 * saved. Favourites are kept across visits when the browser allows it; the bag
 * lasts for the visit. Heart and bag stay separate actions everywhere.
 */
const ShopContext = createContext(null)
const KEY = 'hs-saved'

export function ShopProvider({ children }) {
  const [bag, setBag] = useState(0)
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem(KEY) || '[]') } catch { return [] }
  })
  useEffect(() => {
    try { window.localStorage.setItem(KEY, JSON.stringify(saved)) } catch { /* private mode: keep it for the visit */ }
  }, [saved])

  const toggleSaved = useCallback((id, on) => {
    setSaved((list) => (on ? [...new Set([...list, id])] : list.filter((x) => x !== id)))
  }, [])
  const addToBag = useCallback(() => setBag((b) => b + 1), [])

  const value = useMemo(() => ({ bag, saved, toggleSaved, addToBag }), [bag, saved, toggleSaved, addToBag])
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

export const useShop = () => useContext(ShopContext)
