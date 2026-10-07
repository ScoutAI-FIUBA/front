import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { AuthPanelHeader, AuthShell } from '@/components/auth/AuthShell'
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
    <AuthShell mode="compact">
        <AuthPanelHeader eyebrow="Cuenta" title="Verificar correo" />
        {error && (
          <Alert className="mt-5 flex items-center gap-2 border-destructive/40 bg-destructive/10 text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </Alert>
        )}
        {done && (
          <div className="mt-6 flex gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] p-4 text-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div><p className="font-semibold text-foreground">Correo verificado</p><p className="mt-1 text-muted-foreground">Tu correo quedó verificado.</p></div>
          </div>
        )}
        {!done && !error && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-muted-foreground" role="status">
            <LoaderCircle className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
            Confirmando el enlace...
          </div>
        )}
        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="font-medium text-primary hover:underline">
            Volvé a iniciar sesión
          </Link>
        </p>
    </AuthShell>
  )
}
