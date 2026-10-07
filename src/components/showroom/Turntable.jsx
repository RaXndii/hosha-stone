import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { sound } from '../../lib/sound/index.js'

/**
 * A garment you can turn, built from its real photographs.
 *
 * The piece is treated as a soft elliptical cylinder — as wide as its front
 * view, as deep as its side view — and every real photograph is wrapped onto
 * that surface from the angle it was taken at. To draw a new angle, each pixel
 * finds the point of cloth it is looking at, then asks every photograph that
 * saw that point for its colour, trusting most the ones that saw it head-on
 * and were taken nearest this angle. So the front's details slide toward the
 * edge and compress as it turns, exactly as a real object's would, and the
 * side or back photograph takes over as it comes into view. At a photograph's
 * own angle you see that photograph, untouched.
 *
 * Nothing is invented: every pixel on screen comes from a real photo of this
 * piece. Where a side was never photographed (the hoodie), it is assembled
 * from the front and back as they turn away.
 *
 * views   [{ angle (deg), turn (path stem) }] — whatever the product has.
 *         0 front, 90 front turned to the viewer's right, 180 back, 270 left.
 *         One view: no turning, only zoom.
 */
const MAX_VIEWS = 8
const DEG = Math.PI / 180
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const wrap360 = (a) => ((a % 360) + 360) % 360
const shortest = (from, to) => ((((to - from) % 360) + 540) % 360) - 180

const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main() { vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }
`

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uFit;
uniform float uZoom;
uniform vec2 uPan;
uniform float uTheta;
uniform float uW;
uniform float uD;
uniform float uSigma;
uniform float uDmin;
uniform float uSheen;
uniform sampler2D uTex0;
uniform sampler2D uTex1;
uniform sampler2D uTex2;
uniform sampler2D uTex3;
uniform sampler2D uTex4;
uniform sampler2D uTex5;
uniform sampler2D uTex6;
uniform sampler2D uTex7;
uniform float uAng[8];
uniform float uOn[8];
uniform float uFlip[8];
uniform float uPres[8];
const float PI = 3.14159265;
const float TAU = 6.2831853;

float wrapPI(float a) { return a - TAU * floor((a + PI) / TAU); }
float psiAt(float t) { return atan(uD * sin(t), uW * cos(t)); }

// Two layers. The present photograph (pres, eased over time) is the picture,
// exactly as photographed wherever it saw the cloth square-on. Behind it, every
// photograph weighted by how near it was taken and how squarely it saw each
// point: that fills only where the present one saw the cloth edge-on.
void take(sampler2D tex, float ang, float on, float flip, float pres, float phi, float v,
          inout vec4 accP, inout float wP, inout float presSum, inout vec4 accF, inout float wF) {
  if (on < 0.5) return;
  float q = wrapPI(phi + psiAt(ang));
  float facing = cos(q);
  presSum += pres;
  // sampled before anything is decided per pixel. A texture read inside a
  // branch some pixels skip leaves the GPU without the neighbours it needs to
  // choose a mip level, so along the cloth's edges it fell to the smallest —
  // the whole photograph averaged to one colour — and drew it as a thin line
  // across the turntable. Read everywhere, then decide whether it counts.
  float u = clamp(0.5 + 0.5 * sin(q), 0.0, 1.0);
  u = mix(u, 1.0 - u, step(0.5, flip));
  vec4 c = texture2D(tex, vec2(u, v));
  if (facing <= 0.0) return;
  float d = wrapPI(uTheta - ang);
  float close = exp(-(d * d - uDmin * uDmin) / (uSigma * uSigma));
  // the photograph's empty background is exactly empty — no faint box around the piece
  c.a = smoothstep(0.03, 0.08, c.a);
  vec4 pm = vec4(c.rgb * c.a, c.a);
  float seen = smoothstep(0.06, 0.3, facing);
  accP += pres * seen * pm;
  wP += pres * seen;
  float wf = close * facing * facing;
  accF += wf * pm;
  wF += wf;
}

void main() {
  vec2 px = vec2(vUv.x * uRes.x, (1.0 - vUv.y) * uRes.y);
  vec2 g = (px - uCenter) / (uFit * uZoom) + uPan;
  float v = g.y + 0.5;
  float c = cos(uTheta);
  float s = sin(uTheta);
  float R = sqrt(uW * uW * c * c + uD * uD * s * s);
  float xr = g.x / R;
  // outside the cloth is drawn as nothing — but by a mask at the end, not an
  // early return, so the photographs are read in step across the whole quad
  float inside = step(0.0, v) * step(v, 1.0) * step(abs(xr), 0.99999);
  xr = clamp(xr, -0.99999, 0.99999);
  float psi = atan(uD * s, uW * c);
  float phi = asin(xr) - psi;

  vec4 accP = vec4(0.0);
  vec4 accF = vec4(0.0);
  float wP = 0.0;
  float wF = 0.0;
  float presSum = 0.0;
  take(uTex0, uAng[0], uOn[0], uFlip[0], uPres[0], phi, v, accP, wP, presSum, accF, wF);
  take(uTex1, uAng[1], uOn[1], uFlip[1], uPres[1], phi, v, accP, wP, presSum, accF, wF);
  take(uTex2, uAng[2], uOn[2], uFlip[2], uPres[2], phi, v, accP, wP, presSum, accF, wF);
  take(uTex3, uAng[3], uOn[3], uFlip[3], uPres[3], phi, v, accP, wP, presSum, accF, wF);
  take(uTex4, uAng[4], uOn[4], uFlip[4], uPres[4], phi, v, accP, wP, presSum, accF, wF);
  take(uTex5, uAng[5], uOn[5], uFlip[5], uPres[5], phi, v, accP, wP, presSum, accF, wF);
  take(uTex6, uAng[6], uOn[6], uFlip[6], uPres[6], phi, v, accP, wP, presSum, accF, wF);
  take(uTex7, uAng[7], uOn[7], uFlip[7], uPres[7], phi, v, accP, wP, presSum, accF, wF);
  vec4 P = wP > 1e-6 ? accP / wP : vec4(0.0);
  vec4 F = wF > 1e-9 ? accF / wF : vec4(0.0);
  float coverage = presSum > 1e-6 ? clamp(wP / presSum, 0.0, 1.0) : 0.0;
  // the others only soften the edge where the present photograph grazes the
  // cloth; cloth it never saw at all is left out rather than drawn as a sliver
  // cloth the present photograph sees only edge-on fades away softly, instead
  // of being stretched into a sliver or patched from another angle
  vec4 col = P * coverage + F * 0.0;

  // the cloth turning away from us falls a little into shadow, and a soft
  // light from the left travels across it as it turns
  float lam = sqrt(max(0.0, 1.0 - xr * xr));
  float sheen = pow(max(0.0, cos(phi + psi + 0.6)), 12.0) * uSheen;
  col.rgb = col.rgb * (0.88 + 0.12 * lam) + vec3(sheen) * col.a;
  gl_FragColor = col * inside;
}
`

function compile(gl, type, src) {
  const sh = gl.createShader(type)
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh))
  return sh
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** Which frames suit this screen: the large ones on a desk, the light ones on a phone. */
export function frameSrc(turn, large) {
  return `${turn}${large ? '@2' : ''}.webp`
}
export const prefersLargeFrames = () => window.matchMedia('(min-width: 1024px)').matches

export default function Turntable({ views, fallbackSrc, ref, onFrame, onInteract, onReady, intro = true }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const engine = useRef(null)
  const [noGL, setNoGL] = useState(false)
  const [ready, setReady] = useState(false)
  const cbs = useRef({ onFrame, onInteract, onReady })
  useEffect(() => { cbs.current = { onFrame, onInteract, onReady } })

  const viewKey = views.map((v) => `${v.angle}:${v.turn}`).join('|')

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    // a garment photographed turning one way only: each of those photographs,
    // mirrored, stands in for the matching angle on the other side — the same
    // real piece, seen as its twin side would be. Front and back need no twin.
    const mirrored = views
      .map((v, i) => ({ v, i }))
      .filter(({ v }) => Math.abs(shortest(v.angle, 0)) > 10 && Math.abs(shortest(v.angle, 180)) > 10)
      .filter(({ v }) => !views.some((o) => Math.abs(shortest(o.angle, 360 - v.angle)) < 10))
      .map(({ v, i }) => ({ ...v, angle: wrap360(360 - v.angle), mirrorOf: i }))
    const list = [...views, ...mirrored].slice(0, MAX_VIEWS)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const large = prefersLargeFrames()
    const canTurn = list.length > 1

    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: false })
    if (!gl) { setNoGL(true); return }

    let prog
    try {
      prog = gl.createProgram()
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
      gl.linkProgram(prog)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog))
    } catch {
      setNoGL(true)
      return
    }
    gl.useProgram(prog)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const U = (n) => gl.getUniformLocation(prog, n)
    const u = {
      res: U('uRes'), center: U('uCenter'), fit: U('uFit'), zoom: U('uZoom'), pan: U('uPan'), theta: U('uTheta'),
      W: U('uW'), D: U('uD'), sigma: U('uSigma'), dmin: U('uDmin'), sheen: U('uSheen'), ang: U('uAng'), on: U('uOn'), flip: U('uFlip'), pres: U('uPres'),
    }
    for (let i = 0; i < MAX_VIEWS; i++) gl.uniform1i(U(`uTex${i}`), i)
    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE)

    // a blank texture so unused samplers are always complete
    const blank = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, blank)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
    const textures = new Array(MAX_VIEWS).fill(blank)
    const aspects = new Array(MAX_VIEWS).fill(0)
    const loaded = new Array(MAX_VIEWS).fill(0)
    const upgraded = new Array(MAX_VIEWS).fill(false)
    let natH = 0 // the garment's height in source pixels, for the zoom limit
    // how well photograph i can show the current angle: the share of the
    // visible cloth it saw squarely, held back by how far it must be stretched
    const quality = (i) => {
      const { W, D } = shape()
      const t = wrap360(s.theta) * DEG
      const c = Math.cos(t), sn = Math.sin(t)
      const R = Math.sqrt(W * W * c * c + D * D * sn * sn)
      const psi = Math.atan2(D * sn, W * c)
      const a = wrap360(list[i].angle) * DEG
      const psiK = Math.atan2(D * Math.sin(a), W * Math.cos(a))
      let seen = 0
      const N = 24
      for (let k = 0; k < N; k++) {
        const x = -0.98 + (1.96 * k) / (N - 1)
        const phi = Math.asin(x) - psi
        const f = Math.cos(phi + psiK)
        seen += f <= 0 ? 0 : f >= 0.16 ? 1 : f / 0.16
      }
      // and a photograph taken nearer this angle is preferred: at its own angle it
      // is simply the truth, however well a neighbour could stretch to cover it
      const near = 1 - 0.3 * Math.min(1, Math.abs(shortest(s.theta, list[i].angle)) / 90)
      return (seen / N) * Math.min(1, aspects[i] / 2 / R) * near
    }
    const bestView = () => {
      let best = -1, q = -1
      list.forEach((_, i) => { if (!loaded[i]) return; const v = quality(i); if (v > q) { q = v; best = i } })
      return best
    }
    // which photograph is carrying the turn, and how present each one is
    const presence = new Array(MAX_VIEWS).fill(0)
    let active = -1
    let lastT = performance.now()
    let lastDetent = 0

    const upload = (i, img, pot) => {
      // power-of-two so the frame can be mipmapped: no shimmer when it is small
      const size = Math.min(pot, maxTex)
      const c = document.createElement('canvas')
      c.width = size
      c.height = size
      const cx = c.getContext('2d')
      cx.imageSmoothingQuality = 'high'
      cx.drawImage(img, 0, 0, size, size)
      const tex = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c)
      gl.generateMipmap(gl.TEXTURE_2D)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      const ext = gl.getExtension('EXT_texture_filter_anisotropic')
      if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(4, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)))
      if (textures[i] !== blank && !list.some((v, k) => k !== i && textures[k] === textures[i])) gl.deleteTexture(textures[i])
      textures[i] = tex
      aspects[i] = img.naturalWidth / img.naturalHeight
      loaded[i] = 1
      // its mirrored twin shares the same texture
      list.forEach((v, k) => { if (v.mirrorOf === i) { textures[k] = tex; aspects[k] = aspects[i]; loaded[k] = 1 } })
      if (list[i].angle === 0 || !natH) natH = Math.max(natH, img.naturalHeight)
    }

    // the shape the photographs wrap onto
    const shape = () => {
      const at = (deg) => list.findIndex((v, i) => loaded[i] && Math.abs(shortest(v.angle, deg)) < 1)
      const front = at(0) >= 0 ? at(0) : list.findIndex((_, i) => loaded[i])
      const back = at(180)
      const sideIdx = [at(90), at(270)].filter((i) => i >= 0)
      const W = front >= 0 ? Math.max(aspects[front], back >= 0 ? aspects[back] : 0) / 2 : 0.5
      // a garment is roughly two-fifths as deep as it is wide when it was never shot from the side
      const D = sideIdx.length ? Math.max(...sideIdx.map((i) => aspects[i])) / 2 : W * 0.4
      return { W, D }
    }

    const s = {
      theta: 0, // degrees
      v: 0, // degrees per frame
      zoom: 1, zT: 1, pan: [0, 0], pT: [0, 0],
      fit: 1, center: [0, 0], w: 1, h: 1, dpr: 1,
      dragging: false, settle: null, tween: null, dirty: true, raf: 0, interacted: false,
    }

    const resize = () => {
      // layout size, not the on-screen box: the viewer is scaled while it opens
      s.dpr = Math.min(window.devicePixelRatio || 1, 2)
      s.w = Math.max(1, Math.round(wrap.clientWidth * s.dpr))
      s.h = Math.max(1, Math.round(wrap.clientHeight * s.dpr))
      canvas.width = s.w
      canvas.height = s.h
      const { W } = shape()
      s.fit = Math.min(s.h * 0.86, (s.w * 0.88) / (2 * Math.max(W, 0.2)))
      s.center = [s.w / 2, s.h / 2]
      s.dirty = true
      kick()
    }

    const maxZoom = () => clamp((natH * 0.85) / s.fit, 1.6, 3.2)

    const draw = () => {
      const { W, D } = shape()
      gl.viewport(0, 0, s.w, s.h)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.uniform2f(u.res, s.w, s.h)
      gl.uniform2f(u.center, s.center[0], s.center[1])
      gl.uniform1f(u.fit, s.fit)
      gl.uniform1f(u.zoom, s.zoom)
      gl.uniform2f(u.pan, s.pan[0], s.pan[1])
      gl.uniform1f(u.theta, wrap360(s.theta) * DEG)
      gl.uniform1f(u.W, W)
      gl.uniform1f(u.D, D)
      // each photograph carries the turn by itself for most of the way — that is
      // real perspective — and hands over to the next in a short dissolve
      // around the half-way angle, where any two views disagree the most
      gl.uniform1f(u.sigma, 22 * DEG)
      let dmin = Math.PI
      list.forEach((v, i) => { if (loaded[i]) dmin = Math.min(dmin, Math.abs(shortest(s.theta, v.angle)) * DEG) })
      gl.uniform1f(u.dmin, dmin)
      gl.uniform1f(u.sheen, 0.035)
      const ang = new Float32Array(MAX_VIEWS)
      const on = new Float32Array(MAX_VIEWS)
      const flip = new Float32Array(MAX_VIEWS)
      for (let i = 0; i < MAX_VIEWS; i++) {
        ang[i] = list[i] ? wrap360(list[i].angle) * DEG : 0
        on[i] = loaded[i]
        flip[i] = list[i]?.mirrorOf !== undefined ? 1 : 0
        gl.activeTexture(gl.TEXTURE0 + i)
        gl.bindTexture(gl.TEXTURE_2D, textures[i])
      }
      gl.uniform1fv(u.ang, ang)
      gl.uniform1fv(u.on, on)
      gl.uniform1fv(u.flip, flip)
      gl.uniform1fv(u.pres, new Float32Array(presence))
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      cbs.current.onFrame?.(wrap360(s.theta), s.zoom)
    }

    const clampPan = (p, z) => {
      const k = 1 - 1 / z
      return [clamp(p[0], -0.55 * k, 0.55 * k), clamp(p[1], -0.5 * k, 0.5 * k)]
    }

    // one loop, and only while something moves
    const tick = () => {
      s.raf = 0
      let moving = false
      const now = performance.now()
      const dt = Math.min(64, now - lastT)
      lastT = now
      if (s.tween) {
        const t = Math.min(1, (performance.now() - s.tween.t0) / s.tween.dur)
        const e = s.tween.ease(t)
        s.theta = s.tween.from + (s.tween.to - s.tween.from) * e
        if (t >= 1) s.tween = null
        moving = true
      } else if (!s.dragging && Math.abs(s.v) > 0.02) {
        // momentum: the garment keeps turning, and slows like a real object
        s.theta += s.v
        s.v *= 0.93
        moving = true
        if (Math.abs(s.v) <= 0.06) { s.v = 0; settleToPhoto() }
      } else if (s.settle !== null) {
        const d = shortest(s.theta, s.settle)
        s.theta += d * 0.12
        if (Math.abs(d) < 0.03) { s.theta = s.settle; s.settle = null }
        moving = true
      }
      // the photograph that can show this angle best carries the turn: the one
      // that saw most of what is now in view, and needs the least stretching to
      // cover it. A new one takes over only once it is clearly better, so a hand
      // resting between two does not flicker
      const best = bestView()
      if (best >= 0 && best !== active) {
        if (active < 0 || !loaded[active] || quality(best) > quality(active) * 1.06) {
          // turning past a real photograph clicks, like a dial past a detent
          if (active >= 0 && now - lastDetent > 70) { sound.play('detent'); lastDetent = now }
          active = best
        }
      }
      for (let i = 0; i < MAX_VIEWS; i++) {
        const target = i === active ? 1 : 0
        const step = reduced ? 1 : dt / 180
        const next = target > presence[i] ? Math.min(target, presence[i] + step) : Math.max(target, presence[i] - step)
        if (next !== presence[i]) { presence[i] = next; moving = true }
      }
      const dz = s.zT - s.zoom
      if (Math.abs(dz) > 0.0005) { s.zoom += dz * 0.2; moving = true } else s.zoom = s.zT
      for (let k = 0; k < 2; k++) {
        const dp = s.pT[k] - s.pan[k]
        if (Math.abs(dp) > 0.00005) { s.pan[k] += dp * 0.22; moving = true } else s.pan[k] = s.pT[k]
      }
      if (moving || s.dirty) { draw(); s.dirty = false }
      if (moving) kick()
    }
    const kick = () => { if (!s.raf) s.raf = requestAnimationFrame(tick) }

    // at rest the piece comes to rest on its nearest real photograph — the
    // in-between angles are for turning through, the photographs for looking at
    const settleToPhoto = () => {
      if (!canTurn) return
      let best = null
      for (let i = 0; i < list.length; i++) {
        if (!loaded[i]) continue
        const d = shortest(s.theta, list[i].angle)
        if (best === null || Math.abs(d) < Math.abs(best)) best = d
      }
      if (best !== null) s.settle = s.theta + best
    }

    const rotateTo = (deg, dur = 900) => {
      if (!canTurn) return
      const to = s.theta + shortest(s.theta, deg)
      s.v = 0
      s.settle = null
      if (reduced) { s.theta = to; s.dirty = true; kick(); return }
      s.tween = { from: s.theta, to, t0: performance.now(), dur, ease: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) }
      kick()
    }

    const zoomAt = (factor, cx, cy) => {
      const z0 = s.zT
      const z1 = clamp(z0 * factor, 1, maxZoom())
      // keep the point under the hand where it is
      const gx = (cx - s.center[0]) / (s.fit * z0) + s.pT[0]
      const gy = (cy - s.center[1]) / (s.fit * z0) + s.pT[1]
      s.zT = z1
      s.pT = clampPan([gx - (cx - s.center[0]) / (s.fit * z1), gy - (cy - s.center[1]) / (s.fit * z1)], z1)
      if (z1 > 1.15 && !large) upgradeNearest()
      kick()
    }

    // on a phone the light frames load first; the one being examined is
    // swapped for its large frame the moment the visitor zooms into it
    const upgradeNearest = () => {
      let best = -1, bd = 999
      list.forEach((v, i) => { const d = Math.abs(shortest(s.theta, v.angle)); if (d < bd) { bd = d; best = i } })
      if (best >= 0 && list[best].mirrorOf !== undefined) best = list[best].mirrorOf
      if (best < 0 || upgraded[best]) return
      upgraded[best] = true
      loadImage(frameSrc(list[best].turn, true)).then((img) => { if (!dead) { upload(best, img, 2048); s.dirty = true; kick() } }).catch(() => {})
    }

    engine.current = {
      rotateTo: (deg) => rotateTo(deg),
      step: (d) => rotateTo(s.theta + d * 45, 700),
      zoomBy: (f) => zoomAt(f, s.center[0], s.center[1]),
      reset: () => { s.zT = 1; s.pT = [0, 0]; rotateTo(0); kick() },
      canTurn,
    }

    /* ------------------------------------------------ the visitor's hands */
    const pointers = new Map()
    let last = null
    let pinch = null
    let samples = []
    let tapAt = 0
    const local = (e) => {
      const r = canvas.getBoundingClientRect()
      return [(e.clientX - r.left) * s.dpr, (e.clientY - r.top) * s.dpr]
    }
    const down = (e) => {
      wrap.setPointerCapture?.(e.pointerId)
      pointers.set(e.pointerId, local(e))
      s.tween = null
      s.settle = null
      s.v = 0
      if (pointers.size === 1) {
        s.dragging = true
        last = local(e)
        samples = [{ x: last[0], t: performance.now() }]
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()]
        pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: s.zT, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }
      }
    }
    const move = (e) => {
      if (!pointers.has(e.pointerId)) return
      const p = local(e)
      pointers.set(e.pointerId, p)
      if (pointers.size >= 2 && pinch) {
        const [a, b] = [...pointers.values()]
        const d = Math.hypot(a[0] - b[0], a[1] - b[1])
        const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
        zoomAt((pinch.z * (d / pinch.d)) / s.zT, mid[0], mid[1])
        s.pT = clampPan([s.pT[0] - (mid[0] - pinch.mid[0]) / (s.fit * s.zT), s.pT[1] - (mid[1] - pinch.mid[1]) / (s.fit * s.zT)], s.zT)
        pinch.mid = mid
        kick()
        return
      }
      if (!s.dragging || !last) return
      const dx = p[0] - last[0]
      const dy = p[1] - last[1]
      last = p
      if (s.zT > 1.03) {
        // up close, a drag moves across the cloth instead of turning it
        s.pT = clampPan([s.pT[0] - dx / (s.fit * s.zT), s.pT[1] - dy / (s.fit * s.zT)], s.zT)
      } else if (canTurn) {
        s.theta += dx * (300 / s.w)
        samples.push({ x: p[0], t: performance.now() })
        if (samples.length > 6) samples.shift()
        if (!s.interacted && Math.abs(dx) > 0) { s.interacted = true; cbs.current.onInteract?.() }
      }
      s.dirty = true
      kick()
    }
    const up = (e) => {
      if (!pointers.has(e.pointerId)) return
      pointers.delete(e.pointerId)
      if (pointers.size < 2) pinch = null
      if (pointers.size === 1) { last = [...pointers.values()][0]; return }
      if (pointers.size > 0) return
      s.dragging = false
      // release: carry the hand's speed into the garment
      if (canTurn && s.zT <= 1.03 && samples.length > 1) {
        const a = samples[0], b = samples[samples.length - 1]
        const dt = Math.max(16, b.t - a.t)
        s.v = reduced ? 0 : clamp(((b.x - a.x) / dt) * 16.7 * (300 / s.w), -14, 14)
        if (Math.abs(s.v) <= 0.06) settleToPhoto()
      }
      // a double tap goes close, or comes back
      const now = performance.now()
      if (e.pointerType !== 'mouse' && samples.length <= 2 && now - tapAt < 300) {
        const p = local(e)
        if (s.zT > 1.05) { s.zT = 1; s.pT = [0, 0] } else zoomAt(2.2, p[0], p[1])
        tapAt = 0
      } else tapAt = now
      kick()
    }
    const wheel = (e) => {
      e.preventDefault()
      const r = canvas.getBoundingClientRect()
      const k = e.deltaMode === 1 ? 16 : 1
      zoomAt(Math.exp(-e.deltaY * k * (e.ctrlKey ? 0.01 : 0.0016)), (e.clientX - r.left) * s.dpr, (e.clientY - r.top) * s.dpr)
    }
    const dbl = (e) => {
      const r = canvas.getBoundingClientRect()
      if (s.zT > 1.05) { s.zT = 1; s.pT = [0, 0]; kick() } else zoomAt(2.2, (e.clientX - r.left) * s.dpr, (e.clientY - r.top) * s.dpr)
    }
    wrap.addEventListener('pointerdown', down)
    wrap.addEventListener('pointermove', move)
    wrap.addEventListener('pointerup', up)
    wrap.addEventListener('pointercancel', up)
    wrap.addEventListener('wheel', wheel, { passive: false })
    wrap.addEventListener('dblclick', dbl)
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    const lost = (e) => { e.preventDefault(); setNoGL(true) }
    canvas.addEventListener('webglcontextlost', lost)

    /* ------------------------------------------------ frames, front first */
    let dead = false
    const pot = large ? 2048 : 1024
    const order = list.map((_, i) => i).filter((i) => list[i].mirrorOf === undefined).sort((a, b) => Math.abs(shortest(0, list[a].angle)) - Math.abs(shortest(0, list[b].angle)))
    ;(async () => {
      for (const i of order) {
        try {
          const img = await loadImage(frameSrc(list[i].turn, large))
          if (dead) return
          upload(i, img, pot)
          if (i === order[0]) {
            resize()
            setReady(true)
            cbs.current.onReady?.()
            // once, a breath of a turn — enough to show the piece can be turned
            if (intro && canTurn && !reduced) {
              window.setTimeout(() => {
                if (dead || s.interacted) return
                // out to ~16° and home again
                s.tween = { from: 0, to: 18, t0: performance.now(), dur: 1700, ease: (t) => Math.sin(t * Math.PI) * (1 - 0.25 * t) }
                kick()
              }, 650)
            }
          } else {
            s.dirty = true
            kick()
          }
        } catch { /* a missing view is simply left out */ }
      }
    })()

    return () => {
      dead = true
      cancelAnimationFrame(s.raf)
      ro.disconnect()
      wrap.removeEventListener('pointerdown', down)
      wrap.removeEventListener('pointermove', move)
      wrap.removeEventListener('pointerup', up)
      wrap.removeEventListener('pointercancel', up)
      wrap.removeEventListener('wheel', wheel)
      wrap.removeEventListener('dblclick', dbl)
      canvas.removeEventListener('webglcontextlost', lost)
      new Set(textures).forEach((t) => t !== blank && gl.deleteTexture(t))
      gl.deleteTexture(blank)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      engine.current = null
    }
    // the frames are the identity of the turntable; a new piece is a new one
  }, [viewKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    rotateTo: (d) => engine.current?.rotateTo(d),
    step: (d) => engine.current?.step(d),
    zoomBy: (f) => engine.current?.zoomBy(f),
    reset: () => engine.current?.reset(),
  }), [])

  const canTurn = views.length > 1
  return (
    <div
      ref={wrapRef}
      className={`absolute inset-0 touch-none select-none ${canTurn ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'}`}
    >
      {/* until the frames are in, the front photograph holds the place — the
          canvas draws the same framing, so the hand-over is invisible */}
      <img
        src={fallbackSrc}
        alt=""
        draggable="false"
        className="pointer-events-none absolute left-1/2 top-1/2 max-h-[86%] max-w-[88%] -translate-x-1/2 -translate-y-1/2 select-none object-contain transition-opacity duration-500"
        style={{ opacity: ready && !noGL ? 0 : 1 }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full transition-opacity duration-500"
        style={{ opacity: ready && !noGL ? 1 : 0 }}
      />
    </div>
  )
}
