import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css'
import './index.css'
import App from './App.jsx'
import { loadCatalogue } from './lib/catalogue.js'
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
})
