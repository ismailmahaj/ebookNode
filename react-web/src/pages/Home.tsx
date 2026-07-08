import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  getEbooks,
  getCategories,
  getCoverImageUrl,
  type Ebook as EbookType,
  type CategoryWithCount,
} from '../api/ebooks'
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
  category: CategoryWithCount
  ebooks: EbookType[]
}

export default function Home() {
  const { user, logout } = useAuthStore()
  const [featured, setFeatured] = useState<EbookType[]>([])
  const [recent, setRecent] = useState<EbookType[]>([])
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [sections, setSections] = useState<CategorySection[]>([])
  const [loading, setLoading] = useState(true)
  const [heroEbook, setHeroEbook] = useState<EbookType | null>(null)

  // null = toutes les catégories (vue Netflix), sinon la catégorie sélectionnée
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [filtered, setFiltered] = useState<EbookType[]>([])
  const [filtering, setFiltering] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [featRes, recentRes, cats] = await Promise.all([
          getEbooks({ featured: true, per_page: 12 }),
          getEbooks({ sort_by: 'created_at', sort_order: 'desc', per_page: 16 }),
          getCategories(),
        ])
        if (cancelled) return

        setFeatured(featRes.data || [])
        setRecent(recentRes.data || [])
        setCategories(cats || [])

        const hero = (featRes.data && featRes.data[0]) || (recentRes.data && recentRes.data[0])
        setHeroEbook(hero || null)

        const results = await Promise.all(
          (cats || []).map(async (category) => {
            const res = await getEbooks({ category_id: category.id, per_page: 16 })
            return { category, ebooks: res.data || [] }
          })
        )
        if (!cancelled) {
          setSections(results.filter((s) => s.ebooks.length > 0))
        }
      } catch {
        if (!cancelled) {
          setFeatured([])
          setRecent([])
          setSections([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (selectedCategory === null) return
    let cancelled = false
    setFiltering(true)
    getEbooks({ category_id: selectedCategory, per_page: 48 })
      .then((res) => { if (!cancelled) setFiltered(res.data || []) })
      .catch(() => { if (!cancelled) setFiltered([]) })
      .finally(() => { if (!cancelled) setFiltering(false) })
    return () => { cancelled = true }
  }, [selectedCategory])

  const activeCategoryName = categories.find((c) => c.id === selectedCategory)?.name

  return (
    <div className="min-h-screen bg-netflix-black">
      {/* Header type Netflix */}
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
            {/* Hero : uniquement en vue "toutes catégories" */}
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

            {/* Barre de catégories (genres) */}
            {categories.length > 0 && (
              <div className={`px-4 md:px-8 ${selectedCategory === null ? '-mt-4 mb-6' : 'mt-4 mb-6'}`}>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
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
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
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

            {/* Vue filtrée : une seule catégorie en grille */}
            {selectedCategory !== null ? (
              <div className="pb-12">
                <h2 className="font-display text-2xl md:text-3xl tracking-wide text-white mb-4 px-4 md:px-8">
                  {activeCategoryName}
                </h2>
                {filtering ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-netflix-red border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : filtered.length > 0 ? (
                  <Grid ebooks={filtered} />
                ) : (
                  <p className="text-netflix-gray px-4 md:px-8 py-8">
                    Aucun livre dans cette catégorie.
                  </p>
                )}
              </div>
            ) : (
              /* Vue Netflix : rangées */
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
                {!featured.length && !recent.length && !sections.length && (
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
