import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css'
import './index.css'
import App from './App.jsx'
import { loadCatalogue } from './lib/catalogue.js'

// the catalogue comes from the server; the site renders once it is in (or once it is clear there is none)
loadCatalogue().finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
