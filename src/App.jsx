import { Suspense, lazy, useEffect } from 'react'
import Showroom from './components/showroom/Showroom.jsx'
import Browse from './components/browse/Browse.jsx'
import { PageProvider, usePage } from './lib/page.jsx'
import { ShopProvider } from './lib/shop.jsx'
import { PREVIEW } from './lib/catalogue.js'
import { frugal } from './lib/net.js'

/**
 * Home is the showroom; the archive (Browsing) is the way into every other
 * piece; Kept is the same archive holding only what this visitor saved; and
 * the story is the house at length.
 *
 * The story is the one page that scrolls, so it is the only one that needs
 * ScrollTrigger — a fifth of the whole script. It is fetched separately and
 * only when someone goes there, and quietly warmed once the showroom is
 * settled, so arriving at it still costs nothing.
 */
const Story = lazy(() => import('./components/story/Story.jsx'))
const warmStory = () => import('./components/story/Story.jsx')

function Pages() {
  const { route } = usePage()

  useEffect(() => {
    if (frugal()) return
    const idle = window.requestIdleCallback ?? ((fn) => window.setTimeout(fn, 2500))
    const cancel = window.cancelIdleCallback ?? window.clearTimeout
    const id = idle(() => { warmStory().catch(() => {}) }, { timeout: 6000 })
    return () => cancel(id)
  }, [])

  if (route.name === 'browse') return <Browse />
  if (route.name === 'saved') return <Browse kept key="kept" />
  if (route.name === 'story') {
    return (
      <Suspense fallback={<div className="min-h-[100svh]" style={{ background: 'rgb(4 3 8)' }} />}>
        <Story />
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
