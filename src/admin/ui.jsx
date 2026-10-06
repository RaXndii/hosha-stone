import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

/**
 * The admin's small kit: obsidian, charcoal, warm white, one purple. Thin
 * lines instead of boxes; motion only to say something happened.
 */
export const C = {
  bg: '#070609',
  panel: 'rgb(16 14 21)',
  line: 'rgb(239 233 225 / 0.09)',
  line2: 'rgb(239 233 225 / 0.16)',
  ink: '#efe9e1',
  ink2: 'rgb(239 233 225 / 0.62)',
  ink3: 'rgb(239 233 225 / 0.4)',
  violet: '#9a6bff',
  violetSoft: 'rgb(154 107 255 / 0.14)',
  danger: '#ff6b7f',
  ok: '#7fd6a8',
}

export const money = (n) => `$${Number(n ?? 0).toFixed(Number.isInteger(Number(n)) ? 0 : 2)}`
export const when = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z')
  const diff = (Date.now() - d) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
}

export function Label({ children, error, htmlFor, hint }) {
  return (
    <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-4 text-[9.5px] font-medium uppercase tracking-[0.28em]" style={{ color: error ? C.danger : C.ink3 }}>
      <span>{children}</span>
      {error ? <span className="normal-case tracking-[0.02em]">{error}</span> : hint ? <span className="normal-case tracking-[0.02em]" style={{ color: C.ink3 }}>{hint}</span> : null}
    </label>
  )
}

export function Input({ id, label, error, hint, className = '', prefix, ...props }) {
  return (
    <div className={className}>
      {label && <Label htmlFor={id} error={error} hint={hint}>{label}</Label>}
      <div className="group/i relative mt-2 flex items-baseline">
        {prefix && <span className="mr-2 shrink-0 text-[12px] uppercase tracking-[0.16em]" style={{ color: C.ink3 }}>{prefix}</span>}
        <input
          id={id}
          aria-invalid={!!error}
          className="w-full bg-transparent pb-2 pt-1 text-[14px] outline-none placeholder:opacity-30"
          style={{ color: C.ink }}
          {...props}
        />
        <span className="absolute inset-x-0 bottom-0 h-px" style={{ background: error ? C.danger : C.line2 }} />
        <span className="absolute bottom-0 left-0 h-px w-0 transition-[width] duration-500 group-focus-within/i:w-full" style={{ background: C.violet }} />
      </div>
    </div>
  )
}

export function Textarea({ id, label, error, hint, className = '', rows = 4, ...props }) {
  return (
    <div className={className}>
      {label && <Label htmlFor={id} error={error} hint={hint}>{label}</Label>}
      <textarea
        id={id}
        rows={rows}
        aria-invalid={!!error}
        className="mt-2 w-full resize-y bg-transparent px-3 py-2.5 text-[13.5px] leading-[1.7] outline-none transition-[box-shadow] duration-300 placeholder:opacity-30 focus:shadow-[inset_0_0_0_1px_#9a6bff]"
        style={{ color: C.ink, boxShadow: `inset 0 0 0 1px ${error ? C.danger : C.line2}` }}
        {...props}
      />
    </div>
  )
}

export function Select({ id, label, error, options, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <Label htmlFor={id} error={error}>{label}</Label>}
      <div className="relative mt-2">
        <select
          id={id}
          aria-invalid={!!error}
          className="w-full appearance-none bg-transparent pb-2 pr-6 pt-1 text-[14px] outline-none"
          style={{ color: C.ink, borderBottom: `1px solid ${error ? C.danger : C.line2}` }}
          {...props}
        >
          {options.map((o) => <option key={o.value} value={o.value} style={{ background: C.panel }}>{o.label}</option>)}
        </select>
        <span className="pointer-events-none absolute right-1 top-2 text-[10px]" style={{ color: C.ink3 }}>▾</span>
      </div>
    </div>
  )
}

export function Button({ variant = 'line', busy, children, className = '', ...props }) {
  const styles = {
    primary: { background: 'rgb(154 107 255 / 0.2)', boxShadow: 'inset 0 0 0 1px rgb(154 107 255 / 0.85)', color: C.ink },
    line: { background: 'transparent', boxShadow: `inset 0 0 0 1px ${C.line2}`, color: C.ink },
    ghost: { background: 'transparent', color: C.ink2 },
    danger: { background: 'transparent', boxShadow: 'inset 0 0 0 1px rgb(255 107 127 / 0.5)', color: C.danger },
  }
  return (
    <button
      {...props}
      disabled={props.disabled || busy}
      className={`relative inline-flex h-10 items-center justify-center gap-2 px-4 text-[10px] font-medium uppercase tracking-[0.24em] transition-[background-color,box-shadow,opacity,transform] duration-300 hover:brightness-125 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      style={styles[variant]}
    >
      {busy && <span className="h-3 w-3 animate-spin rounded-full border border-current border-t-transparent" />}
      {children}
    </button>
  )
}

export function Toggle({ checked, onChange, label, id }) {
  return (
    <button type="button" id={id} role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="group flex items-center gap-3">
      <span className="relative h-[18px] w-[32px] rounded-full transition-colors duration-300" style={{ background: checked ? 'rgb(154 107 255 / 0.55)' : C.line2 }}>
        <span className="absolute top-[3px] h-3 w-3 rounded-full transition-[left] duration-300" style={{ left: checked ? 17 : 3, background: C.ink }} />
      </span>
      {label && <span className="text-[12px]" style={{ color: checked ? C.ink : C.ink2 }}>{label}</span>}
    </button>
  )
}

const STATUS_STYLE = {
  published: { color: C.ok, label: 'Published' },
  draft: { color: '#e8c98a', label: 'Draft' },
  archived: { color: C.ink3, label: 'Archived' },
  new: { color: C.violet, label: 'New' },
  contacted: { color: '#8ab8e8', label: 'Contacted' },
  confirmed: { color: '#e8c98a', label: 'Confirmed' },
  completed: { color: C.ok, label: 'Completed' },
  cancelled: { color: C.ink3, label: 'Cancelled' },
}
export function Status({ value }) {
  const s = STATUS_STYLE[value] ?? { color: C.ink3, label: value }
  return (
    <span className="inline-flex items-center gap-2 text-[9.5px] font-medium uppercase tracking-[0.24em]" style={{ color: s.color }}>
      <span className="h-[6px] w-[6px] rounded-full" style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
      {s.label}
    </span>
  )
}

export function Section({ index, title, note, children, actions }) {
  return (
    <section className="admin-rise border-t pt-8" style={{ borderColor: C.line }}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="flex items-baseline gap-4">
          {index && <span className="text-[10px] tracking-[0.3em]" style={{ color: C.violet }}>{index}</span>}
          <span className="text-[10.5px] font-medium uppercase tracking-[0.32em]" style={{ color: C.ink }}>{title}</span>
        </h2>
        {actions}
      </div>
      {note && <p className="mt-2 max-w-xl text-[12px] leading-[1.7]" style={{ color: C.ink3 }}>{note}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}

export function PageTitle({ eyebrow, title, children }) {
  return (
    <div className="admin-rise flex flex-wrap items-end justify-between gap-6 pb-8">
      <div>
        {eyebrow && <p className="text-[9.5px] uppercase tracking-[0.34em]" style={{ color: C.ink3 }}>{eyebrow}</p>}
        <h1 className="mt-3 font-display text-[clamp(1.8rem,3.4vw,2.6rem)] uppercase leading-none tracking-[0.1em]" style={{ color: C.ink }}>{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

export function ErrorNote({ children }) {
  if (!children) return null
  return (
    <p role="alert" className="admin-rise px-4 py-3 text-[12.5px] leading-[1.6]" style={{ color: C.danger, background: 'rgb(255 107 127 / 0.06)', boxShadow: 'inset 0 0 0 1px rgb(255 107 127 / 0.3)' }}>
      {children}
    </p>
  )
}

/* ---------------------------------------------------------------- toasts */
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)
export function Toasts({ children }) {
  const [items, setItems] = useState([])
  const id = useRef(0)
  const push = useCallback((text, tone = 'ok') => {
    const k = ++id.current
    setItems((l) => [...l, { k, text, tone }])
    window.setTimeout(() => setItems((l) => l.filter((t) => t.k !== k)), tone === 'error' ? 6000 : 3000)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex flex-col items-end gap-2" aria-live="polite">
        {items.map((t) => (
          <div
            key={t.k}
            className="admin-toast px-4 py-3 text-[12px] tracking-[0.02em]"
            style={{ background: 'rgb(20 18 26 / 0.96)', color: C.ink, boxShadow: `inset 0 0 0 1px ${t.tone === 'error' ? 'rgb(255 107 127 / 0.6)' : 'rgb(154 107 255 / 0.6)'}, 0 20px 40px -20px #000` }}
          >
            <span className="mr-2" style={{ color: t.tone === 'error' ? C.danger : C.ok }}>{t.tone === 'error' ? '!' : '✓'}</span>
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/* ---------------------------------------------------------------- confirm */
export function Confirm({ open, title, children, confirmLabel = 'Confirm', danger, onConfirm, onCancel, busy, disabled }) {
  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onCancel])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="admin-fade absolute inset-0" style={{ background: 'rgb(4 3 6 / 0.75)' }} onClick={onCancel} />
      <div className="admin-rise relative w-full max-w-md p-7" style={{ background: C.panel, boxShadow: `inset 0 0 0 1px ${C.line2}` }}>
        <p className="font-display text-[20px] uppercase tracking-[0.08em]" style={{ color: C.ink }}>{title}</p>
        <div className="mt-4 text-[13px] leading-[1.7]" style={{ color: C.ink2 }}>{children}</div>
        <div className="mt-7 flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} busy={busy} disabled={disabled}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}

export function Empty({ children }) {
  return <p className="py-14 text-center font-display text-[17px] italic" style={{ color: C.ink3 }}>{children}</p>
}
