import { useRef } from 'react'
import gsap from 'gsap'

/**
 * A heart drawn on a 9 × 8 grid, the way a game would draw one: an outline, a
 * fill, and three pixels of shine. Rendered with crisp edges so it stays a
 * pixel heart at any size — a small piece of digital nostalgia in a quiet room.
 */
const MASK = [
  '.XX...XX.',
  'XXXX.XXXX',
  'XXXXXXXXX',
  'XXXXXXXXX',
  '.XXXXXXX.',
  '..XXXXX..',
  '...XXX...',
  '....X....',
]
const SHINE = new Set(['1,1', '1,2', '2,1'])
const on = (x, y) => MASK[y]?.[x] === 'X'
const CELLS = MASK.flatMap((row, y) =>
  [...row].flatMap((ch, x) => {
    if (ch !== 'X') return []
    const edge = !on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1)
    return [{ x, y, kind: edge ? 'edge' : SHINE.has(`${y},${x}`) ? 'shine' : 'fill' }]
  }),
)

const RED = 'rgb(226 50 74)'
const RED_DEEP = 'rgb(128 14 36)'

export function PixelHeart({ filled, className = 'h-4 w-[18px]' }) {
  return (
    <svg viewBox="0 0 9 8" shapeRendering="crispEdges" className={className} aria-hidden="true">
      {CELLS.map(({ x, y, kind }) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width="1"
          height="1"
          style={{
            fill:
              kind === 'edge'
                ? filled ? RED_DEEP : 'currentColor'
                : !filled ? 'transparent' : kind === 'shine' ? 'rgb(255 236 240)' : RED,
            transition: 'fill 220ms ease',
          }}
        />
      ))}
    </svg>
  )
}

/* the debris of a pop: square pixels, and a few tiny hearts */
const MINI = ['.X.X.', 'XXXXX', '.XXX.', '..X..']
function miniHeart(color) {
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('viewBox', '0 0 5 4')
  svg.setAttribute('shape-rendering', 'crispEdges')
  svg.setAttribute('width', '10')
  svg.setAttribute('height', '8')
  MINI.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== 'X') return
    const r = document.createElementNS(ns, 'rect')
    r.setAttribute('x', x); r.setAttribute('y', y); r.setAttribute('width', 1); r.setAttribute('height', 1)
    r.setAttribute('fill', color)
    svg.appendChild(r)
  }))
  return svg
}
// pixels travel on a 2px grid, so even the motion stays pixelated
const snap = (v) => `${Math.round(parseFloat(v) / 2) * 2}px`

/**
 * Favourite. Heart = wishlist; the bag is a separate action and is never
 * touched from here. Saving pops the heart — compress, burst, settle — and
 * throws a handful of pixels and tiny hearts that are gone in half a second.
 */
export default function FavoriteButton({ active, onToggle, name }) {
  const iconRef = useRef(null)
  const burstRef = useRef(null)
  const flashRef = useRef(null)

  const pop = () => {
    const icon = iconRef.current
    const tl = gsap.timeline()
    tl.to(icon, { scale: 0.76, duration: 0.09, ease: 'power2.in' })
      .to(icon, { scale: 1.38, duration: 0.14, ease: 'power2.out' })
      .to(icon, { scale: 1, duration: 0.34, ease: 'power3.out' })
    gsap.fromTo(flashRef.current, { scale: 0.5, opacity: 0.8 }, { scale: 2.1, opacity: 0, duration: 0.5, ease: 'power2.out', delay: 0.08 })

    const burst = burstRef.current
    const n = window.matchMedia('(max-width: 767px)').matches ? 8 : 12
    for (let i = 0; i < n; i++) {
      const heart = i % 4 === 0
      const el = heart ? miniHeart(i % 8 === 0 ? 'rgb(255 214 222)' : 'rgb(226 50 74)') : document.createElement('span')
      if (!heart) {
        const s = i % 3 === 0 ? 3 : 2
        Object.assign(el.style, {
          width: `${s}px`,
          height: `${s}px`,
          background: i % 3 === 1 ? 'rgb(255 236 240)' : 'rgb(226 50 74)',
        })
      }
      Object.assign(el.style, { position: 'absolute', left: '50%', top: '50%', marginLeft: '-2px', marginTop: '-2px', pointerEvents: 'none' })
      burst.appendChild(el)
      const a = (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
      const d = 16 + Math.random() * 16
      gsap.fromTo(
        el,
        { x: 0, y: 0, opacity: 1, scale: 1 },
        {
          x: Math.cos(a) * d,
          y: Math.sin(a) * d - 4,
          opacity: 0,
          scale: heart ? 0.9 : 0.5,
          duration: 0.45 + Math.random() * 0.2,
          delay: 0.1,
          ease: 'power3.out',
          modifiers: { x: snap, y: snap },
          onComplete: () => el.remove(),
        },
      )
    }
  }

  const click = () => {
    const next = !active
    onToggle(next)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (next) pop()
    else gsap.fromTo(iconRef.current, { scale: 0.86 }, { scale: 1, duration: 0.4, ease: 'power3.out' })
  }

  return (
    <button
      data-size
      onClick={click}
      aria-pressed={active}
      aria-label={active ? `Saved — remove the ${name} from favourites` : `Save the ${name} to favourites`}
      title={active ? 'Saved' : 'Save'}
      className="group relative grid h-10 w-10 shrink-0 place-items-center lg:h-11 lg:w-11"
      style={{ color: 'rgb(var(--sr-ink) / 0.7)' }}
    >
      {/* a soft glow, only when the hand is near or the heart is lit */}
      <span
        aria-hidden="true"
        className={`absolute inset-1 rounded-full transition-opacity duration-500 ${active ? 'opacity-70' : 'opacity-0 group-hover:opacity-60'}`}
        style={{ background: 'radial-gradient(closest-side, rgb(226 50 74 / 0.32), transparent)' }}
      />
      <span ref={flashRef} aria-hidden="true" className="absolute inset-2 opacity-0" style={{ border: '2px solid rgb(255 214 222 / 0.9)' }} />
      {/* three owners, three layers: the idle float, the hover, the pop */}
      <span className="heart-float block">
        <span className="block transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.14]">
          <span ref={iconRef} className="block">
            <PixelHeart filled={active} />
          </span>
        </span>
      </span>
      <span ref={burstRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />
    </button>
  )
}
