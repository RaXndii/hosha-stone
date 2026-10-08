import { Suspense, lazy, useEffect } from 'react'
import Showroom from './components/showroom/Showroom.jsx'
import { PageProvider, usePage } from './lib/page.jsx'
import { ShopProvider } from './lib/shop.jsx'
import { PREVIEW } from './lib/catalogue.js'
import { frugal } from './lib/net.js'

/**
 * Home is the showroom; the archive (Browsing) is the way into every other
 * piece; Kept is the same archive holding only what this visitor saved; and
 * the story is the house at length.
 *
 * Only the showroom is in the script a visitor waits for. The archive and the
 * story are fetched separately (the story alone needs ScrollTrigger, a fifth
 * of the whole script), and both are quietly warmed once the first page has
 * settled, so arriving at either still costs nothing.
 */
const loadBrowse = () => import('./components/browse/Browse.jsx')
const loadStory = () => import('./components/story/Story.jsx')
const Browse = lazy(loadBrowse)
const Story = lazy(loadStory)
const room = <div className="min-h-[100svh]" style={{ background: 'rgb(4 3 8)' }} />

function Pages() {
  const { route } = usePage()

  useEffect(() => {
    if (frugal()) return
    const idle = window.requestIdleCallback ?? ((fn) => window.setTimeout(fn, 2500))
    const cancel = window.cancelIdleCallback ?? window.clearTimeout
    const id = idle(() => { loadBrowse().catch(() => {}); loadStory().catch(() => {}) }, { timeout: 6000 })
    return () => cancel(id)
  }, [])

  if (route.name === 'browse' || route.name === 'saved' || route.name === 'story') {
    return (
      <Suspense fallback={room}>
        {route.name === 'story' ? <Story /> : route.name === 'saved' ? <Browse kept key="kept" /> : <Browse key="browse" />}
      </Suspense>
    )
  }
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
