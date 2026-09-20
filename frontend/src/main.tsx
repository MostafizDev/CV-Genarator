import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts are bundled with the app (no request to Google's servers, so nothing is sent to a
// third party before the visitor has made a cookie choice).
import '@fontsource-variable/nunito'
import '@fontsource/caveat/600.css'
import './index.css'
import { applyDesignTokens } from './styles/tokens'
import App from './App.tsx'

applyDesignTokens()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
