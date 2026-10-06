import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Button, C, ErrorNote, Input, PageTitle, Section, useToast } from '../ui.jsx'

/**
 * The categories customers browse by. Renaming changes the label only — the
 * address stays, so shared links keep working. A category that still holds
 * pieces can be hidden or archived, but not deleted.
 */
export default function Categories() {
  const toast = useToast()
  const [list, setList] = useState(null)
  const [err, setErr] = useState(null)
  const [label, setLabel] = useState('')
  const [fieldErr, setFieldErr] = useState(null)
  const [editing, setEditing] = useState(null)

  useEffect(() => { api.get('/categories').then(setList).catch((e) => setErr(e.message)) }, [])

  const call = async (fn, msg) => {
    try { setList(await fn()); if (msg) toast(msg); return true } catch (e) { toast(e.message, 'error'); setFieldErr(e.fields?.label ?? null); return false }
  }
  const add = async (e) => {
    e.preventDefault()
    setFieldErr(null)
    if (await call(() => api.post('/categories', { label }), `${label} added`)) setLabel('')
  }

  const active = list?.filter((c) => !c.archived) ?? []
  const archived = list?.filter((c) => c.archived) ?? []
  return (
    <div className="max-w-3xl">
      <PageTitle eyebrow="What customers browse by" title="Categories" />
      <ErrorNote>{err}</ErrorNote>

      <form onSubmit={add} className="admin-rise flex items-end gap-4">
        <Input id="new-cat" label="New category" placeholder="Denim" value={label} onChange={(e) => setLabel(e.target.value)} error={fieldErr} maxLength={30} className="flex-1" />
        <Button type="submit" variant="primary" disabled={!label.trim()}>Add</Button>
      </form>

      <Section title="In use" note="Empty categories show as “Soon” in Browsing. Hidden ones disappear from the site, and so do their pieces.">
        <ul>
          {active.map((c, i) => (
            <li key={c.id} className="flex flex-wrap items-center gap-4 border-b py-3.5" style={{ borderColor: C.line }}>
              <span className="flex flex-col">
                <button aria-label="Move up" disabled={i === 0} onClick={() => call(() => api.patch(`/categories/${c.id}`, { move: 'up' }))} className="h-4 text-[9px] disabled:opacity-20" style={{ color: C.ink2 }}>▲</button>
                <button aria-label="Move down" disabled={i === active.length - 1} onClick={() => call(() => api.patch(`/categories/${c.id}`, { move: 'down' }))} className="h-4 text-[9px] disabled:opacity-20" style={{ color: C.ink2 }}>▼</button>
              </span>
              {editing?.id === c.id ? (
                <form className="flex flex-1 items-end gap-3" onSubmit={async (e) => { e.preventDefault(); if (await call(() => api.patch(`/categories/${c.id}`, { label: editing.label }), 'Renamed')) setEditing(null) }}>
                  <Input id={`cat-${c.id}`} value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} autoFocus maxLength={30} className="flex-1" />
                  <Button type="submit" variant="primary" className="h-8">Save</Button>
                  <Button type="button" variant="ghost" className="h-8" onClick={() => setEditing(null)}>Cancel</Button>
                </form>
              ) : (
                <span className="min-w-0 flex-1">
                  <span className="text-[13px] uppercase tracking-[0.16em]" style={{ color: c.hidden ? C.ink3 : C.ink }}>{c.label}</span>
                  <span className="ml-3 text-[11px]" style={{ color: C.ink3 }}>{c.products} piece{c.products === 1 ? '' : 's'}{c.hidden ? ' · hidden' : ''}</span>
                </span>
              )}
              {editing?.id !== c.id && (
                <span className="flex flex-wrap gap-1">
                  <Button variant="ghost" className="h-8 px-2" onClick={() => setEditing({ id: c.id, label: c.label })}>Rename</Button>
                  <Button variant="ghost" className="h-8 px-2" onClick={() => call(() => api.patch(`/categories/${c.id}`, { hidden: !c.hidden }), c.hidden ? `${c.label} visible` : `${c.label} hidden`)}>{c.hidden ? 'Show' : 'Hide'}</Button>
                  {c.products ? (
                    <Button variant="ghost" className="h-8 px-2" onClick={() => call(() => api.patch(`/categories/${c.id}`, { archived: true }), `${c.label} archived`)}>Archive</Button>
                  ) : (
                    <Button variant="ghost" className="h-8 px-2" onClick={() => call(() => api.del(`/categories/${c.id}`), `${c.label} deleted`)}>Delete</Button>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      </Section>

      {archived.length > 0 && (
        <Section title="Archived">
          <ul>
            {archived.map((c) => (
              <li key={c.id} className="flex items-center justify-between border-b py-3" style={{ borderColor: C.line }}>
                <span className="text-[12.5px] uppercase tracking-[0.16em]" style={{ color: C.ink3 }}>{c.label} <span className="ml-2 normal-case tracking-normal">{c.products} piece{c.products === 1 ? '' : 's'}</span></span>
                <Button variant="ghost" className="h-8 px-2" onClick={() => call(() => api.patch(`/categories/${c.id}`, { archived: false, hidden: false }), `${c.label} restored`)}>Restore</Button>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
