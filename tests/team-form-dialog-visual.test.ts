import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(
  new URL('../src/pages/teams/TeamFormDialog.tsx', import.meta.url),
  'utf8',
)

test('Nuevo equipo owns its dark portal surface and readable text colors', () => {
  assert.match(source, /DialogContent className="scout-product-theme min-h-0/)
  assert.match(source, /bg-\[#151922\]/)
  assert.match(source, /text-\[#F4F5F7\]/)
  assert.match(source, /border-\[#303744\]/)
  assert.match(source, /DialogTitle className="scout-display text-2xl font-bold text-\[#F4F5F7\]"/)
  assert.match(source, /DialogDescription className="text-\[#A3ABBA\]"/)
})

test('team fields keep labels, values, placeholders and focus visible on dark backgrounds', () => {
  assert.match(source, /const labelClassName = 'text-\[#E3E6EB\]'/)
  assert.match(source, /bg-\[#11151D\] text-\[#F4F5F7\]/)
  assert.match(source, /placeholder:text-\[#7D8698\]/)
  assert.match(source, /focus-visible:border-\[#FF6A1F\]/)
  assert.match(source, /focus-visible:ring-\[#FF6A1F\]\/30/)
  assert.equal(source.match(/className=\{inputClassName\}/g)?.length, 4)
  assert.equal(source.match(/className=\{labelClassName\}/g)?.length, 4)
  assert.equal(source.match(/placeholder="Ej\./g)?.length, 4)
})

test('team dialog actions and validation feedback remain legible and accessible', () => {
  assert.match(source, /role="alert"/)
  assert.match(source, /bg-\[#2A1519\][^"']*text-\[#FF9AA5\]/)
  assert.match(source, /border-\[#3A4254\] bg-transparent text-\[#D5D9E1\]/)
  assert.match(source, /bg-\[#FF6A1F\] text-\[#0B0D12\]/)
  assert.match(source, /focus-visible:ring-offset-\[#151922\]/)
  assert.match(source, /\[&>button:focus-visible\]:ring-2/)
})

test('the visual fix does not change team submission or cancellation behavior', () => {
  assert.match(source, /await onSubmit\(values\)/)
  assert.match(source, /onClick=\{\(\) => onOpenChange\(false\)\}/)
  assert.match(source, /disabled=\{submitting\}/)
})
