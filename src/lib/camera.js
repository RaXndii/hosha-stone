import { JACKET } from '../data/product.js'

const { front, side, back } = JACKET.views
const DEG = Math.PI / 180

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)

/** 0 below `a`, 1 above `b`, eased in between */
function ramp(v, a, b) {
  if (b === a) return v >= b ? 1 : 0
  const t = clamp((v - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

/**
 * How wide the garment should appear at a given angle.
 *
 * The garment's cross-section is treated as an ellipse: as wide as the front
 * view, as deep as the side view. That gives a single continuous width for
 * every angle of the turn — 0.78 of the canvas face-on, narrowing smoothly to
 * 0.32 side-on.
 *
 * This is what stops the sequence reading as a slideshow. Each view is then
 * scaled to *that* width rather than its own, so at any moment all three
 * photographs occupy the same silhouette and a crossfade between them looks
 * like one object continuing to turn.
 */
export function apparentWidth(theta) {
  const rad = theta * DEG
  // the face gets marginally wider through the turn: the back view genuinely is
  const faceW = front.widthRatio + (back.widthRatio - front.widthRatio) * clamp(theta / 180, 0, 1)
  const a = faceW / 2
  const b = side.widthRatio / 2
  const c = Math.cos(rad)
  const s = Math.sin(rad)
  return 2 * Math.sqrt(a * a * c * c + b * b * s * s)
}

/**
 * Per-view opacity. Stacked front (bottom) → side → back (top), each one only
 * ever rising over a fully opaque layer beneath it, so the garment never dips
 * in density mid-crossfade the way a plain dissolve does.
 */
export function viewOpacity(theta) {
  return {
    front: 1 - ramp(theta, 92, 124),
    side: ramp(theta, 26, 76) * (1 - ramp(theta, 150, 176)),
    back: ramp(theta, 102, 152),
  }
}

/**
 * Everything the rig needs for one frame. Pure: the same angle and distance
 * always produce the same picture, which is what makes the sequence
 * scrubbable in both directions and stoppable anywhere.
 */
export function cameraFrame(theta, dolly) {
  const rad = theta * DEG
  const w = apparentWidth(theta)
  const op = viewOpacity(theta)

  const scaleFor = (view) => clamp(w / view.widthRatio, 0.12, 2.8)

  // the arc itself: a touch of real perspective at its steepest, and a lateral
  // drift so the garment parallaxes against the field behind it
  const swing = Math.sin(rad)
  const rotY = -swing * 9
  const driftX = swing * 4.2

  // the key light travels round with the camera and crosses the garment
  const sweep = clamp(theta / 180, 0, 1)

  return { w, op, scaleFor, rotY, driftX, sweep, dolly }
}

export const VIEWS = { front, side, back }
