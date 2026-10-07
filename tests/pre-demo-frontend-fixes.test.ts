import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  isFutureBirthDate,
  localDateInputValue,
} from '../src/pages/players/player-birth-date.ts'

const readSource = (relativePath: string) => readFileSync(
  new URL(relativePath, import.meta.url),
  'utf8',
)

test('auth password visibility is local and does not change submitted values', () => {
  const loginSource = readSource('../src/pages/auth/LoginPage.tsx')
  const registerSource = readSource('../src/pages/auth/RegisterPage.tsx')
  const passwordFieldSource = readSource('../src/components/auth/AuthPasswordField.tsx')

  assert.match(loginSource, /visible=\{showPassword\}/)
  assert.match(loginSource, /password: submittedPassword/)

  assert.match(registerSource, /const \[showPassword, setShowPassword\] = useState\(false\)/)
  assert.match(registerSource, /const \[showConfirm, setShowConfirm\] = useState\(false\)/)
  assert.match(registerSource, /AuthPasswordField id="password"/)
  assert.match(registerSource, /await register\(\{ fullName, email, password \}\)/)
  assert.match(passwordFieldSource, /type=\{visible \? 'text' : 'password'\}/)
  assert.match(passwordFieldSource, /aria-label=\{visible \? `Ocultar/)
})

test('login uses the shared dark product auth shell', () => {
  const login = readSource('../src/pages/auth/LoginPage.tsx')
  const shell = readSource('../src/components/auth/AuthShell.tsx')

  assert.match(login, /<AuthShell/)
  assert.match(shell, /scout-product-theme/)
  assert.match(shell, /#0B0D12/)
  assert.match(shell, /#151922/)
  assert.doesNotMatch(login, /#7a4a58/i)
})

test('birth dates use the local date and reject future values', () => {
  const localDate = localDateInputValue(new Date(2026, 8, 24, 23, 59))

  assert.equal(localDate, '2026-09-24')
  assert.equal(isFutureBirthDate('2026-09-25', localDate), true)
  assert.equal(isFutureBirthDate('2026-09-24', localDate), false)
  assert.equal(isFutureBirthDate('2000-01-01', localDate), false)

  const fieldsSource = readSource('../src/pages/players/PlayerFormFields.tsx')
  const schemaSource = readSource('../src/pages/players/player-form.ts')
  const newPageSource = readSource('../src/pages/players/PlayerNewPage.tsx')
  const sheetSource = readSource('../src/pages/players/GlobalPlayerSheet.tsx')

  assert.match(fieldsSource, /max=\{localDateInputValue\(\)\}/)
  assert.match(schemaSource, /value <= localDateInputValue\(\)/)
  assert.match(newPageSource, /PlayersPage openCreateOnMount/)
  assert.match(sheetSource, /playerFormSchema/)
})

test('video description is not represented as a rival', () => {
  const typeSource = readSource('../src/types/index.ts')
  const apiSource = readSource('../src/services/api/videos.api.ts')
  const mapperSource = readSource('../src/services/api/contract-mappers.ts')
  const mockSource = readSource('../src/services/mock/videos.mock.ts')
  const pageSource = readSource('../src/pages/videos/VideosPage.tsx')

  assert.match(typeSource, /description\?: string/)
  assert.doesNotMatch(typeSource, /rivalName/)
  assert.match(mapperSource, /description: video\.description \?\? undefined/)
  assert.match(mockSource, /description: dto\.description/)
  assert.doesNotMatch(apiSource, /rivalName/)
  assert.doesNotMatch(mockSource, /rivalName/)
  assert.match(pageSource, /video\.description/)
  assert.doesNotMatch(pageSource, />Rival</)
})
