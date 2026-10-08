/**
 * The house's sounds, as recipes.
 *
 * Nothing here is a recording. Every sound is built the moment it is played,
 * from oscillators, noise and one shared reverb — so the site downloads no
 * audio at all, a phone pays nothing for it, and nothing is borrowed from
 * anyone. It also means the sounds can be in tune with each other: the engine
 * hands every recipe the notes of the chord the score is playing, so a tap, a
 * size, a chime all land inside the music rather than on top of it.
 *
 * Each recipe is a plain function of an audio context:
 *   recipe(ac, out, t, opts, kit) → seconds until it has finished sounding
 * which is what lets the same code run live in the browser and offline, in an
 * OfflineAudioContext, where every sound was rendered and measured as it was
 * balanced (the levels are in the README, under "Sound").
 */

export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const rand = (a, b) => a + Math.random() * (b - a)
const pick = (list) => list[Math.floor(Math.random() * list.length)]
const SILENT = 0.0001

/* ------------------------------------------------------------------ the kit */

/**
 * What every recipe draws on: two kinds of noise and the room itself — a
 * convolution reverb whose impulse is generated, a few seconds of decaying
 * noise that darkens as it fades, the way sound does in a stone room.
 */
export function makeKit(ac) {
  const sr = ac.sampleRate
  const len = Math.floor(sr * 3)

  const white = ac.createBuffer(1, len, sr)
  const w = white.getChannelData(0)
  for (let i = 0; i < len; i++) w[i] = Math.random() * 2 - 1

  // brown noise: white noise integrated, so its weight is in the low end —
  // the material for wind and thunder
  const brown = ac.createBuffer(1, len, sr)
  const b = brown.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02
    b[i] = last * 3.5
  }

  const verb = ac.createConvolver()
  verb.buffer = impulse(ac, 3.6, 2.4)
  return { white, brown, verb }
}

function impulse(ac, seconds, curve) {
  const sr = ac.sampleRate
  const len = Math.floor(sr * seconds)
  const pre = Math.floor(sr * 0.018) // the room answers a beat after the sound
  const buf = ac.createBuffer(2, len, sr)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    let lp = 0
    for (let i = pre; i < len; i++) {
      const x = (i - pre) / (len - pre)
      // a one-pole low-pass whose cutoff falls as the tail decays
      lp += (0.62 - 0.52 * x) * ((Math.random() * 2 - 1) - lp)
      // fades to exactly nothing, so the tail never ends in a click
      d[i] = lp * Math.pow(1 - x, curve)
    }
  }
  return buf
}

/* ------------------------------------------------------------------ parts */

function gainNode(ac, value = 1) {
  const g = ac.createGain()
  g.gain.value = value
  return g
}

/** A share of the signal sent into the room's reverb. */
function send(ac, from, kit, amount) {
  if (!kit?.verb || amount <= 0) return
  const s = gainNode(ac, amount)
  from.connect(s).connect(kit.verb)
}

function noiseSource(ac, buffer, t, dur) {
  const src = ac.createBufferSource()
  src.buffer = buffer
  src.loop = true
  const offset = Math.random() * (buffer.duration - 0.5)
  src.start(t, offset)
  src.stop(t + dur + 0.05)
  return src
}

/** A percussive envelope: up fast, then an exponential fall. */
function strike(param, t, peak, attack, decay) {
  param.setValueAtTime(0, t)
  param.linearRampToValueAtTime(peak, t + attack)
  param.exponentialRampToValueAtTime(SILENT, t + attack + decay)
  param.setValueAtTime(0, t + attack + decay + 0.01)
}

/**
 * A bell, by frequency modulation: one sine bending the pitch of another.
 * The modulation fades faster than the tone, so it starts bright and metallic
 * and settles into something close to pure — glass struck, then ringing.
 */
function bell(ac, dest, t, f, { dur = 1.2, ratio = 3.5, index = 2.5, gain = 0.3, attack = 0.003 } = {}) {
  const car = ac.createOscillator()
  const mod = ac.createOscillator()
  car.frequency.value = f
  mod.frequency.value = f * ratio
  const depth = gainNode(ac, 0)
  depth.gain.setValueAtTime(f * index, t)
  depth.gain.exponentialRampToValueAtTime(Math.max(1, f * 0.02), t + dur * 0.6)
  mod.connect(depth).connect(car.frequency)
  const amp = gainNode(ac, 0)
  strike(amp.gain, t, gain, attack, dur)
  car.connect(amp).connect(dest)
  car.start(t)
  mod.start(t)
  car.stop(t + attack + dur + 0.05)
  mod.stop(t + attack + dur + 0.05)
  return amp
}

/** A short burst of filtered noise — the attack of anything struck. */
function tick(ac, dest, t, { freq = 3200, q = 1.2, gain = 0.4, decay = 0.022, type = 'bandpass' } = {}, kit) {
  const src = noiseSource(ac, kit.white, t, decay + 0.03)
  const f = ac.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  const g = gainNode(ac, 0)
  strike(g.gain, t, gain, 0.001, decay)
  src.connect(f).connect(g).connect(dest)
}

/** Moving air: noise through a band that sweeps from one frequency to another. */
function whoosh(ac, dest, t, { from = 300, to = 3000, dur = 0.5, peak = 0.3, at = 0.6, q = 0.9, pan = null } = {}, kit) {
  const src = noiseSource(ac, kit.white, t, dur)
  const f = ac.createBiquadFilter()
  f.type = 'bandpass'
  f.Q.value = q
  f.frequency.setValueAtTime(from, t)
  f.frequency.exponentialRampToValueAtTime(to, t + dur)
  const g = gainNode(ac, 0)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(peak, t + dur * at)
  g.gain.linearRampToValueAtTime(0, t + dur)
  let node = src.connect(f).connect(g)
  if (pan) {
    const p = ac.createStereoPanner()
    p.pan.setValueAtTime(pan[0], t)
    p.pan.linearRampToValueAtTime(pan[1], t + dur)
    node = node.connect(p)
  }
  node.connect(dest)
  return node
}

/** A square wave, softened: the voice of an old game console. */
function chip(ac, dest, t, f, len, gain, { type = 'square', vibrato = 0 } = {}) {
  const o = ac.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(f, t)
  if (vibrato) {
    const lfo = ac.createOscillator()
    lfo.frequency.value = 13
    const depth = gainNode(ac, f * vibrato)
    lfo.connect(depth).connect(o.frequency)
    lfo.start(t)
    lfo.stop(t + len + 0.03)
  }
  const lp = ac.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 3800
  const g = gainNode(ac, 0)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.002)
  g.gain.setValueAtTime(gain, t + len * 0.7)
  g.gain.linearRampToValueAtTime(0, t + len)
  o.connect(lp).connect(g).connect(dest)
  o.start(t)
  o.stop(t + len + 0.02)
}

/* ------------------------------------------------------------------ the sounds */

/**
 * Every control: a dry click with a tone in it too small to name, taken from
 * the chord the music is on — the sound of a well-made switch.
 */
export function tap(ac, out, t, o = {}, kit) {
  const g = gainNode(ac, o.gain ?? 1.4)
  g.connect(out)
  tick(ac, g, t, { freq: 3400, gain: 0.32, decay: 0.018 }, kit)
  const s = ac.createOscillator()
  s.frequency.value = o.freq ?? 1760
  const sg = gainNode(ac, 0)
  strike(sg.gain, t, 0.09, 0.002, 0.07)
  s.connect(sg).connect(g)
  s.start(t)
  s.stop(t + 0.1)
  return 0.12
}

/** A quieter tap, a little lower: letting go of a choice. */
export function soft(ac, out, t, o = {}, kit) {
  return tap(ac, out, t, { ...o, gain: (o.gain ?? 1.4) * 0.6, freq: (o.freq ?? 1760) / 2 }, kit)
}

/**
 * A size: a glass bead, its note taken from the chord, lowest for the
 * smallest size and rising with each one — the row of sizes is a scale.
 */
export function bead(ac, out, t, o = {}, kit) {
  const f = o.freq ?? 880
  const g = gainNode(ac, o.gain ?? 0.5)
  g.connect(out)
  send(ac, g, kit, 0.22)
  tick(ac, g, t, { freq: 4200, gain: 0.18, decay: 0.012 }, kit)
  bell(ac, g, t, f, { dur: 0.42, ratio: 2.756, index: 1.1, gain: 0.26 })
  bell(ac, g, t, f * 2, { dur: 0.18, ratio: 3.1, index: 0.6, gain: 0.06 })
  return 0.6
}

/** Asked to choose a size first: two low, soft knocks. Not an error — a nudge. */
export function deny(ac, out, t, o = {}, kit) {
  const g = gainNode(ac, o.gain ?? 1.2)
  g.connect(out)
  for (const dt of [0, 0.09]) {
    tick(ac, g, t + dt, { freq: 900, q: 2.2, gain: 0.3, decay: 0.04 }, kit)
    const s = ac.createOscillator()
    s.frequency.value = (o.freq ?? 440) / 2
    const sg = gainNode(ac, 0)
    strike(sg.gain, t + dt, 0.1, 0.002, 0.09)
    s.connect(sg).connect(g)
    s.start(t + dt)
    s.stop(t + dt + 0.12)
  }
  return 0.25
}

/**
 * Ordering: the root and its fifth, struck in turn, with a soft weight under
 * them — the sound of a decision.
 */
export function order(ac, out, t, o = {}, kit) {
  const root = o.freq ?? 587.33
  const g = gainNode(ac, o.gain ?? 0.5)
  g.connect(out)
  send(ac, g, kit, 0.32)
  bell(ac, g, t, root, { dur: 1.3, ratio: 1, index: 1.8, gain: 0.24 })
  bell(ac, g, t + 0.11, root * 1.5, { dur: 1.6, ratio: 1, index: 1.6, gain: 0.22 })
  // the weight: a low note that drops a little, felt more than heard
  const thump = ac.createOscillator()
  thump.frequency.setValueAtTime(120, t)
  thump.frequency.exponentialRampToValueAtTime(68, t + 0.16)
  const tg = gainNode(ac, 0)
  strike(tg.gain, t, 0.22, 0.004, 0.18)
  thump.connect(tg).connect(g)
  thump.start(t)
  thump.stop(t + 0.25)
  return 1.9
}

/** The order sent: the chord climbs and resolves, and a few glints follow it. */
export function sent(ac, out, t, o = {}, kit) {
  const notes = o.chord?.length ? o.chord : [62, 65, 69, 74, 76]
  const g = gainNode(ac, o.gain ?? 0.45)
  g.connect(out)
  send(ac, g, kit, 0.42)
  notes.slice(0, 5).forEach((m, i) => bell(ac, g, t + i * 0.075, mtof(m), { dur: 1.5 + i * 0.12, ratio: 1, index: 1.4, gain: 0.16 }))
  for (let i = 0; i < 3; i++) bell(ac, g, t + 0.42 + i * rand(0.09, 0.15), mtof(pick(notes) + 24), { dur: 0.6, ratio: 3.5, index: 1, gain: 0.035 })
  return 2.4
}

/**
 * Looking closer: a breath of air drawn upward, and the chord opening around
 * it, slow and quiet — the room widening into the piece.
 */
export function portal(ac, out, t, o = {}, kit) {
  const g = gainNode(ac, o.gain ?? 0.55)
  g.connect(out)
  send(ac, g, kit, 0.5)
  tick(ac, g, t, { freq: 2600, gain: 0.16, decay: 0.02 }, kit)
  whoosh(ac, g, t, { from: 260, to: 3800, dur: 0.6, peak: 0.26, at: 0.62 }, kit)
  const notes = o.chord?.length ? o.chord : [62, 65, 69, 76]
  notes.slice(0, 4).forEach((m, i) => {
    const s = ac.createOscillator()
    s.type = 'sine'
    s.frequency.value = mtof(m + 12)
    const sg = gainNode(ac, 0)
    const at = t + 0.12 + i * 0.05
    sg.gain.setValueAtTime(0, at)
    sg.gain.linearRampToValueAtTime(0.045, at + 0.28)
    sg.gain.setTargetAtTime(0, at + 0.4, 0.45)
    s.connect(sg).connect(g)
    s.start(at)
    s.stop(at + 3)
  })
  return 3
}

/** Leaving the closer look, or closing anything: the air let back out. */
export function close(ac, out, t, o = {}, kit) {
  const g = gainNode(ac, o.gain ?? 0.9)
  g.connect(out)
  send(ac, g, kit, 0.2)
  whoosh(ac, g, t, { from: 2600, to: 280, dur: 0.42, peak: 0.2, at: 0.35 }, kit)
  return 0.5
}

/** A panel, a sheet, the menu: a short lift of air and a click. */
export function open(ac, out, t, o = {}, kit) {
  const g = gainNode(ac, o.gain ?? 1.1)
  g.connect(out)
  send(ac, g, kit, 0.15)
  tick(ac, g, t, { freq: 3000, gain: 0.2, decay: 0.016 }, kit)
  whoosh(ac, g, t, { from: 420, to: 2400, dur: 0.26, peak: 0.16, at: 0.5 }, kit)
  return 0.3
}

/**
 * The next piece: air passing across, left to right or right to left the way
 * the piece went, and the low note of the house lights going down.
 */
export function swipe(ac, out, t, o = {}, kit) {
  const d = o.dir ?? 1
  const g = gainNode(ac, o.gain ?? 0.5)
  g.connect(out)
  send(ac, g, kit, 0.25)
  whoosh(ac, g, t, { from: 650, to: 1900, dur: 0.48, peak: 0.24, at: 0.4, q: 0.7, pan: [d * 0.7, -d * 0.7] }, kit)
  const low = ac.createOscillator()
  low.frequency.setValueAtTime(92, t)
  low.frequency.exponentialRampToValueAtTime(52, t + 0.6)
  const lg = gainNode(ac, 0)
  lg.gain.setValueAtTime(0, t)
  lg.gain.linearRampToValueAtTime(0.16, t + 0.08)
  lg.gain.setTargetAtTime(0, t + 0.2, 0.18)
  low.connect(lg).connect(g)
  low.start(t)
  low.stop(t + 1.2)
  return 1.2
}

/** Between pages: the curtain falls with a long, soft breath. */
export function curtain(ac, out, t, o = {}, kit) {
  const g = gainNode(ac, o.gain ?? 0.7)
  g.connect(out)
  const src = noiseSource(ac, kit.brown, t, 1.5)
  const lp = ac.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(380, t)
  lp.frequency.linearRampToValueAtTime(820, t + 0.45)
  lp.frequency.linearRampToValueAtTime(300, t + 1.4)
  const ng = gainNode(ac, 0)
  ng.gain.setValueAtTime(0, t)
  ng.gain.linearRampToValueAtTime(0.2, t + 0.45)
  ng.gain.linearRampToValueAtTime(0, t + 1.4)
  src.connect(lp).connect(ng).connect(g)
  send(ac, ng, kit, 0.3)
  return 1.6
}

/** The turntable passing one of the angles it was photographed from: a detent. */
export function detent(ac, out, t, o = {}, kit) {
  const g = gainNode(ac, o.gain ?? 4)
  g.connect(out)
  tick(ac, g, t, { freq: 2200, q: 3, gain: 0.22, decay: 0.012 }, kit)
  return 0.05
}

/**
 * A zip's teeth: one tooth passing the slider. Played for every few pixels
 * the pull travels, so a slow pull ticks and a quick one purrs; each tooth
 * is a hair different in pitch, as metal teeth are.
 */
export function zip(ac, out, t, o = {}, kit) {
  const g = gainNode(ac, o.gain ?? 1.6)
  g.connect(out)
  tick(ac, g, t, { freq: rand(2600, 3600), q: 2.2, gain: 0.12 * (o.strength ?? 1), decay: 0.006 }, kit)
  tick(ac, g, t + 0.002, { freq: rand(900, 1300), q: 1.4, gain: 0.05 * (o.strength ?? 1), decay: 0.01 }, kit)
  return 0.02
}

/**
 * Keeping a piece. The heart is pixel art, so its sound comes from the same
 * world: a puff of a pop, a quick square-wave climb up the chord the way an
 * old console says "collected", and a bright bell-like ting over the top whose
 * pitch moves a little each time, so keeping three pieces in a row sounds
 * like picking up three things rather than one sound three times.
 */
export function heartOn(ac, out, t, o = {}, kit) {
  const g = gainNode(ac, o.gain ?? 0.52)
  g.connect(out)
  send(ac, g, kit, 0.18)
  // the pop
  tick(ac, g, t, { freq: 1800, q: 0.8, gain: 0.32, decay: 0.03 }, kit)
  // the climb: a major arpeggio in the key, two octaves up
  const base = mtof(o.root ?? 77) // F5 by default — the relative major of the house's D minor
  ;[1, 1.25, 1.5, 2].forEach((ratio, i) => chip(ac, g, t + 0.012 + i * 0.038, base * ratio, i === 3 ? 0.16 : 0.032, i === 3 ? 0.07 : 0.085, { vibrato: i === 3 ? 0.012 : 0 }))
  // the ting
  const ting = base * pick([2, 2.5, 3]) // two octaves of the triad, chosen afresh
  bell(ac, g, t + 0.13, ting, { dur: 0.55, ratio: 4, index: 0.9, gain: 0.2 })
  bell(ac, g, t + 0.13, ting * 2, { dur: 0.22, ratio: 3, index: 0.5, gain: 0.04 })
  return 0.9
}

/** Letting a piece go: the climb, reversed and smaller. */
export function heartOff(ac, out, t, o = {}, kit) {
  const g = gainNode(ac, o.gain ?? 0.5)
  g.connect(out)
  tick(ac, g, t, { freq: 1500, q: 0.9, gain: 0.16, decay: 0.02 }, kit)
  const base = mtof(o.root ?? 77)
  chip(ac, g, t + 0.01, base * 1.5, 0.045, 0.06)
  chip(ac, g, t + 0.06, base, 0.07, 0.05)
  return 0.2
}

/**
 * Sound on: the chord, struck once, quickly and quietly, so the visitor hears
 * what they have just turned on.
 */
export function bloom(ac, out, t, o = {}, kit) {
  const notes = o.chord?.length ? o.chord : [62, 65, 69, 72, 76]
  const g = gainNode(ac, o.gain ?? 0.38)
  g.connect(out)
  send(ac, g, kit, 0.5)
  notes.slice(0, 5).forEach((m, i) => bell(ac, g, t + i * 0.055, mtof(m + 12), { dur: 1.4, ratio: 1, index: 1.2, gain: 0.08 }))
  return 2
}

/**
 * Thunder, for the archive's lightning.
 *
 * Sound is slower than light, so it arrives after the flash — later the
 * further away the bolt is — and from the side of the screen the bolt struck.
 * A near strike tears first (a crack: bright noise, gone in a fifth of a
 * second); every strike rolls: low noise in uneven swells, darker the further
 * off it is, for three to six seconds. A phone's speaker cannot play the low
 * end at all, so part of the roll is kept in a band a phone can.
 *
 *   distance 0 (overhead) … 1 (far off) · pan −1 … 1 · twice: a second crack
 */
export function thunder(ac, out, t, o = {}, kit) {
  const d = clamp(o.distance ?? 0.6, 0, 1)
  const at = t + 0.25 + d * 1.4
  const pan = ac.createStereoPanner()
  pan.pan.value = clamp(o.pan ?? 0, -0.9, 0.9)
  const bus = gainNode(ac, (o.gain ?? 0.5) * (1 - d * 0.35))
  bus.connect(pan).connect(out)
  send(ac, bus, kit, 0.28)

  const crack = (when, strength) => {
    tick(ac, bus, when, { freq: 2400, q: 0.5, gain: 0.55 * strength, decay: 0.16, type: 'highpass' }, kit)
    const body = noiseSource(ac, kit.brown, when, 0.7)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 520
    const bg = gainNode(ac, 0)
    strike(bg.gain, when, 0.9 * strength, 0.008, 0.5)
    body.connect(lp).connect(bg).connect(bus)
  }
  if (d < 0.75) crack(at, 1 - d / 0.75)
  if (o.twice) crack(at + rand(0.22, 0.34), 0.6 * (1 - d * 0.6))

  // the roll: uneven swells, each a little weaker than the last
  const dur = 3.2 + d * 2 + Math.random() * 1.2
  const n = 512
  const curve = new Float32Array(n)
  const swells = Array.from({ length: 5 + Math.floor(Math.random() * 4) }, (_, i) => ({
    at: (i === 0 ? 0.02 : rand(0.05, 0.8)),
    width: rand(0.06, 0.2),
    height: (i === 0 ? 1 : rand(0.35, 0.9)),
  }))
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1)
    let v = 0
    for (const s of swells) {
      const k = (x - s.at) / s.width
      if (k > -1) v += s.height * Math.exp(-k * k * (k < 0 ? 6 : 0.9))
    }
    // fades in from nothing and out to nothing: no click at either end
    curve[i] = Math.min(1.2, v) * Math.min(1, x * 40) * Math.pow(1 - x, 1.4)
  }
  const roll = noiseSource(ac, kit.brown, at, dur)
  const lp1 = ac.createBiquadFilter()
  lp1.type = 'lowpass'
  lp1.frequency.value = 420 - d * 230
  lp1.Q.value = 0.6
  const lp2 = ac.createBiquadFilter()
  lp2.type = 'lowpass'
  lp2.frequency.value = 900 - d * 400
  const rg = gainNode(ac, 0)
  rg.gain.setValueAtTime(0, at)
  rg.gain.setValueCurveAtTime(curve, at + 0.005, dur)
  const level = gainNode(ac, 0.95)
  roll.connect(lp1).connect(lp2).connect(rg).connect(level).connect(bus)
  // what a phone can play: the same roll, in the band around 200 Hz
  const mid = ac.createBiquadFilter()
  mid.type = 'bandpass'
  mid.frequency.value = 210 - d * 60
  mid.Q.value = 0.9
  const mg = gainNode(ac, 0.55)
  rg.connect(mid).connect(mg).connect(bus)
  return at - t + dur + 1
}

export const SOUNDS = { tap, soft, bead, deny, order, sent, portal, close, open, swipe, curtain, detent, zip, heartOn, heartOff, bloom, thunder }

/* ------------------------------------------------------------------ the score */

/**
 * The music: slow chords in the house's key, played by a pad and a soft low
 * note, with glass-like notes falling now and then into the reverb. It is
 * written as rules, not a recording, so it never loops — and each page has
 * its own:
 *
 *   room     the showroom. Each piece shifts the key a little and colours the
 *            sound by its own light; the change lands as the lights come up.
 *   archive  the obsidian room: a low open drone, wind, few notes. Thunder
 *            comes from the lightning, not from here.
 *   story    the long read: brighter chords, and a slow plucked figure.
 *
 * All three keep to D minor and its relatives, so moving between them is a
 * change of light, not of music.
 */
const PROGRESSIONS = {
  // Dm9 · B♭maj7 · Fmaj9 · C6/9 — bass note first
  room: [
    [38, 57, 60, 65, 76],
    [34, 53, 57, 62, 69],
    [41, 60, 64, 69, 79],
    [36, 55, 57, 62, 64],
  ],
  // an open fifth that barely moves
  archive: [
    [38, 50, 57, 65],
    [38, 50, 57, 64],
    [36, 50, 55, 62],
    [38, 50, 57, 60],
  ],
  // Fmaj9 · Dm9 · B♭maj9(♯11) · C6/9
  story: [
    [41, 60, 64, 69, 79],
    [38, 57, 60, 65, 76],
    [34, 53, 57, 62, 64],
    [36, 55, 60, 64, 69],
  ],
}
const SCENE = {
  // calm by design: chords that change slowly and arrive slowly, a darker
  // pad, and the glass notes few and far between
  room: { chord: 13, attack: 4.6, release: 6.5, cutoff: 880, pad: 0.05, bass: 0.06, glint: [6, 13], plucks: false, wind: 0 },
  archive: { chord: 16, attack: 5.5, release: 7.5, cutoff: 560, pad: 0.039, bass: 0.07, glint: [9, 18], plucks: false, wind: 0.032 },
  story: { chord: 12, attack: 3.8, release: 5.5, cutoff: 1100, pad: 0.04, bass: 0.05, glint: [6, 13], plucks: true, wind: 0 },
}

/**
 * Move a voice's letting-go from `from` to `to`. A browser that will not move
 * an oscillator's stop says so by throwing, and then the voice is left as it
 * was (false), so it is never cut off while it is still sounding.
 */
function holdOn(amp, oscs, from, to, s) {
  try { for (const o of oscs) o.stop(to + s.release * 1.6) } catch { return false }
  amp.gain.cancelScheduledValues(from)
  amp.gain.setTargetAtTime(0, to, s.release / 4)
  return true
}

function padVoice(ac, dest, t, midi, s, { cutoff, gain, pan, until }) {
  const f = mtof(midi)
  // two low-passes in a row: a steep, warm slope, so the saws give body and
  // no buzz — the analogue pad, not the cheap one
  const lp = ac.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = cutoff
  lp.Q.value = 0.45
  const lp2 = ac.createBiquadFilter()
  lp2.type = 'lowpass'
  lp2.frequency.value = cutoff * 1.6
  lp2.Q.value = 0.3
  // the filter breathes, slowly, at its own rate per voice
  const lfo = ac.createOscillator()
  lfo.frequency.value = rand(0.04, 0.09)
  const lfoDepth = gainNode(ac, cutoff * 0.2)
  lfo.connect(lfoDepth).connect(lp.frequency)
  const amp = gainNode(ac, 0)
  amp.gain.setValueAtTime(0, t)
  amp.gain.setTargetAtTime(gain, t, s.attack / 3)
  amp.gain.setTargetAtTime(0, until, s.release / 4)
  const p = ac.createStereoPanner()
  p.pan.value = pan
  const oscs = [-7, 7].map((cents) => {
    const o = ac.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = f
    o.detune.value = cents + rand(-2, 2)
    o.connect(lp)
    return o
  })
  lp.connect(lp2).connect(amp).connect(p).connect(dest)
  for (const o of [...oscs, lfo]) { o.start(t); o.stop(until + s.release * 1.6) }
  return {
    get until() { return until },
    // the next chord has this note too: keep sounding through it
    hold(to) { if (!holdOn(amp, [...oscs, lfo], until, to, s)) return false; until = to; return true },
    // let go early: the room is changing
    release(at, time = s.release / 4) {
      amp.gain.cancelScheduledValues(at)
      amp.gain.setTargetAtTime(0, at, time)
      for (const o of [...oscs, lfo]) { try { o.stop(at + time * 7) } catch { /* already scheduled sooner */ } }
    },
  }
}

function bassVoice(ac, dest, t, midi, s, { gain, until }) {
  const o = ac.createOscillator()
  o.type = 'sine'
  o.frequency.value = mtof(midi)
  const amp = gainNode(ac, 0)
  amp.gain.setValueAtTime(0, t)
  amp.gain.setTargetAtTime(gain, t, s.attack / 2.5)
  amp.gain.setTargetAtTime(0, until, s.release / 4)
  o.connect(amp).connect(dest)
  o.start(t)
  o.stop(until + s.release * 1.6)
  return {
    get until() { return until },
    hold(to) { if (!holdOn(amp, [o], until, to, s)) return false; until = to; return true },
    release(at, time = s.release / 4) {
      amp.gain.cancelScheduledValues(at)
      amp.gain.setTargetAtTime(0, at, time)
      try { o.stop(at + time * 7) } catch { /* fine */ }
    },
  }
}

/**
 * One page's music. schedule(until) lays down every note that begins before
 * `until`; the engine calls it a little ahead of time while the page is open,
 * and the offline renderer calls it once for the whole length.
 */
export function makeScore(ac, out, kit, scene, { transpose = 0, brightness = 1 } = {}) {
  const s = SCENE[scene] ?? SCENE.room
  const prog = PROGRESSIONS[scene] ?? PROGRESSIONS.room
  const bus = gainNode(ac, 0)
  bus.connect(out)
  send(ac, bus, kit, 0.55)

  let step = 0
  let next = ac.currentTime + 0.05
  let nextGlint = next + rand(...s.glint)
  let nextPluck = next + 1.2
  // every voice still sounding, with when it ends by itself — a change of room
  // has to silence all of them, not only the chord scheduled last
  let live = []
  let key = transpose
  let light = brightness
  let current = prog[0].map((m) => m + key)
  let windNode = null

  if (s.wind > 0) {
    // the archive's air: low noise through a band that wanders
    const src = ac.createBufferSource()
    src.buffer = kit.brown
    src.loop = true
    const bp = ac.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 420
    bp.Q.value = 1.1
    const lfo = ac.createOscillator()
    lfo.frequency.value = 0.07
    const depth = gainNode(ac, 220)
    lfo.connect(depth).connect(bp.frequency)
    const g = gainNode(ac, 0)
    g.gain.setTargetAtTime(s.wind, ac.currentTime, 3)
    const swell = ac.createOscillator()
    swell.frequency.value = 0.11
    const swellDepth = gainNode(ac, s.wind * 0.6)
    swell.connect(swellDepth).connect(g.gain)
    src.connect(bp).connect(g).connect(bus)
    src.start()
    lfo.start()
    swell.start()
    windNode = { stop: (at) => { g.gain.setTargetAtTime(0, at, 1.2); for (const n of [src, lfo, swell]) n.stop(at + 6) } }
  }

  // each chord holds a moment into the next one's rise, so the two cross at
  // an even level instead of dipping between them (a quarter of the attack:
  // within a decibel either way, where letting go on the beat dipped by three)
  const overlap = s.attack * 0.25
  // a note the next chord shares is held on through it rather than struck
  // again, the way a player would: two voices on one note, as one fades and
  // the other rises, can meet half a turn apart and cancel each other out
  let held = new Map()
  const chordAt = (t, notes) => {
    const until = t + s.chord + overlap
    const [bass, ...upper] = notes
    const last = held
    held = new Map()
    const keep = (id, make) => {
      const v = last.get(id)
      const voice = v && v.until > ac.currentTime + 0.1 && v.hold(until) ? v : make()
      held.set(id, voice)
      return voice
    }
    const made = upper.map((m, i) =>
      keep(m, () =>
        padVoice(ac, bus, t, m, s, {
          cutoff: s.cutoff * light * rand(0.92, 1.08),
          gain: s.pad * (i === upper.length - 1 ? 0.7 : 1),
          pan: (i / Math.max(1, upper.length - 1)) * 1.2 - 0.6,
          until,
        }),
      ),
    )
    made.push(keep(`bass ${bass}`, () => bassVoice(ac, bus, t, bass, s, { gain: s.bass, until })))
    return made
  }

  const glint = (t) => {
    const upper = current.slice(1)
    const m = pick(upper) + (Math.random() < 0.5 ? 12 : 24)
    const g = gainNode(ac, 1)
    g.connect(bus)
    send(ac, g, kit, 0.9)
    bell(ac, g, t, mtof(Math.min(m, 91)), { dur: rand(2.4, 3.6), ratio: pick([1, 2]), index: rand(0.3, 0.7), gain: rand(0.009, 0.017), attack: 0.03 })
  }

  const pluck = (t) => {
    const upper = current.slice(1)
    const m = pick(upper) + 12
    const o = ac.createOscillator()
    o.type = 'triangle'
    o.frequency.value = mtof(m)
    const lp = ac.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.setValueAtTime(2200, t)
    lp.frequency.exponentialRampToValueAtTime(700, t + 0.8)
    const g = gainNode(ac, 0)
    strike(g.gain, t, rand(0.018, 0.03), 0.006, rand(1.2, 1.8))
    o.connect(lp).connect(g).connect(bus)
    send(ac, g, kit, 0.4)
    o.start(t)
    o.stop(t + 1.8)
  }

  return {
    bus,
    get chord() { return current },
    schedule(until) {
      live = live.filter((v) => v.ends > ac.currentTime)
      while (next < until) {
        current = prog[step % prog.length].map((m) => m + key)
        const ends = next + s.chord + overlap + s.release * 1.6
        for (const voice of chordAt(next, current)) live.push({ voice, ends })
        step++
        next += s.chord
      }
      while (nextGlint < until) { glint(nextGlint); nextGlint += rand(...s.glint) }
      if (s.plucks) {
        while (nextPluck < until) {
          if (Math.random() < 0.4) pluck(nextPluck)
          nextPluck += pick([0.9, 1.1, 1.3, 1.6])
        }
      }
    },
    /** A new room: the key and the light change, on the next breath. */
    retune(transposeTo, brightnessTo, at) {
      key = transposeTo
      light = brightnessTo
      live.forEach(({ voice }) => voice.release(at, 0.6))
      live = []
      held = new Map()
      next = at + 0.15
    },
    fade(to, time, at = ac.currentTime) {
      bus.gain.cancelScheduledValues(at)
      bus.gain.setTargetAtTime(to, at, time / 3)
    },
    stop(at) {
      bus.gain.cancelScheduledValues(at)
      bus.gain.setTargetAtTime(0, at, 0.8)
      live.forEach(({ voice }) => voice.release(at, 1))
      live = []
      held = new Map()
      windNode?.stop(at)
      next = Infinity
      nextGlint = Infinity
      nextPluck = Infinity
    },
  }
}
