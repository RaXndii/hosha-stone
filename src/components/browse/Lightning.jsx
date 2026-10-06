import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/**
 * A distant purple strike, now and then.
 *
 * The room sits almost dark. Every so often a faint glow gathers high up, a
 * thin bolt travels down to the floor, the light spreads softly where it lands
 * and catches the edge of the pieces nearest it — then everything settles back
 * to obsidian and waits. Timing and position change every time, so it never
 * reads as a loop.
 *
 * Nothing runs between strikes: one timeline per strike, transform and opacity
 * only, and the pieces' rim light is an overlay masked by the garment's own
 * cut-out, so only the cloth catches it.
 */
const rand = (a, b) => a + Math.random() * (b - a)

function boltPaths(x, top, bottom, w) {
  const n = 24
  const pts = []
  let cx = x
  for (let i = 0; i <= n; i++) {
    const y = top + ((bottom - top) * i) / n
    cx += rand(-1, 1) * w * 0.018
    cx += (x - cx) * 0.12
    pts.push([cx, y])
  }
  const main = 'M' + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L')
  const branches = [0, 1].map(() => {
    const i = Math.floor(rand(5, 15))
    const side = Math.random() < 0.5 ? -1 : 1
    let [bx, by] = pts[i]
    const seg = [`M${bx.toFixed(1)} ${by.toFixed(1)}`]
    const len = Math.floor(rand(3, 6))
    for (let k = 0; k < len; k++) {
      bx += side * rand(0.006, 0.016) * w
      by += rand(0.025, 0.045) * (bottom - top)
      seg.push(`L${bx.toFixed(1)} ${by.toFixed(1)}`)
    }
    return seg.join(' ')
  })
  return { main, branches }
}

export default function Lightning({ rootRef }) {
  const svgRef = useRef(null)
  const skyRef = useRef(null)
  const impactRef = useRef(null)
  const washRef = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const svg = svgRef.current
    const paths = [...svg.querySelectorAll('path')]
    const mainPaths = paths.filter((p) => p.dataset.bolt === 'main')
    const branchPaths = paths.filter((p) => p.dataset.bolt === 'branch')
    const phone = window.matchMedia('(max-width: 767px)').matches
    let timer = 0
    let tl = null

    const strike = () => {
      if (document.hidden) { timer = window.setTimeout(strike, 4000); return }
      const w = window.innerWidth
      const h = window.innerHeight
      const x = rand(0.12, 0.88) * w
      const ground = h * rand(0.82, 0.92)
      svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
      const { main, branches } = boltPaths(x, -10, ground, w)
      mainPaths.forEach((p) => p.setAttribute('d', main))
      branchPaths.forEach((p, i) => p.setAttribute('d', branches[i % 2]))

      gsap.set(skyRef.current, { x: x - w * 0.5 })
      gsap.set(impactRef.current, { x: x - w * 0.5, y: ground - h * 0.88 })
      gsap.set(washRef.current, { x: x - w * 0.5 })

      // the pieces nearest the strike catch it on the side that faces it
      const rims = []
      rootRef.current?.querySelectorAll('[data-card]').forEach((card) => {
        const r = card.getBoundingClientRect()
        if (r.bottom < 0 || r.top > h) return
        const cx = r.left + r.width / 2
        const k = Math.max(0, 1 - Math.abs(cx - x) / (w * 0.45))
        if (k <= 0.02) return
        const rim = card.querySelector(cx > x ? '[data-rim="l"]' : '[data-rim="r"]')
        if (rim) rims.push({ rim, k })
      })

      const twice = Math.random() < 0.3
      tl = gsap.timeline({
        onComplete: () => { timer = window.setTimeout(strike, rand(7, 16) * 1000 * (phone ? 1.4 : 1)) },
      })
      // 1–2: the air high up begins to glow
      tl.fromTo(skyRef.current, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power2.in' }, 0)
      // 3: the bolt travels down
      tl.fromTo(svg, { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.62)
      tl.fromTo(mainPaths, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.24, ease: 'power2.in' }, 0.62)
      tl.fromTo(branchPaths, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.18, ease: 'power1.in' }, 0.72)
      // 4–5: it lands, and the light spreads across the floor and the pieces
      tl.fromTo(impactRef.current, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' }, 0.84)
      tl.fromTo(washRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' }, 0.84)
      rims.forEach(({ rim, k }) => tl.fromTo(rim, { opacity: 0 }, { opacity: 0.6 * k, duration: 0.22, ease: 'power2.out' }, 0.86))
      // the bolt flickers out — sometimes it strikes twice
      tl.to(svg, { keyframes: twice ? [{ opacity: 0.25, duration: 0.07 }, { opacity: 1, duration: 0.05 }, { opacity: 0.15, duration: 0.12 }, { opacity: 0.85, duration: 0.05 }, { opacity: 0, duration: 0.35 }] : [{ opacity: 0.3, duration: 0.08 }, { opacity: 0.9, duration: 0.06 }, { opacity: 0, duration: 0.4 }] }, 0.9)
      // 6: everything settles back to obsidian
      tl.to(skyRef.current, { opacity: 0, duration: 1.6, ease: 'power2.out' }, 1.1)
      tl.to(impactRef.current, { opacity: 0, scale: 1.25, duration: 1.8, ease: 'power2.out' }, 1.2)
      tl.to(washRef.current, { opacity: 0, duration: 2, ease: 'power2.out' }, 1.15)
      rims.forEach(({ rim }) => tl.to(rim, { opacity: 0, duration: 1.6, ease: 'power2.out' }, 1.3))
    }

    timer = window.setTimeout(strike, 2200)
    return () => {
      window.clearTimeout(timer)
      tl?.kill()
    }
  }, [rootRef])

  return (
    <>
      {/* behind everything: the sky glow, the bolt and its landing */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          ref={skyRef}
          className="absolute left-0 top-[-20%] h-[70%] w-full will-change-transform"
          style={{ opacity: 0, background: 'radial-gradient(14% 60% at 50% 30%, rgb(var(--sr-neon) / 0.28), rgb(var(--sr-neon) / 0.06) 55%, transparent 80%)' }}
        />
        <svg ref={svgRef} className="absolute inset-0 h-full w-full" preserveAspectRatio="none" style={{ opacity: 0 }}>
          <path data-bolt="main" pathLength="1" fill="none" strokeDasharray="1" strokeDashoffset="1" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'rgb(var(--sr-neon) / 0.08)', strokeWidth: 16 }} />
          <path data-bolt="main" pathLength="1" fill="none" strokeDasharray="1" strokeDashoffset="1" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'rgb(var(--sr-neon) / 0.32)', strokeWidth: 5 }} />
          <path data-bolt="main" pathLength="1" fill="none" strokeDasharray="1" strokeDashoffset="1" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'rgb(236 226 255 / 0.9)', strokeWidth: 1.3 }} />
          <path data-bolt="branch" pathLength="1" fill="none" strokeDasharray="1" strokeDashoffset="1" strokeLinecap="round" style={{ stroke: 'rgb(var(--sr-neon) / 0.45)', strokeWidth: 1 }} />
          <path data-bolt="branch" pathLength="1" fill="none" strokeDasharray="1" strokeDashoffset="1" strokeLinecap="round" style={{ stroke: 'rgb(var(--sr-neon) / 0.35)', strokeWidth: 0.8 }} />
        </svg>
        <div
          ref={impactRef}
          className="absolute left-0 top-[78%] h-[20%] w-full will-change-transform"
          style={{ opacity: 0, background: 'radial-gradient(18% 50% at 50% 50%, rgb(var(--sr-neon) / 0.35), rgb(var(--sr-neon) / 0.08) 50%, transparent 75%)' }}
        />
      </div>
      {/* over the page: the light the strike throws across nearby surfaces */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
        <div
          ref={washRef}
          className="absolute inset-y-0 left-0 w-full will-change-transform"
          style={{ opacity: 0, background: 'radial-gradient(34% 80% at 50% 70%, rgb(var(--sr-neon) / 0.09), transparent 70%)' }}
        />
      </div>
    </>
  )
}
