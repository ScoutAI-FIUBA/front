import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'
import {
  MOVE_CONFIRMATION,
  OTHER_MATCH_LABEL,
  VIDEOS_EMPTY,
  VIDEOS_NOTE,
  linkCandidates,
  linkedMatchLabel,
  linkedVideos,
} from '../src/pages/partidos/match-videos.ts'
import {
  matchDetailsSchema,
  matchDetailsToUpdateInput,
} from '../src/pages/partidos/match-form.ts'
import { matchErrorCopy } from '../src/pages/partidos/match-import.ts'
import { MatchApiError, buildUpdateDetailsBody, buildVideoMatchBody, parseMatchErrorBody } from '../src/services/api/matches.client.ts'
import { mapApiVideo, type ApiVideo } from '../src/services/api/contract-mappers.ts'
import type { Video } from '../src/types/index.ts'

const match = { id: 'match-1', homeTeamId: 'home', awayTeamId: 'away' }

function video(id: string, overrides: Partial<Video> = {}): Video {
  return {
    id,
    teamId: 'home',
    linkedMatchId: null,
    title: id,
    storageUrl: '',
    uploadedAt: '2026-10-01T10:00:00Z',
    status: 'uploaded',
    ...overrides,
  }
}

test('linkedVideos keeps only this match, newest first', () => {
  const result = linkedVideos(match, [
    video('old', { linkedMatchId: 'match-1', uploadedAt: '2026-09-01T10:00:00Z' }),
    video('new', { linkedMatchId: 'match-1', teamId: 'away', uploadedAt: '2026-10-05T10:00:00Z' }),
    video('other', { linkedMatchId: 'match-2' }),
    video('free'),
  ])
  assert.deepEqual(result.map((v) => v.id), ['new', 'old'])
  assert.deepEqual(linkedVideos(match, []), [])
})

test('linkCandidates offers home and away videos with their link state', () => {
  const result = linkCandidates(match, [
    video('a-free', { teamId: 'away', uploadedAt: '2026-10-02T10:00:00Z' }),
    video('h-this', { linkedMatchId: 'match-1', uploadedAt: '2026-10-03T10:00:00Z' }),
    video('h-other', { linkedMatchId: 'match-9', uploadedAt: '2026-10-04T10:00:00Z' }),
    video('h-free', { uploadedAt: '2026-10-01T10:00:00Z' }),
    video('stranger', { teamId: 'third' }),
    video('failed', { status: 'failed' }),
    video('pending-upload', { status: 'processing', uploadedAt: '2026-09-01T10:00:00Z' }),
    video('analyzed', { status: 'analyzed', uploadedAt: '2026-09-01T10:00:00Z' }),
  ])
  assert.deepEqual(
    result.map((c) => [c.video.id, c.side, c.state]),
    [
      ['h-other', 'HOME', 'other-match'],
      ['h-this', 'HOME', 'this-match'],
      ['h-free', 'HOME', 'free'],
      ['analyzed', 'HOME', 'free'],
      ['a-free', 'AWAY', 'free'],
    ],
  )
})

test('the copy of the link states is the agreed Spanish', () => {
  assert.equal(VIDEOS_NOTE, 'Pueden ser clips o el partido completo.')
  assert.equal(VIDEOS_EMPTY, 'Todavía no vinculaste videos a este partido')
  assert.equal(OTHER_MATCH_LABEL, 'Ya está vinculado a otro partido')
  assert.equal(MOVE_CONFIRMATION, 'Se va a mover a este partido')
  assert.equal(linkedMatchLabel('Moreno', 'Juventud', '05/10/2026'), 'Partido: Moreno vs Juventud · 05/10/2026')
})

const apiVideo: ApiVideo = {
  id: 'video-1',
  team_id: 'team-1',
  storage_key: 'k',
  title: 'Partido',
  description: null,
  status: 'READY',
  mime_type: 'video/mp4',
  size_bytes: 1,
  duration_ms: 1,
  created_at: '2026-10-05T10:00:00Z',
  updated_at: '2026-10-05T10:00:00Z',
}

test('mapApiVideo maps match_id to linkedMatchId (present, missing, null) and leaves matchId alone', () => {
  const linked = mapApiVideo({ ...apiVideo, match_id: 'match-1' })
  assert.equal(linked.linkedMatchId, 'match-1')
  assert.equal(linked.matchId, undefined)
  assert.equal(mapApiVideo(apiVideo).linkedMatchId, null)
  assert.equal(mapApiVideo({ ...apiVideo, match_id: null }).linkedMatchId, null)
})

test('VIDEO_TEAM_NOT_IN_MATCH and VIDEO_NOT_FOUND are known codes with Spanish copy', () => {
  const envelope = parseMatchErrorBody(
    422,
    JSON.stringify({ error: { code: 'VIDEO_TEAM_NOT_IN_MATCH', message: 'Video team is not in the match' } }),
  )
  assert.equal(envelope.code, 'VIDEO_TEAM_NOT_IN_MATCH')
  assert.equal(matchErrorCopy(envelope).description, 'Ese video es de un equipo que no juega este partido.')
  const missing = parseMatchErrorBody(404, JSON.stringify({ error: { code: 'VIDEO_NOT_FOUND', message: 'x' } }))
  assert.equal(missing.code, 'VIDEO_NOT_FOUND')
  assert.ok(missing instanceof MatchApiError)
  assert.equal(parseMatchErrorBody(422, JSON.stringify({ detail: [{ msg: 'Field required' }] })).code, 'VALIDATION_ERROR')
})

test('the PATCH body carries only the provided keys', () => {
  assert.deepEqual(buildUpdateDetailsBody({}), {})
  assert.deepEqual(buildUpdateDetailsBody({ matchDate: '2026-10-02' }), { match_date: '2026-10-02' })
  assert.deepEqual(buildUpdateDetailsBody({ description: null }), { description: null })
  assert.deepEqual(buildUpdateDetailsBody({ matchDate: '2026-10-02', description: 'x' }), {
    match_date: '2026-10-02',
    description: 'x',
  })
})

test('editing sends only what changed and clears an emptied description', () => {
  const current = { matchDate: '2026-10-01', description: 'Final' }
  assert.equal(matchDetailsToUpdateInput({ matchDate: '2026-10-01', description: ' Final ' }, current), null)
  assert.deepEqual(matchDetailsToUpdateInput({ matchDate: '2026-10-02', description: 'Final' }, current), {
    matchDate: '2026-10-02',
  })
  assert.deepEqual(matchDetailsToUpdateInput({ matchDate: '2026-10-01', description: '  ' }, current), {
    description: null,
  })
  assert.equal(matchDetailsToUpdateInput({ matchDate: '2026-10-01', description: '' }, { ...current, description: null }), null)
  assert.equal(matchDetailsSchema.safeParse({ matchDate: '01/10/2026', description: '' }).success, false)
  assert.equal(matchDetailsSchema.safeParse({ matchDate: '2026-10-01', description: 'a'.repeat(2001) }).success, false)
  assert.equal(matchDetailsSchema.safeParse({ matchDate: '2026-10-01', description: 'a'.repeat(2000) }).success, true)
})

test('the PUT body always carries both keys and a 422 team error becomes a typed MatchApiError', () => {
  // videos.api.ts imports extension-less modules, so node cannot load it: the body builder and the parser are tested instead.
  assert.equal(JSON.stringify(buildVideoMatchBody('team-1', null)), '{"team_id":"team-1","match_id":null}')
  assert.equal(JSON.stringify(buildVideoMatchBody('team-1', 'match-1')), '{"team_id":"team-1","match_id":"match-1"}')
  const error = parseMatchErrorBody(
    422,
    JSON.stringify({ error: { code: 'VIDEO_TEAM_NOT_IN_MATCH', message: 'Video team is not in the match' } }),
  )
  assert.ok(error instanceof MatchApiError)
  assert.equal(error.status, 422)
  assert.equal(error.code, 'VIDEO_TEAM_NOT_IN_MATCH')
})

test('the PUT and PATCH services use the agreed endpoints', () => {
  const videos = readFileSync(new URL('../src/services/api/videos.api.ts', import.meta.url), 'utf8')
  assert.match(videos, /\/match`/)
  assert.match(videos, /method: 'PUT'/)
  assert.match(videos, /buildVideoMatchBody\(teamId, matchId\)/)
  const matches = readFileSync(new URL('../src/services/api/matches.api.ts', import.meta.url), 'utf8')
  assert.match(matches, /method: 'PATCH'/)
})

test('the match detail mounts the videos section and the edit dialog', () => {
  const detail = readFileSync(new URL('../src/pages/partidos/MatchRecordDetailPage.tsx', import.meta.url), 'utf8')
  assert.match(detail, /<MatchVideosSection /)
  assert.match(detail, /Editar fecha y descripción/)
  const dialog = readFileSync(new URL('../src/pages/partidos/MatchDetailsDialog.tsx', import.meta.url), 'utf8')
  assert.match(dialog, /Para cambiar los equipos creá un partido nuevo\./)
  const importPage = readFileSync(new URL('../src/pages/partidos/match-import.ts', import.meta.url), 'utf8')
  assert.match(importPage, /Los equipos todavía no se pueden editar\./)
})

test('the video page header links to the linked match', () => {
  const page = readFileSync(new URL('../src/pages/matches/MatchDetailPage.tsx', import.meta.url), 'utf8')
  assert.match(page, /linkedMatchId \? <LinkedMatchLink/)
  assert.match(page, /matchDetailPath\(matchId\)/)
  const paths = readFileSync(new URL('../src/pages/partidos/match-routes.ts', import.meta.url), 'utf8')
  assert.match(paths, /\/partidos/)
  assert.match(page, /LINKED_MATCH_FALLBACK/)
})

test('match pages never compare or show detected numbers for videos', () => {
  const dir = new URL('../src/pages/partidos/', import.meta.url)
  for (const name of readdirSync(dir).filter((file) => /\.(ts|tsx)$/.test(file))) {
    const source = readFileSync(new URL(name, dir), 'utf8')
    assert.doesNotMatch(source, /comparaci(o|ó)n|detectad|Análisis IA/i, name)
  }
})
