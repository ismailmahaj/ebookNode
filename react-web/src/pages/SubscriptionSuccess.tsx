import { Link } from 'react-router-dom'

export default function SubscriptionSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-netflix-black px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-white mb-4">Abonnement activé</h1>
        <p className="text-gray-400 mb-8">
          Votre paiement a été accepté. Vous pouvez maintenant accéder à tous les ebooks.
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
