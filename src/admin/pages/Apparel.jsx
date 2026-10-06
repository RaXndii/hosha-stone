import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import { Button, C, Empty, ErrorNote, PageTitle, Status, money, useToast, when } from '../ui.jsx'

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'published', label: 'Published' },
  { id: 'draft', label: 'Drafts' },
  { id: 'archived', label: 'Archived' },
]

export default function Apparel() {
  const toast = useToast()
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [list, setList] = useState(null)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(null)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (q.trim()) params.set('q', q.trim())
    api.get(`/products?${params}`).then((l) => { setList(l); setErr(null) }).catch((e) => setErr(e.message))
  }, [status, q])
  useEffect(() => {
    const t = window.setTimeout(load, q ? 220 : 0)
    return () => window.clearTimeout(t)
  }, [load, q])

  const act = async (p, what) => {
    setBusy(`${p.id}:${what}`)
    try {
      if (what === 'duplicate') {
        const n = await api.post(`/products/${p.id}/duplicate`)
        toast(`Duplicated as ${n.number} — a draft`)
        window.location.hash = `#/apparel/${n.id}`
        return
      }
      await api.post(`/products/${p.id}/status`, { status: what })
      toast(what === 'published' ? `${p.name} is live` : what === 'archived' ? `${p.name} archived` : `${p.name} moved to drafts`)
      load()
    } catch (e) {
      toast(e.fields && Object.values(e.fields)[0] ? `${e.message} ${Object.values(e.fields)[0]}` : e.message, 'error')
    } finally { setBusy(null) }
  }

  return (
    <div className="max-w-6xl">
      <PageTitle eyebrow={list ? `${list.length} piece${list.length === 1 ? '' : 's'}` : 'Apparel'} title="Apparel">
        <Button variant="primary" onClick={() => { window.location.hash = '#/apparel/new' }}>+ Add apparel</Button>
      </PageTitle>

      <div className="admin-rise flex flex-wrap items-end justify-between gap-6 border-b pb-4" style={{ borderColor: C.line }}>
        <div className="flex gap-6" role="tablist">
          {FILTERS.map((f) => (
            <button key={f.id} role="tab" aria-selected={status === f.id} onClick={() => setStatus(f.id)} className="relative pb-2 text-[10px] font-medium uppercase tracking-[0.28em]" style={{ color: status === f.id ? C.ink : C.ink3 }}>
              {f.label}
              <span className="absolute inset-x-0 -bottom-[17px] h-px transition-opacity duration-300" style={{ background: C.violet, opacity: status === f.id ? 1 : 0 }} />
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, number, category…"
          aria-label="Search apparel"
          className="w-full bg-transparent pb-1.5 text-[13px] outline-none placeholder:opacity-35 sm:w-64"
          style={{ color: C.ink, borderBottom: `1px solid ${C.line2}` }}
        />
      </div>
      <div className="mt-4"><ErrorNote>{err}</ErrorNote></div>

      {list && !list.length && <Empty>{q ? 'Nothing matches that search.' : status ? 'Nothing here.' : 'No apparel yet — add the first piece.'}</Empty>}

      <ul className="mt-2">
        {list?.map((p) => (
          <li key={p.id} className="admin-rise grid grid-cols-[56px_1fr_auto] items-center gap-x-5 gap-y-2 border-b py-4 md:grid-cols-[64px_minmax(0,2.2fr)_1fr_1.2fr_auto]" style={{ borderColor: C.line }}>
            <a href={`#/apparel/${p.id}`} className="relative block h-[70px] w-[56px] overflow-hidden md:h-[78px] md:w-[64px]" style={{ background: 'radial-gradient(80% 70% at 50% 35%, rgb(60 50 80 / 0.5), rgb(12 10 16))', boxShadow: `inset 0 0 0 1px ${C.line}` }}>
              {p.thumb ? <img src={p.thumb} alt="" loading="lazy" className="absolute inset-[6%] h-[88%] w-[88%] object-contain" /> : <span className="absolute inset-0 grid place-items-center text-[9px] uppercase tracking-[0.2em]" style={{ color: C.ink3 }}>No photo</span>}
            </a>
            <a href={`#/apparel/${p.id}`} className="min-w-0">
              <span className="block text-[9.5px] tracking-[0.28em]" style={{ color: C.ink3 }}>HOSHA STONE / {p.number}</span>
              <span className="mt-1 block truncate text-[13.5px] uppercase tracking-[0.12em]" style={{ color: C.ink }}>
                {p.name} {p.featured && <span className="ml-2 align-middle text-[8.5px] tracking-[0.24em]" style={{ color: C.violet }}>★ FEATURED</span>}
              </span>
              <span className="mt-1 block text-[11px] md:hidden" style={{ color: C.ink2 }}>{money(p.price)} · {p.category}</span>
            </a>
            <span className="hidden text-[12px] md:block" style={{ color: C.ink2 }}>
              {money(p.price)}{p.was ? <span className="ml-2 line-through" style={{ color: C.ink3 }}>{money(p.was)}</span> : null}
              <span className="block text-[10.5px] uppercase tracking-[0.18em]" style={{ color: C.ink3 }}>{p.category}</span>
            </span>
            <span className="hidden flex-wrap gap-1.5 md:flex">
              {p.sizes.map((s) => (
                <span key={s.label} className="text-[10px] tracking-[0.06em]" style={{ color: s.available ? C.ink2 : C.ink3, textDecoration: s.available ? 'none' : 'line-through' }}>{s.label}</span>
              ))}
              <span className="block w-full text-[10.5px]" style={{ color: C.ink3 }}>Edited {when(p.updatedAt)}</span>
            </span>
            <div className="col-span-3 flex flex-wrap items-center justify-between gap-3 md:col-span-1 md:flex-col md:items-end">
              <Status value={p.status} />
              <div className="flex flex-wrap gap-1">
                <Button variant="ghost" className="h-8 px-2" onClick={() => { window.location.hash = `#/apparel/${p.id}` }}>Edit</Button>
                {p.status !== 'published' && p.status !== 'archived' && <Button variant="ghost" className="h-8 px-2" busy={busy === `${p.id}:published`} onClick={() => act(p, 'published')}>Publish</Button>}
                {p.status === 'archived' && <Button variant="ghost" className="h-8 px-2" busy={busy === `${p.id}:draft`} onClick={() => act(p, 'draft')}>Restore</Button>}
                {p.status !== 'archived' && <Button variant="ghost" className="h-8 px-2" busy={busy === `${p.id}:archived`} onClick={() => act(p, 'archived')}>Archive</Button>}
                <Button variant="ghost" className="h-8 px-2" busy={busy === `${p.id}:duplicate`} onClick={() => act(p, 'duplicate')}>Duplicate</Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
