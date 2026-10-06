/**
 * What HOT ONES browses. Each product carries its own views; the rail shows one
 * large and offers the next alongside it, so switching view and switching
 * product use the same gesture.
 *
 * `widthRatio` is unused here — the rail sizes by height, which is what keeps a
 * hoodie and a jacket sitting on the same baseline.
 */
export const CATEGORIES = [
  { id: 'hoodies', label: 'Hoodies' },
  { id: 'jackets', label: 'Jackets' },
]

export const PRODUCTS = [
  {
    id: 'hoodie-004',
    category: 'hoodies',
    code: 'HOODIE — 004',
    name: 'Washed Hoodie',
    price: 15,
    was: 25,
    sizes: ['S', 'M', 'L'],
    lines: [
      'Wear it casual. Wear it different.',
      "Simplicity isn't ordinary.",
      "It's an aesthetic.",
      "It's confidence without trying too hard.",
    ],
    views: [
      { id: 'back', label: 'Back', src: './hoodie-back.webp' },
      { id: 'front', label: 'Front', src: './hoodie-front.webp' },
    ],
  },
  {
    id: 'jacket-012a',
    category: 'jackets',
    code: 'JACKET — 012A',
    name: 'Spring Zip Jacket',
    price: 43,
    was: 60,
    sizes: ['M', 'X', 'XL'],
    lines: [
      'Cut close. Worn open.',
      'Built for the hour after the photograph.',
      'Nothing on it that does not need to be.',
    ],
    views: [
      { id: 'front', label: 'Front', src: './jacket-front.webp' },
      { id: 'side', label: 'Side', src: './jacket-side.webp' },
      { id: 'back', label: 'Back', src: './jacket-back.webp' },
    ],
  },
]

export const byCategory = (id) => PRODUCTS.filter((p) => p.category === id)
