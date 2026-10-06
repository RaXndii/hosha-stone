import { usePage } from '../lib/page.jsx'

/**
 * Where the camera comes to rest. It opens on the same darkness the cinematic
 * sequence ends in, so the hand-off reads as one continuous move.
 */
export default function Outro() {
  const { go } = usePage()
  return (
    <section className="relative bg-abyss px-6 pb-28 pt-[10vh] md:px-[8vw] md:pb-40">
      <span
        className="pointer-events-none absolute left-1/2 top-0 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            'radial-gradient(closest-side, rgba(98,74,178,0.18) 0%, rgba(80,60,150,0.08) 40%, transparent 78%)',
        }}
      />

      <div className="relative mx-auto max-w-3xl">
        <p className="text-[9px] uppercase tracking-ultra text-bone/35">The house</p>
        <h2
          className="mt-7 font-display font-medium leading-[1.12] text-bone"
          style={{ fontSize: 'clamp(1.9rem, 4.4vw, 3.6rem)' }}
        >
          Clothing made for the hour
          <span className="italic text-lilac"> after </span>
          the photograph.
        </h2>
        <p className="mt-9 max-w-xl text-[13px] leading-[1.9] text-bone/55 md:text-sm">
          VASS builds a small number of garments each season and photographs them
          the way film is lit — slowly, and from one side. What you wear should
          hold its shape long after the room goes dark.
        </p>

        <div className="mt-14 flex flex-wrap items-center gap-8 border-t border-bone/10 pt-8">
          {['Spring 2026', 'Made in limited run', 'Shipped worldwide'].map((line) => (
            <span key={line} className="text-[10px] uppercase tracking-[0.24em] text-bone/40">
              {line}
            </span>
          ))}
        </div>

        {/* the film ends at the door of the showroom */}
        <button
          onClick={() => go('showroom')}
          className="group mt-16 flex items-center gap-5 text-left"
        >
          <span className="font-display text-[clamp(1.4rem,2.6vw,2.1rem)] italic text-bone">
            Enter the showroom
          </span>
          <span className="h-px w-12 bg-bone/40 transition-all duration-500 group-hover:w-20 group-hover:bg-lilac" />
          <span className="text-bone/70 transition-transform duration-500 group-hover:translate-x-1">→</span>
        </button>
      </div>
    </section>
  )
}
