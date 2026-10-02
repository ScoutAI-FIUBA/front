import { type FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
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
    <div className="flex min-h-screen items-center justify-center bg-[#f5f3f4] p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-10 shadow-xl">
        <h1 className="text-2xl font-bold">Restablecer contraseña</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Te enviamos un enlace si el correo está registrado. Revisá también spam.
        </p>

        {error && (
          <Alert className="mt-4 flex items-center gap-2 border-red-200 bg-red-50 text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </Alert>
        )}

        {sent ? (
          <p className="mt-6 text-sm text-foreground">Si el correo existe, el enlace ya está en camino.</p>
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
                className="mt-1"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar enlace'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="font-medium text-primary hover:underline">
            Volver a iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
