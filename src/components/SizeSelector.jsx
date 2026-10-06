import { useRef, useState } from 'react'
import gsap from 'gsap'
import { JACKET } from '../data/product.js'

export default function SizeSelector({ selected, onSelect }) {
  const [expanded, setExpanded] = useState(false)
  const extraRef = useRef(null)

  const toggleExtra = () => {
    const el = extraRef.current
    const next = !expanded
    setExpanded(next)
    if (!el) return
    gsap.killTweensOf(el)
    if (next) {
      gsap.fromTo(
        el,
        { width: 0, autoAlpha: 0 },
        { width: 'auto', autoAlpha: 1, duration: 0.55, ease: 'power3.out' },
      )
    } else {
      gsap.to(el, { width: 0, autoAlpha: 0, duration: 0.4, ease: 'power3.inOut' })
    }
  }

  const Token = ({ value }) => {
    const active = selected === value
    return (
      <button
        onClick={() => onSelect(value)}
        aria-pressed={active}
        className="sweep relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[9px] transition-all duration-[450ms] md:h-[46px] md:w-[46px]"
        style={{
          border: `1px solid ${active ? 'rgba(232,224,255,0.75)' : 'rgba(244,242,247,0.18)'}`,
          background: active
            ? 'linear-gradient(165deg, rgba(150,124,220,0.3), rgba(90,72,158,0.14))'
            : 'rgba(244,242,247,0.03)',
          boxShadow: active
            ? '0 0 22px rgba(150,120,225,0.35), inset 0 0 14px rgba(180,158,240,0.16)'
            : 'none',
          transform: active ? 'scale(1.06)' : 'scale(1)',
        }}
      >
        <span
          className="relative z-10 font-display italic transition-all duration-[450ms]"
          style={{
            fontSize: active ? '1.08rem' : '1rem',
            color: active ? '#f4f2f7' : 'rgba(244,242,247,0.6)',
          }}
        >
          {value}
        </span>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2.5">
      {JACKET.sizes.map((s) => (
        <Token key={s} value={s} />
      ))}

      <div ref={extraRef} className="flex gap-2.5 overflow-hidden" style={{ width: 0, opacity: 0 }}>
        {JACKET.extraSizes.map((s) => (
          <Token key={s} value={s} />
        ))}
      </div>

      <button
        onClick={toggleExtra}
        aria-expanded={expanded}
        aria-label={expanded ? 'Hide other sizes' : 'Show other sizes'}
        className="sweep relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[9px] border border-bone/[0.18] bg-bone/[0.03] text-bone/55 transition-all duration-300 hover:border-bone/40 hover:text-bone/85 md:h-[46px] md:w-[46px]"
      >
        <span
          className="relative z-10 font-display text-lg italic leading-none transition-transform duration-500"
          style={{ transform: expanded ? 'rotate(45deg)' : 'none' }}
        >
          {expanded ? '+' : '…'}
        </span>
      </button>
    </div>
  )
}
