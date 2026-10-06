import { useEffect } from 'react'

const clamp = (v, min, max) => (v < min ? min : v > max ? max : v)

/**
 * Drives the scene's light as a physical body rather than a cursor follower:
 * the pointer sets a target, the light eases toward it with its own inertia and
 * never quite arrives. Everything downstream reads the CSS variables written
 * here, so no component re-renders on pointer movement.
 *
 * --lx / --ly   light position, 0-1 across the stage
 * --dx / --dy   signed offset from centre, -1..1, for layer parallax
 * --near        0-1 proximity of the light to the garment
 */
export default function usePointerField(stageRef, { anchor = [0.6, 0.54], zoneRef } = {}) {
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(pointer: coarse)').matches

    const state = { x: 0.5, y: 0.45, tx: 0.5, ty: 0.45 }
    let lastInput = 0
    let phase = Math.PI * 0.5
    let raf = 0

    const setTarget = (clientX, clientY) => {
      const rect = stage.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      state.tx = clamp((clientX - rect.left) / rect.width, -0.2, 1.2)
      state.ty = clamp((clientY - rect.top) / rect.height, -0.2, 1.2)
      lastInput = performance.now()
    }

    // with a zone, the light only answers the visitor inside it; elsewhere it
    // goes back to drifting on its own
    const within = (x, y) => {
      const zone = zoneRef?.current
      if (!zone) return true
      const r = zone.getBoundingClientRect()
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
    }
    const follow = (x, y) => {
      if (within(x, y)) setTarget(x, y)
      else if (lastInput) {
        lastInput = 0
        // pick the drift up from where the light is now, not from a jump
        phase = Math.asin(clamp((state.x - 0.5) / 0.26, -1, 1))
      }
    }
    const onPointerMove = (e) => follow(e.clientX, e.clientY)
    const onTouch = (e) => {
      const t = e.touches[0]
      if (t) follow(t.clientX, t.clientY)
    }

    if (coarse) {
      window.addEventListener('touchstart', onTouch, { passive: true })
      window.addEventListener('touchmove', onTouch, { passive: true })
    } else {
      window.addEventListener('pointermove', onPointerMove, { passive: true })
    }

    const tick = () => {
      // with no recent input the light keeps drifting, so the scene is never inert
      if (performance.now() - lastInput > 2200) {
        phase += 0.0025
        state.tx = 0.5 + Math.sin(phase) * 0.26
        state.ty = 0.46 + Math.cos(phase * 0.62) * 0.1
      }

      // inertia: the light lags the pointer and settles, it does not track it
      state.x += (state.tx - state.x) * 0.045
      state.y += (state.ty - state.y) * 0.045

      const dist = Math.hypot(state.x - anchor[0], (state.y - anchor[1]) * 0.85)
      const near = clamp(1 - dist / 0.46, 0, 1)

      stage.style.setProperty('--lx', state.x.toFixed(4))
      stage.style.setProperty('--ly', state.y.toFixed(4))
      stage.style.setProperty('--dx', (state.x * 2 - 1).toFixed(4))
      stage.style.setProperty('--dy', (state.y * 2 - 1).toFixed(4))
      stage.style.setProperty('--near', near.toFixed(4))

      raf = requestAnimationFrame(tick)
    }

    if (!reduced) raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('touchstart', onTouch)
      window.removeEventListener('touchmove', onTouch)
    }
  }, [stageRef, anchor, zoneRef])
}
