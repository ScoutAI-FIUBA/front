import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const GIS_SRC = 'https://accounts.google.com/gsi/client'

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => Promise<void>
  disabled?: boolean
}

export function GoogleSignInButton({ onCredential, disabled }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onCredentialRef = useRef(onCredential)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  onCredentialRef.current = onCredential

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
    script.onerror = () => setError('No se pudo cargar Google Sign-In')
    if (!existing) document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!ready || disabled || !GOOGLE_CLIENT_ID || !containerRef.current) return
    const googleId = window.google?.accounts?.id
    if (!googleId?.initialize || !googleId.renderButton) return

    googleId.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => {
        if (!response.credential) {
          setError('No se recibió el token de Google')
          return
        }
        setError('')
        void onCredentialRef.current(response.credential)
      },
    })

    containerRef.current.innerHTML = ''
    googleId.renderButton(containerRef.current, {
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      width: Math.max(containerRef.current.offsetWidth, 280),
    })
  }, [ready, disabled])

  if (!GOOGLE_CLIENT_ID) {
    return (
      <Button type="button" variant="outline" className="w-full" disabled>
        Continuar con Google
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="flex min-h-10 w-full justify-center" />
      {!ready && !error && (
        <Button type="button" variant="outline" className="w-full" disabled>
          Continuar con Google
        </Button>
      )}
      {error && <p className="text-center text-xs text-red-300">{error}</p>}
    </div>
  )
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential?: string }) => void
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: string
              size?: string
              text?: string
              width?: number
            },
          ) => void
          prompt: () => void
        }
      }
    }
  }
}
