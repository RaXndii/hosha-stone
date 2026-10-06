import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'

/**
 * A value that rolls rather than swaps: when it changes, the old value slides
 * out of a mask and the new one follows it in from the other side. Both share
 * one grid cell, so nothing jumps while they cross.
 *
 * dir  1 rolls upward (next), -1 downward (previous)
 */
export default function Roll({ value, dir = 1, className = '', duration = 0.75, delay = 0 }) {
  const [items, setItems] = useState(() => [{ key: 0, v: value, dir }])
  const last = useRef(value)
  const seq = useRef(0)
  const wrapRef = useRef(null)

  useLayoutEffect(() => {
    if (value === last.current) return
    last.current = value
    seq.current += 1
    const key = seq.current
    setItems((cur) => [...cur.slice(-1), { key, v: value, dir }])
  }, [value, dir])

  useLayoutEffect(() => {
    if (items.length < 2) return
    const [outEl, inEl] = wrapRef.current.children
    const d = items[1].dir >= 0 ? 1 : -1
    const tl = gsap.timeline({ onComplete: () => setItems((cur) => cur.slice(-1)) })
    tl.fromTo(
      outEl,
      { yPercent: 0, opacity: 1 },
      { yPercent: -105 * d, opacity: 0, duration, delay, ease: 'power3.inOut' },
      0,
    )
    tl.fromTo(
      inEl,
      { yPercent: 105 * d, opacity: 0 },
      { yPercent: 0, opacity: 1, duration, delay: delay + 0.06, ease: 'power3.inOut' },
      0,
    )
    return () => tl.kill()
  }, [items, duration, delay])

  return (
    <span ref={wrapRef} className={`inline-grid overflow-hidden align-bottom ${className}`}>
      {items.map((it) => (
        <span key={it.key} className="col-start-1 row-start-1 block whitespace-nowrap">
          {it.v}
        </span>
      ))}
    </span>
  )
}
