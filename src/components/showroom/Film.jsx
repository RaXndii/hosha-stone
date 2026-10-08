import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import Plate from '../ui/Plate.jsx'
import { sound } from '../../lib/sound/index.js'
import { rest } from '../../lib/rest.js'
import { clock } from '../../data/showroom.js'

/**
 * The piece's film.
 *
 * It opens out of whatever asked for it — the film's card in the closer look,
 * or the line under "Look closer" — a cut stone opening into a screen, and it
 * plays at once: with its sound if the visitor has the house's sound on, and
 * if not, muted, with a word offering the sound. The house's music steps aside
 * while it plays and comes back after.
 *
 * The controls are the house's own: a play stone, a hairline to drag along,
 * the time, the sound, full screen and the way out. Where they lie over the
 * picture they rest out of sight while the film plays, and come back the
 * moment a hand moves; on a phone held upright they sit under it and stay.
 *
 * Nothing is fetched before the film is asked for, and a saving or slow
 * connection is given the lighter cut. Where a host cannot serve a film in
 * pieces (as a phone's browser asks for it), it is fetched whole and played
 * from memory instead.
 *
 * open(fromElement) is called from the press itself: a phone lets a film's
 * sound start only inside the gesture that asked for it.
 */
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Which cut of the film: H.264 wherever it plays (every phone decodes it in
 * hardware), the lighter one on a saving or slow connection, and VP9 for a
 * browser built without H.264.
 */
function pickSrc(film, video) {
  if (film.webm && !video.canPlayType('video/mp4; codecs="avc1.640028, mp4a.40.2"')) return film.webm
  const c = navigator.connection
  const slow = c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))
  return slow && film.small ? film.small : film.src
}

function PlayGlyph({ playing }) {
  return playing ? (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true"><path d="M4.5 3h2.4v10H4.5zM9.1 3h2.4v10H9.1z" fill="currentColor" /></svg>
  ) : (
    <svg viewBox="0 0 16 16" className="ml-0.5 h-3.5 w-3.5" aria-hidden="true"><path d="M4.5 2.6 13 8l-8.5 5.4z" fill="currentColor" /></svg>
  )
}

export default function Film({ film, title, ref }) {
  const rootRef = useRef(null)
  const frameRef = useRef(null)
  const screenRef = useRef(null)
  const videoRef = useRef(null)
  const fillRef = useRef(null)
  const headRef = useRef(null)
  const trackRef = useRef(null)
  const playRef = useRef(null)
  const originRef = useRef(null)
  const lastFocus = useRef(null)
  const prevOverflow = useRef('')
  const mounted = useRef(false)
  const hideTimer = useRef(0)
  const blobTried = useRef(false)
  const blobUrl = useRef('')

  const [open, setOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [offered, setOffered] = useState(false) // the sound was offered, not chosen
  const [ended, setEnded] = useState(false)
  const [waiting, setWaiting] = useState(false)
  const [failed, setFailed] = useState(false)
  const [chrome, setChrome] = useState(true)
  const [stir, setStir] = useState(0) // a hand moved: the controls' rest starts again
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(film?.duration || 0)

  /* ---------------------------------------------------- the film itself */
  const start = useCallback((from) => {
    const v = videoRef.current
    if (!v || !film) return
    // awake before it plays: the press that asked for it is the only moment a phone allows the sound
    rest(rootRef.current, false)
    originRef.current = from || null
    lastFocus.current = document.activeElement
    const want = pickSrc(film, v)
    if (!blobUrl.current && v.getAttribute('src') !== want) v.src = want
    try { v.currentTime = 0 } catch { /* not loaded yet: it starts at the beginning anyway */ }
    v.muted = !sound.on
    setMuted(v.muted)
    setOffered(v.muted)
    setEnded(false)
    setFailed(false)
    const p = v.play()
    // a browser that will not start a film's sound here starts it muted, and offers the sound
    p?.catch(() => {
      if (v.muted) return
      v.muted = true
      setMuted(true)
      setOffered(true)
      v.play().catch(() => {})
    })
    sound.hush(true)
    setOpen(true)
  }, [film])

  const close = useCallback(() => {
    const v = videoRef.current
    v?.pause()
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    sound.hush(false)
    setOpen(false)
  }, [])

  useImperativeHandle(ref, () => ({ open: start, close }), [start, close])

  // (each piece mounts its own film — see Showroom — so nothing carries over)
  useEffect(() => () => { if (blobUrl.current) URL.revokeObjectURL(blobUrl.current) }, [])

  /* ---------------------------------------------------- what the film is doing */
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    let raf = 0
    const paint = () => {
      const d = v.duration || duration || 1
      const k = Math.min(1, (v.currentTime || 0) / d)
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${k})`
      if (headRef.current) headRef.current.style.left = `${k * 100}%`
    }
    const loop = () => { paint(); raf = requestAnimationFrame(loop) }
    const on = {
      play: () => { setPlaying(true); setEnded(false); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop) },
      pause: () => { setPlaying(false); cancelAnimationFrame(raf); paint() },
      ended: () => { setPlaying(false); setEnded(true); cancelAnimationFrame(raf); paint() },
      waiting: () => setWaiting(true),
      playing: () => setWaiting(false),
      canplay: () => setWaiting(false),
      timeupdate: () => setTime(v.currentTime),
      seeked: () => { setTime(v.currentTime); paint() },
      loadedmetadata: () => { if (Number.isFinite(v.duration)) setDuration(v.duration) },
      volumechange: () => setMuted(v.muted),
      error: () => {
        // a host that will not hand a film over in pieces: fetch it whole, play it from memory
        const src = v.currentSrc || v.getAttribute('src')
        if (!src || blobTried.current || src.startsWith('blob:')) { setFailed(true); setWaiting(false); return }
        blobTried.current = true
        setWaiting(true)
        fetch(src)
          .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
          .then((b) => {
            blobUrl.current = URL.createObjectURL(b)
            v.src = blobUrl.current
            return v.play()
          })
          .catch(() => { setFailed(true); setWaiting(false) })
      },
    }
    for (const [k, fn] of Object.entries(on)) v.addEventListener(k, fn)
    return () => {
      cancelAnimationFrame(raf)
      for (const [k, fn] of Object.entries(on)) v.removeEventListener(k, fn)
    }
  }, [duration])

  /* ---------------------------------------------------- open and close */
  useLayoutEffect(() => {
    const root = rootRef.current
    const frame = frameRef.current
    if (!root || !frame) return
    const q = gsap.utils.selector(root)
    gsap.killTweensOf([frame, ...q('[data-film-back]'), ...q('[data-film-chrome]')])

    // where the film grows from: the thing that asked for it
    const fromOrigin = () => {
      const src = originRef.current?.isConnected ? originRef.current.getBoundingClientRect() : null
      const dst = frame.getBoundingClientRect()
      if (!src || !dst.width) return { x: 0, y: 24, scale: 0.92 }
      return {
        x: src.left + src.width / 2 - (dst.left + dst.width / 2),
        y: src.top + src.height / 2 - (dst.top + dst.height / 2),
        scale: Math.max(0.06, Math.min(1, Math.min(src.width / dst.width, src.height / dst.height))),
      }
    }

    if (open) {
      rest(root, false)
      gsap.set(root, { visibility: 'visible' })
      prevOverflow.current = document.documentElement.style.overflow
      document.documentElement.style.overflow = 'hidden'
      if (reduced()) {
        gsap.set([frame, ...q('[data-film-back]'), ...q('[data-film-chrome]')], { opacity: 1, clearProps: 'transform' })
      } else {
        const tl = gsap.timeline()
        tl.fromTo(q('[data-film-back]'), { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0)
        tl.fromTo(frame, { ...fromOrigin(), opacity: 0.4 }, { x: 0, y: 0, scale: 1, opacity: 1, duration: 0.85, ease: 'power3.inOut' }, 0)
        // the stone's corners give way to a screen's as it opens
        tl.fromTo(screenRef.current, { '--cut': '26px' }, { '--cut': '10px', duration: 0.85, ease: 'power3.inOut' }, 0)
        tl.fromTo(q('[data-film-chrome]'), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.05 }, 0.5)
      }
      const t = window.setTimeout(() => playRef.current?.focus({ preventScroll: true }), 650)
      return () => window.clearTimeout(t)
    }

    if (!mounted.current) {
      mounted.current = true
      gsap.set(root, { visibility: 'hidden' })
      rest(root)
      return
    }
    document.documentElement.style.overflow = prevOverflow.current
    const done = () => {
      gsap.set(root, { visibility: 'hidden' })
      gsap.set(frame, { clearProps: 'transform,opacity' })
      rest(root)
      lastFocus.current?.focus?.({ preventScroll: true })
    }
    if (reduced()) { done(); return }
    const tl = gsap.timeline({ onComplete: done })
    tl.to(q('[data-film-chrome]'), { opacity: 0, duration: 0.25, ease: 'power2.in' }, 0)
    tl.to(frame, { ...fromOrigin(), opacity: 0, duration: 0.6, ease: 'power3.inOut' }, 0.05)
    tl.to(q('[data-film-back]'), { opacity: 0, duration: 0.55, ease: 'power2.inOut' }, 0.15)
  }, [open])

  /* ---------------------------------------------------- the controls rest while it plays */
  const wake = useCallback(() => {
    setChrome(true)
    setStir((n) => n + 1)
  }, [])
  useEffect(() => {
    if (!open || !playing || ended || waiting) return
    hideTimer.current = window.setTimeout(() => setChrome(false), 2400)
    return () => window.clearTimeout(hideTimer.current)
  }, [open, playing, ended, waiting, stir])

  const toggle = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    if (v.ended) { v.currentTime = 0; v.play().catch(() => {}) }
    else if (v.paused) v.play().catch(() => {})
    else v.pause()
    wake()
  }, [wake])

  const seekBy = useCallback((d) => {
    const v = videoRef.current
    if (!v) return
    v.currentTime = Math.max(0, Math.min((v.duration || duration) - 0.05, v.currentTime + d))
    wake()
  }, [duration, wake])

  const setSound = useCallback((on) => {
    const v = videoRef.current
    if (!v) return
    v.muted = !on
    setOffered(false)
    wake()
  }, [wake])

  const canFull = typeof document !== 'undefined' && (document.fullscreenEnabled || typeof HTMLVideoElement !== 'undefined' && 'webkitEnterFullscreen' in HTMLVideoElement.prototype)
  const full = useCallback(() => {
    const frame = frameRef.current
    const v = videoRef.current
    if (document.fullscreenElement) { document.exitFullscreen?.().catch(() => {}); return }
    if (frame?.requestFullscreen && document.fullscreenEnabled) frame.requestFullscreen().catch(() => {})
    else v?.webkitEnterFullscreen?.()
  }, [])

  /* ---------------------------------------------------- the keyboard, while it is open */
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      const k = e.key
      if (k === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return }
      if (k === 'Tab') {
        // the film keeps the keyboard until it is closed
        const items = [...rootRef.current.querySelectorAll('button:not([disabled]), [role="slider"]')].filter((el) => el.offsetParent !== null)
        if (!items.length) return
        const i = items.indexOf(document.activeElement)
        const next = e.shiftKey ? (i <= 0 ? items.length - 1 : i - 1) : (i === items.length - 1 ? 0 : i + 1)
        e.preventDefault(); e.stopPropagation()
        items[next].focus()
        wake()
        return
      }
      const onSlider = document.activeElement?.getAttribute?.('role') === 'slider'
      if (k === ' ' || k === 'k' || k === 'K') {
        if (document.activeElement?.tagName === 'BUTTON' && k === ' ') return
        e.preventDefault(); e.stopPropagation(); toggle()
      } else if (k === 'm' || k === 'M') { e.preventDefault(); e.stopPropagation(); setSound(videoRef.current?.muted) }
      else if ((k === 'f' || k === 'F') && canFull) { e.preventDefault(); e.stopPropagation(); full() }
      else if (k === 'ArrowLeft' || k === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); seekBy((k === 'ArrowLeft' ? -1 : 1) * (onSlider ? 1 : 2)) }
      else if (k === 'Home') { e.preventDefault(); e.stopPropagation(); seekBy(-1e6) }
      else if (k === 'End') { e.preventDefault(); e.stopPropagation(); seekBy(1e6) }
      else e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, close, toggle, setSound, full, seekBy, canFull, wake])

  /* ---------------------------------------------------- dragging along the hairline */
  const scrub = (e) => {
    const v = videoRef.current
    const track = trackRef.current
    if (!v || !track) return
    const at = (ev) => {
      const r = track.getBoundingClientRect()
      const k = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width))
      v.currentTime = k * (v.duration || duration)
    }
    at(e)
    track.setPointerCapture?.(e.pointerId)
    const move = (ev) => at(ev)
    const up = () => { track.removeEventListener('pointermove', move); track.removeEventListener('pointerup', up); track.removeEventListener('pointercancel', up) }
    track.addEventListener('pointermove', move)
    track.addEventListener('pointerup', up)
    track.addEventListener('pointercancel', up)
    wake()
  }

  if (!film) return null
  const d = duration || film.duration || 0
  const show = chrome || !playing || ended || waiting
  const ink = (a = 1) => `rgb(var(--sr-ink) / ${a})`
  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`The film — ${title}`}
      aria-hidden={!open}
      inert={!open || undefined}
      className="film fixed inset-0 z-[70]"
      style={{ visibility: 'hidden' }}
      onPointerMove={wake}
    >
      {/* the room goes dark around the screen, keeping a breath of the piece's light */}
      <div data-film-back onClick={close} className="absolute inset-0" style={{ background: 'radial-gradient(70% 60% at 50% 48%, rgb(var(--sr-bg1)), rgb(3 2 2) 70%)' }} />
      <div data-film-back aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(46% 30% at 50% 100%, rgb(var(--sr-neon) / 0.14), transparent 70%)' }} />

      {/* top: what this is, and the way out */}
      <div data-film-chrome className={`film-top absolute inset-x-0 top-0 z-[2] flex h-[64px] items-center justify-between pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] transition-opacity duration-500 lg:h-[84px] lg:pl-[max(3rem,env(safe-area-inset-left))] lg:pr-[max(3rem,env(safe-area-inset-right))] ${show ? '' : 'film-resting'}`}>
        <div className="flex min-w-0 items-center gap-4">
          <span className="text-[9px] font-medium uppercase tracking-[0.38em]" style={{ color: 'rgb(var(--sr-neon))' }}>The film</span>
          <span className="hidden h-px w-10 sm:block" style={{ background: ink(0.3) }} />
          <span className="hidden truncate text-[10px] uppercase tracking-[0.26em] sm:block" style={{ color: ink(0.75) }}>{title}</span>
        </div>
        <button data-sound="none" onClick={close} aria-label="Close the film" className="group flex items-center gap-3 text-[10px] uppercase tracking-[0.3em]" style={{ color: ink(0.7) }}>
          <span className="hidden transition-colors duration-300 group-hover:text-[rgb(var(--sr-ink))] sm:inline">Close</span>
          <span className="relative isolate grid h-11 w-11 place-items-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-90 lg:h-10 lg:w-10" style={{ color: 'rgb(var(--sr-ink))' }}>
            <Plate cut={11} fill="rgb(var(--sr-glass) / 0.05)" edge={ink(0.25)} edgeHi={ink(0.65)} />
            <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" /></svg>
          </span>
        </button>
      </div>

      {/* the screen */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div ref={frameRef} className="film-frame pointer-events-auto relative">
          <div ref={screenRef} className={`film-screen facet relative aspect-video w-full ${show ? '' : 'cursor-none'}`} style={{ '--cut': '10px', background: '#000' }}>
          <video
            ref={videoRef}
            playsInline
            preload="none"
            poster={film.poster || undefined}
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            aria-label={`The film of the ${title}`}
            className="absolute inset-0 h-full w-full object-contain"
            onClick={() => (chrome || !playing ? toggle() : wake())}
          />
          <Plate cut={10} className="z-[1]" edge={ink(0.16)} />

          {/* still gathering itself */}
          {waiting && !failed && (
            <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-[2] -ml-3 -mt-3 block h-6 w-6">
              <span className="film-wait lozenge absolute inset-0" style={{ border: '1px solid rgb(var(--sr-neon))', background: 'rgb(var(--sr-neon) / 0.18)' }} />
            </span>
          )}

          {/* the sound, offered rather than forced */}
          {open && muted && offered && !ended && (
            <button
              data-sound="none"
              onClick={(e) => { e.stopPropagation(); setSound(true) }}
              className="absolute left-3 top-3 z-[3] flex h-10 items-center gap-2.5 px-3.5 text-[9.5px] font-medium uppercase tracking-[0.26em] lg:left-4 lg:top-4"
              style={{ color: ink(0.92) }}
            >
              <Plate cut={6} fill="rgb(0 0 0 / 0.55)" edge={ink(0.25)} edgeHi={ink(0.6)} />
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true"><path d="M2.5 6h2.8L9 3v10L5.3 10H2.5z" fill="currentColor" /><path d="M11.4 5.6a3.4 3.4 0 0 1 0 4.8M12.9 4.1a5.5 5.5 0 0 1 0 7.8" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" /></svg>
              Tap for sound
            </button>
          )}

          {/* the end: again, or back to the piece */}
          {ended && !failed && (
            <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-6" style={{ background: 'rgb(0 0 0 / 0.35)' }}>
              <button data-sound="none" onClick={toggle} className="group relative isolate flex h-12 items-center gap-3 px-6 text-[10.5px] font-medium uppercase tracking-[0.3em]" style={{ color: ink() }}>
                <Plate cut={9} fill="rgb(var(--sr-neon) / 0.16)" edge="rgb(var(--sr-neon) / 0.8)" edgeHi="rgb(var(--sr-neon))" />
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true"><path d="M3.2 8a4.8 4.8 0 1 0 1.5-3.5M3 2.2v3h3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" /></svg>
                Watch again
              </button>
              <button data-sound="none" onClick={close} className="text-[10px] uppercase tracking-[0.3em] underline decoration-[rgb(var(--sr-ink)/0.3)] underline-offset-[6px]" style={{ color: ink(0.75) }}>
                Back to the piece
              </button>
            </div>
          )}

          {failed && (
            <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-[12px] leading-[1.8]" style={{ color: ink(0.8) }}>This film can’t play here.</p>
              <a href={film.src} target="_blank" rel="noreferrer" className="text-[10px] uppercase tracking-[0.3em] underline underline-offset-[6px]" style={{ color: ink(0.9) }}>Open the film on its own</a>
            </div>
          )}

          </div>

          {/* the controls: over the bottom of the screen, or under it on a tall phone */}
          <div
            data-film-chrome
            className={`film-controls absolute inset-x-0 bottom-0 z-[3] flex items-center gap-3 px-3 pb-3 pt-10 transition-opacity duration-500 lg:gap-4 lg:px-5 lg:pb-4 ${show ? '' : 'film-resting'}`}
            style={{ background: 'linear-gradient(to top, rgb(0 0 0 / 0.72), rgb(0 0 0 / 0.36) 55%, transparent)' }}
          >
            <button ref={playRef} data-sound="none" onClick={toggle} aria-label={playing ? 'Pause' : ended ? 'Play again' : 'Play'} className="relative isolate grid h-11 w-11 shrink-0 place-items-center" style={{ color: ink() }}>
              <Plate cut={11} fill="rgb(var(--sr-neon) / 0.14)" edge="rgb(var(--sr-neon) / 0.7)" edgeHi="rgb(var(--sr-neon))" />
              <PlayGlyph playing={playing} />
            </button>
            <span className="w-[4.6rem] shrink-0 text-[10px] tabular-nums tracking-[0.14em]" style={{ color: ink(0.85) }} aria-hidden="true">
              {clock(time)} <span style={{ color: ink(0.45) }}>/ {clock(d)}</span>
            </span>
            <div
              ref={trackRef}
              role="slider"
              tabIndex={0}
              aria-label="Position in the film"
              aria-valuemin={0}
              aria-valuemax={Math.round(d)}
              aria-valuenow={Math.round(time)}
              aria-valuetext={`${clock(time)} of ${clock(d)}`}
              onPointerDown={scrub}
              className="group/track relative flex h-11 min-w-0 flex-1 cursor-pointer touch-none items-center outline-none"
            >
              <span className="relative block h-px w-full" style={{ background: ink(0.22) }}>
                <span ref={fillRef} className="absolute inset-0 origin-left" style={{ transform: 'scaleX(0)', background: 'rgb(var(--sr-neon))', boxShadow: '0 0 8px rgb(var(--sr-neon) / 0.7)' }} />
              </span>
              <span ref={headRef} aria-hidden="true" className="lozenge absolute top-1/2 -ml-[5px] -mt-[5px] block h-[10px] w-[10px] transition-transform duration-200 group-hover/track:scale-125 group-focus-visible/track:scale-125" style={{ left: '0%', background: 'rgb(var(--sr-ink))' }} />
            </div>
            <button data-sound="none" onClick={() => setSound(muted)} aria-label={muted ? 'Sound on' : 'Sound off'} aria-pressed={!muted} className="grid h-11 w-11 shrink-0 place-items-center" style={{ color: ink(muted ? 0.6 : 0.95) }}>
              <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
                <path d="M2.5 6h2.8L9 3v10L5.3 10H2.5z" fill="currentColor" />
                {muted
                  ? <path d="M11 6l3.4 4M14.4 6 11 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  : <path d="M11.4 5.6a3.4 3.4 0 0 1 0 4.8M12.9 4.1a5.5 5.5 0 0 1 0 7.8" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />}
              </svg>
            </button>
            {canFull && (
              <button data-sound="none" onClick={full} aria-label="Full screen" className="grid h-11 w-11 shrink-0 place-items-center" style={{ color: ink(0.85) }}>
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
