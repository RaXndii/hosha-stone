import { useCallback, useEffect, useState } from 'react'
import { api, setUnauthorizedHandler } from './api.js'
import { Button, C, ErrorNote, Input, Toasts } from './ui.jsx'
import Overview from './pages/Overview.jsx'
import Apparel from './pages/Apparel.jsx'
import Editor from './pages/Editor.jsx'
import Orders from './pages/Orders.jsx'
import Categories from './pages/Categories.jsx'
import AboutPage from './pages/About.jsx'
import Settings from './pages/Settings.jsx'

/**
 * Hosha Stone admin. The page itself is public, but it holds nothing: every
 * piece of data comes from /api/admin, which answers only to a signed-in
 * admin. Routes are hash-based: #/apparel, #/apparel/12, #/orders …
 */
const NAV = [
  { id: '', label: 'Overview' },
  { id: 'apparel', label: 'Apparel' },
  { id: 'orders', label: 'Orders' },
  { id: 'categories', label: 'Categories' },
  { id: 'about', label: 'About' },
  { id: 'settings', label: 'Settings' },
]

const parse = () => window.location.hash.replace(/^#\/?/, '').split('/').filter(Boolean)
export const nav = (path) => { window.location.hash = `#/${path}` }

function useRoute() {
  const [parts, setParts] = useState(parse)
  useEffect(() => {
    const on = () => { setParts(parse()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return parts
}

function Wordmark({ small }) {
  return (
    <span className={`font-display uppercase tracking-[0.3em] ${small ? 'text-[15px]' : 'text-[19px]'}`} style={{ color: C.ink }}>
      Hosha Stone <span className="ml-1 font-sans text-[9px] tracking-[0.36em]" style={{ color: C.violet }}>Admin</span>
    </span>
  )
}

/* ---------------------------------------------------------------- sign in */
function Gate({ needsSetup, onIn }) {
  const [form, setForm] = useState({ email: '', password: '', name: '', code: '' })
  const [err, setErr] = useState(null)
  const [fields, setFields] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(null); setFields({})
    try {
      const r = needsSetup ? await api.post('/setup', form) : await api.post('/login', { email: form.email, password: form.password })
      onIn(r.user)
    } catch (x) {
      setErr(x.message); setFields(x.fields)
    } finally { setBusy(false) }
  }
  return (
    <div className="flex min-h-[100svh] items-center justify-center px-6" style={{ background: 'radial-gradient(60% 50% at 50% 0%, rgb(154 107 255 / 0.08), transparent 70%), #070609' }}>
      <form onSubmit={submit} className="admin-rise w-full max-w-[380px]" noValidate>
        <Wordmark />
        <p className="mt-10 font-display text-[26px] uppercase leading-tight tracking-[0.08em]" style={{ color: C.ink }}>
          {needsSetup ? 'Create the owner account' : 'Sign in'}
        </p>
        {needsSetup && (
          <p className="mt-3 text-[12.5px] leading-[1.7]" style={{ color: C.ink2 }}>
            This is the first sign-in. Enter the one-time setup code printed in the server’s console, then choose your login.
          </p>
        )}
        <div className="mt-8 space-y-6">
          {needsSetup && <Input id="code" label="Setup code" value={form.code} onChange={set('code')} error={fields.code} autoComplete="one-time-code" autoFocus />}
          {needsSetup && <Input id="name" label="Your name" value={form.name} onChange={set('name')} error={fields.name} autoComplete="name" />}
          <Input id="email" type="email" label="Email" value={form.email} onChange={set('email')} error={fields.email} autoComplete="username" autoFocus={!needsSetup} />
          <Input id="password" type="password" label="Password" value={form.password} onChange={set('password')} error={fields.password} autoComplete={needsSetup ? 'new-password' : 'current-password'} hint={needsSetup ? '10+ characters' : null} />
        </div>
        <div className="mt-6"><ErrorNote>{!Object.keys(fields).length && err}</ErrorNote></div>
        <Button type="submit" variant="primary" busy={busy} className="mt-6 w-full">{needsSetup ? 'Create account' : 'Sign in'} →</Button>
        <a href="/" className="mt-8 block text-center text-[10px] uppercase tracking-[0.3em]" style={{ color: C.ink3 }}>← Back to the site</a>
      </form>
    </div>
  )
}

/* ---------------------------------------------------------------- shell */
function Shell({ user, route, onSignOut, children }) {
  const [menu, setMenu] = useState(false)
  const here = route[0] ?? ''
  const link = (n) => {
    const on = here === n.id
    return (
      <a
        key={n.id}
        href={`#/${n.id}`}
        onClick={() => setMenu(false)}
        aria-current={on ? 'page' : undefined}
        className="group relative flex items-center gap-3 py-2.5 text-[10.5px] font-medium uppercase tracking-[0.28em] transition-colors duration-300"
        style={{ color: on ? C.ink : C.ink3 }}
      >
        <span className="h-px transition-all duration-500" style={{ width: on ? 18 : 8, background: on ? C.violet : C.line2 }} />
        <span className="group-hover:text-[#efe9e1]">{n.label}</span>
      </a>
    )
  }
  return (
    <div className="min-h-[100svh] lg:flex" style={{ background: C.bg }}>
      <aside className="sticky top-0 z-40 flex items-center justify-between border-b px-5 py-4 lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-[240px] lg:border-b-0 lg:border-r lg:px-8 lg:py-9" style={{ borderColor: C.line, background: 'rgb(9 8 12 / 0.96)' }}>
        <a href="#/"><Wordmark small /></a>
        <button className="lg:hidden" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label="Menu" style={{ color: C.ink }}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none"><path d={menu ? 'M5 5l14 14M19 5L5 19' : 'M4 8h16M4 16h11'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
        <nav className={`${menu ? 'flex' : 'hidden'} absolute inset-x-0 top-full flex-col border-b px-5 pb-5 lg:static lg:mt-14 lg:flex lg:border-0 lg:p-0`} style={{ background: 'rgb(9 8 12 / 0.98)', borderColor: C.line }}>
          {NAV.map(link)}
          <div className="mt-6 border-t pt-6 lg:mt-14" style={{ borderColor: C.line }}>
            <a href="/" target="_blank" rel="noreferrer" className="block py-2 text-[10px] uppercase tracking-[0.28em]" style={{ color: C.ink3 }}>View site ↗</a>
            <p className="mt-4 truncate text-[11px]" style={{ color: C.ink2 }}>{user.name}</p>
            <p className="truncate text-[11px]" style={{ color: C.ink3 }}>{user.email}</p>
            <button onClick={onSignOut} className="mt-3 text-[10px] uppercase tracking-[0.28em] underline-offset-4 hover:underline" style={{ color: C.ink3 }}>Sign out</button>
          </div>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-5 pb-24 pt-8 lg:ml-[240px] lg:px-14 lg:pt-14">{children}</main>
    </div>
  )
}

export default function AdminApp() {
  const [session, setSession] = useState(null) // null = loading
  const route = useRoute()

  const load = useCallback(() => {
    api.get('/session').then(setSession).catch(() => setSession({ user: null, offline: true }))
  }, [])
  useEffect(() => {
    load()
    setUnauthorizedHandler(() => setSession((s) => (s?.user ? { user: null, expired: true } : s)))
  }, [load])

  if (!session) return <div className="min-h-[100svh]" style={{ background: C.bg }} />
  if (session.offline) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center px-6 text-center">
        <div className="admin-rise max-w-sm">
          <Wordmark />
          <p className="mt-8 text-[13px] leading-[1.8]" style={{ color: C.ink2 }}>The admin server isn’t answering. Start it with <code style={{ color: C.ink }}>npm start</code> (or <code style={{ color: C.ink }}>npm run server</code> while developing) and reload.</p>
          <Button className="mt-6" onClick={() => { setSession(null); load() }}>Try again</Button>
        </div>
      </div>
    )
  }
  if (!session.user) {
    return (
      <Toasts>
        {session.expired && <p className="fixed inset-x-0 top-0 z-50 py-2 text-center text-[11px]" style={{ background: 'rgb(154 107 255 / 0.15)', color: C.ink }}>Your session ended — sign in again. Unsaved changes are kept in this browser.</p>}
        <Gate needsSetup={session.needsSetup} onIn={(user) => setSession({ user })} />
      </Toasts>
    )
  }

  const [section, id] = route
  let page
  if (section === 'apparel' && id) page = <Editor key={id} id={id === 'new' ? null : Number(id)} />
  else if (section === 'apparel') page = <Apparel />
  else if (section === 'orders') page = <Orders />
  else if (section === 'categories') page = <Categories />
  else if (section === 'about') page = <AboutPage />
  else if (section === 'settings') page = <Settings user={session.user} />
  else page = <Overview user={session.user} />

  return (
    <Toasts>
      <Shell user={session.user} route={route} onSignOut={async () => { await api.post('/logout').catch(() => {}); setSession({ user: null, needsSetup: false }) }}>
        {page}
      </Shell>
    </Toasts>
  )
}
