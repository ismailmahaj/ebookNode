import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { BookOpen, Check, Crown } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { subscriptionApi } from '../api/subscription'

export default function Subscription() {
  const user = useAuthStore((s) => s.user)
  const refreshUser = useAuthStore((s) => s.refreshUser)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [price, setPrice] = useState(3.99)
  const [airwallexConfigured, setAirwallexConfigured] = useState(true)

  useEffect(() => {
    let cancelled = false
    subscriptionApi.status()
      .then((data) => {
        if (cancelled) return
        setPrice(data.plan.price)
        setAirwallexConfigured(data.airwallex_configured)
        refreshUser(data.user)
      })
      .catch(() => {
        if (!cancelled) toast.error('Impossible de charger l\'abonnement')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [refreshUser])

  if (!user) return <Navigate to="/login" replace />

  if (user.is_admin || user.has_active_subscription) {
    return <Navigate to="/" replace />
  }

  const handleCheckout = async () => {
    setCheckoutLoading(true)
    try {
      const { checkout_url } = await subscriptionApi.checkout()
      window.location.href = checkout_url
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Erreur lors de l\'ouverture du paiement'
      toast.error(typeof msg === 'string' ? msg : 'Erreur lors de l\'ouverture du paiement')
      setCheckoutLoading(false)
    }
  }

  const perks = [
    'Lecture illimitée de tous les ebooks',
    'Téléchargement hors ligne (PWA)',
    'Nouveautés ajoutées régulièrement',
    'Annulation à tout moment',
  ]

  return (
    <div className="min-h-screen bg-netflix-black flex flex-col">
      <header className="flex items-center justify-center gap-2 py-8">
        <BookOpen className="w-8 h-8 text-netflix-red" />
        <span className="font-display text-2xl tracking-wider text-white">E-BOOK</span>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-12">
        <div className="max-w-lg w-full bg-netflix-dark/90 border border-white/10 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-2">
            <Crown className="w-7 h-7 text-yellow-400" />
            <h1 className="text-2xl font-bold text-white">Passez à Premium</h1>
          </div>
          <p className="text-netflix-gray mb-6">
            L&apos;aperçu gratuit est disponible sans abonnement. Pour lire un livre en entier
            et le télécharger hors ligne, abonnez-vous.
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-netflix-red border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <span className="text-4xl font-bold text-white">{price.toFixed(2).replace('.', ',')} €</span>
                <span className="text-netflix-gray ml-2">/ mois</span>
              </div>

              <ul className="space-y-3 mb-8">
                {perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-3 text-netflix-white/90">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>

              {!airwallexConfigured ? (
                <p className="text-amber-400 text-sm text-center mb-4">
                  Le paiement n&apos;est pas encore configuré sur le serveur.
                </p>
              ) : null}

              <button
                onClick={handleCheckout}
                disabled={checkoutLoading || !airwallexConfigured}
                className="w-full bg-netflix-red hover:bg-netflix-red-hover text-white font-semibold py-3 rounded transition-colors disabled:opacity-50"
              >
                {checkoutLoading ? 'Redirection...' : 'S\'abonner maintenant'}
              </button>

              <p className="text-center text-sm text-netflix-gray mt-4">
                <Link to="/" className="text-netflix-red hover:underline">
                  Continuer avec l&apos;aperçu gratuit
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
