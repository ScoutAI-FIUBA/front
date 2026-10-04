import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'

export const AUTH_SLOW_RESTORE_DELAY_MS = 8_000

export function SessionRestoreStatus() {
  const [isTakingLonger, setIsTakingLonger] = useState(false)

  useEffect(() => {
    const timer = globalThis.setTimeout(() => setIsTakingLonger(true), AUTH_SLOW_RESTORE_DELAY_MS)
    return () => globalThis.clearTimeout(timer)
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div className="max-w-md" role="status" aria-live="polite" aria-busy="true">
        <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
        <p className="mt-4 font-medium text-foreground">Restaurando tu sesión…</p>
        {isTakingLonger && (
          <p className="mt-2 text-sm text-muted-foreground">
            Está tardando más de lo habitual. Seguimos intentando verificar tu sesión.
          </p>
        )}
      </div>
    </div>
  )
}
