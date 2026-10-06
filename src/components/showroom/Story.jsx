import { STORY, pad2 } from '../../data/showroom.js'
import Roll from './Roll.jsx'
import { Reveal } from './Info.jsx'

function Chevron({ flip }) {
  return (
    <svg viewBox="0 0 10 18" className="h-[15px] w-[9px]" style={{ transform: flip ? 'scaleX(-1)' : 'none' }}>
      <path d="M8.5 1.5 1.5 9l7 7.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/**
 * The gallery counter belongs to the current piece: it counts views of THIS
 * garment. Product navigation lives on the edges of the screen and looks
 * nothing like it, so the two are never confused.
 */
export function Counter({ view, total, viewDir, onStep, className = '' }) {
  return (
    <div data-quiet-soft className={`flex items-center gap-6 ${className}`}>
      <button
        data-vx
        onClick={() => onStep(-1)}
        aria-label="Previous view"
        className="vx grid h-9 w-9 place-items-center rounded-full transition-transform duration-500 hover:-translate-x-0.5"
        style={{ color: 'rgb(var(--sr-ink) / 0.85)' }}
      >
        <Chevron />
      </button>
      <span className="flex items-baseline gap-3 text-[11px] font-medium tracking-[0.26em]" aria-live="polite">
        <span style={{ color: 'rgb(var(--sr-ink))' }}>
          <Roll value={pad2(view + 1)} dir={viewDir} duration={0.6} />
        </span>
        <span style={{ color: 'rgb(var(--sr-ink) / 0.35)' }}>/</span>
        <span style={{ color: 'rgb(var(--sr-ink) / 0.45)' }}>
          <Roll value={pad2(total)} duration={0.6} />
        </span>
      </span>
      <button
        data-vx
        onClick={() => onStep(1)}
        aria-label="Next view"
        className="vx grid h-9 w-9 place-items-center rounded-full transition-transform duration-500 hover:translate-x-0.5"
        style={{ color: 'rgb(var(--sr-ink) / 0.85)' }}
      >
        <Chevron flip />
      </button>
    </div>
  )
}

export default function Story() {
  return (
    <div data-quiet className="max-w-[13rem]">
      {STORY.heading.map((w) => (
        <Reveal
          key={w}
          className="text-[clamp(0.95rem,1.05vw,1.1rem)] font-medium uppercase leading-[1.35] tracking-[0.2em]"
          style={{ color: 'rgb(var(--sr-ink))' }}
        >
          {w}
        </Reveal>
      ))}
      <span data-grow-y className="my-6 block h-12 w-px origin-top" style={{ background: 'rgb(var(--sr-ink) / 0.6)' }} />
      <Reveal as="p" className="text-[12.5px] leading-[1.85]" style={{ color: 'rgb(var(--sr-ink) / 0.72)' }}>
        {STORY.body}
      </Reveal>
    </div>
  )
}
