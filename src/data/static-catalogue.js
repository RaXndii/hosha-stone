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
 *
 * spots (optional)
 *   Points on the front view the closer look marks, each a detail worth a
 *   look: { id, at: [x, y] (0–1 across and down the front photograph), label,
 *   note, photo? }. With `photo` (a gallery id) the spot opens that
 *   photograph; without, it takes the visitor in close on the piece itself.
 *   Say only what can be seen.
 *
 * film (optional)
 *   The piece's film, shown from the closer look and the room:
 *   { src (H.264 MP4, ~720p), small (a lighter one, for slow connections),
 *     webm (VP9, for a browser without H.264), poster (its first frame),
 *     cover (the still that stands for it), duration (seconds) }
 *
 * since
 *   The catalogue revision a piece arrived in. A database made before it
 *   receives it once, on the next start (server/seed.js); a piece the house
 *   later deletes in /admin is not brought back.
 *
 * replaces (optional, with since)
 *   The slug of a piece this one takes the place of. In a database made
 *   before it, that piece is deleted and this one stands where it stood,
 *   under its number — once, like any new piece.
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
    id: 'espresso-006e',
    colour: 'Brown',
    badge: 'New',
    number: '006',
    since: 2,
    category: 'jackets',
    name: 'Espresso Leather Jacket',
    code: '006E',
    line: 'Espresso',
    short: 'Espresso',
    description:
      'A shirt-collar jacket in deep espresso leather, cut clean through the body. A two-way metal zip, two zipped pockets set upright beside it, a yoke across the chest and the back, and banded cuffs that close with a snap.',
    tagline: 'Attitude included.',
    price: 40,
    hero: { src: '/espresso-hero.webp' },
    sizes: [
      { label: 'S', available: true },
      { label: 'M', available: true },
      { label: 'L', available: true },
      { label: 'XL', available: true },
    ],
    // espresso leather: a deep, warm room the colour of the hide, and a
    // copper edge — the warmth of the leather where the light catches it
    theme: {
      bg0: [8, 5, 4],
      bg1: [24, 16, 12],
      bg2: [78, 54, 40],
      light: [242, 224, 206],
      floor: [11, 7, 5],
      neon: [226, 128, 64],
      accent: [236, 168, 118],
      glass: [246, 232, 220],
      ink: [248, 243, 238],
      ink2: [178, 162, 150],
    },
    gallery: [
      { id: 'front', label: 'Front view', kind: 'garment', src: '/espresso-hero.webp', angle: 0, turn: '/tt/espresso-front' },
      { id: 'collar', label: 'Collar & zip', kind: 'print', src: '/espresso-collar.webp', focus: '50% 45%' },
      { id: 'body', label: 'On the body', kind: 'print', src: '/espresso-on-body.webp', focus: '50% 35%' },
      { id: 'back', label: 'Back', kind: 'print', src: '/espresso-back.webp', focus: '50% 35%' },
      { id: 'collar-up', label: 'Collar up', kind: 'print', src: '/espresso-collar-up.webp', focus: '60% 30%' },
    ],
    spots: [
      { id: 'collar', at: [0.5, 0.2], label: 'Point collar', note: 'Stitched along its edge, over the top of the zip.', photo: 'collar' },
      { id: 'yoke', at: [0.7, 0.315], label: 'Yoke', note: 'A seam across the chest, and across the back.', photo: 'back' },
      { id: 'pocket', at: [0.287, 0.66], label: 'Zipped pockets', note: 'Two, set upright, one either side of the zip.' },
      { id: 'zip', at: [0.5, 0.872], label: 'Two-way zip', note: 'Metal, with a pull at each end: it opens from the hem too.' },
      { id: 'cuff', at: [0.905, 0.93], label: 'Banded cuffs', note: 'A stitched band at each cuff, closed with a snap.', photo: 'back' },
    ],
    film: {
      src: '/film/espresso-720.mp4',
      small: '/film/espresso-480.mp4',
      webm: '/film/espresso-720.webm',
      poster: '/film/espresso-poster.webp',
      cover: '/film/espresso-cover.webp',
      duration: 7.75,
    },
  },
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
    // photographed again, flat, with its details: it replaces the earlier
    // navy jacket in a database that already has it (see server/seed.js)
    id: 'zip-021n',
    since: 3,
    replaces: 'zip-021n',
    colour: 'Navy',
    badge: 'New',
    number: '004',
    category: 'jackets',
    name: 'Navy Zip Jacket',
    code: '021N',
    line: 'Navy',
    description: 'A clean zip-front jacket in deep navy cloth. A two-way metal zip, with a pull at the collar and another at the hem; a point collar over a quilted lining; slim welt pockets either side; a band across the hem, and cuffs that close with a snap.',
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
    // the front alone, as photographed: Look closer shows it still, to go
    // close on, with its details marked; no turning
    gallery: [
      { id: 'front', label: 'Front view', kind: 'garment', src: '/navy-hero.webp', angle: 0, turn: '/tt/navy-front' },
      { id: 'pocket', label: 'Pocket & cuff', kind: 'print', src: '/navy-pocket.webp', focus: '50% 50%' },
    ],
    spots: [
      { id: 'collar', at: [0.43, 0.085], label: 'Point collar', note: 'A point collar, with a quilted lining inside.' },
      { id: 'top', at: [0.5, 0.205], label: 'Top pull', note: 'The zip’s first pull closes the jacket up to the collar.' },
      { id: 'pocket', at: [0.235, 0.6], label: 'Welt pockets', note: 'Two, set slim into the body, one either side.', photo: 'pocket' },
      { id: 'hem', at: [0.3, 0.865], label: 'Hem band', note: 'A band across the hem keeps it short and clean.' },
      { id: 'bottom', at: [0.5, 0.945], label: 'Bottom pull', note: 'A second pull at the hem: open it from below for room as you sit.' },
      { id: 'cuff', at: [0.92, 0.95], label: 'Snap cuffs', note: 'Each cuff closes with a snap.', photo: 'pocket' },
    ],
    film: {
      src: '/film/navy-720.mp4',
      small: '/film/navy-480.mp4',
      webm: '/film/navy-720.webm',
      poster: '/film/navy-poster.webp',
      cover: '/film/navy-cover.webp',
      duration: 10,
    },
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

