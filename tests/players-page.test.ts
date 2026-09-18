import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('player rows expose edit and delete without an inert detail action', () => {
  const source = readFileSync(
    new URL('../src/pages/players/PlayersPage.tsx', import.meta.url),
    'utf8',
  )

  assert.doesNotMatch(source, /Ver detalle/)
  assert.match(source, /onClick=\{\(\) => openEdit\(p\)\}/)
  assert.match(source, /onClick=\{\(\) => void handleDelete\(p\)\}/)
})
