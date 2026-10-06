import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/** Dormant until a size is chosen, then it wakes rather than simply enabling. */
export default function GetOneButton({ active }) {
  const btnRef = useRef(null)
  const fillRef = useRef(null)
  const labelRef = useRef(null)
  const first = useRef(true)

  useEffect(() => {
    const btn = btnRef.current
    const fill = fillRef.current
    const label = labelRef.current
    if (!btn || !fill || !label) return

    if (first.current) {
      first.current = false
      if (!active) return
    }

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    if (active) {
      tl.to(fill, { scaleX: 1, duration: 0.72, ease: 'expo.out' }, 0)
      tl.to(btn, { paddingLeft: 34, paddingRight: 34, duration: 0.72 }, 0)
      tl.to(label, { color: '#07061a', letterSpacing: '0.24em', duration: 0.6 }, 0.06)
      tl.fromTo(
        btn,
        { boxShadow: '0 0 0 rgba(150,120,225,0)' },
        { boxShadow: '0 10px 38px rgba(130,100,210,0.38)', duration: 0.8 },
        0,
      )
      btn.classList.add('is-sweeping')
      window.setTimeout(() => btn.classList.remove('is-sweeping'), 900)
    } else {
      tl.to(fill, { scaleX: 0, duration: 0.45, ease: 'power3.inOut' }, 0)
      tl.to(btn, { paddingLeft: 26, paddingRight: 26, duration: 0.45 }, 0)
      tl.to(label, { color: 'rgba(244,242,247,0.72)', letterSpacing: '0.18em', duration: 0.4 }, 0)
      tl.to(btn, { boxShadow: '0 0 0 rgba(150,120,225,0)', duration: 0.4 }, 0)
    }
    return () => tl.kill()
  }, [active])

  return (
    <button
      ref={btnRef}
      disabled={!active}
      className="sweep relative inline-flex h-[46px] items-center overflow-hidden rounded-full border border-bone/40 bg-bone/[0.04] transition-transform duration-300 disabled:cursor-not-allowed enabled:hover:scale-[1.035]"
      style={{ paddingLeft: 26, paddingRight: 26 }}
    >
      <span
        ref={fillRef}
        className="absolute inset-0 origin-left rounded-full bg-bone"
        style={{ transform: 'scaleX(0)' }}
      />
      <span
        ref={labelRef}
        className="relative z-10 whitespace-nowrap font-display text-[13px] font-medium italic"
        style={{ color: 'rgba(244,242,247,0.72)', letterSpacing: '0.18em' }}
      >
        GET ONE
      </span>
    </button>
  )
}
