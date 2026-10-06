/**
 * Every view of the current piece, stacked inside the case. Only one is
 * visible at a time; the others wait at opacity 0 so a change of view can wipe
 * between two layers that both already exist. Visibility is owned by GSAP in
 * Showroom — React never sets it, or a re-render would cut a wipe short.
 *
 * Garments hang in the case: a piece shot on a hanger is pinned to the rail
 * (anchor 'top'); the others float centred. Prints — close photographs — are
 * mounted on a thin mat, the way a detail would be shown in a gallery.
 */
export default function CaseContents({ product, parallaxRef }) {
  return (
    <div data-case-content className="absolute inset-0">
      {/* the depth the pointer gives the piece (useShowcase) — on its own
          wrapper, so it never fights the transforms GSAP puts on the layers */}
      <div ref={parallaxRef} className="absolute inset-0">
      {product.gallery.map((view, i) => (
        <div
          key={product.id + view.id}
          data-view-layer
          data-index={i}
          className="absolute inset-0 will-change-transform"
        >
          {view.kind === 'garment' ? <Garment view={view} name={product.name} /> : <Print view={view} name={product.name} />}
        </div>
      ))}
      </div>
    </div>
  )
}

function Garment({ view, name }) {
  const top = view.anchor === 'top'
  return (
    <div
      className="absolute"
      style={{
        left: '3%',
        right: '3%',
        top: top ? '11.4%' : '16%',
        bottom: top ? '10%' : '7.5%',
        transform: `scale(${view.scale ?? 1})`,
        transformOrigin: top ? '50% 0%' : '50% 50%',
      }}
    >
      {/* a soft pool of shadow on the case floor beneath the garment — a
          gradient, not a drop-shadow filter, so it costs nothing to animate */}
      <span
        aria-hidden="true"
        className="absolute bottom-[-3%] left-1/2 h-[9%] w-[78%] -translate-x-1/2"
        style={{ background: 'radial-gradient(closest-side, rgb(0 0 0 / 0.5), transparent)' }}
      />
      <img
        src={view.src}
        alt={`${name} — ${view.label}`}
        draggable="false"
        decoding="async"
        className="relative h-full w-full select-none object-contain"
        style={{ objectPosition: top ? '50% 0%' : '50% 50%' }}
      />
    </div>
  )
}

function Print({ view, name }) {
  return (
    // square, so a close photograph fills most of the back panel; the source
    // crops are landscape, and the focus point keeps the subject in frame
    <div className="absolute left-1/2 top-[54%] w-[80%] -translate-x-1/2 -translate-y-1/2">
      <div
        className="relative overflow-hidden"
        style={{
          aspectRatio: view.aspect ?? '1 / 1',
          boxShadow: '0 22px 40px -12px rgb(0 0 0 / 0.65), 0 0 0 1px rgb(var(--sr-glass) / 0.16)',
        }}
      >
        <img
          src={view.src}
          alt={`${name} — ${view.label}`}
          draggable="false"
          decoding="async"
          className="h-full w-full select-none object-cover"
          style={{ objectPosition: view.focus ?? '50% 50%' }}
        />
        {/* the same overhead light falls on the print as on the case */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'linear-gradient(to bottom, rgb(var(--sr-light) / 0.1), transparent 35%, rgb(0 0 0 / 0.25))',
          }}
        />
      </div>
      <p
        className="mt-[6%] text-center text-[clamp(8px,0.7vw,10px)] uppercase tracking-[0.32em]"
        style={{ color: 'rgb(var(--sr-ink) / 0.55)' }}
      >
        {view.label}
      </p>
    </div>
  )
}
