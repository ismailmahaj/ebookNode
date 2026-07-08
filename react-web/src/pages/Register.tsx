import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuthStore } from '../store/authStore'
import { BookOpen } from 'lucide-react'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const register = useAuthStore((s) => s.register)
  const isLoading = useAuthStore((s) => s.isLoading)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const navigate = useNavigate()

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password || !passwordConfirmation) {
      toast.error('Remplissez tous les champs')
      return
    }
    if (password !== passwordConfirmation) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    try {
      await register({ name, email, password, password_confirmation: passwordConfirmation })
      toast.success('Inscription réussie')
      navigate('/subscription', { replace: true })
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : 'Erreur d\'inscription'
      toast.error(typeof msg === 'string' ? msg : 'Erreur d\'inscription')
    }
  }

  return (
    <div className="min-h-screen bg-netflix-black flex flex-col justify-center px-4">
      <div className="max-w-sm w-full mx-auto">
        <div className="flex justify-center gap-2 mb-8">
          <BookOpen className="w-10 h-10 text-netflix-red" />
          <span className="font-display text-2xl tracking-wider text-white">E-BOOK</span>
        </div>
        <form onSubmit={handleSubmit} className="bg-netflix-dark/90 rounded-lg p-6 space-y-4 border border-white/10">
          <h2 className="text-xl font-semibold text-white">Inscription</h2>
          <div>
            <label className="block text-sm font-medium text-netflix-white/80 mb-1">Nom</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black/40 border border-white/20 rounded px-3 py-2.5 text-white placeholder-netflix-gray focus:ring-2 focus:ring-netflix-red focus:border-netflix-red outline-none"
              placeholder="Votre nom"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-netflix-white/80 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/20 rounded px-3 py-2.5 text-white placeholder-netflix-gray focus:ring-2 focus:ring-netflix-red focus:border-netflix-red outline-none"
              placeholder="vous@exemple.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-netflix-white/80 mb-1">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/20 rounded px-3 py-2.5 text-white placeholder-netflix-gray focus:ring-2 focus:ring-netflix-red focus:border-netflix-red outline-none"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-netflix-white/80 mb-1">Confirmer le mot de passe</label>
            <input
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              className="w-full bg-black/40 border border-white/20 rounded px-3 py-2.5 text-white placeholder-netflix-gray focus:ring-2 focus:ring-netflix-red focus:border-netflix-red outline-none"
              autoComplete="new-password"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-netflix-red hover:bg-netflix-red-hover text-white font-semibold py-2.5 rounded transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Inscription...' : 'S\'inscrire'}
          </button>
          <p className="text-sm text-center text-netflix-gray">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-netflix-red hover:underline">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
