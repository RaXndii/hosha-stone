import { useSyncExternalStore } from 'react'
import { SOUNDS, makeKit, makeScore, mtof } from './recipes.js'

/**
 * The house's sound: the music, and a sound for every touch.
 *
 * Browsers only let a page make sound once the visitor has touched it, so
 * nothing plays until then; the first tap anywhere starts it, and the music
 * fades in over several seconds rather than arriving. It stops while the tab
 * is out of sight, and on a phone it plays alongside the visitor's own music
 * instead of stopping it, and stays quiet when the phone is on silent.
 *
 * It is on unless the visitor turns it off (the bars in the header); the
 * choice is remembered on this device.
 *
 * Every button and link taps (the listener at the bottom). A control whose
 * action has a sound of its own says so with data-sound="none" and plays that
 * sound itself; data-sound="<name>" asks for a particular one.
 *
 *   sound.play('bead', { index: 2, count: 5 })
 *   sound.scene('archive')         the music for a page
 *   sound.room(theme, i)           the showroom's piece: key and light
 *   sound.duck(true)               the house lights are going down
 *   sound.hush(true)               a film is playing: the music steps aside
 */
const KEY = 'hs-sound'
const MUSIC = 0.42 // the score's level: under the touches, never over them
const TOUCH = 0.9

let ctx = null
let master = null
let musicBus = null
let touchBus = null
let duckGain = null
let kit = null
let score = null
let timer = 0

let wanted = { scene: null, transpose: 0, brightness: 1 }
let ducked = false
let hushed = false
let enabled = readPref()
const listeners = new Set()

function readPref() {
  try { return window.localStorage.getItem(KEY) !== 'off' } catch { return true }
}
function writePref(on) {
  try { window.localStorage.setItem(KEY, on ? 'on' : 'off') } catch { /* private mode: for this visit only */ }
}
const emit = () => listeners.forEach((fn) => fn())

/* ------------------------------------------------------------------ the graph */

function build() {
  // a phone's own music keeps playing, and the silent switch is respected
  try { if (navigator.audioSession) navigator.audioSession.type = 'ambient' } catch { /* not offered */ }
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return false
  ctx = new AC({ latencyHint: 'interactive' })
  // the switch shows sound moving only while it really is
  ctx.onstatechange = emit
  kit = makeKit(ctx)

  // everything meets in a gentle compressor, so thunder over music over a
  // chime never clips
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -16
  comp.knee.value = 12
  comp.ratio.value = 3
  comp.attack.value = 0.004
  comp.release.value = 0.25
  master = ctx.createGain()
  master.gain.value = 0
  // nothing below 28 Hz: no speaker plays it, and it would only spend headroom
  const floor = ctx.createBiquadFilter()
  floor.type = 'highpass'
  floor.frequency.value = 28
  comp.connect(floor).connect(master).connect(ctx.destination)

  const wet = ctx.createGain()
  wet.gain.value = 0.42
  kit.verb.connect(wet).connect(comp)

  musicBus = ctx.createGain()
  musicBus.gain.value = MUSIC
  duckGain = ctx.createGain()
  musicBus.connect(duckGain).connect(comp)
  touchBus = ctx.createGain()
  touchBus.gain.value = TOUCH
  touchBus.connect(comp)
  return true
}

function startMusic() {
  if (!ctx || !wanted.scene) return
  if (score?.scene === wanted.scene) return
  const at = ctx.currentTime
  score?.stop(at)
  score = makeScore(ctx, musicBus, kit, wanted.scene, wanted)
  score.scene = wanted.scene
  score.fade(1, 7, at)
  score.schedule(at + 2.5)
}

function run() {
  window.clearInterval(timer)
  timer = window.setInterval(() => {
    if (ctx?.state === 'running' && score) score.schedule(ctx.currentTime + 2.5)
  }, 400)
}

function rise() {
  if (!ctx) return
  master.gain.cancelScheduledValues(ctx.currentTime)
  master.gain.setTargetAtTime(1, ctx.currentTime, 0.4)
}

/** The first touch: make the sound, or wake it again after the phone paused it. */
function unlock() {
  if (!enabled) return
  if (!ctx && !build()) return
  if (ctx.state !== 'running') ctx.resume().catch(() => {})
  rise()
  startMusic()
  run()
}

/* ------------------------------------------------------------------ harmony */

const DEFAULT_CHORD = [38, 57, 60, 65, 76]
const chord = () => score?.chord ?? DEFAULT_CHORD.map((m) => m + wanted.transpose)
const upper = () => chord().slice(1)
const pickOf = (list) => list[Math.floor(Math.random() * list.length)]

/** Each sound gets the notes it needs from whatever the music is playing now. */
function tune(name, o) {
  const notes = upper()
  switch (name) {
    case 'tap':
    case 'soft': {
      let m = pickOf(notes)
      while (mtof(m) < 1000) m += 12
      return { freq: mtof(m), ...o }
    }
    case 'bead': {
      // the sizes are a scale: the chord's notes, lowest to highest, for as many sizes as there are
      const scale = [...notes].sort((a, b) => a - b)
      const count = Math.max(1, o.count ?? scale.length)
      const out = []
      for (let oct = 0; out.length < count; oct += 12) scale.forEach((m) => out.length < count && out.push(m + oct))
      let m = out[Math.min(out.length - 1, o.index ?? 0)]
      while (mtof(m) < 520) m += 12
      return { freq: mtof(m), ...o }
    }
    case 'deny':
      return { freq: mtof(chord()[0] + 36), ...o }
    case 'order':
      return { freq: mtof(chord()[0] + 36), ...o }
    case 'sent':
    case 'portal':
    case 'bloom':
      return { chord: notes.map((m) => m + 12), ...o }
    case 'heartOn':
    case 'heartOff':
      return { root: 77 + wanted.transpose, ...o }
    default:
      return o
  }
}

/** The music's level under whatever is lowering it: a film silences it, a change of piece dips it. */
function level(time) {
  if (!ctx) return
  const g = duckGain.gain
  g.cancelScheduledValues(ctx.currentTime)
  g.setTargetAtTime(hushed ? 0 : ducked ? 0.35 : 1, ctx.currentTime, time)
}

/* ------------------------------------------------------------------ the voice */

export const sound = {
  get on() { return enabled },
  get playing() { return enabled && ctx?.state === 'running' },

  play(name, opts = {}) {
    if (!enabled || !ctx || !SOUNDS[name]) return
    try {
      SOUNDS[name](ctx, touchBus, ctx.currentTime + 0.005, tune(name, opts), kit)
    } catch { /* a sound that cannot be made is not worth an error */ }
  },

  /** Which page's music. It changes over a few seconds, never at once. */
  scene(name) {
    wanted = { ...wanted, scene: name }
    if (enabled && ctx) startMusic()
  },

  /** The showroom's piece: each room has its key and its light. */
  room(theme, index = 0) {
    const shifts = [0, 3, -2, 5, -4, 2, -5, 1]
    const neon = theme?.neon ?? [150, 96, 255]
    const lum = (0.2126 * neon[0] + 0.7152 * neon[1] + 0.0722 * neon[2]) / 255
    const next = { transpose: shifts[index % shifts.length], brightness: 0.78 + lum * 0.7 }
    const changed = next.transpose !== wanted.transpose || Math.abs(next.brightness - wanted.brightness) > 0.01
    wanted = { ...wanted, ...next }
    if (changed && ctx && score?.scene === 'room') score.retune(next.transpose, next.brightness, ctx.currentTime + 0.05)
  },

  /** The house lights go down between two pieces; the music goes down with them. */
  duck(down) {
    ducked = down
    level(down ? 0.18 : 0.5)
  },

  /** A film is playing: the music steps out of its way, and comes back after. */
  hush(on) {
    hushed = on
    level(on ? 0.25 : 0.9)
  },

  set(on) {
    enabled = on
    writePref(on)
    emit()
    if (on) {
      unlock()
      // a moment after waking, so the chord is heard rather than lost in the start
      window.setTimeout(() => sound.play('bloom'), 80)
    } else if (ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.12)
      window.clearInterval(timer)
      window.setTimeout(() => { if (!enabled) ctx.suspend().catch(() => {}) }, 700)
    }
  },

  toggle() { sound.set(!enabled) },

  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}

/** The sound switch's state, for React: whether it is on, and whether sound is moving yet. */
export function useSound() {
  const on = useSyncExternalStore(sound.subscribe, () => enabled, () => true)
  const playing = useSyncExternalStore(sound.subscribe, () => sound.playing, () => false)
  return { on, playing, toggle: sound.toggle }
}

/* ------------------------------------------------------------------ the listeners */

let installed = false

/**
 * Once, at start-up: wake on the first touch, sleep when the tab is hidden,
 * and give every button and link a tap.
 */
export function installSound() {
  if (installed || typeof window === 'undefined') return
  installed = true

  // a phone may want a different event before it allows sound; any of these will do
  const wake = () => unlock()
  for (const type of ['pointerdown', 'touchend', 'keydown', 'click']) window.addEventListener(type, wake, { capture: true, passive: true })

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return
    if (document.hidden) {
      window.clearInterval(timer)
      ctx.suspend().catch(() => {})
    } else if (enabled) {
      ctx.resume().catch(() => {})
      run()
    }
  })

  document.addEventListener(
    'click',
    (e) => {
      const el = e.target.closest?.('button, a[href], [role="button"], summary, select')
      if (!el || el.disabled) return
      const kind = el.closest('[data-sound]')?.getAttribute('data-sound') ?? 'tap'
      if (kind !== 'none') sound.play(kind)
    },
    true,
  )
}
