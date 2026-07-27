import { useEffect, useState } from 'react'
import {
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  type AdminCategory,
} from '../../api/admin'
import { Pencil, Trash2, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminCategories() {
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<AdminCategory | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      setCategories(await getAdminCategories())
    } catch {
      toast.error('Erreur lors du chargement des catégories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setName('')
    setDescription('')
    setShowForm(true)
  }

  const openEdit = (cat: AdminCategory) => {
    setEditing(cat)
    setName(cat.name)
    setDescription(cat.description ?? '')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
    setName('')
    setDescription('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Le nom est requis')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await updateAdminCategory(editing.id, {
          name: name.trim(),
          description: description.trim() || undefined,
        })
        toast.success('Catégorie mise à jour')
      } else {
        await createAdminCategory({
          name: name.trim(),
          description: description.trim() || undefined,
        })
        toast.success('Catégorie créée')
      }
      closeForm()
      await load()
    } catch (err: unknown) {
      let msg = 'Erreur lors de l\'enregistrement'
      if (err && typeof err === 'object' && 'response' in err) {
        const res = (err as { response?: { data?: { message?: string } } }).response?.data
        if (res?.message) msg = res.message
      }
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cat: AdminCategory) => {
    if (!window.confirm(`Supprimer la catégorie « ${cat.name} » ?`)) return
    try {
      await deleteAdminCategory(cat.id)
      toast.success('Catégorie supprimée')
      await load()
    } catch (err: unknown) {
      let msg = 'Impossible de supprimer'
      if (err && typeof err === 'object' && 'response' in err) {
        const res = (err as { response?: { data?: { message?: string } } }).response?.data
        if (res?.message) msg = res.message
      }
      toast.error(msg)
    }
  }

  const inputClass =
    'w-full bg-netflix-dark border border-white/20 rounded px-3 py-2 text-white placeholder-netflix-gray focus:ring-2 focus:ring-netflix-red outline-none'
  const labelClass = 'block text-sm font-medium text-netflix-white/80 mb-1'

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-3xl text-white">Catégories</h1>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-netflix-red hover:bg-netflix-red-hover text-white font-semibold rounded"
        >
          <Plus className="w-4 h-4" /> Ajouter une catégorie
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-8 max-w-xl p-4 border border-white/10 rounded bg-netflix-dark/80 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg text-white">
              {editing ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            </h2>
            <button type="button" onClick={closeForm} className="text-netflix-gray hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div>
            <label className={labelClass}>Nom *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Ex. Thriller"
              required
              autoFocus
            />
          </div>
          <div>
            <label className={labelClass}>Description (optionnel)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
              rows={3}
              placeholder="Courte description de la catégorie"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-netflix-red hover:bg-netflix-red-hover text-white font-semibold rounded disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : editing ? 'Mettre à jour' : 'Créer'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-2 border-netflix-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <p className="text-netflix-gray">Aucune catégorie. Créez-en une pour classer vos ebooks.</p>
      ) : (
        <div className="overflow-x-auto border border-white/10 rounded">
          <table className="w-full text-left text-sm">
            <thead className="bg-netflix-dark text-netflix-white/70">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Ebooks</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-t border-white/10 hover:bg-white/5">
                  <td className="px-4 py-3 text-white font-medium">{cat.name}</td>
                  <td className="px-4 py-3 text-netflix-gray">{cat.slug}</td>
                  <td className="px-4 py-3 text-netflix-white/70 max-w-xs truncate">
                    {cat.description || '–'}
                  </td>
                  <td className="px-4 py-3 text-netflix-white/80">{cat.ebook_count ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(cat)}
                        className="p-2 rounded hover:bg-white/10 text-netflix-white/80 hover:text-white"
                        title="Modifier"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat)}
                        className="p-2 rounded hover:bg-white/10 text-netflix-white/80 hover:text-netflix-red"
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
      )}
    </div>
  )
}
