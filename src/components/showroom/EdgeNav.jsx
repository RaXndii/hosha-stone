import { useState } from 'react'
import { pad2, themeVars } from '../../data/showroom.js'

function Preview({ product, show }) {
  const first = product.gallery.find((g) => g.kind === 'garment') ?? product.gallery[0]
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-full top-1/2 mr-3 block h-[184px] w-[144px] overflow-hidden transition-all duration-500 ease-out"
      style={{
        ...themeVars(product.theme),
        opacity: show ? 1 : 0,
        transform: `translate3d(${show ? 0 : 18}px, -50%, 0)`,
        background:
          'radial-gradient(80% 70% at 50% 35%, rgb(var(--sr-bg2)) 0%, rgb(var(--sr-bg1)) 55%, rgb(var(--sr-bg0)) 100%)',
        boxShadow: '0 0 0 1px rgb(var(--sr-glass) / 0.2), 0 24px 44px -20px rgb(0 0 0 / 0.85)',
      }}
    >
      <img
        src={first.src}
        alt=""
        decoding="async"
        className={`absolute inset-x-[9%] top-[7%] h-[64%] w-[82%] ${first.kind === 'garment' ? 'object-contain' : 'object-cover'}`}
      />
      <span className="absolute inset-x-3 bottom-3 block">
        <span className="block truncate text-[9px] font-medium uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--sr-ink))' }}>
          {product.name}
        </span>
        <span className="mt-1 block text-[10px] tracking-[0.12em]" style={{ color: 'rgb(var(--sr-accent))' }}>
          ${product.price}
        </span>
      </span>
    </span>
  )
}

/**
 * Moving to another piece. One cluster on the right edge, written vertically
 * like a spine — the gallery counter counts views of THIS piece and sits
 * horizontally beside it, so the two systems never read as the same control.
 *
 * Hovering either direction slides that neighbour out of the edge in its own
 * light. The preview is a sibling of the buttons, never a child, so its box
 * can't widen what the buttons catch.
 */
export default function EdgeNav({ prev, next, prevPos, nextPos, total, onPrev, onNext }) {
  const [peek, setPeek] = useState(null)
  if (!next && !prev) return null
  return (
    <div data-quiet-soft className="absolute right-0 top-1/2 z-30 hidden -translate-y-1/2 md:block">
      <div className="relative flex flex-col items-center pr-5">
        {prev && (
          <button
            onClick={onPrev}
            onMouseEnter={() => setPeek('prev')}
            onMouseLeave={() => setPeek(null)}
            onFocus={() => setPeek('prev')}
            onBlur={() => setPeek(null)}
            aria-label={`Previous piece: ${prev.name}`}
            className="group flex flex-col items-center gap-2 py-3"
          >
            <span className="text-[14px] leading-none transition-transform duration-500 group-hover:-translate-y-1" style={{ color: 'rgb(var(--sr-ink) / 0.7)' }}>
              ↑
            </span>
            <span className="text-[9px] font-medium tracking-[0.2em]" style={{ color: 'rgb(var(--sr-ink) / 0.5)' }}>
              {pad2(prevPos)}
            </span>
          </button>
        )}

        <span className="my-2 h-8 w-px" style={{ background: 'rgb(var(--sr-ink) / 0.22)' }} />

        {next && (
          <button
            onClick={onNext}
            onMouseEnter={() => setPeek('next')}
            onMouseLeave={() => setPeek(null)}
            onFocus={() => setPeek('next')}
            onBlur={() => setPeek(null)}
            aria-label={`Next piece: ${next.name}`}
            className="group flex flex-col items-center gap-4 py-3"
          >
            <span
              className="text-[9px] font-semibold uppercase tracking-[0.36em] transition-colors duration-300"
              style={{ writingMode: 'vertical-rl', color: 'rgb(var(--sr-ink) / 0.78)' }}
            >
              Next piece
            </span>
            <span className="h-10 w-px transition-all duration-500 group-hover:h-16" style={{ background: 'rgb(var(--sr-accent) / 0.8)' }} />
            <span className="text-[10px] font-medium tracking-[0.18em]" style={{ color: 'rgb(var(--sr-accent))' }}>
              {pad2(nextPos)}
              <span style={{ color: 'rgb(var(--sr-ink) / 0.35)' }}>/{pad2(total)}</span>
            </span>
            <span className="text-[15px] leading-none transition-transform duration-500 group-hover:translate-y-1" style={{ color: 'rgb(var(--sr-ink) / 0.9)' }}>
              ↓
            </span>
          </button>
        )}

        {prev && <Preview product={prev} show={peek === 'prev'} />}
        {next && <Preview product={next} show={peek === 'next'} />}
      </div>
    </div>
  )
}
