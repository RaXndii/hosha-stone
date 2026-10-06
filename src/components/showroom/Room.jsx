const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")"

/**
 * The room the garment stands in. Every colour here is a theme variable, so
 * when the product changes the whole room is relit rather than repainted:
 * the field, the shafts, the floor and the key light all move together.
 *
 * --sr-dim (0-1) is the house lights: product changes take it up to 1 and
 * back down, so a set change happens in the dark, the way it would on a stage.
 *
 * Nothing here repaints while the room is idle. Shafts are elongated radial
 * gradients rather than masked boxes, and the key light is a fixed gradient
 * that is moved, never redrawn — the pointer only changes a transform.
 */
const SHAFTS = [
  { left: '27%', width: '15%', delay: '0s', dur: '19s', anim: 'shaft-sway', alpha: 0.2 },
  { left: '41%', width: '10%', delay: '-6s', dur: '23s', anim: 'shaft-sway-b', alpha: 0.24 },
  { left: '52%', width: '17%', delay: '-11s', dur: '27s', anim: 'shaft-sway', alpha: 0.17 },
  { left: '64%', width: '9%', delay: '-3s', dur: '17s', anim: 'shaft-sway-b', alpha: 0.13 },
]

export default function Room() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* the field */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 62% at 50% 38%, rgb(var(--sr-bg2)) 0%, rgb(var(--sr-bg1)) 46%, rgb(var(--sr-bg0)) 100%)',
        }}
      />

      {/* overhead light falling through haze */}
      {SHAFTS.map((s, i) => (
        <div
          key={i}
          className="absolute -top-[6%] h-[84%] origin-top will-change-transform"
          style={{
            left: s.left,
            width: s.width,
            background: `radial-gradient(50% 100% at 50% 0%, rgb(var(--sr-light) / ${s.alpha}) 0%, rgb(var(--sr-light) / ${s.alpha * 0.35}) 45%, transparent 100%)`,
            animation: `${s.anim} ${s.dur} ease-in-out ${s.delay} infinite`,
          }}
        />
      ))}

      {/* a key light the visitor carries: it trails the pointer with inertia.
          The gradient is drawn once at twice the room's size and slid about. */}
      <div
        className="absolute left-[-50%] top-[-50%] h-[200%] w-[200%] will-change-transform"
        style={{
          transform:
            'translate3d(calc((var(--lx, 0.5) - 0.5) * 50%), calc((var(--ly, 0.42) - 0.5) * 50%), 0)',
          background: 'radial-gradient(18% 18% at 50% 50%, rgb(var(--sr-light) / 0.1) 0%, transparent 100%)',
        }}
      />

      {/* the floor, and the light the case throws onto it */}
      <div
        className="absolute inset-x-0 bottom-0 h-[38%]"
        style={{
          background:
            'linear-gradient(to bottom, transparent 0%, rgb(var(--sr-floor) / 0.55) 40%, rgb(var(--sr-floor) / 0.92) 100%)',
        }}
      />
      <div
        className="absolute left-1/2 top-[64%] h-[22%] w-[58%] -translate-x-1/2"
        style={{
          background:
            'radial-gradient(closest-side, rgb(var(--sr-light) / 0.2) 0%, rgb(var(--sr-light) / 0.06) 48%, transparent 100%)',
        }}
      />

      {/* focus: the edges close in while the visitor is looking closer */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 95% at 50% 45%, transparent 38%, rgb(var(--sr-bg0) / 0.88) 100%)',
          opacity: 'calc(0.62 + var(--sr-focus, 0) * 0.38)',
        }}
      />

      <div
        className="absolute -inset-[12%] opacity-[0.04]"
        style={{ backgroundImage: GRAIN, animation: 'grain-shift 8s steps(5) infinite' }}
      />

      {/* house lights */}
      <div className="absolute inset-0 bg-black" style={{ opacity: 'calc(var(--sr-dim, 0) * 0.82)' }} />
    </div>
  )
}
