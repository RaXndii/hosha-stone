import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import Roll from './Roll.jsx'
import { pad2 } from '../../data/showroom.js'
import FavoriteButton from './PixelHeart.jsx'

const ink = (a = 1) => `rgb(var(--sr-ink) / ${a})`

/** A line of copy behind a mask, so product changes can slide it out and in. */
export function Reveal({ as: Tag = 'div', className = '', style, children }) {
  return (
    <div data-reveal className="overflow-hidden">
      <Tag data-reveal-inner className={`block ${className}`} style={style}>
        {children}
      </Tag>
    </div>
  )
}

function Plus({ className = 'h-[7px] w-[7px]' }) {
  return (
    <span aria-hidden="true" className={`relative inline-block ${className}`}>
      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2" style={{ background: 'currentColor' }} />
      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2" style={{ background: 'currentColor' }} />
    </span>
  )
}

/**
 * The way into the photographs: a small atmospheric portal. Vapour turns
 * slowly around the ring — two clouds drifting in opposite directions, one
 * breathing, a few motes in orbit — all transform and opacity, so the loop
 * costs nothing. A hand nearby stirs it; a press makes it bloom outward, and
 * the piece opens into the closer look through it.
 */
function LookCloser({ product, onLook, onPrefetch }) {
  const ref = useRef(null)
  const enter = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { onLook(); return }
    const q = gsap.utils.selector(ref.current)
    gsap.timeline()
      .to(q('[data-look-ring]'), { scale: 0.84, duration: 0.1, ease: 'power2.in' })
      .to(q('[data-look-ring]'), { scale: 1, duration: 0.7, ease: 'power3.out' })
    gsap.fromTo(q('[data-vapor-burst]'), { scale: 0.5, opacity: 0.95 }, { scale: 3.4, opacity: 0, duration: 1, ease: 'power2.out' })
    gsap.fromTo(q('.vapor-cloud'), { scale: 1.2 }, { scale: 1.75, duration: 0.28, ease: 'power2.out', yoyo: true, repeat: 1, clearProps: 'transform' })
    // the opening starts as the bloom peaks, so the two read as one motion
    window.setTimeout(onLook, 170)
  }
  return (
    <button
      ref={ref}
      data-fade
      onClick={enter}
      onPointerEnter={onPrefetch}
      onFocus={onPrefetch}
      aria-label={`Look closer at the ${product.name}`}
      className="group mt-8 flex items-center gap-5 py-3 text-[10.5px] font-medium uppercase tracking-[0.34em] lg:mt-12"
      style={{ color: ink(0.82) }}
    >
      <span
        className="h-px w-[52px] origin-left transition-[width,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-[76px] group-hover:bg-[rgb(var(--sr-neon))]"
        style={{ background: ink(0.6) }}
      />
      <span className="transition-colors duration-500 group-hover:text-[rgb(var(--sr-ink))]">Look closer</span>
      <span className="vapor relative grid h-[30px] w-[30px] place-items-center">
        <span aria-hidden="true" className="vapor-cloud">
          <i /><i /><i /><i />
        </span>
        <span aria-hidden="true" className="vapor-mote" style={{ animationDuration: '9s' }} />
        <span aria-hidden="true" className="vapor-mote" style={{ animationDuration: '13s', animationDirection: 'reverse', '--mote-r': '19px' }} />
        <span aria-hidden="true" className="vapor-mote" style={{ animationDuration: '11s', animationDelay: '-4s', '--mote-r': '15px' }} />
        <span
          data-vapor-burst
          aria-hidden="true"
          className="pointer-events-none absolute -inset-2 rounded-full opacity-0"
          style={{ background: 'radial-gradient(closest-side, rgb(var(--sr-neon) / 0.55), rgb(var(--sr-light) / 0.12) 60%, transparent)' }}
        />
        <span
          data-look-ring
          className="relative grid h-[30px] w-[30px] place-items-center rounded-full backdrop-blur-[1px] transition-[transform,border-color,box-shadow,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.08] group-hover:border-[rgb(var(--sr-neon))] group-hover:bg-[rgb(var(--sr-neon)/0.1)] group-hover:shadow-[0_0_18px_rgb(var(--sr-neon)/0.5)]"
          style={{ border: `1px solid ${ink(0.5)}`, background: 'rgb(var(--sr-bg0) / 0.25)' }}
        >
          <span className="transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-90">
            <Plus />
          </span>
        </span>
      </span>
    </button>
  )
}

/**
 * Who the piece is, in four lines: the house and its number, its name, the
 * line it carries, and the way in to the photographs.
 */
export function Title({ product, onLook, onPrefetch }) {
  return (
    <div data-quiet className="max-w-[34rem]">
      <Reveal className="text-[10.5px] font-medium uppercase tracking-[0.36em]" style={{ color: ink(0.62) }}>
        Hosha Stone / {product.number}
      </Reveal>
      <Reveal
        as="h1"
        className="mt-4 font-display text-[clamp(1.5rem,2.5vw,2.85rem)] font-normal uppercase leading-[1.12] tracking-[0.14em] lg:mt-5"
        style={{ color: ink() }}
      >
        {product.name}
      </Reveal>
      <Reveal as="p" className="mt-4 text-[10.5px] uppercase tracking-[0.36em] lg:mt-5" style={{ color: ink(0.5) }}>
        {product.tagline}
      </Reveal>
      <LookCloser product={product} onLook={onLook} onPrefetch={onPrefetch} />
    </div>
  )
}

/** Where this piece sits in the set: a number, and a rule that fills as you go. */
export function Pager({ pos, total, dir }) {
  const p = total ? (pos + 1) / total : 0
  return (
    <div data-fade className="flex items-center gap-6" aria-label={`Piece ${pos + 1} of ${total}`}>
      <span className="flex items-baseline gap-2 text-[10.5px] font-medium tracking-[0.3em]">
        <span style={{ color: ink() }}><Roll value={pad2(pos + 1)} dir={dir} duration={0.7} /></span>
        <span style={{ color: ink(0.35) }}>/</span>
        <span style={{ color: ink(0.45) }}><Roll value={pad2(total)} duration={0.7} /></span>
      </span>
      <span className="relative block h-px w-[106px]" style={{ background: ink(0.14) }}>
        <span
          className="absolute inset-y-0 left-0 transition-[width] duration-[1100ms] ease-[cubic-bezier(0.65,0,0.35,1)]"
          style={{ width: `${p * 100}%`, background: ink(0.85) }}
        />
      </span>
    </div>
  )
}

/**
 * The next piece, named. On hover its line takes the next piece's own neon —
 * a glimpse of the room you are about to enter.
 */
export function NextPiece({ next, onNext }) {
  if (!next) return null
  return (
    <button
      data-fade
      onClick={onNext}
      aria-label={`Next piece: ${next.name}`}
      className="group block text-left"
      style={{ '--next-neon': next.theme.neon.join(' ') }}
    >
      <span className="block text-[10px] font-medium uppercase tracking-[0.36em]" style={{ color: ink(0.5) }}>
        Next
      </span>
      <span className="mt-2.5 block text-[10.5px] font-medium uppercase tracking-[0.36em] transition-colors duration-500 group-hover:text-[rgb(var(--sr-ink))]" style={{ color: ink(0.86) }}>
        <Roll value={next.short} duration={0.6} />
      </span>
      <span className="mt-2.5 block text-[10px] tracking-[0.36em]" style={{ color: ink(0.5) }}>
        <Roll value={next.number} duration={0.6} />
      </span>
      <span className="mt-9 flex items-center gap-5">
        <span
          className="h-px w-[52px] transition-[width,background-color,box-shadow] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-[72px] group-hover:bg-[rgb(var(--next-neon))] group-hover:shadow-[0_0_10px_rgb(var(--next-neon)/0.8)]"
          style={{ background: ink(0.35) }}
        />
        <svg viewBox="0 0 22 12" className="h-[12px] w-[22px] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1.5" style={{ color: ink(0.9) }} aria-hidden="true">
          <path d="M1 6h19M15 1l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </button>
  )
}

/**
 * Sizes as small glass beads. Available sizes carry a hairline ring, sold-out
 * ones are struck through and fall back, and the chosen one becomes a lit
 * bead: a glassy highlight, the piece's accent glowing inside, a slight lift.
 * The bead is the inner span — the button itself belongs to GSAP's entrances.
 */
function Sizes({ sizes, selected, onSelect, nudge }) {
  return (
    <div className="flex items-center gap-1 lg:gap-1.5" role="group" aria-label="Sizes">
      {sizes.map(({ label, available }) => {
        const on = selected === label
        return (
          <button
            key={label}
            data-size
            disabled={!available}
            aria-pressed={available ? on : undefined}
            aria-label={available ? `Size ${label}` : `Size ${label}, sold out`}
            title={available ? undefined : 'Sold out'}
            onClick={() => available && onSelect(on ? null : label)}
            className={`group grid h-[38px] min-w-[34px] place-items-center lg:min-w-[36px] ${available ? '' : 'cursor-not-allowed'}`}
          >
            <span
              className={`relative grid h-[32px] min-w-[32px] place-items-center rounded-full px-1 text-[10.5px] font-medium tracking-[0.08em] transition-[transform,color,border-color,box-shadow,background] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                on ? 'scale-[1.08]' : available ? 'group-hover:scale-[1.05] group-hover:border-[rgb(var(--sr-ink)/0.5)] group-hover:text-[rgb(var(--sr-ink))] group-active:scale-95' : ''
              }`}
              style={{
                color: on ? 'rgb(255 255 255)' : available ? ink(0.74) : ink(0.22),
                border: `1px solid ${on ? ink(0.9) : nudge && available ? 'rgb(var(--sr-accent) / 0.75)' : available ? ink(0.16) : ink(0.06)}`,
                background: on
                  ? 'radial-gradient(circle at 34% 28%, rgb(255 255 255 / 0.26), rgb(var(--sr-accent) / 0.2) 55%, rgb(var(--sr-accent) / 0.08))'
                  : 'transparent',
                boxShadow: on
                  ? '0 0 16px rgb(var(--sr-accent) / 0.42), inset 0 1px 0 rgb(255 255 255 / 0.35), inset 0 -6px 10px rgb(var(--sr-accent) / 0.18)'
                  : 'none',
              }}
            >
              {label}
              {!available && (
                <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-px w-[62%] -translate-x-1/2 -translate-y-1/2 -rotate-[32deg]" style={{ background: ink(0.26) }} />
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Value first, then the price: the original figure sits small and struck
 * above, the price the piece costs now settles beneath it in full weight. The
 * ring and the line beneath it are the way to order: with a size chosen they
 * open the order request; without one they ask for a size, and the sizes
 * answer with a ring. The heart beside it is a separate thing — a favourite.
 */
export function Purchase({ product, size, onSize, onOrder, dir, saved, onSave }) {
  const [state, setState] = useState(null) // null | 'ask'
  const sizesRef = useRef(null)
  const btnRef = useRef(null)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const flash = (s, ms) => {
    setState(s)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState(null), ms)
  }
  const press = () => {
    gsap.fromTo(btnRef.current, { scale: 0.95 }, { scale: 1, duration: 0.7, ease: 'power3.out' })
    if (!size) {
      flash('ask', 1800)
      // the sizes lean toward the visitor, once — no alert
      gsap.fromTo(sizesRef.current, { x: 0 }, { keyframes: [{ x: -4, duration: 0.07 }, { x: 4, duration: 0.09 }, { x: -2, duration: 0.08 }, { x: 0, duration: 0.12 }], ease: 'power1.inOut' })
      return
    }
    onOrder(size)
  }

  // a different size (or a new piece) retires a confirmation without a reset
  const caption = size ? 'Order now →' : state === 'ask' ? 'Select a size' : 'Choose a size'
  return (
    // one row on a phone and a wide screen; on a narrow desk the sizes sit
    // above the price, so the group never reaches over the plinth
    <div className="flex items-center gap-2.5 lg:flex-col-reverse lg:items-end lg:gap-3 xl:flex-row xl:items-center xl:gap-4">
      <div className="flex items-center gap-2.5 lg:gap-3">
      <FavoriteButton active={saved} onToggle={onSave} name={product.name} />
      <div className="flex flex-col items-center">
        <button
          ref={btnRef}
          data-size
          onClick={press}
          aria-label={
            size
              ? `Order size ${size} — $${product.price}`
              : `$${product.price}${product.was ? `, was $${product.was}` : ''}. Choose a size to order`
          }
          className="relative grid h-[76px] w-[76px] shrink-0 place-content-center gap-1 rounded-full text-center transition-[border-color,box-shadow,background-color] duration-700"
          style={{
            color: ink(),
            border: `1px solid ${size ? 'rgb(var(--sr-accent) / 0.9)' : ink(0.42)}`,
            background: 'transparent',
            boxShadow: size ? '0 0 22px rgb(var(--sr-accent) / 0.3), inset 0 0 12px rgb(var(--sr-accent) / 0.12)' : 'none',
          }}
        >
          {product.was ? (
            <span data-price-was className="relative mx-auto block text-[10px] leading-none tracking-[0.06em]" style={{ color: ink(0.42) }}>
              <Roll value={`$${product.was}`} dir={dir} duration={0.5} />
              <span aria-hidden="true" className="absolute inset-x-[-2px] top-1/2 h-px -rotate-[8deg]" style={{ background: ink(0.55) }} />
            </span>
          ) : null}
          <span data-price-now className="block text-[18px] font-medium leading-none tracking-[0.02em]">
            <Roll value={`$${product.price}`} dir={dir} duration={0.55} />
          </span>
        </button>
        <button
          data-order-cta
          onClick={press}
          tabIndex={-1}
          aria-hidden="true"
          className="group/cta relative mt-2 block py-1 text-[8.5px] font-medium uppercase tracking-[0.28em] transition-colors duration-500"
          style={{ color: size ? 'rgb(var(--sr-accent))' : state === 'ask' ? ink(0.9) : ink(0.42) }}
        >
          <Roll value={caption} duration={0.45} />
          {size && <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 transition-transform duration-500 group-hover/cta:scale-x-100" style={{ background: 'rgb(var(--sr-accent))' }} />}
        </button>
      </div>
      </div>
      <div ref={sizesRef}>
        <Sizes sizes={product.sizes} selected={size} onSelect={onSize} nudge={state === 'ask' && !size} />
      </div>
    </div>
  )
}
