import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css'
import './index.css'
import App from './App.jsx'
import { loadCatalogue } from './lib/catalogue.js'
import { SOURCE } from './data/showroom.js'
import { installSound } from './lib/sound/index.js'

installSound()

// the opening (index.html) is not playing on this visit or this page: it has no further use
if (document.documentElement.classList.contains('hs-quiet')) document.getElementById('hs-opening')?.remove()

// the catalogue comes from the server; the site renders once it is in (or once it is clear there is none)
loadCatalogue().finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  keepCopies()
})

/**
 * What the phone keeps for next time (public/sw.js): only where the site is
 * served by its own server (not a static preview), and only once the page
 * has loaded, so it never competes with the first visit for the network.
 */
function keepCopies() {
  if (!import.meta.env.PROD || SOURCE !== 'server' || !('serviceWorker' in navigator)) return
  const register = () => window.setTimeout(() => navigator.serviceWorker.register('/sw.js').catch(() => {}), 2500)
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
}
