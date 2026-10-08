import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { CATEGORIES, PRODUCTS, countIn, themeVars } from '../../data/showroom.js'
import { AllSoundToggle, Glass, PlusMinus, SoundToggle } from './Header.jsx'
import { INSTAGRAM, WHATSAPP } from '../../data/order.js'
import { sound } from '../../lib/sound/index.js'
import { rest } from '../../lib/rest.js'

/**
 * Shared open/close motion: a scrim and a sheet that drops from the header.
 * onHidden fires once the sheet has fully left — the moment to reset its
 * contents, out of sight.
 */
function useSheet(open, scrimRef, sheetRef, from = -18, onHidden) {
  const mounted = useRef(false)
  const hidden = useRef(onHidden)
  useLayoutEffect(() => { hidden.current = onHidden })
  useLayoutEffect(() => {
    const scrim = scrimRef.current
    const sheet = sheetRef.current
    if (!scrim || !sheet) return
    gsap.killTweensOf([scrim, sheet])
    if (mounted.current) sound.play(open ? 'open' : 'close')
    if (open) {
      rest(sheet, false)
      gsap.to(scrim, { autoAlpha: 1, duration: 0.4, ease: 'power2.out' })
      gsap.fromTo(sheet, { autoAlpha: 0, y: from }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' })
    } else if (mounted.current) {
      gsap.to(scrim, { autoAlpha: 0, duration: 0.3, ease: 'power2.in' })
      gsap.to(sheet, {
        autoAlpha: 0,
        y: from * 0.6,
        duration: 0.32,
        ease: 'power2.in',
        onComplete: () => { rest(sheet); hidden.current?.() },
      })
    } else {
      gsap.set([scrim, sheet], { autoAlpha: 0 })
      rest(sheet)
    }
    mounted.current = true
  }, [open, scrimRef, sheetRef, from])
}

function useEscape(open, onClose) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
}

function Thumb({ product }) {
  const g = product.gallery.find((v) => v.kind === 'garment') ?? product.gallery[0]
  return (
    <span
      className="relative block h-14 w-12 shrink-0 overflow-hidden"
      style={{
        ...themeVars(product.theme),
        background: 'radial-gradient(80% 70% at 50% 30%, rgb(var(--sr-bg2)), rgb(var(--sr-bg0)))',
      }}
    >
      <img
        src={g.thumb || g.src}
        alt=""
        className={`absolute inset-0 h-full w-full p-1 ${g.kind === 'garment' ? 'object-contain' : 'object-cover'}`}
      />
    </span>
  )
}

export function SearchSheet({ open, onClose, onPick, onCategory }) {
  const scrimRef = useRef(null)
  const sheetRef = useRef(null)
  const inputRef = useRef(null)
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  useSheet(open, scrimRef, sheetRef, -18, () => {
    setQ('')
    setHi(0)
  })
  useEscape(open, onClose)
  // nothing inside is drawn until it is first asked for: the field is set in
  // the italic, and laying it out — even hidden — would fetch that face on
  // every page load for a search most visits never open
  const [asked, setAsked] = useState(false)
  if (open && !asked) setAsked(true)

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => inputRef.current?.focus(), 120)
    return () => window.clearTimeout(t)
  }, [open])

  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return PRODUCTS
    return PRODUCTS.filter((p) =>
      [p.name, p.code, p.category, p.line, p.number, p.description, p.colour, `hosha stone / ${p.number}`, `vass / ${p.number}`].some((f) => String(f).toLowerCase().includes(term)),
    )
  }, [q])

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)) }
    if (e.key === 'Enter' && results[hi]) onPick(results[hi].id)
  }

  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div ref={scrimRef} onClick={onClose} className="absolute inset-0 backdrop-blur-[3px]" style={{ background: 'rgb(var(--sr-bg0) / 0.72)' }} />
      <div
        ref={sheetRef}
        role="dialog"
        aria-label="Search"
        className="absolute inset-x-0 top-0 pb-10 pl-[calc(1.25rem+env(safe-area-inset-left))] pr-[calc(1.25rem+env(safe-area-inset-right))] pt-6 md:pl-[calc(3rem+env(safe-area-inset-left))] md:pr-[calc(3rem+env(safe-area-inset-right))] md:pt-8"
        style={{ background: 'linear-gradient(to bottom, rgb(var(--sr-bg0) / 0.98), rgb(var(--sr-bg1) / 0.96))', borderBottom: '1px solid rgb(var(--sr-ink) / 0.1)' }}
      >
        {asked && <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] uppercase tracking-[0.34em]" style={{ color: 'rgb(var(--sr-ink) / 0.5)' }}>Search the house</span>
            <button data-sound="none" onClick={onClose} aria-label="Close search" className="text-[10px] uppercase tracking-[0.3em]" style={{ color: 'rgb(var(--sr-ink) / 0.6)' }}>
              Close — Esc
            </button>
          </div>
          <label className="relative mt-6 flex items-center gap-4 pb-3" style={{ borderBottom: '1px solid rgb(var(--sr-ink) / 0.25)' }}>
            <span style={{ color: 'rgb(var(--sr-ink) / 0.7)' }}><Glass className="h-5 w-5" /></span>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => { setQ(e.target.value); setHi(0) }}
              onKeyDown={onKey}
              placeholder="A jacket, a hoodie, a number…"
              className="w-full bg-transparent font-display text-[clamp(1.4rem,3vw,2.3rem)] italic outline-none placeholder:opacity-40"
              style={{ color: 'rgb(var(--sr-ink))' }}
              aria-label="Search pieces"
            />
            <span className="absolute -bottom-px left-0 h-px transition-all duration-700" style={{ width: q ? '100%' : '18%', background: 'rgb(var(--sr-accent))' }} />
          </label>

          <div className="mt-7 space-y-1">
            {results.length === 0 && (
              <p className="py-6 font-display text-lg italic" style={{ color: 'rgb(var(--sr-ink) / 0.55)' }}>
                Nothing by that name yet.
              </p>
            )}
            {results.map((p, i) => (
              <button
                key={p.id}
                onMouseEnter={() => setHi(i)}
                onClick={() => onPick(p.id)}
                className="flex w-full items-center gap-5 px-3 py-3 text-left transition-colors duration-300"
                style={{ background: i === hi ? 'rgb(var(--sr-ink) / 0.06)' : 'transparent' }}
              >
                <Thumb product={p} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12px] font-medium uppercase tracking-[0.18em]" style={{ color: 'rgb(var(--sr-ink))' }}>
                    {p.name} — {p.code}
                  </span>
                  <span className="mt-1 block text-[10px] uppercase tracking-[0.26em]" style={{ color: 'rgb(var(--sr-ink) / 0.45)' }}>
                    {p.category} · Hosha Stone / {p.number}
                  </span>
                </span>
                <span className="text-[13px] tracking-[0.08em]" style={{ color: 'rgb(var(--sr-ink) / 0.8)' }}>${p.price}</span>
                <span className="text-sm transition-transform duration-300" style={{ color: 'rgb(var(--sr-accent))', transform: i === hi ? 'translateX(0)' : 'translateX(-6px)', opacity: i === hi ? 1 : 0 }}>→</span>
              </button>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
            {CATEGORIES.filter((c) => c.id !== 'all' && countIn(c.id) > 0).map((c) => (
              <button
                key={c.id}
                onClick={() => onCategory(c.id)}
                className="text-[10px] uppercase tracking-[0.3em] underline-offset-[6px] hover:underline"
                style={{ color: 'rgb(var(--sr-ink) / 0.6)' }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>}
      </div>
    </div>
  )
}

export function MobileMenu({ open, onClose, onNav, category, onCategory }) {
  const scrimRef = useRef(null)
  const sheetRef = useRef(null)
  useSheet(open, scrimRef, sheetRef, -10)
  useEscape(open, onClose)
  const [cats, setCats] = useState(false)

  return (
    <div className={`fixed inset-0 z-50 lg:hidden ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div ref={scrimRef} onClick={onClose} className="absolute inset-0" style={{ background: 'rgb(var(--sr-bg0) / 0.7)' }} />
      <div
        ref={sheetRef}
        className="absolute inset-0 flex flex-col overflow-y-auto pb-[calc(2.5rem+env(safe-area-inset-bottom))] pl-[calc(1.25rem+env(safe-area-inset-left))] pr-[calc(1.25rem+env(safe-area-inset-right))]"
        style={{ background: 'rgb(var(--sr-bg0) / 0.97)' }}
      >
        {/* drawn exactly over the page's header, so opening the menu moves nothing */}
        <div className="flex h-[72px] shrink-0 items-center justify-between">
          <span className="font-display text-[17px] tracking-[0.3em]" style={{ color: 'rgb(var(--sr-ink))' }}>HOSHA STONE</span>
          <button data-sound="none" onClick={onClose} aria-label="Close menu" className="-mr-2 grid h-11 w-11 place-items-center" style={{ color: 'rgb(var(--sr-ink))' }}>
            <svg viewBox="0 0 16 16" className="h-4 w-4"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          </button>
        </div>
        <nav className="mt-10 flex flex-col gap-7">
          {['browse', 'collections', 'story', 'saved'].map((id) => (
            <div key={id}>
              <button
                onClick={() => (id === 'collections' ? setCats((c) => !c) : onNav(id))}
                aria-expanded={id === 'collections' ? cats : undefined}
                className="flex items-center gap-4 text-[1.6rem] font-light uppercase tracking-[0.22em]"
                style={{ color: 'rgb(var(--sr-ink))' }}
              >
                {id === 'browse' ? 'Browsing' : id === 'saved' ? 'Kept' : id}
                {id === 'collections' && <PlusMinus open={cats} className="h-3 w-3" />}
              </button>
              {id === 'collections' && (
                // the list unfolds by its own height rather than appearing
                <div
                  className="grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ gridTemplateRows: cats ? '1fr' : '0fr', opacity: cats ? 1 : 0 }}
                  inert={!cats || undefined}
                >
                <div className="min-h-0 overflow-hidden">
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3 pl-1">
                  {CATEGORIES.map((c) => {
                    const empty = countIn(c.id) === 0
                    return (
                      <button
                        key={c.id}
                        disabled={empty}
                        onClick={() => onCategory(c.id)}
                        className="text-[11px] uppercase tracking-[0.26em]"
                        style={{ color: empty ? 'rgb(var(--sr-ink) / 0.25)' : c.id === category ? 'rgb(var(--sr-accent))' : 'rgb(var(--sr-ink) / 0.7)' }}
                      >
                        {c.label}{empty ? ' · soon' : ''}
                      </button>
                    )
                  })}
                </div>
                </div>
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="mt-auto flex flex-col pt-10">
          <SoundToggle label className="flex h-11 justify-start self-start" />
          <AllSoundToggle label className="flex h-11 justify-start self-start" />
        </div>
        <div className="flex gap-8 pt-2 text-[11px] uppercase tracking-[0.3em]" style={{ color: 'rgb(var(--sr-ink) / 0.65)' }}>
          <a className="flex h-11 items-center" href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer">WhatsApp</a>
          <a className="flex h-11 items-center" href={`https://instagram.com/${INSTAGRAM}`} target="_blank" rel="noreferrer">Instagram</a>
        </div>
      </div>
    </div>
  )
}
