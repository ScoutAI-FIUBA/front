import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  COURT_POSITIONS_SAMPLE_EVERY,
  createAnalysisJobCourtPositionsService,
  type ApiAnalysisJobCourtPositions,
} from '../src/services/api/analysis-job-court-positions.client.ts'
import type { AnalysisJobRequest } from '../src/services/api/analysis-jobs.client.ts'
import {
  analysisJobCourtPositionsContextForJob,
  analysisJobCourtPositionsLoadKey,
  courtPositionPlayerLabel,
  defaultCourtPositionFilter,
  filterCourtPositionPlayers,
  buildCourtPositionPlayerLabels,
  filterGroupedCourtPositionPlayers,
  filterIdentifiedCourtPositionPlayers,
  loadAnalysisJobCourtPositions,
  movementSequenceIndex,
} from '../src/pages/analysis/analysis-job-court-positions.ts'
import { courtPositionPointToPercent } from '../src/components/analysis/court-positions-court.ts'
import type { ProcessingJob } from '../src/types/index.ts'

function apiPositions(
  overrides: Partial<ApiAnalysisJobCourtPositions> = {},
): ApiAnalysisJobCourtPositions {
  return {
    job_id: 'job-1',
    video_id: 'video-1',
    court: { length_m: 28, width_m: 15 },
    players: [
      {
        track_id: 7,
        team_id: 0,
        jersey_number: '23',
        positions: [
          { frame_index: 0, x_m: 2, y_m: 3 },
          { frame_index: 5, x_m: 4, y_m: 5 },
        ],
        movement: {
          samples: 20,
          distance_m: 8.25,
          average_position: { x_m: 3.2, y_m: 4.1 },
        },
      },
      {
        track_id: 9,
        team_id: 1,
        jersey_number: null,
        positions: [{ frame_index: 1, x_m: 14, y_m: 7.5 }],
        movement: {
          samples: 12,
          distance_m: 4.5,
          average_position: { x_m: 14, y_m: 7.5 },
        },
      },
      {
        track_id: 11,
        team_id: null,
        jersey_number: null,
        positions: [{ frame_index: null, x_m: 20, y_m: 10 }],
        movement: {
          samples: 1,
          distance_m: 0,
          average_position: { x_m: 20, y_m: 10 },
        },
      },
    ],
    coverage: {
      source_file: 'projected_tracks.jsonl',
      records_read: 33,
      records_off_court: 2,
      sample_every: COURT_POSITIONS_SAMPLE_EVERY,
      truncated: false,
    },
    ...overrides,
  }
}

function doneJob(ourTeamSide: 0 | 1 | null): ProcessingJob {
  return {
    id: 'job-1',
    videoId: 'video-1',
    teamId: 'team-1',
    requestedByUserId: 'user-1',
    status: 'DONE',
    resultsKey: 'results/team-1/job-1',
    errorMessage: null,
    progressPercent: 100,
    summary: null,
    ourTeamSide,
    startedAt: null,
    finishedAt: null,
    createdAt: '2026-09-17T12:00:00+00:00',
    updatedAt: '2026-09-17T12:01:00+00:00',
  }
}

test('GET maps multiple tracks and keeps sampling encapsulated in the service', async () => {
  const paths: string[] = []
  const request: AnalysisJobRequest = async <T>(path: string) => {
    paths.push(path)
    return apiPositions() as T
  }
  const service = createAnalysisJobCourtPositionsService(request)

  const result = await service.get('job/id', 'team id')

  assert.deepEqual(paths, [
    `/jobs/job%2Fid/court-positions?team_id=team%20id&sample_every=${COURT_POSITIONS_SAMPLE_EVERY}`,
  ])
  assert.equal(result.players.length, 3)
  assert.deepEqual(result.court, { lengthM: 28, widthM: 15 })
  assert.equal(result.coverage.sampleEvery, COURT_POSITIONS_SAMPLE_EVERY)
})

test('maps side 0, side 1, and null without treating them as team UUIDs', async () => {
  const service = createAnalysisJobCourtPositionsService(async <T>() => apiPositions() as T)
  const result = await service.get('job-1', 'team-1')

  assert.deepEqual(result.players.map((player) => player.teamSide), [0, 1, null])
})

test('prefers jersey numbers and uses a product-facing tracking label for legacy players', async () => {
  const service = createAnalysisJobCourtPositionsService(async <T>() => apiPositions() as T)
  const result = await service.get('job-1', 'team-1')

  assert.equal(courtPositionPlayerLabel(result.players[0]!), '#23')
  assert.equal(courtPositionPlayerLabel(result.players[1]!), 'Seguimiento 9')
})

test('maps and filters model v2 players by stable identity without exposing it as a label', async () => {
  const response = apiPositions()
  response.players[1] = {
    ...response.players[1]!,
    stable_player_id: 'player-stable-9',
  }
  const service = createAnalysisJobCourtPositionsService(async <T>() => response as T)
  const players = (await service.get('job-1', 'team-1')).players

  assert.equal(players[1]?.stablePlayerId, 'player-stable-9')
  assert.equal(courtPositionPlayerLabel(players[1]!), 'Jugador detectado')
  assert.deepEqual(
    filterCourtPositionPlayers(players, 'stable:player-stable-9').map((player) => player.trackId),
    [9],
  )
  assert.equal(defaultCourtPositionFilter(players, 1), 'track:7')
})

test('maps an empty response and a null source file without fabricating players', async () => {
  const service = createAnalysisJobCourtPositionsService(async <T>() => apiPositions({
    players: [],
    coverage: {
      source_file: null,
      records_read: 0,
      records_off_court: 0,
      sample_every: COURT_POSITIONS_SAMPLE_EVERY,
      truncated: false,
    },
  }) as T)

  const result = await service.get('job-1', 'team-1')

  assert.deepEqual(result.players, [])
  assert.equal(result.coverage.sourceFile, null)
  assert.equal(result.coverage.recordsRead, 0)
})

test('preserves truncation and off-court coverage', async () => {
  const service = createAnalysisJobCourtPositionsService(async <T>() => apiPositions({
    coverage: {
      source_file: 'player_positions.jsonl',
      records_read: 20_000,
      records_off_court: 14,
      sample_every: COURT_POSITIONS_SAMPLE_EVERY,
      truncated: true,
    },
  }) as T)

  const result = await service.get('job-1', 'team-1')

  assert.equal(result.coverage.sourceFile, 'player_positions.jsonl')
  assert.equal(result.coverage.truncated, true)
  assert.equal(result.coverage.recordsOffCourt, 14)
})

test('a failed load can be retried without changing the request contract', async () => {
  let attempts = 0
  const service = createAnalysisJobCourtPositionsService(async <T>() => {
    attempts += 1
    if (attempts === 1) throw new Error('Positions unavailable')
    return apiPositions() as T
  })
  const context = analysisJobCourtPositionsContextForJob(doneJob(null))

  await assert.rejects(loadAnalysisJobCourtPositions(context, service), /Positions unavailable/)
  const retried = await loadAnalysisJobCourtPositions(context, service)

  assert.equal(attempts, 2)
  assert.equal(retried?.players.length, 3)
})

test('does not request positions before the job is DONE', async () => {
  let calls = 0
  const service = { get: async () => { calls += 1; return {} as never } }
  const context = { ...analysisJobCourtPositionsContextForJob(doneJob(null)), status: 'RUNNING' as const }

  const result = await loadAnalysisJobCourtPositions(context, service)

  assert.equal(result, null)
  assert.equal(calls, 0)
})

test('filters locally by side, unassigned tracks, and individual track', async () => {
  const service = createAnalysisJobCourtPositionsService(async <T>() => apiPositions() as T)
  const players = (await service.get('job-1', 'team-1')).players

  assert.deepEqual(filterCourtPositionPlayers(players, 'all').map((player) => player.trackId), [7, 9, 11])
  assert.deepEqual(filterCourtPositionPlayers(players, 'side-0').map((player) => player.trackId), [7])
  assert.deepEqual(filterCourtPositionPlayers(players, 'side-1').map((player) => player.trackId), [9])
  assert.deepEqual(filterCourtPositionPlayers(players, 'unassigned').map((player) => player.trackId), [11])
  assert.deepEqual(filterCourtPositionPlayers(players, 'track:9').map((player) => player.trackId), [9])
})

test('defaults Movement to an identified player and falls back to all when none exist', async () => {
  const service = createAnalysisJobCourtPositionsService(async <T>() => apiPositions() as T)
  const players = (await service.get('job-1', 'team-1')).players

  assert.equal(defaultCourtPositionFilter(players, 0), 'track:7')
  assert.equal(defaultCourtPositionFilter(players, 1), 'track:7')
  assert.equal(defaultCourtPositionFilter(players, null), 'track:7')
  assert.equal(defaultCourtPositionFilter([], 0), 'all')
  assert.equal(
    defaultCourtPositionFilter(players.map((player) => ({ ...player, jerseyNumber: null })), 0),
    'all',
  )
  const playersWithoutJerseys = players.map((player) => ({ ...player, jerseyNumber: null }))
  const rosterIdentities = [{ trackId: 9, rosterPlayerId: 'roster-9' }]
  assert.deepEqual(
    filterIdentifiedCourtPositionPlayers(playersWithoutJerseys, rosterIdentities).map((player) => player.trackId),
    [9],
  )
  assert.equal(defaultCourtPositionFilter(playersWithoutJerseys, 1, rosterIdentities), 'track:9')
})

test('Movement ignores ambiguous Stats identities but keeps valid jersey identification', async () => {
  const service = createAnalysisJobCourtPositionsService(async <T>() => apiPositions() as T)
  const players = (await service.get('job-1', 'team-1')).players
  const duplicateTrackIdentities = [
    { trackId: 9, rosterPlayerId: 'roster-a' },
    { trackId: 9, rosterPlayerId: 'roster-b' },
  ]

  assert.deepEqual(
    filterIdentifiedCourtPositionPlayers(players, duplicateTrackIdentities).map((player) => player.trackId),
    [7],
  )
  assert.deepEqual(
    filterIdentifiedCourtPositionPlayers(
      players.map((player) => player.trackId === 9 ? { ...player, jerseyNumber: '09' } : player),
      duplicateTrackIdentities,
    ).map((player) => player.trackId),
    [7, 9],
  )
})

test('Movement keeps jersey players selectable when Stats fails and otherwise falls back to all', async () => {
  const service = createAnalysisJobCourtPositionsService(async <T>() => apiPositions() as T)
  const players = (await service.get('job-1', 'team-1')).players

  assert.deepEqual(
    filterIdentifiedCourtPositionPlayers(players, undefined).map((player) => player.trackId),
    [7],
  )
  assert.equal(defaultCourtPositionFilter(players, 0, undefined), 'track:7')
  assert.equal(
    defaultCourtPositionFilter(players.map((player) => ({ ...player, jerseyNumber: null })), 0, undefined),
    'all',
  )
})

test('maps playback progress to sample order without inventing time', () => {
  assert.equal(movementSequenceIndex(-1, 6), 0)
  assert.equal(movementSequenceIndex(0, 6), 0)
  assert.equal(movementSequenceIndex(0.5, 6), 3)
  assert.equal(movementSequenceIndex(1, 6), 5)
  assert.equal(movementSequenceIndex(2, 6), 5)
  assert.equal(movementSequenceIndex(0.5, 0), 0)

  const playbackSource = readFileSync(
    new URL('../src/components/analysis/CourtPositionsPlayback.tsx', import.meta.url),
    'utf8',
  )
  assert.match(playbackSource, /from 'motion\/react'/)
  assert.match(playbackSource, /useReducedMotion\(\)/)
  assert.match(playbackSource, /Reproducir recorrido/)
  assert.match(playbackSource, /Pausar/)
  assert.match(playbackSource, /Reiniciar/)
  assert.match(playbackSource, /type="range"/)
  assert.match(playbackSource, /Avance por orden de posiciones/)
  assert.doesNotMatch(playbackSource, /muestras/i)
  assert.match(playbackSource, /No representa tiempo real ni está sincronizado con el video/)
  assert.doesNotMatch(playbackSource, /timestampSeconds|onSeekToVideo|frameIndex/)
})

test('changing our_team_side keeps the same load identity and does not require refetch', async () => {
  const sideZeroContext = analysisJobCourtPositionsContextForJob(doneJob(0))
  const sideOneContext = analysisJobCourtPositionsContextForJob(doneJob(1))

  assert.deepEqual(sideZeroContext, sideOneContext)
  assert.equal(
    analysisJobCourtPositionsLoadKey(sideZeroContext),
    analysisJobCourtPositionsLoadKey(sideOneContext),
  )
})

test('maps coordinates correctly inside a 28 by 15 metre court', () => {
  const court = { lengthM: 28, widthM: 15 }

  assert.deepEqual(
    courtPositionPointToPercent(court, { xM: 14, yM: 7.5 }),
    { leftPercent: 50, topPercent: 50 },
  )
  assert.deepEqual(
    courtPositionPointToPercent(court, { xM: 28, yM: 15 }),
    { leftPercent: 100, topPercent: 100 },
  )
  assert.equal(courtPositionPointToPercent(court, { xM: -0.1, yM: 7.5 }), null)
})

test('court and detail containers use responsive width guards without a mobile min-width', () => {
  const courtSource = readFileSync(
    new URL('../src/components/analysis/CourtPositionsCourt.tsx', import.meta.url),
    'utf8',
  )
  const detailSource = readFileSync(
    new URL('../src/pages/analysis/AnalysisJobCourtPositions.tsx', import.meta.url),
    'utf8',
  )

  assert.match(courtSource, /w-full max-w-full overflow-hidden/)
  assert.match(detailSource, /className="min-w-0 space-y-5"/)
  assert.doesNotMatch(courtSource, /min-w-\[/)
  assert.doesNotMatch(detailSource, /min-w-\[/)
})

test('Movement filters player controls without removing aggregate position evidence', () => {
  const detailSource = readFileSync(
    new URL('../src/pages/analysis/AnalysisJobCourtPositions.tsx', import.meta.url),
    'utf8',
  )
  const workspaceSource = readFileSync(
    new URL('../src/pages/analysis/AnalysisJobResultsWorkspace.tsx', import.meta.url),
    'utf8',
  )

  assert.match(detailSource, /const identifiedPlayers = useMemo/)
  assert.match(detailSource, /const visibleIdentifiedPlayers = useMemo/)
  assert.match(detailSource, /filterIdentifiedCourtPositionPlayers/)
  assert.match(detailSource, /identifiedPlayers\.map/)
  assert.match(detailSource, /visibleIdentifiedPlayers\.map/)
  assert.match(detailSource, /buildCourtPositionPlayerLabels\(groupedPlayers, playerIdentities\)/)
  assert.match(detailSource, /buildCourtPositionsHeatmap\(positions\.court, visiblePlayers\)/)
  assert.match(detailSource, /players=\{visiblePlayers\}/)
  assert.match(workspaceSource, /analysisJobPlayerIdentitiesForJob\(job\.id, shootingData\)/)
  assert.equal(workspaceSource.match(/playerIdentities=\{playerIdentities\}/g)?.length, 2)
})

test('all analysis courts share recognisable basketball geometry', () => {
  const linesSource = readFileSync(
    new URL('../src/components/analysis/BasketballCourtLines.tsx', import.meta.url),
    'utf8',
  )
  const shotCourtSource = readFileSync(
    new URL('../src/components/analysis/ShotChartCourt.tsx', import.meta.url),
    'utf8',
  )
  const movementCourtSource = readFileSync(
    new URL('../src/components/analysis/CourtPositionsCourt.tsx', import.meta.url),
    'utf8',
  )
  const heatmapSource = readFileSync(
    new URL('../src/components/analysis/CourtPositionsHeatmap.tsx', import.meta.url),
    'utf8',
  )

  assert.match(linesSource, /threePointRadiusM/)
  assert.match(linesSource, /freeThrowRadius/)
  assert.match(linesSource, /<circle/)
  assert.match(linesSource, /<path/)
  assert.match(shotCourtSource, /<BasketballCourtLines/)
  assert.match(movementCourtSource, /<BasketballCourtLines/)
  assert.match(heatmapSource, /<BasketballCourtLines/)
})

test('R3-B2 gives Partido Movement a flat editorial presentation without changing its controls', () => {
  const detailSource = readFileSync(
    new URL('../src/pages/analysis/AnalysisJobCourtPositions.tsx', import.meta.url),
    'utf8',
  )
  const playbackSource = readFileSync(
    new URL('../src/components/analysis/CourtPositionsPlayback.tsx', import.meta.url),
    'utf8',
  )
  const workspaceSource = readFileSync(
    new URL('../src/pages/analysis/AnalysisJobResultsWorkspace.tsx', import.meta.url),
    'utf8',
  )

  assert.match(detailSource, /presentation = 'legacy'/)
  assert.match(detailSource, /presentation === 'match-report'/)
  assert.match(detailSource, />\s*Recorrido\s*</)
  assert.match(detailSource, />\s*Mapa de calor\s*</)
  assert.match(detailSource, /<SelectItem value="all">Todos<\/SelectItem>/)
  assert.doesNotMatch(detailSource, /value="side-[01]"|Lado [01]|Comparar grupo/)
  assert.match(detailSource, /Elegí qué grupo es tu equipo en Resumen para ver sus jugadores y tiros/)
  assert.match(detailSource, /filterGroupedCourtPositionPlayers\(positions\?\.players \?\? \[\], job\.ourTeamSide\)/)
  assert.doesNotMatch(detailSource, /Sin asignar|value="unassigned"/)
  assert.match(detailSource, /Distancia aprox\./)
  assert.match(detailSource, />Jugador</)
  assert.doesNotMatch(detailSource, />Muestras</)
  assert.doesNotMatch(detailSource, /Posición promedio|formatAveragePosition|movement\.samples/)
  assert.doesNotMatch(detailSource, /\bmuestras\b/i)
  assert.match(detailSource, /presentation="match-report"/)
  assert.match(playbackSource, /No representa tiempo real ni está sincronizado con el video/)
  assert.doesNotMatch(detailSource, /Ver en video|onSeekToVideo/)
  assert.match(workspaceSource, /<AnalysisJobCourtPositionsView[\s\S]*?presentation=\{presentation\}/)
  assert.match(workspaceSource, /activeSection === 'movement' \|\| activeSection === 'similar'/)
  assert.match(workspaceSource, /reportContentOnlySection \? 'hidden'/)
})

test('Movement drops tracks without a team side from lists and the identified set', async () => {
  const service = createAnalysisJobCourtPositionsService(async <T>() => apiPositions() as T)
  const players = (await service.get('job-1', 'team-1')).players
  const withUngroupedJersey = players.map((player) => player.trackId === 11 ? { ...player, jerseyNumber: '30' } : player)

  assert.deepEqual(filterGroupedCourtPositionPlayers(withUngroupedJersey).map((player) => player.trackId), [7, 9])
  assert.deepEqual(
    filterIdentifiedCourtPositionPlayers(withUngroupedJersey, undefined).map((player) => player.trackId),
    [7],
  )
  assert.deepEqual(
    filterIdentifiedCourtPositionPlayers(
      withUngroupedJersey.map((player) => ({ ...player, jerseyNumber: null })),
      [{ trackId: 11, rosterPlayerId: 'roster-11' }],
    ),
    [],
  )
})

test('Movement labels prefer the Stats roster name and fall back to the jersey number', async () => {
  const service = createAnalysisJobCourtPositionsService(async <T>() => apiPositions() as T)
  const [first] = (await service.get('job-1', 'team-1')).players
  const player = { ...first!, jerseyNumber: '30', stablePlayerId: 'stable-30' }
  const key = 'stable:stable-30'

  assert.equal(buildCourtPositionPlayerLabels([player], undefined).get(key), '#30')
  assert.equal(buildCourtPositionPlayerLabels([player], []).get(key), '#30')
  assert.equal(
    buildCourtPositionPlayerLabels([player], [{ stablePlayerId: 'stable-30', rosterName: 'Ana Pérez' }]).get(key),
    'Ana Pérez',
  )
  assert.equal(
    buildCourtPositionPlayerLabels([player], [{ stablePlayerId: 'stable-30', rosterName: null }]).get(key),
    '#30',
  )
})

test('Movement labels ignore Stats roster names with duplicate keys', async () => {
  const service = createAnalysisJobCourtPositionsService(async <T>() => apiPositions() as T)
  const [first] = (await service.get('job-1', 'team-1')).players
  const player = { ...first!, jerseyNumber: '30', stablePlayerId: 'stable-30' }

  assert.equal(
    buildCourtPositionPlayerLabels([player], [
      { stablePlayerId: 'stable-30', rosterName: 'Ana Pérez' },
      { stablePlayerId: 'stable-30', rosterName: 'Otra Persona' },
    ]).get('stable:stable-30'),
    '#30',
  )
})

test('Movement scopes players to the analysed side', async () => {
  const service = createAnalysisJobCourtPositionsService(async <T>() => apiPositions() as T)
  const players = (await service.get('job-1', 'team-1')).players

  assert.deepEqual(filterGroupedCourtPositionPlayers(players, 0).map((player) => player.trackId), [7])
  assert.deepEqual(filterGroupedCourtPositionPlayers(players, 1).map((player) => player.trackId), [9])
  assert.deepEqual(filterGroupedCourtPositionPlayers(players, null).map((player) => player.trackId), [7, 9])
})
