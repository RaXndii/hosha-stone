import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Button, C, ErrorNote, PageTitle, Section, Status, money, when } from '../ui.jsx'

function Stat({ label, value, href, note }) {
  return (
    <a href={href} className="admin-rise group block border-t pt-5 transition-colors duration-300" style={{ borderColor: C.line2 }}>
      <p className="text-[9.5px] font-medium uppercase tracking-[0.32em]" style={{ color: C.ink3 }}>{label}</p>
      <p className="mt-3 font-display text-[44px] leading-none tracking-[0.02em] transition-colors duration-300 group-hover:text-[#9a6bff]" style={{ color: C.ink }}>{value ?? '—'}</p>
      {note && <p className="mt-2 text-[11px]" style={{ color: C.violet }}>{note}</p>}
    </a>
  )
}

function Thumb({ src }) {
  return (
    <span className="relative block h-12 w-11 shrink-0 overflow-hidden" style={{ background: 'radial-gradient(80% 70% at 50% 35%, rgb(60 50 80 / 0.5), rgb(12 10 16))' }}>
      {src && <img src={src} alt="" loading="lazy" className="absolute inset-[6%] h-[88%] w-[88%] object-contain" />}
    </span>
  )
}

export default function Overview({ user }) {
  const [d, setD] = useState(null)
  const [err, setErr] = useState(null)
  useEffect(() => { api.get('/overview').then(setD).catch((e) => setErr(e.message)) }, [])
  const first = user.name.split(' ')[0]
  return (
    <div className="max-w-6xl">
      <PageTitle eyebrow={`Good to see you, ${first}`} title="Overview">
        <Button variant="primary" onClick={() => { window.location.hash = '#/apparel/new' }}>+ Add apparel</Button>
      </PageTitle>
      <ErrorNote>{err}</ErrorNote>
      <div className="grid grid-cols-2 gap-x-8 gap-y-10 lg:grid-cols-4">
        <Stat label="Apparel" value={d?.apparel} href="#/apparel" />
        <Stat label="Published" value={d?.published} href="#/apparel" />
        <Stat label="Drafts" value={d?.drafts} href="#/apparel" />
        <Stat label="Orders" value={d?.orders} href="#/orders" note={d?.newOrders ? `${d.newOrders} new` : null} />
      </div>

      <div className="mt-16 grid gap-14 xl:grid-cols-2">
        <Section title="Recently edited">
          {d?.recent?.length ? (
            <ul className="divide-y" style={{ borderColor: C.line }}>
              {d.recent.map((p) => (
                <li key={p.id} style={{ borderColor: C.line }}>
                  <a href={`#/apparel/${p.id}`} className="flex items-center gap-4 py-3 transition-colors duration-300 hover:bg-[rgb(239_233_225/0.03)]">
                    <Thumb src={p.thumb} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] uppercase tracking-[0.12em]" style={{ color: C.ink }}>{p.name}</span>
                      <span className="text-[10.5px] tracking-[0.14em]" style={{ color: C.ink3 }}>HOSHA STONE / {p.number} · {when(p.updated_at)}</span>
                    </span>
                    <Status value={p.status} />
                  </a>
                </li>
              ))}
            </ul>
          ) : <p className="text-[12px]" style={{ color: C.ink3 }}>Nothing yet.</p>}
        </Section>

        <Section title="Latest order requests" actions={<a href="#/orders" className="text-[10px] uppercase tracking-[0.26em]" style={{ color: C.ink3 }}>All orders →</a>}>
          {d?.latestOrders?.length ? (
            <ul>
              {d.latestOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-4 border-b py-3" style={{ borderColor: C.line }}>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px]" style={{ color: C.ink }}>{o.product_name} · {o.size}</span>
                    <span className="text-[10.5px] tracking-[0.1em]" style={{ color: C.ink3 }}>{o.ref} · {o.contact_method} · {when(o.created_at)}</span>
                  </span>
                  <span className="flex items-center gap-5"><span className="text-[12.5px]" style={{ color: C.ink2 }}>{money(o.total)}</span><Status value={o.status} /></span>
                </li>
              ))}
            </ul>
          ) : <p className="text-[12px]" style={{ color: C.ink3 }}>No order requests yet. They appear here when a customer continues to WhatsApp or Instagram.</p>}
        </Section>

        {!!d?.lowStock?.length && (
          <Section title="Running low" note="Published pieces with one size or none left available.">
            <ul className="flex flex-wrap gap-3">
              {d.lowStock.map((p) => (
                <li key={p.id}><a href={`#/apparel/${p.id}`} className="inline-block px-3 py-2 text-[11px] tracking-[0.08em]" style={{ color: C.ink, boxShadow: `inset 0 0 0 1px ${C.line2}` }}>{p.number} · {p.name}</a></li>
              ))}
            </ul>
          </Section>
        )}

        <Section title="Activity">
          {d?.activity?.length ? (
            <ul className="space-y-2.5">
              {d.activity.map((a, i) => (
                <li key={i} className="flex justify-between gap-4 text-[12px]" style={{ color: C.ink2 }}>
                  <span className="min-w-0 truncate"><span style={{ color: C.ink }}>{a.name ?? 'Someone'}</span> {a.action} <span style={{ color: C.ink3 }}>{a.subject}</span></span>
                  <span className="shrink-0 text-[11px]" style={{ color: C.ink3 }}>{when(a.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-[12px]" style={{ color: C.ink3 }}>Quiet so far.</p>}
        </Section>
      </div>
    </div>
  )
}
