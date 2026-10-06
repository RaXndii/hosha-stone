import { JACKET } from '../data/product.js'

export default function PriceTag() {
  return (
    <div
      data-price
      className="pointer-events-none absolute bottom-[7%] right-5 z-20 text-right md:bottom-[9%] md:right-[3.4vw]"
    >
      {/* the reference's blob, reduced to the light it was casting */}
      <span
        className="pointer-events-none absolute -bottom-16 -right-20 -z-10 h-72 w-72"
        style={{
          background:
            'radial-gradient(closest-side, rgba(86,70,150,0.2) 0%, rgba(62,50,116,0.09) 40%,' +
            ' rgba(40,32,80,0.03) 66%, transparent 88%)',
        }}
      />
      <span className="mb-2 block text-[9px] uppercase tracking-ultra text-bone/40">Price</span>
      <span className="mb-2.5 ml-auto block h-px w-14 bg-gradient-to-l from-bone/50 to-transparent" />
      <span
        className="block font-display font-medium italic leading-none text-bone"
        style={{ fontSize: 'clamp(2rem, 3.6vw, 3.1rem)' }}
      >
        {JACKET.price}
      </span>
    </div>
  )
}
