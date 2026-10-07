import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { AuthPanelHeader, AuthShell } from '@/components/auth/AuthShell'
import { AuthPasswordField } from '@/components/auth/AuthPasswordField'
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
      setError(err instanceof Error ? err.message : 'No pudimos crear tu cuenta. Intentá nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const field = (id: string, label: string, type: string, value: string, onChange: (v: string) => void, placeholder: string) => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1.5" />
    </div>
  )

  return (
    <AuthShell panelWidth="wide" visualTitle="Partidos, planteles y análisis.">
            <AuthPanelHeader
              eyebrow="Nuevo acceso"
              title="Crear cuenta"
              description="Completá tus datos para empezar a usar ScoutAI."
            />

            {error && <Alert className="mt-5 border-destructive/40 bg-destructive/10 text-red-200">{error}</Alert>}

            <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
              {field('name', 'Nombre completo', 'text', fullName, setFullName, 'Ej. Juan Pérez')}
              {field('email', 'Correo electrónico', 'email', email, setEmail, 'usuario@dominio.com')}
              <AuthPasswordField id="password" label="Contraseña" value={password} visible={showPassword} autoComplete="new-password" onChange={setPassword} onToggle={() => setShowPassword((visible) => !visible)} />
              <AuthPasswordField id="confirm" label="Confirmar contraseña" value={confirm} visible={showConfirm} autoComplete="new-password" onChange={setConfirm} onToggle={() => setShowConfirm((visible) => !visible)} />
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Creando...' : 'Crear cuenta'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              ¿Ya tenés una cuenta?{' '}
              <Link to="/login" className="font-medium text-primary hover:underline">Iniciar sesión</Link>
            </p>
    </AuthShell>
  )
}

