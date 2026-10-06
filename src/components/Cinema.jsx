import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import usePointerField from '../hooks/usePointerField.js'
import { JACKET } from '../data/product.js'
import { cameraFrame, VIEWS } from '../lib/camera.js'
import Atmosphere from './Atmosphere.jsx'
import TypeLayer from './TypeLayer.jsx'
import Jacket from './Jacket.jsx'
import DetailInserts from './DetailInserts.jsx'
import TopBar from './TopBar.jsx'
import InfoPanel from './InfoPanel.jsx'
import PriceTag from './PriceTag.jsx'

gsap.registerPlugin(ScrollTrigger)

const LIGHT_ANCHOR = [0.62, 0.52]

export default function Cinema() {
  const cinemaRef = useRef(null)
  const stageRef = useRef(null)
  const mediaRef = useRef(null)
  const introStartRef = useRef(null)
  const [reduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  usePointerField(stageRef, { anchor: LIGHT_ANCHOR })

  useLayoutEffect(() => {
    const stage = stageRef.current
    const cinema = cinemaRef.current
    if (!stage || !cinema) return

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(stage)
      gsap.set(stage, { '--warm': 0, '--vig': 0, '--blackout': 0 })
      // centring lives in xPercent so the camera can animate x without
      // destroying it
      gsap.set([...q('[data-spring]'), ...q('[data-vasstype]')], { xPercent: -50 })

      if (reduced) {
        document.body.classList.remove('is-loading')
        return
      }

      window.scrollTo(0, 0)
      document.body.classList.add('is-loading')

      /* ---------- the scene assembles itself ----------
         fromTo throughout: explicit end values, so a re-run can never inherit
         a half-finished state as its destination. */
      const intro = gsap.timeline({
        paused: true,
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          document.body.classList.remove('is-loading')
          buildCamera()
          ScrollTrigger.refresh()
        },
      })

      intro
        .fromTo(q('[data-atmos]'), { opacity: 0 }, { opacity: 1, duration: 1.0 }, 0)
        .fromTo(
          q('[data-topbar-item]')[0],
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8 },
          0.15,
        )
        .fromTo(
          q('[data-topbar-item]').slice(1),
          { y: -12, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.06 },
          0.32,
        )
        .fromTo(
          q('[data-spring]'),
          { yPercent: 16, opacity: 0, clipPath: 'inset(0% 0% 100% 0%)' },
          {
            yPercent: 0,
            opacity: 1,
            clipPath: 'inset(0% 0% 0% 0%)',
            duration: 1.1,
            ease: 'expo.out',
          },
          0.38,
        )
        .fromTo(
          q('[data-vasstype]'),
          { yPercent: 10, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.95 },
          0.56,
        )
        .fromTo(
          q('[data-jacket-scroll]'),
          { scale: 1.07, yPercent: 3, opacity: 0 },
          { scale: 1, yPercent: 0, opacity: 1, duration: 1.15, ease: 'expo.out' },
          0.66,
        )
        .fromTo(q('[data-panel]'), { opacity: 0 }, { opacity: 1, duration: 0.8 }, 1.0)
        .fromTo(
          q('[data-panel-item]'),
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.08 },
          1.1,
        )
        .fromTo(q('[data-price]'), { x: 26, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7 }, 1.55)
        .fromTo(q('[data-cue]'), { opacity: 0 }, { opacity: 1, duration: 0.6 }, 1.7)

      /* Hold the curtain until the garment and the type are actually ready.
         Starting earlier lets the browser's decode work stretch the sequence
         (GSAP's lag smoothing) and risks the jacket popping in mid-reveal. */
      const hero = new Image()
      hero.src = JACKET.views.front.src
      let started = false
      const start = () => {
        if (started) return
        started = true
        intro.play()
      }
      Promise.all([
        document.fonts ? document.fonts.ready : Promise.resolve(),
        hero.decode ? hero.decode().catch(() => {}) : Promise.resolve(),
      ]).then(start)
      // webfonts come over the network; never hold the opening on them for long
      const failsafe = window.setTimeout(start, 1200)
      introStartRef.current = () => window.clearTimeout(failsafe)

      /* The rest of the sequence needs its images in memory before the user
         reaches them, or the turn stalls on a decode halfway round. */
      const warm = () => {
        ;[JACKET.views.side, JACKET.views.back]
          .map((v) => v.src)
          .concat(Object.values(JACKET.details))
          .forEach((src) => {
            const i = new Image()
            i.decoding = 'async'
            i.src = src
          })
      }

      /* ---------- scroll becomes the camera ---------- */
      function buildCamera() {
        warm()
        const mm = gsap.matchMedia()
        mediaRef.current = mm

        mm.add(
          { isDesktop: '(min-width: 768px)', isMobile: '(max-width: 767px)' },
          (context) => {
            const { isDesktop } = context.conditions

            const rig = q('[data-jacket-rig]')[0]
            const viewEls = {
              front: q('[data-view="front"]')[0],
              side: q('[data-view="side"]')[0],
              back: q('[data-view="back"]')[0],
            }

            /* The camera is two numbers: where it stands on the arc, and how
               close it is. Everything visible derives from them, so any scroll
               position — forward, backward, stopped anywhere — resolves to one
               well-defined frame. */
            const cam = { theta: 0, dolly: 1 }
            const vw = () => window.innerWidth / 100

            const applyCamera = () => {
              const f = cameraFrame(cam.theta, cam.dolly)
              // distance, arc and swing in one transform: the rig is the camera
              rig.style.transform =
                `translate3d(${(f.driftX * vw() * (isDesktop ? 1 : 0.45)).toFixed(2)}px,0,0)` +
                ` scale(${f.dolly.toFixed(4)})` +
                ` rotateY(${f.rotY.toFixed(2)}deg)`
              for (const name of ['front', 'side', 'back']) {
                const el = viewEls[name]
                el.style.transform = `scaleX(${f.scaleFor(VIEWS[name]).toFixed(4)})`
                el.style.opacity = f.op[name].toFixed(3)
              }
              // the garment's footprint narrows with it
              stage.style.setProperty('--shadow-squash', (f.w / VIEWS.front.widthRatio).toFixed(3))
              stage.style.setProperty('--sweep', f.sweep.toFixed(3))
            }
            applyCamera()

            const tl = gsap.timeline({
              defaults: { ease: 'none' },
              scrollTrigger: {
                trigger: cinema,
                start: 'top top',
                end: 'bottom bottom',
                // weight behind the scroll: the camera is heavy, but it is
                // still the user's hand on it
                scrub: 0.9,
              },
              onUpdate: applyCamera,
            })

            /* ---- the shot list ----------------------------------------- */

            // the scene opens exactly as it was composed, whatever came before
            tl.fromTo(cam, { theta: 0, dolly: 1 }, { duration: 0.001 }, 0)
            tl.fromTo(q('[data-cue]'), { opacity: 1 }, { opacity: 0, duration: 0.04 }, 0)

            /* STAGE 1 — approach. The composition clears out of the camera's way. */
            tl.fromTo(
              q('[data-panel="side"]'),
              { xPercent: 0, opacity: 1 },
              { xPercent: -122, opacity: 0, duration: 0.15, ease: 'power2.in' },
              0,
            )
            tl.fromTo(
              q('[data-panel="sheet"]'),
              { yPercent: 0, opacity: 1 },
              { yPercent: 100, opacity: 0, duration: 0.15, ease: 'power2.in' },
              0,
            )
            tl.fromTo(
              q('[data-panel-item]'),
              { y: 0, opacity: 1 },
              { y: -20, opacity: 0, duration: 0.1, stagger: 0.015 },
              0,
            )
            tl.fromTo(q('[data-price]'), { x: 0, opacity: 1 }, { x: 72, opacity: 0, duration: 0.11 }, 0)
            tl.fromTo(q('[data-topbar]'), { y: 0, opacity: 1 }, { y: -56, opacity: 0, duration: 0.12 }, 0.015)

            // the garment is framed right of centre; the camera draws it to the
            // middle of the frame as the panel leaves
            tl.fromTo(
              q('[data-jacket-scroll]'),
              { x: 0, y: 0, yPercent: 0, opacity: 1, scale: 1 },
              {
                x: isDesktop ? '-11vw' : '0vw',
                // on a phone the garment is held high to clear the sheet; once
                // the sheet has gone it settles into the middle of the frame
                y: isDesktop ? 0 : '12vh',
                duration: 0.2,
                ease: 'power2.inOut',
              },
              0,
            )
            tl.to(cam, { dolly: 1.3, duration: 0.15, ease: 'power1.inOut' }, 0)

            /* STAGE 2 — close on the front. Short: enough to read the zip and
               the collar before the turn begins. */
            tl.to(cam, { dolly: 1.72, duration: 0.12, ease: 'power2.inOut' }, 0.15)
            tl.to(stage, { '--warm': 0.5, '--vig': 0.34, duration: 0.27 }, 0)

            /* the zip passes close enough to notice, and keeps going */
            insert(tl, q('[data-insert="zip"]')[0], 0.235, { from: 1, drift: -1, tilt: -4 }, isDesktop)

            /* STAGE 3-5 — the arc. One continuous move from front to back;
               the dolly eases out slightly so the garment stays in frame while
               it is widest through the three-quarters. */
            tl.to(cam, { theta: 26, duration: 0.1, ease: 'power1.in' }, 0.26)
            tl.to(cam, { dolly: 1.54, duration: 0.14, ease: 'power1.inOut' }, 0.27)
            tl.to(cam, { theta: 90, duration: 0.19, ease: 'none' }, 0.36)
            // the side is a held beat, not a flash: the camera keeps creeping
            tl.to(cam, { theta: 104, duration: 0.09, ease: 'none' }, 0.55)
            tl.to(cam, { dolly: 1.62, duration: 0.12, ease: 'power1.inOut' }, 0.52)

            insert(tl, q('[data-insert="pocket"]')[0], 0.555, { from: -1, drift: 1, tilt: 3 }, isDesktop)

            tl.to(cam, { theta: 152, duration: 0.14, ease: 'none' }, 0.64)
            tl.to(cam, { theta: 180, duration: 0.1, ease: 'power2.out' }, 0.78)

            /* STAGE 6 — the back, earned. Largest the garment gets. */
            tl.to(cam, { dolly: 2.02, duration: 0.14, ease: 'power2.out' }, 0.76)
            tl.to(stage, { '--warm': 1, '--vig': 0.6, duration: 0.2 }, 0.62)

            insert(tl, q('[data-insert="collar"]')[0], 0.845, { from: 1, drift: -1, tilt: -3 }, isDesktop)

            /* the field slides the other way, the way a background does when
               you walk round a thing standing in it */
            tl.fromTo(
              q('[data-spring]'),
              { scale: 1, yPercent: 0, x: 0, opacity: 1 },
              { scale: 1.42, yPercent: -22, x: isDesktop ? '7.5vw' : '4vw', duration: 0.74, ease: 'power1.inOut' },
              0,
            )
            tl.fromTo(
              q('[data-vasstype]'),
              { scale: 1, yPercent: 0, x: 0, opacity: 1 },
              { scale: 1.78, yPercent: 16, x: isDesktop ? '-9vw' : '-5vw', duration: 0.74, ease: 'power1.inOut' },
              0,
            )
            tl.to(q('[data-spring]'), { opacity: 0.4, duration: 0.3 }, 0.34)
            tl.to(q('[data-vasstype]'), { opacity: 0.26, duration: 0.3 }, 0.34)

            /* STAGE 7 — the camera leaves. The garment recedes rather than
               cutting, and the next environment is already arriving. */
            tl.to(cam, { dolly: 1.3, duration: 0.1, ease: 'power2.in' }, 0.86)
            tl.to(
              q('[data-jacket-scroll]'),
              { yPercent: -9, opacity: 0, duration: 0.1, ease: 'power2.in' },
              0.86,
            )
            tl.to(q('[data-spring]'), { scale: 1.9, opacity: 0, duration: 0.12 }, 0.88)
            tl.to(q('[data-vasstype]'), { scale: 2.2, opacity: 0, duration: 0.12 }, 0.88)
            tl.to(stage, { '--vig': 1, '--warm': 0.2, '--blackout': 1, duration: 0.13 }, 0.87)
            tl.fromTo(
              q('[data-finale]'),
              { opacity: 0, y: 26 },
              { opacity: 1, y: 0, duration: 0.07 },
              0.94,
            )
          },
        )
      }

      /**
       * An insert that the camera passes through. It is already moving when it
       * arrives and still moving when it leaves — it never parks in the middle
       * of the frame waiting to be looked at.
       */
      function insert(tl, el, at, { from, drift, tilt }, isDesktop) {
        if (!el) return
        const span = isDesktop ? 34 : 26
        const enter = from * span
        const exit = drift * span
        tl.fromTo(
          el,
          {
            opacity: 0,
            xPercent: -50,
            yPercent: -50,
            x: `${enter}vw`,
            scale: 1.34,
            rotation: tilt,
          },
          {
            opacity: 1,
            x: `${enter * 0.26}vw`,
            scale: 1.1,
            duration: 0.045,
            ease: 'power2.out',
          },
          at,
        )
        tl.to(
          el,
          { x: `${exit}vw`, scale: 0.96, opacity: 0, duration: 0.05, ease: 'power2.in' },
          at + 0.045,
        )
      }
    }, stageRef)

    return () => {
      introStartRef.current?.()
      introStartRef.current = null
      mediaRef.current?.revert()
      mediaRef.current = null
      ctx.revert()
      document.body.classList.remove('is-loading')
    }
  }, [reduced])

  return (
    <div ref={cinemaRef} style={{ height: reduced ? '100svh' : '760svh' }}>
      <div
        ref={stageRef}
        className="sticky top-0 h-[100svh] w-full overflow-hidden bg-abyss"
        style={{ '--lx': 0.5, '--ly': 0.45, '--dx': 0, '--dy': 0, '--near': 0 }}
      >
        <Atmosphere />
        <TypeLayer />
        <Jacket />
        <DetailInserts />
        <InfoPanel />
        <TopBar />
        <PriceTag />

        {/* last frame of the sequence, handing off to the section below */}
        <div
          data-finale
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 opacity-0"
        >
          <span className="font-display text-3xl font-medium tracking-[0.3em] text-bone md:text-4xl">
            VASS
          </span>
          <span className="h-px w-16 bg-gradient-to-r from-transparent via-bone/45 to-transparent" />
        </div>

        <div
          data-cue
          className="pointer-events-none absolute bottom-6 left-1/2 z-20 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex"
        >
          <span className="text-[8.5px] uppercase tracking-ultra text-bone/35">Scroll</span>
          <span className="h-9 w-px bg-gradient-to-b from-bone/35 to-transparent" />
        </div>
      </div>
    </div>
  )
}
