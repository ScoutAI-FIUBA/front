import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  VIDEOS_DESKTOP_BREAKPOINT_PX,
  videosLayoutForViewport,
} from '../src/pages/videos/video-responsive.ts'

const readSource = (relativePath: string) => readFileSync(
  new URL(relativePath, import.meta.url),
  'utf8',
)

test('videos use cards at mobile widths and preserve the desktop table', () => {
  assert.equal(videosLayoutForViewport(390), 'cards')
  assert.equal(videosLayoutForViewport(VIDEOS_DESKTOP_BREAKPOINT_PX - 1), 'cards')
  assert.equal(videosLayoutForViewport(VIDEOS_DESKTOP_BREAKPOINT_PX), 'table')

  const source = readSource('../src/pages/videos/VideosPage.tsx')
  assert.match(source, /videosLayout === 'table'/)
  assert.match(source, /<article key=\{video\.id\}/)
  assert.match(source, /space-y-4 lg:col-span-3/)
  assert.match(source, /Historial de análisis/)
  assert.match(source, /<VideoAnalysisJobs/)
})

test('videos expose ProcessingJob history as the only visible analysis entry', () => {
  const source = readSource('../src/pages/videos/VideosPage.tsx')

  assert.doesNotMatch(source, /lucide-react[^\n]*\bEye\b/)
  assert.doesNotMatch(source, /to=\{`\/analisis\/\$\{/)
  assert.match(source, /Historial de análisis/)
})

test('DONE detail keeps the confirmed team group compact and technical details closed', () => {
  const teamSideSource = readSource('../src/pages/analysis/AnalysisJobTeamSide.tsx')
  const detailSource = readSource('../src/pages/analysis/AnalysisJobDetailPage.tsx')

  assert.match(teamSideSource, /Tu equipo:/)
  assert.match(teamSideSource, />\s*Cambiar\s*</)
  assert.match(teamSideSource, />\s*Cancelar\s*</)
  assert.match(teamSideSource, /setIsExpanded\(loaded\.ourTeamSide == null\)/)
  assert.doesNotMatch(detailSource, /job-completed-title/)
  assert.doesNotMatch(detailSource, /<details[^>]*\bopen\b/)
  assert.match(detailSource, /Información del análisis/)
})

test('analysis copy explains detected shooting metrics without claiming an official box score', () => {
  const statsSource = readSource('../src/pages/analysis/AnalysisJobShootingStats.tsx')
  const shotChartSource = readSource('../src/pages/analysis/AnalysisJobShotChart.tsx')

  assert.match(statsSource, /Estadísticas de tiro detectadas/)
  assert.match(statsSource, /Puntos detectados/)
  assert.match(statsSource, /no reemplazan un box score oficial/)
  assert.match(shotChartSource, /Mapa de tiros/)

  const courtSource = readSource('../src/components/analysis/ShotChartCourt.tsx')
  assert.match(courtSource, /`Seguimiento \$\{shot\.trackId\}`/)
  assert.doesNotMatch(courtSource, /`Track \$\{shot\.trackId\}`/)
})

test('analysis modules replace raw failures with local product errors and retry', () => {
  const sources = [
    '../src/pages/analysis/AnalysisJobTeamSide.tsx',
    '../src/pages/analysis/AnalysisJobShootingStats.tsx',
    '../src/pages/analysis/AnalysisJobShotChart.tsx',
    '../src/pages/analysis/AnalysisJobCourtPositions.tsx',
    '../src/pages/analysis/AnalysisJobSimilarAnalyses.tsx',
  ].map(readSource)

  for (const source of sources) {
    assert.match(source, /Reintent/)
    assert.doesNotMatch(source, /error instanceof Error \? error\.message/)
  }
})
