import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { details as detailsOf, turnViews } from '../../data/showroom.js'
import Turntable from './Turntable.jsx'

const ink = (a = 1) => `rgb(var(--sr-ink) / ${a})`
const shortest = (from, to) => ((((to - from) % 360) + 540) % 360) - 180

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
    <svg viewBox="-30 -30 60 60" className="h-[52px] w-[52px] shrink-0 overflow-visible" aria-hidden="true">
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

/**
 * The closer look: the piece as one object to turn in the hand.
 *
 * It grows out of the piece on the stage and folds back into it. Inside, the
 * turntable is the whole stage — drag to turn it, scroll or pinch to go close —
 * with only what is needed around it: the dial, the close-up photographs, and
 * the price, sizes and favourite. The frames load only when it opens, and only
 * for this piece.
 *
 * armed  the turntable is mounted only once the visitor has asked for it, and
 *        is let go when the piece changes — so its frames never load early and
 *        never outstay their piece.
 */
export default function Closer({ open, armed, product, onClose, sourceRef, purchase }) {
  const rootRef = useRef(null)
  const frameRef = useRef(null)
  const closeBtnRef = useRef(null)
  const ttRef = useRef(null)
  const dialRef = useRef(null)
  const nameRef = useRef(null)
  const zoomRef = useRef(null)
  const mounted = useRef(false)
  const lastName = useRef('Front')
  const [detail, setDetail] = useState(null)
  const [moved, setMoved] = useState(false)

  const views = turnViews(product)
  const extra = detailsOf(product)
  const canTurn = views.length > 1
  const front = views.find((v) => v.angle === 0) ?? views[0]

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
      setDetail(null)
    }
    if (reduced) { done(); return }
    const tl = gsap.timeline({ onComplete: done })
    tl.to(q('[data-cl-chrome]'), { opacity: 0, y: 6, duration: 0.3, ease: 'power2.in', stagger: 0.02 }, 0)
    tl.to(frame, { ...fromPiece(), duration: 0.95, ease: 'power3.inOut' }, 0.08)
    tl.to(frame, { opacity: 0, duration: 0.35, ease: 'power1.in' }, 0.65)
    tl.to(q('[data-cl-back]'), { opacity: 0, duration: 0.8, ease: 'power2.inOut' }, 0.2)
  }, [open, sourceRef])

  useEffect(() => () => { document.documentElement.style.overflow = '' }, [])

  /* ---------------------------------------------------- keyboard */
  const close = useCallback(() => onClose(), [onClose])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'Escape') { e.stopPropagation(); close() }
      else if (e.key === 'ArrowRight') ttRef.current?.step(1)
      else if (e.key === 'ArrowLeft') ttRef.current?.step(-1)
      else if (e.key === '+' || e.key === '=') ttRef.current?.zoomBy(1.35)
      else if (e.key === '-') ttRef.current?.zoomBy(1 / 1.35)
      else if (e.key === '0') ttRef.current?.reset()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  // the dial and the readouts follow every frame without re-rendering anything
  const onFrame = useCallback((theta, zoom) => {
    dialRef.current?.setAttribute('transform', `rotate(${(-theta).toFixed(2)})`)
    // the room's light drifts a little as the piece turns, as it would round a real object
    rootRef.current?.style.setProperty('--tt-x', Math.sin((theta * Math.PI) / 180).toFixed(3))
    const name = facingName(theta)
    if (nameRef.current && name !== lastName.current) {
      lastName.current = name
      nameRef.current.textContent = name
    }
    if (zoomRef.current) zoomRef.current.textContent = `${Math.round(zoom * 100)}%`
  }, [])

  const showing = detail !== null ? extra[detail] : null
  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${product.name} — a closer look`}
      aria-hidden={!open}
      inert={!open || undefined}
      className="fixed inset-0 z-[45]"
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
      {/* a liquid-glass floor line the piece turns above */}
      <div
        data-cl-back
        className="pointer-events-none absolute left-1/2 top-[calc(100%_-_236px_-_env(safe-area-inset-bottom))] h-px w-[min(70vw,640px)] -translate-x-1/2 lg:top-[calc(100%_-_118px_-_env(safe-area-inset-bottom))]"
        style={{ background: 'linear-gradient(90deg, transparent, rgb(var(--sr-glass) / 0.22), rgb(var(--sr-neon) / 0.6), rgb(var(--sr-glass) / 0.22), transparent)' }}
      />

      {/* the piece */}
      <div ref={frameRef} className="absolute inset-x-3 bottom-[calc(232px+env(safe-area-inset-bottom))] top-[118px] lg:inset-x-[15vw] lg:bottom-[calc(122px+env(safe-area-inset-bottom))] lg:top-[84px]">
        {armed && front && (
          <div className="absolute inset-0 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ opacity: showing ? 0 : 1, transform: showing ? 'scale(0.96)' : 'none', pointerEvents: showing ? 'none' : 'auto' }}>
            <Turntable
              key={product.id}
              ref={ttRef}
              views={views}
              fallbackSrc={front.src}
              onFrame={onFrame}
              onInteract={() => setMoved(true)}
            />
          </div>
        )}
        {/* a close photograph, on its own */}
        {extra.map((d, i) => (
          <div
            key={product.id + d.id}
            className="pointer-events-none absolute inset-0 flex items-center justify-center transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ opacity: detail === i ? 1 : 0, transform: detail === i ? 'none' : 'scale(1.03)' }}
          >
            {armed && (
              <img
                src={d.src}
                alt={detail === i ? `${product.name} — ${d.label}` : ''}
                draggable="false"
                decoding="async"
                className="max-h-[min(100%,560px)] max-w-full select-none object-contain"
                style={{ boxShadow: '0 30px 60px -24px rgb(0 0 0 / 0.8), 0 0 0 1px rgb(var(--sr-glass) / 0.14)' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* top: what this is, and the way back */}
      <div className="absolute inset-x-0 top-0 flex h-[64px] items-center justify-between pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] lg:h-[84px] lg:pl-[max(3rem,env(safe-area-inset-left))] lg:pr-[max(3rem,env(safe-area-inset-right))]">
        <div data-cl-chrome className="flex min-w-0 items-center gap-4">
          <span className="text-[9px] font-medium uppercase tracking-[0.38em]" style={{ color: 'rgb(var(--sr-neon))' }}>
            Look closer
          </span>
          <span className="hidden h-px w-10 sm:block" style={{ background: ink(0.3) }} />
          <span className="hidden truncate text-[10px] uppercase tracking-[0.26em] sm:block" style={{ color: ink(0.75) }}>
            {product.name} — {product.code}
          </span>
        </div>
        <div data-cl-chrome>
          <button
            ref={closeBtnRef}
            onClick={close}
            aria-label="Close the closer look"
            className="group flex items-center gap-3 text-[10px] uppercase tracking-[0.3em]"
            style={{ color: ink(0.7) }}
          >
            <span className="hidden transition-colors duration-300 group-hover:text-[rgb(var(--sr-ink))] sm:inline">Close</span>
            <span
              className="grid h-10 w-10 place-items-center rounded-full backdrop-blur-[2px] transition-[transform,border-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-90 group-hover:border-[rgb(var(--sr-ink)/0.6)]"
              style={{ border: `1px solid ${ink(0.25)}`, color: 'rgb(var(--sr-ink))', background: 'rgb(var(--sr-glass) / 0.04)' }}
            >
              <svg viewBox="0 0 16 16" className="h-3 w-3"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
            </span>
          </button>
        </div>
      </div>

      {/* the close photographs: the whole piece first, then each detail */}
      {extra.length > 0 && (
        <div className="absolute inset-x-0 top-[64px] flex justify-center px-5 lg:inset-x-auto lg:left-12 lg:top-1/2 lg:block lg:-translate-y-1/2 lg:px-0">
          <div data-cl-chrome className="flex items-center gap-2 lg:flex-col lg:items-start lg:gap-3">
            <p className="mb-1 hidden text-[9px] uppercase tracking-[0.34em] lg:block" style={{ color: ink(0.42) }}>Close up</p>
            {[{ id: 'whole', label: canTurn ? 'The piece' : 'Front', src: front?.src, garment: true }, ...extra].map((d, i) => {
              const idx = i - 1
              const on = idx === -1 ? detail === null : detail === idx
              return (
                <button
                  key={d.id}
                  onClick={() => setDetail(idx === -1 ? null : idx)}
                  aria-pressed={on}
                  aria-label={idx === -1 ? `Show the ${canTurn ? 'whole piece' : 'front'}` : `Show the ${d.label.toLowerCase()}`}
                  className="group flex items-center gap-3"
                >
                  <span
                    className="relative block h-[42px] w-[42px] overflow-hidden rounded-full transition-[transform,box-shadow,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06] lg:h-[46px] lg:w-[46px]"
                    style={{
                      opacity: on ? 1 : 0.5,
                      background: 'rgb(var(--sr-bg1))',
                      boxShadow: on ? '0 0 0 1px rgb(var(--sr-neon) / 0.9), 0 0 16px rgb(var(--sr-neon) / 0.35)' : `0 0 0 1px ${ink(0.18)}`,
                    }}
                  >
                    <img src={d.src} alt="" draggable="false" loading="lazy" className={`absolute inset-0 h-full w-full ${d.garment ? 'object-contain p-1.5' : 'object-cover'}`} style={d.focus ? { objectPosition: d.focus } : undefined} />
                  </span>
                  <span className="hidden text-[9.5px] uppercase tracking-[0.28em] transition-colors duration-500 lg:inline" style={{ color: on ? ink(0.9) : ink(0.42) }}>
                    {d.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* bottom: which way it faces, how to turn it, how close you are */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[calc(150px+env(safe-area-inset-bottom))] flex justify-center lg:bottom-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div data-cl-chrome className="flex flex-col items-center gap-2 transition-opacity duration-500" style={{ opacity: showing ? 0.25 : 1 }}>
          <div className="flex items-center gap-4">
            {canTurn && <Dial views={views} dialRef={dialRef} />}
            <div className="min-w-[9.5rem]">
              <p ref={nameRef} className="text-[10px] font-medium uppercase tracking-[0.32em]" style={{ color: ink(0.9) }}>
                {canTurn ? 'Front' : 'Front view'}
              </p>
              {/* the hint is there until the hand has understood it, then it goes */}
              <p
                className="mt-1.5 text-[9px] uppercase tracking-[0.3em] transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                style={{ color: ink(0.42), opacity: moved ? 0 : 1, transform: moved ? 'translateY(4px)' : 'none' }}
                aria-hidden={moved}
              >
                {canTurn ? 'Drag to rotate' : 'Scroll to zoom'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* zoom, for a hand without a wheel or a pinch */}
      <div className="absolute bottom-[calc(2rem+env(safe-area-inset-bottom))] left-[max(3rem,env(safe-area-inset-left))] hidden lg:block">
        <div data-cl-chrome className="flex items-center gap-1 rounded-full px-1.5 py-1 backdrop-blur-[3px]" style={{ border: `1px solid ${ink(0.14)}`, background: 'rgb(var(--sr-glass) / 0.035)' }}>
          {[['−', 1 / 1.35, 'Zoom out'], [null], ['+', 1.35, 'Zoom in']].map(([sym, f, label], i) =>
            sym ? (
              <button
                key={i}
                onClick={() => ttRef.current?.zoomBy(f)}
                aria-label={label}
                className="grid h-8 w-8 place-items-center rounded-full text-[13px] transition-colors duration-300 hover:bg-[rgb(var(--sr-ink)/0.08)]"
                style={{ color: ink(0.85) }}
              >
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

      {/* the piece's price, sizes and favourite, within reach while it is examined */}
      <div className="absolute inset-x-0 bottom-[calc(1.25rem+env(safe-area-inset-bottom))] flex justify-center px-4 lg:inset-x-auto lg:bottom-[calc(1.75rem+env(safe-area-inset-bottom))] lg:right-[max(3rem,env(safe-area-inset-right))] lg:px-0">
        <div data-cl-chrome>{purchase}</div>
      </div>
    </div>
  )
}
