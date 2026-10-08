import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const readSource = (relativePath: string) => readFileSync(
  new URL(relativePath, import.meta.url),
  'utf8',
)

test('account recovery and verification routes remain integrated in the redesigned shell', () => {
  const appSource = readSource('../src/App.tsx')
  const shellSource = readSource('../src/components/layout/AppShell.tsx')

  for (const route of [
    '/recuperar-password',
    '/restablecer-password',
    '/verificar-email',
    '/cuenta',
  ]) {
    assert.match(appSource, new RegExp(`path="${route}"`))
  }
  assert.match(shellSource, /to="\/cuenta"/)
  assert.match(shellSource, /aria-label=\{`Cuenta de/)
})

test('account uses the dark product hierarchy without changing its real actions', () => {
  const accountSource = readSource('../src/pages/auth/AccountPage.tsx')

  assert.doesNotMatch(accountSource, /bg-white|bg-red-50|border-red-200/)
  assert.match(accountSource, /scout-display[^"]*">Cuenta</)
  assert.match(accountSource, /bg-\[#11151D\]/)
  assert.match(accountSource, /border-\[#66333A\] bg-\[#1D1115\]/)
  assert.match(accountSource, /updateProfile\(fullName\)/)
  assert.match(accountSource, /changePassword\(currentPassword, newPassword\)/)
  assert.match(accountSource, /sendEmailVerification\(\)/)
})

test('Google Sign-In remains disabled when no client id is configured', () => {
  const googleSource = readSource('../src/components/auth/GoogleSignInButton.tsx')

  assert.match(googleSource, /VITE_GOOGLE_CLIENT_ID/)
  assert.match(googleSource, /if \(!GOOGLE_CLIENT_ID\)/)
  assert.match(googleSource, /<Button[^>]*disabled>/)
})

test('email verification guards a single-use token from duplicate StrictMode effects', () => {
  const verifySource = readSource('../src/pages/auth/VerifyEmailPage.tsx')

  assert.match(verifySource, /confirmingTokenRef\.current === token/)
  assert.match(verifySource, /confirmingTokenRef\.current = token/)
})
