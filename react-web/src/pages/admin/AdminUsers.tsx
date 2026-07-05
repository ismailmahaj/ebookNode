import { useEffect, useState } from 'react'
import { getAdminUsers, updateUserSubscription, type AdminUser } from '../../api/admin'
import { UserCheck, UserX } from 'lucide-react'
import toast from 'react-hot-toast'

function formatDate(iso: string | null): string {
  if (!iso) return '–'
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [lastPage, setLastPage] = useState(1)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [modalUser, setModalUser] = useState<AdminUser | null>(null)
  const [subscriptionEndDate, setSubscriptionEndDate] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAdminUsers({
      page,
      per_page: 15,
      search: query || undefined,
      subscription_status: filter === 'all' ? undefined : filter,
    })
      .then((res) => {
        if (!cancelled) {
          setUsers(res.data)
          setTotal(res.total)
          setLastPage(res.last_page)
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('Erreur lors du chargement des utilisateurs')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [page, filter, query])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery(search)
    setPage(1)
  }

  const openSetPayant = (user: AdminUser) => {
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    setSubscriptionEndDate(nextMonth.toISOString().slice(0, 10))
    setModalUser(user)
  }

  const submitSetPayant = async () => {
    if (!modalUser) return
    setUpdatingId(modalUser.id)
    try {
      await updateUserSubscription(modalUser.id, {
        subscription_status: 'active',
        subscription_ends_at: subscriptionEndDate || undefined,
      })
      toast.success('Abonnement activé')
      setModalUser(null)
      load()
    } catch {
      toast.error('Erreur')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleRetirerAbonnement = async (user: AdminUser) => {
    if (!window.confirm(`Retirer l'abonnement de ${user.name} ?`)) return
    setUpdatingId(user.id)
    try {
      await updateUserSubscription(user.id, { subscription_status: 'inactive' })
      toast.success('Abonnement retiré')
      load()
    } catch {
      toast.error('Erreur')
    } finally {
      setUpdatingId(null)
    }
  }

  const load = () => {
    getAdminUsers({
      page,
      per_page: 15,
      search: query || undefined,
      subscription_status: filter === 'all' ? undefined : filter,
    })
      .then((res) => {
        setUsers(res.data)
        setTotal(res.total)
        setLastPage(res.last_page)
      })
      .catch(() => toast.error('Erreur lors du chargement des utilisateurs'))
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-white mb-6">Utilisateurs</h1>
      <p className="text-netflix-gray text-sm mb-6">
        Liste de tous les utilisateurs et leur statut d&apos;abonnement (payant ou non).
      </p>

      <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou email…"
          className="flex-1 min-w-[200px] max-w-md bg-netflix-dark border border-white/20 rounded px-3 py-2 text-white placeholder-netflix-gray focus:ring-2 focus:ring-netflix-red outline-none"
        />
        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value as 'all' | 'active' | 'inactive'); setPage(1) }}
          className="bg-netflix-dark border border-white/20 rounded px-3 py-2 text-white focus:ring-2 focus:ring-netflix-red outline-none"
        >
          <option value="all">Tous</option>
          <option value="active">Abonnement actif</option>
          <option value="inactive">Sans abonnement</option>
        </select>
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
      ) : users.length === 0 ? (
        <p className="text-netflix-gray py-8">Aucun utilisateur.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-left">
              <thead className="bg-netflix-dark">
                <tr className="text-netflix-gray text-sm">
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Abonnement</th>
                  <th className="px-4 py-3">Fin d&apos;abonnement</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">Inscrit le</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white font-medium">{user.name}</td>
                    <td className="px-4 py-3 text-netflix-white/90">{user.email}</td>
                    <td className="px-4 py-3">
                      {user.has_active_subscription ? (
                        <span className="inline-flex items-center gap-1.5 text-green-400">
                          <UserCheck className="w-4 h-4" /> Payant
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-netflix-gray">
                          <UserX className="w-4 h-4" /> Non payant
                        </span>
                      )}
                      {user.is_on_trial && (
                        <span className="ml-2 text-xs bg-amber-500/20 text-amber-400 px-1.5 rounded">
                          Essai
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-netflix-white/70 text-sm">
                      {formatDate(user.subscription_ends_at)}
                    </td>
                    <td className="px-4 py-3">
                      {user.is_admin ? (
                        <span className="text-xs bg-netflix-red/30 text-netflix-red px-2 py-0.5 rounded">
                          Admin
                        </span>
                      ) : (
                        <span className="text-netflix-gray text-sm">Utilisateur</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-netflix-white/70 text-sm">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.is_admin ? (
                        <span className="text-netflix-gray text-xs">–</span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {user.has_active_subscription ? (
                            <button
                              type="button"
                              onClick={() => handleRetirerAbonnement(user)}
                              disabled={updatingId === user.id}
                              className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                            >
                              {updatingId === user.id ? '…' : 'Retirer l\'abonnement'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openSetPayant(user)}
                              disabled={updatingId === user.id}
                              className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50"
                            >
                              Passer en payant
                            </button>
                          )}
                        </div>
                      )}
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
                Page {page} / {lastPage} ({total} utilisateur{total > 1 ? 's' : ''})
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

      {modalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-netflix-dark rounded-lg border border-white/10 p-6 max-w-sm w-full">
            <h3 className="font-display text-xl text-white mb-2">Passer en payant</h3>
            <p className="text-netflix-gray text-sm mb-4">
              {modalUser.name} ({modalUser.email})
            </p>
            <div className="mb-4">
              <label className="block text-sm text-netflix-white/80 mb-1">Fin d&apos;abonnement</label>
              <input
                type="date"
                value={subscriptionEndDate}
                onChange={(e) => setSubscriptionEndDate(e.target.value)}
                className="w-full bg-netflix-black border border-white/20 rounded px-3 py-2 text-white"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setModalUser(null)}
                className="px-3 py-1.5 rounded bg-white/10 text-white"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={submitSetPayant}
                disabled={updatingId !== null}
                className="px-3 py-1.5 rounded bg-netflix-red text-white font-semibold disabled:opacity-50"
              >
                {updatingId !== null ? 'Enregistrement…' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
