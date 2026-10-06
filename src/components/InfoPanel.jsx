import { useState } from 'react'
import { JACKET } from '../data/product.js'
import SizeSelector from './SizeSelector.jsx'
import GetOneButton from './GetOneButton.jsx'

const PANEL_FILL =
  'linear-gradient(158deg, rgba(26,21,56,0.95) 0%, rgba(16,13,38,0.95) 48%, rgba(8,6,22,0.95) 100%)'
const EDGE_LIGHT =
  'linear-gradient(150deg, rgba(186,160,240,0.55) 0%, rgba(140,116,204,0.2) 44%, rgba(116,96,176,0.05) 100%)'

export default function InfoPanel() {
  const [size, setSize] = useState(null)

  return (
    <>
      {/* angled panel — a graphic element in the scene, not a sidebar */}
      <div
        data-panel="side"
        className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden md:block"
      >
        <div
          className="relative h-full"
          style={{
            width: '37vw',
            maxWidth: '520px',
            background: EDGE_LIGHT,
            clipPath: 'polygon(0 0, 60% 0, 100% 100%, 0 100%)',
          }}
        >
          <div
            className="absolute inset-0 backdrop-blur-[2px]"
            style={{
              background: PANEL_FILL,
              clipPath: 'polygon(0 0, calc(60% - 1.5px) 0, calc(100% - 1.5px) 100%, 0 100%)',
            }}
          />
        </div>
      </div>

      {/* mobile keeps the diagonal language as a rising sheet */}
      <div
        data-panel="sheet"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[46%] md:hidden"
      >
        <div
          className="relative h-full w-full"
          style={{
            background: EDGE_LIGHT,
            clipPath: 'polygon(0 9%, 100% 0, 100% 100%, 0 100%)',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              // the sheet covers far more of a phone than the wedge does a desktop,
              // so it sits closer to the field's own black
              background:
                'linear-gradient(180deg, rgba(16,13,38,0.94) 0%, rgba(9,7,24,0.97) 45%, rgba(4,3,15,0.99) 100%)',
              clipPath: 'polygon(0 calc(9% + 1.5px), 100% 1.5px, 100% 100%, 0 100%)',
            }}
          />
        </div>
      </div>

      {/* brand statement */}
      <div className="pointer-events-none absolute left-5 top-[22%] z-20 md:left-[3.4vw] md:top-[27%]">
        <p
          data-panel-item
          className="font-sans text-[15px] font-bold tracking-[0.13em] text-bone md:text-[19px]"
        >
          VASS
        </p>
        <p
          data-panel-item
          className="mt-2.5 max-w-[190px] font-sans text-[10.5px] font-semibold leading-[1.65] text-bone/60 md:mt-3 md:max-w-[210px] md:text-[11px]"
        >
          {JACKET.statement}
        </p>
      </div>

      {/* product */}
      <div className="absolute inset-x-5 bottom-[7%] z-20 md:inset-x-auto md:bottom-[9%] md:left-[3.4vw] md:max-w-[300px]">
        <p
          data-panel-item
          className="font-display text-[15px] font-medium italic tracking-[0.02em] text-bone md:text-[17px]"
        >
          {JACKET.code}
        </p>
        <p
          data-panel-item
          className="mt-2 max-w-[260px] font-sans text-[10.5px] font-semibold leading-[1.6] text-bone/55 md:mt-2.5 md:max-w-[240px] md:text-[11px]"
        >
          {JACKET.description}
        </p>

        <div data-panel-item className="mt-6 md:mt-7">
          <SizeSelector selected={size} onSelect={setSize} />
        </div>

        <div data-panel-item className="mt-6 md:mt-7">
          <GetOneButton active={Boolean(size)} />
        </div>
      </div>
    </>
  )
}
