import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { isLegacyVideoDetailSearch, legacyVideoRedirectPath } from '../src/pages/videos/legacy-video-routes.ts'

test('legacy video routes preserve search params and hash', () => {
  assert.equal(
    legacyVideoRedirectPath({
      destination: 'detail',
      videoId: 'video/1',
      search: '?tab=reporte&seccion=tiros',
      hash: '#evidencia',
    }),
    '/videos/video%2F1?tab=reporte&seccion=tiros#evidencia',
  )
  assert.equal(
    legacyVideoRedirectPath({ destination: 'upload', search: '?team_id=team-1' }),
    '/videos/subir?team_id=team-1',
  )
  assert.equal(
    legacyVideoRedirectPath({ destination: 'library', search: '?analysis_status=DONE' }),
    '/videos?analysis_status=DONE',
  )
})

test('Matches own /partidos and only the legacy ?tab= detail link redirects to Videos', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')

  assert.match(app, /path="\/videos" element=\{<MatchesPage \/>\}/)
  assert.match(app, /path="\/videos\/:videoId" element=\{<MatchDetailPage \/>\}/)
  assert.match(app, /path="\/partidos" element=\{<MatchListPage \/>\}/)
  assert.match(app, /path="\/partidos\/nuevo" element=\{<MatchCreatePage \/>\}/)
  assert.match(app, /path="\/partidos\/:matchId" element=\{<MatchRecordDetailPage \/>\}/)
  assert.match(app, /path="\/partidos\/:matchId\/estadisticas" element=\{<MatchStatsImportPage \/>\}/)
  assert.doesNotMatch(app, /LegacyVideoRouteRedirect/)
  assert.equal(isLegacyVideoDetailSearch('?tab=reporte'), true)
  assert.equal(isLegacyVideoDetailSearch(''), false)
})
