import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ABOUT, PRODUCTS, STORY, pad2, themeVars } from '../../data/showroom.js'
import { INSTAGRAM, WHATSAPP } from '../../data/order.js'
import { usePage } from '../../lib/page.jsx'
import { useShop } from '../../lib/shop.jsx'
import { pageHead } from '../../lib/head.js'
import useSpotlight from '../../hooks/useSpotlight.js'
import Header from '../showroom/Header.jsx'
import { MobileMenu, SearchSheet } from '../showroom/Overlays.jsx'
import { sound } from '../../lib/sound/index.js'
import { reveal, scrub } from '../../lib/scroll.js'

/**
 * The house, at length.
 *
 * The showroom gives you one piece at a time and the archive gives you all of
 * them at once; neither has room for why any of it exists. This is that room.
 * It is read rather than browsed, so it is the one page that scrolls, and the
 * only motion in it is tied to the scroll itself — nothing here moves on its
 * own while you are reading.
 *
 * The words are the house's own, written in /admin → About, so this page says
 * whatever the house currently says. Between them the pieces pass in turn, and
 * each one lights its own band of the page in its own colours — the same rule
 * the showroom follows, read downward instead of across.
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
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** A line of copy behind a mask, so it can rise into place rather than appear. */
function Rise({ as: Tag = 'span', className = '', style, children }) {
  return (
    <span className="block overflow-hidden">
      <Tag data-rise className={`block ${className}`} style={style}>
        {children}
      </Tag>
    </span>
  )
}

/* ------------------------------------------------------------------ a piece */

/**
 * One piece, given a band of the page to itself and lighting it. The garment
 * rises a little more slowly than the page scrolls, so the band has depth
 * without anything being pinned — the reading never stalls.
 */
function Band({ product, index, onEnter }) {
  const ref = useRef(null)
  const left = index % 2 === 1

  useLayoutEffect(() => {
    const root = ref.current
    if (reduced()) return
    const q = gsap.utils.selector(root)
    const piece = q('[data-band-piece]')[0]
    const ctx = gsap.context(() => {
      gsap.set(q('[data-band-in]'), { opacity: 0, y: 26 })
      gsap.set(q('[data-band-rule]'), { scaleX: 0 })
    }, root)
    const stops = [
      // across the screen, the garment goes from a little low to a little high
      scrub(root, {
        progress: (r) => Math.min(1, Math.max(0, (window.innerHeight - r.top) / (window.innerHeight + r.height))),
        draw: (p) => { piece.style.transform = `translate3d(0, ${(12 - 24 * p).toFixed(2)}%, 0)` },
        smooth: 0.6,
      }),
      reveal(root, 0.72, () => ctx.add(() => {
        gsap.to(q('[data-band-in]'), { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.08 })
        gsap.to(q('[data-band-rule]'), { scaleX: 1, duration: 1.3, ease: 'power3.inOut' })
      })),
    ]
    return () => {
      stops.forEach((stop) => stop())
      ctx.revert()
      piece.style.transform = ''
    }
  }, [])

  return (
    <section
      ref={ref}
      aria-label={product.name}
      className="relative overflow-hidden py-[9svh] lg:py-[12svh]"
      style={themeVars(product.theme)}
    >
      {/* the band is lit by this piece and nothing else */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(70% 58% at 50% 50%, rgb(var(--sr-bg2) / 0.42), transparent 72%)' }} />
        <div
          className="absolute inset-y-0 w-px"
          style={{ [left ? 'right' : 'left']: '8%', background: `linear-gradient(to bottom, transparent, rgb(var(--sr-neon) / 0.5), transparent)` }}
        />
      </div>

      <div className={`relative mx-auto flex max-w-[1500px] flex-col items-center gap-10 px-6 lg:gap-16 lg:px-12 ${left ? 'lg:flex-row-reverse' : 'lg:flex-row'}`}>
        <div className="relative h-[46svh] w-full shrink-0 lg:h-[64svh] lg:w-[46%]">
          <div data-band-piece className="absolute inset-0 will-change-transform">
            <img
              src={product.hero.src}
              alt={product.name}
              loading="lazy"
              decoding="async"
              draggable="false"
              className="h-full w-full select-none object-contain"
              style={{ filter: 'drop-shadow(0 40px 60px rgb(0 0 0 / 0.55))' }}
            />
          </div>
        </div>

        <div className="w-full lg:w-[44%]">
          <p data-band-in className="text-[10px] tracking-[0.36em]" style={{ color: ink(0.5) }}>
            Hosha Stone / {product.number}
          </p>
          <h3
            data-band-in
            className="mt-5 font-display text-[clamp(1.8rem,4vw,3.4rem)] font-normal uppercase leading-[1.08] tracking-[0.1em]"
            style={{ color: ink(0.98) }}
          >
            {product.name}
          </h3>
          <span data-band-rule className="mt-7 block h-px w-[72px] origin-left" style={{ background: 'rgb(var(--sr-neon))', boxShadow: '0 0 12px rgb(var(--sr-neon) / 0.7)' }} />
          <p data-band-in className="mt-7 max-w-[34rem] text-[13px] leading-[2]" style={{ color: ink(0.6) }}>
            {product.description}
          </p>
          <button
            data-band-in
            onClick={() => onEnter(product.id)}
            className="group mt-9 flex items-center gap-5 py-3 text-[10.5px] font-medium uppercase tracking-[0.34em]"
            style={{ color: ink(0.85) }}
          >
            <span
              className="h-px w-[52px] transition-[width,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-[76px] group-hover:bg-[rgb(var(--sr-neon))]"
              style={{ background: ink(0.5) }}
            />
            <span className="transition-colors duration-500 group-hover:text-[rgb(var(--sr-ink))]">Enter its room</span>
          </button>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ the page */

export default function Story() {
  const { go } = usePage()
  const { bag, kept } = useShop()
  const rootRef = useRef(null)
  const barRef = useRef(null)
  const [overlay, setOverlay] = useState(null)
  const [vars] = useState(() => ({ ...themeVars(ARCHIVE), '--vx-a': 'var(--sr-neon)', '--vx-b': 'var(--sr-light)', '--drawer-bg': 'rgb(var(--sr-bg0) / 0.97)' }))

  useSpotlight(rootRef)
  useEffect(() => { pageHead('story') }, [])
  useEffect(() => { sound.scene('story') }, [])

  const enter = useCallback((id) => go('piece', { id, entry: 'return' }), [go])

  const onNav = (id) => {
    if (id === 'collections') { setOverlay(id === overlay ? null : id); return }
    setOverlay(null)
    if (id === 'story') { window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    go(id)
  }

  /* ---------------------------------------------- arrival, and the reading */
  useLayoutEffect(() => {
    const root = rootRef.current
    const stops = []
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root)
      if (reduced()) {
        gsap.set(q('[data-rise]'), { yPercent: 0, opacity: 1 })
        return
      }
      const tl = gsap.timeline({ delay: 0.1 })
      tl.fromTo(q('[data-intro]'), { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.04 }, 0)
      tl.fromTo(q('[data-open-word]'), { yPercent: 112 }, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.09 }, 0.15)
      tl.fromTo(q('[data-open-fade]'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.08 }, 0.65)

      // everything below the first screen arrives as it is reached, once
      q('[data-section]').forEach((section) => {
        const lines = section.querySelectorAll('[data-rise]')
        if (lines.length) {
          gsap.set(lines, { yPercent: 112 })
          stops.push(reveal(section, 0.76, () => ctx.add(() => gsap.to(lines, { yPercent: 0, duration: 1.1, ease: 'power3.out', stagger: 0.07 }))))
        }
        const fades = section.querySelectorAll('[data-fade-in]')
        if (fades.length) {
          gsap.set(fades, { opacity: 0, y: 22 })
          stops.push(reveal(section, 0.74, () => ctx.add(() => gsap.to(fades, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09 }))))
        }
      })
    }, root)

    // how far through the house you are
    const bar = barRef.current
    stops.push(scrub(root, {
      progress: (r) => Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - window.innerHeight))),
      draw: (p) => { bar.style.transform = `scaleX(${p.toFixed(4)})` },
      smooth: reduced() ? 0 : 0.3,
    }))
    return () => {
      stops.forEach((stop) => stop())
      ctx.revert()
    }
  }, [])

  const sections = (ABOUT.sections ?? []).filter((s) => s.heading || s.text)

  return (
    <div
      ref={rootRef}
      className="relative min-h-[100svh] overflow-x-hidden"
      style={{ ...vars, background: 'rgb(var(--sr-bg0))', color: 'rgb(var(--sr-ink))' }}
    >
      {/* the obsidian room */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(90% 60% at 50% -6%, rgb(var(--sr-bg2) / 0.5), transparent 62%), linear-gradient(to bottom, rgb(var(--sr-bg1)), rgb(var(--sr-bg0)) 58%, rgb(var(--sr-floor)))' }} />
        <div className="absolute left-[54%] top-[-8%] h-[70%] w-[16%] -translate-x-1/2" style={{ background: 'radial-gradient(50% 100% at 50% 0%, rgb(var(--sr-neon) / 0.11), transparent 82%)', animation: 'neon-breathe 9s ease-in-out infinite' }} />
        <div className="grain absolute -inset-[12%] opacity-[0.045]" style={{ backgroundImage: GRAIN }} />
      </div>

      {/* how far through you are */}
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[45] h-px" style={{ background: ink(0.08) }}>
        <div ref={barRef} className="h-full origin-left" style={{ transform: 'scaleX(0)', background: 'rgb(var(--sr-neon))', boxShadow: '0 0 10px rgb(var(--sr-neon) / 0.8)' }} />
      </div>

      <div className="relative z-40">
        <Header
          onHome={() => go('home', { entry: 'return' })}
          onNav={onNav}
          onSearch={() => setOverlay('search')}
          onMenu={() => setOverlay('menu')}
          active={overlay === 'collections' ? 'collections' : 'story'}
          category="all"
          onCategory={() => { setOverlay(null); go('browse') }}
          onCloseCategories={() => setOverlay((o) => (o === 'collections' ? null : o))}
          bag={bag}
          saved={kept.length}
        />
      </div>

      <main id="main" tabIndex={-1} className="relative z-10">
        {/* ------------------------------------------------ the opening */}
        <section className="relative flex min-h-[86svh] flex-col justify-center px-6 pb-[10svh] pt-[6svh] lg:px-12">
          <p data-intro className="text-[10px] tracking-[0.34em]" style={{ color: ink(0.5) }}>
            / The house
          </p>
          <h1 className="mt-7 font-display text-[clamp(3rem,11vw,9.5rem)] font-normal uppercase leading-[0.9] tracking-[0.06em]">
            {STORY.heading.map((word, i) => (
              <span key={i} className="block overflow-hidden">
                <span data-open-word className="block">{word}</span>
              </span>
            ))}
          </h1>
          <p data-open-fade className="mt-10 max-w-[38rem] text-[13px] leading-[2]" style={{ color: ink(0.62) }}>
            {STORY.body}
          </p>
          <p data-open-fade className="mt-9 text-[10px] uppercase tracking-[0.42em]" style={{ color: ink(0.78) }}>
            {ABOUT.motto}
          </p>
          <span data-open-fade aria-hidden="true" className="mt-[7svh] flex items-center gap-4 text-[9px] uppercase tracking-[0.34em]" style={{ color: ink(0.38) }}>
            Read on
            <span className="relative block h-[46px] w-px overflow-hidden" style={{ background: ink(0.14) }}>
              <span className="absolute inset-x-0 top-0 h-1/3" style={{ background: 'rgb(var(--sr-neon))', animation: 'story-cue 2.6s cubic-bezier(0.6,0,0.2,1) infinite' }} />
            </span>
          </span>
        </section>

        {/* ------------------------------------------------ what the house says */}
        <section data-section className="relative px-6 py-[10svh] lg:px-12">
          <div className="mx-auto max-w-[1500px] lg:grid lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-7">
              <h2 className="font-display text-[clamp(1.6rem,3.4vw,3rem)] font-normal leading-[1.22] tracking-[0.02em]" style={{ color: ink(0.96) }}>
                {String(ABOUT.title || '').split(' ').filter(Boolean).reduce((lines, word) => {
                  // the title is set as a few short lines, each rising on its own
                  const last = lines[lines.length - 1]
                  if (last && (last + ' ' + word).length <= 28) lines[lines.length - 1] = `${last} ${word}`
                  else lines.push(word)
                  return lines
                }, []).map((line, i) => (
                  <Rise key={i}>{line}</Rise>
                ))}
              </h2>
            </div>
            <div className="mt-10 lg:col-span-5 lg:mt-2">
              <p data-fade-in className="whitespace-pre-line text-[13px] leading-[2.1]" style={{ color: ink(0.6) }}>
                {ABOUT.body}
              </p>
              {ABOUT.image && (
                <div data-fade-in className="relative mt-10 aspect-[4/3] overflow-hidden" style={{ boxShadow: `inset 0 0 0 1px ${ink(0.1)}` }}>
                  <img src={ABOUT.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ the pieces, in turn */}
        <section data-section className="relative px-6 pt-[6svh] lg:px-12">
          <div className="mx-auto flex max-w-[1500px] items-end justify-between gap-8">
            <h2 className="font-display text-[clamp(1.5rem,3vw,2.4rem)] font-normal uppercase tracking-[0.14em]">
              <Rise>The pieces</Rise>
            </h2>
            <p data-fade-in className="text-[10px] uppercase tracking-[0.32em]" style={{ color: ink(0.45) }}>
              {pad2(PRODUCTS.length)} in the house
            </p>
          </div>
        </section>
        {PRODUCTS.map((p, i) => (
          <Band key={p.id} product={p} index={i} onEnter={enter} />
        ))}

        {/* ------------------------------------------------ the house's chapters */}
        {sections.length > 0 && (
          <section data-section className="relative px-6 py-[10svh] lg:px-12">
            <div className="mx-auto max-w-[1500px]">
              <h2 className="font-display text-[clamp(1.5rem,3vw,2.4rem)] font-normal uppercase tracking-[0.14em]">
                <Rise>In the house's words</Rise>
              </h2>
              <div className="mt-12 grid gap-px sm:grid-cols-2 lg:grid-cols-3" style={{ background: ink(0.08) }}>
                {sections.map((s, i) => (
                  <article key={i} data-fade-in className="p-8 lg:p-10" style={{ background: 'rgb(var(--sr-bg0))' }}>
                    <p className="text-[10px] tracking-[0.3em]" style={{ color: 'rgb(var(--sr-accent) / 0.85)' }}>{pad2(i + 1)}</p>
                    {s.heading && (
                      <h3 className="mt-5 text-[11px] font-medium uppercase tracking-[0.3em]" style={{ color: ink(0.9) }}>{s.heading}</h3>
                    )}
                    {s.text && (
                      <p className="mt-5 whitespace-pre-line text-[12.5px] leading-[2]" style={{ color: ink(0.55) }}>{s.text}</p>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ------------------------------------------------ the way out */}
        <section data-section className="relative px-6 pb-[12svh] pt-[6svh] lg:px-12">
          <div className="mx-auto max-w-[1500px] border-t pt-[8svh]" style={{ borderColor: ink(0.1) }}>
            <p className="font-display text-[clamp(1.8rem,5vw,4rem)] font-normal uppercase leading-[1.05] tracking-[0.1em]">
              <Rise>{ABOUT.motto}</Rise>
            </p>
            <div className="mt-12 flex flex-col gap-10 sm:flex-row sm:items-end sm:justify-between">
              <button
                data-fade-in
                onClick={() => go('browse')}
                className="group flex items-center gap-5 py-3 text-[10.5px] font-medium uppercase tracking-[0.34em]"
                style={{ color: ink(0.85) }}
              >
                <span
                  className="h-px w-[52px] transition-[width,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:w-[76px] group-hover:bg-[rgb(var(--sr-neon))]"
                  style={{ background: ink(0.5) }}
                />
                <span className="transition-colors duration-500 group-hover:text-[rgb(var(--sr-ink))]">See every piece</span>
              </button>
              <div data-fade-in className="flex gap-8 text-[10px] uppercase tracking-[0.3em]" style={{ color: ink(0.55) }}>
                <a className="transition-colors duration-300 hover:text-[rgb(var(--sr-ink))]" href={`https://instagram.com/${INSTAGRAM}`} target="_blank" rel="noreferrer">Instagram</a>
                <a className="transition-colors duration-300 hover:text-[rgb(var(--sr-ink))]" href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer">WhatsApp</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SearchSheet
        open={overlay === 'search'}
        onClose={() => setOverlay(null)}
        onPick={(id) => { setOverlay(null); enter(id) }}
        onCategory={() => { setOverlay(null); go('browse') }}
      />
      <MobileMenu
        open={overlay === 'menu'}
        onClose={() => setOverlay(null)}
        onNav={onNav}
        category="all"
        onCategory={() => { setOverlay(null); go('browse') }}
      />
    </div>
  )
}
