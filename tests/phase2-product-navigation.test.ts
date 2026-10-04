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

test('new automatic analysis is primary while manual routes stay available', () => {
  const app = readSource('../src/App.tsx')
  const shell = readSource('../src/components/layout/AppShell.tsx')

  assert.match(app, /path="\/analisis\/nuevo" element=\{<AnalysisJobNewPage/)
  assert.match(app, /path="\/revision-manual" element=\{<ManualAnalysisPage/)
  assert.match(app, /path="\/revision-manual\/nuevo" element=\{<AnalysisNewPage/)
  assert.match(app, /path="\/analisis\/:id" element=\{<AnalysisDetailPage/)
  assert.match(shell, /label: 'Revisión manual'/)
  assert.match(shell, />Nuevo análisis</)
})

test('Partidos stays routable but leaves primary navigation and declares mock status', () => {
  const app = readSource('../src/App.tsx')
  const shell = readSource('../src/components/layout/AppShell.tsx')
  const matches = readSource('../src/pages/matches/MatchesPage.tsx')

  assert.match(app, /path="\/partidos" element=\{<MatchesPage/)
  assert.doesNotMatch(shell, /to: '\/partidos'/)
  assert.match(matches, /Herramienta experimental con datos de demostración/)
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

test('desktop relies on the sidebar CTA while page CTAs stay available below lg', () => {
  const home = readSource('../src/pages/dashboard/DashboardPage.tsx')
  const analysis = readSource('../src/pages/analysis/AnalysisPage.tsx')

  assert.match(home, /action=\{<div className="lg:hidden">/)
  assert.match(analysis, /<div className="lg:hidden">/)
  assert.match(home, /Todavía no hay resultados terminados[\s\S]*Nuevo análisis/)
  assert.match(analysis, /catalog\.items\.length === 0[\s\S]*Nuevo análisis/)
})

test('temporary MVP copy is absent from login', () => {
  const login = readSource('../src/pages/auth/LoginPage.tsx')
  assert.doesNotMatch(login, /ScoutAI MVP/)
})
