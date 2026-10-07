import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { AuthPanelHeader, AuthShell } from '@/components/auth/AuthShell'
import { useAuth } from '@/contexts/AuthContext'

export function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!token) {
      setError('Falta el token del enlace')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    setError('')
    setLoading(true)
    try {
      await resetPassword(token, password)
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo restablecer la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell mode="compact">
        <AuthPanelHeader
          eyebrow="Seguridad"
          title="Nueva contraseña"
          description="Elegí una contraseña de al menos 8 caracteres."
        />

        {error && (
          <Alert className="mt-5 flex items-center gap-2 border-destructive/40 bg-destructive/10 text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </Alert>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="confirm">Confirmar contraseña</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading || !token}>
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="font-medium text-primary hover:underline">
            Volvé a iniciar sesión
          </Link>
        </p>
    </AuthShell>
  )
}
