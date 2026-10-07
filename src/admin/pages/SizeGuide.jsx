import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Button, C, ErrorNote, Input, Label, PageTitle, Section, Select, useToast } from '../ui.jsx'

/**
 * The house's measurements, by kind of garment.
 *
 * Every number typed here is shown to customers as fact, so the site shows
 * nothing until this is filled in: an empty cell stays empty, and a kind with
 * no measurements at all is simply not published. A customer looking at a
 * piece the house has not measured is told so and offered WhatsApp instead,
 * which is better than a number that sends back the wrong size.
 *
 * Measurements are of the garment laid flat — the same way the site says they
 * are taken, in Size guide → How each is measured.
 */
const MEASURES = [
  { id: 'chest', label: 'Chest' },
  { id: 'length', label: 'Length' },
  { id: 'shoulder', label: 'Shoulder' },
  { id: 'sleeve', label: 'Sleeve' },
]
const DEFAULT_SIZES = ['S', 'M', 'L', 'XL']
const blankRow = (size) => ({ size, chest: '', length: '', shoulder: '', sleeve: '' })

export default function SizeGuide() {
  const toast = useToast()
  const [guide, setGuide] = useState(null)
  const [cats, setCats] = useState([])
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([api.get('/size-guide'), api.get('/categories')])
      .then(([g, c]) => {
        setGuide({ ...g, tables: g.tables ?? [] })
        setCats(Array.isArray(c) ? c : (c?.categories ?? []))
      })
      .catch((e) => setErr(e.message))
  }, [])

  if (!guide) return <ErrorNote>{err}</ErrorNote>

  const options = [{ value: 'all', label: 'Every piece' }, ...cats.map((c) => ({ value: c.slug, label: c.label }))]
  const taken = new Set(guide.tables.map((t) => t.category))
  const free = options.filter((o) => !taken.has(o.value))

  const setTable = (i, next) =>
    setGuide((g) => ({ ...g, tables: g.tables.map((t, k) => (k === i ? next : t)) }))

  const addTable = () => {
    if (!free.length) return
    setGuide((g) => ({ ...g, tables: [...g.tables, { category: free[0].value, rows: DEFAULT_SIZES.map(blankRow) }] }))
  }
  const removeTable = (i) => setGuide((g) => ({ ...g, tables: g.tables.filter((_, k) => k !== i) }))

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const saved = await api.put('/size-guide', guide)
      setGuide({ ...saved, tables: saved.tables ?? [] })
      const kept = (saved.tables ?? []).length
      toast(kept ? `Size guide saved — ${kept} ${kept === 1 ? 'table' : 'tables'} published` : 'Size guide saved — nothing published yet')
    } catch (x) {
      toast(x.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl pb-10">
      <PageTitle eyebrow="Settings" title="Size guide" />
      <form onSubmit={save} className="space-y-12">
        <Section
          index="01"
          title="How you measure"
          note="Every measurement is of the garment laid flat. Leave anything you have not measured empty — the site shows a dash, never a guess."
        >
          <div className="flex flex-wrap items-end gap-6">
            <Select
              id="unit"
              label="Unit"
              value={guide.unit}
              onChange={(e) => setGuide({ ...guide, unit: e.target.value })}
              options={[
                { value: 'cm', label: 'Centimetres' },
                { value: 'in', label: 'Inches' },
              ]}
              className="w-44"
            />
            <p className="pb-2 text-[11.5px]" style={{ color: C.ink3 }}>
              Customers can switch between the two — you only type one.
            </p>
          </div>
          <div className="mt-7">
            <Input
              id="note"
              label="A line to add (optional)"
              value={guide.note ?? ''}
              onChange={(e) => setGuide({ ...guide, note: e.target.value })}
              hint="e.g. “This cut runs roomy — take a size down for a close fit.”"
              maxLength={400}
            />
          </div>
        </Section>

        <Section
          index="02"
          title="Measurements"
          note="One table per kind of garment. A piece uses its own kind's table, or the one for every piece."
          actions={
            free.length ? (
              <Button type="button" variant="ghost" onClick={addTable}>+ Add a table</Button>
            ) : null
          }
        >
          {guide.tables.length === 0 && (
            <p className="text-[12px] leading-[1.8]" style={{ color: C.ink3 }}>
              Nothing published yet. Until a table is added here, every piece shows “the measurements
              for this piece are not published yet” and offers the customer WhatsApp instead.
            </p>
          )}

          <div className="space-y-10">
            {guide.tables.map((t, i) => (
              <div key={i} className="pt-2">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <Select
                    id={`cat-${i}`}
                    label="Applies to"
                    value={t.category}
                    onChange={(e) => setTable(i, { ...t, category: e.target.value })}
                    options={options.filter((o) => o.value === t.category || !taken.has(o.value))}
                    className="w-56"
                  />
                  <Button type="button" variant="ghost" onClick={() => removeTable(i)}>Remove table</Button>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th scope="col" className="pb-2 pr-3 text-left text-[10px] uppercase tracking-[0.22em]" style={{ color: C.ink3 }}>Size</th>
                        {MEASURES.map((m) => (
                          <th key={m.id} scope="col" className="pb-2 pr-3 text-left text-[10px] uppercase tracking-[0.22em]" style={{ color: C.ink3 }}>
                            {m.label}
                          </th>
                        ))}
                        <th className="pb-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {t.rows.map((r, k) => (
                        <tr key={k}>
                          <td className="py-1.5 pr-3">
                            <input
                              aria-label={`Size name, row ${k + 1}`}
                              value={r.size}
                              maxLength={6}
                              onChange={(e) => setTable(i, { ...t, rows: t.rows.map((x, j) => (j === k ? { ...x, size: e.target.value } : x)) })}
                              className="h-10 w-20 px-2 text-[12.5px] outline-none"
                              style={{ background: 'transparent', color: C.ink, boxShadow: `inset 0 0 0 1px ${C.line2}` }}
                            />
                          </td>
                          {MEASURES.map((m) => (
                            <td key={m.id} className="py-1.5 pr-3">
                              <input
                                aria-label={`${m.label}, size ${r.size || k + 1}`}
                                value={r[m.id] ?? ''}
                                inputMode="decimal"
                                placeholder="—"
                                onChange={(e) => setTable(i, { ...t, rows: t.rows.map((x, j) => (j === k ? { ...x, [m.id]: e.target.value } : x)) })}
                                className="h-10 w-20 px-2 text-[12.5px] tabular-nums outline-none"
                                style={{ background: 'transparent', color: C.ink, boxShadow: `inset 0 0 0 1px ${C.line2}` }}
                              />
                            </td>
                          ))}
                          <td className="py-1.5">
                            <button
                              type="button"
                              aria-label={`Remove the ${r.size || `row ${k + 1}`} row`}
                              onClick={() => setTable(i, { ...t, rows: t.rows.filter((_, j) => j !== k) })}
                              className="px-2 text-[16px] leading-none"
                              style={{ color: C.ink3 }}
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-3"
                  onClick={() => setTable(i, { ...t, rows: [...t.rows, blankRow('')] })}
                >
                  + Add a size
                </Button>
              </div>
            ))}
          </div>
        </Section>

        <div className="flex items-center gap-5">
          <Button type="submit" variant="primary" busy={busy}>Save the size guide</Button>
          <Label>Published to the site as soon as it is saved.</Label>
        </div>
      </form>
    </div>
  )
}
