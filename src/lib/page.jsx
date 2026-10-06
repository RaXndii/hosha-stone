import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { PRODUCTS } from '../data/showroom.js'

/**
 * Three places, no router library:
 *   #/             home — the showroom, opening on the first piece
 *   #/browse       the archive of every piece
 *   #/piece/<id>   the showroom, opening on that piece
 *
 * The hash keeps the back button and a shared link honest. A change of page
 * normally passes through a curtain so the site never cuts; a page that runs
 * its own exit (the archive carrying a piece into its room) asks for a cut
 * instead, and says where the visitor came from so the next page can pick up
 * the motion where the last one left it.
 */
const RouteContext = createContext({ route: { name: 'home' }, go: () => {} })

function parse() {
  const h = window.location.hash.replace(/^#\/?/, '')
  if (h === 'browse') return { name: 'browse' }
  const m = h.match(/^piece\/([\w-]+)$/)
  if (m && PRODUCTS.some((p) => p.id === m[1])) return { name: 'piece', id: m[1] }
  return { name: 'home' }
}

const hashOf = (name, id) => (name === 'browse' ? '#/browse' : name === 'piece' ? `#/piece/${id}` : '#/')
// home and a piece are the same page — the showroom; moving between them is not a page change
const page = (r) => (r.name === 'browse' ? 'browse' : 'showroom')

export function PageProvider({ children }) {
  const [route, setRoute] = useState(() => (typeof window === 'undefined' ? { name: 'home' } : parse()))
  const routeRef = useRef(route)
  const curtainRef = useRef(null)
  const busy = useRef(false)
  // the next hashchange is one we caused, and how it should land
  const pending = useRef(null)

  const commit = (next) => {
    routeRef.current = next
    setRoute(next)
  }

  const swap = useCallback((next, { cut = false } = {}) => {
    if (page(next) === page(routeRef.current)) { routeRef.current = next; return }
    const curtain = curtainRef.current
    if (cut || busy.current || !curtain) {
      window.scrollTo(0, 0)
      commit(next)
      return
    }
    busy.current = true
    gsap.to(curtain, {
      autoAlpha: 1,
      duration: 0.5,
      ease: 'power2.inOut',
      onComplete: () => {
        commit(next)
        window.scrollTo(0, 0)
        // let the new page mount and paint underneath before lifting
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            gsap.to(curtain, {
              autoAlpha: 0,
              duration: 0.8,
              ease: 'power2.out',
              onComplete: () => { busy.current = false },
            })
          }),
        )
      },
    })
  }, [])

  // back/forward buttons and hand-edited hashes
  useEffect(() => {
    const onHash = () => {
      const p = pending.current
      pending.current = null
      const next = parse()
      const mine = p && p.route.name === next.name && (next.name !== 'piece' || p.route.id === next.id)
      swap(mine ? p.route : next, { cut: !!(mine && p.cut) })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [swap])

  /**
   * go('browse') · go('piece', { id, entry: 'browse', cut: true }) · go('home')
   * entry travels with the route so the arriving page knows how it was entered
   */
  const go = useCallback((name, { id, entry, cut = false } = {}) => {
    const next = name === 'piece' ? { name, id, entry } : { name, entry }
    const hash = hashOf(name, id)
    if (window.location.hash !== hash) {
      pending.current = { route: next, cut }
      window.location.hash = hash
    } else swap(next, { cut })
  }, [swap])

  return (
    <RouteContext.Provider value={{ route, go }}>
      {children}
      <div
        ref={curtainRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[100]"
        style={{ opacity: 0, visibility: 'hidden', background: 'rgb(5 4 8)' }}
      />
    </RouteContext.Provider>
  )
}

export const usePage = () => useContext(RouteContext)
