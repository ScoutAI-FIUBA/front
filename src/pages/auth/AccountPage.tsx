import { type FormEvent, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert } from '@/components/ui/alert'
import { useAuth } from '@/contexts/AuthContext'

export function AccountPage() {
  const { user, updateProfile, changePassword, sendEmailVerification } = useAuth()
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [profileMessage, setProfileMessage] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [verifyMessage, setVerifyMessage] = useState('')
  const [error, setError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const handleProfile = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setProfileMessage('')
    setSavingProfile(true)
    try {
      await updateProfile(fullName)
      setProfileMessage('Nombre actualizado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el nombre')
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePassword = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setPasswordMessage('')
    if (newPassword.length < 8) {
      setError('La contraseña nueva debe tener al menos 8 caracteres')
      return
    }
    setSavingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setPasswordMessage('Contraseña actualizada. Las otras sesiones se cerraron.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleVerify = async () => {
    setError('')
    setVerifyMessage('')
    try {
      await sendEmailVerification()
      setVerifyMessage('Si el correo existe, el enlace ya está en camino.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la verificación')
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Cuenta</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
      </div>

      {error && (
        <Alert className="flex items-center gap-2 border-red-200 bg-red-50 text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </Alert>
      )}

      <form onSubmit={(e) => void handleProfile(e)} className="space-y-3 rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Perfil</h2>
        <div>
          <Label htmlFor="fullName">Nombre</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
        </div>
        {profileMessage && <p className="text-sm text-muted-foreground">{profileMessage}</p>}
        <Button type="submit" disabled={savingProfile}>
          {savingProfile ? 'Guardando...' : 'Guardar nombre'}
        </Button>
      </form>

      <form onSubmit={(e) => void handlePassword(e)} className="space-y-3 rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Contraseña</h2>
        <div>
          <Label htmlFor="currentPassword">Contraseña actual</Label>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="newPassword">Contraseña nueva</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1"
          />
        </div>
        {passwordMessage && <p className="text-sm text-muted-foreground">{passwordMessage}</p>}
        <Button type="submit" disabled={savingPassword}>
          {savingPassword ? 'Guardando...' : 'Cambiar contraseña'}
        </Button>
      </form>

      <div className="space-y-3 rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Correo</h2>
        <p className="text-sm text-muted-foreground">
          {user?.emailVerified ? 'Tu correo está verificado.' : 'Tu correo todavía no está verificado.'}
        </p>
        {verifyMessage && <p className="text-sm text-muted-foreground">{verifyMessage}</p>}
        {!user?.emailVerified && (
          <Button type="button" variant="outline" onClick={() => void handleVerify()}>
            Enviar verificación
          </Button>
        )}
      </div>
    </div>
  )
}
