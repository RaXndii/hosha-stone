import { useState } from 'react'
import Drawer from '../ui/Drawer.jsx'
import { MEASURES, SIZE_GUIDE, columnsOf, show, tableFor } from '../../data/sizeGuide.js'
import { BRAND, WHATSAPP } from '../../data/order.js'

/**
 * What the piece actually measures.
 *
 * Two things are shown, and they are not the same kind of thing. The sizes
 * this piece is cut in, and which of them are left, the site knows for
 * certain. The measurements are the house's own, entered in the admin — so
 * where the house has not given them, this says exactly that and offers to
 * ask, rather than printing a number nobody stands behind.
 *
 * Everything is the garment laid flat, which is the only measurement a shop
 * can state as a fact; how each one is taken is written out, so a visitor can
 * measure a garment they already own and compare.
 */
const ink = (a = 1) => `rgb(var(--sr-ink) / ${a})`

/** A question about this piece, ready to send on the house's own channel. */
const askUrl = (product) =>
  `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
    `${BRAND} — Sizing question\n\nPiece: ${BRAND} / ${product.number}\nProduct: ${product.name}\n\nCould you tell me the measurements?`,
  )}`

export default function SizeGuide({ open, onClose, product }) {
  const [unit, setUnit] = useState(SIZE_GUIDE.unit)
  if (!product) return null

  const table = tableFor(product)
  const columns = columnsOf(table)
  const sizes = product.sizes ?? []
  // the house's rows, in the order this piece lists its sizes
  const rows = (table?.rows ?? [])
    .slice()
    .sort((a, b) => {
      const ia = sizes.findIndex((s) => s.label === a.size)
      const ib = sizes.findIndex((s) => s.label === b.size)
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
    })

  return (
    <Drawer open={open} onClose={onClose} title="Size guide">
      <div className="space-y-9 pb-6" style={{ color: 'rgb(var(--sr-ink))' }}>
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: ink(0.45) }}>
            {BRAND} / {product.number}
          </p>
          <p className="mt-3 font-display text-xl leading-snug">{product.name}</p>
        </div>

        {/* what this piece is cut in, and what is left — the site knows this */}
        <section>
          <h3 className="text-[9.5px] uppercase tracking-[0.3em]" style={{ color: ink(0.5) }}>Cut in</h3>
          <ul className="mt-4 flex flex-wrap gap-2">
            {sizes.map(({ label, available }) => (
              <li
                key={label}
                className="relative px-3 py-2 text-[10.5px] font-medium tracking-[0.1em]"
                style={{
                  color: available ? ink(0.85) : ink(0.3),
                  boxShadow: `inset 0 0 0 1px ${available ? ink(0.2) : ink(0.07)}`,
                }}
                title={available ? 'Available' : 'Sold out'}
              >
                {label}
                {!available && (
                  <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-px w-[72%] -translate-x-1/2 -translate-y-1/2 -rotate-[22deg]" style={{ background: ink(0.3) }} />
                )}
                <span className="sr-only">{available ? ' — available' : ' — sold out'}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* the house's measurements, where it has published them */}
        <section>
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="text-[9.5px] uppercase tracking-[0.3em]" style={{ color: ink(0.5) }}>Measurements</h3>
            {columns.length > 0 && (
              <div className="flex items-center gap-1" role="group" aria-label="Units">
                {['cm', 'in'].map((u) => (
                  <button
                    key={u}
                    onClick={() => setUnit(u)}
                    aria-pressed={unit === u}
                    className="px-2 py-1 text-[9.5px] uppercase tracking-[0.2em] transition-colors duration-300"
                    style={{
                      color: unit === u ? 'rgb(var(--sr-bg0))' : ink(0.55),
                      background: unit === u ? ink(0.9) : 'transparent',
                    }}
                  >
                    {u}
                  </button>
                ))}
              </div>
            )}
          </div>

          {columns.length > 0 ? (
            <>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <caption className="sr-only">
                    {product.name} measurements, garment laid flat, in {unit === 'cm' ? 'centimetres' : 'inches'}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col" className="pb-3 pr-3 text-[9px] font-medium uppercase tracking-[0.24em]" style={{ color: ink(0.45) }}>Size</th>
                      {columns.map((c) => (
                        <th key={c.id} scope="col" className="pb-3 pr-3 text-[9px] font-medium uppercase tracking-[0.24em]" style={{ color: ink(0.45) }}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const sold = sizes.some((s) => s.label === r.size && !s.available)
                      return (
                        <tr key={r.size} style={{ borderTop: `1px solid ${ink(0.1)}` }}>
                          <th scope="row" className="py-3 pr-3 text-[11px] font-medium tracking-[0.08em]" style={{ color: sold ? ink(0.35) : ink(0.95) }}>
                            {r.size}
                            {sold && <span className="ml-2 text-[8.5px] uppercase tracking-[0.2em]" style={{ color: ink(0.3) }}>sold out</span>}
                          </th>
                          {columns.map((c) => (
                            <td key={c.id} className="py-3 pr-3 text-[11.5px] tabular-nums" style={{ color: sold ? ink(0.35) : ink(0.72) }}>
                              {show(r[c.id], SIZE_GUIDE.unit, unit) ?? '—'}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-[10.5px] leading-[1.9]" style={{ color: ink(0.42) }}>
                The garment laid flat, measured by hand — allow a centimetre either way.
              </p>
              {SIZE_GUIDE.note && (
                <p className="mt-3 whitespace-pre-line text-[11px] leading-[1.9]" style={{ color: ink(0.55) }}>{SIZE_GUIDE.note}</p>
              )}
            </>
          ) : (
            <div className="mt-5" style={{ boxShadow: `inset 0 0 0 1px ${ink(0.1)}` }}>
              <p className="p-5 text-[11.5px] leading-[1.95]" style={{ color: ink(0.6) }}>
                The measurements for this piece are not published yet. Rather than guess at them, the
                house will send you the exact ones — ask, and you will have them before you order.
              </p>
              <a
                href={askUrl(product)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between border-t px-5 py-4 text-[10px] uppercase tracking-[0.28em] transition-colors duration-300"
                style={{ borderColor: ink(0.1), color: ink(0.85) }}
              >
                Ask on WhatsApp <span style={{ color: 'rgb(var(--sr-neon))' }}>→</span>
              </a>
            </div>
          )}
        </section>

        {/* how each one is taken, so a garment at home can be compared */}
        <section>
          <h3 className="text-[9.5px] uppercase tracking-[0.3em]" style={{ color: ink(0.5) }}>How each is measured</h3>
          <dl className="mt-5 space-y-4">
            {MEASURES.map((m) => (
              <div key={m.id} className="border-t pt-4" style={{ borderColor: ink(0.1) }}>
                <dt className="text-[10px] uppercase tracking-[0.26em]" style={{ color: ink(0.82) }}>{m.label}</dt>
                <dd className="mt-2 text-[11.5px] leading-[1.9]" style={{ color: ink(0.52) }}>{m.how}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-[10.5px] leading-[1.9]" style={{ color: ink(0.42) }}>
            The surest way to choose: measure a piece you already wear and like, and match it to the
            numbers here.
          </p>
        </section>
      </div>
    </Drawer>
  )
}
