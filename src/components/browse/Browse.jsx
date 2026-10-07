import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ABOUT, CATEGORIES, PRODUCTS, countIn, pad2, themeVars } from '../../data/showroom.js'
import { usePage } from '../../lib/page.jsx'
import { pageHead } from '../../lib/head.js'
import { useShop } from '../../lib/shop.jsx'
import useSpotlight from '../../hooks/useSpotlight.js'
import Header from '../showroom/Header.jsx'
import { MobileMenu, SearchSheet } from '../showroom/Overlays.jsx'
import FavoriteButton from '../showroom/PixelHeart.jsx'
import Lightning from './Lightning.jsx'

/**
 * The archive: every piece in the house, in one quiet room — and, with
 * `kept`, the same room holding only the pieces this visitor saved.
 *
 * The two are one page on purpose. What someone kept is the archive narrowed
 * to their own choosing, so it should be the same room, the same cards, the
 * same cursor, and the same way of carrying a piece into the showroom. Only
 * the set of pieces and the words above them differ.
 *
 * Obsidian and charcoal, with purple only as light — a distant strike now and
 * then (Lightning), never a colour scheme. The pieces are the only bright
 * things on the page. Choosing one carries it, as it is, into its own room
 * (the showroom): the archive dims around it, it rises to where the showroom
 * hangs it, the lights go down, and the showroom brings them up again around
 * the same piece. Two chapters of one visit.
 */
const ARCHIVE = {
  bg0: [4, 3, 8],
  bg1: [11, 9, 18],
  bg2: [34, 26, 60],
  light: [200, 186, 248],
  floor: [6, 5, 11],
  neon: [150, 96, 255],
  accent: [182, 150, 250],
  glass: [222, 212, 252],
  ink: [238, 236, 244],
  ink2: [148, 142, 168],
}
const ink = (a = 1) => `rgb(var(--sr-ink) / ${a})`
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")"

// sizes, colours and seasons come from the pieces themselves, in a sensible order
const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL']
const sizeRank = (s) => (SIZE_ORDER.includes(s) ? SIZE_ORDER.indexOf(s) : 100 + (parseInt(s, 10) || 999))
const SEASON_LABELS = { 'all-season': 'All season', spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' }
const SORTS = [
  { id: 'latest', label: 'Latest' },
  { id: 'price-asc', label: 'Price — low to high' },
  { id: 'price-desc', label: 'Price — high to low' },
]
const DEFAULTS = { category: 'all', season: 'all', colour: 'all', size: 'all', sort: 'latest' }

/** Where the showroom hangs the piece — the same box its stage uses. */
function stageRect() {
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (vw >= 1024) {
    const H = Math.max(vh, 640)
    const wide = vw >= 1280
    const width = Math.min((wide ? 0.42 : 0.36) * vw, (wide ? 0.66 : 0.62) * vh)
    return { left: (vw - width) / 2, top: 0.185 * H, width, height: 0.56 * H }
  }
  const width = Math.min(0.88 * vw, 0.46 * vh)
  return { left: (vw - width) / 2, top: 0.125 * vh, width, height: 0.41 * vh }
}

/* ------------------------------------------------------------------ filters */

function Filter({ id, label, value, options, open, onOpen, onPick, align = 'left', className = '' }) {
  const panelRef = useRef(null)
  const mounted = useRef(false)
  useLayoutEffect(() => {
    const panel = panelRef.current
    const items = panel.querySelectorAll('[data-opt]')
    gsap.killTweensOf([panel, ...items])
    if (open) {
      gsap.set(panel, { visibility: 'visible' })
      gsap.fromTo(panel, { clipPath: 'inset(0% 0% 100% 0%)', y: -4 }, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 0.55, ease: 'power3.out' })
      gsap.fromTo(items, { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.45, ease: 'power3.out', stagger: 0.035, delay: 0.08 })
    } else if (mounted.current) {
      gsap.to(panel, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.35, ease: 'power2.inOut', onComplete: () => gsap.set(panel, { visibility: 'hidden' }) })
    } else gsap.set(panel, { visibility: 'hidden', clipPath: 'inset(0% 0% 100% 0%)' })
    mounted.current = true
  }, [open])

  const current = options.find((o) => o.id === value)
  return (
    <div data-filter className={`relative ${className}`}>
      <button
        onClick={() => onOpen(open ? null : id)}
        aria-expanded={open}
        aria-haspopup="true"
        className="group flex min-w-[6.5rem] flex-col items-start gap-1.5 pb-2 text-left"
      >
        <span className="text-[9px] uppercase tracking-[0.32em]" style={{ color: ink(0.42) }}>{label}</span>
        <span className="flex items-center gap-2.5 text-[10.5px] font-medium uppercase tracking-[0.22em] transition-colors duration-300 group-hover:text-[rgb(var(--sr-ink))]" style={{ color: value === DEFAULTS[id] ? ink(0.72) : ink() }}>
          {current?.short ?? current?.label}
          <svg viewBox="0 0 10 6" className="h-[5px] w-[8px] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ transform: open ? 'rotate(180deg)' : 'none' }} aria-hidden="true">
            <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="absolute inset-x-0 bottom-0 h-px" style={{ background: ink(0.12) }} />
        <span
          className="absolute bottom-0 left-0 h-px transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-full"
          style={{ width: open || value !== DEFAULTS[id] ? '100%' : '0%', background: 'rgb(var(--sr-neon) / 0.85)' }}
        />
      </button>
      <div
        ref={panelRef}
        role="menu"
        aria-label={label}
        className={`absolute top-full z-50 mt-3 min-w-[13rem] py-2 ${align === 'right' ? 'right-0' : 'left-0'}`}
        style={{ background: 'rgb(var(--sr-bg0) / 0.96)', boxShadow: `0 0 0 1px ${ink(0.1)}, 0 30px 60px -24px rgb(0 0 0 / 0.85)` }}
      >
        {options.map((o) => {
          const on = o.id === value
          return (
            <button
              key={o.id}
              data-opt
              role="menuitemradio"
              aria-checked={on}
              disabled={o.disabled}
              onClick={() => onPick(id, o.id)}
              className="group/opt flex w-full items-center gap-3 px-4 py-[8px] text-left disabled:cursor-default"
            >
              <span className="h-px shrink-0 transition-all duration-500" style={{ width: on ? '1rem' : '0.4rem', background: on ? 'rgb(var(--sr-neon))' : ink(o.disabled ? 0.12 : 0.35) }} />
              <span
                className={`flex-1 text-[10px] uppercase tracking-[0.24em] transition-colors duration-300 ${o.disabled ? '' : 'group-hover/opt:!text-[rgb(var(--sr-ink))]'}`}
                style={{ color: o.disabled ? ink(0.22) : on ? ink() : ink(0.62) }}
              >
                {o.label}
              </span>
              {o.count !== undefined && (
                <span className="text-[9px] tracking-[0.16em]" style={{ color: o.disabled ? ink(0.22) : 'rgb(var(--sr-accent) / 0.85)' }}>
                  {o.disabled ? 'Soon' : pad2(o.count)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Filters({ filters, setFilter }) {
  const [open, setOpen] = useState(null)
  useEffect(() => {
    if (!open) return
    const down = (e) => { if (!e.target.closest?.('[data-filter]')) setOpen(null) }
    const key = (e) => { if (e.key === 'Escape') setOpen(null) }
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open])
  const pick = (k, v) => { setFilter(k, v); setOpen(null) }
  const opts = {
    category: CATEGORIES.map((c) => ({ id: c.id, label: c.label, count: countIn(c.id), disabled: countIn(c.id) === 0 })),
    season: [{ id: 'all', label: 'All' }, ...Object.keys(SEASON_LABELS).filter((k) => PRODUCTS.some((p) => (p.season || 'all-season') === k)).map((k) => ({ id: k, label: SEASON_LABELS[k], count: PRODUCTS.filter((p) => (p.season || 'all-season') === k).length }))],
    colour: [{ id: 'all', label: 'All' }, ...[...new Set(PRODUCTS.map((p) => p.colour).filter(Boolean))].map((c) => ({ id: c, label: c, count: PRODUCTS.filter((p) => p.colour === c).length }))],
    size: [{ id: 'all', label: 'All' }, ...[...new Set(PRODUCTS.flatMap((p) => p.sizes.map((z) => z.label)))].sort((a, b) => sizeRank(a) - sizeRank(b)).map((s) => {
      const n = PRODUCTS.filter((p) => p.sizes.some((z) => z.label === s && z.available)).length
      return { id: s, label: s, count: n, disabled: n === 0 }
    })],
    sort: SORTS.map((s) => ({ ...s, short: s.id === 'latest' ? 'Latest' : s.id === 'price-asc' ? 'Price ↑' : 'Price ↓' })),
  }
  return (
    <div className="flex items-end gap-6 lg:gap-9">
      <Filter id="category" label="Category" value={filters.category} options={opts.category} open={open === 'category'} onOpen={setOpen} onPick={pick} />
      {/* a phone keeps the two that matter: what kind, and in what order */}
      <Filter id="season" label="Season" value={filters.season} options={opts.season} open={open === 'season'} onOpen={setOpen} onPick={pick} className="hidden lg:block" />
      <Filter id="colour" label="Colour" value={filters.colour} options={opts.colour} open={open === 'colour'} onOpen={setOpen} onPick={pick} className="hidden md:block" />
      <Filter id="size" label="Size" value={filters.size} options={opts.size} open={open === 'size'} onOpen={setOpen} onPick={pick} className="hidden md:block" />
      <Filter id="sort" label="Sort" value={filters.sort} options={opts.sort} open={open === 'sort'} onOpen={setOpen} onPick={pick} align="right" />
    </div>
  )
}

/* ------------------------------------------------------------------ a piece */

function Card({ product, saved, onSave, onSelect }) {
  const mask = {
    WebkitMaskImage: `url(${product.hero.src})`,
    maskImage: `url(${product.hero.src})`,
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
    WebkitMaskPosition: 'center bottom',
    maskPosition: 'center bottom',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
  }
  return (
    <article
      data-card
      data-id={product.id}
      className="group/card relative"
      style={{ '--card-neon': product.theme.neon.join(' ') }}
    >
      <div
        data-card-frame
        className="relative overflow-hidden transition-[box-shadow,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:bg-[rgb(var(--sr-bg1)/0.92)] group-hover/card:shadow-[inset_0_0_0_1px_rgb(var(--sr-ink)/0.17)]"
        style={{ background: 'rgb(var(--sr-bg1) / 0.84)', boxShadow: `inset 0 0 0 1px ${ink(0.06)}` }}
      >
        {/* the whole piece is the way in */}
        <button
          onClick={(e) => onSelect(product, e.currentTarget.closest('[data-card]'))}
          aria-label={`View piece: ${product.name}, $${product.price}`}
          className="absolute inset-0 z-[3] focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-[rgb(var(--sr-neon))]"
        />

        <div data-card-info className="pointer-events-none relative z-[4] flex min-h-[44px] items-center justify-between pl-3 pr-1 pt-1 sm:min-h-0 sm:px-4 sm:pt-4 lg:px-5">
          <span className="hidden text-[9px] font-medium uppercase tracking-[0.3em] transition-[letter-spacing,color] duration-700 group-hover/card:tracking-[0.34em] sm:inline" style={{ color: ink(0.5) }}>
            Hosha Stone / {product.number}
          </span>
          {/* a phone's grid is two pieces wide: the heart goes where a thumb looks for it */}
          <span data-native-cursor className="pointer-events-auto relative z-[5] order-2 ml-auto sm:hidden">
            <FavoriteButton active={saved} onToggle={onSave} name={product.name} />
          </span>
          {product.badge && (
            <span
              className="px-2 py-[3px] text-[8px] font-medium uppercase tracking-[0.26em]"
              style={
                product.badge === 'New'
                  ? { color: 'rgb(var(--sr-ink))', background: 'rgb(var(--sr-neon) / 0.32)', boxShadow: '0 0 0 1px rgb(var(--sr-neon) / 0.5)' }
                  : { color: ink(0.7), boxShadow: `0 0 0 1px ${ink(0.22)}` }
              }
            >
              {product.badge}
            </span>
          )}
        </div>

        {/* the piece in its little room */}
        <div className="relative aspect-[4/3.9]">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0" style={{ background: 'radial-gradient(70% 62% at 50% 34%, rgb(var(--sr-bg2) / 0.55), transparent 72%)' }} />
            {/* on approach, the light takes the colour of the room this piece opens into */}
            <div className="absolute inset-0 opacity-0 transition-opacity duration-1000 ease-out group-hover/card:opacity-100" style={{ background: 'radial-gradient(60% 55% at 50% 50%, rgb(var(--card-neon) / 0.13), transparent 70%)' }} />
            <div
              className="absolute left-1/2 top-[-10%] h-[90%] w-[34%] -translate-x-1/2 opacity-40 transition-opacity duration-1000 group-hover/card:opacity-90"
              style={{ background: 'radial-gradient(50% 100% at 50% 0%, rgb(var(--sr-neon) / 0.14), transparent 80%)' }}
            />
            {/* the plinth: a dark disc with a lit rim */}
            <div className="absolute bottom-[7%] left-1/2 h-[11%] w-[64%] -translate-x-1/2">
              <div className="absolute inset-0 rounded-[50%]" style={{ background: 'radial-gradient(closest-side, rgb(var(--sr-bg2) / 0.7), rgb(var(--sr-bg0) / 0.9) 80%, transparent)' }} />
              <div
                className="absolute inset-0 rounded-[50%] transition-[box-shadow,opacity] duration-1000 group-hover/card:shadow-[0_0_26px_rgb(var(--sr-neon)/0.45),inset_0_1px_0_rgb(var(--sr-neon)/0.7)]"
                style={{ boxShadow: '0 0 16px rgb(var(--sr-neon) / 0.18), inset 0 1px 0 rgb(var(--sr-neon) / 0.4)' }}
              />
            </div>
            <div className="absolute inset-x-0 bottom-0 h-[30%]" style={{ background: 'linear-gradient(to bottom, transparent, rgb(var(--sr-bg0) / 0.6))' }} />
          </div>

          {/* the garment, with the rim light the strikes give it */}
          <div className="absolute inset-x-[12%] bottom-[12.5%] top-[4%] transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:-translate-y-[1.5%] group-hover/card:scale-[1.045]">
            <img
              data-card-img
              src={product.hero.src}
              alt={product.name}
              loading="lazy"
              decoding="async"
              draggable="false"
              className="h-full w-full select-none object-contain object-bottom"
            />
            <span data-rim="l" aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ ...mask, opacity: 0, background: 'linear-gradient(90deg, rgb(196 160 255 / 0.7), rgb(var(--sr-neon) / 0.18) 12%, transparent 26%)' }} />
            <span data-rim="r" aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ ...mask, opacity: 0, background: 'linear-gradient(270deg, rgb(196 160 255 / 0.7), rgb(var(--sr-neon) / 0.18) 12%, transparent 26%)' }} />
          </div>

          {/* view piece — appears as the hand arrives */}
          <span
            data-card-info
            aria-hidden="true"
            className="pointer-events-none absolute bottom-[3%] left-1/2 z-[4] flex -translate-x-1/2 translate-y-1 items-center gap-2 whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.3em] opacity-0 transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100"
            style={{ color: ink(0.9) }}
          >
            View piece
            <span className="grid h-[16px] w-[16px] place-items-center rounded-full text-[10px] leading-none" style={{ boxShadow: '0 0 0 1px rgb(var(--sr-neon) / 0.8)' }}>+</span>
          </span>
        </div>

        <div data-card-info className="pointer-events-none relative z-[4] flex items-end justify-between gap-3 px-3 pb-3.5 pt-1 sm:px-4 sm:pb-4 lg:px-5">
          <div className="pointer-events-none min-w-0 opacity-[0.88] transition-opacity duration-700 group-hover/card:opacity-100 sm:opacity-[0.82]">
            <p className="truncate text-[10.5px] font-medium uppercase tracking-[0.12em] transition-[letter-spacing] duration-700 group-hover/card:tracking-[0.23em] sm:tracking-[0.2em]" style={{ color: ink() }}>
              {product.name}
            </p>
            <p className="mt-1.5 flex items-baseline gap-2 text-[11px] tracking-[0.08em]" style={{ color: ink(0.86) }}>
              ${product.price}
              {product.was ? <span className="text-[9.5px] line-through" style={{ color: ink(0.36) }}>${product.was}</span> : null}
            </p>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <span className="pointer-events-none flex items-center gap-2" aria-label="Sizes">
              {product.sizes.map((s) => (
                <span
                  key={s.label}
                  className="relative text-[9px] font-medium tracking-[0.1em] transition-colors duration-700"
                  style={{ color: s.available ? ink(0.62) : ink(0.2) }}
                  title={s.available ? undefined : 'Sold out'}
                >
                  {s.label}
                  {!s.available && <span aria-hidden="true" className="absolute left-[-15%] top-1/2 h-px w-[130%] -rotate-[24deg]" style={{ background: ink(0.28) }} />}
                </span>
              ))}
            </span>
            <span data-native-cursor className="pointer-events-auto relative z-[5] -m-1.5 scale-[0.82]">
              <FavoriteButton active={saved} onToggle={onSave} name={product.name} />
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

/* ------------------------------------------------------------------ cursor */

/** Over a piece, a small "View" ring takes the cursor's place; elsewhere the page keeps the ordinary one. */
function useCardCursor(zoneRef, cursorRef, enabled) {
  const enabledRef = useRef(enabled)
  useEffect(() => { enabledRef.current = enabled }, [enabled])
  useEffect(() => {
    const zone = zoneRef.current
    const cursor = cursorRef.current
    if (!zone || !cursor) return
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const ring = cursor.firstElementChild
    const s = { on: false, mx: 0, my: 0, x: 0, y: 0, h: 0 }
    let raf = 0
    const tick = () => {
      const active = s.on && enabledRef.current
      s.h += ((active ? 1 : 0) - s.h) * 0.16
      s.x += (s.mx - s.x) * 0.26
      s.y += (s.my - s.y) * 0.26
      cursor.style.transform = `translate3d(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px, 0)`
      cursor.style.opacity = s.h.toFixed(3)
      ring.style.transform = `translate(-50%, -50%) scale(${(0.45 + s.h * 0.55).toFixed(3)})`
      if (!active && s.h < 0.004) { cursor.style.opacity = '0'; raf = 0; return }
      raf = requestAnimationFrame(tick)
    }
    const wake = () => { if (!raf) raf = requestAnimationFrame(tick) }
    const move = (e) => {
      if (e.pointerType !== 'mouse') return
      const over = !!e.target.closest?.('[data-card]') && !e.target.closest?.('[data-native-cursor]')
      if (over && s.h < 0.02) { s.x = e.clientX; s.y = e.clientY }
      s.mx = e.clientX
      s.my = e.clientY
      s.on = over
      wake()
    }
    const leave = () => { s.on = false; wake() }
    zone.addEventListener('pointermove', move, { passive: true })
    zone.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(raf)
      zone.removeEventListener('pointermove', move)
      zone.removeEventListener('pointerleave', leave)
    }
  }, [zoneRef, cursorRef])
}

/* ------------------------------------------------------------------ the page */

export default function Browse({ kept = false }) {
  const { go } = usePage()
  const { bag, saved, kept: keptPieces, toggleSaved } = useShop()
  const rootRef = useRef(null)
  const gridRef = useRef(null)
  const cursorRef = useRef(null)
  const flyRef = useRef(null)
  const veilRef = useRef(null)
  const leaving = useRef(false)
  const [overlay, setOverlay] = useState(null)
  const [filters, setFilters] = useState(DEFAULTS)
  const [vars] = useState(() => ({ ...themeVars(ARCHIVE), '--vx-a': 'var(--sr-neon)', '--vx-b': 'var(--sr-light)', '--drawer-bg': 'rgb(var(--sr-bg0) / 0.97)' }))

  useSpotlight(rootRef)
  useCardCursor(gridRef, cursorRef, !overlay)

  const setFilter = useCallback((k, v) => setFilters((f) => ({ ...f, [k]: v })), [])
  const list = useMemo(() => {
    // kept: the visitor's own pieces, in the order the house lists them —
    // their choosing is the only filter that applies
    if (kept) return keptPieces
    const out = PRODUCTS.filter((p) =>
      (filters.category === 'all' || p.category === filters.category) &&
      (filters.season === 'all' || (p.season || 'all-season') === filters.season) &&
      (filters.colour === 'all' || p.colour === filters.colour) &&
      (filters.size === 'all' || p.sizes.some((s) => s.label === filters.size && s.available)),
    )
    // newest first: when it was published, then its number
    if (filters.sort === 'latest') out.sort((a, b) => String(b.added ?? '').localeCompare(String(a.added ?? '')) || b.number.localeCompare(a.number, undefined, { numeric: true }))
    if (filters.sort === 'price-asc') out.sort((a, b) => a.price - b.price)
    if (filters.sort === 'price-desc') out.sort((a, b) => b.price - a.price)
    return out
  }, [filters, kept, keptPieces])
  // the grid re-lays-out when the filters change; on the kept page the set
  // only ever loses a piece, which needs no new layout
  const signature = kept ? 'kept' : Object.keys(DEFAULTS).map((k) => filters[k]).join('|')
  const filtered = !kept && signature !== Object.values(DEFAULTS).join('|')

  useEffect(() => { pageHead(kept ? 'saved' : 'browse') }, [kept])

  /* ---------------------------------------------- arrival */
  useLayoutEffect(() => {
    const root = rootRef.current
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root)
      const tl = gsap.timeline({ delay: 0.15 })
      tl.fromTo(q('[data-intro]'), { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.04 }, 0)
      tl.fromTo(q('[data-title-line]'), { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08 }, 0.1)
      tl.fromTo(q('[data-browse-meta]'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.06 }, 0.35)
    }, root)
    return () => ctx.revert()
  }, [])

  // pieces arrive as they come into view: a little rise, slowly, once
  useLayoutEffect(() => {
    const cards = [...gridRef.current.querySelectorAll('[data-card]')]
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.set(cards, { opacity: 0, y: 26 })
    let batch = []
    let flushT = 0
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return
        io.unobserve(e.target)
        batch.push(e.target)
      })
      window.clearTimeout(flushT)
      flushT = window.setTimeout(() => {
        gsap.to(batch, { opacity: 1, y: 0, duration: 1.15, ease: 'power3.out', stagger: 0.09, delay: 0.25 })
        batch = []
      }, 16)
    // a row peeking over the bottom edge is shown, not held back: on a phone
    // that sliver is the only sign there is more below
    }, { rootMargin: '0px' })
    cards.forEach((c) => io.observe(c))
    return () => { io.disconnect(); window.clearTimeout(flushT) }
  }, [signature])

  /* ---------------------------------------------- choosing a piece */
  const select = useCallback((product, card) => {
    if (leaving.current || !card) return
    leaving.current = true
    setOverlay(null)
    const img = card.querySelector('[data-card-img]')
    const from = img.getBoundingClientRect()
    const to = stageRect()
    const fly = flyRef.current
    const flyImg = fly.querySelector('img')
    const veil = veilRef.current
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const enter = () => go('piece', { id: product.id, entry: 'browse', cut: true })
    if (reduced) { enter(); return }

    flyImg.src = product.hero.src
    fly.style.setProperty('--fly-neon', product.theme.neon.join(' '))
    veil.style.background = `rgb(${product.theme.bg0.join(' ')})`
    gsap.set(fly, { left: from.left, top: from.top, width: from.width, height: from.height, visibility: 'visible' })
    gsap.set(flyImg, { filter: 'brightness(1)' })
    gsap.set(img, { opacity: 0 })

    const others = [...rootRef.current.querySelectorAll('[data-card]')].filter((c) => c !== card)
    const tl = gsap.timeline({ onComplete: enter })
    // the archive steps back from the chosen piece
    tl.to(others, { opacity: 0.05, y: 8, duration: 0.75, ease: 'power2.out', stagger: 0.025 }, 0)
    tl.to(rootRef.current.querySelectorAll('[data-browse-chrome]'), { opacity: 0, duration: 0.55, ease: 'power2.out' }, 0)
    tl.to(card.querySelectorAll('[data-card-info]'), { opacity: 0, duration: 0.35, ease: 'power2.out' }, 0)
    tl.to(card.querySelector('[data-card-frame]'), { backgroundColor: 'rgba(0,0,0,0)', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0)', duration: 0.6 }, 0.1)
    // the room this piece belongs to begins to close in around it
    tl.to(veil, { opacity: 1, duration: 1.0, ease: 'power2.inOut' }, 0.3)
    tl.fromTo(fly.querySelector('[data-fly-glow]'), { opacity: 0 }, { opacity: 1, duration: 0.9, ease: 'power2.out' }, 0.35)
    // the piece rises to where its room will hang it…
    tl.to(fly, { left: to.left, top: to.top, width: to.width, height: to.height, duration: 1.25, ease: 'power3.inOut' }, 0.2)
    // …and the lights go down, to come up again in the showroom
    tl.to(flyImg, { filter: 'brightness(0.22)', duration: 0.5, ease: 'power2.in' }, 1.2)
    tl.to(fly.querySelector('[data-fly-glow]'), { opacity: 0, duration: 0.5, ease: 'power2.in' }, 1.2)
  }, [go])

  // from search: the piece is found in the archive and chosen from where it sits
  const pickFromSearch = useCallback((id) => {
    setOverlay(null)
    const find = () => gridRef.current?.querySelector(`[data-card][data-id="${id}"]`)
    const run = () => {
      const card = find()
      if (!card) { go('piece', { id }); return }

      card.scrollIntoView({ block: 'center' })
      window.setTimeout(() => select(PRODUCTS.find((p) => p.id === id), card), 380)
    }
    if (find()) run()
    else if (kept) go('piece', { id })
    else { setFilters(DEFAULTS); window.setTimeout(run, 120) }
  }, [go, select, kept])

  const onNav = (id) => {
    if (id === 'collections') { setOverlay(id === overlay ? null : id); return }
    setOverlay(null)
    // asking for the room you are already in means the top of it
    if (id === (kept ? 'saved' : 'browse')) { window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    go(id)
  }
  // a collection is a view of the archive, so choosing one from the kept room goes there
  const onCategory = (id) => {
    setOverlay(null)
    if (kept) { go('browse'); return }
    setFilter('category', id)
  }

  return (
    <div
      ref={rootRef}
      className="relative min-h-[100svh] overflow-x-hidden"
      style={{ ...vars, background: 'rgb(var(--sr-bg0))', color: 'rgb(var(--sr-ink))' }}
    >
      {/* the obsidian room */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(90% 60% at 50% -6%, rgb(var(--sr-bg2) / 0.55), transparent 62%), linear-gradient(to bottom, rgb(var(--sr-bg1)), rgb(var(--sr-bg0)) 58%, rgb(var(--sr-floor)))' }} />
        {/* the faint standing light, breathing */}
        <div className="absolute left-[54%] top-[-8%] h-[78%] w-[16%] -translate-x-1/2" style={{ background: 'radial-gradient(50% 100% at 50% 0%, rgb(var(--sr-neon) / 0.13), transparent 82%)', animation: 'neon-breathe 9s ease-in-out infinite' }} />
        {/* polished stone underfoot, catching a little of it */}
        <div className="absolute inset-x-0 bottom-0 h-[30%]" style={{ background: 'radial-gradient(60% 70% at 52% 100%, rgb(var(--sr-neon) / 0.07), transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.35]" style={{ background: 'linear-gradient(118deg, transparent 46%, rgb(var(--sr-glass) / 0.025) 48%, transparent 52%), linear-gradient(64deg, transparent 70%, rgb(var(--sr-glass) / 0.02) 71%, transparent 74%)' }} />
        <div className="absolute left-[-10%] top-[55%] h-[40%] w-[70%] will-change-transform" style={{ background: 'radial-gradient(closest-side, rgb(var(--sr-light) / 0.035), transparent)', animation: 'fog-drift 38s ease-in-out infinite' }} />
        <div className="absolute -inset-[12%] opacity-[0.045]" style={{ backgroundImage: GRAIN, animation: 'grain-shift 8s steps(5) infinite' }} />
      </div>
      <Lightning rootRef={rootRef} />

      <div data-browse-chrome className="relative z-40">
        <Header
          onHome={() => go('home', { entry: 'return' })}
          onNav={onNav}
          onSearch={() => setOverlay('search')}
          onMenu={() => setOverlay('menu')}
          active={overlay === 'collections' ? 'collections' : kept ? 'saved' : 'browse'}
          category={filters.category}
          onCategory={onCategory}
          onCloseCategories={() => setOverlay((o) => (o === 'collections' ? null : o))}
          bag={bag}
          saved={keptPieces.length}
        />
      </div>

      <main id="main" tabIndex={-1} className="relative z-10 px-5 pb-16 lg:px-12">
        {/* title and filters */}
        <div data-browse-chrome className="relative z-20 flex flex-col gap-8 pt-6 lg:flex-row lg:items-end lg:justify-between lg:pt-10">
          <div>
            {list.length > 0 && (
              <p data-browse-meta className="text-[10px] tracking-[0.34em]" style={{ color: ink(0.5) }}>
                / {pad2(1)} — {pad2(list.length)}
              </p>
            )}
            <h1 className="mt-4 overflow-hidden font-display text-[clamp(2.6rem,6vw,5rem)] font-normal uppercase leading-[0.95] tracking-[0.12em]">
              <span data-title-line className="block">{kept ? 'Kept' : 'Archive'}</span>
            </h1>
            <p data-browse-meta className="mt-4 text-[10px] uppercase tracking-[0.34em]" style={{ color: ink(0.46) }}>
              {kept ? 'The pieces you kept, waiting where you left them.' : 'Every piece in the house. Choose one to enter its room.'}
            </p>
          </div>
          {!kept && (
            <div data-browse-meta className="flex items-end justify-between gap-6">
              <Filters filters={filters} setFilter={setFilter} />
            </div>
          )}
        </div>

        {/* the pieces */}
        <section
          ref={gridRef}
          key={signature}
          aria-label="Pieces"
          className="card-zone relative mt-8 grid grid-cols-2 gap-x-3 gap-y-4 sm:mt-10 sm:gap-4 lg:mt-12 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4"
        >
          {list.map((p) => (
            <Card
              key={p.id}
              product={p}
              saved={saved.includes(p.id)}
              onSave={(on) => toggleSaved(p.id, on)}
              onSelect={select}
            />
          ))}
          {list.length === 0 && (
            <div className="col-span-full py-24 text-center">
              <p className="font-display text-xl italic" style={{ color: ink(0.6) }}>
                {kept ? 'Nothing kept yet.' : 'Nothing in the archive matches yet.'}
              </p>
              {kept && (
                <p className="mx-auto mt-4 max-w-sm text-[10px] uppercase leading-[2] tracking-[0.3em]" style={{ color: ink(0.4) }}>
                  The heart on a piece keeps it here, for whenever you come back.
                </p>
              )}
              <button
                onClick={() => (kept ? go('browse') : setFilters(DEFAULTS))}
                className="mt-6 text-[10px] uppercase tracking-[0.3em] underline underline-offset-[6px]"
                style={{ color: ink(0.75) }}
              >
                {kept ? 'Go to the archive' : 'Clear the filters'}
              </button>
            </div>
          )}
        </section>

        <footer data-browse-chrome className="mt-14 flex items-center justify-between gap-6">
          <span className="flex items-center gap-4 text-[9.5px] uppercase tracking-[0.34em]" style={{ color: ink(0.42) }}>
            {ABOUT.motto}
            <span className="hidden h-px w-24 sm:block" style={{ background: ink(0.16) }} />
          </span>
          <span className="flex items-center gap-5 text-[9.5px] uppercase tracking-[0.3em]" style={{ color: ink(0.5) }}>
            {filtered && (
              <button onClick={() => setFilters(DEFAULTS)} className="underline-offset-[6px] transition-colors duration-300 hover:text-[rgb(var(--sr-ink))] hover:underline">
                Clear filters
              </button>
            )}
            {list.length > 0 && `${pad2(list.length)} ${list.length === 1 ? 'piece' : 'pieces'}${kept ? ' kept' : ''}`}
          </span>
        </footer>
      </main>

      {/* the chosen piece, carried into its room */}
      <div ref={veilRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[65]" style={{ opacity: 0 }} />
      <div ref={flyRef} aria-hidden="true" className="pointer-events-none fixed z-[70]" style={{ visibility: 'hidden' }}>
        <div data-fly-glow className="absolute inset-[-25%]" style={{ opacity: 0, background: 'radial-gradient(closest-side, rgb(var(--fly-neon, 150 96 255) / 0.18), transparent 70%)' }} />
        <img alt="" className="relative h-full w-full object-contain object-bottom" />
      </div>

      {/* the ring that stands in for the cursor over a piece */}
      <div ref={cursorRef} aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-[55] hidden lg:block" style={{ opacity: 0 }}>
        <div
          className="grid h-[74px] w-[74px] place-items-center rounded-full"
          style={{ transform: 'translate(-50%, -50%) scale(0.45)', border: '1px solid rgb(var(--sr-ink) / 0.5)', background: 'rgb(var(--sr-bg0) / 0.25)' }}
        >
          <span className="pl-[0.34em] text-[8.5px] font-medium uppercase tracking-[0.34em]" style={{ color: 'rgb(var(--sr-ink))' }}>View</span>
        </div>
      </div>

      <SearchSheet
        open={overlay === 'search'}
        onClose={() => setOverlay(null)}
        onPick={pickFromSearch}
        onCategory={onCategory}
      />
      <MobileMenu
        open={overlay === 'menu'}
        onClose={() => setOverlay(null)}
        onNav={onNav}
        category={filters.category}
        onCategory={onCategory}
      />
    </div>
  )
}
