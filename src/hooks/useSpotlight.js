import { useEffect } from 'react'

/**
 * One delegated listener for the whole section instead of a pair per control.
 *
 * Every element marked `data-vx` gets the pointer's position within it written
 * as --sx/--sy, which the shared interaction style uses to bloom a highlight
 * from wherever the pointer actually is. That is the difference between a
 * control that lights up and one that responds to you.
 *
 * Coarse pointers get the same treatment on touch, so the feedback survives on
 * a phone where there is no hover at all.
 */
export default function useSpotlight(rootRef) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    let frame = 0
    let pending = null

    const flush = () => {
      frame = 0
      if (!pending) return
      const { el, x, y } = pending
      pending = null
      el.style.setProperty('--sx', `${x.toFixed(1)}%`)
      el.style.setProperty('--sy', `${y.toFixed(1)}%`)
    }

    const track = (clientX, clientY, target) => {
      const el = target.closest?.('[data-vx]')
      if (!el) return
      const r = el.getBoundingClientRect()
      if (!r.width || !r.height) return
      pending = {
        el,
        x: ((clientX - r.left) / r.width) * 100,
        y: ((clientY - r.top) / r.height) * 100,
      }
      if (!frame) frame = requestAnimationFrame(flush)
    }

    const onMove = (e) => track(e.clientX, e.clientY, e.target)
    const onTouch = (e) => {
      const t = e.touches[0]
      if (t) track(t.clientX, t.clientY, e.target)
    }

    root.addEventListener('pointermove', onMove, { passive: true })
    root.addEventListener('touchstart', onTouch, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('touchstart', onTouch)
    }
  }, [rootRef])
}
