import { type FormEvent, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert } from '@/components/ui/alert'
import { LoginCourtBackdrop } from '@/components/auth/LoginCourtBackdrop'
import { useAuth } from '@/contexts/AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isLoading) return null
  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const submittedEmail = String(formData.get('email') ?? '').trim()
    const submittedPassword = String(formData.get('password') ?? '')

    if (!submittedEmail || !submittedPassword) {
      setError('Completa correo y contraseña')
      return
    }

    setError('')
    setLoading(true)
    try {
      await login({ email: submittedEmail, password: submittedPassword })
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f3f4] p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-xl md:grid-cols-2">
        <div className="relative flex flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground">
          <LoginCourtBackdrop />
          <p className="relative text-lg font-bold">ScoutAI</p>
          <div className="relative">
            <h1 className="text-3xl font-bold leading-tight">Gestión de scouting deportivo.</h1>
            <p className="mt-4 text-primary-foreground">
              Gestiona equipos, jugadores y videos de partido desde un mismo lugar.
            </p>
          </div>
          <p className="relative text-xs text-primary-foreground">ScoutAI MVP</p>
        </div>

        <div className="p-10">
          <h2 className="text-2xl font-bold">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-muted-foreground">Plataforma de scouting y análisis deportivo</p>

          {error && (
            <Alert className="mt-4 flex items-center gap-2 border-red-200 bg-red-50 text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </Alert>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@scoutai.com" className="mt-1" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <button type="button" className="text-xs text-primary hover:underline">¿Olvidó su contraseña?</button>
              </div>
              <div className="relative mt-1">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                    : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">O continuar con</span>
            <Separator className="flex-1" />
          </div>

          <Button variant="outline" className="w-full" disabled>
            Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            ¿No tiene una cuenta?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">
              Crear cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}



