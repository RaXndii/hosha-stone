/**
 * The house's measurements, as managed in /admin → Settings → Size guide.
 *
 * They are of the garment laid flat, not of a body — the only measurements a
 * shop can state as fact. Nothing here is ever invented: a measurement the
 * house has not published is shown as missing, and the piece's own sizes and
 * what is in stock (which the site does know) are shown regardless.
 */
export let SIZE_GUIDE = { unit: 'cm', note: '', tables: [] }

export function setSizeGuide(guide) {
  if (!guide || typeof guide !== 'object') return
  SIZE_GUIDE = {
    unit: guide.unit === 'in' ? 'in' : 'cm',
    note: typeof guide.note === 'string' ? guide.note : '',
    tables: Array.isArray(guide.tables) ? guide.tables : [],
  }
}

/** How each measurement is taken — the same words in the guide and the admin. */
export const MEASURES = [
  { id: 'chest', label: 'Chest', how: 'Straight across the front, armpit seam to armpit seam.' },
  { id: 'length', label: 'Length', how: 'From the highest point of the shoulder straight down to the hem.' },
  { id: 'shoulder', label: 'Shoulder', how: 'Across the back, from one shoulder seam to the other.' },
  { id: 'sleeve', label: 'Sleeve', how: 'From the shoulder seam to the end of the cuff.' },
]

/** The table that speaks for a piece: its own kind first, then one for everything. */
export function tableFor(product) {
  const tables = SIZE_GUIDE.tables ?? []
  return tables.find((t) => t.category === product?.category) ?? tables.find((t) => t.category === 'all') ?? null
}

/** Which measurements this table actually carries — an empty column is not drawn. */
export const columnsOf = (table) =>
  MEASURES.filter((m) => (table?.rows ?? []).some((r) => typeof r[m.id] === 'number'))

const IN = 2.54

/** A measurement, in the unit being read. A whole number keeps no decimal. */
export function show(value, from, to) {
  if (typeof value !== 'number') return null
  const v = from === to ? value : to === 'in' ? value / IN : value * IN
  return String(Math.round(v * 10) / 10)
}
