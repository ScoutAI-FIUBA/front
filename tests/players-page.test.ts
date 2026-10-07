import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('global player rows stay compact and keep destructive actions inside the sheet', () => {
  const source = readFileSync(
    new URL('../src/pages/players/PlayersPage.tsx', import.meta.url),
    'utf8',
  )

  assert.doesNotMatch(source, /Ver detalle/)
  assert.doesNotMatch(source, /Avatar/)
  assert.doesNotMatch(source, /calcAge/)
  assert.doesNotMatch(source, /handleDelete/)
  assert.match(source, /onClick=\{\(\) => openEdit\(player\)\}/)
  assert.match(source, /GlobalPlayerSheet/)
  assert.match(source, />\s*Equipo\s*<\/span>/)
  assert.match(source, /to=\{`\/equipos\/\$\{player\.teamId\}`\}/)
  assert.match(source, /focus-visible:underline/)
})
