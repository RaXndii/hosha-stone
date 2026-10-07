import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { PRODUCTS } from '../data/showroom.js'

/**
 * Five places, no router library:
 *   /                  home — the showroom, opening on the first piece
 *   /browse            the archive of every piece
 *   /piece/<id>        the showroom, opening on that piece
 *   /saved             the pieces this visitor kept
 *   /story             the house, at length
 *
 * Real paths, not fragments. A fragment never reaches the server, so every
 * link would have arrived as the bare home page — one title, one picture, for
 * the whole house. These are ordinary URLs: the server answers each one with
 * the piece's own name and its own card (server/meta.js), which is what a link
 * pasted into WhatsApp or Instagram actually shows. The back button and a
 * shared link stay honest either way.
 *
 * Links shared before this change carried the piece in the fragment; those
 * still land where they meant to (legacy(), below).
 *
 * A change of page normally passes through a curtain so the site never cuts; a
 * page that runs its own exit (the archive carrying a piece into its room) asks
 * for a cut instead, and says where the visitor came from so the next page can
 * pick up the motion where the last one left it.
 */
const RouteContext = createContext({ route: { name: 'home' }, go: () => {} })

const PIECE = /^\/piece\/([\w-]+)\/?$/
const known = (id) => PRODUCTS.some((p) => p.id === id)

function parse(path = window.location.pathname) {
  const clean = path.replace(/\/+$/, '') || '/'
  if (clean === '/browse') return { name: 'browse' }
  if (clean === '/saved') return { name: 'saved' }
  if (clean === '/story') return { name: 'story' }
  const m = clean.match(PIECE)
  if (m && known(m[1])) return { name: 'piece', id: m[1] }
  return { name: 'home' }
}

export const pathOf = (name, id) =>
  name === 'browse' ? '/browse' : name === 'saved' ? '/saved' : name === 'story' ? '/story' : name === 'piece' ? `/piece/${id}` : '/'

// home and a piece are the same page — the showroom; moving between them is not a page change
const page = (r) => (r.name === 'piece' || r.name === 'home' ? 'showroom' : r.name)

/**
 * A link made before the site had real paths — #/browse, #/piece/<id>. The
 * fragment is read once, turned into the path it meant, and replaced, so an
 * old link opens the right place and leaves a clean URL behind it.
 */
function legacy() {
  const h = window.location.hash.replace(/^#\/?/, '')
  if (!h) return null
  const route = h === 'browse' ? { name: 'browse' } : h === 'saved' ? { name: 'saved' } : h === 'story' ? { name: 'story' } : null
  const m = h.match(/^piece\/([\w-]+)$/)
  const next = route ?? (m && known(m[1]) ? { name: 'piece', id: m[1] } : null)
  if (!next) return null
  window.history.replaceState(null, '', pathOf(next.name, next.id))
  return next
}

export function PageProvider({ children }) {
  const [route, setRoute] = useState(() => (typeof window === 'undefined' ? { name: 'home' } : legacy() ?? parse()))
  const routeRef = useRef(route)
  const curtainRef = useRef(null)
  const busy = useRef(false)

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

  // back and forward buttons
  useEffect(() => {
    const onPop = () => swap(parse())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [swap])

  /**
   * go('browse') · go('piece', { id, entry: 'browse', cut: true }) · go('home')
   * entry travels with the route so the arriving page knows how it was entered
   */
  const go = useCallback((name, { id, entry, cut = false, replace = false } = {}) => {
    const next = name === 'piece' ? { name, id, entry } : { name, entry }
    const path = pathOf(name, id)
    if (window.location.pathname !== path) {
      window.history[replace ? 'replaceState' : 'pushState'](null, '', path)
    }
    swap(next, { cut })
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
