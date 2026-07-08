import { Link } from 'react-router-dom'

export default function SubscriptionCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-netflix-black px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Paiement annulé</h1>
        <p className="text-gray-400 mb-8">
          Vous n&apos;avez pas finalisé l&apos;abonnement. Vous pouvez réessayer à tout moment.
        </p>
        <Link
          to="/subscription"
          className="inline-block bg-netflix-red hover:bg-netflix-red-hover text-white font-medium px-6 py-3 rounded"
        >
          Réessayer l&apos;abonnement
        </Link>
      </div>
    </div>
  )
}
