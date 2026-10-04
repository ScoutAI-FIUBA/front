import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'

export function VerifyEmailPage() {
  const { confirmEmailVerification } = useAuth()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const confirmingTokenRef = useRef<string | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('Falta el token del enlace')
      return
    }
    if (confirmingTokenRef.current === token) return
    confirmingTokenRef.current = token
    void confirmEmailVerification(token)
      .then(() => setDone(true))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'No se pudo verificar el correo')
      })
  }, [confirmEmailVerification, token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f3f4] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-xl">
        <h1 className="text-2xl font-bold">Verificar correo</h1>
        {error && (
          <Alert className="mt-4 flex items-center gap-2 border-red-200 bg-red-50 text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </Alert>
        )}
        {done && <p className="mt-4 text-sm">Tu correo quedó verificado.</p>}
        {!done && !error && <p className="mt-4 text-sm text-muted-foreground">Confirmando el enlace...</p>}
        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="font-medium text-primary hover:underline">
            Ir a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
