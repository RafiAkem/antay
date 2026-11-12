import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './app'
import { ToastProvider } from './components/ui/toast'
import { CustomerSessionProvider } from './lib/customer-session'
import { SessionProvider } from './lib/session'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <SessionProvider>
          <CustomerSessionProvider>
            <App />
          </CustomerSessionProvider>
        </SessionProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
