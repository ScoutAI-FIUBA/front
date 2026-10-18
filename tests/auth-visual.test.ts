import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const readSource = (relativePath: string) => readFileSync(
  new URL(relativePath, import.meta.url),
  'utf8',
)

test('all public auth routes share the dark ScoutAI shell', () => {
  const pages = [
    '../src/pages/auth/LoginPage.tsx',
    '../src/pages/auth/RegisterPage.tsx',
    '../src/pages/auth/ForgotPasswordPage.tsx',
    '../src/pages/auth/ResetPasswordPage.tsx',
    '../src/pages/auth/VerifyEmailPage.tsx',
  ]

  for (const page of pages) {
    assert.match(readSource(page), /AuthShell/)
  }

  const shell = readSource('../src/components/auth/AuthShell.tsx')
  assert.match(shell, /scout-product-theme/)
  assert.match(shell, /LoginCourtBackdrop/)
  assert.match(shell, /scout-display/)
})

test('login and register keep one restrained product identity', () => {
  const login = readSource('../src/pages/auth/LoginPage.tsx')
  const register = readSource('../src/pages/auth/RegisterPage.tsx')
  const google = readSource('../src/components/auth/GoogleSignInButton.tsx')

  assert.match(login, /Videos, planteles y análisis\./)
  assert.match(register, /Videos, planteles y análisis\./)
  assert.match(login, /text-foreground\/75/)
  assert.match(google, /Continuar con Google/)
  assert.doesNotMatch(register, /Métricas|Gestión de Equipos|2024 SCOUTAI|Privacidad|Términos/)
  assert.doesNotMatch(register, /#D9CDCE/i)
  assert.match(login, /Ingresá para continuar/)
  assert.match(register, /Completá tus datos/)
})

test('recovery copy stays neutral and auth logic remains in place', () => {
  const forgot = readSource('../src/pages/auth/ForgotPasswordPage.tsx')
  const reset = readSource('../src/pages/auth/ResetPasswordPage.tsx')
  const verify = readSource('../src/pages/auth/VerifyEmailPage.tsx')

  assert.match(forgot, /Si el correo existe, el enlace ya está en camino/)
  assert.match(reset, /const token = params\.get\('token'\) \?\? ''/)
  assert.match(reset, /password\.length < 8/)
  assert.match(verify, /confirmingTokenRef\.current === token/)
  assert.match(verify, /confirmingTokenRef\.current = token/)
})
