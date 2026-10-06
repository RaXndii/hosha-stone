import Showroom from './components/showroom/Showroom.jsx'
import Browse from './components/browse/Browse.jsx'
import { PageProvider, usePage } from './lib/page.jsx'
import { ShopProvider } from './lib/shop.jsx'
import { PREVIEW } from './lib/catalogue.js'

// Home is the showroom; the archive (Browsing) is the way into every other piece.
function Pages() {
  const { route } = usePage()
  if (route.name === 'browse') return <Browse />
  return <Showroom key="showroom" initialId={route.name === 'piece' ? route.id : undefined} entry={route.entry} />
}

export default function App() {
  return (
    <ShopProvider>
      <PageProvider>
        <Pages />
        {PREVIEW && (
          // the admin's preview of an unpublished piece — never seen by customers
          <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[90] flex justify-center p-3">
            <span className="px-4 py-2 text-[9.5px] font-medium uppercase tracking-[0.3em]" style={{ background: 'rgb(12 10 18 / 0.92)', color: 'rgb(238 236 244)', boxShadow: 'inset 0 0 0 1px rgb(150 96 255 / 0.7)' }}>
              Preview · {PREVIEW.name} · not visible to customers until published
            </span>
          </div>
        )}
      </PageProvider>
    </ShopProvider>
  )
}
