import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import Roll from './Roll.jsx'
import FavoriteButton from './PixelHeart.jsx'

/**
 * Buying, where a thumb already is.
 *
 * On a phone the showroom gives its whole first screen to the piece, which is
 * right — and puts the price, the sizes and the way to order a scroll below
 * it, which is not: the one thing a visitor came to do sat out of reach. So on
 * a phone the purchase also lives in a bar along the bottom edge, the part of
 * the screen a thumb rests on.
 *
 * It steps aside whenever the purchase itself is on screen, so the two are
 * never shown at once, and whenever anything is opened over the room. It
 * clears the home indicator on phones that have one.
 *
 * The sizes open in a sheet from the same edge, at a size a finger can hit:
 * the inline beads are drawn for a mouse.
 */
const ink = (a = 1) => `rgb(var(--sr-ink) / ${a})`
const EASE = 'cubic-bezier(0.22,1,0.36,1)'
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ------------------------------------------------------------------ the sheet */

export function SizeSheet({ open, onClose, product, size, onSize, onOrder, onSizeGuide, returnFocusRef }) {
  const scrimRef = useRef(null)
  const sheetRef = useRef(null)
  const mounted = useRef(false)
  const drag = useRef(null)

  useLayoutEffect(() => {
    const scrim = scrimRef.current
    const sheet = sheetRef.current
    gsap.killTweensOf([scrim, sheet])
    if (open) {
      gsap.set(sheet, { visibility: 'visible' })
      gsap.to(scrim, { autoAlpha: 1, duration: 0.35, ease: 'power2.out' })
      gsap.fromTo(sheet, { yPercent: 100 }, { yPercent: 0, duration: reduced() ? 0 : 0.55, ease: 'expo.out' })
      gsap.fromTo(sheet.querySelectorAll('[data-sheet-in]'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.03, delay: 0.08 })
    } else if (mounted.current) {
      gsap.to(scrim, { autoAlpha: 0, duration: 0.3, ease: 'power2.in' })
      gsap.to(sheet, { yPercent: 100, duration: reduced() ? 0 : 0.38, ease: 'power3.in', onComplete: () => gsap.set(sheet, { visibility: 'hidden' }) })
    } else {
      gsap.set(scrim, { autoAlpha: 0 })
      gsap.set(sheet, { yPercent: 100, visibility: 'hidden' })
    }
    mounted.current = true
  }, [open])

  // the first size that can be chosen takes the focus; closing gives it back
  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => {
      sheetRef.current?.querySelector('[data-sheet-size]:not([disabled])')?.focus({ preventScroll: true })
    }, 60)
    const back = returnFocusRef?.current
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('keydown', onKey)
      back?.focus?.({ preventScroll: true })
    }
  }, [open, onClose, returnFocusRef])

  /* pulled down by its edge, it follows the finger and lets go past a third */
  const onDown = (e) => {
    drag.current = { y: e.clientY, t: performance.now(), h: sheetRef.current.offsetHeight }
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onMove = (e) => {
    const d = drag.current
    if (!d) return
    const dy = Math.max(0, e.clientY - d.y)
    gsap.set(sheetRef.current, { y: dy })
    gsap.set(scrimRef.current, { opacity: 1 - Math.min(1, dy / d.h) * 0.8 })
  }
  const onUp = (e) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    const dy = Math.max(0, e.clientY - d.y)
    const fast = dy / Math.max(1, performance.now() - d.t) > 0.6
    if (dy > d.h / 3 || (fast && dy > 24)) {
      gsap.set(sheetRef.current, { y: 0, yPercent: (dy / d.h) * 100 })
      onClose()
    } else {
      gsap.to(sheetRef.current, { y: 0, duration: 0.45, ease: 'expo.out' })
      gsap.to(scrimRef.current, { opacity: 1, duration: 0.3 })
    }
  }

  const sizes = product.sizes ?? []
  const chosen = sizes.find((s) => s.label === size)
  return (
    <div className={`fixed inset-0 z-[58] lg:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div ref={scrimRef} onClick={onClose} className="absolute inset-0" style={{ background: 'rgb(var(--sr-bg0) / 0.62)' }} />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Choose a size — ${product.name}`}
        className="absolute inset-x-0 bottom-0 max-h-[88svh] overflow-y-auto overscroll-contain"
        style={{
          background: 'linear-gradient(to bottom, rgb(var(--sr-bg1)), rgb(var(--sr-bg0)))',
          boxShadow: `0 -1px 0 ${ink(0.12)}, 0 -30px 60px -20px rgb(0 0 0 / 0.7)`,
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
        }}
      >
        {/* the edge you pull it down by */}
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="flex touch-none justify-center pb-2 pt-3"
        >
          <span aria-hidden="true" className="block h-[3px] w-10 rounded-full" style={{ background: ink(0.22) }} />
        </div>

        <div className="px-6 pt-3" style={{ paddingLeft: 'max(24px, env(safe-area-inset-left))', paddingRight: 'max(24px, env(safe-area-inset-right))' }}>
          <div data-sheet-in className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.32em]" style={{ color: ink(0.5) }}>Choose a size</p>
              <p className="mt-2 truncate font-display text-[1.35rem] uppercase leading-tight tracking-[0.1em]" style={{ color: ink() }}>
                {product.name}
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-1 grid h-11 w-11 shrink-0 place-items-center"
              style={{ color: ink(0.7) }}
            >
              <svg viewBox="0 0 16 16" className="h-[14px] w-[14px]" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
            </button>
          </div>

          <div data-sheet-in role="group" aria-label="Sizes" className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(58px,1fr))] gap-2.5">
            {sizes.map(({ label, available }) => {
              const on = size === label
              return (
                <button
                  key={label}
                  data-sheet-size
                  disabled={!available}
                  aria-pressed={available ? on : undefined}
                  aria-label={available ? `Size ${label}` : `Size ${label}, sold out`}
                  onClick={() => onSize(on ? null : label)}
                  className="relative grid h-14 place-items-center text-[13px] font-medium tracking-[0.1em] transition-[color,box-shadow,background] duration-300 active:scale-[0.97]"
                  style={{
                    transitionTimingFunction: EASE,
                    color: on ? 'rgb(255 255 255)' : available ? ink(0.85) : ink(0.24),
                    boxShadow: on
                      ? '0 0 0 1px rgb(var(--sr-accent) / 0.95), 0 0 22px rgb(var(--sr-accent) / 0.35), inset 0 0 14px rgb(var(--sr-accent) / 0.18)'
                      : `inset 0 0 0 1px ${available ? ink(0.18) : ink(0.06)}`,
                    background: on ? 'radial-gradient(circle at 34% 28%, rgb(255 255 255 / 0.18), rgb(var(--sr-accent) / 0.16) 60%, rgb(var(--sr-accent) / 0.06))' : 'transparent',
                  }}
                >
                  {label}
                  {!available && (
                    <>
                      <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-px w-[46%] -translate-x-1/2 -translate-y-1/2 -rotate-[24deg]" style={{ background: ink(0.24) }} />
                      <span aria-hidden="true" className="absolute inset-x-0 bottom-1.5 text-center text-[8.5px] uppercase tracking-[0.18em]" style={{ color: ink(0.3) }}>Sold out</span>
                    </>
                  )}
                </button>
              )
            })}
          </div>

          <div data-sheet-in className="mt-3 flex justify-end">
            <button
              onClick={onSizeGuide}
              className="-mr-2 flex h-11 items-center px-2 text-[10px] uppercase tracking-[0.28em] underline decoration-[rgb(var(--sr-ink)/0.3)] underline-offset-[6px]"
              style={{ color: ink(0.62) }}
            >
              Size guide
            </button>
          </div>

          <button
            data-sheet-in
            disabled={!chosen}
            onClick={() => onOrder(size)}
            className="mt-3 flex h-14 w-full items-center justify-between px-5 text-[11px] font-medium uppercase tracking-[0.28em] transition-[background,box-shadow,color,opacity] duration-500 disabled:cursor-not-allowed"
            style={{
              transitionTimingFunction: EASE,
              color: chosen ? 'rgb(var(--sr-bg0))' : ink(0.4),
              background: chosen ? 'rgb(var(--sr-ink))' : 'transparent',
              boxShadow: chosen ? '0 0 30px rgb(var(--sr-accent) / 0.28)' : `inset 0 0 0 1px ${ink(0.14)}`,
            }}
          >
            <span>{chosen ? `Order — size ${size}` : 'Choose a size above'}</span>
            <span className="tabular-nums tracking-[0.08em]">${product.price}</span>
          </button>
          <p data-sheet-in className="mt-3 text-center text-[10px] leading-[1.8]" style={{ color: ink(0.42) }}>
            Your order is sent by you, on WhatsApp or Instagram. Nothing is charged here.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ the bar */

export default function BuyBar({ product, size, dir, saved, onSave, onChoose, onOrder, watchRef, hidden, lit }) {
  const barRef = useRef(null)
  const chooseRef = useRef(null)
  // the purchase on the page is in view: the bar has nothing to add
  const [covered, setCovered] = useState(false)

  useEffect(() => {
    const el = watchRef?.current
    if (!el) return
    // in view means clear of the bar itself, not merely touching the bottom edge
    const io = new IntersectionObserver(([e]) => setCovered(e.isIntersecting), { rootMargin: '0px 0px -96px 0px', threshold: 0.6 })
    io.observe(el)
    return () => io.disconnect()
  }, [watchRef])

  const show = lit && !hidden && !covered
  useLayoutEffect(() => {
    gsap.to(barRef.current, {
      yPercent: show ? 0 : 110,
      autoAlpha: show ? 1 : 0,
      duration: reduced() ? 0 : show ? 0.6 : 0.4,
      ease: show ? 'expo.out' : 'power2.in',
      overwrite: 'auto',
    })
  }, [show])

  return (
    <div
      ref={barRef}
      className="fixed inset-x-0 bottom-0 z-[46] lg:hidden"
      // hidden until GSAP owns it; its offset is GSAP's alone (yPercent), so no
      // transform is set here for it to read back as a pixel offset
      style={{ visibility: 'hidden', opacity: 0 }}
      inert={!show || undefined}
    >
      <div className="buy-bar flex items-center gap-3">
        <FavoriteButton active={saved} onToggle={onSave} name={product.name} />
        <div className="min-w-0 flex-1" aria-label={`$${product.price}${product.was ? `, was $${product.was}` : ''}`}>
          {product.was ? (
            <span className="relative mr-2 inline-block text-[11px] tabular-nums tracking-[0.04em]" style={{ color: ink(0.45) }}>
              <Roll value={`$${product.was}`} dir={dir} duration={0.5} />
              <span aria-hidden="true" className="absolute inset-x-[-2px] top-1/2 h-px -rotate-[8deg]" style={{ background: ink(0.55) }} />
            </span>
          ) : null}
          <span className="text-[19px] font-medium tabular-nums leading-none tracking-[0.01em]" style={{ color: ink() }}>
            <Roll value={`$${product.price}`} dir={dir} duration={0.55} />
          </span>
        </div>
        <button
          ref={chooseRef}
          onClick={() => (size ? onOrder(size) : onChoose(chooseRef))}
          className="flex h-12 shrink-0 items-center gap-3 px-5 text-[10.5px] font-medium uppercase tracking-[0.26em] transition-[background,box-shadow,color] duration-500 active:scale-[0.98]"
          style={{
            transitionTimingFunction: EASE,
            color: size ? 'rgb(var(--sr-bg0))' : ink(),
            background: size ? 'rgb(var(--sr-ink))' : 'transparent',
            boxShadow: size ? '0 0 26px rgb(var(--sr-accent) / 0.3)' : `inset 0 0 0 1px ${ink(0.42)}`,
          }}
        >
          <Roll value={size ? `Order · ${size}` : 'Choose a size'} duration={0.45} />
          <svg viewBox="0 0 22 12" className="h-[10px] w-[18px]" aria-hidden="true">
            <path d="M1 6h19M15 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
