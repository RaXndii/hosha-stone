import { useSyncExternalStore } from 'react'
import { SOUNDS, makeKit, makeRoom, makeScore, mtof } from './recipes.js'

/**
 * The house's sound: the music, and a sound for every touch.
 *
 * Browsers only let a page make sound once the visitor has touched it, so
 * nothing plays until then; the first tap anywhere starts it, and the music
 * fades in over several seconds rather than arriving. It stops while the tab
 * is out of sight. On a phone the music plays the way a film does — through
 * the silent switch, which most iPhones are left on (see claim()) — and is
 * voiced for a phone's small speaker, which cannot play the low notes the
 * music stands on.
 *
 * Two switches, each remembered on this device: the music (the bars in the
 * header), which can go quiet while every touch keeps its sound; and all
 * sound (the speaker beside them), which silences everything.
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
const MUSIC_KEY = 'hs-music'
const MUSIC = 0.32 // the score's level: well under the touches, a room's air rather than a song
const PHONE_LIFT = 1.6 // on a phone's speaker (measured: see the README's "Sound")
// sounds that belong to the room rather than to a touch: they go with the music
const AMBIENT = new Set(['thunder'])
const TOUCH = 0.9

const IOS = typeof navigator !== 'undefined' && (/iP(hone|od|ad)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
// a phone or a tablet: a speaker a few millimetres across, held at arm's length
const SMALL = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse) and (hover: none)').matches

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
let enabled = readPref(KEY)
let musicOn = readPref(MUSIC_KEY)
const listeners = new Set()

function readPref(key) {
  try { return window.localStorage.getItem(key) !== 'off' } catch { return true }
}
function writePref(key, on) {
  try { window.localStorage.setItem(key, on ? 'on' : 'off') } catch { /* private mode: for this visit only */ }
}
const emit = () => listeners.forEach((fn) => fn())

/* ------------------------------------------------------------------ the graph */

/**
 * How the phone treats the site's sound. An iPhone files a page's sound as
 * "ambient" unless told otherwise, and ambient sound is silenced outright by
 * the ring/silent switch — which is where most iPhones live, so the house was
 * silent on them. While the music is on, the sound is filed as playback and
 * plays as a film does: through the switch, at the volume the buttons set
 * (and, like a film, pausing whatever the visitor was listening to). With the
 * music off, the touches alone are ambient again — they play over the
 * visitor's own music and keep to the switch, as the phone's own keyboard
 * clicks do. With all sound off the claim is let go.
 */
function claim() {
  const want = !enabled ? 'auto' : musicOn ? 'playback' : 'ambient'
  try {
    if (navigator.audioSession) {
      if (navigator.audioSession.type !== want) navigator.audioSession.type = want
      return
    }
  } catch { /* not offered */ }
  if (IOS) carrier(want === 'playback')
}

/**
 * Older iPhones (before iOS 17) have no audioSession to ask, but a media
 * element playing makes the whole page's sound playback, the context's
 * included. So one plays: a second of silence on a loop, started inside the
 * visitor's touch (the only place a phone allows it), paused with the sound.
 */
let tag = null
function carrier(on) {
  if (!on) { tag?.pause(); return }
  if (!tag) {
    tag = document.createElement('audio')
    tag.setAttribute('x-webkit-airplay', 'deny')
    tag.disableRemotePlayback = true
    tag.preload = 'auto'
    tag.loop = true
    tag.src = URL.createObjectURL(silence())
  }
  if (tag.paused) tag.play().catch(() => {})
}

/** One second of silence as a WAV: 8 kHz, 8-bit, mono — about 8 KB, made here, never fetched. */
function silence() {
  const n = 8000
  const v = new DataView(new ArrayBuffer(44 + n))
  const text = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  text(0, 'RIFF'); v.setUint32(4, 36 + n, true); text(8, 'WAVE')
  text(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true)
  text(36, 'data'); v.setUint32(40, n, true)
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128)
  return new Blob([v.buffer], { type: 'audio/wav' })
}

/**
 * Run something costly once nothing is happening: no press for a few seconds
 * (time enough for whatever a press set moving to land) and the page idle.
 */
let lastPress = 0
function whenQuiet(fn) {
  const idle = window.requestIdleCallback ?? ((f) => window.setTimeout(f, 50))
  const attempt = () => idle(() => {
    const wait = 3000 - (performance.now() - lastPress)
    if (wait > 0) window.setTimeout(attempt, wait)
    else fn()
  }, { timeout: 2000 })
  window.setTimeout(attempt, 1000)
}

function build() {
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return false
  claim()
  ctx = new AC({ latencyHint: 'interactive' })
  // the switch shows sound moving only while it really is
  ctx.onstatechange = emit
  // the reverb's room is hung later, once the visitor's hands are still (makeKit)
  kit = makeKit(ctx, { room: false })
  whenQuiet(() => makeRoom(ctx, kit, SMALL ? 2.8 : 3.6))

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
  // a phone's speaker loses the music's whole low half, so what is left is raised to meet the touches
  musicBus.gain.value = SMALL ? MUSIC * PHONE_LIFT : MUSIC
  duckGain = ctx.createGain()
  musicBus.connect(duckGain).connect(comp)
  touchBus = ctx.createGain()
  touchBus.gain.value = TOUCH
  touchBus.connect(comp)
  return true
}

function startMusic(fadeIn = 7) {
  if (!ctx || !wanted.scene || !musicOn) return
  if (score?.scene === wanted.scene) return
  const at = ctx.currentTime
  score?.stop(at)
  score = makeScore(ctx, musicBus, kit, wanted.scene, { ...wanted, small: SMALL })
  score.scene = wanted.scene
  score.fade(1, fadeIn, at)
  score.schedule(at + 2.5)
}

function stopMusic() {
  if (!ctx || !score) return
  score.stop(ctx.currentTime)
  score = null
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

/**
 * The first touch: make the sound, or wake it again after the phone paused it
 * (a call, another app, the screen locked). It has to happen inside the touch
 * itself, so it is called from every kind of press; once the sound is running
 * with its music in place, a press costs nothing here.
 */
function unlock(force = false) {
  if (!enabled) return
  const settled = ctx?.state === 'running' && (score || !musicOn || !wanted.scene) && !(musicOn && tag?.paused)
  if (settled && !force) return
  if (!ctx && !build()) return
  claim()
  if (ctx.state !== 'running') ctx.resume().catch(() => {})
  // older WebKit only lets sound out once something has been started inside a touch
  try {
    const nudge = ctx.createBufferSource()
    nudge.buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
    nudge.connect(ctx.destination)
    nudge.start(0)
  } catch { /* nothing to nudge */ }
  rise()
  // the music's first chord is laid down just after the touch, not inside it,
  // so the touch is answered first; it fades in over seconds either way
  window.setTimeout(startMusic, 30)
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
  get music() { return musicOn },
  get playing() { return enabled && musicOn && !!score && ctx?.state === 'running' },

  play(name, opts = {}) {
    if (!enabled || !ctx || !SOUNDS[name]) return
    if (AMBIENT.has(name) && !musicOn) return
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

  /** The music alone: off, and every touch still sounds; on, and it comes back over a few seconds. */
  setMusic(on) {
    musicOn = on
    writePref(MUSIC_KEY, on)
    if (on && !enabled) { sound.set(true); return }
    if (ctx && enabled) {
      claim()
      if (on) {
        startMusic(3)
        window.setTimeout(() => sound.play('bloom'), 80)
      } else {
        stopMusic()
        sound.play('soft')
      }
    }
    emit()
  },

  toggleMusic() { sound.setMusic(!(enabled && musicOn)) },

  set(on) {
    enabled = on
    writePref(KEY, on)
    emit()
    if (on) {
      unlock(true)
      emit()
      // a moment after waking, so the chord is heard rather than lost in the start
      window.setTimeout(() => sound.play('bloom'), 80)
    } else if (ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime)
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.12)
      window.clearInterval(timer)
      window.setTimeout(() => {
        if (enabled) return
        ctx.suspend().catch(() => {})
        claim()
      }, 700)
    }
  },

  toggle() { sound.set(!enabled) },

  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}

/** The switches' state, for React: all sound, the music, and whether the music is moving yet. */
export function useSound() {
  const on = useSyncExternalStore(sound.subscribe, () => enabled, () => true)
  const music = useSyncExternalStore(sound.subscribe, () => musicOn, () => true)
  const playing = useSyncExternalStore(sound.subscribe, () => sound.playing, () => false)
  return { on, music, playing, toggle: sound.toggle, toggleMusic: sound.toggleMusic }
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

  // Browsers differ on which press counts as the visitor asking for sound: a
  // mouse's press counts at once, a finger's only once it lifts (touchend,
  // pointerup) — and a finger that scrolled the page does not count at all.
  // Listening to all of them, the first one that counts starts the sound.
  const wake = () => {
    lastPress = performance.now()
    unlock()
  }
  for (const type of ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click']) window.addEventListener(type, wake, { capture: true, passive: true })

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return
    if (document.hidden) {
      window.clearInterval(timer)
      ctx.suspend().catch(() => {})
      tag?.pause()
    } else if (enabled) {
      // a phone may refuse this until the next touch; the next touch then does it
      ctx.resume().catch(() => {})
      if (tag) claim()
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
