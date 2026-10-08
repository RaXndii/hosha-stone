import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import Plate from '../ui/Plate.jsx'

/**
 * A close photograph you can go into.
 *
 * It sits as large as the stage allows, cut at the corners like everything in
 * the house. Pinch, scroll or double-tap to go close; drag to move across it;
 * double-tap again (or the zoom's minus) to come back. It never goes further
 * than the photograph can bear: four times its fitted size at the most, less
 * when the photograph itself is small. At its fitted size, a sideways swipe
 * asks for the next photograph instead.
 *
 * ref → { zoomBy(f), reset(), at(x, y, z) } — at() goes close on a point of
 *       the photograph (fractions across and down), for a detail marked there.
 */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

export default function Lens({ src, alt, ref, onZoom, onSwipe }) {
  const boxRef = useRef(null)
  const bodyRef = useRef(null)
  const [fit, setFit] = useState(null) // { w, h } of the photograph at its fitted size
  const [loaded, setLoaded] = useState(false)
  const s = useRef({ z: 1, x: 0, y: 0, tz: 1, tx: 0, ty: 0, raf: 0, nat: [0, 0], box: [1, 1] })
  const cbs = useRef({ onZoom, onSwipe })
  useEffect(() => { cbs.current = { onZoom, onSwipe } })

  // fitted size: the whole photograph inside the stage, with a little air
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const measure = () => {
      const [nw, nh] = s.current.nat
      const bw = box.clientWidth, bh = box.clientHeight
      s.current.box = [bw, bh]
      if (!nw || !nh || !bw || !bh) return
      const k = Math.min((bw * 0.96) / nw, (bh * 0.94) / nh)
      setFit({ w: Math.round(nw * k), h: Math.round(nh * k) })
    }
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    s.current.measure = measure
    return () => ro.disconnect()
  }, [])

  // (each photograph mounts its own lens — see the closer look — so it starts fitted, in the middle)

  const maxZoom = () => {
    const st = s.current
    if (!fit) return 1
    // up to four times, but never so far that one pixel of the photograph is
    // spread over more than three of the screen's
    return clamp((3 * st.nat[0]) / fit.w, 1.6, 4)
  }
  const bound = (z, x, y) => {
    if (!fit) return [0, 0]
    const [bw, bh] = s.current.box
    const mx = Math.max(0, (fit.w * z - bw) / 2 + 12)
    const my = Math.max(0, (fit.h * z - bh) / 2 + 12)
    return [clamp(x, -mx, mx), clamp(y, -my, my)]
  }
  function paint() {
    const st = s.current
    if (bodyRef.current) bodyRef.current.style.transform = `translate3d(${st.x.toFixed(2)}px, ${st.y.toFixed(2)}px, 0) scale(${st.z.toFixed(4)})`
    if (boxRef.current) boxRef.current.style.cursor = st.tz > 1.02 ? 'grab' : 'zoom-in'
  }
  const run = () => {
    const st = s.current
    if (st.raf) return
    const tick = () => {
      st.raf = 0
      const k = 0.24
      st.z += (st.tz - st.z) * k
      st.x += (st.tx - st.x) * k
      st.y += (st.ty - st.y) * k
      const done = Math.abs(st.tz - st.z) < 0.001 && Math.abs(st.tx - st.x) < 0.1 && Math.abs(st.ty - st.y) < 0.1
      if (done) { st.z = st.tz; st.x = st.tx; st.y = st.ty }
      paint()
      if (!done) st.raf = requestAnimationFrame(tick)
    }
    st.raf = requestAnimationFrame(tick)
  }
  useEffect(() => () => cancelAnimationFrame(s.current.raf), [])

  /** zoom to z keeping the point (px, py) — in the stage's own pixels — where it is */
  const zoomTo = (z, px, py, now = false) => {
    const st = s.current
    const [bw, bh] = st.box
    const z1 = clamp(z, 1, maxZoom())
    const cx = px - bw / 2, cy = py - bh / 2
    const dx = (cx - st.tx) / st.tz, dy = (cy - st.ty) / st.tz
    const [x, y] = z1 <= 1.001 ? [0, 0] : bound(z1, cx - z1 * dx, cy - z1 * dy)
    st.tz = z1; st.tx = x; st.ty = y
    if (now) { st.z = z1; st.x = x; st.y = y; paint() } else run()
    cbs.current.onZoom?.(z1)
  }

  useImperativeHandle(ref, () => ({
    zoomBy: (f) => { const [bw, bh] = s.current.box; zoomTo(s.current.tz * f, bw / 2, bh / 2) },
    reset: () => { const [bw, bh] = s.current.box; zoomTo(1, bw / 2, bh / 2) },
    at: (fx, fy, z = 2.2) => {
      // the point of the photograph at (fx, fy) brought to the middle, close
      const st = s.current
      if (!fit) return
      const z1 = clamp(z, 1, maxZoom())
      const [x, y] = bound(z1, -(fx - 0.5) * fit.w * z1, -(fy - 0.5) * fit.h * z1)
      st.tz = z1; st.tx = x; st.ty = y
      run()
      cbs.current.onZoom?.(z1)
    },
  }))

  /* ---------------------------------------------------- the hand */
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const pointers = new Map()
    let last = null, pinch = null, start = null, tapAt = 0, tapPos = null
    const local = (e) => { const r = box.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
    const down = (e) => {
      box.setPointerCapture?.(e.pointerId)
      const p = local(e)
      pointers.set(e.pointerId, p)
      if (pointers.size === 1) { last = p; start = { p, t: performance.now() } }
      else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, z: s.current.tz, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }
        start = null
      }
    }
    const move = (e) => {
      if (!pointers.has(e.pointerId)) return
      const p = local(e)
      pointers.set(e.pointerId, p)
      const st = s.current
      if (pointers.size >= 2 && pinch) {
        const [a, b] = [...pointers.values()]
        const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
        zoomTo(pinch.z * (Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d), mid[0], mid[1], true)
        const [x, y] = bound(st.tz, st.tx + (mid[0] - pinch.mid[0]), st.ty + (mid[1] - pinch.mid[1]))
        st.tx = st.x = x; st.ty = st.y = y
        paint()
        pinch.mid = mid
        return
      }
      if (!last) return
      if (st.tz > 1.02) {
        const [x, y] = bound(st.tz, st.tx + p[0] - last[0], st.ty + p[1] - last[1])
        st.tx = st.x = x; st.ty = st.y = y
        paint()
      }
      last = p
    }
    const up = (e) => {
      if (!pointers.has(e.pointerId)) return
      const p = local(e)
      pointers.delete(e.pointerId)
      if (pointers.size < 2) pinch = null
      if (pointers.size === 1) { last = [...pointers.values()][0]; return }
      if (pointers.size > 0) return
      last = null
      const st = s.current
      if (start) {
        const dx = p[0] - start.p[0], dy = p[1] - start.p[1]
        const quick = performance.now() - start.t < 600
        // at its fitted size, a sideways swipe moves on
        if (st.tz <= 1.02 && quick && Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4) cbs.current.onSwipe?.(dx < 0 ? 1 : -1)
        // a double tap goes close where it lands, or comes back
        else if (e.pointerType !== 'mouse' && Math.hypot(dx, dy) < 10) {
          const now = performance.now()
          if (now - tapAt < 320 && tapPos && Math.hypot(p[0] - tapPos[0], p[1] - tapPos[1]) < 40) {
            zoomTo(st.tz > 1.05 ? 1 : 2.4, p[0], p[1])
            tapAt = 0
          } else { tapAt = now; tapPos = p }
        }
      }
      start = null
    }
    const wheel = (e) => {
      e.preventDefault()
      const p = local(e)
      const k = e.deltaMode === 1 ? 16 : 1
      zoomTo(s.current.tz * Math.exp(-e.deltaY * k * (e.ctrlKey ? 0.01 : 0.0016)), p[0], p[1])
    }
    const dbl = (e) => { const p = local(e); zoomTo(s.current.tz > 1.05 ? 1 : 2.4, p[0], p[1]) }
    box.addEventListener('pointerdown', down)
    box.addEventListener('pointermove', move)
    box.addEventListener('pointerup', up)
    box.addEventListener('pointercancel', up)
    box.addEventListener('wheel', wheel, { passive: false })
    box.addEventListener('dblclick', dbl)
    return () => {
      box.removeEventListener('pointerdown', down)
      box.removeEventListener('pointermove', move)
      box.removeEventListener('pointerup', up)
      box.removeEventListener('pointercancel', up)
      box.removeEventListener('wheel', wheel)
      box.removeEventListener('dblclick', dbl)
    }
  }, [fit]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={boxRef} className="absolute inset-0 touch-none select-none overflow-hidden" style={{ cursor: 'zoom-in' }}>
      <div className="absolute left-1/2 top-1/2" style={{ width: fit?.w ?? 0, height: fit?.h ?? 0, marginLeft: -(fit?.w ?? 0) / 2, marginTop: -(fit?.h ?? 0) / 2 }}>
        <div ref={bodyRef} className="absolute inset-0 will-change-transform" style={{ transformOrigin: '50% 50%' }}>
          <span className="facet absolute inset-0 block overflow-hidden" style={{ '--cut': '14px', background: 'rgb(var(--sr-bg1))' }}>
            <img
              src={src}
              alt={alt}
              draggable="false"
              decoding="async"
              onLoad={(e) => {
                s.current.nat = [e.currentTarget.naturalWidth, e.currentTarget.naturalHeight]
                s.current.measure?.()
                setLoaded(true)
              }}
              className="absolute inset-0 h-full w-full select-none object-cover transition-opacity duration-500"
              style={{ opacity: loaded ? 1 : 0 }}
            />
          </span>
          <Plate cut={14} className="z-[1]" edge="rgb(var(--sr-glass) / 0.18)" />
        </div>
      </div>
    </div>
  )
}
