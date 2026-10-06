import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Button, C, ErrorNote, Input, PageTitle, Section, useToast } from '../ui.jsx'

export default function Settings({ user }) {
  const toast = useToast()
  const [s, setS] = useState(null)
  const [fields, setFields] = useState({})
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(null)
  const [pw, setPw] = useState({ current: '', next: '' })
  const [pwFields, setPwFields] = useState({})

  useEffect(() => { api.get('/settings').then(setS).catch((e) => setErr(e.message)) }, [])
  if (!s) return <ErrorNote>{err}</ErrorNote>

  const save = async (e) => {
    e.preventDefault()
    setBusy('settings'); setFields({})
    try { setS(await api.put('/settings', s)); toast('Ordering settings saved') } catch (x) { setFields(x.fields); toast(x.message, 'error') } finally { setBusy(null) }
  }
  const changePw = async (e) => {
    e.preventDefault()
    setBusy('pw'); setPwFields({})
    try { await api.put('/account/password', pw); setPw({ current: '', next: '' }); toast('Password changed — other sessions signed out') } catch (x) { setPwFields(x.fields); toast(x.message, 'error') } finally { setBusy(null) }
  }

  return (
    <div className="max-w-2xl pb-10">
      <PageTitle eyebrow={user.email} title="Settings" />
      <div className="space-y-12">
        <Section index="01" title="Ordering" note="Used in every order message and total on the site.">
          <form onSubmit={save} className="space-y-7">
            <Input id="fee" label="Delivery fee (USD)" prefix="$" inputMode="decimal" value={String(s.deliveryFee)} onChange={(e) => setS({ ...s, deliveryFee: e.target.value })} error={fields.deliveryFee} />
            <Input id="wa" label="WhatsApp number" prefix="+" inputMode="tel" value={s.whatsapp} onChange={(e) => setS({ ...s, whatsapp: e.target.value })} error={fields.whatsapp} hint="with country code" />
            <Input id="ig" label="Instagram" prefix="@" value={s.instagram} onChange={(e) => setS({ ...s, instagram: e.target.value })} error={fields.instagram} />
            <Button type="submit" variant="primary" busy={busy === 'settings'}>Save</Button>
          </form>
        </Section>
        <Section index="02" title="Password" note="At least 10 characters, mixing letters with numbers or symbols. Changing it signs out every other session.">
          <form onSubmit={changePw} className="space-y-7">
            <input type="text" autoComplete="username" value={user.email} readOnly hidden />
            <Input id="pw-current" type="password" label="Current password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} error={pwFields.current} />
            <Input id="pw-next" type="password" label="New password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} error={pwFields.next} />
            <Button type="submit" busy={busy === 'pw'} disabled={!pw.current || !pw.next}>Change password</Button>
          </form>
        </Section>
        <p className="text-[11.5px] leading-[1.7]" style={{ color: C.ink3 }}>Signed in as {user.name}. Sessions last 7 days on this device.</p>
      </div>
    </div>
  )
}
