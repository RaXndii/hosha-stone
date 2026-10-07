import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import Plate from './Plate.jsx'
import { sound } from '../../lib/sound/index.js'

/**
 * One drawer, for anything that slides in beside the page — the size guide
 * today. Same entrance, same weight, so opening any of them feels like the
 * same system responding.
 */
export default function Drawer({ open, onClose, title, children }) {
  const scrimRef = useRef(null)
  const panelRef = useRef(null)
  const mounted = useRef(false)

  useEffect(() => {
    const scrim = scrimRef.current
    const panel = panelRef.current
    if (!scrim || !panel) return
    gsap.killTweensOf([scrim, panel])
    if (mounted.current) sound.play(open ? 'open' : 'close')

    if (open) {
      gsap.to(scrim, { autoAlpha: 1, duration: 0.34, ease: 'power2.out' })
      gsap.fromTo(
        panel,
        { xPercent: 104, autoAlpha: 0 },
        { xPercent: 0, autoAlpha: 1, duration: 0.62, ease: 'power3.out' },
      )
    } else if (mounted.current) {
      gsap.to(scrim, { autoAlpha: 0, duration: 0.28, ease: 'power2.in' })
      gsap.to(panel, { xPercent: 104, autoAlpha: 0, duration: 0.42, ease: 'power3.in' })
    }
    mounted.current = true
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div
        ref={scrimRef}
        onClick={onClose}
        className="fixed inset-0 z-[52] bg-abyss/70 backdrop-blur-[2px]"
        style={{ opacity: 0, visibility: 'hidden' }}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed right-0 top-0 z-[54] flex h-full w-full max-w-[26rem] flex-col border-l border-bone/10 pb-[calc(1.75rem+env(safe-area-inset-bottom))] pl-6 pr-[max(1.5rem,env(safe-area-inset-right))] pt-7 md:pl-8 md:pr-[max(2rem,env(safe-area-inset-right))]"
        style={{ opacity: 0, visibility: 'hidden', background: 'var(--drawer-bg, rgba(9,7,24,0.96))' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-ultra text-bone/45">{title}</span>
          <button
            data-vx
            data-sound="none"
            onClick={onClose}
            aria-label="Close"
            className="vx group grid h-9 w-9 place-items-center text-bone/60 hover:text-bone"
          >
            <Plate cut={9} edge="rgb(244 242 247 / 0.15)" edgeHi="rgb(244 242 247 / 0.42)" />
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
            </svg>
          </button>
        </div>
        <div className="mt-8 flex-1 overflow-y-auto">{children}</div>
      </aside>
    </>
  )
}
