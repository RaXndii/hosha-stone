/**
 * Frames for each view of the current piece, captioned like contact-sheet
 * prints. Garment cut-outs are shown standing in a small slice of the room's
 * own light, so the frame reads as a still from this scene rather than a
 * product thumbnail. The active frame carries an accent rule; pressing it a
 * second time opens the closer look on that view.
 */
export default function Band({ product, view, onPick }) {
  return (
    <div data-band className="relative z-20">
      <div
        className="flex snap-x snap-mandatory gap-1.5 overflow-x-auto px-5 pb-1 md:justify-center md:overflow-visible md:px-0 md:pb-0"
        style={{ scrollbarWidth: 'none' }}
      >
        {product.gallery.map((g, i) => {
          const on = i === view
          return (
            <button
              key={product.id + g.id}
              data-band-frame
              onClick={() => onPick(i)}
              aria-pressed={on}
              aria-label={on ? `Look closer at ${g.label}` : `Show ${g.label}`}
              className="group relative shrink-0 snap-start text-left md:shrink"
              style={{ width: 'min(24.6vw, 470px)', minWidth: '9.5rem' }}
            >
              <span
                className="relative block h-[clamp(96px,17vh,176px)] overflow-hidden transition-transform duration-500 ease-out group-hover:-translate-y-[3px]"
                style={{ background: 'rgb(var(--sr-bg1))' }}
              >
                {g.kind === 'garment' ? (
                  <>
                    <span
                      className="absolute inset-0"
                      style={{
                        background:
                          'radial-gradient(70% 90% at 50% 20%, rgb(var(--sr-bg2)) 0%, rgb(var(--sr-bg1)) 60%, rgb(var(--sr-bg0)) 100%)',
                      }}
                    />
                    <img
                      src={g.src}
                      alt=""
                      draggable="false"
                      decoding="async"
                      loading="lazy"
                      className="absolute inset-0 h-full w-full select-none object-contain p-[8%] transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                    />
                  </>
                ) : (
                  <img
                    src={g.src}
                    alt=""
                    draggable="false"
                    decoding="async"
                    loading="lazy"
                    className="absolute inset-0 h-full w-full select-none object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                    style={{ objectPosition: g.focus ?? '50% 50%' }}
                  />
                )}
                {/* unchosen frames rest in shadow and lift into the light on hover */}
                <span
                  className="absolute inset-0 transition-opacity duration-500"
                  style={{ background: 'rgb(var(--sr-bg0) / 0.55)', opacity: on ? 0 : 1 }}
                />
                <span
                  className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: 'linear-gradient(to top, transparent 40%, rgb(var(--sr-light) / 0.1))' }}
                />
                {/* the active rule */}
                <span
                  className="absolute left-0 top-0 h-[2px] origin-left transition-transform duration-700 ease-out"
                  style={{ width: '100%', background: 'rgb(var(--sr-accent))', transform: `scaleX(${on ? 1 : 0})` }}
                />
                {on && (
                  <span
                    className="absolute bottom-2 right-2 grid h-6 w-6 place-items-center rounded-full text-[11px] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: 'rgb(var(--sr-bg0) / 0.7)', color: 'rgb(var(--sr-ink))' }}
                    aria-hidden="true"
                  >
                    +
                  </span>
                )}
              </span>
              <span
                className="mt-3 block text-center text-[9.5px] uppercase tracking-[0.34em] transition-colors duration-500"
                style={{ color: on ? 'rgb(var(--sr-ink) / 0.92)' : 'rgb(var(--sr-ink) / 0.42)' }}
              >
                {g.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
