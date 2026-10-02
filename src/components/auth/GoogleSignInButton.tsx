import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const GIS_SRC = 'https://accounts.google.com/gsi/client'

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => Promise<void>
  disabled?: boolean
}

export function GoogleSignInButton({ onCredential, disabled }: GoogleSignInButtonProps) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`)
    if (existing && window.google?.accounts?.id) {
      setReady(true)
      return
    }
    const script = existing ?? document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = () => setReady(true)
    if (!existing) document.head.appendChild(script)
  }, [])

  const handleClick = async () => {
    if (!GOOGLE_CLIENT_ID || !window.google?.accounts?.id) {
      setError('Google no está configurado')
      return
    }
    setError('')
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (!response.credential) return
        void onCredential(response.credential)
      },
    })
    window.google.accounts.id.prompt()
  }

  const unavailable = !GOOGLE_CLIENT_ID || disabled || !ready

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" className="w-full" disabled={unavailable} onClick={() => void handleClick()}>
        Google
      </Button>
      {error && <p className="text-center text-xs text-red-600">{error}</p>}
    </div>
  )
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential?: string }) => void }) => void
          prompt: () => void
        }
      }
    }
  }
}
