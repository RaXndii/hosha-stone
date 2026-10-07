import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import { C, Empty, ErrorNote, PageTitle, Status, money, useToast, when } from '../ui.jsx'

const STATUSES = ['new', 'contacted', 'confirmed', 'completed', 'cancelled']
const LABEL = { new: 'New', contacted: 'Contacted', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled' }

/**
 * Order requests, as customers left for WhatsApp or Instagram. Each carries the
 * reference printed in the customer's message, so a chat can be matched to
 * its record. Recorded as NEW — the customer may not have pressed send yet.
 */
export default function Orders() {
  const toast = useToast()
  const [filter, setFilter] = useState('')
  const [list, setList] = useState(null)
  const [err, setErr] = useState(null)
  const [open, setOpen] = useState(null)

  const load = useCallback(() => {
    api.get(`/orders${filter ? `?status=${filter}` : ''}`).then((l) => { setList(l); setErr(null) }).catch((e) => setErr(e.message))
  }, [filter])
  useEffect(load, [load])

  const update = async (o, body, msg) => {
    try {
      const n = await api.patch(`/orders/${o.id}`, body)
      setList((l) => l.map((x) => (x.id === o.id ? { ...x, ...n } : x)))
      if (msg) toast(msg)
    } catch (e) { toast(e.message, 'error') }
  }

  return (
    <div className="max-w-6xl">
      <PageTitle eyebrow="Requests sent by WhatsApp and Instagram" title="Orders" />
      <div className="admin-rise flex flex-wrap gap-6 border-b pb-4" style={{ borderColor: C.line }}>
        {['', ...STATUSES].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className="relative pb-2 text-[10px] font-medium uppercase tracking-[0.28em]" style={{ color: filter === s ? C.ink : C.ink3 }}>
            {s ? LABEL[s] : 'All'}
            <span className="absolute inset-x-0 -bottom-[17px] h-px" style={{ background: C.violet, opacity: filter === s ? 1 : 0 }} />
          </button>
        ))}
      </div>
      <div className="mt-4"><ErrorNote>{err}</ErrorNote></div>
      {list && !list.length && <Empty>{filter ? 'No orders with that status.' : 'No order requests yet.'}</Empty>}

      <ul>
        {list?.map((o) => (
          <li key={o.id} className="admin-rise border-b" style={{ borderColor: C.line }}>
            <button onClick={() => setOpen(open === o.id ? null : o.id)} aria-expanded={open === o.id} className="grid w-full grid-cols-[44px_1fr_auto] items-center gap-x-4 gap-y-1 py-4 text-left md:grid-cols-[44px_120px_minmax(0,1.6fr)_1fr_90px_120px]">
              <span className="relative block h-12 w-11 overflow-hidden" style={{ background: 'radial-gradient(80% 70% at 50% 35%, rgb(60 50 80 / 0.5), rgb(12 10 16))' }}>
                {o.thumb && <img src={o.thumb} alt="" loading="lazy" className="absolute inset-[6%] h-[88%] w-[88%] object-contain" />}
              </span>
              <span className="hidden text-[11px] tracking-[0.14em] md:block" style={{ color: C.ink2 }}>{o.ref}<span className="block text-[10.5px] tracking-normal" style={{ color: C.ink3 }}>{when(o.created_at)}</span></span>
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] uppercase tracking-[0.1em]" style={{ color: C.ink }}>{o.product_name} · {o.size}</span>
                <span className="text-[10.5px] tracking-[0.12em]" style={{ color: C.ink3 }}>HOSHA STONE / {o.product_number} <span className="md:hidden">· {o.ref}</span></span>
              </span>
              <span className="hidden min-w-0 text-[12px] md:block" style={{ color: C.ink2 }}>
                <span className="block truncate">{o.customer_name}</span>
                <span className="block truncate text-[11px]" style={{ color: C.ink3 }}>{o.location} · {o.contact_method === 'whatsapp' ? 'WhatsApp' : 'Instagram'}</span>
              </span>
              <span className="hidden text-[13px] md:block" style={{ color: C.ink }}>{money(o.total)}</span>
              <span className="justify-self-end"><Status value={o.status} /></span>
            </button>
            {open === o.id && (
              <div className="admin-fade grid gap-8 pb-6 pl-0 md:grid-cols-2 md:pl-[60px]">
                <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-[12px]">
                  {[
                    ['Reference', o.ref],
                    ['Customer', o.customer_name],
                    ['Location', o.location],
                    ['Via', o.contact_method === 'whatsapp' ? 'WhatsApp' : 'Instagram'],
                    ['Language', o.language === 'ku' ? 'Kurdish (Sorani)' : 'English'],
                    ['Price', money(o.price)],
                    ['Delivery', money(o.delivery_fee)],
                    ['Total', money(o.total)],
                    ['Received', new Date(o.created_at.replace(' ', 'T') + 'Z').toLocaleString()],
                  ].map(([k, v]) => (
                    <div key={k} className="contents"><dt style={{ color: C.ink3 }}>{k}</dt><dd style={{ color: C.ink }}>{v}</dd></div>
                  ))}
                </dl>
                <div>
                  <p className="text-[9.5px] uppercase tracking-[0.28em]" style={{ color: C.ink3 }}>Status</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {STATUSES.map((s) => (
                      <button key={s} onClick={() => s !== o.status && update(o, { status: s }, `Marked ${LABEL[s].toLowerCase()}`)} className="h-9 px-3 text-[10px] uppercase tracking-[0.22em] transition-colors duration-300" style={{ color: o.status === s ? C.ink : C.ink3, background: o.status === s ? C.violetSoft : 'transparent', boxShadow: `inset 0 0 0 1px ${o.status === s ? C.violet : C.line2}` }}>
                        {LABEL[s]}
                      </button>
                    ))}
                  </div>
                  <p className="mt-6 text-[9.5px] uppercase tracking-[0.28em]" style={{ color: C.ink3 }}>Note</p>
                  <textarea
                    defaultValue={o.note}
                    onBlur={(e) => e.target.value !== o.note && update(o, { note: e.target.value }, 'Note saved')}
                    rows={3}
                    maxLength={500}
                    placeholder="Delivery time, payment, anything to remember…"
                    className="mt-2 w-full bg-transparent px-3 py-2 text-[12.5px] outline-none placeholder:opacity-30"
                    style={{ color: C.ink, boxShadow: `inset 0 0 0 1px ${C.line2}` }}
                  />
                  {o.slug && <a href={`/piece/${o.slug}`} target="_blank" rel="noreferrer" className="mt-3 inline-block text-[10px] uppercase tracking-[0.26em]" style={{ color: C.ink3 }}>View piece ↗</a>}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
