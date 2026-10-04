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
  assert.equal(VIDEOS_DESKTOP_BREAKPOINT_PX, 1024)
  assert.equal(videosLayoutForViewport(390), 'cards')
  assert.equal(videosLayoutForViewport(VIDEOS_DESKTOP_BREAKPOINT_PX - 1), 'cards')
  assert.equal(videosLayoutForViewport(VIDEOS_DESKTOP_BREAKPOINT_PX), 'table')

  const source = readSource('../src/pages/videos/VideosPage.tsx')
  assert.match(source, /videosLayout === 'table'/)
  assert.match(source, /<article key=\{video\.id\}/)
  assert.match(source, /contentColumnClass/)
  assert.match(source, /Historial de análisis/)
  assert.match(source, /<VideoAnalysisJobs/)
})

test('videos distinguish primary loading, error, retry, and empty states', () => {
  const source = readSource('../src/pages/videos/VideosPage.tsx')

  assert.match(source, /Cargando videos/)
  assert.match(source, /No pudimos cargar los videos/)
  assert.match(source, />\s*Reintentar\s*</)
  assert.match(source, /Todavía no hay videos/)
  assert.match(source, /No hay videos para estos filtros/)
  assert.match(source, /useAnalysisJobCatalog/)
})

test('videos no longer render mock recent activity', () => {
  const pageSource = readSource('../src/pages/videos/VideosPage.tsx')
  const dataSource = readSource('../src/pages/videos/videos-page-data.ts')

  assert.doesNotMatch(pageSource, /Actividad reciente/)
  assert.doesNotMatch(pageSource, /loadVideosRecentActivity/)
  assert.match(dataSource, /if \(!mockModeEnabled\) return \[\]/)
})

test('videos expose automatic analysis directly and keep history secondary', () => {
  const source = readSource('../src/pages/videos/VideosPage.tsx')
  const librarySource = readSource('../src/pages/videos/video-library-filters.ts')

  assert.doesNotMatch(source, /lucide-react[^\n]*\bEye\b/)
  assert.doesNotMatch(source, /to=\{`\/analisis\/\$\{/)
  assert.match(source, /Historial de análisis/)
  assert.match(source, /videoPrimaryAnalysisAction\(video, latestJob\)/)
  assert.match(librarySource, /newAnalysisLabel = 'Nuevo análisis'/)
})

test('DONE workspace keeps team confirmation and technical identity secondary', () => {
  const teamSideSource = readSource('../src/pages/analysis/AnalysisJobTeamSide.tsx')
  const detailSource = readSource('../src/pages/analysis/AnalysisJobDetailPage.tsx')
  const technicalSource = readSource('../src/pages/analysis/AnalysisJobDetails.tsx')

  assert.match(teamSideSource, /Tu equipo:/)
  assert.match(teamSideSource, />\s*Cambiar\s*</)
  assert.match(teamSideSource, />\s*Cancelar\s*</)
  assert.match(teamSideSource, /setIsExpanded\(loaded\.ourTeamSide == null\)/)
  assert.doesNotMatch(detailSource, /job-completed-title/)
  assert.match(detailSource, /id: 'details', label: 'Detalles'/)
  assert.doesNotMatch(detailSource, /ID de análisis \{job\.id\}/)
  assert.match(technicalSource, /ID técnico del análisis/)
})

test('analysis copy explains detected shooting metrics without claiming an official box score', () => {
  const statsSource = readSource('../src/pages/analysis/AnalysisJobShootingStats.tsx')
  const shotChartSource = readSource('../src/pages/analysis/AnalysisJobShotChart.tsx')

  assert.match(statsSource, /Estadísticas de tiro detectadas/)
  assert.match(statsSource, /Puntos detectados/)
  assert.match(statsSource, /no reemplazan un box score oficial/)
  assert.match(shotChartSource, /Mapa de tiros/)

  const courtSource = readSource('../src/components/analysis/ShotChartCourt.tsx')
  assert.match(courtSource, /analysisJobPlayerLabelFromMap/)
  assert.doesNotMatch(courtSource, /`Track \$\{shot\.trackId\}`/)
})

test('on_court copy describes total observed presence instead of a current lineup', () => {
  const statsSource = readSource('../src/pages/analysis/AnalysisJobShootingStats.tsx')
  const shotsSource = readSource('../src/pages/analysis/AnalysisJobShotsWorkspace.tsx')
  const detailsSource = readSource('../src/pages/analysis/AnalysisJobDetails.tsx')
  const combinedSource = [statsSource, shotsSource, detailsSource].join('\n')

  assert.match(combinedSource, /Mayor presencia observada/)
  assert.match(statsSource, /observaciones totales/)
  assert.doesNotMatch(combinedSource, /Jugadores (?:identificados )?en cancha/)
  assert.doesNotMatch(statsSource, />En cancha</)
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
