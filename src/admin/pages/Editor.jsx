import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, upload } from '../api.js'
import { Button, C, Confirm, ErrorNote, Input, Label, PageTitle, Section, Select, Status, Textarea, Toggle, useToast, when } from '../ui.jsx'
import { DetailsSection, FilmSection } from './Showcase.jsx'

const EMPTY = {
  name: '', number: '', styleCode: '', short: '', line: '', tagline: '', description: '',
  categoryId: '', season: 'all-season', colour: '', badge: '', price: '', was: '', featured: false, accent: '', sizes: [],
}
const SEASON_LABEL = { 'all-season': 'All season', spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' }
const BACKUP = (id) => `hs-admin-draft-${id ?? 'new'}`

const toForm = (p) => ({
  name: p.name ?? '', number: p.number ?? '', styleCode: p.styleCode ?? '', short: p.short ?? '', line: p.line ?? '',
  tagline: p.tagline ?? '', description: p.description ?? '', categoryId: p.categoryId ?? '', season: p.season ?? 'all-season',
  colour: p.colour ?? '', badge: p.badge ?? '', price: p.price ? String(p.price) : '', was: p.was ? String(p.was) : '',
  featured: !!p.featured, accent: p.accent ?? '', sizes: p.sizes ?? [],
})
const payload = (f) => ({ ...f, categoryId: f.categoryId === '' ? null : Number(f.categoryId), accent: f.accent || null })
const rgb = (a) => (a ? `rgb(${a.join(' ')})` : 'transparent')

// a guess from the file name, so most photos arrive already labelled
function guessView(name, hasFront) {
  const n = name.toLowerCase()
  if (/detail|close|zip|collar|pocket|label|fabric|texture|lining|stitch/.test(n)) return 'detail'
  if (/back|rear/.test(n)) return /3.?4|quarter/.test(n) ? 'three-quarter-back-left' : 'back'
  if (/3.?4|quarter/.test(n)) return 'three-quarter-left'
  if (/left/.test(n)) return 'left'
  if (/right/.test(n)) return 'right'
  if (/side|profile/.test(n)) return 'left'
  if (/front/.test(n)) return 'front'
  return hasFront ? 'detail' : 'front'
}

/* ---------------------------------------------------------------- sizes */
function Sizes({ systems, sizes, onChange, error }) {
  const labels = sizes.map((s) => s.label)
  const sys = labels.some((l) => systems.waist?.includes(l)) ? 'waist' : labels.includes('One size') ? 'one' : 'letter'
  const [system, setSystem] = useState(sys)
  const list = systems[system] ?? []
  const state = (l) => { const s = sizes.find((x) => x.label === l); return !s ? 'off' : s.available ? 'on' : 'sold' }
  const cycle = (l) => {
    const st = state(l)
    const next = st === 'off' ? [...sizes, { label: l, available: true }] : st === 'on' ? sizes.map((s) => (s.label === l ? { ...s, available: false } : s)) : sizes.filter((s) => s.label !== l)
    onChange(list.filter((x) => next.some((s) => s.label === x)).map((x) => next.find((s) => s.label === x)))
  }
  return (
    <div>
      <div className="flex flex-wrap items-center gap-5">
        {[['letter', 'Letters'], ['waist', 'Waist'], ['one', 'One size']].map(([id, label]) => (
          <button key={id} type="button" onClick={() => { setSystem(id); if (id !== system) onChange([]) }} className="text-[10px] uppercase tracking-[0.26em]" style={{ color: system === id ? C.ink : C.ink3, borderBottom: `1px solid ${system === id ? C.violet : 'transparent'}` }}>
            {label}
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Sizes">
        {list.map((l) => {
          const st = state(l)
          return (
            <button
              key={l}
              type="button"
              onClick={() => cycle(l)}
              aria-label={`${l}: ${st === 'off' ? 'not offered' : st === 'on' ? 'available' : 'sold out'}`}
              className="relative grid h-11 min-w-[46px] place-items-center px-2 text-[11.5px] font-medium tracking-[0.06em] transition-all duration-300"
              style={{
                color: st === 'off' ? C.ink3 : C.ink,
                background: st === 'on' ? 'rgb(154 107 255 / 0.18)' : 'transparent',
                boxShadow: st === 'on' ? 'inset 0 0 0 1px rgb(154 107 255 / 0.85)' : st === 'sold' ? `inset 0 0 0 1px ${C.line2}` : `inset 0 0 0 1px ${C.line}`,
              }}
            >
              {l}
              {st === 'sold' && <span aria-hidden="true" className="absolute left-1/2 top-1/2 h-px w-[70%] -translate-x-1/2 -translate-y-1/2 -rotate-[28deg]" style={{ background: C.ink2 }} />}
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-[11px]" style={{ color: error ? C.danger : C.ink3 }}>
        {error || 'Click a size to offer it, again to mark it sold out, again to remove it.'}
      </p>
    </div>
  )
}

/* ---------------------------------------------------------------- photos */
function Photos({ product, views, ensureSaved, onProduct, error }) {
  const toast = useToast()
  const [staged, setStaged] = useState([])
  const [cutout, setCutout] = useState(true)
  const [progress, setProgress] = useState(null)
  const [problems, setProblems] = useState([])
  const [over, setOver] = useState(false)
  const [drag, setDrag] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const inputRef = useRef(null)
  const images = product?.images ?? []
  const viewOpts = views.map((v) => ({ value: v.id, label: v.kind === 'print' ? 'Detail (close-up)' : v.label + (v.id.includes('right') ? ' — right' : v.id.includes('left') ? ' — left' : '') }))

  useEffect(() => () => staged.forEach((s) => URL.revokeObjectURL(s.url)), [staged])

  const add = (files) => {
    const ok = [...files].filter((f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|avif|heic)$/i.test(f.name))
    if (ok.length < files.length) toast('Some files were skipped — only photos can be added.', 'error')
    let hasFront = images.some((i) => i.view === 'front') || staged.some((s) => s.view === 'front')
    const next = ok.map((f) => {
      const view = guessView(f.name, hasFront)
      if (view === 'front') hasFront = true
      const big = f.size > 15 * 1024 * 1024
      return { key: `${f.name}-${f.size}-${Math.random()}`, file: f, url: URL.createObjectURL(f), view, error: big ? `${(f.size / 1048576).toFixed(1)} MB — over the 15 MB limit` : null }
    })
    setStaged((s) => [...s, ...next])
  }

  const send = async () => {
    const ready = staged.filter((s) => !s.error)
    if (!ready.length) return
    const id = await ensureSaved()
    if (!id) return
    const fd = new FormData()
    ready.forEach((s) => { fd.append('photos', s.file); fd.append('views', s.view) })
    fd.append('cutout', cutout ? '1' : '0')
    setProgress(0); setProblems([])
    try {
      const r = await upload(`/products/${id}/images`, fd, setProgress)
      const failed = r.results.filter((x) => !x.ok)
      const notCut = r.results.filter((x) => x.ok && !x.cut && x.view !== 'detail')
      setProblems([
        ...failed.map((x) => `${x.name}: ${x.error}`),
        ...(cutout ? notCut.map((x) => `${x.name}: the background wasn’t plain enough to remove, so it was kept.`) : []),
      ])
      if (r.product) onProduct(r.product)
      setStaged((s) => s.filter((x) => x.error))
      const okCount = r.results.length - failed.length
      if (okCount) toast(`${okCount} photo${okCount === 1 ? '' : 's'} added`)
    } catch (e) {
      setProblems([e.message])
    } finally { setProgress(null) }
  }

  const patch = async (body, msg) => {
    try { onProduct(await api.patch(`/products/${product.id}/images`, body)); if (msg) toast(msg) } catch (e) { toast(e.message, 'error') }
  }
  const move = (from, to) => {
    if (to < 0 || to >= images.length || from === to) return
    const ids = images.map((i) => i.id)
    const [x] = ids.splice(from, 1)
    ids.splice(to, 0, x)
    onProduct({ ...product, images: ids.map((i) => images.find((m) => m.id === i)) })
    patch({ order: ids })
  }
  const remove = async (img) => {
    try { onProduct(await api.del(`/products/${product.id}/images/${img.id}`)); toast('Photo removed') } catch (e) { toast(e.message, 'error') }
    setConfirmDel(null)
  }

  return (
    <div>
      {/* the drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files) }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        className="grid cursor-pointer place-items-center px-6 py-10 text-center transition-[background-color,box-shadow] duration-300"
        style={{ background: over ? 'rgb(154 107 255 / 0.08)' : 'rgb(239 233 225 / 0.015)', boxShadow: `inset 0 0 0 1px ${over ? C.violet : error ? C.danger : C.line2}` }}
      >
        <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: C.ink }}>Drop photos here</p>
        <p className="mt-2 text-[12px]" style={{ color: C.ink3 }}>or click to choose · JPG, PNG, WebP or AVIF · up to 15 MB each</p>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = '' }} />
      </div>
      {error && <p className="mt-2 text-[11.5px]" style={{ color: C.danger }}>{error}</p>}

      {/* staged: say what each photo shows, then upload */}
      {staged.length > 0 && (
        <div className="admin-rise mt-6 p-5" style={{ boxShadow: `inset 0 0 0 1px ${C.line2}` }}>
          <p className="text-[10px] uppercase tracking-[0.28em]" style={{ color: C.ink }}>Ready to upload — what does each photo show?</p>
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {staged.map((s) => (
              <li key={s.key} className="admin-fade">
                <div className="relative aspect-[4/5] overflow-hidden" style={{ background: 'rgb(239 233 225 / 0.04)' }}>
                  <img src={s.url} alt="" className="h-full w-full object-contain" />
                  <button type="button" aria-label="Remove" onClick={() => setStaged((l) => l.filter((x) => x.key !== s.key))} className="absolute right-1 top-1 grid h-7 w-7 place-items-center text-[12px]" style={{ background: 'rgb(7 6 9 / 0.8)', color: C.ink }}>×</button>
                </div>
                {s.error ? <p className="mt-2 text-[11px]" style={{ color: C.danger }}>{s.error}</p> : (
                  <Select id={`v-${s.key}`} value={s.view} onChange={(e) => setStaged((l) => l.map((x) => (x.key === s.key ? { ...x, view: e.target.value } : x)))} options={viewOpts} className="mt-1" />
                )}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <Toggle checked={cutout} onChange={setCutout} label="Remove plain studio backgrounds" />
            <div className="flex items-center gap-3">
              {progress !== null && <span className="text-[11px] tabular-nums" style={{ color: C.ink2 }}>{progress < 1 ? `Uploading ${Math.round(progress * 100)}%` : 'Preparing photos…'}</span>}
              <Button variant="primary" onClick={send} busy={progress !== null} disabled={!staged.some((s) => !s.error)}>Upload {staged.filter((s) => !s.error).length} photo{staged.filter((s) => !s.error).length === 1 ? '' : 's'}</Button>
            </div>
          </div>
        </div>
      )}
      {problems.length > 0 && <div className="mt-4"><ErrorNote>{problems.map((p, i) => <span key={i} className="block">{p}</span>)}</ErrorNote></div>}

      {/* the piece's photographs */}
      {images.length > 0 && (
        <ul className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
          {images.map((img, i) => (
            <li
              key={img.id}
              draggable
              onDragStart={() => setDrag(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (drag !== null) move(drag, i); setDrag(null) }}
              className="admin-fade group"
              style={{ opacity: drag === i ? 0.4 : 1 }}
            >
              <div className="relative aspect-[4/5] cursor-grab overflow-hidden active:cursor-grabbing" style={{ background: 'radial-gradient(80% 70% at 50% 35%, rgb(60 50 80 / 0.55), rgb(12 10 16))', boxShadow: img.primary ? `inset 0 0 0 1px ${C.violet}` : `inset 0 0 0 1px ${C.line}` }}>
                <img src={img.thumb} alt="" loading="lazy" className={`absolute h-full w-full ${img.view === 'detail' ? 'inset-0 object-cover' : 'inset-[6%] h-[88%] w-[88%] object-contain'}`} />
                <span className="absolute left-2 top-2 text-[9px] tabular-nums tracking-[0.2em]" style={{ color: C.ink3 }}>{String(i + 1).padStart(2, '0')}</span>
                {img.primary && <span className="absolute right-2 top-2 px-1.5 py-0.5 text-[8.5px] uppercase tracking-[0.22em]" style={{ background: C.violetSoft, color: C.ink, boxShadow: `inset 0 0 0 1px ${C.violet}` }}>Main</span>}
                <div className="absolute inset-x-0 bottom-0 flex justify-between p-1.5 opacity-100 transition-opacity duration-300 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100" style={{ background: 'linear-gradient(to top, rgb(7 6 9 / 0.9), transparent)' }}>
                  <span className="flex">
                    <button type="button" aria-label="Move earlier" onClick={() => move(i, i - 1)} className="grid h-7 w-7 place-items-center text-[12px]" style={{ color: C.ink }}>←</button>
                    <button type="button" aria-label="Move later" onClick={() => move(i, i + 1)} className="grid h-7 w-7 place-items-center text-[12px]" style={{ color: C.ink }}>→</button>
                  </span>
                  <span className="flex">
                    {!img.primary && img.view !== 'detail' && <button type="button" aria-label="Make main photo" title="Make main photo" onClick={() => patch({ primary: img.id }, 'Main photo set')} className="grid h-7 w-7 place-items-center text-[12px]" style={{ color: C.ink }}>★</button>}
                    <button type="button" aria-label="Delete photo" onClick={() => setConfirmDel(img)} className="grid h-7 w-7 place-items-center text-[13px]" style={{ color: C.danger }}>×</button>
                  </span>
                </div>
              </div>
              <Select
                id={`view-${img.id}`}
                value={img.view}
                onChange={(e) => patch({ views: { [img.id]: e.target.value } }, 'View updated')}
                options={viewOpts.filter((o) => (img.view === 'detail' ? o.value === 'detail' : o.value !== 'detail'))}
                className="mt-1"
              />
            </li>
          ))}
        </ul>
      )}
      {images.length > 0 && (
        <p className="mt-5 text-[11.5px] leading-[1.7]" style={{ color: C.ink3 }}>
          The <span style={{ color: C.ink }}>main</span> photo is the one on the home page and in Browsing. Whole-piece views (front, side, back…) become the
          360° turn in Look closer; details appear as close-ups. Drag to reorder. Photo changes save immediately.
        </p>
      )}

      <Confirm open={!!confirmDel} title="Delete this photo?" danger confirmLabel="Delete photo" onCancel={() => setConfirmDel(null)} onConfirm={() => remove(confirmDel)}>
        The photo is removed from this piece and from the site.
      </Confirm>
    </div>
  )
}

/* ---------------------------------------------------------------- the room the piece will stand in */
function RoomPreview({ product }) {
  const t = product?.theme
  const hero = product?.images?.find((i) => i.primary) ?? product?.images?.[0]
  if (!t) return null
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative h-[150px] w-[220px] overflow-hidden" style={{ background: `radial-gradient(70% 70% at 50% 35%, ${rgb(t.bg2)}, ${rgb(t.bg1)} 50%, ${rgb(t.bg0)})`, boxShadow: `inset 0 0 0 1px ${C.line}` }}>
        <span className="absolute bottom-0 left-[62%] top-0 w-[2px]" style={{ background: rgb(t.neon), boxShadow: `0 0 12px 2px ${rgb(t.neon)}` }} />
        <span className="absolute bottom-[10%] left-[20%] right-[20%] h-[16%]" style={{ background: `linear-gradient(${rgb(t.bg1)}, ${rgb(t.bg0)})`, boxShadow: `0 -1px 0 ${rgb(t.neon)}` }} />
        {hero && <img src={hero.thumb} alt="" className="absolute inset-x-[25%] bottom-[24%] top-[8%] h-[68%] w-[50%] object-contain" />}
      </div>
      <div className="flex gap-2">
        {['bg0', 'bg1', 'bg2', 'light', 'neon', 'accent'].map((k) => (
          <span key={k} title={k} className="h-8 w-8 rounded-full" style={{ background: rgb(t[k]), boxShadow: `inset 0 0 0 1px ${C.line2}` }} />
        ))}
      </div>
    </div>
  )
}

/* ================================================================ the editor */
export default function Editor({ id }) {
  const toast = useToast()
  const [product, setProduct] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saved, setSaved] = useState(EMPTY)
  const [meta, setMeta] = useState(null)
  const [categories, setCategories] = useState([])
  const [fields, setFields] = useState({})
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(null)
  const [restore, setRestore] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [typed, setTyped] = useState('')
  const [loadErr, setLoadErr] = useState(null)

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved])
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v && v.target ? (v.target.type === 'checkbox' ? v.target.checked : v.target.value) : v }))

  useEffect(() => {
    Promise.all([api.get('/meta'), api.get('/categories'), id ? api.get(`/products/${id}`) : Promise.resolve(null)])
      .then(([m, cats, p]) => {
        setMeta(m)
        setCategories(cats.filter((c) => !c.archived))
        const base = p ? toForm(p) : { ...EMPTY, number: m.nextNumber, categoryId: cats.find((c) => !c.archived)?.id ?? '' }
        setProduct(p)
        setForm(base)
        setSaved(base)
        try {
          const b = JSON.parse(window.localStorage.getItem(BACKUP(id)) || 'null')
          if (b && JSON.stringify(b.form) !== JSON.stringify(base)) setRestore(b)
        } catch { /* no backup */ }
      })
      .catch((e) => setLoadErr(e.message))
  }, [id])

  // unsaved work is kept in this browser until it is saved
  useEffect(() => {
    if (!meta) return
    try {
      // once created, the piece keeps its backup under its own id
      const key = BACKUP(product?.id ?? id)
      if (dirty) window.localStorage.setItem(key, JSON.stringify({ form, at: new Date().toISOString() }))
      else window.localStorage.removeItem(key)
    } catch { /* storage full or private */ }
  }, [form, dirty, id, meta, product?.id])
  useEffect(() => {
    if (!dirty) return
    const warn = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const fail = useCallback((e) => {
    setFields(e.fields ?? {})
    setErr(e.fields && Object.keys(e.fields).length ? `${e.message} ${Object.values(e.fields).join(' ')}` : e.message)
    toast(e.message, 'error')
  }, [toast])

  /** Save the form. Returns the product id, or null if it could not be saved. */
  const save = useCallback(async ({ quiet } = {}) => {
    setFields({}); setErr(null)
    try {
      if (!product) {
        const p = await api.post('/products', payload(form))
        try { window.localStorage.removeItem(BACKUP(null)) } catch { /* fine */ }
        setSaved(form); setProduct(p)
        window.history.replaceState(null, '', `#/apparel/${p.id}`)
        if (!quiet) toast('Draft saved')
        return p.id
      }
      const p = await api.patch(`/products/${product.id}`, payload(form))
      const f = toForm(p)
      setProduct(p); setForm(f); setSaved(f)
      if (!quiet) toast(p.status === 'published' ? 'Saved — live on the site' : 'Saved')
      return p.id
    } catch (e) { fail(e); return null }
  }, [form, product, toast, fail])

  const run = async (what, fn) => { setBusy(what); try { await fn() } finally { setBusy(null) } }

  const setStatus = (status) => run(status, async () => {
    const pid = dirty || !product ? await save({ quiet: true }) : product.id
    if (!pid) return
    try {
      const p = await api.post(`/products/${pid}/status`, { status })
      setProduct(p)
      setFields({}); setErr(null)
      toast(status === 'published' ? `${p.name} is live on the site` : status === 'archived' ? 'Archived — hidden from customers, kept here' : 'Moved to drafts — hidden from customers')
    } catch (e) { fail(e) }
  })

  const preview = () => run('preview', async () => {
    const pid = dirty || !product ? await save({ quiet: true }) : product.id
    if (pid) window.open(`/#/preview/${pid}`, '_blank', 'noopener')
  })

  const duplicate = () => run('duplicate', async () => {
    try { const n = await api.post(`/products/${product.id}/duplicate`); toast(`Duplicated as ${n.number}`); window.location.hash = `#/apparel/${n.id}` } catch (e) { fail(e) }
  })

  const destroy = () => run('delete', async () => {
    try { await api.del(`/products/${product.id}`, { confirm: typed }); toast('Deleted'); window.location.hash = '#/apparel' } catch (e) { toast(e.message, 'error') }
    setConfirm(null)
  })

  if (loadErr) return <ErrorNote>{loadErr} <a href="#/apparel" className="underline">Back to apparel</a></ErrorNote>
  if (!meta) return null
  const status = product?.status ?? 'draft'
  const catOpts = [{ value: '', label: 'Choose…' }, ...categories.map((c) => ({ value: c.id, label: c.label + (c.hidden ? ' (hidden)' : '') }))]

  return (
    <div className="max-w-5xl pb-28">
      <a href="#/apparel" className="text-[10px] uppercase tracking-[0.28em]" style={{ color: C.ink3 }}>← Apparel</a>
      <PageTitle eyebrow={product ? `Hosha Stone / ${product.number}` : 'New piece'} title={form.name || 'Add apparel'}>
        <Status value={status} />
        {product && <span className="text-[11px]" style={{ color: C.ink3 }}>Edited {when(product.updatedAt)}</span>}
      </PageTitle>

      {restore && (
        <div className="admin-rise mb-8 flex flex-wrap items-center justify-between gap-4 px-5 py-4" style={{ background: C.violetSoft, boxShadow: `inset 0 0 0 1px ${C.violet}` }}>
          <p className="text-[12.5px]" style={{ color: C.ink }}>You have unsaved changes from {when(restore.at)}.</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setRestore(null); try { window.localStorage.removeItem(BACKUP(id)) } catch { /* fine */ } }}>Discard</Button>
            <Button variant="primary" onClick={() => { setForm(restore.form); setRestore(null) }}>Restore</Button>
          </div>
        </div>
      )}
      <ErrorNote>{err}</ErrorNote>

      <div className="mt-6 space-y-12">
        <Section index="01" title="Basic information">
          <div className="grid gap-x-10 gap-y-7 md:grid-cols-2">
            <Input id="name" label="Product name" placeholder="Harrington Jacket" value={form.name} onChange={set('name')} error={fields.name} maxLength={80} />
            <Input id="number" label="Piece number" prefix="Hosha Stone /" placeholder={meta.nextNumber} value={form.number} onChange={set('number')} error={fields.number} maxLength={24} hint="unique" />
            <Select id="category" label="Category" value={form.categoryId} onChange={set('categoryId')} options={catOpts} error={fields.categoryId} />
            <Select id="season" label="Season" value={form.season} onChange={set('season')} options={meta.seasons.map((s) => ({ value: s, label: SEASON_LABEL[s] ?? s }))} error={fields.season} />
            <Input id="colour" label="Colour" placeholder="Sand" value={form.colour} onChange={set('colour')} error={fields.colour} maxLength={30} hint="for the colour filter" />
            <Input id="styleCode" label="Style code" placeholder="031S" value={form.styleCode} onChange={set('styleCode')} maxLength={24} hint="optional" />
            <Input id="tagline" label="Short description" placeholder="Worn in, never worn out." value={form.tagline} onChange={set('tagline')} maxLength={120} className="md:col-span-2" hint="shown under the name" />
            <Textarea id="description" label="Full description" placeholder="Material, fit, details…" value={form.description} onChange={set('description')} maxLength={1200} className="md:col-span-2" rows={4} />
            <Input id="short" label="Short name" placeholder="Harrington" value={form.short} onChange={set('short')} maxLength={24} hint="for “Next →” — optional" />
            <Input id="line" label="Line" placeholder="Harrington" value={form.line} onChange={set('line')} maxLength={24} hint="optional" />
          </div>
        </Section>

        <Section index="02" title="Photographs" note="Upload as many as you have — one is enough to publish. Shot on a plain background, each whole-piece photo is cut out automatically.">
          <Photos product={product} views={meta.views} ensureSaved={() => (product && !dirty ? product.id : save({ quiet: true }))} onProduct={(p) => { setProduct(p); if (p.images?.length) { setFields(({ images: _gone, ...rest }) => rest); setErr(null) } }} error={fields.images} />
        </Section>

        <Section index="03" title="Film" note="Optional. A short film of the piece — it plays from the closer look, and from a line under “Look closer”. Ten to thirty seconds is plenty.">
          <FilmSection product={product} ensureSaved={() => (product && !dirty ? product.id : save({ quiet: true }))} onProduct={setProduct} />
        </Section>

        <Section index="04" title="Details on the piece" note="Optional. Mark what is worth a closer look — a collar, a zip, a pocket. Each mark sits on the piece in the closer look and says in a line what it is.">
          <DetailsSection key={`${product?.id}-${JSON.stringify(product?.spots ?? [])}`} product={product} onProduct={setProduct} />
        </Section>

        <Section index="05" title="Sizes and availability">
          <Sizes systems={meta.sizeSystems} sizes={form.sizes} onChange={set('sizes')} error={fields.sizes} />
        </Section>

        <Section index="06" title="Price">
          <div className="grid max-w-xl gap-x-10 gap-y-7 sm:grid-cols-2">
            <Input id="price" label="Price (USD)" prefix="$" inputMode="decimal" placeholder="72" value={form.price} onChange={set('price')} error={fields.price} />
            <Input id="was" label="Original price" prefix="$" inputMode="decimal" placeholder="optional" value={form.was} onChange={set('was')} error={fields.was} hint="shown struck through" />
          </div>
        </Section>

        <Section index="07" title="Presentation" note="The room each piece is shown in is lit from the colours of its main photo. Choose an accent only to override the glow.">
          <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
            <div className="space-y-6">
              <Toggle checked={form.featured} onChange={set('featured')} label="Featured — shown first on the home page" />
              <Select id="badge" label="Tag in Browsing" value={form.badge} onChange={set('badge')} options={meta.badges.map((b) => ({ value: b, label: b || 'None' }))} error={fields.badge} />
              <div>
                <Label htmlFor="accent" error={fields.accent}>Accent glow</Label>
                <div className="mt-3 flex items-center gap-4">
                  <input id="accent" type="color" value={form.accent || '#9a6bff'} onChange={set('accent')} className="h-9 w-9 cursor-pointer" />
                  <span className="text-[12px]" style={{ color: form.accent ? C.ink : C.ink3 }}>{form.accent || 'Automatic — from the photo'}</span>
                  {form.accent && <button type="button" onClick={() => set('accent')('')} className="text-[10px] uppercase tracking-[0.24em] underline underline-offset-4" style={{ color: C.ink3 }}>Use automatic</button>}
                </div>
              </div>
            </div>
            <div>
              <Label>The room</Label>
              <div className="mt-3">{product?.images?.length ? <RoomPreview product={product} /> : <p className="text-[12px]" style={{ color: C.ink3 }}>Appears once a photo is uploaded.</p>}</div>
              {dirty && product?.images?.length > 0 && <p className="mt-2 text-[11px]" style={{ color: C.ink3 }}>Save to see the accent applied.</p>}
            </div>
          </div>
        </Section>

        {product && (
          <Section title="Danger zone">
            <div className="flex flex-wrap gap-3">
              <Button onClick={duplicate} busy={busy === 'duplicate'}>Duplicate</Button>
              {status !== 'archived' ? <Button onClick={() => setStatus('archived')} busy={busy === 'archived'}>Archive</Button> : <Button onClick={() => setStatus('draft')} busy={busy === 'draft'}>Restore to drafts</Button>}
              {status !== 'published' && <Button variant="danger" onClick={() => { setTyped(''); setConfirm('delete') }}>Delete permanently</Button>}
            </div>
            <p className="mt-3 text-[11.5px]" style={{ color: C.ink3 }}>Archiving hides the piece from customers but keeps it here, with its order history. Deleting can’t be undone.</p>
          </Section>
        )}
      </div>

      {/* the action bar stays in reach */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t px-5 py-3 lg:left-[240px] lg:px-14" style={{ background: 'rgb(9 8 12 / 0.94)', borderColor: C.line, backdropFilter: 'blur(6px)' }}>
        <div className="flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <span className="text-[11px]" style={{ color: dirty ? '#e8c98a' : C.ink3 }}>
            {dirty ? 'Unsaved changes — kept in this browser' : product ? 'All changes saved' : 'Not saved yet'}
          </span>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={preview} busy={busy === 'preview'}>Preview ↗</Button>
            <Button onClick={() => run('save', () => save())} busy={busy === 'save'} disabled={!dirty && !!product}>{status === 'published' ? 'Save changes' : 'Save draft'}</Button>
            {status === 'published'
              ? <Button onClick={() => setStatus('draft')} busy={busy === 'draft'}>Unpublish</Button>
              : <Button variant="primary" onClick={() => setStatus('published')} busy={busy === 'published'}>Publish</Button>}
          </div>
        </div>
      </div>

      <Confirm
        open={confirm === 'delete'}
        title="Delete permanently?"
        danger
        confirmLabel="Delete"
        busy={busy === 'delete'}
        disabled={typed.toUpperCase() !== product?.number}
        onCancel={() => setConfirm(null)}
        onConfirm={destroy}
      >
        <p>This removes {product?.name} and all its photos for good. Past order requests keep their record. To confirm, type the piece number <span style={{ color: C.ink }}>{product?.number}</span>.</p>
        <Input id="confirm-number" className="mt-5" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus />
      </Confirm>
    </div>
  )
}
