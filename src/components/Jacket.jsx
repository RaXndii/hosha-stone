import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { JACKET } from '../data/product.js'
import { VIEWS } from '../lib/camera.js'

const CANVAS = 1100

function View({ name, view, z }) {
  const maskStyle = {
    WebkitMaskImage: `url(${view.mask})`,
    maskImage: `url(${view.mask})`,
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
  }

  return (
    <div
      data-view={name}
      className="absolute inset-0 will-change-transform"
      style={{ zIndex: z, transformOrigin: '50% 50%' }}
    >
      <img
        src={view.src}
        alt={name === 'front' ? 'VASS Jacket 012A' : ''}
        aria-hidden={name === 'front' ? undefined : true}
        draggable="false"
        decoding="async"
        width={CANVAS}
        height={CANVAS}
        className="h-full w-full select-none object-contain"
        style={{
          filter: 'contrast(1.05) brightness(calc(1 + var(--warm, 0) * 0.26))',
        }}
      />

      {/* Key and rim, shaped to the garment rather than its box. The key's
          position follows the pointer; the rim swings round with the camera, so
          the lit edge changes side as the garment turns away from the light. */}
      <div
        className="pointer-events-none absolute inset-0 mix-blend-screen"
        style={{
          ...maskStyle,
          opacity: 'calc(0.2 + var(--near, 0) * 0.34 + var(--warm, 0) * 0.16)',
          background:
            'radial-gradient(105% 88% at calc(var(--lx, 0.5) * 150% - 25%) calc(var(--ly, 0.45) * 130% - 15%),' +
            ' rgba(206,190,250,0.4) 0%, rgba(146,126,205,0.13) 48%, transparent 78%),' +
            ' linear-gradient(calc(96deg + var(--dx, 0) * -18deg + var(--sweep, 0) * 150deg),' +
            ' rgba(178,152,235,0.32) 0%, transparent 24%, transparent 76%, rgba(218,192,255,0.2) 100%)',
        }}
      />
    </div>
  )
}

export default function Jacket() {
  const hoverRef = useRef(null)

  useEffect(() => {
    const el = hoverRef.current
    if (!el) return
    if (window.matchMedia('(pointer: coarse)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const rotY = gsap.quickTo(el, 'rotationY', { duration: 0.9, ease: 'power3.out' })
    const rotX = gsap.quickTo(el, 'rotationX', { duration: 0.9, ease: 'power3.out' })
    let hovering = false

    const onMove = (e) => {
      if (!hovering) return
      const r = el.getBoundingClientRect()
      const nx = (e.clientX - r.left) / r.width - 0.5
      const ny = (e.clientY - r.top) / r.height - 0.5
      // a garment shifting its weight, not a model on a turntable
      rotY(nx * 6)
      rotX(-ny * 4)
    }
    const onEnter = () => {
      hovering = true
      gsap.to(el, { scale: 1.02, duration: 0.85, ease: 'power3.out', overwrite: 'auto' })
    }
    const onLeave = () => {
      hovering = false
      gsap.to(el, {
        scale: 1, rotationY: 0, rotationX: 0,
        duration: 1.25, ease: 'power3.out', overwrite: 'auto',
      })
    }

    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointerleave', onLeave)
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <div
      data-jacket-scroll
      className="pointer-events-none absolute inset-0 flex items-center justify-center pb-[24vh] will-change-transform md:pb-0 md:pl-[26vw]"
    >
      <div className="relative" style={{ perspective: '2000px' }}>
        {/* Contact shadow: falls away from the light, flattens as the camera
            comes round. CSS variables only — a GSAP tween here would overwrite
            the whole transform, centring included. */}
        <div
          data-jacket-shadow
          className="pointer-events-none absolute left-1/2 top-[87%] h-[13%] w-[84%]"
          style={{
            background:
              'radial-gradient(closest-side, rgba(2,1,8,0.8) 0%, rgba(2,1,8,0.32) 52%, transparent 100%)',
            transform:
              'translate3d(calc(-50% + var(--dx, 0) * -26px), 0, 0)' +
              ' scaleX(calc((1.02 - var(--warm, 0) * 0.2) * var(--shadow-squash, 1)))',
            opacity: 'calc(0.46 + var(--near, 0) * 0.26 - var(--warm, 0) * 0.08)',
          }}
        />

        <div
          className="will-change-transform"
          style={{ transform: 'translate3d(calc(var(--dx, 0) * 12px), calc(var(--dy, 0) * 7px), 0)' }}
        >
          <div ref={hoverRef} data-jacket-hover className="pointer-events-auto [transform-style:preserve-3d]">
            {/* the rig the camera swings around */}
            <div
              data-jacket-rig
              className="relative w-[62vw] max-w-[34rem] [transform-style:preserve-3d] md:w-[34vw]"
              style={{ aspectRatio: '1 / 1' }}
            >
              <View name="front" view={VIEWS.front} z={1} />
              <View name="side" view={VIEWS.side} z={2} />
              <View name="back" view={VIEWS.back} z={3} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { JACKET }
