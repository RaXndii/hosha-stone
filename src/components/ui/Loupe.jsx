/**
 * A loupe: the four corners of a viewfinder and, at its heart, a small cut
 * stone — the house's mark for looking closer. How it moves (hunting for
 * focus at rest, closing in under a hand, shutting on a press) is in
 * index.css, under "THE LOUPE". Drawn on a square of `size`; its lines stay a
 * hairline however large it is drawn.
 */
export default function Loupe({ size = 34, arm = 8, stone = true, hunt = true, className = '', style }) {
  const s = size
  const e = 0.6 // half the line's width, so the corners sit inside the square
  const corners = [
    [1, 1, `M${e} ${arm}V${e}H${arm}`],
    [-1, 1, `M${s - arm} ${e}H${s - e}V${arm}`],
    [-1, -1, `M${s - e} ${s - arm}V${s - e}H${s - arm}`],
    [1, -1, `M${arm} ${s - e}H${e}V${s - arm}`],
  ]
  // the stone, side on: a flat table, the crown sloping out to the girdle,
  // and the pavilion down to its point
  const c = s / 2
  const w = s * 0.19
  const f = (n) => Math.round(n * 100) / 100
  const table = [f(c - w * 0.5), f(c + w * 0.5), f(c - w * 0.62)]
  const girdle = [f(c - w), f(c + w), f(c - w * 0.12)]
  const point = f(c + w * 0.95)
  return (
    <svg
      viewBox={`0 0 ${s} ${s}`}
      aria-hidden="true"
      className={`loupe overflow-visible ${hunt ? 'loupe-hunt' : ''} ${className}`}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="square"
    >
      {corners.map(([x, y, d]) => (
        <g key={d} className="loupe-corner" style={{ '--x': x, '--y': y }}>
          <path d={d} vectorEffect="non-scaling-stroke" />
        </g>
      ))}
      {stone && (
        <g className="loupe-gem" strokeWidth="1" strokeLinejoin="round">
          <path className="loupe-crown" d={`M${table[0]} ${table[2]}H${table[1]}L${girdle[1]} ${girdle[2]}H${girdle[0]}Z`} />
          <path className="loupe-pavilion" d={`M${girdle[0]} ${girdle[2]}H${girdle[1]}L${c} ${point}Z`} />
        </g>
      )}
    </svg>
  )
}
