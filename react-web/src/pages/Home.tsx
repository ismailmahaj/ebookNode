import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getEbooks, getCoverImageUrl, type Ebook as EbookType } from '../api/ebooks'
import { BookOpen, LogOut } from 'lucide-react'

function EbookCard({ ebook }: { ebook: EbookType }) {
  return (
    <Link to={`/ebook/${ebook.id}`} className="ebook-card block cursor-pointer group">
      <div className="relative rounded overflow-hidden bg-netflix-dark">
        <img
          src={getCoverImageUrl(ebook.cover_image_url)}
          alt={ebook.title}
          className="w-full aspect-[2/3] object-cover transition duration-200 group-hover:ring-2 group-hover:ring-netflix-red"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
          <p className="text-xs text-white line-clamp-3">{ebook.description}</p>
        </div>
      </div>
      <p className="title text-netflix-white">{ebook.title}</p>
      <p className="author">{ebook.author}</p>
    </Link>
  )
}

function Carousel({ title, ebooks }: { title: string; ebooks: EbookType[] }) {
  if (!ebooks.length) return null
  return (
    <section className="mb-8">
      <h2 className="font-display text-2xl md:text-3xl tracking-wide text-white mb-3 px-4 md:px-8">
        {title}
      </h2>
      <div className="carousel-row px-4 md:px-8">
        {ebooks.map((ebook) => (
          <EbookCard key={ebook.id} ebook={ebook} />
        ))}
      </div>
    </section>
  )
}

export default function Home() {
  const { user, logout } = useAuthStore()
  const [featured, setFeatured] = useState<EbookType[]>([])
  const [trending, setTrending] = useState<EbookType[]>([])
  const [recent, setRecent] = useState<EbookType[]>([])
  const [loading, setLoading] = useState(true)
  const [heroEbook, setHeroEbook] = useState<EbookType | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [featRes, trendRes, recentRes] = await Promise.all([
          getEbooks({ featured: true, per_page: 12 }),
          getEbooks({ sort_by: 'published_at', sort_order: 'desc', per_page: 16 }),
          getEbooks({ sort_by: 'created_at', sort_order: 'desc', per_page: 16 }),
        ])
        if (cancelled) return
        setFeatured(featRes.data || [])
        setTrending(trendRes.data || [])
        setRecent(recentRes.data || [])
        const hero = (featRes.data && featRes.data[0]) || (trendRes.data && trendRes.data[0])
        setHeroEbook(hero || null)
      } catch {
        if (!cancelled) {
          setFeatured([])
          setTrending([])
          setRecent([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="min-h-screen bg-netflix-black">
      {/* Header type Netflix */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8 h-14 bg-gradient-to-b from-black/80 to-transparent transition-colors">
        <div className="flex items-center gap-6">
          <a href="/" className="flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-netflix-red" />
            <span className="font-display text-2xl tracking-wider text-white">E-BOOK</span>
          </a>
          <nav className="hidden md:flex gap-6 text-sm text-netflix-white/90">
            <Link to="/" className="hover:text-white">Accueil</Link>
            {user?.is_admin && (
              <Link to="/admin/ebooks" className="text-netflix-red hover:text-netflix-red-hover font-medium">
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-netflix-white/80 truncate max-w-[120px] md:max-w-[180px]">
            {user?.name ?? user?.email}
          </span>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 text-sm text-netflix-white/80 hover:text-netflix-red transition-colors"
            title="Déconnexion"
          >
            <LogOut className="w-4 h-5" /> <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      <main className="pt-14">
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-10 h-10 border-2 border-netflix-red border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Hero : grande bannière type Netflix */}
            {heroEbook && (
              <section className="relative h-[50vh] min-h-[320px] flex items-end pb-12 md:pb-16">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `linear-gradient(to top, var(--netflix-black) 0%, transparent 50%, rgba(0,0,0,0.4) 100%), url(${getCoverImageUrl(heroEbook.cover_image_url)})`,
                  }}
                />
                <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-8">
                  <h1 className="font-display text-4xl md:text-6xl lg:text-7xl text-white drop-shadow-lg max-w-2xl">
                    {heroEbook.title}
                  </h1>
                  <p className="text-netflix-white/90 mt-2 text-lg md:text-xl max-w-xl">
                    {heroEbook.author} · {heroEbook.total_pages} pages
                  </p>
                  <p className="text-netflix-white/80 mt-3 text-sm md:text-base line-clamp-2 max-w-2xl">
                    {heroEbook.description}
                  </p>
                  <div className="flex gap-3 mt-4">
                    <Link
                      to={heroEbook ? `/ebook/${heroEbook.id}` : '#'}
                      className="flex items-center gap-2 px-6 py-2.5 bg-netflix-red hover:bg-netflix-red-hover text-white font-semibold rounded transition-colors"
                    >
                      <BookOpen className="w-5 h-5" /> Voir le détail
                    </Link>
                  </div>
                </div>
              </section>
            )}

            {/* Carrousels */}
            <div className="pb-12 -mt-8">
              {featured.length > 0 && (
                <Carousel title="À ne pas manquer" ebooks={featured} />
              )}
              {trending.length > 0 && (
                <Carousel title="Tendances" ebooks={trending} />
              )}
              {recent.length > 0 && (
                <Carousel title="Ajouts récents" ebooks={recent} />
              )}
              {!loading && !featured.length && !trending.length && !recent.length && (
                <div className="text-center py-16 text-netflix-gray">
                  <p>Aucun livre pour le moment.</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
