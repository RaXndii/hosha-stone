import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import Roll from './Roll.jsx'
import { clock, pad2 } from '../../data/showroom.js'
import FavoriteButton from './PixelHeart.jsx'
import Plate from '../ui/Plate.jsx'
import Loupe from '../ui/Loupe.jsx'
import { sound } from '../../lib/sound/index.js'

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

/**
 * The way into the photographs: a loupe — the corners of a viewfinder round a
 * small cut stone. At rest it hunts for focus now and then, by a pixel; a hand
 * near it brings the corners in on the stone and lights it; a press shuts
 * them, the light flares out through them, and the piece opens into the
 * closer look.
 */
function LookCloser({ product, onLook, onPrefetch }) {
  const ref = useRef(null)
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const enter = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { onLook(); return }
    const q = gsap.utils.selector(ref.current)
    const loupe = q('.loupe')[0]
    loupe?.classList.add('is-shut')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => loupe?.classList.remove('is-shut'), 700)
    gsap.fromTo(q('[data-look-burst]'), { scale: 0.4, opacity: 1 }, { scale: 3.2, opacity: 0, duration: 0.9, ease: 'power2.out', delay: 0.08 })
    // the opening starts as the corners shut, so the two read as one motion
    window.setTimeout(onLook, 170)
  }
  return (
    <button
      ref={ref}
      data-fade
      data-sound="none"
      onClick={enter}
      onPointerEnter={onPrefetch}
      onFocus={onPrefetch}
      aria-label={`Look closer at the ${product.name}`}
      className="group mt-5 flex items-center gap-5 py-3 text-[10.5px] font-medium uppercase tracking-[0.34em] short:mt-3 short:py-2 lg:mt-12"
      style={{ color: ink(0.82) }}
    >
      <span
        className="h-px w-[52px] origin-left transition-[width,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-[76px] group-hover:bg-[rgb(var(--sr-neon))]"
        style={{ background: ink(0.6) }}
      />
      <span className="transition-colors duration-500 group-hover:text-[rgb(var(--sr-ink))]">Look closer</span>
      <span className="relative grid h-[34px] w-[34px] place-items-center">
        <span
          data-look-burst
          aria-hidden="true"
          className="lozenge pointer-events-none absolute -inset-1 opacity-0"
          style={{ background: 'radial-gradient(closest-side, rgb(var(--sr-neon) / 0.7), rgb(var(--sr-light) / 0.16) 55%, transparent)' }}
        />
        <Loupe className="relative h-[34px] w-[34px]" />
      </span>
    </button>
  )
}

/**
 * The film, for a piece that has one: a second, quieter way in, under the
 * first. It plays from the press itself, so its sound can start with it.
 */
function WatchFilm({ film, onFilm }) {
  return (
    <button
      data-fade
      data-sound="none"
      onClick={(e) => onFilm(e.currentTarget)}
      className="group ml-[72px] flex h-11 items-center gap-3 text-[10px] font-medium uppercase tracking-[0.32em]"
      style={{ color: ink(0.72) }}
    >
      <span className="grid place-items-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110" style={{ filter: 'drop-shadow(0 0 7px rgb(var(--sr-neon) / 0.7))' }}>
        <span className="lozenge grid h-[22px] w-[22px] place-items-center" style={{ background: 'rgb(var(--sr-neon) / 0.92)' }}>
          <svg viewBox="0 0 16 16" className="ml-px h-2 w-2" style={{ color: 'rgb(var(--sr-bg0))' }} aria-hidden="true"><path d="M4.5 2.6 13 8l-8.5 5.4z" fill="currentColor" /></svg>
        </span>
      </span>
      <span className="transition-colors duration-500 group-hover:text-[rgb(var(--sr-ink))]">Watch the film</span>
      {film.duration >= 1 && <span className="tabular-nums tracking-[0.14em]" style={{ color: ink(0.4) }}>{clock(film.duration)}</span>}
    </button>
  )
}

/**
 * Who the piece is, in four lines: the house and its number, its name, the
 * line it carries, and the way in to the photographs — and to its film, if
 * it has one.
 */
export function Title({ product, onLook, onPrefetch, onFilm }) {
  return (
    <div data-quiet className="max-w-[34rem]">
      <Reveal className="text-[10.5px] font-medium uppercase tracking-[0.36em]" style={{ color: ink(0.62) }}>
        Hosha Stone / {product.number}
      </Reveal>
      <Reveal
        as="h1"
        className="mt-3 font-display text-[clamp(1.5rem,2.5vw,2.85rem)] font-normal uppercase leading-[1.12] tracking-[0.14em] short:mt-2 short:text-[1.3rem] lg:mt-5"
        style={{ color: ink() }}
      >
        {product.name}
      </Reveal>
      <Reveal as="p" className="mt-3 text-[10.5px] uppercase tracking-[0.36em] short:mt-2 lg:mt-5" style={{ color: ink(0.5) }}>
        {product.tagline}
      </Reveal>
      <LookCloser product={product} onLook={onLook} onPrefetch={onPrefetch} />
      {product.film && onFilm && <WatchFilm film={product.film} onFilm={onFilm} />}
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
      data-sound="none"
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
 * Sizes as small cut stones. Each is an octagon with a hairline edge; sold-out
 * ones are struck through and fall back, and the chosen one is lit as a gem —
 * its table and facets in the piece's accent, a polished edge, a glow, a
 * slight lift. The stone is the inner span — the button itself belongs to
 * GSAP's entrances.
 */
function Sizes({ sizes, selected, onSelect, nudge }) {
  return (
    <div className="flex flex-wrap items-center gap-1 lg:gap-1.5" role="group" aria-label="Sizes">
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
            data-sound="none"
            onClick={() => {
              if (!available) return
              sound.play(on ? 'soft' : 'bead', { index: sizes.findIndex((s) => s.label === label), count: sizes.length })
              onSelect(on ? null : label)
            }}
            className={`group grid h-11 min-w-11 place-items-center lg:h-[38px] lg:min-w-[36px] ${available ? '' : 'cursor-not-allowed'}`}
          >
            <span
              className={`relative isolate grid h-[32px] min-w-[32px] place-items-center px-1.5 text-[10.5px] font-medium tracking-[0.08em] transition-[transform,color,filter] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                on ? 'scale-[1.08]' : available ? 'group-hover:scale-[1.05] group-active:scale-95' : ''
              }`}
              style={{
                color: on ? 'rgb(255 255 255)' : available ? ink(0.74) : ink(0.22),
                filter: on ? 'drop-shadow(0 0 7px rgb(var(--sr-accent) / 0.55))' : 'none',
              }}
            >
              <Plate
                cut={6}
                lit={on}
                edge={on ? 'rgb(255 255 255 / 0.82)' : nudge && available ? 'rgb(var(--sr-accent) / 0.8)' : available ? ink(0.18) : ink(0.06)}
                edgeHi={!on && available ? ink(0.55) : undefined}
              />
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
 * above, the price the piece costs now settles beneath it in full weight, set
 * in a cut stone. The stone and the line beneath it are the way to order:
 * with a size chosen the stone lights and they open the order request;
 * without one they ask for a size, and the sizes answer with an edge of
 * light. The heart beside it is a separate thing — a favourite.
 */
export function Purchase({ product, size, onSize, onOrder, dir, saved, kept = 0, onSave, onSizeGuide }) {
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
    sound.play(size ? 'order' : 'deny')
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
    // above the price, so the group never reaches over the plinth. On a phone
    // too narrow for the row, the sizes take a line of their own rather than
    // run off the edge of the screen, where they could not be reached
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-3 lg:flex-col-reverse lg:flex-nowrap lg:items-end lg:gap-3 xl:flex-row xl:items-center xl:gap-4">
      <div className="flex items-center gap-2.5 lg:gap-3">
      <FavoriteButton active={saved} onToggle={onSave} name={product.name} count={kept} />
      {/* as wide as its longest caption, so the row stays still as the caption changes */}
      <div className="flex min-w-[100px] flex-col items-center">
        <button
          ref={btnRef}
          data-size
          data-sound="none"
          onClick={press}
          aria-label={
            size
              ? `Order size ${size} — $${product.price}`
              : `$${product.price}${product.was ? `, was $${product.was}` : ''}. Choose a size to order`
          }
          className="group relative isolate grid h-[76px] w-[76px] shrink-0 place-content-center gap-1 text-center transition-[filter] duration-700"
          style={{ color: ink(), filter: size ? 'drop-shadow(0 0 12px rgb(var(--sr-accent) / 0.38))' : 'none' }}
        >
          {/* an emerald cut in its setting: the stone's edge, and the bezel's inside it */}
          <Plate
            cut={19}
            bevel={10}
            lit={size ? 0.5 : 0}
            edge={size ? 'rgb(var(--sr-accent) / 0.95)' : ink(0.42)}
            edgeHi={size ? 'rgb(255 255 255 / 0.9)' : ink(0.7)}
          />
          <Plate cut={16.6} className="inset-1" edge={size ? 'rgb(var(--sr-accent) / 0.45)' : ink(0.12)} />
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
          data-sound="none"
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
      <div className="flex flex-col items-center lg:items-end">
        <div ref={sizesRef}>
          <Sizes sizes={product.sizes} selected={size} onSelect={onSize} nudge={state === 'ask' && !size} />
        </div>
        {onSizeGuide && (
          <button
            data-size
            data-sound="open"
            onClick={onSizeGuide}
            className="group/guide relative mt-0.5 flex h-11 items-center text-[9.5px] font-medium uppercase tracking-[0.28em] transition-colors duration-500 hover:text-[rgb(var(--sr-ink))] lg:mt-2 lg:h-auto lg:py-1 lg:text-[8.5px]"
            style={{ color: ink(0.42) }}
          >
            Size guide
            <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 transition-transform duration-500 group-hover/guide:scale-x-100" style={{ background: ink(0.6) }} />
          </button>
        )}
      </div>
    </div>
  )
}
