import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeJerseyNumber } from '../src/lib/jersey.ts'

test('jersey numbers compare by value', () => {
  assert.equal(normalizeJerseyNumber('07'), '7')
  assert.equal(normalizeJerseyNumber('7'), '7')
  assert.equal(normalizeJerseyNumber('00'), '00')
  assert.equal(normalizeJerseyNumber('0'), '0')
  assert.equal(normalizeJerseyNumber('10'), '10')
  assert.equal(normalizeJerseyNumber(' 8 '), '8')
})
