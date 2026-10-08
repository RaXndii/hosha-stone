import { useCallback, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import Plate from '../ui/Plate.jsx'
import { sound } from '../../lib/sound/index.js'

/**
 * The piece, opened.
 *
 * Its front photograph is laid exactly where the turning piece stood, and its
 * zip has a pull. Drag the pull down and the jacket parts from the collar: the
 * photograph of it laid open shows through an opening that follows the pull
 * and widens behind it, edged in shadow like cloth falling back. Let go past a
 * third of the way and it opens the rest by itself; short of that, it closes
 * again. Open, the details inside are marked; drag the pull back up (or press
 * it) and it closes, and the piece turns again.
 *
 * The teeth tick as the pull passes them — slowly, a tick at a time; quickly,
 * a purr — and it settles with a click at either end.
 *
 * front    the front photograph (the same one the turning piece shows)
 * inside   { src, at: [x0, y0, x1, y1] where the open photograph falls over
 *            the front (fractions of it), zip: { x, top, bottom } (fractions
 *            of the front), spots: [{ id, at (fractions of the open
 *            photograph), label, note }] }
 * measure  () → { x, y, w, h }: where the front stands on the stage, in px
 * grab     { id, y } of a press already under way on the pull, or null
 * auto     open at once (asked for from the keyboard)
 * onState  (open) — fully open, or no longer
 * onClosed () — closed again: the piece goes back to turning
 * onPick   (spot) — a detail inside was chosen
 * ref → { open(), close() }
 */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Unzip({ front, inside, measure, grab, auto, onState, onClosed, onPick, ref }) {
  const boxRef = useRef(null)
  const wrapRef = useRef(null)
  const closedRef = useRef(null)
  const pullRef = useRef(null)
  const edgeRef = useRef(null)
  const cbs = useRef({ onState, onClosed })
  useEffect(() => { cbs.current = { onState, onClosed } })
  const s = useRef({ p: 0, target: auto ? 1 : 0, raf: 0, drag: null, tickAt: 0, tickP: 0, open: false, h: 1 })
  const [rect, setRect] = useState(null)
  const [open, setOpen] = useState(false)
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')

  const [ax0, ay0, ax1, ay1] = inside.at
  const { x: zx, top: zt, bottom: zb } = inside.zip
  const toWrap = (x, y) => `${(((x - ax0) / (ax1 - ax0)) * 100).toFixed(2)}% ${(((y - ay0) / (ay1 - ay0)) * 100).toFixed(2)}%`

  /* ---------------------------------------------------- where the front stands */
  useLayoutEffect(() => {
    const stage = boxRef.current?.parentElement
    if (!stage) return
    const m = () => { const r = measure(); if (r && r.w > 0) { setRect(r); s.current.h = r.h } }
    m()
    // the piece re-fits itself on a resize; read it once it has
    const ro = new ResizeObserver(() => requestAnimationFrame(() => requestAnimationFrame(m)))
    ro.observe(stage)
    return () => ro.disconnect()
  }, [measure])

  /* ---------------------------------------------------- one frame of the opening */
  const paint = useCallback(() => {
    const { p } = s.current
    const py = zt + p * (zb - zt)
    const e = Math.pow(p, 0.85)
    const spread = 0.025 + 0.78 * e
    const top = -0.08
    // each side of the opening bows outward, the way cloth falls back from a zip
    const side = (dir) => [0, 0.3, 0.6, 1].map((t) => [zx + dir * spread * Math.pow(t, 0.7), py + (top - py) * t])
    const left = side(-1), right = side(1)
    const pts = [[zx, py], ...left.slice(1), ...right.slice(1).reverse()]
    if (wrapRef.current) {
      wrapRef.current.style.clipPath = p >= 0.999 ? 'none' : p <= 0.001 ? 'polygon(0 0, 0 0, 0 0)' : `polygon(${pts.map(([x, y]) => toWrap(x, y)).join(', ')})`
      wrapRef.current.style.transform = `scale(${(0.985 + 0.015 * p).toFixed(4)})`
    }
    if (closedRef.current) closedRef.current.style.opacity = String(clamp(1 - (p - 0.78) / 0.22, 0, 1))
    // the opening's two edges, in shadow, fading as the jacket lies fully open
    const line = (pts2) => pts2.map(([x, y]) => `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`).join(' ')
    if (edgeRef.current) {
      edgeRef.current.setAttribute('points', line([...left].reverse().concat([[zx, py]], right)))
      edgeRef.current.style.opacity = String(p <= 0.001 ? 0 : clamp((1 - p) * 3, 0, 1))
    }
    if (pullRef.current) {
      pullRef.current.style.top = `${(py * 100).toFixed(3)}%`
      pullRef.current.setAttribute('aria-valuenow', String(Math.round(p * 100)))
    }
  }, [zx, zt, zb, ax0, ay0, ax1, ay1]) // eslint-disable-line react-hooks/exhaustive-deps

  /** the teeth, as the pull passes them */
  const teeth = () => {
    const st = s.current
    const px = Math.abs(st.p - st.tickP) * (zb - zt) * st.h
    if (px < 7) return
    const now = performance.now()
    st.tickP = st.p
    if (now - st.tickAt < 16) return
    st.tickAt = now
    sound.play('zip', { strength: clamp(px / 14, 0.6, 1.3) })
  }

  const settle = () => {
    const st = s.current
    if (st.p >= 0.999 && !st.open) { st.open = true; setOpen(true); sound.play('detent'); cbs.current.onState?.(true) }
    if (st.p < 0.98 && st.open) { st.open = false; setOpen(false); cbs.current.onState?.(false) }
    if (st.p <= 0.001 && st.target === 0 && !st.drag) { sound.play('detent'); cbs.current.onClosed?.() }
  }

  const run = useCallback(() => {
    const st = s.current
    if (st.raf) return
    const tick = () => {
      st.raf = 0
      if (st.drag) return
      const d = st.target - st.p
      if (Math.abs(d) < 0.002 || reduced()) st.p = st.target
      else st.p += d * 0.16 + Math.sign(d) * 0.004
      st.p = clamp(st.p, 0, 1)
      paint()
      teeth()
      settle()
      if (st.p !== st.target) st.raf = requestAnimationFrame(tick)
    }
    st.raf = requestAnimationFrame(tick)
  }, [paint]) // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = useCallback((t) => { s.current.target = t; run() }, [run])
  useImperativeHandle(ref, () => ({ open: () => goTo(1), close: () => goTo(0) }), [goTo])
  useEffect(() => () => cancelAnimationFrame(s.current.raf), [])
  useLayoutEffect(() => { paint(); if (s.current.target !== s.current.p) run() }, [rect, paint, run])

  /* ---------------------------------------------------- the hand on the pull */
  const begin = useCallback((id, y) => {
    const st = s.current
    st.drag = { id, y0: y, p0: st.p, moved: false, last: y, v: 0, t: performance.now() }
    const move = (e) => {
      if (e.pointerId !== id || !st.drag) return
      const dy = e.clientY - st.drag.y0
      if (Math.abs(dy) > 4) st.drag.moved = true
      const now = performance.now()
      st.drag.v = (e.clientY - st.drag.last) / Math.max(1, now - st.drag.t)
      st.drag.last = e.clientY; st.drag.t = now
      st.p = clamp(st.drag.p0 + dy / ((zb - zt) * st.h), 0, 1)
      paint(); teeth(); settle()
    }
    const up = (e) => {
      if (e.pointerId !== id || !st.drag) return
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      const { moved, p0, v } = st.drag
      st.drag = null
      if (!moved) st.target = p0 > 0.5 ? 0 : 1 // a press, not a drag: open, or close
      else if (Math.abs(v) > 0.6) st.target = v > 0 ? 1 : 0 // a flick
      else st.target = p0 > 0.5 ? (st.p < 0.7 ? 0 : 1) : (st.p > 0.3 ? 1 : 0)
      run()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }, [paint, run, zb, zt]) // eslint-disable-line react-hooks/exhaustive-deps

  // a press that began on the piece's own pull carries on here
  useEffect(() => { if (grab) begin(grab.id, grab.y) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onKey = (e) => {
    const st = s.current
    const step = (d) => { e.preventDefault(); e.stopPropagation(); goTo(clamp(Math.round((st.target + d) * 10) / 10, 0, 1)) }
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') step(0.1)
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') step(-0.1)
    else if (e.key === 'Home') step(-1)
    else if (e.key === 'End') step(1)
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(st.target > 0.5 ? 0 : 1) }
  }

  const ink = (a = 1) => `rgb(var(--sr-ink) / ${a})`
  return (
    <div
      ref={boxRef}
      className="absolute"
      style={rect ? { left: rect.x, top: rect.y, width: rect.w, height: rect.h } : { visibility: 'hidden' }}
    >
      {/* the jacket as it was, closed: the opening is cut through it */}
      <img ref={closedRef} src={front} alt="" draggable="false" className="pointer-events-none absolute inset-0 h-full w-full select-none" />
      {/* the inside, laid where it falls, seen through the opening */}
      <div
        ref={wrapRef}
        className="absolute"
        style={{ left: `${ax0 * 100}%`, top: `${ay0 * 100}%`, width: `${(ax1 - ax0) * 100}%`, height: `${(ay1 - ay0) * 100}%`, transformOrigin: `${(((zx - ax0) / (ax1 - ax0)) * 100).toFixed(1)}% 0%`, clipPath: 'polygon(0 0, 0 0, 0 0)' }}
      >
        <img src={inside.src} alt="The jacket laid open: its inside" draggable="false" className="absolute inset-0 h-full w-full select-none" />
        {/* the details inside, once it lies open */}
        {inside.spots.map((sp, k) => (
          <button
            key={sp.id}
            data-sound="none"
            onClick={() => { sound.play('bead', { index: k, count: inside.spots.length }); onPick?.(sp) }}
            aria-label={`${sp.label}${sp.note ? `: ${sp.note}` : ''}`}
            tabIndex={open ? 0 : -1}
            className="spot group/spot absolute -ml-[22px] -mt-[22px] grid h-11 w-11 place-items-center transition-opacity duration-500"
            style={{ left: `${sp.at[0] * 100}%`, top: `${sp.at[1] * 100}%`, opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transitionDelay: open ? `${180 + k * 90}ms` : '0ms', '--i': k }}
          >
            <span aria-hidden="true" className="spot-ring absolute h-[10px] w-[10px]" style={{ border: '1px solid rgb(var(--sr-neon) / 0.9)' }} />
            <span aria-hidden="true" className="relative block h-[8.5px] w-[8.5px] rotate-45 transition-transform duration-300 group-hover/spot:scale-125 group-focus-visible/spot:scale-125" style={{ background: ink(), boxShadow: '0 0 0 1px rgb(var(--sr-neon)), 0 0 12px rgb(var(--sr-neon) / 0.9)' }} />
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

      <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <filter id={`${uid}-soft`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.9" /></filter>
          {/* only where there is cloth: the jacket's own outline */}
          <mask id={`${uid}-cloth`} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100" style={{ maskType: 'alpha' }}>
            <image href={front} x="0" y="0" width="100" height="100" preserveAspectRatio="none" />
          </mask>
        </defs>
        {/* the shadow the parted cloth throws along the opening */}
        <g mask={`url(#${uid}-cloth)`}>
          <polyline ref={edgeRef} points="" fill="none" stroke="rgb(0 0 0 / 0.7)" strokeWidth="5" vectorEffect="non-scaling-stroke" filter={`url(#${uid}-soft)`} style={{ opacity: 0 }} />
        </g>
      </svg>

      {/* the pull */}
      <div ref={pullRef} className="absolute z-[2] -ml-[22px] -mt-[22px]" style={{ left: `${zx * 100}%`, top: `${zt * 100}%` }}>
        <button
          role="slider"
          aria-label="The zip — drag down to open the jacket, up to close it"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          aria-valuetext={open ? 'Open' : 'Closed'}
          data-sound="none"
          onPointerDown={(e) => { e.preventDefault(); begin(e.pointerId, e.clientY) }}
          onKeyDown={onKey}
          className="group/pull relative grid h-11 w-11 cursor-grab touch-none place-items-center active:cursor-grabbing"
        >
          <span aria-hidden="true" className="spot-ring absolute h-[12px] w-[12px]" style={{ border: '1px solid rgb(var(--sr-neon) / 0.9)', opacity: open ? 0 : undefined }} />
          {/* a zip's slider, cut like the rest of the house */}
          <span aria-hidden="true" className="relative block h-[22px] w-[13px] transition-transform duration-300 group-hover/pull:scale-110 group-focus-visible/pull:scale-110" style={{ filter: 'drop-shadow(0 0 7px rgb(var(--sr-neon) / 0.85))' }}>
            <span className="facet absolute inset-0 block" style={{ '--cut': '4px', background: 'linear-gradient(180deg, rgb(var(--sr-ink)), rgb(var(--sr-glass) / 0.85))' }} />
            <span className="absolute left-1/2 top-[6px] block h-[9px] w-[3px] -translate-x-1/2" style={{ background: 'rgb(var(--sr-bg0) / 0.8)' }} />
          </span>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-[38px] top-1/2 isolate hidden -translate-y-1/2 items-center gap-2 whitespace-nowrap py-[6px] pl-3 pr-2.5 text-[9px] font-medium uppercase tracking-[0.28em] lg:flex"
            style={{ color: ink() }}
          >
            <Plate cut={6} fill="rgb(var(--sr-bg0) / 0.82)" edge="rgb(var(--sr-neon) / 0.55)" />
            {open ? 'Close' : 'Open'}
            <svg viewBox="0 0 10 10" className="h-2 w-2" style={{ transform: open ? 'rotate(180deg)' : 'none' }}><path d="M5 1.5v7M2 5.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.1" /></svg>
          </span>
        </button>
      </div>
    </div>
  )
}
