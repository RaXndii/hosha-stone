import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../fonts.css'
import './admin.css'
import AdminApp from './AdminApp.jsx'

createRoot(document.getElementById('admin')).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>,
)
