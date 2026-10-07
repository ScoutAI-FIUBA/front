import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { AuthShell } from './AuthShell'

export const AUTH_SLOW_RESTORE_DELAY_MS = 8_000

export function SessionRestoreStatus() {
  const [isTakingLonger, setIsTakingLonger] = useState(false)

  useEffect(() => {
    const timer = globalThis.setTimeout(() => setIsTakingLonger(true), AUTH_SLOW_RESTORE_DELAY_MS)
    return () => globalThis.clearTimeout(timer)
  }, [])

  return (
    <AuthShell mode="compact">
      <div className="py-5 text-center" role="status" aria-live="polite" aria-busy="true">
        <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
        <p className="mt-4 font-medium text-foreground">Restaurando tu sesión…</p>
        {isTakingLonger && (
          <p className="mt-2 text-sm text-muted-foreground">
            Está tardando más de lo habitual. Seguimos intentando verificar tu sesión.
          </p>
        )}
      </div>
    </AuthShell>
  )
}
