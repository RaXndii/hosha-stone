import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { CATEGORIES, countIn, pad2 } from '../../data/showroom.js'
import { INSTAGRAM, WHATSAPP } from '../../data/order.js'
import { PixelHeart } from './PixelHeart.jsx'
import { useSound } from '../../lib/sound/index.js'
import Plate from '../ui/Plate.jsx'

/**
 * The favourites count: a small pixel heart that lights and pops when a piece
 * is saved. It lives in the header, so a save is acknowledged without a popup.
 */
function Saved({ count, className = '', onOpen }) {
  const ref = useRef(null)
  const last = useRef(count)
  useEffect(() => {
    if (count > last.current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.timeline()
        .to(ref.current, { scale: 0.7, duration: 0.08, ease: 'power2.in' })
        .to(ref.current, { scale: 1.45, duration: 0.14, ease: 'power2.out' })
        .to(ref.current, { scale: 1, duration: 0.35, ease: 'power3.out' })
    }
    last.current = count
  }, [count])
  return (
    <button
      onClick={onOpen}
      aria-label={count ? `Kept — ${count} ${count === 1 ? 'piece' : 'pieces'}` : 'Kept — nothing yet'}
      title={count ? `${count} kept` : 'Kept'}
      className={`h-11 min-w-11 items-center justify-center gap-1.5 text-[10px] font-medium tabular-nums tracking-[0.1em] transition-colors duration-500 hover:text-[rgb(var(--sr-ink))] lg:h-auto lg:min-w-0 ${className}`}
      style={{ color: count ? 'rgb(var(--sr-ink) / 0.9)' : 'rgb(var(--sr-ink) / 0.45)' }}
    >
      <span ref={ref} className="block">
        <PixelHeart filled={count > 0} className="h-[11px] w-[12px]" />
      </span>
      <span className="min-w-[1ch]">{count || ''}</span>
    </button>
  )
}

/**
 * The sound switch: four thin bars. They move while sound is playing, stand
 * still at half height when it is on but has not started (it starts at the
 * first touch), and lie flat when it is off.
 */
export function SoundToggle({ className = '', label = false }) {
  const { on, playing, toggle } = useSound()
  return (
    <button
      data-sound="none"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? 'Sound on — turn it off' : 'Sound off — turn it on'}
      title={on ? 'Sound on' : 'Sound off'}
      className={`group items-center justify-center gap-3 transition-colors duration-500 hover:text-[rgb(var(--sr-ink))] ${className}`}
      style={{ color: on ? 'rgb(var(--sr-ink) / 0.85)' : 'rgb(var(--sr-ink) / 0.42)' }}
    >
      <span aria-hidden="true" className="flex h-[14px] items-end gap-[2.5px]">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`sound-bar block h-full w-[2px] ${playing ? 'is-playing' : ''}`}
            style={{ '--i': i, background: 'currentColor', transform: `scaleY(${on ? [0.45, 0.8, 0.6, 0.35][i] : 0.14})` }}
          />
        ))}
      </span>
      {label && <span className="text-[11px] uppercase tracking-[0.3em]">{on ? 'Sound on' : 'Sound off'}</span>}
    </button>
  )
}

function WhatsApp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[19px] w-[19px]">
      <path d="M3.6 20.4l1.3-4.2A8.1 8.1 0 1 1 8 19.2l-4.4 1.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9.3 8.6c.2-.5.4-.5.6-.5h.4c.2 0 .4 0 .6.4l.6 1.5c.1.2.1.4 0 .5l-.3.5c-.1.2-.2.3-.1.5.4.7 1.1 1.5 1.9 1.9.2.1.3 0 .5-.1l.4-.5c.2-.2.3-.2.5-.1l1.4.7c.2.1.3.3.3.4v.5c0 .5-.4.8-.8 1-.5.2-1 .2-1.9-.1a8.4 8.4 0 0 1-4.2-3.9c-.4-.9-.4-1.5-.2-2Z" fill="currentColor" />
    </svg>
  )
}
function Instagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[19px] w-[19px]">
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.8" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="3.8" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="17.3" cy="6.7" r="1.05" fill="currentColor" />
    </svg>
  )
}
export function Glass({ className = 'h-[15px] w-[15px]' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="10.6" cy="10.6" r="6.6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15.6 15.6 21 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** A plus whose upright folds away: the whole "open / close" vocabulary in two hairlines. */
export function PlusMinus({ open, className = 'h-[7px] w-[7px]' }) {
  return (
    <span aria-hidden="true" className={`relative inline-block shrink-0 ${className}`}>
      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2" style={{ background: 'currentColor' }} />
      <span
        className="absolute left-1/2 top-0 h-full w-px transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ background: 'currentColor', transform: `translateX(-50%) rotate(${open ? 90 : 0}deg) scaleY(${open ? 0 : 1})` }}
      />
    </span>
  )
}

/**
 * Categories, as a quiet index card that unfolds beneath the word rather than
 * a sheet across the page. The card is uncovered from the top (a clip, not a
 * slide), and the entries come into focus one after another.
 */
function CategoryMenu({ open, category, onToggle, onClose, onPick }) {
  const wrapRef = useRef(null)
  const panelRef = useRef(null)
  const mounted = useRef(false)
  const closeRef = useRef(onClose)
  useLayoutEffect(() => { closeRef.current = onClose })

  useLayoutEffect(() => {
    const panel = panelRef.current
    const items = panel.querySelectorAll('[data-cat-item]')
    gsap.killTweensOf([panel, ...items])
    if (open) {
      gsap.set(panel, { visibility: 'visible' })
      gsap.fromTo(panel, { clipPath: 'inset(0% 0% 100% 0%)', y: -6 }, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 0.65, ease: 'power3.out' })
      gsap.fromTo(
        items,
        { opacity: 0, y: -5, filter: 'blur(3px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.55, ease: 'power3.out', stagger: 0.04, delay: 0.1, clearProps: 'filter' },
      )
    } else if (mounted.current) {
      gsap.to(items, { opacity: 0, duration: 0.2, ease: 'power1.in' })
      gsap.to(panel, {
        clipPath: 'inset(0% 0% 100% 0%)',
        y: -4,
        duration: 0.42,
        ease: 'power2.inOut',
        onComplete: () => gsap.set(panel, { visibility: 'hidden' }),
      })
    } else {
      gsap.set(panel, { visibility: 'hidden', clipPath: 'inset(0% 0% 100% 0%)' })
    }
    mounted.current = true
  }, [open])

  useEffect(() => {
    if (!open) return
    const down = (e) => { if (!wrapRef.current?.contains(e.target)) closeRef.current() }
    const key = (e) => { if (e.key === 'Escape') closeRef.current() }
    document.addEventListener('pointerdown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open])

  const current = CATEGORIES.find((c) => c.id === category)
  return (
    <div ref={wrapRef} className="relative">
      <button
        data-intro
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="true"
        className="group relative flex items-center gap-2.5 py-2 text-[11px] font-medium uppercase tracking-[0.24em] transition-colors duration-300"
        style={{ color: open ? 'rgb(var(--sr-ink))' : 'rgb(var(--sr-ink) / 0.62)' }}
      >
        <span className="transition-colors duration-300 group-hover:text-[rgb(var(--sr-ink))]">Collections</span>
        {category !== 'all' && (
          <span className="text-[9px] tracking-[0.2em]" style={{ color: 'rgb(var(--sr-accent))' }}>{current?.label}</span>
        )}
        <span className="transition-colors duration-300 group-hover:text-[rgb(var(--sr-ink))]">
          <PlusMinus open={open} />
        </span>
        <span
          className="absolute -bottom-0.5 left-1/2 h-px -translate-x-1/2 transition-all duration-500 ease-out group-hover:w-full"
          style={{ width: open ? '100%' : '0%', background: 'rgb(var(--sr-ink) / 0.85)' }}
        />
      </button>

      {/* the card hangs from the word; the outer box centres it, the inner one moves */}
      <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-4 w-[15.5rem] -translate-x-1/2">
        <div
          ref={panelRef}
          role="menu"
          aria-label="Collections"
          className="pointer-events-auto pb-3"
          style={{
            background: 'rgb(var(--sr-bg0) / 0.94)',
            boxShadow: '0 0 0 1px rgb(var(--sr-ink) / 0.1), 0 30px 60px -24px rgb(0 0 0 / 0.8)',
          }}
        >
          <span className="block h-px w-full" style={{ background: 'linear-gradient(to right, transparent, rgb(var(--sr-accent) / 0.8), transparent)' }} />
          <p data-cat-item className="px-5 pb-2 pt-4 text-[8.5px] uppercase tracking-[0.36em]" style={{ color: 'rgb(var(--sr-ink) / 0.4)' }}>
            Browse the house
          </p>
          {CATEGORIES.map((c) => {
            const n = countIn(c.id)
            const on = c.id === category
            const empty = n === 0
            return (
              <button
                key={c.id}
                data-cat-item
                role="menuitemradio"
                aria-checked={on}
                disabled={empty}
                onClick={() => onPick(c.id)}
                className="group/item flex w-full items-center gap-3 px-5 py-[9px] text-left disabled:cursor-default"
              >
                <span
                  className={`h-px shrink-0 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${empty ? '' : 'group-hover/item:!w-5'}`}
                  style={{
                    width: on ? '1.25rem' : '0.5rem',
                    background: on ? 'rgb(var(--sr-accent))' : empty ? 'rgb(var(--sr-ink) / 0.15)' : 'rgb(var(--sr-ink) / 0.4)',
                  }}
                />
                <span
                  className={`flex-1 text-[10.5px] uppercase tracking-[0.26em] transition-colors duration-300 ${empty ? '' : 'group-hover/item:!text-[rgb(var(--sr-ink))]'}`}
                  style={{ color: empty ? 'rgb(var(--sr-ink) / 0.25)' : on ? 'rgb(var(--sr-ink))' : 'rgb(var(--sr-ink) / 0.66)' }}
                >
                  {c.label}
                </span>
                <span className="text-[9px] tracking-[0.18em]" style={{ color: empty ? 'rgb(var(--sr-ink) / 0.25)' : 'rgb(var(--sr-accent) / 0.85)' }}>
                  {empty ? 'Soon' : pad2(n)}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const LINKS = [
  { id: 'browse', label: 'Browsing' },
  { id: 'collections', label: 'Collections' },
  { id: 'story', label: 'Story' },
]

/**
 * Social icons get the shared .vx response (it blooms from the pointer, tinted
 * with the garment's accent); nav links get an underline that grows from the
 * centre. The active link keeps its underline — "you are here".
 */
export default function Header({ onHome, onNav, onSearch, onMenu, active, category, onCategory, onCloseCategories, bag, saved = 0 }) {
  return (
    <header data-quiet-soft className="relative z-40 flex h-[72px] items-center justify-between px-5 lg:h-[88px] lg:px-12">
      <button
        data-intro
        onClick={onHome}
        aria-label="Hosha Stone — home"
        className="group relative whitespace-nowrap py-3 font-display text-[17px] tracking-[0.3em] max-[389px]:text-[15px] max-[389px]:tracking-[0.22em] lg:py-0 lg:text-[21px]"
        style={{ color: 'rgb(var(--sr-ink))' }}
      >
        HOSHA STONE
        <span
          className="absolute -bottom-1 left-0 h-px w-0 transition-all duration-500 group-hover:w-full"
          style={{ background: 'rgb(var(--sr-ink) / 0.6)' }}
        />
      </button>

      <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 lg:flex lg:gap-9 xl:gap-[4.6vw]">
        {LINKS.map((l) => {
          if (l.id === 'collections') {
            return (
              <CategoryMenu
                key={l.id}
                open={active === 'collections'}
                category={category}
                onToggle={() => onNav('collections')}
                onClose={onCloseCategories}
                onPick={onCategory}
              />
            )
          }
          const on = active === l.id
          return (
            <button
              key={l.id}
              data-intro
              onClick={() => onNav(l.id)}
              aria-current={on || undefined}
              className="group relative py-2 text-[11px] font-medium uppercase tracking-[0.24em] transition-colors duration-300"
              style={{ color: on ? 'rgb(var(--sr-ink))' : 'rgb(var(--sr-ink) / 0.62)' }}
            >
              <span className="transition-colors duration-300 group-hover:text-[rgb(var(--sr-ink))]">{l.label}</span>
              <span
                className="absolute -bottom-0.5 left-1/2 h-px -translate-x-1/2 transition-all duration-500 ease-out group-hover:w-full"
                style={{
                  width: on ? '100%' : '0%',
                  background: 'rgb(var(--sr-ink) / 0.85)',
                }}
              />
            </button>
          )
        })}
      </nav>

      <div className="relative flex items-center gap-0.5 lg:gap-4">
        {[
          { label: 'Instagram', Icon: Instagram, href: `https://instagram.com/${INSTAGRAM}` },
          { label: 'WhatsApp', Icon: WhatsApp, href: `https://wa.me/${WHATSAPP}` },
        ].map(({ label, Icon, href }) => (
          <a
            key={label}
            data-intro
            data-vx
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={label}
            title={label}
            className="vx group hidden h-10 w-10 place-items-center transition-colors duration-300 lg:grid"
            style={{ color: 'rgb(var(--sr-ink) / 0.78)' }}
          >
            <Plate cut={11} edge="rgb(var(--sr-ink) / 0)" edgeHi="rgb(var(--sr-ink) / 0.3)" />
            <span className="transition-[filter] duration-300 group-hover:brightness-150">
              <Icon />
            </span>
          </a>
        ))}

        <span data-intro className="hidden lg:inline-flex"><Saved count={saved} onOpen={() => onNav('saved')} className="inline-flex" /></span>
        <span data-intro className="hidden lg:inline-flex"><SoundToggle className="flex h-10 w-10" /></span>

        <span data-intro className="mx-1 hidden h-7 w-px lg:block" style={{ background: 'rgb(var(--sr-ink) / 0.4)' }} />

        {/* search reads as a field, not a button: an underline waiting to be written on */}
        <button
          data-intro
          data-vx
          data-sound="none"
          onClick={onSearch}
          aria-label="Search"
          className="vx group relative hidden h-10 w-[104px] items-center justify-between rounded-sm px-1 lg:flex xl:w-[150px]"
        >
          <span className="text-[10px] uppercase tracking-[0.26em] transition-colors duration-300" style={{ color: 'rgb(var(--sr-ink) / 0.45)' }}>
            Search
          </span>
          <span className="transition-transform duration-500 group-hover:-rotate-12 group-hover:scale-110" style={{ color: 'rgb(var(--sr-ink) / 0.85)' }}>
            <Glass />
          </span>
          <span className="absolute inset-x-0 bottom-1.5 h-px origin-left transition-transform duration-500 group-hover:scale-x-100" style={{ background: 'rgb(var(--sr-ink) / 0.35)' }} />
          <span className="absolute inset-x-0 bottom-1.5 h-px origin-left scale-x-0 transition-transform duration-700 ease-out group-hover:scale-x-100" style={{ background: 'rgb(var(--sr-accent))' }} />
        </button>

        {/* the bag count sits in the margin, so its arrival moves nothing else */}
        <span
          aria-hidden={bag === 0}
          className="facet absolute -right-8 top-1/2 hidden h-5 min-w-5 place-items-center px-1 text-[9.5px] font-semibold transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [--cut:5px] lg:grid"
          style={{
            background: 'rgb(var(--sr-accent))',
            color: 'rgb(var(--sr-bg0))',
            opacity: bag > 0 ? 1 : 0,
            transform: `translateY(-50%) scale(${bag > 0 ? 1 : 0.4})`,
          }}
          title={`${bag} in your bag`}
        >
          {bag || ''}
        </span>

        {/* phone: search and a menu that holds everything else */}
        <Saved count={saved} onOpen={() => onNav('saved')} className="inline-flex px-1 lg:hidden" />
        <SoundToggle className="flex h-11 w-11 max-[359px]:hidden lg:hidden" />
        <button
          data-sound="none"
          onClick={onSearch}
          aria-label="Search"
          className="grid h-11 w-11 place-items-center lg:hidden"
          style={{ color: 'rgb(var(--sr-ink) / 0.85)' }}
        >
          <Glass className="h-[18px] w-[18px]" />
        </button>
        <button
          data-sound="none"
          onClick={onMenu}
          aria-label="Menu"
          className="-mr-2 grid h-11 w-11 place-items-center lg:hidden"
          style={{ color: 'rgb(var(--sr-ink) / 0.85)' }}
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none">
            <path d="M4 8h16M4 16h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  )
}
