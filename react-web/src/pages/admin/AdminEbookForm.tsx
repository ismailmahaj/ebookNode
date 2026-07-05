import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  getAdminCategories,
  getAdminEbook,
  createAdminEbook,
  updateAdminEbook,
  type AdminCategory,
} from '../../api/admin'
import toast from 'react-hot-toast'
import { ArrowLeft } from 'lucide-react'

export default function AdminEbookForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [description, setDescription] = useState('')
  const [isbn, setIsbn] = useState('')
  const [categoryIds, setCategoryIds] = useState<number[]>([])
  const [previewPages, setPreviewPages] = useState(10)
  const [isFeatured, setIsFeatured] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [publishedAt, setPublishedAt] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)

  useEffect(() => {
    getAdminCategories().then(setCategories).catch(() => toast.error('Erreur catégories'))
  }, [])

  useEffect(() => {
    if (!id) return
    getAdminEbook(Number(id))
      .then(({ ebook }) => {
        setTitle(ebook.title)
        setAuthor(ebook.author)
        setDescription(ebook.description)
        setIsbn(ebook.isbn ?? '')
        setCategoryIds(ebook.categories?.map((c) => c.id) ?? [])
        setPreviewPages(ebook.preview_pages ?? 10)
        setIsFeatured(ebook.is_featured ?? false)
        setIsActive(ebook.is_active ?? true)
        setPublishedAt(ebook.published_at ? ebook.published_at.slice(0, 10) : '')
      })
      .catch(() => toast.error('Ebook introuvable'))
      .finally(() => setLoading(false))
  }, [id])

  const handleCategoryChange = (catId: number, checked: boolean) => {
    setCategoryIds((prev) =>
      checked ? [...prev, catId] : prev.filter((c) => c !== catId)
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !author.trim() || !description.trim()) {
      toast.error('Titre, auteur et description sont requis')
      return
    }
    if (categoryIds.length === 0) {
      toast.error('Sélectionnez au moins une catégorie')
      return
    }
    if (!isEdit && (!pdfFile || !coverFile)) {
      toast.error('Fichier PDF et image de couverture sont requis')
      return
    }

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('title', title.trim())
      formData.append('author', author.trim())
      formData.append('description', description.trim())
      formData.append('category_ids', JSON.stringify(categoryIds))
      formData.append('preview_pages', String(previewPages))
      formData.append('is_featured', isFeatured ? '1' : '0')
      formData.append('is_active', isActive ? '1' : '0')
      if (isbn.trim()) formData.append('isbn', isbn.trim())
      if (publishedAt) formData.append('published_at', publishedAt)
      if (pdfFile) formData.append('pdf_file', pdfFile)
      if (coverFile) formData.append('cover_image', coverFile)

      if (isEdit) {
        await updateAdminEbook(Number(id), formData)
        toast.success('Ebook mis à jour')
      } else {
        await createAdminEbook(formData)
        toast.success('Ebook créé')
      }
      navigate('/admin/ebooks')
    } catch (err: unknown) {
      let msg = 'Erreur lors de l\'enregistrement'
      if (err && typeof err === 'object' && 'response' in err) {
        const res = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } }).response?.data
        if (res?.errors && Object.keys(res.errors).length > 0) {
          msg = Object.entries(res.errors)
            .map(([field, list]) => `${field}: ${list.join(', ')}`)
            .join(' — ')
          if (import.meta.env.DEV) console.error('Validation 422:', res.errors)
        } else if (res?.message) {
          msg = res.message
        }
      }
      toast.error(msg, { duration: 6000 })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-10 h-10 border-2 border-netflix-red border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const inputClass =
    'w-full bg-netflix-dark border border-white/20 rounded px-3 py-2 text-white placeholder-netflix-gray focus:ring-2 focus:ring-netflix-red outline-none'
  const labelClass = 'block text-sm font-medium text-netflix-white/80 mb-1'

  return (
    <div>
      <Link
        to="/admin/ebooks"
        className="inline-flex items-center gap-2 text-netflix-white/80 hover:text-white mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Retour à la liste
      </Link>
      <h1 className="font-display text-3xl text-white mb-6">
        {isEdit ? 'Modifier l\'ebook' : 'Ajouter un ebook'}
      </h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        <div>
          <label className={labelClass}>Titre *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Auteur *</label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Description *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            rows={4}
            required
          />
        </div>
        <div>
          <label className={labelClass}>ISBN (optionnel)</label>
          <input
            type="text"
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Catégories * (au moins une)</label>
          <div className="flex flex-wrap gap-3 pt-2">
            {categories.map((cat) => (
              <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={categoryIds.includes(cat.id)}
                  onChange={(e) => handleCategoryChange(cat.id, e.target.checked)}
                  className="rounded border-white/30 text-netflix-red focus:ring-netflix-red"
                />
                <span className="text-netflix-white/90">{cat.name}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Pages d’aperçu</label>
            <input
              type="number"
              min={1}
              max={100}
              value={previewPages}
              onChange={(e) => setPreviewPages(Number(e.target.value) || 10)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Date de publication</label>
            <input
              type="date"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="rounded border-white/30 text-netflix-red focus:ring-netflix-red"
            />
            <span className="text-netflix-white/90">À la une</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-white/30 text-netflix-red focus:ring-netflix-red"
            />
            <span className="text-netflix-white/90">Visible</span>
          </label>
        </div>
        <div>
          <label className={labelClass}>
            Fichier PDF {isEdit ? '(optionnel, laisser vide pour ne pas changer)' : '*'}
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-netflix-white/80 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-netflix-red file:text-white"
          />
        </div>
        <div>
          <label className={labelClass}>
            Image de couverture {isEdit ? '(optionnel)' : '*'}
          </label>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-netflix-white/80 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-netflix-red file:text-white"
          />
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-netflix-red hover:bg-netflix-red-hover text-white font-semibold rounded disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : isEdit ? 'Mettre à jour' : 'Créer l\'ebook'}
          </button>
          <Link
            to="/admin/ebooks"
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded"
          >
            Annuler
          </Link>
        </div>
      </form>
    </div>
  )
}
