import { JACKET } from '../data/product.js'

/**
 * The season word and the brand mark are set as environment, not headings:
 * they sit at two different depths behind the garment and move at their own
 * rates, which is what gives the scene its sense of space.
 */
export default function TypeLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* SPRING — deepest layer */}
      <div
        data-spring
        className="absolute left-1/2 top-[13%] will-change-transform md:left-[61%] md:top-[24%]"
        style={{ clipPath: 'inset(0 0 0 0)' }}
      >
        <span
          className="block whitespace-nowrap font-display leading-[0.78] text-lilac"
          style={{
            fontSize: 'clamp(3.4rem, 11.2vw, 15rem)',
            letterSpacing: '0.01em',
            transform: 'translate3d(calc(var(--dx, 0) * -16px), calc(var(--dy, 0) * -9px), 0)',
            opacity: 0.92,
          }}
        >
          {JACKET.season}
        </span>
      </div>

      {/* VASS — mid depth, overlapping the season word exactly as the reference does */}
      <div
        data-vasstype
        className="absolute left-1/2 top-[24%] will-change-transform md:left-[63%] md:top-[36%]"
      >
        <span
          className="block whitespace-nowrap font-sans font-bold leading-[0.8] text-ash"
          style={{
            fontSize: 'clamp(4.4rem, 16vw, 22rem)',
            letterSpacing: '-0.02em',
            transform: 'translate3d(calc(var(--dx, 0) * -30px), calc(var(--dy, 0) * -15px), 0)',
            opacity: 0.68,
          }}
        >
          VASS
        </span>
      </div>
    </div>
  )
}
