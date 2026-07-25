import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import './index.css'
import App from './App.tsx'
import { queryClient, queryPersister, CACHE_BUSTER } from '@/api/queryClient'
import { I18nProvider } from '@/i18n/useI18n'
import LenisProvider from '@/motion/LenisProvider'
import ErrorBoundary from '@/components/ErrorBoundary'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: queryPersister, buster: CACHE_BUSTER }}
      >
        <I18nProvider>
          <LenisProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </LenisProvider>
        </I18nProvider>
      </PersistQueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
