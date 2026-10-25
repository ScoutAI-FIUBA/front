import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  playerFormHasChanges,
  playerFormSchema,
  playerFormToCreateDto,
  playerFormToDto,
  playerToFormValues,
  type PlayerFormValues,
} from '../src/pages/players/player-form.ts'
import { toPlayerPayload } from '../src/services/api/mappers.ts'
import type { Player } from '../src/types/index.ts'

const emptyOptionalForm: PlayerFormValues = {
  firstName: 'Ana',
  lastName: 'Base',
  primaryPosition: '',
  jerseyNumber: '',
  birthDate: '',
  heightCm: '',
  weightKg: '',
}

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
    firstName: 'Ana',
    lastName: 'Base',
    birthDate: null,
    heightCm: null,
    weightKg: null,
    primaryPosition: null,
    createdAt: '2026-01-01T00:00:00Z',
    teamId: null,
    ...overrides,
  }
}

test('the position selector exposes a sentinel that clears an existing position', () => {
  const fields = readFileSync(new URL('../src/pages/players/PlayerFormFields.tsx', import.meta.url), 'utf8')
  assert.match(fields, /const NO_POSITION = 'no-position'/)
  assert.match(fields, /value=\{field\.value \|\| NO_POSITION\}/)
  assert.match(fields, /value === NO_POSITION \? '' : value/)
  assert.match(fields, /<SelectItem value=\{NO_POSITION\}>Sin posición<\/SelectItem>/)
  assert.match(fields, /id="player-height" type="number" min="1" max="300" step="1"/)
  assert.match(fields, /id="player-weight" type="number" min="1" max="400" step="1"/)

  const current = player({ primaryPosition: 'PG' })
  const cleared = playerFormToDto({ ...playerToFormValues(current), primaryPosition: '' })
  assert.equal(cleared.primaryPosition, null)
  assert.equal(toPlayerPayload(cleared).primary_position, null)
  assert.equal(playerFormHasChanges(playerToFormValues(current), current), false)
  assert.equal(playerFormHasChanges({ ...playerToFormValues(current), primaryPosition: '' }, current), true)
})

test('creation without a position serializes primary_position as null', () => {
  const payload = toPlayerPayload(playerFormToCreateDto(emptyOptionalForm))
  assert.equal(payload.primary_position, null)
})

test('all five supported positions remain valid', () => {
  for (const primaryPosition of ['PG', 'SG', 'SF', 'PF', 'C']) {
    assert.equal(playerFormSchema.safeParse({ ...emptyOptionalForm, primaryPosition }).success, true, primaryPosition)
  }
})

test('height and weight accept their backend limits and remain optional', () => {
  assert.equal(playerFormSchema.safeParse(emptyOptionalForm).success, true)
  assert.equal(playerFormSchema.safeParse({ ...emptyOptionalForm, heightCm: '300', weightKg: '400' }).success, true)
})

test('height and weight reject values above the backend limits, decimals, and negatives', () => {
  for (const values of [
    { heightCm: '301' },
    { weightKg: '401' },
    { heightCm: '180.5' },
    { weightKg: '70.5' },
    { heightCm: '-1' },
    { weightKg: '-1' },
  ]) {
    assert.equal(playerFormSchema.safeParse({ ...emptyOptionalForm, ...values }).success, false, JSON.stringify(values))
  }
})

test('creation with every optional profile field empty sends nulls and no invented values', () => {
  const payload = toPlayerPayload(playerFormToCreateDto(emptyOptionalForm))
  assert.deepEqual(payload, {
    first_name: 'Ana',
    last_name: 'Base',
    birth_date: null,
    height_cm: null,
    weight_kg: null,
    primary_position: null,
    jersey_number: null,
  })
  assert.doesNotMatch(JSON.stringify(payload), /180|75/)
})

test('editing an untouched empty profile keeps nulls without introducing changes', () => {
  const current = player()
  const values = playerToFormValues(current)
  const payload = toPlayerPayload(playerFormToDto(values))

  assert.equal(playerFormHasChanges(values, current), false)
  assert.equal(payload.birth_date, null)
  assert.equal(payload.height_cm, null)
  assert.equal(payload.weight_kg, null)
  assert.equal(payload.primary_position, null)
})
