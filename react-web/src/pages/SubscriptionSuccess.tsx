import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { subscriptionApi } from '../api/subscription'

export default function SubscriptionSuccess() {
  const refreshUser = useAuthStore((s) => s.refreshUser)
  const [syncing, setSyncing] = useState(true)

  useEffect(() => {
    let cancelled = false
    subscriptionApi.sync()
      .then((data) => {
        if (!cancelled) refreshUser(data.user)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setSyncing(false)
      })
    return () => { cancelled = true }
  }, [refreshUser])

  return (
    <div className="min-h-screen flex items-center justify-center bg-netflix-black px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Abonnement activé</h1>
        <p className="text-gray-400 mb-8">
          {syncing
            ? 'Activation de votre abonnement en cours...'
            : 'Votre paiement a été accepté. Vous pouvez maintenant lire tous les ebooks et les télécharger hors ligne.'}
        </p>
        <Link
          to="/"
          className="inline-block bg-netflix-red hover:bg-netflix-red-hover text-white font-medium px-6 py-3 rounded"
        >
          Retour au catalogue
        </Link>
      </div>
    </div>
  )
}
