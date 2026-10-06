import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { CATEGORIES } from '../../data/catalogue.js'

function Whats() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[17px] w-[17px]">
      <path d="M3.6 20.4l1.3-4.2A8.1 8.1 0 1 1 8 19.2l-4.4 1.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9.3 8.6c.2-.5.4-.5.6-.5h.4c.2 0 .4 0 .6.4l.6 1.5c.1.2.1.4 0 .5l-.3.5c-.1.2-.2.3-.1.5.4.7 1.1 1.5 1.9 1.9.2.1.3 0 .5-.1l.4-.5c.2-.2.3-.2.5-.1l1.4.7c.2.1.3.3.3.4v.5c0 .5-.4.8-.8 1-.5.2-1 .2-1.9-.1a8.4 8.4 0 0 1-4.2-3.9c-.4-.9-.4-1.5-.2-2Z" fill="currentColor" />
    </svg>
  )
}
function Insta() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[17px] w-[17px]">
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.8" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="3.8" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="17.3" cy="6.7" r="1.05" fill="currentColor" />
    </svg>
  )
}
function Bag() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[17px] w-[17px]">
      <path d="M7.4 8V6.4a4.6 4.6 0 0 1 9.2 0V8M4.6 8h14.8l.8 11.2a1.4 1.4 0 0 1-1.4 1.5H5.2a1.4 1.4 0 0 1-1.4-1.5L4.6 8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}
function Glass() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M15.7 15.7 20 20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

const ICONS = [
  { key: 'wa', label: 'WhatsApp', Icon: Whats },
  { key: 'ig', label: 'Instagram', Icon: Insta },
]

export default function Controls({
  category,
  onCategory,
  product,
  cartCount,
  onOpenCart,
  onOpenAbout,
}) {
  const [sheet, setSheet] = useState(false)
  const sheetRef = useRef(null)

  useEffect(() => {
    const el = sheetRef.current
    if (!el) return
    gsap.killTweensOf(el)
    if (sheet) {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: -8, scaleY: 0.86 },
        { autoAlpha: 1, y: 0, scaleY: 1, duration: 0.42, ease: 'power3.out' },
      )
    } else {
      gsap.to(el, { autoAlpha: 0, y: -6, scaleY: 0.9, duration: 0.26, ease: 'power2.in' })
    }
  }, [sheet])

  // a stray click anywhere else closes it, the way a real control system behaves
  useEffect(() => {
    if (!sheet) return
    const close = (e) => {
      if (!e.target.closest?.('[data-catmenu]')) setSheet(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [sheet])

  return (
    <div className="flex items-start justify-between gap-4">
      {/* identity + reach */}
      <div className="flex items-center gap-3 md:gap-5">
        <div className="mr-1 leading-none md:mr-3">
          <span className="block font-display text-[9px] italic tracking-[0.06em] text-bone/50 md:text-[10px]">
            welcome to
          </span>
          <span className="block font-display text-xl font-semibold leading-[1.05] tracking-[0.04em] text-bone md:text-[26px]">
            VASS
          </span>
        </div>

        {ICONS.map(({ key, label, Icon }) => (
          <a
            key={key}
            href="#"
            data-vx
            aria-label={label}
            title={label}
            className="vx grid h-10 w-10 place-items-center rounded-full border border-bone/15 text-bone/60 hover:text-bone"
          >
            <Icon />
          </a>
        ))}

        <button
          data-vx
          onClick={onOpenCart}
          aria-label={`Bag, ${cartCount} item${cartCount === 1 ? '' : 's'}`}
          className="vx relative grid h-10 w-10 place-items-center rounded-full border border-bone/15 text-bone/60 hover:text-bone"
        >
          <Bag />
          {cartCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-aqua px-1 text-[9px] font-semibold text-night">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* wayfinding */}
      <div className="flex items-center gap-2 md:gap-3">
        <span className="hidden items-center rounded-full border border-aqua/30 bg-aqua/[0.07] px-3.5 py-2 text-[9px] uppercase tracking-[0.2em] text-aqua sm:inline-flex">
          {product.code}
        </span>

        <div data-catmenu className="relative">
          <button
            data-vx
            data-active={sheet}
            onClick={() => setSheet((s) => !s)}
            aria-expanded={sheet}
            className="vx flex items-center gap-2 rounded-full border border-bone/15 px-3.5 py-2 text-[9px] uppercase tracking-[0.2em] text-bone/70 hover:text-bone md:px-4"
          >
            Category
            <svg viewBox="0 0 10 6" className="h-[5px] w-[9px]" style={{ transform: sheet ? 'rotate(180deg)' : 'none', transition: 'transform 380ms cubic-bezier(0.22,1,0.36,1)' }}>
              <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            </svg>
          </button>

          <div
            ref={sheetRef}
            className="absolute right-0 top-[calc(100%+10px)] z-30 w-44 origin-top overflow-hidden rounded-2xl border border-bone/15 p-1.5 backdrop-blur-xl"
            style={{ opacity: 0, visibility: 'hidden', background: 'rgba(12,10,30,0.88)' }}
          >
            {CATEGORIES.map((c) => {
              const active = c.id === category
              return (
                <button
                  key={c.id}
                  data-vx
                  data-active={active}
                  onClick={() => { onCategory(c.id); setSheet(false) }}
                  className="vx flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[10px] uppercase tracking-[0.2em] text-bone/65 hover:text-bone"
                >
                  {c.label}
                  <span
                    className="h-1 w-1 rounded-full transition-all duration-500"
                    style={{
                      background: active ? '#7fd4d8' : 'transparent',
                      boxShadow: active ? '0 0 10px rgba(127,212,216,0.9)' : 'none',
                    }}
                  />
                </button>
              )
            })}
          </div>
        </div>

        <button
          data-vx
          onClick={onOpenAbout}
          className="vx rounded-full border border-bone/15 px-3.5 py-2 text-[9px] uppercase tracking-[0.2em] text-bone/70 hover:text-bone md:px-4"
        >
          About
        </button>

        {/* search keeps its own weather — a clear, slow breath, not a flicker */}
        <div className="relative">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-7 -inset-y-6"
            style={{
              background:
                'radial-gradient(closest-side, rgba(150,104,232,0.42) 0%, rgba(127,212,216,0.16) 45%, transparent 80%)',
              animation: 'breathe 5s ease-in-out infinite',
            }}
          />
          <button
            data-vx
            aria-label="Search"
            className="vx relative flex h-10 items-center gap-2 rounded-full border border-bone/20 pl-3.5 pr-4 text-bone/70 hover:text-bone md:w-[150px]"
          >
            <Glass />
            <span className="hidden text-[9px] uppercase tracking-[0.2em] md:inline">Search</span>
          </button>
        </div>
      </div>
    </div>
  )
}
