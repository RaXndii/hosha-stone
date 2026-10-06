import { JACKET } from '../data/product.js'

/**
 * Cinematic inserts, not thumbnails. Each one enters oversized and already
 * moving, crosses the frame on the same axis the camera is travelling, and
 * leaves — the garment keeps turning behind it the whole time. The soft mask
 * means they never read as a rectangle pasted over the scene.
 */
const INSERTS = [
  { key: 'zip', src: JACKET.details.zip, from: 'right' },
  { key: 'pocket', src: JACKET.details.pocket, from: 'left' },
  { key: 'collar', src: JACKET.details.collar, from: 'right' },
]

export default function DetailInserts() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {INSERTS.map(({ key, src, from }) => (
        <div
          key={key}
          data-insert={key}
          className="absolute left-1/2 top-1/2 h-[78vh] w-[62vw] will-change-transform md:h-[86vh] md:w-[42vw]"
          style={{
            opacity: 0,
            transform: 'translate3d(-50%, -50%, 0)',
            WebkitMaskImage:
              'radial-gradient(72% 62% at 50% 50%, #000 40%, rgba(0,0,0,0.55) 70%, transparent 100%)',
            maskImage:
              'radial-gradient(72% 62% at 50% 50%, #000 40%, rgba(0,0,0,0.55) 70%, transparent 100%)',
          }}
        >
          <img
            src={src}
            alt=""
            aria-hidden="true"
            draggable="false"
            decoding="async"
            loading="lazy"
            className="h-full w-full select-none object-cover"
            style={{ filter: 'contrast(1.08) brightness(0.92)' }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                `linear-gradient(${from === 'right' ? '250deg' : '110deg'},` +
                ' rgba(166,140,225,0.16) 0%, transparent 42%)',
            }}
          />
        </div>
      ))}
    </div>
  )
}
