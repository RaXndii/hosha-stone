import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { BRAND, INSTAGRAM, LANGUAGES, buildOrder, instagramUrl, money, newRef, orderMessage, recordOrder, whatsappUrl } from '../../data/order.js'

const ink = (a = 1) => `rgb(var(--sr-ink) / ${a})`
const FORM_KEY = 'hs-order-form'

function readForm() {
  try { return { customerName: '', location: '', language: 'en', contactMethod: null, ...JSON.parse(window.localStorage.getItem(FORM_KEY) || '{}') } } catch { return { customerName: '', location: '', language: 'en', contactMethod: null } }
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
      <path d="M3.6 20.4l1.3-4.2A8.1 8.1 0 1 1 8 19.2l-4.4 1.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9.3 8.6c.2-.5.4-.5.6-.5h.4c.2 0 .4 0 .6.4l.6 1.5c.1.2.1.4 0 .5l-.3.5c-.1.2-.2.3-.1.5.4.7 1.1 1.5 1.9 1.9.2.1.3 0 .5-.1l.4-.5c.2-.2.3-.2.5-.1l1.4.7c.2.1.3.3.3.4v.5c0 .5-.4.8-.8 1-.5.2-1 .2-1.9-.1a8.4 8.4 0 0 1-4.2-3.9c-.4-.9-.4-1.5-.2-2Z" fill="currentColor" />
    </svg>
  )
}
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.8" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="3.8" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="17.3" cy="6.7" r="1.05" fill="currentColor" />
    </svg>
  )
}

function Field({ id, label, value, onChange, placeholder, error, autoComplete }) {
  return (
    <label data-or className="group/f block" htmlFor={id}>
      <span className="flex items-baseline justify-between text-[9px] uppercase tracking-[0.32em]" style={{ color: error ? 'rgb(var(--sr-accent))' : ink(0.45) }}>
        {label}
        {error && <span className="normal-case tracking-[0.06em]">{error}</span>}
      </span>
      <span className="relative mt-2 block">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          className="w-full bg-transparent pb-2.5 pt-1 text-[14px] tracking-[0.02em] outline-none placeholder:opacity-35"
          style={{ color: ink() }}
        />
        <span className="absolute inset-x-0 bottom-0 h-px" style={{ background: error ? 'rgb(var(--sr-accent) / 0.8)' : ink(0.2) }} />
        <span className="absolute bottom-0 left-0 h-px w-0 transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-focus-within/f:w-full" style={{ background: 'rgb(var(--sr-neon))' }} />
      </span>
    </label>
  )
}

/**
 * The order request: what the visitor is asking for, who and where they are,
 * and how they want to reach the house — then the exact message, and only
 * then the channel. The site never sends anything itself: WhatsApp opens with
 * the message ready to send; Instagram cannot take a pre-filled message, so
 * the message is copied for the visitor to paste.
 */
export default function OrderPanel({ open, product, size, onClose }) {
  const rootRef = useRef(null)
  const panelRef = useRef(null)
  const mounted = useRef(false)
  const [step, setStep] = useState('details') // details | preview | ready
  const [form, setForm] = useState(readForm)
  const [tried, setTried] = useState(false)
  const [copied, setCopied] = useState(null) // null | true | false
  // a reference for this request, made when the message is reviewed, so the house can match it
  const [ref, setRef] = useState(null)

  useEffect(() => {
    const { customerName, location, language, contactMethod } = form
    try { window.localStorage.setItem(FORM_KEY, JSON.stringify({ customerName, location, language, contactMethod })) } catch { /* the form still works for the visit */ }
  }, [form])

  const { order, errors } = useMemo(
    () => buildOrder({ productId: product?.id, size, ...form, ref }),
    [product, size, form, ref],
  )
  const message = useMemo(() => orderMessage(order), [order])
  const blocked = errors.product || errors.size
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  /* ---------------------------------------------- open and close */
  useLayoutEffect(() => {
    const root = rootRef.current
    const panel = panelRef.current
    const scrim = root.querySelector('[data-or-scrim]')
    gsap.killTweensOf([panel, scrim])
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const phone = window.matchMedia('(max-width: 767px)').matches
    // back to the first step once it has gone, out of sight
    const reset = () => { gsap.set(root, { visibility: 'hidden' }); setStep('details'); setTried(false); setCopied(null) }
    if (open) {
      gsap.set(root, { visibility: 'visible' })
      if (reduced) { gsap.set([panel, scrim], { opacity: 1, clearProps: 'transform,filter' }); return }
      gsap.fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' })
      gsap.fromTo(
        panel,
        phone ? { y: 48, opacity: 0, filter: 'blur(6px)' } : { x: 40, opacity: 0, filter: 'blur(8px)' },
        { x: 0, y: 0, opacity: 1, filter: 'blur(0px)', duration: 0.85, ease: 'power3.out', delay: 0.08, clearProps: 'filter' },
      )
      return
    }
    if (!mounted.current) { mounted.current = true; gsap.set(root, { visibility: 'hidden' }); return }
    if (reduced) { gsap.delayedCall(0, reset); return }
    gsap.to(scrim, { opacity: 0, duration: 0.45, ease: 'power2.in' })
    gsap.to(panel, {
      ...(phone ? { y: 36 } : { x: 30 }),
      opacity: 0,
      duration: 0.42,
      ease: 'power2.in',
      onComplete: reset,
    })
  }, [open])

  // each step's lines arrive one after another, very gently
  useLayoutEffect(() => {
    if (!open || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const items = panelRef.current.querySelectorAll(`[data-step="${step}"] [data-or]`)
    gsap.fromTo(items, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.045, delay: step === 'details' ? 0.25 : 0.05 })
    if (step === 'details') gsap.fromTo(panelRef.current.querySelector('[data-or-img]'), { scale: 1.08, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.1, ease: 'power3.out', delay: 0.2 })
    panelRef.current.scrollTop = 0
  }, [open, step])

  // Esc closes the request — and only the request, even over the closer look
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      if (step === 'preview') setStep('details')
      else onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, step, onClose])

  /* ---------------------------------------------- moving through it */
  const review = () => {
    setTried(true)
    if (Object.keys(errors).length) {
      gsap.fromTo(panelRef.current.querySelectorAll('[aria-invalid="true"], [data-or-methods][data-missing]'), { x: 0 }, { keyframes: [{ x: -4, duration: 0.07 }, { x: 4, duration: 0.09 }, { x: -2, duration: 0.08 }, { x: 0, duration: 0.12 }] })
      return
    }
    setRef(newRef())
    setStep('preview')
  }
  // the request is recorded the moment the customer leaves to send it
  const continueTo = () => {
    recordOrder(order)
    setStep('ready')
  }
  const copy = async () => {
    try { await navigator.clipboard.writeText(message); setCopied(true) } catch { setCopied(false) }
  }
  const goInstagram = () => {
    copy()
    continueTo()
  }

  const err = (k, text) => (tried && errors[k] ? text : null)
  const ku = form.language === 'ku'
  const channel = form.contactMethod === 'instagram' ? 'instagram' : 'whatsapp'

  return (
    <div ref={rootRef} className="fixed inset-0 z-[80]" style={{ visibility: 'hidden' }} aria-hidden={!open} inert={!open || undefined}>
      <div data-or-scrim onClick={onClose} className="absolute inset-0 backdrop-blur-[2px]" style={{ background: 'rgb(var(--sr-bg0) / 0.72)' }} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Order request"
        className="absolute inset-x-0 bottom-0 max-h-[94svh] overflow-y-auto overscroll-contain pb-[calc(2rem+env(safe-area-inset-bottom))] pl-[max(1.5rem,env(safe-area-inset-left))] pr-[max(1.5rem,env(safe-area-inset-right))] pt-6 md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[min(470px,100vw)] md:pb-[calc(2.5rem+env(safe-area-inset-bottom))] md:pl-10 md:pr-[max(2.5rem,env(safe-area-inset-right))] md:pt-9"
        style={{ background: 'linear-gradient(to bottom, rgb(var(--sr-bg1) / 0.98), rgb(var(--sr-bg0) / 0.99))', boxShadow: `-1px 0 0 ${ink(0.08)}, 0 -1px 0 ${ink(0.08)}` }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[9.5px] font-medium uppercase tracking-[0.38em]" style={{ color: 'rgb(var(--sr-neon))' }}>
            {step === 'preview' ? 'Message preview' : step === 'ready' ? 'Request ready' : 'Order request'}
          </span>
          <button onClick={onClose} aria-label="Close the order request" className="group grid h-10 w-10 place-items-center rounded-full transition-colors duration-300" style={{ border: `1px solid ${ink(0.2)}`, color: ink() }}>
            <svg viewBox="0 0 16 16" className="h-3 w-3 transition-transform duration-500 group-hover:rotate-90"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
          </button>
        </div>

        {/* the piece — on every step, so it is always clear what this is about */}
        <div className="mt-7 flex items-center gap-5">
          <div className="relative h-[96px] w-[84px] shrink-0 overflow-hidden" style={{ background: 'radial-gradient(80% 70% at 50% 35%, rgb(var(--sr-bg2) / 0.7), rgb(var(--sr-bg0)))', boxShadow: `inset 0 0 0 1px ${ink(0.08)}` }}>
            {order.productImage && (
              <img data-or-img src={order.productImage} alt="" className="absolute inset-[8%] h-[84%] w-[84%] object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[9.5px] uppercase tracking-[0.32em]" style={{ color: ink(0.5) }}>{BRAND} / {order.productNumber || '—'}</p>
            <p className="mt-2 font-display text-[20px] uppercase leading-tight tracking-[0.1em]" style={{ color: ink() }}>{order.productName || 'Unavailable piece'}</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.28em]" style={{ color: ink(0.7) }}>
              Size <span className="ml-1.5 inline-grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[10px] tracking-[0.06em]" style={{ color: ink(), boxShadow: '0 0 0 1px rgb(var(--sr-accent) / 0.8), 0 0 12px rgb(var(--sr-accent) / 0.25)' }}>{order.size || '—'}</span>
            </p>
          </div>
        </div>

        {blocked ? (
          <div className="mt-10">
            <p className="font-display text-lg leading-snug" style={{ color: ink() }}>
              {errors.product ? 'This piece can’t be ordered right now.' : 'That size is no longer available.'}
            </p>
            <p className="mt-3 text-[12px] leading-[1.8]" style={{ color: ink(0.6) }}>Choose another size on the piece and try again.</p>
            <button onClick={onClose} className="mt-8 text-[10px] uppercase tracking-[0.3em] underline underline-offset-[6px]" style={{ color: ink(0.8) }}>Back to the piece</button>
          </div>
        ) : (
          <>
            {/* ------------------------------------------------ details */}
            {step === 'details' && (
              <div data-step="details" className="mt-8">
                <dl className="space-y-2.5 text-[11px] tracking-[0.12em]">
                  {[['Price', money(order.price)], ['Delivery', money(order.deliveryFee)]].map(([k, v]) => (
                    <div data-or key={k} className="flex items-baseline justify-between uppercase" style={{ color: ink(0.62) }}>
                      <dt className="tracking-[0.3em] text-[9.5px]">{k}</dt><dd>{v}</dd>
                    </div>
                  ))}
                  <div data-or className="flex items-baseline justify-between border-t pt-3 uppercase" style={{ borderColor: ink(0.12), color: ink() }}>
                    <dt className="text-[9.5px] tracking-[0.3em]">Total</dt><dd className="text-[18px] font-medium tracking-[0.04em]">{money(order.total)}</dd>
                  </div>
                </dl>

                <div className="mt-9 space-y-6">
                  <Field id="or-name" label="Your name" value={form.customerName} onChange={set('customerName')} placeholder="Name" autoComplete="name" error={err('customerName', 'Add your name')} />
                  <Field id="or-location" label="Location" value={form.location} onChange={set('location')} placeholder="City, area or neighbourhood" autoComplete="address-level2" error={err('location', 'Where should it go?')} />
                </div>

                <div data-or className="mt-8">
                  <p className="text-[9px] uppercase tracking-[0.32em]" style={{ color: ink(0.45) }}>Message language</p>
                  <div className="mt-3 inline-flex p-[3px]" style={{ boxShadow: `inset 0 0 0 1px ${ink(0.14)}` }} role="radiogroup" aria-label="Message language">
                    {LANGUAGES.map((l) => {
                      const on = form.language === l.id
                      return (
                        <button key={l.id} role="radio" aria-checked={on} onClick={() => set('language')(l.id)} className="px-4 py-2 text-[11px] tracking-[0.12em] transition-[background-color,color] duration-500" style={{ background: on ? 'rgb(var(--sr-neon) / 0.18)' : 'transparent', color: on ? ink() : ink(0.55) }}>
                          {l.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div data-or data-or-methods data-missing={tried && errors.contactMethod ? '' : undefined} className="mt-9">
                  <p className="flex items-baseline justify-between text-[9px] uppercase tracking-[0.32em]" style={{ color: tried && errors.contactMethod ? 'rgb(var(--sr-accent))' : ink(0.45) }}>
                    How would you like to order?
                    {tried && errors.contactMethod && <span className="normal-case tracking-[0.06em]">Choose one</span>}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Contact method">
                    {[
                      { id: 'whatsapp', label: 'WhatsApp', note: 'Direct order request', Icon: WhatsAppIcon },
                      { id: 'instagram', label: 'Instagram', note: `Message @${INSTAGRAM}`, Icon: InstagramIcon },
                    ].map(({ id, label, note, Icon }) => {
                      const on = form.contactMethod === id
                      return (
                        <button
                          key={id}
                          role="radio"
                          aria-checked={on}
                          onClick={() => set('contactMethod')(id)}
                          className="group relative px-4 py-4 text-left transition-[box-shadow,background-color,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5"
                          style={{
                            background: on ? 'rgb(var(--sr-neon) / 0.1)' : 'rgb(var(--sr-ink) / 0.02)',
                            boxShadow: on ? 'inset 0 0 0 1px rgb(var(--sr-neon) / 0.85), 0 0 22px rgb(var(--sr-neon) / 0.18)' : `inset 0 0 0 1px ${ink(0.12)}`,
                          }}
                        >
                          <span className="flex items-center justify-between" style={{ color: on ? ink() : ink(0.75) }}>
                            <Icon />
                            <span className="h-[7px] w-[7px] rounded-full transition-[background-color,box-shadow] duration-500" style={{ background: on ? 'rgb(var(--sr-neon))' : 'transparent', boxShadow: on ? '0 0 8px rgb(var(--sr-neon))' : `inset 0 0 0 1px ${ink(0.3)}` }} />
                          </span>
                          <span className="mt-4 block text-[11px] font-medium uppercase tracking-[0.22em]" style={{ color: ink() }}>{label}</span>
                          <span className="mt-1.5 block text-[10px] tracking-[0.04em]" style={{ color: ink(0.5) }}>{note}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <button
                  data-or
                  onClick={review}
                  className="group mt-10 flex h-12 w-full items-center justify-between px-5 text-[10.5px] font-medium uppercase tracking-[0.3em] transition-[box-shadow,background-color] duration-500"
                  style={{ color: ink(), background: 'rgb(var(--sr-neon) / 0.14)', boxShadow: 'inset 0 0 0 1px rgb(var(--sr-neon) / 0.7)' }}
                >
                  Review message
                  <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                </button>
                <p data-or className="mt-4 text-[10.5px] leading-[1.7]" style={{ color: ink(0.45) }}>
                  Nothing is sent yet. You’ll see the exact message first.
                </p>
              </div>
            )}

            {/* ------------------------------------------------ preview */}
            {step === 'preview' && (
              <div data-step="preview" className="mt-8">
                <p data-or className="text-[11.5px] leading-[1.8]" style={{ color: ink(0.62) }}>
                  {channel === 'whatsapp'
                    ? 'This exact message will open in WhatsApp, ready for you to send. Nothing is sent until you press send there.'
                    : `Instagram can’t receive a pre-filled message, so we’ll copy this for you. Paste it in your chat with @${INSTAGRAM} and send.`}
                </p>
                <pre
                  data-or
                  dir={ku ? 'rtl' : 'ltr'}
                  lang={ku ? 'ckb' : 'en'}
                  className="mt-6 whitespace-pre-wrap px-5 py-5 font-sans text-[13px] leading-[1.75]"
                  style={{ color: ink(0.92), background: 'rgb(var(--sr-ink) / 0.035)', boxShadow: `inset 0 0 0 1px ${ink(0.1)}`, textAlign: ku ? 'right' : 'left' }}
                >
                  {message}
                </pre>
                <div data-or className="mt-8 flex items-center gap-3">
                  <button onClick={() => setStep('details')} className="h-12 px-5 text-[10px] font-medium uppercase tracking-[0.3em] transition-colors duration-300" style={{ color: ink(0.75), boxShadow: `inset 0 0 0 1px ${ink(0.18)}` }}>
                    ← Edit
                  </button>
                  {channel === 'whatsapp' ? (
                    <a
                      href={whatsappUrl(order)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={continueTo}
                      className="group flex h-12 flex-1 items-center justify-between px-5 text-[10.5px] font-medium uppercase tracking-[0.26em]"
                      style={{ color: ink(), background: 'rgb(var(--sr-neon) / 0.16)', boxShadow: 'inset 0 0 0 1px rgb(var(--sr-neon) / 0.8)' }}
                    >
                      <span className="flex items-center gap-3"><WhatsAppIcon /> Continue to WhatsApp</span>
                      <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                    </a>
                  ) : (
                    <a
                      href={instagramUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={goInstagram}
                      className="group flex h-12 flex-1 items-center justify-between px-5 text-[10.5px] font-medium uppercase tracking-[0.26em]"
                      style={{ color: ink(), background: 'rgb(var(--sr-neon) / 0.16)', boxShadow: 'inset 0 0 0 1px rgb(var(--sr-neon) / 0.8)' }}
                    >
                      <span className="flex items-center gap-3"><InstagramIcon /> Copy &amp; open Instagram</span>
                      <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* ------------------------------------------------ ready */}
            {step === 'ready' && (
              <div data-step="ready" className="mt-10">
                <p data-or className="font-display text-[26px] uppercase leading-tight tracking-[0.1em]" style={{ color: ink() }}>Order request ready</p>
                <p data-or className="mt-4 text-[12px] leading-[1.85]" style={{ color: ink(0.65) }}>
                  {channel === 'whatsapp'
                    ? 'WhatsApp has opened with your request. Press send there — the house will confirm the piece, size and delivery with you.'
                    : copied === false
                      ? `Instagram has opened. Copy the message below, paste it in your chat with @${INSTAGRAM} and send.`
                      : `Your request is copied. Paste it in your chat with @${INSTAGRAM} and send — the house will confirm it with you there.`}
                </p>
                {channel === 'instagram' && (
                  <pre data-or dir={ku ? 'rtl' : 'ltr'} className="mt-6 select-all whitespace-pre-wrap px-5 py-4 font-sans text-[12.5px] leading-[1.7]" style={{ color: ink(0.85), background: 'rgb(var(--sr-ink) / 0.035)', boxShadow: `inset 0 0 0 1px ${ink(0.1)}`, textAlign: ku ? 'right' : 'left' }}>
                    {message}
                  </pre>
                )}
                <div data-or className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4 text-[10px] font-medium uppercase tracking-[0.28em]">
                  {channel === 'whatsapp' ? (
                    <a href={whatsappUrl(order)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-[6px]" style={{ color: ink(0.85) }}>Open WhatsApp again</a>
                  ) : (
                    <>
                      <button onClick={copy} className="underline underline-offset-[6px]" style={{ color: ink(0.85) }}>{copied ? 'Copied ✓' : 'Copy message'}</button>
                      <a href={instagramUrl()} target="_blank" rel="noopener noreferrer" className="underline underline-offset-[6px]" style={{ color: ink(0.85) }}>Open Instagram again</a>
                    </>
                  )}
                  <button onClick={onClose} style={{ color: ink(0.55) }}>Back to the piece</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
