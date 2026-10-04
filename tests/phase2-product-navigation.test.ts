import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('/analisis and Inicio use real ProcessingJob catalogue without legacy session codes', () => {
  const analysis = readSource('../src/pages/analysis/AnalysisPage.tsx')
  const home = readSource('../src/pages/dashboard/DashboardPage.tsx')
  const row = readSource('../src/pages/analysis/AnalysisCatalogRow.tsx')

  assert.match(analysis, /useAnalysisJobCatalog/)
  assert.match(home, /useAnalysisJobCatalog/)
  assert.doesNotMatch(analysis, /analysisService|sessionCode|MAN-|SCAN-/)
  assert.doesNotMatch(home, /analysisService|manualAnalysis/)
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
  assert.doesNotMatch(shell, /label: 'Videos'/)
})

test('Partidos is the real primary library over videos and ProcessingJobs', () => {
  const app = readSource('../src/App.tsx')
  const shell = readSource('../src/components/layout/AppShell.tsx')
  const matches = readSource('../src/pages/matches/MatchesPage.tsx')

  assert.match(app, /path="\/partidos" element=\{<MatchesPage/)
  assert.match(shell, /to: '\/partidos', label: 'Partidos'/)
  assert.match(matches, /useAnalysisJobCatalog/)
  assert.match(matches, /buildMatchLibrary/)
  assert.doesNotMatch(matches, /matchService|Herramienta experimental|datos de demostración/)
})

test('expired auth uses a neutral redirect state instead of a connection alert', () => {
  const videos = readSource('../src/pages/videos/VideosPage.tsx')
  const hook = readSource('../src/pages/analysis/use-analysis-job-catalog.ts')
  const history = readSource('../src/pages/videos/VideoAnalysisJobs.tsx')

  assert.match(hook, /isApiAuthenticationError/)
  assert.match(videos, /loadState === 'session-expired'/)
  assert.match(videos, /Tu sesión terminó\. Redirigiendo al ingreso/)
  assert.match(history, /session-expired/)
  assert.match(videos, /No hubo respuesta de los servicios\. Revisá la conexión/)
})

test('direct Video playback and automatic job navigation remain visible', () => {
  const videos = readSource('../src/pages/videos/VideosPage.tsx')
  const home = readSource('../src/pages/dashboard/DashboardPage.tsx')
  assert.match(videos, /canOpenVideoPlayback\(video\)/)
  assert.match(videos, />Ver video</)
  assert.match(videos, /videoPrimaryAnalysisAction\(video, latestJob\)/)
  assert.match(videos, /analysisJobDetailPath\(analysisAction\.job\)/)
  assert.match(videos, /`\/analisis\/nuevo\?team_id=/)
  assert.match(home, /latestVideoAnalysisJob\(video\.id, jobs\)/)
  assert.match(home, /videoPrimaryAnalysisAction\(video, latestJob, 'Analizar'\)/)
  assert.match(home, /analysisJobDetailPath\(analysisAction\.job\)/)
  assert.match(home, /analysisAction\.type === 'new-analysis' \? <Play[^:]+: <ArrowRight/)
})

test('the primary shell exposes only Inicio, Partidos, Equipos and Jugadores', () => {
  const shell = readSource('../src/components/layout/AppShell.tsx')

  assert.match(shell, /to: '\/dashboard', label: 'Inicio'/)
  assert.match(shell, /to: '\/partidos', label: 'Partidos'/)
  assert.match(shell, /to: '\/equipos', label: 'Equipos'/)
  assert.match(shell, /to: '\/jugadores', label: 'Jugadores'/)
  assert.doesNotMatch(shell, /to: '\/videos'/)
  assert.doesNotMatch(shell, /to: '\/analisis'/)
  assert.doesNotMatch(shell, /to: '\/revision-manual'/)
})

test('temporary MVP copy is absent from login', () => {
  const login = readSource('../src/pages/auth/LoginPage.tsx')
  assert.doesNotMatch(login, /ScoutAI MVP/)
})
