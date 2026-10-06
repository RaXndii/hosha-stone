import { useEffect, useRef, useState } from 'react'
import { api, upload } from '../api.js'
import { Button, C, ErrorNote, Input, PageTitle, Section, Textarea, useToast } from '../ui.jsx'

/** The house in its own words — what customers read in About, and the motto that closes the archive. */
export default function AboutPage() {
  const toast = useToast()
  const [a, setA] = useState(null)
  const [saved, setSaved] = useState(null)
  const [fields, setFields] = useState({})
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(false)
  const [up, setUp] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => { api.get('/about').then((d) => { setA(d); setSaved(d) }).catch((e) => setErr(e.message)) }, [])
  if (!a) return <ErrorNote>{err}</ErrorNote>
  const dirty = JSON.stringify(a) !== JSON.stringify(saved)
  const set = (k) => (e) => setA({ ...a, [k]: e.target.value })
  const setSection = (i, k, v) => setA({ ...a, sections: a.sections.map((s, j) => (j === i ? { ...s, [k]: v } : s)) })

  const save = async () => {
    setBusy(true); setFields({}); setErr(null)
    try { const d = await api.put('/about', a); setA(d); setSaved(d); toast('About page updated') } catch (e) { setFields(e.fields); setErr(e.message); toast(e.message, 'error') } finally { setBusy(false) }
  }
  const image = async (file) => {
    if (!file) return
    const fd = new FormData()
    fd.append('photos', file)
    setUp(0)
    try { const r = await upload('/about/image', fd, setUp); setA((x) => ({ ...x, image: r.src })); toast('Photo ready — save to publish it') } catch (e) { toast(e.message, 'error') } finally { setUp(null) }
  }

  return (
    <div className="max-w-3xl pb-10">
      <PageTitle eyebrow="What customers read" title="About">
        <a href="/" target="_blank" rel="noreferrer" className="text-[10px] uppercase tracking-[0.26em]" style={{ color: C.ink3 }}>View site ↗</a>
        <Button variant="primary" onClick={save} busy={busy} disabled={!dirty}>Save</Button>
      </PageTitle>
      <ErrorNote>{err}</ErrorNote>
      <div className="mt-4 space-y-12">
        <Section index="01" title="The house">
          <div className="space-y-7">
            <Input id="title" label="Main title" value={a.title} onChange={set('title')} error={fields.title} maxLength={140} />
            <Textarea id="body" label="Main description" value={a.body} onChange={set('body')} error={fields.body} rows={5} maxLength={2000} />
            <Input id="motto" label="Philosophy / motto" value={a.motto} onChange={set('motto')} maxLength={80} hint="also closes the opening and the archive" />
          </div>
        </Section>
        <Section index="02" title="Photo" note="Optional. Shown at the top of the About panel.">
          <div className="flex flex-wrap items-end gap-6">
            <div className="relative aspect-[4/3] w-[220px] overflow-hidden" style={{ background: 'rgb(239 233 225 / 0.03)', boxShadow: `inset 0 0 0 1px ${C.line2}` }}>
              {a.image ? <img src={a.image} alt="" className="h-full w-full object-cover" /> : <span className="absolute inset-0 grid place-items-center text-[10px] uppercase tracking-[0.24em]" style={{ color: C.ink3 }}>No photo</span>}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => fileRef.current?.click()} busy={up !== null}>{a.image ? 'Replace' : 'Upload'}</Button>
              {a.image && <Button variant="ghost" onClick={() => setA({ ...a, image: null })}>Remove</Button>}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { image(e.target.files[0]); e.target.value = '' }} />
            </div>
          </div>
        </Section>
        <Section index="03" title="More sections" note="Optional — a heading and a few lines each, up to six." actions={a.sections.length < 6 && <Button variant="ghost" className="h-8" onClick={() => setA({ ...a, sections: [...a.sections, { heading: '', text: '' }] })}>+ Add section</Button>}>
          <div className="space-y-8">
            {a.sections.map((s, i) => (
              <div key={i} className="admin-fade space-y-4">
                <div className="flex items-end gap-4">
                  <Input id={`h-${i}`} label={`Section ${i + 1}`} placeholder="Heading" value={s.heading} onChange={(e) => setSection(i, 'heading', e.target.value)} maxLength={80} className="flex-1" />
                  <Button variant="ghost" className="h-8" onClick={() => setA({ ...a, sections: a.sections.filter((_, j) => j !== i) })}>Remove</Button>
                </div>
                <Textarea id={`t-${i}`} value={s.text} onChange={(e) => setSection(i, 'text', e.target.value)} rows={3} maxLength={1500} />
              </div>
            ))}
            {!a.sections.length && <p className="text-[12px]" style={{ color: C.ink3 }}>None yet.</p>}
          </div>
        </Section>
      </div>
    </div>
  )
}
