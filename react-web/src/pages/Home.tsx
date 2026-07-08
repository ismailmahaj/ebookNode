import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  getEbooks,
  getCoverImageUrl,
  type Ebook as EbookType,
  type Category,
} from '../api/ebooks'
import { BookOpen, LogOut, Crown } from 'lucide-react'

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

function Grid({ ebooks }: { ebooks: EbookType[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 px-4 md:px-8">
      {ebooks.map((ebook) => (
        <EbookCard key={ebook.id} ebook={ebook} />
      ))}
    </div>
  )
}

interface CategorySection {
  category: Category
  ebooks: EbookType[]
}

function groupByCategory(ebooks: EbookType[]): CategorySection[] {
  const map = new Map<number, CategorySection>()

  for (const ebook of ebooks) {
    for (const cat of ebook.categories ?? []) {
      if (!map.has(cat.id)) {
        map.set(cat.id, { category: cat, ebooks: [] })
      }
      const section = map.get(cat.id)!
      if (!section.ebooks.some((e) => e.id === ebook.id)) {
        section.ebooks.push(ebook)
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.category.name.localeCompare(b.category.name, 'fr')
  )
}

export default function Home() {
  const { user, logout } = useAuthStore()
  const [allEbooks, setAllEbooks] = useState<EbookType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    getEbooks({ per_page: 100, sort_by: 'created_at', sort_order: 'desc' })
      .then((res) => {
        if (!cancelled) setAllEbooks(res.data || [])
      })
      .catch(() => {
        if (!cancelled) setAllEbooks([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const featured = useMemo(
    () => allEbooks.filter((e) => e.is_featured),
    [allEbooks]
  )

  const recent = useMemo(() => allEbooks.slice(0, 16), [allEbooks])

  const sections = useMemo(() => groupByCategory(allEbooks), [allEbooks])

  const categories = useMemo(
    () => sections.map((s) => s.category),
    [sections]
  )

  const heroEbook = featured[0] ?? allEbooks[0] ?? null

  const filtered = useMemo(() => {
    if (selectedCategory === null) return []
    return allEbooks.filter((e) =>
      e.categories?.some((c) => c.id === selectedCategory)
    )
  }, [allEbooks, selectedCategory])

  const activeCategoryName = categories.find((c) => c.id === selectedCategory)?.name

  return (
    <div className="min-h-screen bg-netflix-black">
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-8 h-14 bg-gradient-to-b from-black/80 to-transparent transition-colors">
        <div className="flex items-center gap-6">
          <a href="/" className="flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-netflix-red" />
            <span className="font-display text-2xl tracking-wider text-white">E-BOOK</span>
          </a>
          <nav className="flex gap-4 sm:gap-6 text-sm text-netflix-white/90">
            <Link to="/" className="hover:text-white">Accueil</Link>
            {user?.is_admin && (
              <Link to="/admin/ebooks" className="text-netflix-red hover:text-netflix-red-hover font-medium">
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          {user?.is_admin && (
            <Link
              to="/admin/ebooks/new"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded bg-netflix-red hover:bg-netflix-red-hover text-white font-medium"
            >
              + Ebook
            </Link>
          )}
          {user && !user.is_admin && !user.has_active_subscription && (
            <Link
              to="/subscription"
              className="hidden sm:inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 border border-yellow-500/30 font-medium"
            >
              <Crown className="w-4 h-4" /> S&apos;abonner
            </Link>
          )}
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
            {selectedCategory === null && heroEbook && (
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
                  {heroEbook.categories && heroEbook.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {heroEbook.categories.map((cat) => (
                        <span
                          key={cat.id}
                          className="px-2.5 py-1 rounded bg-white/15 text-white text-sm"
                        >
                          {cat.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-netflix-white/80 mt-3 text-sm md:text-base line-clamp-2 max-w-2xl">
                    {heroEbook.description}
                  </p>
                  <div className="flex gap-3 mt-4">
                    <Link
                      to={`/ebook/${heroEbook.id}`}
                      className="flex items-center gap-2 px-6 py-2.5 bg-netflix-red hover:bg-netflix-red-hover text-white font-semibold rounded transition-colors"
                    >
                      <BookOpen className="w-5 h-5" /> Voir le détail
                    </Link>
                  </div>
                </div>
              </section>
            )}

            {categories.length > 0 && (
              <div className={`px-4 md:px-8 ${selectedCategory === null ? '-mt-4 mb-6' : 'mt-4 mb-6'}`}>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === null
                        ? 'bg-netflix-red text-white'
                        : 'bg-white/10 text-netflix-white/80 hover:bg-white/20'
                    }`}
                  >
                    Tout
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        selectedCategory === cat.id
                          ? 'bg-netflix-red text-white'
                          : 'bg-white/10 text-netflix-white/80 hover:bg-white/20'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedCategory !== null ? (
              <div className="pb-12">
                <h2 className="font-display text-2xl md:text-3xl tracking-wide text-white mb-4 px-4 md:px-8">
                  {activeCategoryName}
                </h2>
                {filtered.length > 0 ? (
                  <Grid ebooks={filtered} />
                ) : (
                  <p className="text-netflix-gray px-4 md:px-8 py-8">
                    Aucun livre dans cette catégorie.
                  </p>
                )}
              </div>
            ) : (
              <div className="pb-12 -mt-4">
                {featured.length > 0 && (
                  <Carousel title="À ne pas manquer" ebooks={featured} />
                )}
                {recent.length > 0 && (
                  <Carousel title="Ajouts récents" ebooks={recent} />
                )}
                {sections.map(({ category, ebooks }) => (
                  <Carousel key={category.id} title={category.name} ebooks={ebooks} />
                ))}
                {!allEbooks.length && (
                  <div className="text-center py-16 text-netflix-gray">
                    <p>Aucun livre pour le moment.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
