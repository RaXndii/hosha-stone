import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { clock, details as detailsOf, spotsOf, turnViews } from '../../data/showroom.js'
import Turntable from './Turntable.jsx'
import Lens from './Lens.jsx'
import Plate from '../ui/Plate.jsx'
import { sound } from '../../lib/sound/index.js'

const ink = (a = 1) => `rgb(var(--sr-ink) / ${a})`
const shortest = (from, to) => ((((to - from) % 360) + 540) % 360) - 180
const fine = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches

/** What the visitor is looking at, named from the nearest quarter. */
function facingName(theta) {
  const names = [[0, 'Front'], [45, 'Three-quarter'], [90, 'Side'], [135, 'Three-quarter back'], [180, 'Back'], [225, 'Three-quarter back'], [270, 'Side'], [315, 'Three-quarter']]
  let best = names[0]
  for (const n of names) if (Math.abs(shortest(theta, n[0])) < Math.abs(shortest(theta, best[0]))) best = n
  return best[1]
}

/**
 * Seen from above: the garment's cross-section turning, a notch for its front,
 * a dot for every angle it was really photographed from, and the visitor fixed
 * at the bottom of the dial. It turns with the piece — orientation, not a control.
 */
function Dial({ views, dialRef }) {
  return (
    <svg viewBox="-30 -30 60 60" className="h-[44px] w-[44px] shrink-0 overflow-visible lg:h-[52px] lg:w-[52px]" aria-hidden="true">
      <circle r="26" fill="none" style={{ stroke: ink(0.14) }} strokeWidth="0.8" />
      <g ref={dialRef}>
        <ellipse rx="15" ry="6.5" style={{ fill: 'rgb(var(--sr-neon) / 0.14)', stroke: 'rgb(var(--sr-neon) / 0.85)' }} strokeWidth="0.9" />
        {/* the front of the piece */}
        <path d="M-3 6 L0 9.5 L3 6" fill="none" style={{ stroke: ink(0.9) }} strokeWidth="1" strokeLinecap="round" />
        {views.map((v) => {
          // a photograph taken at angle a sits where the visitor stands once the piece is turned to a
          const a = (v.angle * Math.PI) / 180
          return <circle key={v.angle} cx={-Math.sin(a) * 26} cy={Math.cos(a) * 26} r="1.6" style={{ fill: ink(0.75) }} />
        })}
      </g>
      {/* the visitor */}
      <path d="M-3.2 30 L0 25.5 L3.2 30 Z" style={{ fill: 'rgb(var(--sr-neon))' }} />
    </svg>
  )
}

/** The film's card: its still, slowly breathing, a play stone, and how long it runs. */
function FilmCard({ film, onPlay, compact }) {
  return (
    <button
      data-sound="none"
      onClick={(e) => onPlay(e.currentTarget)}
      aria-label={`Watch the film — ${clock(film.duration)}`}
      className={`group relative block shrink-0 ${compact ? 'h-[46px] w-[82px]' : 'w-[168px] xl:w-[200px]'}`}
    >
      <span className={`relative isolate block ${compact ? 'h-full w-full' : 'aspect-video w-full'}`}>
      <span className="facet absolute inset-0 block overflow-hidden" style={{ '--cut': compact ? '9px' : '12px', background: '#000' }}>
        <img src={film.cover || film.poster} alt="" draggable="false" loading="lazy" className="film-card-still absolute inset-0 h-full w-full object-cover opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
        <span aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgb(0 0 0 / 0.55), transparent 60%)' }} />
        <span aria-hidden="true" className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110" style={{ filter: 'drop-shadow(0 0 9px rgb(var(--sr-neon) / 0.85))' }}>
          <span className={`lozenge grid place-items-center ${compact ? 'h-6 w-6' : 'h-9 w-9'}`} style={{ background: 'rgb(var(--sr-neon) / 0.92)' }}>
            <svg viewBox="0 0 16 16" className={compact ? 'ml-px h-2.5 w-2.5' : 'ml-0.5 h-3 w-3'} style={{ color: 'rgb(var(--sr-bg0))' }}><path d="M4.5 2.6 13 8l-8.5 5.4z" fill="currentColor" /></svg>
          </span>
        </span>
      </span>
      <Plate cut={compact ? 9 : 12} className="z-[1]" edge="rgb(var(--sr-neon) / 0.55)" edgeHi="rgb(var(--sr-neon))" />
      </span>
      {!compact && (
        <span className="mt-2.5 flex items-baseline justify-between text-[9.5px] uppercase tracking-[0.3em]">
          <span style={{ color: ink(0.9) }}>The film</span>
          <span className="tabular-nums tracking-[0.12em]" style={{ color: ink(0.45) }}>{clock(film.duration)}</span>
        </span>
      )}
    </button>
  )
}

/**
 * The closer look: the piece as one object to turn in the hand, every close
 * photograph to go into, the details marked where they are on it, and the
 * film.
 *
 * It grows out of the piece on the stage and folds back into it. Inside, the
 * stage holds either the turntable — drag to turn, scroll or pinch to go
 * close — or a close photograph, which goes close the same way. Small cut
 * stones on the piece mark its details: one opens the photograph of that
 * detail, or takes the visitor in close on the piece itself, and says in a
 * line what it is. Around the stage, only what is needed: the photographs and
 * the film; the dial and what is being looked at; and the price, sizes and
 * favourite — on a phone as one bar along the bottom, where a thumb is.
 *
 * armed  the turntable is mounted only once the visitor has asked for it, and
 *        is let go when the piece changes — so its frames never load early and
 *        never outstay their piece.
 */
export default function Closer({ open, armed, product, onClose, sourceRef, purchase, bar, onFilm }) {
  const rootRef = useRef(null)
  const frameRef = useRef(null)
  const closeBtnRef = useRef(null)
  const ttRef = useRef(null)
  const lensRef = useRef(null)
  const dialRef = useRef(null)
  const nameRef = useRef(null)
  const zoomRef = useRef(null)
  const markersRef = useRef([])
  const mounted = useRef(false)
  const lastName = useRef('Front')
  const [view, setView] = useState({ kind: 'piece' }) // or { kind: 'photo', i, spot }
  const [spot, setSpot] = useState(null) // a detail being looked at on the piece itself
  const [moved, setMoved] = useState(false)
  const [touch] = useState(() => !fine())

  const views = turnViews(product)
  const extra = detailsOf(product)
  const spots = spotsOf(product)
  const film = product.film
  const canTurn = views.length > 1
  const front = views.find((v) => v.angle === 0) ?? views[0]
  const photo = view.kind === 'photo' ? extra[view.i] : null
  const spotNow = view.kind === 'photo' ? (view.spot != null ? spots[view.spot] : null) : spot != null ? spots[spot] : null

  /* ---------------------------------------------------- open and close */
  useLayoutEffect(() => {
    const root = rootRef.current
    const frame = frameRef.current
    const q = gsap.utils.selector(root)
    gsap.killTweensOf([frame, ...q('[data-cl-back]'), ...q('[data-cl-chrome]')])
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // the piece's box on the stage, as a transform of the frame: where the
    // frame grows from on the way in and returns to on the way out
    const fromPiece = () => {
      const src = sourceRef.current?.getBoundingClientRect()
      const dst = frame.getBoundingClientRect()
      if (!src || !dst.width || !dst.height) return { x: 0, y: 0, scale: 0.94 }
      return {
        x: src.left + src.width / 2 - (dst.left + dst.width / 2),
        y: src.top + src.height / 2 - (dst.top + dst.height / 2),
        scale: Math.min(src.width / dst.width, src.height / dst.height),
      }
    }

    if (open) {
      gsap.set(root, { visibility: 'visible' })
      document.documentElement.style.overflow = 'hidden'
      if (reduced) {
        gsap.set([frame, ...q('[data-cl-back]'), ...q('[data-cl-chrome]')], { opacity: 1, clearProps: 'transform' })
      } else {
        const tl = gsap.timeline()
        tl.fromTo(q('[data-cl-back]'), { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'power2.inOut', stagger: 0.08 }, 0)
        tl.fromTo(frame, fromPiece(), { x: 0, y: 0, scale: 1, duration: 1.15, ease: 'power3.inOut' }, 0.05)
        tl.fromTo(frame, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power1.out' }, 0.1)
        tl.fromTo(q('[data-cl-chrome]'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06 }, 0.65)
      }
      const t = window.setTimeout(() => closeBtnRef.current?.focus({ preventScroll: true, focusVisible: false }), 700)
      return () => window.clearTimeout(t)
    }

    if (!mounted.current) {
      mounted.current = true
      gsap.set(root, { visibility: 'hidden' })
      return
    }
    document.documentElement.style.overflow = ''
    const done = () => {
      gsap.set(root, { visibility: 'hidden' })
      gsap.set(frame, { clearProps: 'transform' })
      // the next visit starts from the front, at arm's length
      ttRef.current?.reset()
      setView({ kind: 'piece' })
      setSpot(null)
    }
    if (reduced) { done(); return }
    const tl = gsap.timeline({ onComplete: done })
    tl.to(q('[data-cl-chrome]'), { opacity: 0, y: 6, duration: 0.3, ease: 'power2.in', stagger: 0.02 }, 0)
    tl.to(frame, { ...fromPiece(), duration: 0.95, ease: 'power3.inOut' }, 0.08)
    tl.to(frame, { opacity: 0, duration: 0.35, ease: 'power1.in' }, 0.65)
    tl.to(q('[data-cl-back]'), { opacity: 0, duration: 0.8, ease: 'power2.inOut' }, 0.2)
  }, [open, sourceRef])

  useEffect(() => () => { document.documentElement.style.overflow = '' }, [])

  /* ---------------------------------------------------- what is on the stage */
  const showPiece = useCallback(() => {
    setView({ kind: 'piece' })
    setSpot(null)
    ttRef.current?.unzoom()
  }, [])
  // back on the piece, its readout is new: the next frame names what faces the visitor
  useLayoutEffect(() => { if (view.kind === 'piece') lastName.current = '' }, [view.kind])

  const showPhoto = useCallback((i, fromSpot = null) => {
    if (i < 0 || i >= extra.length) return
    setSpot(null)
    setView({ kind: 'photo', i, spot: fromSpot })
  }, [extra.length])

  const stepPhoto = useCallback((d) => {
    if (view.kind !== 'photo' || extra.length < 2) return
    sound.play('soft')
    setView({ kind: 'photo', i: (view.i + d + extra.length) % extra.length, spot: null })
  }, [view, extra.length])

  /** a detail: its photograph, or in close on the piece where it is */
  const openSpot = useCallback((k) => {
    const sp = spots[k]
    if (!sp) return
    sound.play('bead', { index: k, count: spots.length })
    if (sp.photoIndex >= 0) { showPhoto(sp.photoIndex, k); return }
    setView({ kind: 'piece' })
    setSpot(k)
    ttRef.current?.focusOn(sp.at[0], sp.at[1], 2.4)
  }, [spots, showPhoto])

  /* ---------------------------------------------------- keyboard */
  const close = useCallback(() => onClose(), [onClose])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      // a film over the closer look keeps its own keys
      if (e.defaultPrevented) return
      if (e.target instanceof HTMLInputElement) return
      const active = view.kind === 'photo' ? lensRef.current : ttRef.current
      if (e.key === 'Escape') { e.stopPropagation(); close() }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const d = e.key === 'ArrowRight' ? 1 : -1
        if (view.kind === 'photo') stepPhoto(d)
        else ttRef.current?.step(d)
      }
      else if (e.key === '+' || e.key === '=') active?.zoomBy(1.35)
      else if (e.key === '-') active?.zoomBy(1 / 1.35)
      else if (e.key === '0') { active?.reset(); if (view.kind === 'piece') setSpot(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close, view, stepPhoto])

  /* ---------------------------------------------------- every frame of the turntable */
  // the dial, the readouts and the details' marks follow the piece without re-rendering anything
  const spotRef = useRef(spot)
  useEffect(() => { spotRef.current = spot }, [spot])
  const onFrame = useCallback((theta, zoom, dragging, target) => {
    dialRef.current?.setAttribute('transform', `rotate(${(-theta).toFixed(2)})`)
    // the room's light drifts a little as the piece turns, as it would round a real object
    rootRef.current?.style.setProperty('--tt-x', Math.sin((theta * Math.PI) / 180).toFixed(3))
    const name = facingName(theta)
    if (nameRef.current && name !== lastName.current) {
      lastName.current = name
      nameRef.current.textContent = name
    }
    if (zoomRef.current) zoomRef.current.textContent = `${Math.round(zoom * 100)}%`
    // close in, the stage's edges fade, so the cloth runs out softly rather than at a ruled line
    frameRef.current?.toggleAttribute('data-close', zoom > 1.03)
    // marks sit on the cloth while it faces the visitor at arm's length, and
    // step aside while it turns, or once the visitor has gone close
    const tt = ttRef.current
    markersRef.current.forEach((el, k) => {
      const sp = spots[k]
      if (!el || !tt || !sp) return
      const p = tt.project(sp.at[0], sp.at[1])
      if (!p) return
      const show = spotRef.current === null && p.facing > 0.45 && zoom < 1.2 && !dragging
      el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`
      el.style.opacity = show ? '1' : '0'
      el.style.pointerEvents = show ? 'auto' : 'none'
    })
    // gone back out from a detail (the zoom is headed home): the detail is let go
    if (spotRef.current !== null && target <= 1.001) setSpot(null)
  }, [spots])

  const onLensZoom = useCallback((z) => {
    if (zoomRef.current) zoomRef.current.textContent = `${Math.round(z * 100)}%`
    frameRef.current?.toggleAttribute('data-close', z > 1.03)
  }, [])

  // the zoom readout follows whatever is on the stage
  useEffect(() => { if (view.kind === 'photo' && zoomRef.current) zoomRef.current.textContent = '100%' }, [view])

  const hint = view.kind === 'photo'
    ? touch ? (extra.length > 1 ? 'Pinch to go close · Swipe for the next' : 'Pinch or double-tap to go close') : 'Scroll or double-click to go close'
    : canTurn
      ? touch ? 'Drag to turn · Pinch to go close' : 'Drag to turn · Scroll to go close'
      : touch ? 'Pinch or double-tap to go close' : 'Scroll or double-click to go close'

  const activeZoom = () => (view.kind === 'photo' ? lensRef.current : ttRef.current)

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${product.name} — a closer look`}
      aria-hidden={!open}
      inert={!open || undefined}
      data-open={open || undefined}
      className="closer fixed inset-0 z-[45]"
      style={{ visibility: 'hidden' }}
    >
      {/* the room, quieter: the piece's own colour, low and soft */}
      <div data-cl-back className="absolute inset-0" style={{ background: 'rgb(var(--sr-bg0) / 0.965)' }} />
      <div
        data-cl-back
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(44% 54% at calc(50% + var(--tt-x, 0) * 7%) 44%, rgb(var(--sr-bg2) / 0.62), transparent 74%), radial-gradient(36% 14% at calc(50% - var(--tt-x, 0) * 5%) 86%, rgb(var(--sr-neon) / 0.16), transparent 70%)',
        }}
      />

      <div className="absolute inset-0 flex flex-col pb-[env(safe-area-inset-bottom)] lg:block lg:pb-0">
        {/* top: what this is, the film, and the way back */}
        <div className="relative z-[3] flex h-[60px] shrink-0 items-center justify-between pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] lg:absolute lg:inset-x-0 lg:top-0 lg:h-[84px] lg:pl-[max(3rem,env(safe-area-inset-left))] lg:pr-[max(3rem,env(safe-area-inset-right))]">
          <div data-cl-chrome className="flex min-w-0 items-center gap-4">
            <span className="text-[9px] font-medium uppercase tracking-[0.38em]" style={{ color: 'rgb(var(--sr-neon))' }}>
              Look closer
            </span>
            <span className="hidden h-px w-10 sm:block" style={{ background: ink(0.3) }} />
            <span className="hidden truncate text-[10px] uppercase tracking-[0.26em] sm:block" style={{ color: ink(0.75) }}>
              {product.name} — {product.code}
            </span>
          </div>
          <div data-cl-chrome className="flex items-center gap-1 lg:gap-6">
            {film && (
              <button
                data-sound="none"
                onClick={(e) => onFilm?.(e.currentTarget)}
                className="group flex h-11 items-center gap-2.5 px-2 text-[10px] font-medium uppercase tracking-[0.3em] lg:px-0"
                style={{ color: ink(0.85) }}
              >
                <span className="grid place-items-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110" style={{ filter: 'drop-shadow(0 0 7px rgb(var(--sr-neon) / 0.75))' }}>
                  <span className="lozenge grid h-[22px] w-[22px] place-items-center" style={{ background: 'rgb(var(--sr-neon) / 0.92)' }}>
                    <svg viewBox="0 0 16 16" className="ml-px h-2 w-2" style={{ color: 'rgb(var(--sr-bg0))' }} aria-hidden="true"><path d="M4.5 2.6 13 8l-8.5 5.4z" fill="currentColor" /></svg>
                  </span>
                </span>
                <span className="transition-colors duration-300 group-hover:text-[rgb(var(--sr-ink))]"><span className="hidden sm:inline">Watch the </span>film</span>
              </button>
            )}
            <button
              ref={closeBtnRef}
              data-sound="none"
              onClick={close}
              aria-label="Close the closer look"
              className="group flex items-center gap-3 text-[10px] uppercase tracking-[0.3em]"
              style={{ color: ink(0.7) }}
            >
              <span className="hidden transition-colors duration-300 group-hover:text-[rgb(var(--sr-ink))] sm:inline">Close</span>
              {/* a cut stone that turns a quarter under the hand, like a nut */}
              <span
                className="relative isolate grid h-11 w-11 place-items-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-90 lg:h-10 lg:w-10"
                style={{ color: 'rgb(var(--sr-ink))' }}
              >
                <Plate cut={11} fill="rgb(var(--sr-glass) / 0.05)" edge={ink(0.25)} edgeHi={ink(0.65)} />
                <svg viewBox="0 0 16 16" className="h-3 w-3"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" /></svg>
              </span>
            </button>
          </div>
        </div>

        {/* the film, the piece and every close photograph (nothing to choose between: no rail) */}
        <div className={`relative z-[3] shrink-0 lg:absolute lg:left-[max(3rem,env(safe-area-inset-left))] lg:top-1/2 lg:-translate-y-1/2 ${!film && !extra.length ? 'hidden' : ''}`}>
          <div data-cl-chrome className="no-scrollbar flex items-center gap-2 overflow-x-auto px-5 pb-1 pt-1 [justify-content:safe_center] lg:flex-col lg:items-start lg:gap-3 lg:overflow-visible lg:p-0">
            {film && (
              <>
                <span className="lg:hidden"><FilmCard film={film} onPlay={onFilm} compact /></span>
                <span className="mb-3 hidden lg:block"><FilmCard film={film} onPlay={onFilm} /></span>
              </>
            )}
            <p className="mb-1 hidden text-[9px] uppercase tracking-[0.34em] lg:block" style={{ color: ink(0.42) }}>Close up</p>
            {[{ id: 'whole', label: canTurn ? 'The piece' : 'Front', src: front?.src, garment: true }, ...extra].map((d, i) => {
              const idx = i - 1
              const on = idx === -1 ? view.kind === 'piece' : view.kind === 'photo' && view.i === idx
              return (
                <button
                  key={d.id}
                  data-sound={idx === -1 ? undefined : 'soft'}
                  onClick={() => (idx === -1 ? showPiece() : showPhoto(idx))}
                  aria-pressed={on}
                  aria-label={idx === -1 ? `Show the ${canTurn ? 'whole piece' : 'front'}` : `Show the ${d.label.toLowerCase()}`}
                  className="group flex shrink-0 items-center gap-3"
                >
                  {/* each photograph is cut like the rest of the house: a small stone with a window in it */}
                  <span
                    className="relative block h-[46px] w-[46px] transition-[transform,filter,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
                    style={{ opacity: on ? 1 : 0.55, filter: on ? 'drop-shadow(0 0 8px rgb(var(--sr-neon) / 0.45))' : 'none' }}
                  >
                    <span className="facet absolute inset-0 overflow-hidden" style={{ '--cut': '10px', background: 'rgb(var(--sr-bg1))' }}>
                      <img src={d.src} alt="" draggable="false" loading="lazy" className={`absolute inset-0 h-full w-full ${d.garment ? 'object-contain p-1.5' : 'object-cover'}`} style={d.focus ? { objectPosition: d.focus } : undefined} />
                    </span>
                    <Plate cut={10} className="z-[1]" edge={on ? 'rgb(var(--sr-neon) / 0.95)' : ink(0.2)} edgeHi={on ? undefined : ink(0.5)} />
                  </span>
                  <span className="hidden text-[9.5px] uppercase tracking-[0.28em] transition-colors duration-500 lg:inline" style={{ color: on ? ink(0.9) : ink(0.42) }}>
                    {d.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* the stage */}
        <div ref={frameRef} className="closer-stage relative min-h-0 flex-1 lg:absolute lg:inset-x-[max(19vw,264px)] lg:bottom-[calc(122px+env(safe-area-inset-bottom))] lg:top-[84px]">
          {armed && front && (
            <div className="absolute inset-0 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ opacity: photo ? 0 : 1, transform: photo ? 'scale(0.96)' : 'none', pointerEvents: photo ? 'none' : 'auto' }}>
              <Turntable
                key={product.id}
                ref={ttRef}
                views={views}
                fallbackSrc={front.src}
                onFrame={onFrame}
                onInteract={() => setMoved(true)}
              />
              {/* the details, marked where they are on the piece */}
              {spots.map((sp, k) => (
                <button
                  key={sp.id}
                  ref={(el) => { markersRef.current[k] = el }}
                  data-sound="none"
                  onClick={() => openSpot(k)}
                  aria-label={`${sp.label}${sp.note ? `: ${sp.note}` : ''}`}
                  className="spot group/spot absolute left-0 top-0 -ml-[22px] -mt-[22px] grid h-11 w-11 place-items-center transition-opacity duration-500"
                  style={{ opacity: 0, pointerEvents: 'none', '--i': k }}
                >
                  <span aria-hidden="true" className="spot-ring absolute h-[10px] w-[10px]" style={{ border: '1px solid rgb(var(--sr-neon) / 0.9)' }} />
                  <span aria-hidden="true" className="relative block h-[8.5px] w-[8.5px] rotate-45 transition-transform duration-300 group-hover/spot:scale-125 group-focus-visible/spot:scale-125" style={{ background: 'rgb(var(--sr-ink))', boxShadow: '0 0 0 1px rgb(var(--sr-neon)), 0 0 12px rgb(var(--sr-neon) / 0.9)' }} />
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute top-1/2 isolate hidden -translate-y-1/2 whitespace-nowrap py-[6px] text-[9px] font-medium uppercase tracking-[0.28em] opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100 group-focus-visible/spot:opacity-100 lg:block ${sp.at[0] > 0.62 ? 'right-[38px] pl-2.5 pr-3' : 'left-[38px] pl-3 pr-2.5'}`}
                    style={{ color: ink() }}
                  >
                    <Plate cut={6} fill="rgb(var(--sr-bg0) / 0.82)" edge="rgb(var(--sr-neon) / 0.55)" />
                    {sp.label}
                  </span>
                </button>
              ))}
            </div>
          )}
          {/* a close photograph, to go into */}
          {armed && photo && (
            <div key={product.id + photo.id} className="closer-photo absolute inset-0">
              <Lens ref={lensRef} src={photo.src} alt={`${product.name} — ${photo.label}`} onZoom={onLensZoom} onSwipe={stepPhoto} />
            </div>
          )}
        </div>

        {/* the details, named (on a desk, beside the stage) */}
        {spots.length > 0 && (
          <div className="absolute right-[max(3rem,env(safe-area-inset-right))] top-1/2 z-[3] hidden w-[min(15vw,220px)] -translate-y-[60%] lg:block">
            <div data-cl-chrome>
              <p className="mb-4 text-[9px] uppercase tracking-[0.34em]" style={{ color: ink(0.42) }}>The details</p>
              <ul className="space-y-1">
                {spots.map((sp, k) => {
                  const on = spotNow === sp
                  return (
                    <li key={sp.id}>
                      <button data-sound="none" onClick={() => openSpot(k)} aria-pressed={on} className="group flex w-full items-start gap-3 py-2 text-left">
                        <span aria-hidden="true" className="mx-[1px] mt-[4px] block h-[6px] w-[6px] shrink-0 rotate-45 transition-[background-color,border-color,box-shadow] duration-300" style={{ background: on ? 'rgb(var(--sr-neon))' : 'transparent', border: `1px solid ${on ? 'rgb(var(--sr-neon))' : ink(0.5)}`, boxShadow: on ? '0 0 10px rgb(var(--sr-neon))' : 'none' }} />
                        <span className="min-w-0">
                          <span className="block text-[9.5px] uppercase tracking-[0.28em] transition-colors duration-300 group-hover:text-[rgb(var(--sr-ink))]" style={{ color: on ? ink() : ink(0.62) }}>{sp.label}</span>
                          {on && sp.note && <span className="mt-1.5 block text-[11px] leading-[1.6]" style={{ color: ink(0.55) }}>{sp.note}</span>}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        )}

        {/* bottom: what is being looked at, and how */}
        <div className="pointer-events-none relative z-[3] flex min-h-[56px] shrink-0 items-center justify-center px-5 lg:absolute lg:inset-x-[max(19vw,264px)] lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom))] lg:min-h-[52px] lg:px-0">
          <div data-cl-chrome className="flex max-w-full items-center gap-4">
            {spotNow ? (
              <div className="pointer-events-auto flex min-w-0 items-center gap-4">
                <span aria-hidden="true" className="block h-[6.5px] w-[6.5px] shrink-0 rotate-45" style={{ background: 'rgb(var(--sr-neon))', boxShadow: '0 0 10px rgb(var(--sr-neon))' }} />
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.32em]" style={{ color: ink(0.92) }}>{spotNow.label}</p>
                  {spotNow.note && <p className="mt-1 text-[11px] leading-[1.5] lg:text-[11.5px]" style={{ color: ink(0.6) }}>{spotNow.note}</p>}
                </div>
                <button data-sound="none" onClick={showPiece} className="ml-1 shrink-0 text-[9.5px] uppercase tracking-[0.28em] underline decoration-[rgb(var(--sr-ink)/0.3)] underline-offset-[5px]" style={{ color: ink(0.7) }}>
                  {photo ? 'The piece' : 'Back'}
                </button>
              </div>
            ) : photo ? (
              <div className="text-center">
                <p className="text-[10px] font-medium uppercase tracking-[0.32em]" style={{ color: ink(0.9) }}>
                  {photo.label} <span className="ml-2 tabular-nums tracking-[0.18em]" style={{ color: ink(0.45) }}>{view.i + 1} / {extra.length}</span>
                </p>
                <p className="mt-1.5 text-[9px] uppercase tracking-[0.3em]" style={{ color: ink(0.42) }}>{hint}</p>
              </div>
            ) : (
              <>
                {canTurn && <Dial views={views} dialRef={dialRef} />}
                <div className="min-w-[9.5rem]">
                  <p ref={nameRef} className="text-[10px] font-medium uppercase tracking-[0.32em]" style={{ color: ink(0.9) }}>
                    {canTurn ? 'Front' : 'Front view'}
                  </p>
                  {/* the hint is there until the hand has understood it, then it goes */}
                  <p
                    className="mt-1.5 text-[9px] uppercase tracking-[0.3em] transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{ color: ink(0.42), opacity: moved && !spots.length ? 0 : 1, transform: moved && !spots.length ? 'translateY(4px)' : 'none' }}
                    aria-hidden={moved && !spots.length}
                  >
                    {spots.length ? (moved ? (touch ? 'Tap a mark for its detail' : 'A mark opens its detail') : hint) : hint}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* a phone: the price, the favourite and the way to order, along the bottom edge */}
        {bar && <div data-cl-chrome className="relative z-[3] shrink-0 lg:hidden">{bar}</div>}
      </div>

      {/* zoom, for a hand without a wheel or a pinch */}
      <div className="absolute bottom-[calc(2rem+env(safe-area-inset-bottom))] left-[max(3rem,env(safe-area-inset-left))] z-[3] hidden lg:block">
        <div data-cl-chrome className="relative isolate flex items-center gap-1 px-1.5 py-1">
          <Plate cut={10} fill="rgb(var(--sr-glass) / 0.035)" edge={ink(0.14)} />
          {[['−', 1 / 1.35, 'Zoom out'], [null], ['+', 1.35, 'Zoom in']].map(([sym, f, label], i) =>
            sym ? (
              <button
                key={i}
                onClick={() => activeZoom()?.zoomBy(f)}
                aria-label={label}
                className="group relative isolate grid h-8 w-8 place-items-center text-[13px]"
                style={{ color: ink(0.85) }}
              >
                <span aria-hidden="true" className="facet absolute inset-0 -z-10 transition-colors duration-300 [--cut:7px] group-hover:bg-[rgb(var(--sr-ink)/0.08)]" />
                {sym}
              </button>
            ) : (
              <span key={i} ref={zoomRef} className="min-w-[3.2rem] text-center text-[9.5px] tabular-nums tracking-[0.18em]" style={{ color: ink(0.6) }}>
                100%
              </span>
            ),
          )}
        </div>
      </div>

      {/* a desk: the piece's price, sizes and favourite, within reach while it is examined */}
      <div className="absolute bottom-[calc(1.75rem+env(safe-area-inset-bottom))] right-[max(3rem,env(safe-area-inset-right))] z-[3] hidden lg:block">
        <div data-cl-chrome>{purchase}</div>
      </div>
    </div>
  )
}
