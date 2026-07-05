import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getAdminEbooks,
  deleteAdminEbook,
  toggleEbookVisibility,
  type AdminEbook,
} from '../../api/admin'
import { getCoverImageUrl } from '../../api/ebooks'
import { Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminEbookList() {
  const [ebooks, setEbooks] = useState<AdminEbook[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [lastPage, setLastPage] = useState(1)

  const load = async () => {
    setLoading(true)
    try {
      const res = await getAdminEbooks({
        page,
        per_page: 12,
        search: search || undefined,
      })
      setEbooks(res.data)
      setTotal(res.total)
      setLastPage(res.last_page)
    } catch {
      toast.error('Erreur lors du chargement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    load()
  }

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`Supprimer « ${title} » ?`)) return
    try {
      await deleteAdminEbook(id)
      toast.success('Ebook supprimé')
      load()
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleToggleVisibility = async (id: number) => {
    try {
      await toggleEbookVisibility(id)
      toast.success('Visibilité mise à jour')
      load()
    } catch {
      toast.error('Erreur')
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-white mb-6">Administration des ebooks</h1>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par titre, auteur…"
          className="flex-1 max-w-md bg-netflix-dark border border-white/20 rounded px-3 py-2 text-white placeholder-netflix-gray focus:ring-2 focus:ring-netflix-red outline-none"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-netflix-red hover:bg-netflix-red-hover text-white font-semibold rounded"
        >
          Rechercher
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-2 border-netflix-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : ebooks.length === 0 ? (
        <p className="text-netflix-gray py-8">Aucun ebook.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-netflix-gray text-sm">
                  <th className="pb-2 pr-4">Couverture</th>
                  <th className="pb-2 pr-4">Titre</th>
                  <th className="pb-2 pr-4">Auteur</th>
                  <th className="pb-2 pr-4">Statut</th>
                  <th className="pb-2 pr-4">Vues</th>
                  <th className="pb-2 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ebooks.map((ebook) => (
                  <tr key={ebook.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 pr-4">
                      <img
                        src={getCoverImageUrl(ebook.cover_image_url)}
                        alt=""
                        className="w-12 h-[72px] object-cover rounded"
                      />
                    </td>
                    <td className="py-3 pr-4 text-white font-medium">{ebook.title}</td>
                    <td className="py-3 pr-4 text-netflix-white/80">{ebook.author}</td>
                    <td className="py-3 pr-4">
                      <span className={`text-sm ${ebook.is_active ? 'text-green-400' : 'text-netflix-gray'}`}>
                        {ebook.is_active ? 'Actif' : 'Masqué'}
                      </span>
                      {ebook.is_featured && (
                        <span className="ml-2 text-xs bg-netflix-red/30 text-netflix-red px-1.5 rounded">
                          À la une
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-netflix-gray">{ebook.total_views ?? 0}</td>
                    <td className="py-3 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleVisibility(ebook.id)}
                          className="p-2 rounded hover:bg-white/10 text-netflix-white/80 hover:text-white"
                          title={ebook.is_active ? 'Masquer' : 'Afficher'}
                        >
                          {ebook.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <Link
                          to={`/admin/ebooks/${ebook.id}/edit`}
                          className="p-2 rounded hover:bg-white/10 text-netflix-white/80 hover:text-white"
                          title="Modifier"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(ebook.id, ebook.title)}
                          className="p-2 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {lastPage > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 rounded bg-white/10 text-white disabled:opacity-40"
              >
                Précédent
              </button>
              <span className="text-netflix-gray text-sm">
                Page {page} / {lastPage} ({total} au total)
              </span>
              <button
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={page >= lastPage}
                className="px-3 py-1 rounded bg-white/10 text-white disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
