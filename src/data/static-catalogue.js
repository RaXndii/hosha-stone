/**
 * The bundled catalogue. The live site reads its catalogue from the server
 * (/api/catalogue, managed in /admin); this copy is the fallback when no
 * server answers (a static preview), and the seed for a fresh database.
 *
 * The showroom is driven entirely by this list. Adding a garment means adding
 * an entry here — the page, the transitions, the gallery and the atmosphere all
 * read from it.
 *
 * theme
 *   Colours are "r g b" triplets so they can be tweened as numbers and used
 *   with any alpha, e.g. rgb(var(--sr-bg1) / 0.6). The rule is
 *   garment → palette → light → room → neon: every colour is taken from the
 *   piece itself, never imposed on it. A mostly black piece keeps a dark,
 *   cinematic room and borrows its one colour from a detail (the leather
 *   jacket's red label); a coloured cloth tints the whole room (the navy).
 *     bg0    deepest edge of the room
 *     bg1    the field the piece floats in
 *     bg2    the pool of light behind it
 *     light  colour of the overhead light and the mist
 *     floor  the floor plane
 *     neon   the glass slab's edge, its glow on the stone and in the mist
 *     accent the piece's signature colour in the interface (chosen size, price)
 *     glass  tint of the glass slab
 *     ink    primary text;  ink2  secondary text
 *
 * colour   the cloth, for the archive's colour filter
 * badge    optional: New, Featured or Archive — shown quietly in the archive
 *
 * hero
 *   The one image the home page shows: the front, cut out tight, floating
 *   over the plinth. Every other view waits in the closer look.
 *
 * gallery
 *   Every real photograph of THIS piece — never other pieces.
 *     kind: 'garment'  a cut-out view of the whole piece. Give it
 *                      angle  where the camera stood, in degrees:
 *                               0 front · 90 front turned to the viewer's right
 *                               180 back · 270 front turned to the left
 *                               (45, 135… for three-quarter views)
 *                      turn   the stem of its turntable frame in /tt
 *                             (stem.webp for phones, stem@2.webp for desks)
 *                      and the closer look turns the piece through every
 *                      angle it has. One view: it is shown still, to zoom into.
 *     kind: 'print'    a close photograph — a detail, shown on its own.
 */

export const STATIC_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'jackets', label: 'Jackets' },
  { id: 'hoodies', label: 'Hoodies' },
  { id: 't-shirts', label: 'T-Shirts' },
  { id: 'pants', label: 'Pants' },
  { id: 'accessories', label: 'Accessories' },
]

export const STATIC_STORY = {
  heading: ['Wear', 'your', 'story'],
  body: "More than just clothes. It's a feeling. A mindset. Hosha Stone is for those who keep it real.",
}

export const STATIC_PRODUCTS = [
  {
    id: 'leather-004b',
    colour: 'Black',
    badge: 'Featured',
    number: '001',
    category: 'jackets',
    name: 'Leather Jacket',
    code: '004B',
    line: 'Stretch',
    description:
      'Premium leather jacket designed for everyday comfort. Durable, versatile, and made to move with you.',
    short: 'Leather',
    tagline: 'Simple. Never ordinary.',
    // was: the original value, shown struck above the price it costs now
    price: 58,
    was: 100,
    hero: { src: '/leather-hero.webp' },
    sizes: [
      { label: 'XS', available: false },
      { label: 'S', available: true },
      { label: 'M', available: true },
      { label: 'L', available: false },
      { label: 'XL', available: false },
    ],
    theme: {
      bg0: [5, 4, 5],
      bg1: [15, 12, 14],
      bg2: [50, 42, 47],
      light: [226, 218, 222],
      floor: [7, 6, 7],
      neon: [222, 34, 60],
      accent: [228, 62, 82],
      glass: [238, 226, 230],
      ink: [242, 239, 240],
      ink2: [152, 144, 148],
    },
    gallery: [
      { id: 'front', label: 'Front view', kind: 'garment', src: '/leather-hero.webp', angle: 0, turn: '/tt/leather-front' },
      { id: 'back', label: 'Back', kind: 'print', src: '/leather-back.webp', focus: '50% 30%' },
      { id: 'collar', label: 'Collar', kind: 'print', src: '/leather-collar.webp', focus: '42% 60%' },
      { id: 'zipper', label: 'Zipper', kind: 'print', src: '/leather-zipper.webp', focus: '50% 50%' },
      { id: 'pocket', label: 'Pocket', kind: 'print', src: '/leather-pocket.webp', focus: '50% 50%' },
      { id: 'grain', label: 'Leather grain', kind: 'print', src: '/leather-texture.webp', focus: '50% 50%' },
    ],
  },
  {
    id: 'jacket-012a',
    colour: 'Black',
    number: '002',
    category: 'jackets',
    name: 'Spring Zip Jacket',
    code: '012A',
    line: 'Spring',
    description: 'Casual wearing jacket for spring, with a warm and comfortable wearing.',
    short: 'Spring zip',
    tagline: 'A new season calls for a new presence.',
    price: 43,
    hero: { src: '/jacket-hero.webp' },
    sizes: [
      { label: 'S', available: false },
      { label: 'M', available: true },
      { label: 'L', available: true },
      { label: 'XL', available: true },
    ],
    theme: {
      bg0: [5, 3, 12],
      bg1: [14, 10, 30],
      bg2: [48, 36, 88],
      light: [196, 180, 246],
      floor: [6, 4, 15],
      neon: [146, 92, 255],
      accent: [184, 156, 246],
      glass: [220, 210, 252],
      ink: [244, 242, 248],
      ink2: [152, 144, 174],
    },
    gallery: [
      { id: 'front', label: 'Front view', kind: 'garment', src: '/jacket-hero.webp', angle: 0, turn: '/tt/jacket-front' },
      { id: 'back', label: 'Back view', kind: 'garment', src: '/jacket-back.webp', angle: 180, turn: '/tt/jacket-back' },
      { id: 'side', label: 'Side view', kind: 'garment', src: '/jacket-side.webp', angle: 270, turn: '/tt/jacket-side' },
      { id: 'zip', label: 'Zipper', kind: 'print', src: '/detail-zip.webp', focus: '50% 45%' },
    ],
  },
  {
    id: 'hoodie-004',
    colour: 'Charcoal',
    badge: 'Archive',
    number: '003',
    category: 'hoodies',
    name: 'Washed Hoodie',
    code: '004',
    line: 'Washed',
    description:
      "Wear it casual. Wear it different. Simplicity isn't ordinary — it's confidence without trying too hard.",
    short: 'Hoodie',
    tagline: "It's an aesthetic.",
    price: 15,
    hero: { src: '/hoodie-hero.webp' },
    was: 25,
    sizes: [
      { label: 'S', available: true },
      { label: 'M', available: true },
      { label: 'L', available: true },
      { label: 'XL', available: false },
    ],
    theme: {
      bg0: [9, 8, 7],
      bg1: [26, 23, 20],
      bg2: [78, 69, 59],
      light: [240, 226, 204],
      floor: [12, 10, 9],
      neon: [232, 164, 92],
      accent: [226, 190, 140],
      glass: [244, 234, 220],
      ink: [247, 243, 237],
      ink2: [176, 166, 152],
    },
    gallery: [
      { id: 'front', label: 'Front view', kind: 'garment', src: '/hoodie-hero.webp', angle: 0, turn: '/tt/hoodie-front' },
      { id: 'back', label: 'Back view', kind: 'garment', src: '/hoodie-back.webp', angle: 180, turn: '/tt/hoodie-back' },
    ],
  },
  {
    id: 'zip-021n',
    colour: 'Navy',
    number: '004',
    category: 'jackets',
    name: 'Navy Zip Jacket',
    code: '021N',
    line: 'Navy',
    description: 'A clean zip-front jacket in deep navy cloth. Light, sharp and made to sit easily over anything.',
    short: 'Navy zip',
    tagline: 'Quietly sharp.',
    price: 64,
    hero: { src: '/navy-hero.webp' },
    sizes: [
      { label: 'S', available: true },
      { label: 'M', available: true },
      { label: 'L', available: true },
      { label: 'XL', available: false },
    ],
    // a navy garment needs a field that is lighter than it is: the room is a
    // deep blue, with a pool of cool light behind the case for the piece to
    // stand against
    theme: {
      bg0: [2, 5, 14],
      bg1: [10, 20, 44],
      bg2: [42, 66, 120],
      light: [178, 204, 244],
      floor: [3, 7, 19],
      neon: [64, 176, 255],
      accent: [120, 178, 246],
      glass: [204, 222, 250],
      ink: [240, 244, 251],
      ink2: [142, 154, 182],
    },
    gallery: [
      { id: 'front', label: 'Front view', kind: 'garment', src: '/navy-hero.webp', angle: 0, turn: '/tt/navy-front' },
      { id: 'back', label: 'Back view', kind: 'garment', src: '/navy-back.webp', angle: 180, turn: '/tt/navy-back' },
      { id: 'left', label: 'Left side view', kind: 'garment', src: '/navy-left.webp', angle: 90, turn: '/tt/navy-left' },
      { id: 'right', label: 'Right side view', kind: 'garment', src: '/navy-right.webp', angle: 270, turn: '/tt/navy-right' },
    ],
  },
  {
    id: 'harrington-031s',
    colour: 'Sand',
    badge: 'New',
    number: '005',
    category: 'jackets',
    name: 'Harrington Jacket',
    code: '031S',
    line: 'Harrington',
    short: 'Harrington',
    description: 'A cotton Harrington with a stand collar, raglan sleeves and a check lining. Ribbed cuffs and hem, made to be worn in.',
    tagline: 'Worn in, never worn out.',
    price: 72,
    hero: { src: '/harrington-hero.webp' },
    sizes: [
      { label: 'S', available: true },
      { label: 'M', available: true },
      { label: 'L', available: true },
      { label: 'XL', available: true },
    ],
    // sand cotton: a warm, low room, lit the colour of the cloth, with a pale
    // champagne edge — the check lining's tan carried into the light
    theme: {
      bg0: [9, 8, 6],
      bg1: [29, 25, 18],
      bg2: [96, 84, 60],
      light: [246, 234, 208],
      floor: [13, 11, 8],
      neon: [232, 206, 146],
      accent: [226, 202, 150],
      glass: [246, 238, 220],
      ink: [248, 245, 238],
      ink2: [184, 174, 152],
    },
    // five real angles, photographed turning to the left, and the collar up close
    gallery: [
      { id: 'front', label: 'Front view', kind: 'garment', src: '/harrington-front.webp', angle: 0, turn: '/tt/harrington-front' },
      { id: 'q-front', label: 'Three-quarter view', kind: 'garment', src: '/harrington-q-front.webp', angle: 315, turn: '/tt/harrington-q-front' },
      { id: 'side', label: 'Side view', kind: 'garment', src: '/harrington-side.webp', angle: 270, turn: '/tt/harrington-side' },
      { id: 'q-back', label: 'Three-quarter back', kind: 'garment', src: '/harrington-q-back.webp', angle: 225, turn: '/tt/harrington-q-back' },
      { id: 'back', label: 'Back view', kind: 'garment', src: '/harrington-back.webp', angle: 180, turn: '/tt/harrington-back' },
      { id: 'collar', label: 'Collar & lining', kind: 'print', src: '/harrington-collar.webp', focus: '50% 40%' },
    ],
  },
]

