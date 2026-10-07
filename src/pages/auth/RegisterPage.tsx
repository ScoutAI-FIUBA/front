import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart3, Eye, EyeOff, Mail, User, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'

export function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setError('')
    setLoading(true)
    try {
      await register({ fullName, email, password })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  const field = (id: string, label: string, type: string, value: string, onChange: (v: string) => void, placeholder: string, Icon: React.ElementType) => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1">
        <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pr-10" />
        <Icon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  )

  const passwordField = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    visible: boolean,
    onToggle: () => void,
    autoComplete: string,
  ) => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative mt-1">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          autoComplete={autoComplete}
          className="pr-10"
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={onToggle}
        >
          {visible
            ? <EyeOff className="h-4 w-4" aria-hidden="true" />
            : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f3f4]">
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl md:grid-cols-2">
          <div className="flex flex-col justify-center bg-[#D9CDCE] p-10">
            <BarChart3 className="mb-6 h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-primary">Plataforma de scouting deportivo.</h1>
            <p className="mt-4 text-primary/80">
              Creá tu cuenta para gestionar equipos, jugadores y videos de partido en ScoutAI.
            </p>
            <ul className="mt-8 space-y-3 text-sm font-medium text-primary">
              <li className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Métricas</li>
              <li className="flex items-center gap-2"><Users className="h-4 w-4" /> Gestión de Equipos</li>
            </ul>
          </div>

          <div className="p-10">
            <h2 className="text-2xl font-bold text-primary">Crear cuenta</h2>
            <p className="mt-1 text-sm text-muted-foreground">Complete sus datos para acceder a ScoutAI</p>

            {error && <Alert className="mt-4 border-red-200 bg-red-50 text-red-600">{error}</Alert>}

            <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
              {field('name', 'Nombre completo', 'text', fullName, setFullName, 'Ej. Juan Pérez', User)}
              {field('email', 'Correo electrónico', 'email', email, setEmail, 'usuario@dominio.com', Mail)}
              {passwordField(
                'password',
                'Contraseña',
                password,
                setPassword,
                showPassword,
                () => setShowPassword((visible) => !visible),
                'new-password',
              )}
              {passwordField(
                'confirm',
                'Confirmar contraseña',
                confirm,
                setConfirm,
                showConfirm,
                () => setShowConfirm((visible) => !visible),
                'new-password',
              )}
              <Button type="submit" className="w-full uppercase tracking-wide" disabled={loading}>
                {loading ? 'Creando...' : 'Crear cuenta'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm">
              ¿Ya tiene una cuenta?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">Iniciar sesión</Link>
            </p>
          </div>
        </div>
      </div>

      <footer className="flex items-center justify-between border-t bg-white px-8 py-4 text-sm">
        <div>
          <p className="font-bold">ScoutAI</p>
          <p className="text-muted-foreground">© 2024 SCOUTAI ARCHITECTURE</p>
        </div>
        <div className="text-right">
          <p className="font-bold">Soporte</p>
          <p className="text-muted-foreground">Privacidad · Términos</p>
        </div>
      </footer>
    </div>
  )
}

