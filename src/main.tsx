import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { Providers } from './app/providers'
import { App } from './app/App'
import './styles/globals.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

createRoot(root).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
    <Analytics />
  </StrictMode>,
)
