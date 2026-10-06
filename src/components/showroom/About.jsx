import Drawer from '../hot/Drawer.jsx'
import { ABOUT } from '../../data/showroom.js'
import { INSTAGRAM, WHATSAPP } from '../../data/order.js'

/** The house, in its own words — written in /admin → About, the same drawer from the archive and the showroom. */
export default function About({ open, onClose }) {
  const a = ABOUT
  return (
    <Drawer open={open} onClose={onClose} title="About Hosha Stone">
      <div className="space-y-5" style={{ color: 'rgb(var(--sr-ink))' }}>
        {a.image && (
          <div className="relative -mx-1 mb-2 aspect-[4/3] overflow-hidden" style={{ boxShadow: 'inset 0 0 0 1px rgb(var(--sr-ink) / 0.1)' }}>
            <img src={a.image} alt="" loading="lazy" className="h-full w-full object-cover" />
          </div>
        )}
        <p className="font-display text-xl leading-snug">{a.title}</p>
        <p className="whitespace-pre-line text-[12.5px] leading-[1.9]" style={{ color: 'rgb(var(--sr-ink) / 0.6)' }}>{a.body}</p>
        {a.motto && <p className="pt-1 text-[10px] uppercase tracking-[0.34em]" style={{ color: 'rgb(var(--sr-ink) / 0.8)' }}>{a.motto}</p>}
        {(a.sections ?? []).map((s, i) => (
          <div key={i} className="border-t pt-5" style={{ borderColor: 'rgb(var(--sr-ink) / 0.1)' }}>
            {s.heading && <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: 'rgb(var(--sr-ink) / 0.85)' }}>{s.heading}</p>}
            {s.text && <p className="mt-3 whitespace-pre-line text-[12.5px] leading-[1.9]" style={{ color: 'rgb(var(--sr-ink) / 0.6)' }}>{s.text}</p>}
          </div>
        ))}
        <div className="space-y-5 pt-6">
          {[
            ['Instagram', `https://instagram.com/${INSTAGRAM}`],
            ['WhatsApp', `https://wa.me/${WHATSAPP}`],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between border-b pb-3 text-[11px] uppercase tracking-[0.28em]"
              style={{ borderColor: 'rgb(var(--sr-ink) / 0.15)', color: 'rgb(var(--sr-ink) / 0.8)' }}
            >
              {label} <span style={{ color: 'rgb(var(--sr-neon))' }}>→</span>
            </a>
          ))}
        </div>
      </div>
    </Drawer>
  )
}
