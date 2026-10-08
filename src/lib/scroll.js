/**
 * Motion tied to the scroll, for the one page that scrolls (the story).
 *
 * Nothing here runs while the page is still: a reveal is an
 * IntersectionObserver that fires once, and a scrub works only on the
 * frames after the page has moved — easing toward where the scroll has put
 * it, then stopping. (A scroll library did this before, and kept a frame
 * loop and a timer running every moment the page was open, read or not.)
 *
 *   reveal(el, at, fn)   fn once, when el's top reaches `at` of the way down
 *                        the screen (0.76: three quarters down) — at once if
 *                        the page opens already past it
 *   scrub(el, { progress, draw, smooth })
 *                        draw(value) as the page moves; progress(rect) says
 *                        where el is (its bounding rect → a value), smooth
 *                        is how many seconds the value takes to catch up
 * Each returns the way to stop it.
 */
export function reveal(el, at, fn) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting && e.boundingClientRect.bottom > 0) continue
        io.disconnect()
        fn()
        return
      }
    },
    { rootMargin: `0px 0px ${(-(1 - at) * 100).toFixed(2)}% 0px` },
  )
  io.observe(el)
  return () => io.disconnect()
}

const scrubs = new Set()
let raf = 0
let last = 0

function frame(now) {
  raf = 0
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60
  last = now
  let moving = false
  for (const s of scrubs) {
    if (!s.near) continue
    const target = s.progress(s.el.getBoundingClientRect())
    s.value = s.smooth && s.value != null ? s.value + (target - s.value) * (1 - Math.exp(-dt / (s.smooth / 3))) : target
    if (Math.abs(target - s.value) > 0.0004) moving = true
    else s.value = target
    s.draw(s.value)
  }
  if (moving) raf = requestAnimationFrame(frame)
  else last = 0
}

const kick = () => { if (!raf) raf = requestAnimationFrame(frame) }

export function scrub(el, { progress, draw, smooth = 0 }) {
  const s = { el, progress, draw, smooth, value: null, near: false }
  // only what is on screen, or about to be, is worked out at all
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) s.near = e.isIntersecting
    if (s.near) kick()
  }, { rootMargin: '25% 0px' })
  io.observe(el)
  if (!scrubs.size) {
    window.addEventListener('scroll', kick, { passive: true })
    window.addEventListener('resize', kick, { passive: true })
  }
  scrubs.add(s)
  return () => {
    io.disconnect()
    scrubs.delete(s)
    if (!scrubs.size) {
      window.removeEventListener('scroll', kick)
      window.removeEventListener('resize', kick)
      cancelAnimationFrame(raf)
      raf = 0
      last = 0
    }
  }
}
