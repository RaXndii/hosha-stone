import { useEffect, useRef, useState } from 'react'
import { api, upload } from '../api.js'
import { Button, C, Confirm, ErrorNote, Input, Select, useToast } from '../ui.jsx'

/**
 * The two things the closer look shows beyond photographs: the piece's film,
 * and the details marked on its front.
 */
const FILM_MAX = 80 * 1024 * 1024
const fmt = (s) => {
  const t = Math.max(0, Math.floor(s || 0))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
}

/** This browser draws the film's first frame and a still from its middle, if it can play it. */
async function framesOf(url) {
  const v = document.createElement('video')
  v.muted = true
  v.playsInline = true
  v.preload = 'auto'
  v.src = url
  try {
    await new Promise((resolve, reject) => {
      v.onloadeddata = resolve
      v.onerror = reject
      window.setTimeout(reject, 10000)
    })
  } catch {
    return { duration: Number.isFinite(v.duration) ? v.duration : null, poster: null, cover: null }
  }
  const duration = Number.isFinite(v.duration) ? v.duration : null
  const draw = (t) => new Promise((resolve) => {
    const done = () => {
      try {
        const c = document.createElement('canvas')
        const k = Math.min(1, 1280 / (v.videoWidth || 1280))
        c.width = Math.round((v.videoWidth || 1280) * k)
        c.height = Math.round((v.videoHeight || 720) * k)
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height)
        c.toBlob((b) => resolve(b), 'image/jpeg', 0.86)
      } catch { resolve(null) }
    }
    v.onseeked = done
    v.currentTime = t
    window.setTimeout(() => resolve(null), 6000)
  })
  const poster = await draw(0.04)
  const cover = duration ? await draw(duration * 0.6) : null
  v.removeAttribute('src')
  v.load()
  return { duration, poster, cover }
}

/* ---------------------------------------------------------------- the film */

export function FilmSection({ product, ensureSaved, onProduct }) {
  const toast = useToast()
  const [staged, setStaged] = useState(null)
  const [reading, setReading] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)
  const [confirmDel, setConfirmDel] = useState(false)
  const [over, setOver] = useState(false)
  const inputRef = useRef(null)
  const film = product?.film

  useEffect(() => () => { if (staged?.url) URL.revokeObjectURL(staged.url) }, [staged])

  const choose = async (file) => {
    setError(null)
    if (!file) return
    if (!/\.(mp4|m4v|mov)$/i.test(file.name) && !/^video\/(mp4|quicktime)$/.test(file.type)) { setError('Choose an MP4 (or a .mov from a phone).'); return }
    if (file.size > FILM_MAX) { setError(`That film is ${Math.round(file.size / 1048576)} MB — the limit is ${FILM_MAX / 1048576} MB. Export it shorter or smaller.`); return }
    const url = URL.createObjectURL(file)
    setReading(true)
    const frames = await framesOf(url)
    setReading(false)
    setStaged({ file, url, ...frames })
  }

  const send = async () => {
    if (!staged) return
    const id = await ensureSaved()
    if (!id) return
    const fd = new FormData()
    fd.append('film', staged.file)
    if (staged.poster) fd.append('poster', staged.poster, 'poster.jpg')
    if (staged.cover) fd.append('cover', staged.cover, 'cover.jpg')
    if (staged.duration) fd.append('duration', String(staged.duration))
    setProgress(0)
    setError(null)
    try {
      const p = await upload(`/products/${id}/film`, fd, setProgress)
      onProduct(p)
      setStaged(null)
      toast('Film added — it plays from the closer look')
    } catch (e) {
      setError(e.message)
    } finally { setProgress(null) }
  }

  const remove = async () => {
    try { onProduct(await api.del(`/products/${product.id}/film`)); toast('Film removed') } catch (e) { toast(e.message, 'error') }
    setConfirmDel(false)
  }

  return (
    <div>
      {film && !staged && (
        <div className="flex flex-wrap items-start gap-6">
          <video src={film.src} poster={film.poster || undefined} controls playsInline preload="metadata" className="aspect-video w-full max-w-[420px] bg-black" style={{ boxShadow: `inset 0 0 0 1px ${C.line}` }} />
          <div className="space-y-3">
            <p className="text-[12.5px]" style={{ color: C.ink }}>{fmt(film.duration)} · plays from the closer look and under “Look closer”.</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => inputRef.current?.click()}>Replace film</Button>
              <Button variant="danger" onClick={() => setConfirmDel(true)}>Remove film</Button>
            </div>
          </div>
        </div>
      )}

      {!film && !staged && (
        <div
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); choose(e.dataTransfer.files?.[0]) }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          className="grid cursor-pointer place-items-center px-6 py-9 text-center transition-[background-color,box-shadow] duration-300"
          style={{ background: over ? 'rgb(154 107 255 / 0.08)' : 'rgb(239 233 225 / 0.015)', boxShadow: `inset 0 0 0 1px ${over ? C.violet : C.line2}` }}
        >
          <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: C.ink }}>{reading ? 'Reading the film…' : 'Drop a film here'}</p>
          <p className="mt-2 text-[12px]" style={{ color: C.ink3 }}>or click to choose · MP4 (H.264) or an iPhone .mov set to “Most Compatible” · up to {FILM_MAX / 1048576} MB · under 30 seconds is best</p>
        </div>
      )}
      <input ref={inputRef} type="file" accept="video/mp4,video/quicktime,.mp4,.m4v,.mov" hidden onChange={(e) => { choose(e.target.files?.[0]); e.target.value = '' }} />

      {staged && (
        <div className="admin-rise flex flex-wrap items-start gap-6 p-5" style={{ boxShadow: `inset 0 0 0 1px ${C.line2}` }}>
          <video src={staged.url} controls muted playsInline className="aspect-video w-full max-w-[360px] bg-black" />
          <div className="min-w-[14rem] flex-1 space-y-3">
            <p className="text-[12.5px]" style={{ color: C.ink }}>{staged.file.name}</p>
            <p className="text-[12px]" style={{ color: C.ink3 }}>
              {(staged.file.size / 1048576).toFixed(1)} MB{staged.duration ? ` · ${fmt(staged.duration)}` : ''}
              {!staged.poster && ' · this browser can’t show it, so the server will check it'}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" onClick={send} busy={progress !== null}>{film ? 'Replace the film' : 'Upload film'}</Button>
              <Button variant="ghost" onClick={() => setStaged(null)} disabled={progress !== null}>Cancel</Button>
              {progress !== null && <span className="text-[11px] tabular-nums" style={{ color: C.ink2 }}>{progress < 1 ? `Uploading ${Math.round(progress * 100)}%` : 'Preparing the film…'}</span>}
            </div>
          </div>
        </div>
      )}
      {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}

      <Confirm open={confirmDel} title="Remove the film?" danger confirmLabel="Remove film" onCancel={() => setConfirmDel(false)} onConfirm={remove}>
        The film is taken off this piece and off the site.
      </Confirm>
    </div>
  )
}

/* ---------------------------------------------------------------- the details marked on the front */

export function DetailsSection({ product, onProduct }) {
  const toast = useToast()
  const front = product?.images?.find((i) => i.primary && i.view !== 'detail') ?? product?.images?.find((i) => i.view === 'front')
  const prints = (product?.images ?? []).filter((i) => i.view === 'detail')
  const [spots, setSpots] = useState(() => product?.spots ?? [])
  const [active, setActive] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const imgRef = useRef(null)
  const drag = useRef(null)
  const dirty = JSON.stringify(spots) !== JSON.stringify(product?.spots ?? [])

  if (!product) return <p className="text-[12px]" style={{ color: C.ink3 }}>Save the piece first.</p>
  if (!front) return <p className="text-[12px]" style={{ color: C.ink3 }}>Add a whole-piece photo first — details are marked on its front.</p>

  const at = (e) => {
    const r = imgRef.current.getBoundingClientRect()
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))].map((v) => Math.round(v * 1000) / 1000)
  }
  const add = (e) => {
    if (drag.current?.moved) return
    if (spots.length >= 8) { toast('At most eight details — the ones that matter most.', 'error'); return }
    setSpots((l) => [...l, { at: at(e), label: '', note: '', photo: null }])
    setActive(spots.length)
  }
  const change = (k, patch) => setSpots((l) => l.map((s, i) => (i === k ? { ...s, ...patch } : s)))
  const removeAt = (k) => { setSpots((l) => l.filter((_, i) => i !== k)); setActive(null) }

  const save = async () => {
    setBusy(true); setError(null)
    try {
      const p = await api.put(`/products/${product.id}/spots`, { spots })
      onProduct(p)
      setSpots(p.spots ?? [])
      toast('Details saved')
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const photoOpts = [{ value: '', label: 'None — go close on the piece' }, ...prints.map((p, i) => ({ value: String(p.id), label: p.label || `Close-up ${i + 1}` }))]
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr]">
      <div>
        <div className="relative inline-block select-none" style={{ background: 'radial-gradient(80% 70% at 50% 35%, rgb(60 50 80 / 0.55), rgb(12 10 16))', boxShadow: `inset 0 0 0 1px ${C.line}` }}>
          <img ref={imgRef} src={front.src} alt="" draggable="false" onClick={add} className="block max-h-[440px] w-auto max-w-full cursor-crosshair" />
          {spots.map((s, k) => (
            <button
              key={k}
              type="button"
              aria-label={`Detail ${k + 1}${s.label ? `: ${s.label}` : ''} — drag to move`}
              onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { k, moved: false }; setActive(k) }}
              onPointerMove={(e) => { if (drag.current?.k !== k) return; drag.current.moved = true; change(k, { at: at(e) }) }}
              onPointerUp={() => { window.setTimeout(() => { drag.current = null }, 0) }}
              onClick={(e) => e.stopPropagation()}
              className="absolute -ml-3 -mt-3 grid h-6 w-6 cursor-grab place-items-center text-[10px] font-semibold active:cursor-grabbing"
              style={{ left: `${s.at[0] * 100}%`, top: `${s.at[1] * 100}%`, color: '#120d16' }}
            >
              <span className="absolute inset-[3px] rotate-45" style={{ background: active === k ? C.violet : C.ink, boxShadow: `0 0 0 1px ${C.violet}, 0 0 10px rgb(154 107 255 / 0.8)` }} />
              <span className="relative">{k + 1}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11.5px] leading-[1.7]" style={{ color: C.ink3 }}>Click the photo to mark a detail; drag a mark to move it. Up to eight.</p>
      </div>

      <div>
        {spots.length === 0 && <p className="text-[12px]" style={{ color: C.ink3 }}>No details marked yet. On the site, each mark sits on the piece in Look closer: tapped, it opens its close-up — or goes in close on the piece — and says in a line what it is.</p>}
        <ol className="space-y-5">
          {spots.map((s, k) => (
            <li key={k} className="grid gap-x-6 gap-y-3 p-4 sm:grid-cols-2" style={{ boxShadow: `inset 0 0 0 1px ${active === k ? C.violet : C.line}` }} onFocus={() => setActive(k)}>
              <Input id={`spot-label-${k}`} label={`${k + 1}. Name`} placeholder="Two-way zip" value={s.label} maxLength={40} onChange={(e) => change(k, { label: e.target.value })} />
              <Select id={`spot-photo-${k}`} label="Opens" value={s.photo ? String(s.photo) : ''} onChange={(e) => change(k, { photo: e.target.value ? Number(e.target.value) : null })} options={photoOpts} />
              <Input id={`spot-note-${k}`} label="In a line" placeholder="Metal, with a pull at each end." value={s.note} maxLength={140} onChange={(e) => change(k, { note: e.target.value })} className="sm:col-span-2" hint="say only what can be seen" />
              <div className="sm:col-span-2">
                <button type="button" onClick={() => removeAt(k)} className="text-[10px] uppercase tracking-[0.24em] underline underline-offset-4" style={{ color: C.danger }}>Remove this detail</button>
              </div>
            </li>
          ))}
        </ol>
        {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}
        <div className="mt-6 flex items-center gap-3">
          <Button variant="primary" onClick={save} busy={busy} disabled={!dirty}>Save details</Button>
          {dirty && <span className="text-[11px]" style={{ color: '#e8c98a' }}>Unsaved</span>}
        </div>
      </div>
    </div>
  )
}
