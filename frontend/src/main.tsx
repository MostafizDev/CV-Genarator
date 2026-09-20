import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { applyDesignTokens } from './styles/tokens'
import App from './App.tsx'

applyDesignTokens()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
