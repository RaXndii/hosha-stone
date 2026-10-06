import { useEffect, useRef } from 'react'
import { usePage } from '../lib/page.jsx'

const LINKS = ['Shop', 'Collections', 'About']

function Instagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" />
    </svg>
  )
}

function WhatsApp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
      <path
        d="M3.5 20.5l1.3-4.3A8.2 8.2 0 1 1 8 19.3l-4.5 1.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 8.4c.2-.5.4-.5.6-.5h.5c.2 0 .4 0 .6.5l.7 1.6c.1.2.1.4 0 .6l-.4.5c-.1.2-.2.3-.1.5.4.8 1.2 1.6 2 2 .2.1.4 0 .5-.1l.5-.5c.2-.2.3-.2.5-.1l1.5.8c.2.1.3.3.3.5v.5c0 .5-.4.9-.9 1.1-.5.2-1.1.2-2-.1a9 9 0 0 1-4.5-4.2c-.4-.9-.4-1.6-.2-2.1Z"
        fill="currentColor"
      />
    </svg>
  )
}

function Search() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[17px] w-[17px]">
      <circle cx="11" cy="11" r="6.4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15.8 15.8L20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** Occasionally, one control catches the light. Not on a loop the eye can learn. */
function useOccasionalGlint(rootRef) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const targets = Array.from(root.querySelectorAll('[data-glint]'))
    if (!targets.length) return

    let timer
    const schedule = () => {
      timer = window.setTimeout(() => {
        const el = targets[Math.floor(Math.random() * targets.length)]
        el.classList.add('is-glinting')
        window.setTimeout(() => el.classList.remove('is-glinting'), 1600)
        schedule()
      }, 7000 + Math.random() * 9000)
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [rootRef])
}

export default function TopBar() {
  const rootRef = useRef(null)
  const { go } = usePage()
  useOccasionalGlint(rootRef)

  return (
    <header
      ref={rootRef}
      data-topbar
      className="absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-4 px-5 py-5 md:px-9 md:py-7"
    >
      <div className="flex items-center gap-4 md:gap-7">
        <a href="#" data-topbar-item className="block shrink-0 leading-none" aria-label="VASS — home">
          <span className="block font-display text-[10px] italic tracking-[0.06em] text-bone/55 md:text-[11px]">
            welcome to
          </span>
          <span className="block font-display text-2xl font-semibold leading-[1.05] tracking-[0.04em] text-bone md:text-[28px]">
            VASS
          </span>
        </a>

        <nav className="hidden items-center gap-2.5 md:flex">
          {LINKS.map((label) => (
            <a
              key={label}
              href={label === 'About' ? '#' : '#/showroom'}
              onClick={(e) => {
                if (label === 'About') return
                e.preventDefault()
                go('showroom')
              }}
              data-topbar-item
              data-glint
              className="irid sweep group relative overflow-hidden rounded-[13px] px-6 py-2.5 transition-transform duration-300 hover:scale-[1.03]"
            >
              <span className="relative z-10 text-[10px] font-medium uppercase tracking-[0.2em] text-bone/70 transition-colors duration-300 group-hover:text-bone">
                {label}
              </span>
            </a>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2.5 md:gap-4">
        {[
          { label: 'Instagram', Icon: Instagram },
          { label: 'WhatsApp', Icon: WhatsApp },
        ].map(({ label, Icon }) => (
          <a
            key={label}
            href="#"
            aria-label={label}
            title={label}
            data-topbar-item
            data-glint
            className="irid sweep group relative grid h-10 w-10 place-items-center overflow-hidden rounded-full text-bone/65 transition-all duration-300 hover:scale-[1.06] hover:text-bone"
          >
            <span className="relative z-10">
              <Icon />
            </span>
            <span
              className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-400 group-hover:opacity-100"
              style={{
                background:
                  'radial-gradient(circle at 50% 50%, rgba(150,120,225,0.3) 0%, transparent 70%)',
              }}
            />
          </a>
        ))}

        {/* search sits inside its own pocket of atmosphere */}
        <div data-topbar-item className="relative">
          <span
            className="pointer-events-none absolute -inset-x-10 -inset-y-9"
            style={{
              background:
                'radial-gradient(closest-side, rgba(140,96,224,0.34) 0%, rgba(126,86,206,0.17) 34%,' +
                ' rgba(104,72,180,0.06) 62%, transparent 84%)',
              animation: 'haze-a 19s ease-in-out infinite',
            }}
          />
          <button
            data-glint
            aria-label="Search"
            className="irid sweep group relative flex h-10 items-center gap-2.5 overflow-hidden rounded-full pl-4 pr-5 text-bone/70 transition-all duration-300 hover:scale-[1.03] hover:text-bone md:h-11 md:w-[188px]"
          >
            <span className="relative z-10">
              <Search />
            </span>
            <span className="relative z-10 hidden text-[10px] uppercase tracking-[0.22em] md:inline">
              Search
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
