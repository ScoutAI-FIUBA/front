import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const readSource = (relativePath: string) => readFileSync(
  new URL(relativePath, import.meta.url),
  'utf8',
)

test('manual mock details do not invent heatmap metrics', () => {
  const mockSource = readSource('../src/services/mock/analysis.mock.ts')
  const typeSource = readSource('../src/types/index.ts')

  assert.doesNotMatch(mockSource, /Math\.random\(/)
  assert.doesNotMatch(mockSource, /heatmapPercent/)
  assert.doesNotMatch(typeSource, /heatmapPercent/)
})

test('real API mode does not load mock manual sessions or legacy mock details', () => {
  const listSource = readSource('../src/pages/analysis/ManualAnalysisPage.tsx')
  const detailSource = readSource('../src/pages/analysis/AnalysisDetailPage.tsx')

  const listGuard = listSource.indexOf('if (!isMockApiEnabled)')
  const listMockCall = listSource.indexOf('analysisService.listSessions()')
  assert.ok(listGuard >= 0)
  assert.ok(listMockCall > listGuard)
  assert.match(listSource.slice(listGuard, listMockCall), /setSessions\(\[\]\)[\s\S]*return/)

  const detailGuard = detailSource.indexOf('if (!isMockApiEnabled)')
  const detailMockCall = detailSource.indexOf('analysisService.getBySessionId(id)')
  assert.ok(detailGuard >= 0)
  assert.ok(detailMockCall > detailGuard)
  assert.match(detailSource.slice(detailGuard, detailMockCall), /setLoadState\('not-found'\)[\s\S]*return/)
})

test('real manual review persists clips and exits before fabricating an AnalysisSession', () => {
  const source = readSource('../src/pages/analysis/AnalysisNewPage.tsx')

  const createCollection = source.indexOf('clipCollectionService.create(')
  const persistClips = source.indexOf('clipCollectionService.addClips(')
  const realApiGuard = source.indexOf('if (!isMockApiEnabled)')
  const mockSessionCall = source.indexOf('analysisService.saveManualAnalysis(')

  assert.ok(createCollection >= 0)
  assert.ok(persistClips > createCollection)
  assert.ok(realApiGuard > persistClips)
  assert.ok(mockSessionCall > realApiGuard)
  assert.match(
    source.slice(realApiGuard, mockSessionCall),
    /navigate\(`\/videos\/\$\{preparedSetup\.video\.id\}\/colecciones\/\$\{collection\.id\}`\)[\s\S]*return/,
  )
})

test('clip fallback uses only persisted position and time range', () => {
  const pageSource = readSource('../src/pages/videos/VideoCollectionDetailPage.tsx')
  const typeSource = readSource('../src/types/index.ts')
  const itemShape = typeSource.match(/export interface ClipCollectionItem \{([\s\S]*?)\n\}/)?.[1]

  assert.ok(itemShape)
  assert.doesNotMatch(itemShape, /\blabel\b|\bnote\b|\bplayerIds?\b/)
  assert.match(
    pageSource,
    /Clip \{item\.position\} · \{formatSeconds\(item\.startMs \/ 1000\)\}–\{formatSeconds\(item\.endMs \/ 1000\)\}/,
  )
  assert.match(
    pageSource,
    /Clip \{selectedItem\.position\} · \{formatSeconds\(selectedItem\.startMs \/ 1000\)\}–\{formatSeconds\(selectedItem\.endMs \/ 1000\)\}/,
  )
})
