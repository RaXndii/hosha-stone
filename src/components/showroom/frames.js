/**
 * The turntable's photographs come in two sizes: the large ones for a desk,
 * the light ones for a phone. Here, apart from the turntable itself, so the
 * showroom can start them loading without loading the whole viewer.
 */
export function frameSrc(turn, large) {
  return `${turn}${large ? '@2' : ''}.webp`
}
export const prefersLargeFrames = () => window.matchMedia('(min-width: 1024px)').matches
