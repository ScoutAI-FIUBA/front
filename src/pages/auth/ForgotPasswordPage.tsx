import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { AuthPanelHeader, AuthShell } from '@/components/auth/AuthShell'
import { useAuth } from '@/contexts/AuthContext'

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const submittedEmail = String(new FormData(e.currentTarget).get('email') ?? '').trim()
    if (!submittedEmail) {
      setError('Ingresá tu correo')
      return
    }
    setError('')
    setLoading(true)
    try {
      await requestPasswordReset(submittedEmail)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el correo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell mode="compact">
        <AuthPanelHeader
          eyebrow="Acceso"
          title="Recuperar contraseña"
          description="Ingresá tu correo. Si está registrado, te enviaremos un enlace para crear una nueva contraseña."
        />

        {error && (
          <Alert className="mt-5 flex items-center gap-2 border-destructive/40 bg-destructive/10 text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </Alert>
        )}

        {sent ? (
          <div className="mt-6 rounded-xl border border-primary/25 bg-primary/[0.07] p-4">
            <p className="font-semibold text-foreground">Revisá tu correo</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Si el correo existe, el enlace ya está en camino. Revisá también spam.</p>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5"
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="font-medium text-primary hover:underline">
            Volvé a iniciar sesión
          </Link>
        </p>
    </AuthShell>
  )
}
