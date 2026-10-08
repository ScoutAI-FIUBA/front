import { type FormEvent, useState } from 'react'
import { AlertCircle, CheckCircle2, KeyRound, Mail, UserRound } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'

function SuccessMessage({ children }: { children: string }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-lg border border-[#28533D] bg-[#0E1C16] px-3 py-2.5 text-sm text-[#A9D8BD]"
    >
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#58B887]" />
      <span>{children}</span>
    </div>
  )
}

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
    <div className="mx-auto max-w-4xl space-y-8 pb-10">
      <header className="border-b border-[#252B37] pb-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FF6A1F]">Configuración personal</p>
        <h1 className="scout-display mt-2 text-[clamp(3rem,7vw,4.6rem)] font-extrabold leading-[0.92] text-[#F4F5F7]">Cuenta</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[#A8B0BF]">
          Actualizá tus datos personales y la seguridad de tu acceso a ScoutAI.
        </p>
        <p className="mt-2 text-sm font-medium text-[#D9DCE2]">{user?.email}</p>
      </header>

      {error ? (
        <Alert className="flex items-start gap-2 border-[#66333A] bg-[#1D1115] text-[#F1A2AB]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </Alert>
      ) : null}

      <section aria-labelledby="profile-title" className="grid gap-5 border-b border-[#252B37] pb-8 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8">
        <div>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#303744] bg-[#151922] text-[#FF8A4C]">
            <UserRound className="h-4 w-4" />
          </span>
          <h2 id="profile-title" className="scout-display mt-4 text-2xl font-bold text-[#F4F5F7]">Perfil</h2>
          <p className="mt-2 text-sm leading-6 text-[#8E97A7]">El nombre que identifica tu cuenta dentro del producto.</p>
        </div>

        <form onSubmit={(e) => void handleProfile(e)} className="space-y-4 rounded-xl border border-[#252B37] bg-[#11151D] p-5 sm:p-6">
          <div>
            <Label htmlFor="fullName">Nombre</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1.5 border-[#303744] bg-[#0B0D12]/70"
            />
          </div>
          {profileMessage ? <SuccessMessage>{profileMessage}</SuccessMessage> : null}
          <Button type="submit" disabled={savingProfile}>
            {savingProfile ? 'Guardando...' : 'Guardar nombre'}
          </Button>
        </form>
      </section>

      <section aria-labelledby="security-title" className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8">
        <div>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#303744] bg-[#151922] text-[#FF8A4C]">
            <KeyRound className="h-4 w-4" />
          </span>
          <h2 id="security-title" className="scout-display mt-4 text-2xl font-bold text-[#F4F5F7]">Seguridad</h2>
          <p className="mt-2 text-sm leading-6 text-[#8E97A7]">Administrá tu contraseña y el estado de verificación del correo.</p>
        </div>

        <div className="space-y-4">
          <form onSubmit={(e) => void handlePassword(e)} className="space-y-4 rounded-xl border border-[#252B37] bg-[#11151D] p-5 sm:p-6">
            <div>
              <p className="text-base font-semibold text-[#F4F5F7]">Contraseña</p>
              <p className="mt-1 text-sm text-[#8E97A7]">Al cambiarla, se cerrarán las demás sesiones.</p>
            </div>
            <div>
              <Label htmlFor="currentPassword">Contraseña actual</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1.5 border-[#303744] bg-[#0B0D12]/70"
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
                className="mt-1.5 border-[#303744] bg-[#0B0D12]/70"
              />
            </div>
            {passwordMessage ? <SuccessMessage>{passwordMessage}</SuccessMessage> : null}
            <Button type="submit" variant="outline" disabled={savingPassword}>
              {savingPassword ? 'Guardando...' : 'Cambiar contraseña'}
            </Button>
          </form>

          <div className="rounded-xl border border-[#252B37] bg-[#11151D] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#151922] text-[#A8B0BF]">
                <Mail className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-[#F4F5F7]">Correo electrónico</h3>
                <p className="mt-1 break-all text-sm text-[#A8B0BF]">{user?.email}</p>
                <p className="mt-2 text-sm text-[#8E97A7]">
                  {user?.emailVerified ? 'Tu correo está verificado.' : 'Tu correo todavía no está verificado.'}
                </p>
                {verifyMessage ? <div className="mt-4"><SuccessMessage>{verifyMessage}</SuccessMessage></div> : null}
                {!user?.emailVerified ? (
                  <Button type="button" variant="outline" className="mt-4" onClick={() => void handleVerify()}>
                    Enviar verificación
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
