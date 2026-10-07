import { type FormEvent, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert } from '@/components/ui/alert'
import { AuthPanelHeader, AuthShell } from '@/components/auth/AuthShell'
import { AuthPasswordField } from '@/components/auth/AuthPasswordField'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { SessionRestoreStatus } from '@/components/auth/SessionRestoreStatus'
import { useAuth } from '@/contexts/AuthContext'
import { googleLoginErrorMessage, loginErrorMessage } from './login-errors'
import { loginDestination } from './login-navigation'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loginWithGoogle, isAuthenticated, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const destination = loginDestination(location.state)

  if (isLoading) return <SessionRestoreStatus />
  if (isAuthenticated) return <Navigate to={destination} replace />

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const submittedEmail = String(formData.get('email') ?? '').trim()
    const submittedPassword = String(formData.get('password') ?? '')

    if (!submittedEmail || !submittedPassword) {
      setError('Completá correo y contraseña')
      return
    }

    setError('')
    setLoading(true)
    try {
      await login({ email: submittedEmail, password: submittedPassword })
      navigate(destination, { replace: true })
    } catch (err) {
      setError(loginErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell visualTitle="Partidos, planteles y análisis.">
          <AuthPanelHeader
            eyebrow="Acceso"
            title="Iniciar sesión"
            description="Ingresá para continuar en ScoutAI."
          />

          {error && (
            <Alert className="mt-5 flex items-center gap-2 border-destructive/40 bg-destructive/10 text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </Alert>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-5">
            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@dominio.com" className="mt-1.5" />
            </div>
            <AuthPasswordField
              id="password"
              name="password"
              label="Contraseña"
              value={password}
              visible={showPassword}
              autoComplete="current-password"
              onChange={setPassword}
              onToggle={() => setShowPassword((visible) => !visible)}
              labelAction={<Link to="/recuperar-password" className="text-xs text-foreground/75 underline-offset-4 hover:text-primary hover:underline focus-visible:text-primary focus-visible:underline">¿Olvidaste tu contraseña?</Link>}
            />
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">O continuar con</span>
            <Separator className="flex-1" />
          </div>

          <GoogleSignInButton
            onCredential={async (idToken) => {
              setError('')
              setLoading(true)
              try {
                await loginWithGoogle(idToken)
                navigate(destination, { replace: true })
              } catch (err) {
                setError(googleLoginErrorMessage(err))
              } finally {
                setLoading(false)
              }
            }}
            disabled={loading}
          />

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿No tenés una cuenta?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Crear cuenta
            </Link>
          </p>
    </AuthShell>
  )
}



