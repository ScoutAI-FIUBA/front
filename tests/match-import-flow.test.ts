import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiNetworkError, ApiResponseError, ApiTimeoutError } from '../src/services/api/errors.ts'
import { MatchApiError, parseMatchErrorBody, teamMismatchDetails } from '../src/services/api/matches.client.ts'
import type { MatchErrorCode } from '../src/services/api/matches.client.ts'
import { readFileSync } from 'node:fs'
import { emptyMatchFormValues, matchFormSchema, matchFormToCreateInput } from '../src/pages/partidos/match-form.ts'
import {
  MAX_STATS_FILE_BYTES,
  fileCountsSummary,
  fileSizeLabel,
  linkedSummary,
  playedSummary,
  rejectedFileMessage,
  matchErrorCopy,
  mismatchMessage,
  runCreateWithStats,
  translateImportWarning,
  unlinkedReasonLabel,
  validateStatsFile,
} from '../src/pages/partidos/match-import.ts'
import type { MatchRecord, MatchStatsSavePayload, MatchWithParticipants } from '../src/types/index.ts'

const valid = { homeTeamId: 'a', awayTeamId: 'b', matchDate: '2026-10-24', description: '' }

function messages(input: unknown): Record<string, string> {
  const result = matchFormSchema.safeParse(input)
  assert.equal(result.success, false)
  const out: Record<string, string> = {}
  if (!result.success) for (const issue of result.error.issues) out[String(issue.path[0])] = issue.message
  return out
}

test('form schema accepts a valid match, including a future date', () => {
  assert.equal(matchFormSchema.safeParse(valid).success, true)
  assert.equal(matchFormSchema.safeParse({ ...valid, matchDate: '2031-01-01' }).success, true)
})

test('form schema requires both teams and rejects the same team on both sides', () => {
  assert.equal(messages({ ...valid, homeTeamId: '' }).homeTeamId, 'Elegí el equipo local')
  assert.ok(messages({ ...valid, awayTeamId: '' }).awayTeamId)
  assert.equal(messages({ ...valid, awayTeamId: 'a' }).awayTeamId, 'Elegí un equipo distinto al local')
})

test('form schema checks the date shape and the trimmed description length', () => {
  assert.ok(messages({ ...valid, matchDate: '' }).matchDate)
  assert.ok(messages({ ...valid, matchDate: '24/10/2026' }).matchDate)
  assert.equal(matchFormSchema.safeParse({ ...valid, description: 'x'.repeat(2000) }).success, true)
  assert.equal(messages({ ...valid, description: 'x'.repeat(2001) }).description, 'Máximo 2000 caracteres')
  const padded = matchFormSchema.parse({ ...valid, description: `  ${'x'.repeat(2000)}  ` })
  assert.equal(padded.description.length, 2000)
})

test('form defaults and create input', () => {
  const today = emptyMatchFormValues('2026-10-24')
  assert.deepEqual(today, { homeTeamId: '', awayTeamId: '', matchDate: '2026-10-24', description: '' })
  assert.match(emptyMatchFormValues().matchDate, /^\d{4}-\d{2}-\d{2}$/)
  assert.deepEqual(matchFormToCreateInput(valid), { homeTeamId: 'a', awayTeamId: 'b', matchDate: '2026-10-24' })
  assert.equal(matchFormToCreateInput({ ...valid, description: ' hola ' }).description, 'hola')
})

test('validateStatsFile accepts xlsx and csv case-insensitively up to 5 MiB', () => {
  assert.equal(validateStatsFile({ name: 'planilla.xlsx', size: 1000 }), null)
  assert.equal(validateStatsFile({ name: 'PLANILLA.XLSX', size: 1000 }), null)
  assert.equal(validateStatsFile({ name: 'datos.Csv', size: 1 }), null)
  assert.equal(validateStatsFile({ name: 'a.xlsx', size: MAX_STATS_FILE_BYTES }), null)
})

test('validateStatsFile rejects other extensions, empty and oversized files', () => {
  const typeError = 'Elegí la planilla de la federación en .xlsx o .csv'
  assert.equal(validateStatsFile({ name: 'a.pdf', size: 10 }), typeError)
  assert.equal(validateStatsFile({ name: 'a.xls', size: 10 }), typeError)
  assert.equal(validateStatsFile({ name: 'xlsx', size: 10 }), typeError)
  assert.equal(validateStatsFile({ name: 'a.xlsx', size: 0 }), typeError)
  assert.equal(validateStatsFile({ name: 'a.xlsx', size: MAX_STATS_FILE_BYTES + 1 }), 'El archivo supera 5 MB')
})

test('fileSizeLabel is readable', () => {
  assert.equal(fileSizeLabel(512), '512 B')
  assert.match(fileSizeLabel(2048), /^2 KB$/)
  assert.match(fileSizeLabel(2 * 1024 * 1024), /^2 MB$/)
})

test('unlinked reasons are translated', () => {
  assert.equal(
    unlinkedReasonLabel('no_roster_player', 'Moreno', '7'),
    'Nadie de tu plantel de Moreno usa el número 7.',
  )
  assert.equal(
    unlinkedReasonLabel('ambiguous_jersey_number', 'Moreno', '7'),
    'Hay más de un jugador de Moreno con el número 7.',
  )
  assert.equal(unlinkedReasonLabel('no_jersey_number', 'Moreno', null), 'El archivo no trae número de camiseta.')
  assert.ok(unlinkedReasonLabel('no_team_selected', 'Moreno', '7'))
  assert.equal(unlinkedReasonLabel('something_new', 'Moreno', '7'), 'No se pudo vincular.')
})

test('the four known backend warnings are translated (both quote styles)', () => {
  assert.equal(
    translateImportWarning('Moreno #7 PEREZ J: points do not equal 2P/3P/FT made'),
    'Moreno #7 PEREZ J: los puntos no coinciden con los tiros convertidos (2P, 3P y TL).',
  )
  assert.equal(
    translateImportWarning('C.S.D.y C. Moreno #? SIN NUMERO: points do not equal 2P/3P/FT made'),
    'C.S.D.y C. Moreno #? SIN NUMERO: los puntos no coinciden con los tiros convertidos (2P, 3P y TL).',
  )
  assert.equal(
    translateImportWarning('JUVENTUD UNIDA: jersey number 7 appears twice'),
    'JUVENTUD UNIDA: el número 7 aparece dos veces.',
  )
  assert.equal(
    translateImportWarning('Moreno: player points add up to 71 but the file totals say 73'),
    'Moreno: los puntos de los jugadores suman 71, pero el total del archivo dice 73.',
  )
  const expected =
    'El equipo «Boca» del archivo no se parece a «Moreno». Se aceptó porque elegiste importar igual.'
  assert.equal(
    translateImportWarning(
      "The file's team 'Boca' does not look like 'Moreno' (accepted because the mismatch was allowed).",
    ),
    expected,
  )
  assert.equal(
    translateImportWarning(
      'The file\'s team "Boca" does not look like "Moreno" (accepted because the mismatch was allowed).',
    ),
    expected,
  )
})

test('unknown warnings fall back to the verbatim backend text', () => {
  assert.equal(translateImportWarning('Something new happened'), 'Something new happened')
})

test('mismatch details map to the Spanish alert text', () => {
  const error = new MatchApiError(422, 'TEAM_MISMATCH', 'mismatch', {
    teams: [
      { side: 'HOME', selected_team: 'Boca', name_in_file: 'C.S.D.y C. Moreno', name_score: 0.1, roster_score: 0 },
      { side: 'AWAY', selected_team: 'River', name_in_file: 'JUVENTUD UNIDA', name_score: 0.2, roster_score: null },
    ],
  })
  const details = teamMismatchDetails(error)
  assert.equal(details.length, 2)
  assert.equal(
    mismatchMessage(details[0]),
    'Elegiste Boca como Local, pero en el archivo figura «C.S.D.y C. Moreno».',
  )
  assert.equal(
    mismatchMessage(details[1]),
    'Elegiste River como Visitante, pero en el archivo figura «JUVENTUD UNIDA».',
  )
})

test('error copy exists in Spanish for every code and keeps the backend message as detail', () => {
  const codes: MatchErrorCode[] = [
    'MATCH_NOT_FOUND',
    'TEAM_NOT_FOUND',
    'PLAYER_NOT_FOUND',
    'INVALID_MATCH_TEAMS',
    'INVALID_WINNER_TEAM',
    'INVALID_STATS_FILE',
    'STATS_FILE_TOO_LARGE',
    'TEAM_MISMATCH',
    'VALIDATION_ERROR',
  ]
  const titles = new Set<string>()
  for (const code of codes) {
    const copy = matchErrorCopy(new MatchApiError(422, code, 'English backend message'))
    assert.ok(copy.title && copy.description, code)
    assert.doesNotMatch(copy.title + copy.description, /English backend message/, code)
    assert.equal(copy.detail, 'English backend message', code)
    titles.add(copy.title)
  }
  assert.equal(titles.size, codes.length)
  assert.equal(
    matchErrorCopy(new MatchApiError(422, 'INVALID_STATS_FILE', 'Invalid file')).title,
    'No pudimos leer la planilla',
  )
  assert.equal(matchErrorCopy(new MatchApiError(413, 'STATS_FILE_TOO_LARGE', 'big')).title, 'El archivo supera 5 MB')
})

test('error copy for auth, plain-text and unknown errors', () => {
  assert.equal(matchErrorCopy(new ApiResponseError('Unauthorized', 401)).title, 'Tu sesión terminó')
  assert.equal(matchErrorCopy(new MatchApiError(401, null, 'x')).title, 'Tu sesión terminó')
  const plain = matchErrorCopy(parseMatchErrorBody(405, 'Method Not Allowed'))
  assert.equal(plain.title, 'No pudimos completar la operación')
  assert.equal(plain.description, 'Intentá de nuevo en unos minutos.')
  assert.equal(plain.detail, 'Method Not Allowed')
  const generic = matchErrorCopy(new Error('Internal boom'))
  assert.equal(generic.description, 'Intentá de nuevo en unos minutos.')
  assert.equal(generic.detail, 'Internal boom')
  assert.equal(matchErrorCopy(new ApiTimeoutError('Leer la planilla tardó demasiado. Probá de nuevo.')).description, 'Leer la planilla tardó demasiado. Probá de nuevo.')
  assert.equal(matchErrorCopy(new ApiNetworkError('No pudimos conectarnos con el servidor.')).detail, undefined)
  assert.equal(matchErrorCopy('boom').description, 'Intentá de nuevo en unos minutos.')
  const fastapi = matchErrorCopy(parseMatchErrorBody(422, JSON.stringify({ detail: [{ msg: 'bad uuid' }] })))
  assert.equal(fastapi.title, 'Los datos enviados no son válidos')
  assert.equal(fastapi.detail, 'bad uuid')
})

// --- runCreateWithStats ---

const input = { homeTeamId: 'a', awayTeamId: 'b', matchDate: '2026-10-24' }
const payload: MatchStatsSavePayload = { stats: { source: 'cabb_excel', schema_version: 1 }, winner_team_id: 'b', participants: [] }

function fakeService(options: { putFailures?: number; postFails?: boolean } = {}) {
  const calls = { create: 0, saveStats: [] as Array<{ id: string; payload: MatchStatsSavePayload }> }
  let putFailures = options.putFailures ?? 0
  return {
    calls,
    service: {
      async create(): Promise<MatchRecord> {
        calls.create += 1
        if (options.postFails) throw new MatchApiError(422, 'TEAM_NOT_FOUND', 'no team')
        return { id: 'match-1' } as MatchRecord
      },
      async saveStats(id: string, body: MatchStatsSavePayload): Promise<MatchWithParticipants> {
        calls.saveStats.push({ id, payload: body })
        if (putFailures > 0) {
          putFailures -= 1
          throw new MatchApiError(422, 'PLAYER_NOT_FOUND', 'gone')
        }
        return { match: { id } as MatchRecord, participants: [] }
      },
    },
  }
}

test('runCreateWithStats creates then saves the unchanged payload', async () => {
  const { service, calls } = fakeService()
  const result = await runCreateWithStats({ service, input, payload })
  assert.deepEqual(result, { matchId: 'match-1', statsSaved: true, error: null })
  assert.equal(calls.create, 1)
  assert.equal(calls.saveStats[0].payload, payload)
})

test('runCreateWithStats keeps the created id when the PUT fails and the retry does not POST again', async () => {
  const { service, calls } = fakeService({ putFailures: 1 })
  const first = await runCreateWithStats({ service, input, payload })
  assert.equal(first.matchId, 'match-1')
  assert.equal(first.statsSaved, false)
  assert.ok(isError(first.error, 'PLAYER_NOT_FOUND'))
  assert.equal(calls.create, 1)

  const retry = await runCreateWithStats({ service, input, payload, createdMatchId: first.matchId })
  assert.deepEqual(retry, { matchId: 'match-1', statsSaved: true, error: null })
  assert.equal(calls.create, 1)
  assert.deepEqual(calls.saveStats.map((call) => call.id), ['match-1', 'match-1'])
})

test('runCreateWithStats does not PUT when the POST fails', async () => {
  const { service, calls } = fakeService({ postFails: true })
  const result = await runCreateWithStats({ service, input, payload })
  assert.equal(result.matchId, null)
  assert.equal(result.statsSaved, false)
  assert.ok(isError(result.error, 'TEAM_NOT_FOUND'))
  assert.equal(calls.saveStats.length, 0)
})

function isError(error: unknown, code: MatchErrorCode): boolean {
  return error instanceof MatchApiError && error.code === code
}

test('a missing preview route (404/405 without a code) gets clear Spanish copy only for the preview', () => {
  for (const status of [404, 405]) {
    const error = parseMatchErrorBody(status, JSON.stringify({ detail: 'Not Found' }))
    const preview = matchErrorCopy(error, 'preview')
    assert.equal(preview.description, 'El servidor todavía no tiene la importación de planillas.')
    assert.equal(preview.detail, 'Not Found')
    const other = matchErrorCopy(error)
    assert.equal(other.title, 'No pudimos completar la operación')
    assert.doesNotMatch(other.description, /importación/)
  }
  // A coded 404 keeps its own copy even for the preview.
  assert.equal(
    matchErrorCopy(new MatchApiError(404, 'TEAM_NOT_FOUND', 'x'), 'preview').title,
    'No encontramos uno de los equipos',
  )
  // 422 FastAPI bodies are validation errors.
  assert.equal(
    matchErrorCopy(parseMatchErrorBody(422, JSON.stringify({ detail: [{ msg: 'bad' }] })), 'preview').title,
    'Los datos enviados no son válidos',
  )
})

test('PLAYER_NOT_FOUND copy points to the match instead of a hidden back button', () => {
  const copy = matchErrorCopy(new MatchApiError(404, 'PLAYER_NOT_FOUND', 'gone'))
  assert.match(copy.description, /Ir al partido/)
})

test('counts use correct singular and plural', () => {
  assert.equal(playedSummary(1), 'Las estadísticas de 1 jugador que jugó.')
  assert.equal(playedSummary(19), 'Las estadísticas de 19 jugadores que jugaron.')
  assert.equal(linkedSummary(1), '1 vinculado a tu plantel.')
  assert.equal(linkedSummary(0), '0 vinculados a tu plantel.')
  assert.equal(fileCountsSummary(12, 10), '12 en el archivo, 10 jugaron')
  assert.equal(fileCountsSummary(1, 1), '1 en el archivo, 1 jugó')
})

test('a rejected file says it also dropped the previous selection', () => {
  assert.equal(rejectedFileMessage('Problema', false), 'Problema')
  assert.match(rejectedFileMessage('Problema', true), /Quitamos la planilla que habías elegido antes/)
})

test('page sources: Importar igual uses the current form values, navigation is guarded after unmount', () => {
  const create = readFileSync(new URL('../src/pages/partidos/MatchCreatePage.tsx', import.meta.url), 'utf8')
  assert.match(create, /form\.handleSubmit\(\(values\) => requestPreview\(values, true\)\)/)
  assert.doesNotMatch(create, /requestPreview\(mismatch\.values/)
  const importPage = readFileSync(new URL('../src/pages/partidos/MatchStatsImportPage.tsx', import.meta.url), 'utf8')
  for (const source of [create, importPage]) {
    assert.match(source, /activeRef\.current = false/)
    assert.match(source, /if \(!activeRef\.current\) return\s+(toast|navigate)/)
  }
})
