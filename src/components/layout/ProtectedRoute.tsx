import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { CircleAlert } from 'lucide-react'
import { SessionRestoreStatus } from '@/components/auth/SessionRestoreStatus'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

export function ProtectedRoute() {
  const location = useLocation()
  const {
    isAuthenticated,
    isLoading,
    retrySessionRestore,
    sessionRestoreError,
  } = useAuth()

  if (isLoading) {
    return <SessionRestoreStatus />
  }

  if (sessionRestoreError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md text-center" role="alert">
          <CircleAlert className="mx-auto h-6 w-6 text-amber-600" aria-hidden="true" />
          <p className="mt-4 font-semibold text-foreground">No pudimos verificar tu sesión</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Puede ser un problema temporal de conexión o del servidor. Tu sesión no se cerró.
          </p>
          <Button className="mt-5" variant="outline" onClick={() => void retrySessionRestore()}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}



