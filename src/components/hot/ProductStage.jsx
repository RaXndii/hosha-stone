import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

/**
 * The rail. Every view of the product is mounted at once and parked in a slot:
 * slot 0 is the hero, slot 1 sits behind and to the side, anything further back
 * waits off-stage. Promoting a view re-parks all of them, so the previous hero
 * shrinks away while the new one grows into its place — one continuous
 * exchange rather than two separate animations.
 */
// The hero sits left of centre and the next view stands beside it, smaller and
// a step further back — both fully visible, the way the two garments are framed
// in the reference.
const SLOTS = [
  { x: -16, y: -2, scale: 1, opacity: 1, z: 3 },
  { x: 30, y: 15, scale: 0.62, opacity: 0.78, z: 2 },
  { x: 47, y: 24, scale: 0.44, opacity: 0.36, z: 1 },
]
const OFFSTAGE = { x: 62, y: 30, scale: 0.32, opacity: 0, z: 0 }

export default function ProductStage({ product, activeIndex, onPick, interactive = true }) {
  const wrapRef = useRef(null)
  const firstRun = useRef(true)

  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const nodes = Array.from(wrap.querySelectorAll('[data-slotitem]'))
    const count = product.views.length

    nodes.forEach((node) => {
      const idx = Number(node.dataset.index)
      // distance forward from the active view, wrapping round the set
      const rank = (idx - activeIndex + count) % count
      const slot = SLOTS[rank] ?? OFFSTAGE
      node.style.zIndex = String(slot.z)
      gsap.to(node, {
        xPercent: slot.x,
        yPercent: slot.y,
        scale: slot.scale,
        autoAlpha: slot.opacity,
        duration: firstRun.current ? 0 : 0.9,
        ease: 'power3.inOut',
        overwrite: 'auto',
      })
    })
    firstRun.current = false
  }, [product, activeIndex])

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      {product.views.map((view, i) => {
        const isActive = i === activeIndex
        // the peek is decorative until paging between products lands — no
        // hover cue, no click, so it never promises an interaction it can't
        // yet deliver
        const canPick = interactive && !isActive
        return (
          <button
            key={product.id + view.id}
            data-slotitem
            data-index={i}
            data-vx={canPick ? '' : undefined}
            onClick={() => canPick && onPick(i)}
            disabled={!canPick}
            aria-hidden={!canPick || undefined}
            tabIndex={canPick ? 0 : -1}
            // the hero fills the box, so leaving it hit-testable would swallow
            // every click meant for the view standing beside it
            className={`absolute inset-0 origin-center will-change-transform ${
              canPick ? 'cursor-pointer' : 'pointer-events-none cursor-default'
            }`}
            style={{ transformOrigin: '50% 50%' }}
          >
            <img
              src={view.src}
              alt={`${product.name} — ${view.label}`}
              draggable="false"
              decoding="async"
              className="h-full w-full select-none object-contain"
              style={{ filter: 'contrast(1.04) brightness(1.04)' }}
            />
          </button>
        )
      })}
    </div>
  )
}
