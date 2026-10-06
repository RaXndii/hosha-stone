import { useRef, useState } from 'react'
import gsap from 'gsap'

/**
 * click → compression → pop → settle. The compression is what sells it: the
 * heart gives before it commits, so the red arrives as a release rather than a
 * colour swap. The burst ring is a separate element so it can outrun the icon.
 */
export default function HeartButton({ onChange }) {
  const [on, setOn] = useState(false)
  const iconRef = useRef(null)
  const ringRef = useRef(null)

  const toggle = () => {
    const next = !on
    setOn(next)
    onChange?.(next)

    const icon = iconRef.current
    const ring = ringRef.current
    if (!icon) return
    gsap.killTweensOf([icon, ring])

    if (next) {
      const tl = gsap.timeline()
      tl.to(icon, { scale: 0.78, duration: 0.1, ease: 'power3.in' })
        .to(icon, { scale: 1.28, duration: 0.22, ease: 'back.out(3.4)' })
        .to(icon, { scale: 1, duration: 0.42, ease: 'elastic.out(1, 0.55)' })
      if (ring) {
        tl.fromTo(
          ring,
          { scale: 0.5, opacity: 0.85 },
          { scale: 2.1, opacity: 0, duration: 0.62, ease: 'power2.out' },
          0.1,
        )
      }
    } else {
      gsap.timeline()
        .to(icon, { scale: 0.86, duration: 0.12, ease: 'power2.in' })
        .to(icon, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.7)' })
    }
  }

  return (
    <button
      data-vx
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? 'Remove from favourites' : 'Add to favourites'}
      className="vx relative grid h-11 w-11 place-items-center rounded-full border border-bone/15"
    >
      <span
        ref={ringRef}
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ opacity: 0, background: 'radial-gradient(circle, rgba(236,72,84,0.5) 0%, transparent 68%)' }}
      />
      <svg ref={iconRef} viewBox="0 0 24 24" className="h-[19px] w-[19px] will-change-transform">
        <path
          d="M12 20.4s-7.6-4.6-7.6-9.6A4.3 4.3 0 0 1 12 8.2a4.3 4.3 0 0 1 7.6 2.6c0 5-7.6 9.6-7.6 9.6Z"
          fill={on ? '#ec4854' : 'transparent'}
          stroke={on ? '#ec4854' : 'rgba(244,242,247,0.55)'}
          strokeWidth="1.4"
          strokeLinejoin="round"
          style={{ transition: 'fill 320ms ease, stroke 320ms ease' }}
        />
      </svg>
    </button>
  )
}
