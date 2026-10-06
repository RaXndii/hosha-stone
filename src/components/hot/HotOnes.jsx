import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { byCategory, CATEGORIES } from '../../data/catalogue.js'
import useSpotlight from '../../hooks/useSpotlight.js'
import Controls from './Controls.jsx'
import ProductStage from './ProductStage.jsx'
import HeartButton from './HeartButton.jsx'
import Drawer from './Drawer.jsx'

gsap.registerPlugin(ScrollTrigger)

export default function HotOnes() {
  const rootRef = useRef(null)
  const stageRef = useRef(null)
  const priceRef = useRef(null)

  const [category, setCategory] = useState(CATEGORIES[0].id)
  const [productIndex, setProductIndex] = useState(0)
  // View-switching (peek click, prev/next) is reserved for moving between
  // different products once a category holds more than one — it must not
  // swap the two photos of the SAME garment, so it's wired but inert for now.
  // viewIndex therefore never changes: the stage always renders exactly the
  // composition it was given, no swap, no animation on the garment itself.
  const [viewIndex] = useState(0)
  const [size, setSize] = useState(null)
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  useSpotlight(rootRef)

  const products = useMemo(() => byCategory(category), [category])
  const product = products[Math.min(productIndex, products.length - 1)]

  const switchCategory = useCallback((id) => {
    if (id === category) return
    setCategory(id)
    setProductIndex(0)
    setSize(null)
    // the garment leaves before the next one arrives, rather than cutting
    const stage = stageRef.current
    if (stage) {
      gsap.fromTo(
        stage,
        { autoAlpha: 0.15, yPercent: 4, scale: 0.97 },
        { autoAlpha: 1, yPercent: 0, scale: 1, duration: 0.8, ease: 'power3.out' },
      )
    }
  }, [category])

  const addToBag = () => {
    if (!size) return
    setCart((c) => [...c, { id: product.id + size + Date.now(), code: product.code, name: product.name, size, price: product.price }])
    gsap.fromTo(
      priceRef.current,
      { scale: 1 },
      { scale: 1.06, duration: 0.16, yoyo: true, repeat: 1, ease: 'power2.inOut' },
    )
  }

  /* entrance — the VASS world continuing, not a new page arriving */
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root)
      gsap.fromTo(
        q('[data-rise]'),
        { y: 26, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.9,
          ease: 'power3.out',
          stagger: 0.07,
          scrollTrigger: { trigger: root, start: 'top 78%', once: true },
        },
      )
      gsap.fromTo(
        q('[data-stage]'),
        { scale: 0.94, autoAlpha: 0 },
        {
          scale: 1,
          autoAlpha: 1,
          duration: 1.2,
          ease: 'power3.out',
          scrollTrigger: { trigger: root, start: 'top 80%', once: true },
        },
      )
    }, rootRef)
    return () => ctx.revert()
  }, [])

  const total = cart.reduce((s, i) => s + i.price, 0)

  return (
    <section
      ref={rootRef}
      id="hot-ones"
      className="relative overflow-hidden bg-abyss px-5 pb-16 pt-7 md:min-h-[100svh] md:px-9 md:pb-24 md:pt-8"
    >
      {/* alive at a glance, not just on close inspection: real movement, a
          visible breathing brightness, paced fast enough to actually notice */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -right-[12%] top-[6%] h-[70vh] w-[62vw]"
          style={{
            background:
              'radial-gradient(closest-side, rgba(124,90,204,0.3) 0%, rgba(104,74,176,0.1) 46%, transparent 80%)',
            animation: 'drift-a 17s ease-in-out infinite',
          }}
        />
        <div
          className="absolute -left-[14%] bottom-[4%] h-[58vh] w-[52vw]"
          style={{
            background:
              'radial-gradient(closest-side, rgba(127,212,216,0.2) 0%, rgba(90,160,180,0.07) 48%, transparent 82%)',
            animation: 'drift-b 23s ease-in-out infinite',
          }}
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-[104rem] flex-col md:min-h-[calc(100svh-3.5rem)]">
        <div data-rise>
          <Controls
            category={category}
            onCategory={switchCategory}
            product={product}
            cartCount={cart.length}
            onOpenCart={() => setCartOpen(true)}
            onOpenAbout={() => setAboutOpen(true)}
          />
        </div>

        {/* three columns on a desktop: the words, the garment, the decision */}
        <div className="mt-8 grid flex-1 grid-cols-1 content-center items-center gap-8 md:mt-2 md:grid-cols-[minmax(0,19rem)_minmax(0,1fr)_minmax(0,13rem)] md:gap-6 lg:gap-10">
          {/* words */}
          <div className="order-2 md:order-1">
            {/* reserved for paging between products once a category holds
                more than one — inert for now, so it neither swaps the
                garment nor pretends to be interactive */}
            <div data-rise className="mb-7 flex items-center gap-2.5">
              {[-1, 1].map((d) => (
                <button
                  key={d}
                  disabled
                  aria-hidden="true"
                  tabIndex={-1}
                  className="grid h-9 w-12 cursor-not-allowed place-items-center rounded-full border border-bone/10 text-bone/25"
                >
                  <svg viewBox="0 0 18 10" className="h-2.5 w-4" style={{ transform: d < 0 ? 'rotate(180deg)' : 'none' }}>
                    <path d="M1 5h15M12 1l4 4-4 4" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>

            <h2 data-rise className="font-display text-2xl font-medium text-bone md:text-[27px]">
              wear VASS
            </h2>

            <div data-rise className="mt-5 space-y-1.5">
              {product.lines.map((line) => (
                <p key={line} className="font-sans text-[10px] font-semibold uppercase tracking-[0.11em] text-bone/45">
                  {line}
                </p>
              ))}
            </div>

            <p data-rise className="mt-8 font-display text-[19px] leading-[1.45] text-aqua/90 md:text-[22px]">
              Be comfortable. Be distinctive.
              <br />
              Be yourself.
            </p>
          </div>

          {/* garment */}
          <div
            data-stage
            ref={stageRef}
            className="relative order-1 mx-auto h-[42vh] w-full max-w-[30rem] md:order-2 md:h-[62vh] md:max-w-[38rem]"
          >
            <ProductStage product={product} activeIndex={viewIndex} interactive={false} />
          </div>

          {/* decision */}
          <div className="order-3 flex flex-col items-start gap-6 md:items-end md:text-right">
            <div data-rise>
              <div ref={priceRef} className="flex items-baseline gap-3 md:justify-end">
                <span className="font-display text-4xl font-medium text-bone md:text-[40px]">
                  {product.price} $
                </span>
              </div>
              <span className="mt-1 block font-display text-lg text-bone/30 line-through md:text-xl">
                {product.was} $
              </span>
            </div>

            <div data-rise className="w-full">
              <p className="mb-3 font-display text-[13px] uppercase tracking-[0.13em] text-bone/70 md:text-sm">
                Choose your size
              </p>
              <div className="flex items-center gap-2.5 md:justify-end">
                {product.sizes.map((s) => {
                  const active = size === s
                  return (
                    <button
                      key={s}
                      data-vx
                      data-active={active}
                      onClick={() => setSize(active ? null : s)}
                      aria-pressed={active}
                      className="vx grid h-11 w-11 place-items-center rounded-xl border text-[11px] font-medium"
                      style={{
                        borderColor: active ? 'rgba(127,212,216,0.65)' : 'rgba(244,242,247,0.14)',
                        background: active ? 'rgba(127,212,216,0.1)' : 'rgba(244,242,247,0.03)',
                        color: active ? '#eafcfd' : 'rgba(244,242,247,0.55)',
                        boxShadow: active ? '0 0 22px rgba(127,212,216,0.22)' : 'none',
                      }}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            <div data-rise className="flex items-center gap-3">
              <button
                data-vx
                onClick={addToBag}
                disabled={!size}
                className="vx rounded-full border px-6 py-3 text-[10px] uppercase tracking-[0.2em] disabled:cursor-not-allowed"
                style={{
                  borderColor: size ? 'rgba(244,242,247,0.5)' : 'rgba(244,242,247,0.14)',
                  color: size ? '#f4f2f7' : 'rgba(244,242,247,0.35)',
                }}
              >
                {size ? 'Add to bag' : 'Pick a size'}
              </button>
              <HeartButton />
            </div>
          </div>
        </div>
      </div>

      <Drawer open={cartOpen} onClose={() => setCartOpen(false)} title="Your bag">
        {cart.length === 0 ? (
          <p className="text-[12px] leading-relaxed text-bone/45">
            Nothing here yet. Choose a size and add a piece.
          </p>
        ) : (
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 rounded-2xl border border-bone/10 px-4 py-3.5">
                <div>
                  <p className="font-display text-sm text-bone">{item.name}</p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-bone/40">
                    {item.code} · size {item.size}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-sm text-bone/80">{item.price} $</span>
                  <button
                    data-vx
                    aria-label="Remove"
                    onClick={() => setCart((c) => c.filter((i) => i.id !== item.id))}
                    className="vx grid h-7 w-7 place-items-center rounded-full border border-bone/15 text-bone/45 hover:text-bone"
                  >
                    <svg viewBox="0 0 16 16" className="h-2.5 w-2.5">
                      <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-bone/10 pt-5">
              <span className="text-[9px] uppercase tracking-ultra text-bone/45">Total</span>
              <span className="font-display text-xl text-bone">{total} $</span>
            </div>
          </div>
        )}
      </Drawer>

      <Drawer open={aboutOpen} onClose={() => setAboutOpen(false)} title="About VASS">
        <div className="space-y-5">
          <p className="font-display text-xl leading-snug text-bone">
            A small number of garments each season.
          </p>
          <p className="text-[12px] leading-[1.9] text-bone/55">
            VASS photographs its clothing the way film is lit — slowly, and from
            one side. Everything is cut to hold its shape long after the room
            goes dark.
          </p>
          <p className="text-[12px] leading-[1.9] text-bone/55">
            Wear it casual. Wear it different. Simplicity isn&rsquo;t ordinary —
            it&rsquo;s confidence without trying too hard.
          </p>
        </div>
      </Drawer>
    </section>
  )
}
