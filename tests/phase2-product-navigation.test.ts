import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('Inicio uses the real catalogue and the shared Video model without legacy entities', () => {
  const analysis = readSource('../src/pages/analysis/AnalysisPage.tsx')
  const home = readSource('../src/pages/dashboard/DashboardPage.tsx')
  const row = readSource('../src/pages/analysis/AnalysisCatalogRow.tsx')

  assert.match(analysis, /useAnalysisJobCatalog/)
  assert.match(home, /useAnalysisJobCatalog/)
  assert.match(home, /buildMatchLibrary/)
  assert.match(home, /selectHomePriorityMatch/)
  assert.doesNotMatch(analysis, /analysisService|sessionCode|MAN-|SCAN-/)
  assert.doesNotMatch(home, /analysisService|manualAnalysis/)
  assert.doesNotMatch(home, /AnalysisCatalogRow|analysisJobDetailPath|videoPrimaryAnalysisAction/)
  assert.match(row, /video\.title/)
  assert.match(row, /team\.name/)
  assert.doesNotMatch(row, /job\.id\.slice/)
})

test('legacy analysis and manual routes stay available outside primary navigation', () => {
  const app = readSource('../src/App.tsx')
  const shell = readSource('../src/components/layout/AppShell.tsx')

  assert.match(app, /path="\/analisis\/nuevo" element=\{<AnalysisJobNewPage/)
  assert.match(app, /path="\/revision-manual" element=\{<ManualAnalysisPage/)
  assert.match(app, /path="\/revision-manual\/nuevo" element=\{<AnalysisNewPage/)
  assert.match(app, /path="\/analisis\/:id" element=\{<AnalysisDetailPage/)
  assert.doesNotMatch(shell, /label: 'Revisión manual'/)
  assert.doesNotMatch(shell, /label: 'Análisis'/)
  assert.match(shell, /label: 'Videos'/)
})

test('Videos is the primary library over videos and ProcessingJobs', () => {
  const app = readSource('../src/App.tsx')
  const shell = readSource('../src/components/layout/AppShell.tsx')
  const matches = readSource('../src/pages/matches/MatchesPage.tsx')

  assert.match(app, /path="\/videos" element=\{<MatchesPage/)
  // Matches (federation box scores) own /partidos now; it no longer redirects to Videos.
  assert.match(app, /path="\/partidos" element=\{<MatchListPage/)
  assert.match(shell, /to: '\/videos', label: 'Videos'/)
  assert.match(matches, /useAnalysisJobCatalog/)
  assert.match(matches, /buildMatchLibrary/)
  assert.doesNotMatch(matches, /matchService|Herramienta experimental|datos de demostración/)
})

test('expired auth uses a neutral redirect state instead of a connection alert', () => {
  const videos = readSource('../src/pages/matches/MatchesPage.tsx')
  const hook = readSource('../src/pages/analysis/use-analysis-job-catalog.ts')
  const history = readSource('../src/pages/videos/VideoAnalysisJobs.tsx')

  assert.match(hook, /isApiAuthenticationError/)
  assert.match(videos, /loadState === 'session-expired'/)
  assert.match(videos, /Tu sesión terminó/)
  assert.match(videos, /Redirigiendo al ingreso/)
  assert.match(history, /session-expired/)
  assert.match(videos, /No pudimos cargar tus videos/)
})

test('direct playback, filters, clips and history remain in the canonical Video library', () => {
  const videos = readSource('../src/pages/matches/MatchesPage.tsx')
  assert.match(videos, /canOpenVideoPlayback\(item\.video\)/)
  assert.match(videos, /VideoPlaybackDialog/)
  assert.match(videos, /VideoAnalysisJobs/)
  assert.match(videos, /filterVideoLibrary/)
  assert.match(videos, /\/colecciones/)
})

test('the primary shell exposes only Inicio, Videos, Partidos, Equipos and Jugadores', () => {
  const shell = readSource('../src/components/layout/AppShell.tsx')

  assert.match(shell, /to: '\/', label: 'Inicio'/)
  assert.match(shell, /to: '\/videos', label: 'Videos'/)
  assert.match(shell, /to: '\/videos', label: 'Videos'[\s\S]*to: '\/partidos', label: 'Partidos'/)
  assert.match(shell, /to: '\/equipos', label: 'Equipos'/)
  assert.match(shell, /to: '\/jugadores', label: 'Jugadores'/)
  assert.doesNotMatch(shell, /to: '\/analisis'/)
  assert.doesNotMatch(shell, /to: '\/revision-manual'/)
})

test('Inicio is canonical at root and dashboard remains a redirect alias', () => {
  const app = readSource('../src/App.tsx')
  const shell = readSource('../src/components/layout/AppShell.tsx')
  const home = readSource('../src/pages/dashboard/DashboardPage.tsx')

  assert.match(app, /<Route index element=\{<DashboardPage \/>\}/)
  assert.match(app, /path="\/dashboard" element=\{<Navigate to="\/" replace \/>\}/)
  assert.match(shell, /to="\/"/)
  assert.match(home, /videoUploadPath\(\)/)
  assert.match(home, /to="\/videos"/)
  assert.doesNotMatch(home, /\/analisis|\/partidos/)
})

test('Inicio keeps loading, error, partial and empty states product-facing', () => {
  const home = readSource('../src/pages/dashboard/DashboardPage.tsx')

  assert.match(home, /Cargando Inicio/)
  assert.match(home, /No pudimos cargar tus videos/)
  assert.match(home, /Algunos estados no se pudieron verificar/)
  assert.match(home, /Tu primer video empieza acá/)
  assert.match(home, /AnalysisPollingNotice/)
  assert.match(home, /requestMatchPoster\(userId, video, getVideoByIdForTeam\)/)
  assert.match(home, /function CourtFallback/)
  assert.match(home, /className="relative h-full w-full"/)
  assert.doesNotMatch(home, /`relative overflow-hidden bg-\[#11151D\] \$\{className\}`/)
})

test('temporary MVP copy is absent from login', () => {
  const login = readSource('../src/pages/auth/LoginPage.tsx')
  assert.doesNotMatch(login, /ScoutAI MVP/)
})
