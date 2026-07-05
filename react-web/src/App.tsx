import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import EbookDetail from './pages/EbookDetail'
import EbookReader from './pages/EbookReader'
import AdminLayout from './pages/admin/AdminLayout'
import AdminEbookList from './pages/admin/AdminEbookList'
import AdminEbookForm from './pages/admin/AdminEbookForm'
import AdminUsers from './pages/admin/AdminUsers'
import SubscriptionSuccess from './pages/SubscriptionSuccess'
import SubscriptionCancel from './pages/SubscriptionCancel'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user?.is_admin) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-netflix-black">
      <div className="w-10 h-10 border-2 border-netflix-red border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function App() {
  const [mounted, setMounted] = useState(false)
  const checkAuth = useAuthStore((s) => s.checkAuth)

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        await checkAuth()
      } catch {
        // ignore
      }
      if (!cancelled) setMounted(true)
    }
    init()
    return () => { cancelled = true }
  }, [checkAuth])

  if (!mounted) return <AppLoading />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/subscription/success" element={<SubscriptionSuccess />} />
        <Route path="/subscription/cancel" element={<SubscriptionCancel />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ebook/:id"
          element={
            <ProtectedRoute>
              <EbookDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ebook/:id/read"
          element={
            <ProtectedRoute>
              <EbookReader />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="/admin/ebooks" replace />} />
          <Route path="ebooks" element={<AdminEbookList />} />
          <Route path="ebooks/new" element={<AdminEbookForm />} />
          <Route path="ebooks/:id/edit" element={<AdminEbookForm />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
