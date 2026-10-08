import { useEffect } from 'react'

const clamp = (v, min, max) => (v < min ? min : v > max ? max : v)

/*
 * The light's own path when no one is reaching for it: a slow figure across
 * the stage. Across, it goes round five times while it rises and falls three,
 * so the figure closes on itself after PERIOD and can loop without a seam.
 */
const RATE = 0.15 // radians a second
const LOOP = 10 * Math.PI
const PERIOD = (LOOP / RATE) * 1000 // ms, about three and a half minutes
const pathAt = (phase) => ({ x: 0.5 + Math.sin(phase) * 0.26, y: 0.46 + Math.cos(phase * 0.6) * 0.1 })

/*
 * What the light moves. Its glow is twice the stage's size, so a quarter of
 * its own width is half the stage's; the reflection in the glass slides the
 * other way, a tenth of its width from one edge of the stage to the other.
 */
const glow = (x, y) => `translate3d(${((x - 0.5) * 50).toFixed(3)}%, ${((y - 0.5) * 50).toFixed(3)}%, 0)`
const glint = (x) => `translate3d(${((x * 2 - 1) * -10).toFixed(3)}%, 0, 0)`
const STEPS = 240
const frames = (draw) => Array.from({ length: STEPS + 1 }, (_, i) => ({ transform: draw(pathAt((i / STEPS) * LOOP)) }))

/**
 * The room's light, moving as a body rather than a cursor follower.
 *
 * Left alone it drifts on its own path, so the scene is never inert — and the
 * drift is handed whole to the compositor: the two things it moves (the glow,
 * [data-field="light"], and its reflection in the glass, [data-field="glass"])
 * are animated off the main thread, so a phone does nothing at all to keep the
 * room alive. (It used to be a frame loop writing the light's position into
 * the whole showroom's styles: every frame, every element on the page was
 * restyled for two of them to move. On a phone that was the room's entire
 * budget, all the time.)
 *
 * With a mouse, inside the zone, the light leaves its path for the pointer
 * with its own inertia, never quite arriving, and once the pointer has been
 * still or gone for a while it takes the path up again from where it is. That
 * takes a frame loop, so one runs only then. On a touch screen a finger on the
 * stage is swiping or pressing, and the light keeps its own path.
 */
export default function usePointerField(rootRef, { zoneRef } = {}) {
  useEffect(() => {
    const root = rootRef.current
    const light = root?.querySelector('[data-field="light"]')
    const glass = root?.querySelector('[data-field="glass"]')
    if (!light || !glass || !light.animate) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // the path's own clock; moved when the light rejoins it somewhere else
    let t0 = performance.now()
    const timing = { duration: PERIOD, iterations: Infinity }
    const drift = [light.animate(frames((p) => glow(p.x, p.y)), timing), glass.animate(frames((p) => glint(p.x)), timing)]
    const pathNow = (now) => pathAt((((now - t0) % PERIOD) / 1000) * RATE)
    const rejoin = (now) => {
      for (const a of drift) {
        a.currentTime = (now - t0) % PERIOD
        a.play()
      }
      light.style.transform = ''
      glass.style.transform = ''
    }

    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return () => drift.forEach((a) => a.cancel())

    const s = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, last: 0, raf: 0, held: false, following: false }
    // the drift is picked up from where the light is now, not from a jump
    const rephase = (now) => {
      const phase = Math.asin(clamp((s.x - 0.5) / 0.26, -1, 1))
      t0 = now - (phase / RATE) * 1000
    }

    const tick = () => {
      const now = performance.now()
      const following = now - s.last < 2200
      if (s.following && !following) rephase(now)
      s.following = following
      if (!following) {
        const p = pathNow(now)
        s.tx = p.x
        s.ty = p.y
      }
      // inertia: the light lags the pointer and settles, it does not track it
      s.x += (s.tx - s.x) * 0.045
      s.y += (s.ty - s.y) * 0.045
      if (!following && Math.abs(s.x - s.tx) < 0.0015 && Math.abs(s.y - s.ty) < 0.0015) {
        // back on its path: the compositor has it again
        s.held = false
        s.raf = 0
        rejoin(now)
        return
      }
      light.style.transform = glow(s.x, s.y)
      glass.style.transform = glint(s.x)
      s.raf = requestAnimationFrame(tick)
    }

    // with a zone, the light only answers the visitor inside it
    const within = (x, y) => {
      const zone = zoneRef?.current
      if (!zone) return true
      const r = zone.getBoundingClientRect()
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
    }
    const onMove = (e) => {
      const now = performance.now()
      if (!within(e.clientX, e.clientY)) {
        s.last = 0
        return
      }
      const rect = root.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      if (!s.held) {
        // taken off the path where the compositor has it now
        const p = pathNow(now)
        s.x = p.x
        s.y = p.y
        s.held = true
        for (const a of drift) a.cancel()
      }
      s.tx = clamp((e.clientX - rect.left) / rect.width, -0.2, 1.2)
      s.ty = clamp((e.clientY - rect.top) / rect.height, -0.2, 1.2)
      s.last = now
      if (!s.raf) s.raf = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      cancelAnimationFrame(s.raf)
      window.removeEventListener('pointermove', onMove)
      drift.forEach((a) => a.cancel())
    }
  }, [rootRef, zoneRef])
}
