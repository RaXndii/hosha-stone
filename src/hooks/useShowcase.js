import { useEffect, useRef } from 'react'

const clamp = (v, min, max) => (v < min ? min : v > max ? max : v)

/**
 * The pointer only becomes part of the scene inside the case. Elsewhere the
 * page keeps the ordinary cursor; over the garment a small "Look" ring takes
 * its place and the piece answers with a few pixels of depth — the contents
 * drift against the pointer, as if the eye were moving, not the garment.
 *
 * Everything is eased in one rAF loop that runs only while something is
 * moving: it wakes on entry and puts itself back to sleep once the ring has
 * gone and the piece has settled at rest.
 *
 * zoneRef      the case — the only place the interaction exists
 * cursorRef    the ring (fixed, pointer-events none)
 * parallaxRef  the garment's wrapper inside the case
 * enabled      false while something covers the case (the closer look)
 *
 * Elements marked data-native-cursor inside the zone (a control on the case)
 * get the ordinary pointer back.
 */
export default function useShowcase({ zoneRef, cursorRef, parallaxRef, enabled = true }) {
  const enabledRef = useRef(enabled)
  const wakeRef = useRef(() => {})

  // coming back (the closer look folding away) the ring waits for the scene
  // to settle before it reappears under a pointer that never moved
  const holdUntil = useRef(0)
  useEffect(() => {
    if (enabled && !enabledRef.current) holdUntil.current = performance.now() + 1100
    enabledRef.current = enabled
    wakeRef.current()
  }, [enabled])

  useEffect(() => {
    const zone = zoneRef.current
    const cursor = cursorRef.current
    if (!zone) return
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    if (!fine) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ring = cursor?.firstElementChild

    const s = { inside: false, native: false, mx: 0, my: 0, tx: 0, ty: 0, x: 0, y: 0, px: 0, py: 0, h: 0 }
    let raf = 0

    const read = (e) => {
      s.mx = e.clientX
      s.my = e.clientY
      s.native = !!e.target.closest?.('[data-native-cursor]')
      const r = zone.getBoundingClientRect()
      if (!r.width || !r.height) return
      s.tx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1)
      s.ty = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1)
    }

    const tick = () => {
      const held = performance.now() < holdUntil.current
      const active = s.inside && !s.native && enabledRef.current && !held
      const tx = active && !reduced ? s.tx : 0
      const ty = active && !reduced ? s.ty : 0
      // slow for the piece, quicker for the ring: the hand leads, the scene follows
      s.px += (tx - s.px) * 0.055
      s.py += (ty - s.py) * 0.055
      s.h += ((active ? 1 : 0) - s.h) * 0.14
      s.x += (s.mx - s.x) * (reduced ? 1 : 0.24)
      s.y += (s.my - s.y) * (reduced ? 1 : 0.24)

      const p = parallaxRef?.current
      if (p) p.style.transform = `translate3d(${(-s.px * 7).toFixed(2)}px, ${(-s.py * 5).toFixed(2)}px, 0)`
      if (cursor) {
        cursor.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`
        cursor.style.opacity = s.h.toFixed(3)
        if (ring) ring.style.transform = `translate(-50%, -50%) scale(${(0.45 + s.h * 0.55).toFixed(3)})`
      }

      const settled = !active && !(held && s.inside) && Math.abs(s.px) < 0.002 && Math.abs(s.py) < 0.002 && s.h < 0.004
      if (settled) {
        if (p) p.style.transform = ''
        if (cursor) cursor.style.opacity = '0'
        raf = 0
        return
      }
      raf = requestAnimationFrame(tick)
    }
    const wake = () => { if (!raf) raf = requestAnimationFrame(tick) }
    wakeRef.current = wake

    const onEnter = (e) => {
      if (e.pointerType !== 'mouse') return
      read(e)
      // the ring is born where the pointer is, not dragged across from where it last was
      if (s.h < 0.02) { s.x = s.mx; s.y = s.my }
      s.inside = true
      wake()
    }
    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return
      read(e)
      s.inside = true
      wake()
    }
    const onLeave = () => { s.inside = false; wake() }

    zone.addEventListener('pointerenter', onEnter)
    zone.addEventListener('pointermove', onMove, { passive: true })
    zone.addEventListener('pointerleave', onLeave)
    return () => {
      cancelAnimationFrame(raf)
      wakeRef.current = () => {}
      zone.removeEventListener('pointerenter', onEnter)
      zone.removeEventListener('pointermove', onMove)
      zone.removeEventListener('pointerleave', onLeave)
    }
  }, [zoneRef, cursorRef, parallaxRef])
}
