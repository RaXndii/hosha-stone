/**
 * The cut plate behind a control (see "CUT STONE" in index.css): an octagon
 * with a hairline edge, lit as a gem when the control is chosen. Its control
 * is `isolate`, so the plate sits behind the control's own content and
 * nothing else; a glow, if it has one, is the control's filter: drop-shadow(),
 * which follows the cut where a box-shadow could not.
 *
 *   <button className="group relative isolate …">
 *     <Plate cut={6} edge={…} edgeHi={…} lit={on} />
 *     M
 *   </button>
 *
 * cut     how far the corners are taken off, in px
 * edge    the hairline's colour; edgeHi, its colour under a hand or focus
 * lit     the gem, 0 to 1 (true is 1)
 * fill    a flat colour for the plate itself
 */
export default function Plate({ cut, edge, edgeHi, edgeW, lit, gem, bevel, fill, className = '', style }) {
  const vars = {}
  if (cut != null) vars['--cut'] = `${cut}px`
  if (edge) vars['--edge'] = edge
  if (edgeHi) vars['--edge-hi'] = edgeHi
  if (edgeW != null) vars['--edge-w'] = `${edgeW}px`
  if (lit != null) vars['--lit'] = String(typeof lit === 'number' ? lit : lit ? 1 : 0)
  if (gem) vars['--gem'] = gem
  if (bevel != null) vars['--bevel'] = `${bevel}px`
  if (fill != null) vars.backgroundColor = fill
  return <span aria-hidden="true" className={`plate ${className}`} style={{ ...vars, ...style }} />
}
