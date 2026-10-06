const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")"

const c = (v, a = 1) => `rgb(var(--sr-${v}) / ${a})`

/**
 * The stage the piece floats over: a dark room, a stone plinth, a slab of
 * glass with a neon edge, a rock in the shadows and mist on the floor.
 *
 * Nothing here has a colour of its own. Every surface is lit by the piece's
 * theme — the field by its palette, the neon by `--sr-neon`, a colour taken
 * from the garment itself — so changing the piece relights the whole set.
 *
 * Geometry is shared through custom properties set per breakpoint on the root,
 * so the plinth, the slab and the mist stay in register on a phone and a desk.
 *   --pl-t / --pl-b            the plinth: top of its upper face, and its foot
 *   --pl-l / --pl-r            the plinth's sides
 *   --mo-l / --mo-w / --mo-b   the glass slab: left, width, distance from the floor
 *
 * Nothing repaints while the set is idle: lights are gradients that are moved
 * or faded, never redrawn, and the only loops change transform and opacity.
 */
const GEOMETRY =
  '[--pl-t:56%] [--pl-b:37%] [--pl-l:5%] [--pl-r:5%] [--mo-l:73%] [--mo-w:15%] [--mo-b:42%] ' +
  'lg:[--pl-t:77%] lg:[--pl-b:0%] lg:[--pl-l:24%] lg:[--pl-r:31.5%] lg:[--mo-l:64.5%] lg:[--mo-w:8%] lg:[--mo-b:20%] ' +
  // wide screens have room for the plinth to run long, the way the reference has it
  'xl:[--pl-l:27%] xl:[--pl-r:30%]'

function Monolith() {
  return (
    <div
      data-monolith
      className="absolute"
      style={{ left: 'var(--mo-l)', width: 'var(--mo-w)', top: '-2%', bottom: 'var(--mo-b)' }}
    >
      {/* the neon's light thrown wide into the room */}
      <div
        data-neon-glow
        className="absolute -left-[22vw] top-[8%] h-[96%] w-[44vw]"
        style={{ background: `radial-gradient(closest-side, ${c('neon', 0.16)}, transparent)`, animation: 'neon-breathe 7s ease-in-out infinite' }}
      />
      {/* the glass body: lit along the neon edge, falling into shadow */}
      <div
        className="absolute inset-0 overflow-hidden rounded-br-[22px]"
        style={{
          background: `linear-gradient(90deg, ${c('neon', 0.13)}, ${c('glass', 0.04)} 22%, ${c('bg0', 0.25)} 100%)`,
          boxShadow: `inset -1px 0 0 ${c('glass', 0.14)}, inset 0 -1px 0 ${c('glass', 0.1)}`,
        }}
      >
        {/* a reflection in the glass, drifting against the visitor's light */}
        <div
          className="absolute inset-y-0 left-[-80%] w-[260%] will-change-transform"
          style={{
            transform: 'translate3d(calc(var(--dx, 0) * -10%), 0, 0)',
            background: `linear-gradient(104deg, transparent 38%, ${c('glass', 0.07)} 46%, transparent 54%)`,
          }}
        />
      </div>
      {/* the second, quieter edge of the slab */}
      <span className="absolute right-0 top-[4%] h-[86%] w-px" style={{ background: `linear-gradient(to bottom, transparent, ${c('glass', 0.18)} 30%, ${c('neon', 0.3)} 85%, transparent)` }} />
      {/* the neon itself: a coloured line with a pale core, and its halo */}
      <span
        data-neon-line
        className="absolute left-0 top-0 h-full w-[3px] origin-bottom"
        style={{
          background: `linear-gradient(to bottom, ${c('neon', 0.15)}, ${c('neon', 0.95)} 16%, ${c('neon', 0.75)} 52%, ${c('neon')} 90%, ${c('neon', 0.9)})`,
          boxShadow: `0 0 14px 2px ${c('neon', 0.55)}, 0 0 42px 8px ${c('neon', 0.25)}`,
          animation: 'neon-breathe 7s ease-in-out infinite',
        }}
      >
        <span className="absolute inset-y-[14%] left-[1px] w-px" style={{ background: 'linear-gradient(to bottom, transparent, rgb(255 255 255 / 0.75) 30%, rgb(255 255 255 / 0.55) 80%, transparent)' }} />
      </span>
    </div>
  )
}

function Plinth() {
  return (
    <div data-plinth className="absolute" style={{ top: 'var(--pl-t)', bottom: 'var(--pl-b)', left: 'var(--pl-l)', right: 'var(--pl-r)' }}>
      {/* the upper face, seen from a little above */}
      <div
        className="absolute inset-x-0 top-0 h-[2.6svh] lg:h-[3.8vh]"
        style={{
          clipPath: 'polygon(4% 0, 96% 0, 100% 100%, 0 100%)',
          background: `linear-gradient(90deg, ${c('bg2', 0.5)}, ${c('light', 0.1)} 46%, ${c('neon', 0.3)} 82%, ${c('neon', 0.55)} 92%, ${c('bg2', 0.5)})`,
        }}
      >
        {/* the piece's shadow on the stone */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(26% 90% at 46% 30%, rgb(0 0 0 / 0.55), transparent)' }} />
      </div>
      {/* the front face: dark stone, lit from the neon side */}
      <div
        className="absolute inset-x-0 bottom-0 top-[2.6svh] lg:top-[3.8vh]"
        style={{
          background: `linear-gradient(to left, ${c('neon', 0.2)}, transparent 28%), linear-gradient(to bottom, ${c('bg1')}, ${c('bg0')} 75%)`,
        }}
      >
        <div className="absolute inset-0 opacity-[0.09]" style={{ backgroundImage: GRAIN }} />
        {/* faint veins in the stone */}
        <div
          className="absolute inset-0 opacity-[0.22]"
          style={{
            background: `linear-gradient(162deg, transparent 40%, ${c('light', 0.05)} 41%, transparent 42.5%), linear-gradient(17deg, transparent 62%, ${c('light', 0.04)} 63%, transparent 64%), linear-gradient(141deg, transparent 72%, ${c('neon', 0.08)} 73%, transparent 74.5%)`,
          }}
        />
      </div>
      {/* the front edge catches the light */}
      <span
        className="absolute inset-x-0 top-[2.6svh] h-px lg:top-[3.8vh]"
        style={{ background: `linear-gradient(90deg, transparent, ${c('light', 0.22)} 30%, ${c('light', 0.3)} 60%, ${c('neon')} 86%, ${c('neon', 0.4)})` }}
      />
      <span
        className="absolute inset-x-0 top-[calc(2.6svh_-_3px)] h-[7px] lg:top-[calc(3.8vh_-_3px)]"
        style={{ background: `linear-gradient(90deg, transparent 60%, ${c('neon', 0.35)} 86%, transparent)` }}
      />
    </div>
  )
}

function Rock() {
  const ridge =
    'M0 60 C10 46 22 30 38 33 C50 35 56 50 68 49 C84 47 94 64 110 72 C128 81 140 90 158 103 C180 118 204 129 230 148 C252 164 276 182 300 204'
  return (
    <svg data-rock viewBox="0 0 300 220" preserveAspectRatio="none" className="absolute bottom-[3%] left-0 hidden h-[30%] w-[19%] lg:block" aria-hidden="true">
      <defs>
        <linearGradient id="rock-fill" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" style={{ stopColor: 'rgb(var(--sr-bg2))', stopOpacity: 0.5 }} />
          <stop offset="45%" style={{ stopColor: 'rgb(var(--sr-bg1))' }} />
          <stop offset="100%" style={{ stopColor: 'rgb(var(--sr-bg0))' }} />
        </linearGradient>
        <linearGradient id="rock-rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" style={{ stopColor: 'rgb(var(--sr-light))', stopOpacity: 0.2 }} />
          <stop offset="45%" style={{ stopColor: 'rgb(var(--sr-light))', stopOpacity: 0.08 }} />
          <stop offset="100%" style={{ stopColor: 'rgb(var(--sr-light))', stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path d={ridge + ' L300 220 L0 220 Z'} fill="url(#rock-fill)" />
      {/* a darker facet, so the mass reads as stone rather than a silhouette */}
      <path d="M0 120 C30 104 58 98 84 108 C112 118 132 140 168 150 C200 160 240 176 300 212 L300 220 L0 220 Z" style={{ fill: 'rgb(var(--sr-bg0) / 0.55)' }} />
      <path d={ridge} fill="none" stroke="url(#rock-rim)" strokeWidth="1.1" />
    </svg>
  )
}

/** Everything behind the piece. */
export function SceneBack() {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 h-[100svh] overflow-hidden lg:h-full ${GEOMETRY}`}>
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(75% 70% at 50% 34%, ${c('bg2')} 0%, ${c('bg1')} 46%, ${c('bg0')} 100%)` }}
      />
      {/* the neon's colour hanging in the air of the room */}
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(40% 62% at var(--mo-l) 52%, ${c('neon', 0.14)}, transparent 72%)` }}
      />
      {/* a light from above, falling on the piece */}
      <div
        className="absolute left-1/2 top-[-12%] h-[96%] w-[64%] -translate-x-1/2"
        style={{ background: `radial-gradient(48% 100% at 50% 0%, ${c('light', 0.14)} 0%, ${c('light', 0.045)} 52%, transparent 100%)` }}
      />
      {[
        { left: '38%', width: '11%', dur: '21s', anim: 'shaft-sway', alpha: 0.1 },
        { left: '49%', width: '9%', dur: '26s', anim: 'shaft-sway-b', alpha: 0.08 },
      ].map((s, i) => (
        <div
          key={i}
          className="absolute -top-[6%] h-[80%] origin-top will-change-transform"
          style={{
            left: s.left,
            width: s.width,
            background: `radial-gradient(50% 100% at 50% 0%, ${c('light', s.alpha)} 0%, transparent 100%)`,
            animation: `${s.anim} ${s.dur} ease-in-out ${-i * 7}s infinite`,
          }}
        />
      ))}
      {/* the visitor's light, once they reach for the piece */}
      <div
        className="absolute left-[-50%] top-[-50%] h-[200%] w-[200%] will-change-transform"
        style={{
          transform: 'translate3d(calc((var(--lx, 0.5) - 0.5) * 50%), calc((var(--ly, 0.42) - 0.5) * 50%), 0)',
          background: `radial-gradient(16% 16% at 50% 50%, ${c('light', 0.08)} 0%, transparent 100%)`,
        }}
      />

      <Monolith />

      {/* the floor, and the mist lying on it */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{ top: 'calc(var(--pl-t) - 6%)', background: `linear-gradient(to bottom, transparent, ${c('floor', 0.7)} 35%, ${c('floor')} 100%)` }}
      />
      <div
        className="absolute h-[34%] w-[80%] will-change-transform"
        style={{
          left: '6%',
          top: 'calc(var(--pl-t) - 20%)',
          background: `radial-gradient(closest-side, ${c('light', 0.07)}, ${c('neon', 0.05)} 55%, transparent)`,
          animation: 'fog-drift 34s ease-in-out infinite',
        }}
      />

      <Rock />
      <Plinth />
      {/* the neon's reflection, running down the face of the stone */}
      <div
        className="absolute h-[16%] w-[3.2vw] -translate-x-1/2"
        style={{
          left: 'var(--mo-l)',
          top: 'calc(var(--pl-t) + 3.8vh)',
          background: `radial-gradient(50% 100% at 50% 0%, ${c('neon', 0.3)}, transparent)`,
        }}
      />
      {/* where the neon meets the stone, the stone glows */}
      <div
        className="absolute h-[12vh] w-[38vw] -translate-x-1/2 -translate-y-1/2"
        style={{
          left: 'var(--mo-l)',
          top: 'calc(var(--pl-t) + 1.4vh)',
          background: `radial-gradient(closest-side, ${c('neon', 0.34)}, ${c('neon', 0.07)} 55%, transparent)`,
        }}
      />
    </div>
  )
}

/** Mist in front of the piece's hem, the edges closing in, grain, and the house lights. */
export function SceneFront() {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-x-0 top-0 z-[12] h-[100svh] overflow-hidden lg:h-full ${GEOMETRY}`}>
      <div
        className="absolute h-[22%] w-[70%] will-change-transform"
        style={{
          left: '22%',
          top: 'calc(var(--pl-t) - 10%)',
          background: `radial-gradient(closest-side, ${c('neon', 0.12)}, ${c('light', 0.04)} 60%, transparent)`,
          animation: 'fog-drift-b 41s ease-in-out infinite',
        }}
      />
      <div
        className="absolute h-[18%] w-[46%] will-change-transform"
        style={{
          left: '-6%',
          top: 'calc(var(--pl-t) + 2%)',
          background: `radial-gradient(closest-side, ${c('light', 0.06)}, transparent)`,
          animation: 'fog-drift 47s ease-in-out -12s infinite',
        }}
      />
      {/* focus: the edges close in, more so while the closer look is open */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 100% at 50% 45%, transparent 42%, ${c('bg0', 0.85)} 100%)`,
          opacity: 'calc(0.7 + var(--sr-focus, 0) * 0.3)',
        }}
      />
      <div className="absolute -inset-[12%] opacity-[0.045]" style={{ backgroundImage: GRAIN, animation: 'grain-shift 8s steps(5) infinite' }} />
      {/* phone: the set ends with the first screen, so it fades into the page below */}
      <div className="absolute inset-x-0 bottom-0 h-[16%] lg:hidden" style={{ background: `linear-gradient(to bottom, transparent, ${c('bg0')})` }} />
    </div>
  )
}

/** The house lights: a product change happens in the dark, the way it would on a stage. */
export function HouseLights() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[13] bg-black"
      style={{ opacity: 'calc(var(--sr-dim, 0) * 0.8)' }}
    />
  )
}
