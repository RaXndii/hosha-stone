import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { sound } from '../../lib/sound/index.js'

/**
 * A piece shown as it was photographed, front and back, that turns over
 * rather than spinning.
 *
 * Choosing the back (or a sideways swipe, or an arrow key) lifts the piece a
 * little and turns it over in depth, like a jacket turned on a table: a
 * sheen crosses the cloth and it darkens as it goes edge-on, its shadow on the
 * floor narrowing and widening again, and it settles on its real back. No
 * angle in between is ever stood still at — nothing is shown that was not
 * photographed. Scroll, pinch or double-tap go close; drag to move about.
 *
 * It answers the closer look exactly as the turntable does (same ref and
 * onFrame), so the marks, the zip's pull and the zoom work unchanged.
 *
 * views   [{ angle: 0 | 180, turn }] — the front and the back
 * ref → { turnTo(angle), step(d), zoomBy(f), reset(), unzoom(), project(u, v, live), focusOn(u, v, z) }
 */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const DUR = 950

export default function Flip({ views, fallbackSrc, ref, onFrame, onInteract }) {
  const front = views.find((v) => v.angle === 0) ?? views[0]
  const back = views.find((v) => v.angle === 180)
  const wrapRef = useRef(null)
  const zoomRef = useRef(null)
  const cardRef = useRef(null)
  const shadowRef = useRef(null)
  const shadeRefs = useRef([])
  const sheenRefs = useRef([])
  const cbs = useRef({ onFrame, onInteract })
  useEffect(() => { cbs.current = { onFrame, onInteract } })
  const s = useRef({
    theta: 0, from: 0, to: 0, t0: 0, flipping: false,
    z: 1, zT: 1, pan: [0, 0], pT: [0, 0],
    W: 1, H: 1, box: { x: 0, y: 0, w: 1, h: 1 }, nat: [0, 0], raf: 0, dragging: false, interacted: false,
  })
  const [box, setBox] = useState(null)

  /* ---------------------------------------------------- the fit */
  const fit = () => {
    const st = s.current
    const el = wrapRef.current
    if (!el || !st.nat[0]) return
    st.W = el.clientWidth; st.H = el.clientHeight
    const a = st.nat[0] / st.nat[1]
    const h = Math.min(st.H * 0.88, (st.W * 0.9) / a)
    const w = h * a
    st.box = { x: (st.W - w) / 2, y: (st.H - h) / 2, w, h }
    setBox({ ...st.box })
    paint()
  }
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const maxZoom = () => { const st = s.current; return clamp((st.nat[1] * 0.9) / Math.max(1, st.box.h), 1.6, 3.2) }
  const clampPan = ([x, y], z) => {
    const st = s.current
    const mx = Math.max(0, (st.box.w * z - st.W) / 2 + 40)
    const my = Math.max(0, (st.box.h * z - st.H) / 2 + 40)
    return [clamp(x, -mx, mx), clamp(y, -my, my)]
  }

  /* ---------------------------------------------------- one frame */
  function paint() {
    const st = s.current
    const th = (st.theta * Math.PI) / 180
    const c = Math.cos(th)
    const prog = st.flipping ? (performance.now() - st.t0) / DUR : 1
    const lift = st.flipping ? Math.sin(clamp(prog, 0, 1) * Math.PI) : 0
    if (zoomRef.current) zoomRef.current.style.transform = `translate3d(${st.pan[0].toFixed(2)}px, ${st.pan[1].toFixed(2)}px, 0) scale(${st.z.toFixed(4)})`
    if (cardRef.current) cardRef.current.style.transform = `perspective(1900px) translate3d(0, ${(-lift * 18).toFixed(2)}px, ${(lift * 60).toFixed(2)}px) rotateY(${st.theta.toFixed(2)}deg) scale(${(1 + lift * 0.035).toFixed(4)})`
    // edge-on, the cloth falls into shade; a sheen crosses it as it turns
    shadeRefs.current.forEach((el) => { if (el) el.style.opacity = ((1 - Math.abs(c)) * 0.55).toFixed(3) })
    sheenRefs.current.forEach((el) => {
      if (!el) return
      el.style.opacity = (lift * 0.9).toFixed(3)
      el.style.backgroundPosition = `${(-60 + clamp(prog, 0, 1) * 220).toFixed(1)}% 0`
    })
    if (shadowRef.current) shadowRef.current.style.transform = `translateX(-50%) scaleX(${(0.35 + 0.65 * Math.abs(c)).toFixed(3)})`
    if (shadowRef.current) shadowRef.current.style.opacity = (0.85 - lift * 0.35).toFixed(3)
    // while it turns over, the marks on it step aside, as they do while a hand moves it
    cbs.current.onFrame?.(((st.theta % 360) + 360) % 360, st.z, st.dragging || st.flipping, st.zT)
  }

  const kick = () => {
    const st = s.current
    if (st.raf) return
    const tick = () => {
      st.raf = 0
      let moving = false
      if (st.flipping) {
        const k = clamp((performance.now() - st.t0) / DUR, 0, 1)
        st.theta = st.from + (st.to - st.from) * ease(k)
        if (k >= 1) { st.flipping = false; st.theta = st.to % 360 } else moving = true
      }
      const dz = st.zT - st.z
      if (Math.abs(dz) > 0.0005) { st.z += dz * 0.2; moving = true } else st.z = st.zT
      for (const i of [0, 1]) {
        const d = st.pT[i] - st.pan[i]
        if (Math.abs(d) > 0.1) { st.pan[i] += d * 0.2; moving = true } else st.pan[i] = st.pT[i]
      }
      paint()
      if (moving) st.raf = requestAnimationFrame(tick)
    }
    st.raf = requestAnimationFrame(tick)
  }
  useEffect(() => () => cancelAnimationFrame(s.current.raf), [])

  const turnTo = (angle) => {
    const st = s.current
    if (!back) return
    const target = angle % 360 === 180 ? 180 : 0
    const now = ((st.theta % 360) + 360) % 360
    if (!st.flipping && Math.abs(now - target) < 0.5) return
    // always the short way round, and onward rather than back the way it came
    st.from = st.theta
    st.to = target === 180 ? 180 : now > 0 ? 360 : 0
    if (st.to === st.from) return
    st.t0 = performance.now()
    st.flipping = true
    st.zT = 1; st.pT = [0, 0]
    sound.play('swipe', { dir: target === 180 ? 1 : -1 })
    if (!st.interacted) { st.interacted = true; cbs.current.onInteract?.() }
    kick()
  }
  const facingBack = () => { const t = ((s.current.to % 360) + 360) % 360; return s.current.flipping ? t === 180 : Math.abs((((s.current.theta % 360) + 360) % 360) - 180) < 90 }

  const zoomAt = (z, px, py) => {
    const st = s.current
    const z1 = clamp(z, 1, maxZoom())
    const cx = px - st.W / 2, cy = py - st.H / 2
    const k = z1 / st.zT
    st.pT = z1 <= 1.001 ? [0, 0] : clampPan([cx - (cx - st.pT[0]) * k, cy - (cy - st.pT[1]) * k], z1)
    st.zT = z1
    kick()
  }

  useImperativeHandle(ref, () => ({
    turnTo,
    rotateTo: turnTo,
    step: () => turnTo(facingBack() ? 0 : 180),
    zoomBy: (f) => zoomAt(s.current.zT * f, s.current.W / 2, s.current.H / 2),
    reset: () => { const st = s.current; st.zT = 1; st.pT = [0, 0]; if (facingBack()) turnTo(0); kick() },
    unzoom: () => { const st = s.current; st.zT = 1; st.pT = [0, 0]; kick() },
    project: (u, v, live = true) => {
      const st = s.current
      const th = ((live ? st.theta : 0) * Math.PI) / 180
      const z = live ? st.z : st.zT
      const pan = live ? st.pan : st.pT
      const { x, y, w, h } = st.box
      const lx = x + w / 2 + (u - 0.5) * w * Math.cos(th)
      const ly = y + v * h
      return { x: st.W / 2 + (lx - st.W / 2) * z + pan[0], y: st.H / 2 + (ly - st.H / 2) * z + pan[1], facing: Math.cos(th), zoom: z }
    },
    focusOn: (u, v, z = 2.4) => {
      const st = s.current
      if (facingBack()) turnTo(0)
      const z1 = clamp(z, 1, maxZoom())
      const { x, y, w, h } = st.box
      const lx = x + u * w - st.W / 2, ly = y + v * h - st.H / 2
      st.zT = z1
      st.pT = clampPan([-lx * z1, -ly * z1], z1)
      kick()
    },
  }))

  /* ---------------------------------------------------- the hand */
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const pointers = new Map()
    let start = null, last = null, pinch = null, tapAt = 0
    const local = (e) => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
    const touched = () => { const st = s.current; if (!st.interacted) { st.interacted = true; cbs.current.onInteract?.() } }
    const down = (e) => {
      if (e.target.closest('button')) return
      el.setPointerCapture?.(e.pointerId)
      const p = local(e)
      pointers.set(e.pointerId, p)
      if (pointers.size === 1) { start = { p, t: performance.now() }; last = p }
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, z: s.current.zT }
        start = null
      }
    }
    const move = (e) => {
      if (!pointers.has(e.pointerId)) return
      const p = local(e)
      pointers.set(e.pointerId, p)
      const st = s.current
      if (pinch && pointers.size >= 2) {
        const [a, b] = [...pointers.values()]
        zoomAt(pinch.z * (Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        touched()
        return
      }
      if (!last) return
      if (st.zT > 1.02) {
        st.dragging = true
        st.pT = clampPan([st.pT[0] + p[0] - last[0], st.pT[1] + p[1] - last[1]], st.zT)
        st.pan = [...st.pT]
        paint()
        touched()
      }
      last = p
    }
    const up = (e) => {
      if (!pointers.has(e.pointerId)) return
      const p = local(e)
      pointers.delete(e.pointerId)
      if (pointers.size < 2) pinch = null
      if (pointers.size) return
      const st = s.current
      st.dragging = false
      if (start) {
        const dx = p[0] - start.p[0], dy = p[1] - start.p[1]
        const quick = performance.now() - start.t < 650
        // at arm's length, a sideways swipe turns it over: a quick flick, or any long sweep
        if (st.zT <= 1.02 && ((quick && Math.abs(dx) > 50) || Math.abs(dx) > 90) && Math.abs(dx) > Math.abs(dy) * 1.3) turnTo(facingBack() ? 0 : 180)
        else if (Math.hypot(dx, dy) < 10 && e.pointerType !== 'mouse') {
          const now = performance.now()
          if (now - tapAt < 320) { zoomAt(st.zT > 1.05 ? 1 : 2.2, p[0], p[1]); tapAt = 0; touched() } else tapAt = now
        }
      }
      start = null; last = null
      paint()
    }
    const wheel = (e) => {
      e.preventDefault()
      const p = local(e)
      zoomAt(s.current.zT * Math.exp(-e.deltaY * (e.deltaMode === 1 ? 16 : 1) * (e.ctrlKey ? 0.01 : 0.0016)), p[0], p[1])
      touched()
    }
    const dbl = (e) => { if (e.target.closest('button')) return; const p = local(e); zoomAt(s.current.zT > 1.05 ? 1 : 2.2, p[0], p[1]); touched() }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    el.addEventListener('dblclick', dbl)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
      el.removeEventListener('dblclick', dbl)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const srcOf = (v) => (v?.turn ? `${v.turn}@2.webp` : v?.src)
  const face = (v, i, flipped) => (
    <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: flipped ? 'rotateY(180deg)' : 'none' }}>
      <img
        src={srcOf(v) ?? fallbackSrc}
        alt=""
        draggable="false"
        onLoad={i === 0 ? (e) => { s.current.nat = [e.currentTarget.naturalWidth, e.currentTarget.naturalHeight]; fit() } : undefined}
        className="absolute inset-0 h-full w-full select-none object-contain"
      />
      {/* the cloth in shade as it goes edge-on, and the light crossing it */}
      <div ref={(el) => { shadeRefs.current[i] = el }} className="absolute inset-0" style={{ background: '#000', opacity: 0, WebkitMaskImage: `url(${srcOf(v)})`, maskImage: `url(${srcOf(v)})`, WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }} />
      <div ref={(el) => { sheenRefs.current[i] = el }} className="absolute inset-0" style={{ opacity: 0, background: 'linear-gradient(105deg, transparent 38%, rgb(255 255 255 / 0.16) 50%, transparent 62%)', backgroundSize: '220% 100%', mixBlendMode: 'screen', WebkitMaskImage: `url(${srcOf(v)})`, maskImage: `url(${srcOf(v)})`, WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }} />
    </div>
  )

  return (
    <div ref={wrapRef} className="absolute inset-0 touch-none select-none overflow-hidden" style={{ cursor: 'zoom-in' }}>
      <div ref={zoomRef} className="absolute inset-0 will-change-transform" style={{ transformOrigin: '50% 50%' }}>
        {/* its shadow on the floor */}
        {box && (
          <div
            ref={shadowRef}
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{ left: box.x + box.w / 2, top: box.y + box.h * 0.985, width: box.w * 0.82, height: Math.max(14, box.h * 0.05), transform: 'translateX(-50%)', background: 'radial-gradient(50% 50% at 50% 50%, rgb(0 0 0 / 0.55), transparent 72%)', filter: 'blur(6px)' }}
          />
        )}
        <div
          ref={cardRef}
          className="absolute"
          style={box ? { left: box.x, top: box.y, width: box.w, height: box.h, transformStyle: 'preserve-3d' } : { left: '6%', top: '6%', width: '88%', height: '88%', transformStyle: 'preserve-3d', opacity: 0 }}
        >
          {face(front, 0, false)}
          {back && face(back, 1, true)}
        </div>
      </div>
    </div>
  )
}
