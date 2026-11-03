import { useEffect } from 'react'
import { useNavigate, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore.js'

export default function ProtectedRoute({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading, accountReady, error, initialize, signOut } = useAuthStore()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth/login')
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  if (!accountReady) {
    return <div className="min-h-screen flex items-center justify-center p-6"><div className="max-w-md space-y-4" role="alert">
      <h1 className="text-xl font-semibold">Finish connecting your account</h1>
      <p>{error || 'Your session is saved. Retry to connect it to your Codeva account.'}</p>
      <div className="flex gap-4"><button onClick={initialize} className="px-4 py-2 rounded-lg bg-accent text-white">Try again</button><button onClick={signOut} className="px-4 py-2 rounded-lg border">Sign out</button></div>
    </div></div>
  }

  return children
}
