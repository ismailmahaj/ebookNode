import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { Document, Page } from 'react-pdf'
import { getPdfBlobUrl, getEbook, PdfLoadError } from '../api/ebooks'
import { getOfflinePdf } from '../utils/offlineLibrary'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

export default function EbookReader() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const preview = searchParams.get('preview') === '1'
  const offlineMode = searchParams.get('offline') === '1'

  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorForbidden, setErrorForbidden] = useState(false)
  const [title, setTitle] = useState<string>('')
  const [isOfflineSource, setIsOfflineSource] = useState(false)

  useEffect(() => {
    if (!id) return
    let objectUrl: string | null = null
    let cancelled = false

    async function loadPdf() {
      getEbook(Number(id)).then((e) => {
        if (!cancelled) setTitle(e.title)
      }).catch(() => {})

      try {
        if (offlineMode) {
          const blob = await getOfflinePdf(Number(id))
          if (!blob) {
            throw new PdfLoadError('Ce livre n\'est pas disponible hors ligne.', 'NOT_FOUND')
          }
          objectUrl = URL.createObjectURL(blob)
          if (!cancelled) {
            setPdfUrl(objectUrl)
            setIsOfflineSource(true)
          }
          return
        }

        try {
          const url = await getPdfBlobUrl(Number(id), preview)
          objectUrl = url
          if (!cancelled) setPdfUrl(url)
        } catch (e) {
          if (!preview && !navigator.onLine) {
            const blob = await getOfflinePdf(Number(id))
            if (blob) {
              objectUrl = URL.createObjectURL(blob)
              if (!cancelled) {
                setPdfUrl(objectUrl)
                setIsOfflineSource(true)
                return
              }
            }
          }
          throw e
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof PdfLoadError ? e.message : 'Impossible de charger le PDF')
          setErrorForbidden(e instanceof PdfLoadError && e.code === 'FORBIDDEN')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadPdf()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [id, preview, offlineMode])

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setPageNumber(1)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-netflix-black flex items-center justify-center z-50">
        <div className="w-12 h-12 border-2 border-netflix-red border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !pdfUrl) {
    return (
      <div className="fixed inset-0 bg-netflix-black flex flex-col items-center justify-center gap-4 z-50 px-4">
        <p className="text-netflix-white/90 text-center">{error ?? 'PDF introuvable'}</p>
        {errorForbidden && (
          <Link to="/subscription" className="text-netflix-red hover:underline">
            S&apos;abonner pour lire en entier
          </Link>
        )}
        <Link to={id ? `/ebook/${id}` : '/'} className="text-netflix-red hover:underline">
          Retour au détail
        </Link>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-netflix-black flex flex-col z-50">
      <div className="flex items-center justify-between px-4 h-14 bg-black/80 border-b border-white/10 flex-shrink-0">
        <Link
          to={id ? `/ebook/${id}` : '/'}
          className="flex items-center gap-2 text-netflix-white/90 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" /> Fermer
        </Link>
        <span className="text-netflix-white/90 text-sm truncate max-w-[50%]" title={title}>
          {title}
          {isOfflineSource && (
            <span className="ml-2 text-xs text-green-400">(hors ligne)</span>
          )}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            className="p-2 rounded hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none text-white"
            aria-label="Page précédente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-netflix-white/80 min-w-[4rem] text-center">
            {pageNumber} / {numPages ?? '–'}
          </span>
          <button
            onClick={() => setPageNumber((p) => Math.min(numPages ?? 1, p + 1))}
            disabled={numPages != null && pageNumber >= numPages}
            className="p-2 rounded hover:bg-white/10 disabled:opacity-40 disabled:pointer-events-none text-white"
            aria-label="Page suivante"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto flex justify-center p-4">
        <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess} loading={null}>
          <Page
            pageNumber={pageNumber}
            width={Math.min(window.innerWidth - 32, 700)}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            loading={
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-2 border-netflix-red border-t-transparent rounded-full animate-spin" />
              </div>
            }
          />
        </Document>
      </div>
    </div>
  )
}
