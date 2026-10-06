// Asset slots for the hero garment.
//
// The three views are cut from the product sheet and normalised so the garment
// is the same height, on the same axis, on an identical canvas. The camera rig
// depends on that: it matches every view to one apparent width, so turning the
// garment never makes it jump or change size.
//
// `widthRatio` is the garment's own width as a fraction of its canvas — the
// numbers the extraction reported. The rig uses them to work out how wide the
// garment should look at any angle. Re-measure these if you replace the images.
export const JACKET = {
  code: 'JACKET — 012A',
  season: 'SPRING',
  statement: 'A new season calls for a new presence',
  description: 'Casual wearing jacket for spring, with a warm and comfortable wearing.',
  price: '43$',
  sizes: ['M', 'X', 'XL'],
  extraSizes: ['S', 'L', 'XXL'],

  views: {
    front: { src: './jacket-front.webp', mask: './mask-front.webp', widthRatio: 0.783 },
    side: { src: './jacket-side.webp', mask: './mask-side.webp', widthRatio: 0.323 },
    back: { src: './jacket-back.webp', mask: './mask-back.webp', widthRatio: 0.828 },
  },

  // cinematic inserts — the camera passing close enough to notice construction
  details: {
    zip: './detail-zip.webp',
    pocket: './detail-pocket.webp',
    collar: './detail-collar.webp',
  },
}

export const VIEW_ORDER = ['front', 'side', 'back']
