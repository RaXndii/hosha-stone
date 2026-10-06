import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ABOUT, PRODUCTS, inCategory, themeVars, turnViews } from '../../data/showroom.js'
import usePointerField from '../../hooks/usePointerField.js'
import useSpotlight from '../../hooks/useSpotlight.js'
import useShowcase from '../../hooks/useShowcase.js'
import { SceneBack, SceneFront, HouseLights } from './Scene.jsx'
import Header from './Header.jsx'
import { NextPiece, Pager, Purchase, Title } from './Info.jsx'
import { MobileMenu, SearchSheet } from './Overlays.jsx'
import Closer from './Closer.jsx'
import { frameSrc, prefersLargeFrames } from './Turntable.jsx'
import About from './About.jsx'
import OrderPanel from './OrderPanel.jsx'
import { usePage } from '../../lib/page.jsx'
import { useShop } from '../../lib/shop.jsx'

const LIGHT_ANCHOR = [0.5, 0.46]
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Resolve once the piece's image can be painted — never hold the set for long. */
function ready(product) {
  const img = new Image()
  img.src = product.hero.src
  const decoded = img.decode ? img.decode().catch(() => {}) : Promise.resolve()
  return Promise.race([decoded, new Promise((r) => setTimeout(r, 650))])
}

/**
 * The showroom: one piece, floating over a plinth in a room lit by its own
 * colours. It is the home page, and the room every piece in the archive opens
 * into (initialId); entry 'browse' means the piece was carried in from the
 * archive, already in place, so the house skips its introduction and simply
 * brings the lights up around it. The piece is the only image; its other views wait in the closer
 * look. Everything the room is made of reads the piece's theme, so moving to
 * another piece relights the set rather than replacing it.
 */
export default function Showroom({ initialId, entry }) {
  const { go } = usePage()
  const { bag, saved, toggleSaved } = useShop()
  const first = PRODUCTS.find((p) => p.id === initialId) ?? PRODUCTS[0]
  const arrival = useRef(entry)
  const rootRef = useRef(null)
  const stageRef = useRef(null)
  const cameraRef = useRef(null)
  const parallaxRef = useRef(null)
  const cursorRef = useRef(null)

  const [category, setCategory] = useState('all')
  const [productId, setProductId] = useState(first.id)
  // the piece whose turntable has been asked for — its frames load only then
  const [armed, setArmed] = useState(null)
  const [dir, setDir] = useState(1)
  const [closer, setCloser] = useState(false)
  const [size, setSize] = useState(null)
  const [overlay, setOverlay] = useState(null)
  // the order request for the piece on stage, in the size chosen
  const [ordering, setOrdering] = useState(false)

  // the room's colours are owned by GSAP after the first paint: these values
  // never change between renders, so React never writes over a tween
  const [initialVars] = useState(() => ({
    ...themeVars(first.theme),
    '--sr-dim': 1,
    '--sr-focus': 0,
    '--vx-a': 'var(--sr-neon)',
    '--vx-b': 'var(--sr-light)',
    '--drawer-bg': 'rgb(var(--sr-bg0) / 0.97)',
  }))

  const product = PRODUCTS.find((p) => p.id === productId)
  const list = useMemo(() => inCategory(category), [category])
  const pos = Math.max(0, list.findIndex((p) => p.id === productId))
  const n = list.length
  const prev = n > 1 ? list[(pos - 1 + n) % n] : null
  const next = n > 1 ? list[(pos + 1) % n] : null

  const busy = useRef(false)
  const pendingIn = useRef(null)
  const closerRef = useRef(false)
  useLayoutEffect(() => { closerRef.current = closer }, [closer])
  // a request made while the set is still moving is kept, not dropped: the
  // latest one runs as soon as the current change has landed
  const queued = useRef(null)

  // the light, the ring and the piece's depth belong to the piece alone
  usePointerField(rootRef, { anchor: LIGHT_ANCHOR, zoneRef: stageRef })
  useSpotlight(rootRef)
  useShowcase({ zoneRef: stageRef, cursorRef, parallaxRef, enabled: !closer && !overlay && !ordering })

  const firstPiece = useRef(true)
  useEffect(() => {
    if (firstPiece.current) { firstPiece.current = false; return }
    window.history.replaceState(null, '', `#/piece/${productId}`)
  }, [productId])

  /* ------------------------------------------------------------ intro */
  useLayoutEffect(() => {
    const root = rootRef.current
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root)
      if (reducedMotion()) {
        gsap.set(root, { '--sr-dim': 0 })
        gsap.set(q('[data-opening]'), { autoAlpha: 0 })
        return
      }
      if (arrival.current === 'browse') {
        // carried in from the archive: the piece is already where it belongs;
        // the lights come up and the room assembles around it
        gsap.set(q('[data-opening]'), { autoAlpha: 0 })
        const tl = gsap.timeline({ delay: 0.05 })
        tl.to(root, { '--sr-dim': 0, duration: 1.5, ease: 'power2.out' }, 0)
        tl.fromTo(q('[data-neon-line]'), { scaleY: 0 }, { scaleY: 1, duration: 1.3, ease: 'power3.inOut' }, 0.05)
        tl.fromTo(q('[data-neon-glow]'), { opacity: 0 }, { opacity: 1, duration: 1.4, ease: 'power2.out' }, 0.4)
        tl.fromTo(q('[data-plinth]'), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1.4, ease: 'expo.out' }, 0.1)
        tl.fromTo(q('[data-rock]'), { opacity: 0 }, { opacity: 1, duration: 1.2 }, 0.3)
        tl.fromTo(q('[data-intro]'), { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.04 }, 0.2)
        tl.fromTo(q('[data-reveal-inner]'), { yPercent: 110 }, { yPercent: 0, duration: 1.0, ease: 'power3.out', stagger: 0.07 }, 0.45)
        tl.fromTo(q('[data-fade]'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07 }, 0.65)
        tl.fromTo(q('[data-size]'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.05 }, 0.75)
        tl.fromTo(q('[data-price-was]'), { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.85)
        tl.fromTo(q('[data-price-now]'), { opacity: 0, y: 7 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 1.0)
        return
      }
      // coming back from the archive: the house has already introduced itself
      const returning = arrival.current === 'return'
      if (returning) gsap.set(q('[data-opening]'), { autoAlpha: 0 })
      // the arrival: the house's name in the dark, then the room
      const open = returning ? gsap.timeline({ paused: true }) : gsap.timeline()
      open
        .fromTo(q('[data-opening-letter]'), { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: 0.05 }, 0.15)
        .fromTo(q('[data-opening-rule]'), { scaleX: 0 }, { scaleX: 1, duration: 1.0, ease: 'power3.inOut' }, 0.55)
        .fromTo(q('[data-opening-line]'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.85)
        .to(q('[data-opening] > *'), { opacity: 0, y: -14, duration: 0.7, ease: 'power2.in', stagger: 0.05 }, 2.05)
        .to(q('[data-opening]'), { autoAlpha: 0, duration: 0.9, ease: 'power2.inOut' }, 2.3)

      // the room: the neon strikes and climbs the glass, the stone is lit by
      // it, and the piece comes down to hang over the plinth
      const tl = gsap.timeline({ delay: returning ? 0.15 : 2.35 })
      tl.to(root, { '--sr-dim': 0, duration: 1.8, ease: 'power2.out' }, 0)
      tl.fromTo(q('[data-neon-line]'), { scaleY: 0 }, { scaleY: 1, duration: 1.5, ease: 'power3.inOut' }, 0.1)
      tl.fromTo(q('[data-neon-glow]'), { opacity: 0 }, { opacity: 1, duration: 1.6, ease: 'power2.out' }, 0.6)
      tl.fromTo(q('[data-plinth]'), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.6, ease: 'expo.out' }, 0.2)
      tl.fromTo(q('[data-rock]'), { opacity: 0 }, { opacity: 1, duration: 1.4 }, 0.4)
      tl.fromTo(
        q('[data-hero]'),
        { opacity: 0, yPercent: -6, scale: 0.98, filter: 'blur(8px)' },
        { opacity: 1, yPercent: 0, scale: 1, filter: 'blur(0px)', duration: 1.8, ease: 'expo.out', clearProps: 'filter' },
        0.75,
      )
      tl.fromTo(q('[data-intro]'), { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.05 }, 0.6)
      tl.fromTo(q('[data-reveal-inner]'), { yPercent: 110 }, { yPercent: 0, duration: 1.0, ease: 'power3.out', stagger: 0.08 }, 1.1)
      tl.fromTo(q('[data-fade]'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 }, 1.35)
      tl.fromTo(q('[data-size]'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.05 }, 1.45)
      tl.fromTo(q('[data-price-was]'), { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 1.6)
      tl.fromTo(q('[data-price-now]'), { opacity: 0, y: 7 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 1.78)
    }, root)
    return () => ctx.revert()
  }, [])

  // the other pieces' stage photographs, so moving on is instant. Only those:
  // the turntable's frames wait until the visitor asks to look closer
  useEffect(() => {
    const t = window.setTimeout(() => {
      PRODUCTS.forEach((p) => {
        const i = new Image()
        i.decoding = 'async'
        i.src = p.hero.src
      })
    }, 1500)
    return () => window.clearTimeout(t)
  }, [])

  // a hand on its way to "Look closer" starts the frames on their way, once per piece
  const fetched = useRef(new Set())
  const prefetchFrames = useCallback(() => {
    if (fetched.current.has(productId)) return
    fetched.current.add(productId)
    const large = prefersLargeFrames()
    turnViews(PRODUCTS.find((p) => p.id === productId)).forEach((v) => {
      const i = new Image()
      i.decoding = 'async'
      i.src = frameSrc(v.turn, large)
    })
  }, [productId])

  /* ------------------------------------------------------- closer look */
  const openCloser = useCallback(() => {
    // asked for while the set is still changing: it opens as soon as it lands
    if (busy.current) { queued.current = { kind: 'closer' }; return }
    setArmed(productId)
    setOverlay(null)
    setCloser(true)
  }, [productId])

  // the piece leans in and gives way to the viewer, and is there again after
  const firstCloser = useRef(true)
  useEffect(() => {
    if (firstCloser.current) { firstCloser.current = false; return }
    const root = rootRef.current
    const cam = cameraRef.current
    const page = root.querySelectorAll('[data-quiet], [data-quiet-soft], [data-fade-group]')
    if (closer) {
      gsap.to(page, { opacity: 0, duration: 0.6, ease: 'power2.out', overwrite: 'auto' })
      gsap.to(cam, { scale: 1.09, opacity: 0, duration: 0.85, ease: 'power2.inOut', overwrite: 'auto' })
      gsap.to(root, { '--sr-focus': 1, duration: 1, ease: 'power2.inOut' })
    } else {
      gsap.to(page, { opacity: 1, duration: 0.9, ease: 'power2.inOut', delay: 0.35, overwrite: 'auto' })
      gsap.fromTo(cam, { scale: 1.02 }, { scale: 1, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.5, overwrite: 'auto' })
      gsap.to(root, { '--sr-focus': 0, duration: 1.1, ease: 'power2.inOut' })
    }
  }, [closer])

  /* ------------------------------------------------------- next piece */
  const requestProduct = useCallback((nextId, d = 1) => {
    if (closerRef.current) return
    if (busy.current) { queued.current = { kind: 'product', id: nextId, d }; return }
    if (nextId === productId) return
    const target = PRODUCTS.find((p) => p.id === nextId)
    if (!target) return
    busy.current = true
    setOverlay(null)

    const root = rootRef.current
    const q = gsap.utils.selector(root)
    const tl = gsap.timeline()
    // house lights down; the piece rises away; the words step out
    tl.to(root, { '--sr-dim': 1, duration: 0.65, ease: 'power2.in' }, 0)
    tl.to(q('[data-hero]'), { xPercent: -d * 5, yPercent: -4, scale: 0.97, filter: 'blur(6px)', opacity: 0, duration: 0.7, ease: 'power3.in' }, 0)
    tl.to(q('[data-reveal-inner]'), { yPercent: -110, duration: 0.5, ease: 'power3.in', stagger: 0.04 }, 0.02)
    tl.to(q('[data-size]'), { opacity: 0, y: -6, duration: 0.36, stagger: 0.025, ease: 'power2.in' }, 0)
    tl.to(q('[data-neon-line]'), { opacity: 0.25, duration: 0.5, ease: 'power2.in' }, 0.1)
    // the room is relit in the new piece's palette while it is dark; the last
    // of the change is still moving as the lights come up, so the colour is
    // seen arriving with the piece
    tl.to(root, { ...themeVars(target.theme), duration: 1.1, ease: 'power2.inOut' }, 0.2)
    // the set changes at full dark, once the new piece can be shown
    tl.add(() => {
      tl.pause()
      ready(target).then(() => {
        pendingIn.current = { d }
        setDir(d)
        setProductId(nextId)
        setSize(null)
        tl.resume()
      })
    }, 0.74)
  }, [productId])

  useLayoutEffect(() => {
    const pending = pendingIn.current
    if (!pending) return
    pendingIn.current = null
    const root = rootRef.current
    const q = gsap.utils.selector(root)
    const { d } = pending
    const tl = gsap.timeline({ onComplete: () => { busy.current = false; root.dispatchEvent(new Event('sr-settled')) } })
    tl.to(root, { '--sr-dim': 0, duration: 1.2, ease: 'power2.out' }, 0)
    // the neon comes back up with a breath of its own
    tl.fromTo(q('[data-neon-line]'), { opacity: 0.25 }, { opacity: 1, duration: 1.1, ease: 'power2.out', clearProps: 'opacity' }, 0.15)
    tl.fromTo(
      q('[data-hero]'),
      { xPercent: d * 5, yPercent: -4, scale: 1.03, filter: 'blur(7px)', opacity: 0 },
      { xPercent: 0, yPercent: 0, scale: 1, filter: 'blur(0px)', opacity: 1, duration: 1.4, ease: 'expo.out', clearProps: 'filter' },
      0.08,
    )
    tl.fromTo(q('[data-reveal-inner]'), { yPercent: 110 }, { yPercent: 0, duration: 0.95, ease: 'power3.out', stagger: 0.06 }, 0.3)
    tl.fromTo(q('[data-size]'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.04, ease: 'power3.out' }, 0.45)
    tl.fromTo(q('[data-price-was]'), { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }, 0.55)
    tl.fromTo(q('[data-price-now]'), { opacity: 0, y: 7 }, { opacity: 1, y: 0, duration: 0.75, ease: 'power3.out' }, 0.7)
  }, [productId])

  // next / previous piece, relative to wherever the set will be when it runs —
  // two quick presses travel two pieces
  const stepProduct = useCallback((d) => {
    if (busy.current) { queued.current = { kind: 'step', d }; return }
    const to = d > 0 ? next : prev
    if (to) requestProduct(to.id, d)
  }, [next, prev, requestProduct])

  // when a change lands, whatever the visitor asked for meanwhile goes next
  useEffect(() => {
    const root = rootRef.current
    const onSettled = () => {
      const q = queued.current
      queued.current = null
      if (q?.kind === 'product') requestProduct(q.id, q.d)
      else if (q?.kind === 'step') stepProduct(q.d)
      else if (q?.kind === 'closer') openCloser()
    }
    root.addEventListener('sr-settled', onSettled)
    return () => root.removeEventListener('sr-settled', onSettled)
  }, [requestProduct, stepProduct, openCloser])

  /* ------------------------------------------------------- categories */
  const pickCategory = useCallback((id) => {
    setOverlay(null)
    setCategory(id)
    const pool = inCategory(id)
    if (pool.length && !pool.some((p) => p.id === productId)) requestProduct(pool[0].id, 1)
  }, [productId, requestProduct])

  /* ------------------------------------------------------- stage input */
  // a still press on the piece looks closer; a sideways swipe moves on
  const press = useRef(null)
  const onStageDown = (e) => { press.current = { x: e.clientX, y: e.clientY } }
  const onStageUp = (e) => {
    const p = press.current
    press.current = null
    if (!p) return
    const dx = e.clientX - p.x
    const dy = e.clientY - p.y
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4) { stepProduct(dx < 0 ? 1 : -1); return }
    if (Math.hypot(dx, dy) < 8) openCloser()
  }

  /* ------------------------------------------------------- keyboard */
  useEffect(() => {
    const onKey = (e) => {
      if (overlay || closer || ordering) return
      if (e.target instanceof HTMLInputElement) return
      if (e.key === '/') { e.preventDefault(); setOverlay('search') }
      else if (e.key === 'ArrowRight') stepProduct(1)
      else if (e.key === 'ArrowLeft') stepProduct(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [overlay, closer, ordering, stepProduct])

  const goHome = () => {
    setOverlay(null)
    setCategory('all')
    if (PRODUCTS[0].id !== productId) requestProduct(PRODUCTS[0].id, -1)
  }
  const onNav = (id) => {
    if (id === 'browse') { setOverlay(null); go('browse') }
    else setOverlay(id === overlay ? null : id)
  }

  return (
    <div
      ref={rootRef}
      className="relative flex min-h-[100svh] flex-col overflow-x-hidden lg:block lg:h-[100svh] lg:min-h-[640px] lg:overflow-hidden"
      style={{ ...initialVars, background: 'rgb(var(--sr-bg0))', color: 'rgb(var(--sr-ink))' }}
    >
      <SceneBack />

      {/* the opening: the house introduces itself before the room is lit */}
      <div
        data-opening
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[60] flex flex-col items-center justify-center"
        style={{ background: 'rgb(var(--sr-bg0))' }}
      >
        <span className="flex overflow-hidden whitespace-nowrap pl-[0.28em] font-display text-[clamp(1.55rem,6.2vw,5rem)] leading-none tracking-[0.28em]" style={{ color: 'rgb(var(--sr-ink))' }}>
          {'HOSHA STONE'.split('').map((ch, i) => (
            <span key={i} data-opening-letter className="inline-block">{ch === ' ' ? '\u00a0' : ch}</span>
          ))}
        </span>
        <span data-opening-rule className="mt-7 block h-px w-24 origin-center" style={{ background: 'rgb(var(--sr-neon))', boxShadow: '0 0 12px rgb(var(--sr-neon) / 0.8)' }} />
        <span data-opening-line className="mt-6 text-[10px] uppercase tracking-[0.42em]" style={{ color: 'rgb(var(--sr-ink) / 0.6)' }}>
          {ABOUT.motto}
        </span>
      </div>

      <div className="relative z-40">
        <Header
          onHome={goHome}
          onNav={onNav}
          onSearch={() => setOverlay('search')}
          onMenu={() => setOverlay('menu')}
          active={overlay === 'collections' ? 'collections' : overlay === 'about' ? 'about' : ''}
          category={category}
          onCategory={pickCategory}
          onCloseCategories={() => setOverlay((o) => (o === 'collections' ? null : o))}
          bag={bag}
          saved={saved.length}
        />
      </div>

      {/* the piece: the only image on the page. Its box is the one place the
          pointer becomes part of the scene. Three wrappers, three owners: the
          closer look, the change of piece, and the visitor's hand */}
      <div
        ref={stageRef}
        onPointerDown={onStageDown}
        onPointerUp={onStageUp}
        className="showcase-zone absolute left-1/2 top-[12.5svh] z-10 h-[41svh] w-[min(88vw,46svh)] -translate-x-1/2 touch-pan-y lg:top-[18.5%] lg:h-[56%] lg:w-[min(36vw,62vh)] xl:w-[min(42vw,66vh)]"
      >
        <div ref={cameraRef} className="relative h-full w-full will-change-transform" style={{ transformOrigin: '50% 60%' }}>
          <div data-hero className="absolute inset-0 will-change-transform">
            <div ref={parallaxRef} className="absolute inset-0">
              <img
                key={product.id}
                src={product.hero.src}
                alt={`${product.name} — front`}
                draggable="false"
                decoding="async"
                className="h-full w-full select-none object-contain object-bottom"
              />
            </div>
          </div>
        </div>
      </div>

      <SceneFront />
      <HouseLights />

      {/* phone: the stage takes the first screen; the words follow below */}
      <div aria-hidden="true" className="h-[calc(65svh_-_72px)] shrink-0 lg:hidden" />

      {/* left: who the piece is */}
      <div className="relative z-20 order-1 px-6 lg:absolute lg:left-[max(3rem,3.7vw)] lg:top-[34%] lg:w-[32vw] lg:px-0">
        <Title product={product} onLook={openCloser} onPrefetch={prefetchFrames} />
      </div>

      {/* right: the next piece */}
      <div data-fade-group className="relative z-20 order-4 px-6 pb-14 pt-10 lg:absolute lg:right-[max(3rem,4vw)] lg:top-[40%] lg:p-0">
        <NextPiece next={next} onNext={() => stepProduct(1)} />
      </div>

      {/* bottom: where you are in the set, and the price and sizes */}
      <div data-fade-group className="relative z-20 order-3 px-6 pt-10 lg:absolute lg:bottom-[9.5%] lg:left-[max(3rem,3.7vw)] lg:p-0">
        <Pager pos={pos} total={n} dir={dir} />
      </div>
      <div data-fade-group className="relative z-20 order-2 px-6 pt-9 lg:absolute lg:bottom-[8.5%] lg:right-[max(3rem,4vw)] lg:p-0">
        <Purchase product={product} size={size} onSize={setSize} onOrder={() => setOrdering(true)} dir={dir} saved={saved.includes(product.id)} onSave={(on) => toggleSaved(product.id, on)} />
      </div>

      <SearchSheet
        open={overlay === 'search'}
        onClose={() => setOverlay(null)}
        onPick={(id) => {
          setOverlay(null)
          const from = PRODUCTS.findIndex((p) => p.id === productId)
          const to = PRODUCTS.findIndex((p) => p.id === id)
          if (category !== 'all' && !inCategory(category).some((p) => p.id === id)) setCategory('all')
          requestProduct(id, to >= from ? 1 : -1)
        }}
        onCategory={pickCategory}
      />
      <Closer
        open={closer}
        armed={armed === product.id}
        product={product}
        onClose={() => setCloser(false)}
        sourceRef={stageRef}
        purchase={
          <Purchase product={product} size={size} onSize={setSize} onOrder={() => setOrdering(true)} dir={dir} saved={saved.includes(product.id)} onSave={(on) => toggleSaved(product.id, on)} />
        }
      />

      {/* the ring that stands in for the cursor over the piece (useShowcase) */}
      <div ref={cursorRef} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[55] hidden lg:block" style={{ opacity: 0 }}>
        <div
          className="grid h-[74px] w-[74px] place-items-center rounded-full"
          style={{
            transform: 'translate(-50%, -50%) scale(0.45)',
            border: '1px solid rgb(var(--sr-ink) / 0.5)',
            background: 'rgb(var(--sr-bg0) / 0.2)',
          }}
        >
          <span className="pl-[0.34em] text-[8.5px] font-medium uppercase tracking-[0.34em]" style={{ color: 'rgb(var(--sr-ink))' }}>
            Look
          </span>
        </div>
      </div>
      <MobileMenu open={overlay === 'menu'} onClose={() => setOverlay(null)} onNav={onNav} category={category} onCategory={pickCategory} />

      <About open={overlay === 'about'} onClose={() => setOverlay(null)} />
      <OrderPanel open={ordering} product={product} size={size} onClose={() => setOrdering(false)} />
    </div>
  )
}
