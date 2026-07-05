import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import { pdfjs } from 'react-pdf'
import { ErrorBoundary } from './ErrorBoundary'
import App from './App'
import './index.css'

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`

const rootEl = document.getElementById('root')
if (!rootEl) {
  document.body.innerHTML = '<p style="padding:20px;font-family:sans-serif;">Erreur: élément #root introuvable.</p>'
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
        <Toaster position="top-right" toastOptions={{ style: { background: '#2f2f2f', color: '#e5e5e5', border: '1px solid rgba(255,255,255,0.1)' } }} />
      </ErrorBoundary>
    </React.StrictMode>
  )
}
