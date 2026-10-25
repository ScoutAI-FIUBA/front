import assert from 'node:assert/strict'
import test from 'node:test'
import { positionLabel } from '../src/lib/positions.ts'
import {
  playerFormToCreateDto,
  playerFormToDto,
  playerToFormValues,
  type PlayerFormValues,
} from '../src/pages/players/player-form.ts'
import { mapApiPlayer, toPlayerPayload, type ApiPlayer } from '../src/services/api/mappers.ts'
import type { Player } from '../src/types/index.ts'

const completeApiPlayer: ApiPlayer = {
  id: 'player-1',
  first_name: 'Ana',
  last_name: 'Base',
  birth_date: '2000-01-01',
  height_cm: 175,
  weight_kg: 70,
  primary_position: 'PG',
  jersey_number: '7',
  team_id: 'team-1',
}

const emptyForm: PlayerFormValues = {
  firstName: 'Ana',
  lastName: 'Base',
  primaryPosition: '',
  jerseyNumber: '',
  birthDate: '',
  heightCm: '',
  weightKg: '',
}

test('API player mapping preserves complete, null, and mixed profiles without defaults', () => {
  const complete = mapApiPlayer(completeApiPlayer)
  assert.equal(complete.birthDate, '2000-01-01')
  assert.equal(complete.heightCm, 175)
  assert.equal(complete.weightKg, 70)
  assert.equal(complete.primaryPosition, 'PG')

  const nullable = mapApiPlayer({
    ...completeApiPlayer,
    birth_date: null,
    height_cm: null,
    weight_kg: null,
    primary_position: null,
  })
  assert.equal(nullable.birthDate, null)
  assert.equal(nullable.heightCm, null)
  assert.equal(nullable.weightKg, null)
  assert.equal(nullable.primaryPosition, null)

  const mixed = mapApiPlayer({
    ...completeApiPlayer,
    birth_date: null,
    weight_kg: null,
  })
  assert.equal(mixed.birthDate, null)
  assert.equal(mixed.heightCm, 175)
  assert.equal(mixed.weightKg, null)
  assert.equal(mixed.primaryPosition, 'PG')
})

test('creation without optional profile fields serializes explicit nulls and no invented values', () => {
  const dto = playerFormToCreateDto(emptyForm)
  const payload = toPlayerPayload(dto)

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

test('editing an untouched null profile keeps every optional value null', () => {
  const player: Player = {
    id: 'player-1',
    firstName: 'Ana',
    lastName: 'Base',
    birthDate: null,
    heightCm: null,
    weightKg: null,
    primaryPosition: null,
    createdAt: '2026-01-01T00:00:00Z',
    teamId: null,
  }

  assert.deepEqual(playerFormToDto(playerToFormValues(player)), {
    firstName: 'Ana',
    lastName: 'Base',
    birthDate: null,
    heightCm: null,
    weightKg: null,
    primaryPosition: null,
    jerseyNumber: undefined,
  })
})

test('editing can add and then clear each optional profile value', () => {
  const filled = playerFormToDto({
    ...emptyForm,
    primaryPosition: 'SG',
    birthDate: '2001-02-03',
    heightCm: '181',
    weightKg: '76',
  })
  assert.deepEqual(filled, {
    firstName: 'Ana',
    lastName: 'Base',
    primaryPosition: 'SG',
    jerseyNumber: undefined,
    birthDate: '2001-02-03',
    heightCm: 181,
    weightKg: 76,
  })

  assert.deepEqual(playerFormToDto(emptyForm), {
    firstName: 'Ana',
    lastName: 'Base',
    primaryPosition: null,
    jerseyNumber: undefined,
    birthDate: null,
    heightCm: null,
    weightKg: null,
  })
})

test('unknown positions have an explicit UI label', () => {
  assert.equal(positionLabel(null), 'Sin especificar')
  assert.equal(positionLabel(undefined), 'Sin especificar')
  assert.equal(positionLabel('PG'), 'Base')
})
