import Roll from './Roll.jsx'

/**
 * The acrylic case from the reference, drawn as an actual box in one-point
 * perspective rather than a bordered rectangle: a front frame, a smaller back
 * frame set slightly high (the eye is low, so more of the ceiling than the
 * floor shows), and the four edges that join them. Units are the case's own
 * 100 × 121, measured off the reference.
 *
 * Glass faces sit behind the garment; the front edges, bolts, label and plate
 * sit in front of it — the garment is inside the case, not on top of it.
 */
const FRONT = { x0: 0.4, y0: 0.4, x1: 99.6, y1: 120.6 }
const BACK = { x0: 6.7, y0: 17.5, x1: 93.3, y1: 114.3 }

const edge = (o = 1) => `rgb(var(--sr-glass) / ${o})`

function Faces() {
  const f = FRONT
  const b = BACK
  return (
    <svg viewBox="0 0 100 121" className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="vt-back" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: 'rgb(var(--sr-light))', stopOpacity: 0.16 }} />
          <stop offset="55%" style={{ stopColor: 'rgb(var(--sr-light))', stopOpacity: 0.06 }} />
          <stop offset="100%" style={{ stopColor: 'rgb(var(--sr-bg0))', stopOpacity: 0.3 }} />
        </linearGradient>
        <linearGradient id="vt-ceiling" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: 'rgb(var(--sr-glass))', stopOpacity: 0.1 }} />
          <stop offset="100%" style={{ stopColor: 'rgb(var(--sr-glass))', stopOpacity: 0.03 }} />
        </linearGradient>
      </defs>
      {/* back panel catches the overhead light */}
      <rect x={b.x0} y={b.y0} width={b.x1 - b.x0} height={b.y1 - b.y0} fill="url(#vt-back)" />
      <polygon points={`${f.x0},${f.y0} ${f.x1},${f.y0} ${b.x1},${b.y0} ${b.x0},${b.y0}`} fill="url(#vt-ceiling)" />
      <polygon
        points={`${f.x0},${f.y0} ${b.x0},${b.y0} ${b.x0},${b.y1} ${f.x0},${f.y1}`}
        style={{ fill: 'rgb(var(--sr-glass) / 0.03)' }}
      />
      <polygon
        points={`${f.x1},${f.y0} ${b.x1},${b.y0} ${b.x1},${b.y1} ${f.x1},${f.y1}`}
        style={{ fill: 'rgb(var(--sr-glass) / 0.03)' }}
      />
      {/* the floor of the case reflects */}
      <polygon
        points={`${b.x0},${b.y1} ${b.x1},${b.y1} ${f.x1},${f.y1} ${f.x0},${f.y1}`}
        style={{ fill: 'rgb(var(--sr-light) / 0.08)' }}
      />
    </svg>
  )
}

function Edges() {
  const f = FRONT
  const b = BACK
  // each edge is a crisp line over a wide faint one: the acrylic's glow without
  // a filter, which would be re-run every time anything near it repainted
  const line = (d, o, w = 0.22) => (
    <g>
      <path data-vt-halo d={d} fill="none" style={{ stroke: edge(o * 0.16), strokeWidth: w * 5 }} />
      <path data-vt-line d={d} pathLength="1" fill="none" style={{ stroke: edge(o), strokeWidth: w }} />
    </g>
  )
  const bolts = [
    [2.3, 2.3], [97.7, 2.3], [2.3, 118.7], [97.7, 118.7],
    [9.2, 19.8], [90.8, 19.8], [9.2, 112], [90.8, 112],
  ]
  return (
    <svg
      viewBox="0 0 100 121"
      className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible"
      aria-hidden="true"
    >
      <defs>
        {/* userSpaceOnUse: a vertical line has a zero-width bounding box, so a
            bounding-box gradient on it would silently render nothing */}
        <linearGradient id="vt-side" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="121">
          <stop offset="0%" style={{ stopColor: 'rgb(var(--sr-glass))', stopOpacity: 0.95 }} />
          <stop offset="60%" style={{ stopColor: 'rgb(var(--sr-glass))', stopOpacity: 0.42 }} />
          <stop offset="100%" style={{ stopColor: 'rgb(var(--sr-glass))', stopOpacity: 0.7 }} />
        </linearGradient>
      </defs>
      {/* back frame */}
      {line(`M${b.x0} ${b.y0} H${b.x1} V${b.y1} H${b.x0} Z`, 0.26, 0.16)}
      {/* the edges that give the case its depth */}
      {line(`M${f.x0} ${f.y0} L${b.x0} ${b.y0}`, 0.34, 0.16)}
      {line(`M${f.x1} ${f.y0} L${b.x1} ${b.y0}`, 0.34, 0.16)}
      {line(`M${f.x0} ${f.y1} L${b.x0} ${b.y1}`, 0.3, 0.16)}
      {line(`M${f.x1} ${f.y1} L${b.x1} ${b.y1}`, 0.3, 0.16)}
      {/* front frame: light catches the vertical edges of the acrylic */}
      {line(`M${f.x0} ${f.y0} H${f.x1}`, 0.75, 0.26)}
      {line(`M${f.x0} ${f.y1} H${f.x1}`, 0.6, 0.26)}
      <path data-vt-halo d={`M${f.x0} ${f.y0} V${f.y1}`} fill="none" stroke="url(#vt-side)" strokeWidth="1.6" strokeOpacity="0.14" />
      <path data-vt-halo d={`M${f.x1} ${f.y0} V${f.y1}`} fill="none" stroke="url(#vt-side)" strokeWidth="1.6" strokeOpacity="0.14" />
      <path data-vt-line d={`M${f.x0} ${f.y0} V${f.y1}`} pathLength="1" fill="none" stroke="url(#vt-side)" strokeWidth="0.32" />
      <path data-vt-line d={`M${f.x1} ${f.y0} V${f.y1}`} pathLength="1" fill="none" stroke="url(#vt-side)" strokeWidth="0.32" />
      {/* the label rail */}
      {line(`M${b.x0 + 3} 14 H${b.x1 - 3}`, 0.16, 0.12)}
      {bolts.map(([x, y]) => (
        <circle key={`${x}-${y}`} data-vt-bolt cx={x} cy={y} r="0.55" style={{ fill: edge(0.55) }} />
      ))}
    </svg>
  )
}

export default function Vitrine({ line, children, glare = true }) {
  return (
    <div className="relative h-full" style={{ aspectRatio: '100 / 121' }}>
      <Faces />

      {/* the garment lives here, between the back panel and the front glass */}
      <div className="absolute inset-0">{children}</div>

      {/* glass catching the room — drifts against the visitor's light. Drawn
          once, then slid: the pointer only ever changes its transform */}
      {glare && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[7] overflow-hidden">
          <div
            className="absolute inset-y-0 left-[-60%] w-[220%] will-change-transform"
            style={{
              transform: 'translate3d(calc(var(--dx, 0) * -8%), 0, 0)',
              background:
                'linear-gradient(118deg, transparent 32%, rgb(var(--sr-glass) / 0.06) 44%, rgb(var(--sr-glass) / 0.015) 52%, transparent 60%)',
            }}
          />
        </div>
      )}

      <Edges />

      {/* collection label on the ceiling rail, as in the reference */}
      <div data-vt-label className="pointer-events-none absolute left-[11%] top-[5.2%] z-10 leading-none">
        <span
          className="block font-sans text-[clamp(10px,1.05vw,15px)] font-medium uppercase tracking-[0.22em]"
          style={{ color: 'rgb(var(--sr-ink) / 0.92)' }}
        >
          <Roll value={line} />
        </span>
        <span className="mt-[5px] block h-px w-full" style={{ background: 'rgb(var(--sr-ink) / 0.55)' }} />
      </div>
      <svg
        data-vt-label
        viewBox="0 0 24 20"
        className="pointer-events-none absolute right-[10%] top-[4.6%] z-10 h-[3.3%] w-auto"
        aria-hidden="true"
      >
        {[0, 6, 12].map((o) => (
          <path key={o} d={`M${2 + o} 19 L${12 + o} 1`} style={{ stroke: 'rgb(var(--sr-ink) / 0.8)' }} strokeWidth="1.4" />
        ))}
      </svg>

      {/* maker's plate */}
      <div
        data-vt-label
        className="pointer-events-none absolute inset-x-0 top-[95.2%] z-10 flex -translate-y-1/2 items-center justify-center gap-[3%]"
      >
        <span className="h-px w-[12%]" style={{ background: 'rgb(var(--sr-glass) / 0.35)' }} />
        <span
          className="font-display text-[clamp(10px,1.05vw,15px)] tracking-[0.18em]"
          style={{ color: 'rgb(var(--sr-ink) / 0.82)' }}
        >
          VASS
        </span>
        <span className="h-px w-[12%]" style={{ background: 'rgb(var(--sr-glass) / 0.35)' }} />
      </div>
    </div>
  )
}

export { FRONT, BACK }
