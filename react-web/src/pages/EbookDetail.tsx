import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getEbook, getCoverImageUrl, type Ebook } from '../api/ebooks'
import { BookOpen, ArrowLeft, FileText } from 'lucide-react'

export default function EbookDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [ebook, setEbook] = useState<Ebook | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    getEbook(Number(id))
      .then((data) => {
        if (!cancelled) setEbook(data)
      })
      .catch(() => {
        if (!cancelled) setError('Livre introuvable')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-netflix-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-netflix-red border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !ebook) {
    return (
      <div className="min-h-screen bg-netflix-black flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-netflix-gray">{error ?? 'Livre introuvable'}</p>
        <Link to="/" className="text-netflix-red hover:underline">
          Retour à l'accueil
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-netflix-black">
      {/* Header simple */}
      <header className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 md:px-8 h-14 bg-gradient-to-b from-black/90 to-transparent">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-netflix-white/90 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Retour
        </button>
        <Link to="/" className="font-display text-xl tracking-wider text-white">
          E-BOOK
        </Link>
        <div className="w-20" />
      </header>

      <main className="pt-14 pb-12">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row gap-8 md:gap-12">
            {/* Couverture */}
            <div className="flex-shrink-0 w-full md:w-72 lg:w-80">
              <img
                src={getCoverImageUrl(ebook.cover_image_url)}
                alt={ebook.title}
                className="w-full aspect-[2/3] object-cover rounded-lg shadow-2xl"
              />
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl text-white leading-tight">
                {ebook.title}
              </h1>
              <p className="text-netflix-red font-semibold mt-2">{ebook.author}</p>

              {ebook.categories && ebook.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {ebook.categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="px-2.5 py-1 rounded bg-white/10 text-netflix-white/90 text-sm"
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-4 mt-4 text-netflix-gray text-sm">
                <span>{ebook.total_pages} pages</span>
                {ebook.isbn && <span>ISBN {ebook.isbn}</span>}
              </div>

              <p className="text-netflix-white/90 mt-6 leading-relaxed whitespace-pre-line">
                {ebook.description}
              </p>

              <div className="flex flex-wrap gap-4 mt-8">
                <Link
                  to={`/ebook/${ebook.id}/read?preview=1`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-netflix-red hover:bg-netflix-red-hover text-white font-semibold rounded transition-colors"
                >
                  <FileText className="w-5 h-5" /> Lire l'aperçu
                </Link>
                <Link
                  to={`/ebook/${ebook.id}/read`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-netflix-card-bg hover:bg-white/20 text-white font-semibold rounded border border-white/20 transition-colors"
                >
                  <BookOpen className="w-5 h-5" /> Lire le livre
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
