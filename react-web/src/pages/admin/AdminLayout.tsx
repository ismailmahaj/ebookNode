import { Outlet, Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { BookPlus, LogOut } from 'lucide-react'

export default function AdminLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-netflix-black">
      <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 md:px-8 bg-netflix-dark border-b border-white/10">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-display text-xl tracking-wider text-white">
            E-BOOK
          </Link>
          <nav className="flex gap-4">
            <Link
              to="/admin/ebooks"
              className="text-sm text-netflix-white/80 hover:text-white transition-colors"
            >
              Ebooks
            </Link>
            <Link
              to="/admin/ebooks/new"
              className="flex items-center gap-1.5 text-sm text-netflix-red hover:text-netflix-red-hover"
            >
              <BookPlus className="w-4 h-4" /> Ajouter un ebook
            </Link>
            <Link
              to="/admin/users"
              className="text-sm text-netflix-white/80 hover:text-white transition-colors"
            >
              Utilisateurs
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-netflix-gray truncate max-w-[140px]">
            {user?.email}
          </span>
          <button
            onClick={() => { logout(); navigate('/') }}
            className="flex items-center gap-1.5 text-sm text-netflix-white/80 hover:text-white"
          >
            <LogOut className="w-4 h-4" /> Quitter l’admin
          </button>
        </div>
      </header>
      <main className="p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}
