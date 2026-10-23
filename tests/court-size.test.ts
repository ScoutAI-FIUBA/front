import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { courtColumnStyle, courtFrameStyle } from '../src/components/analysis/court-size.ts'

const court = { lengthM: 28, widthM: 15 }

test('courtFrameStyle keeps the aspect ratio, fits the viewport height and centres the court', () => {
  const style = courtFrameStyle(court)
  assert.equal(style.aspectRatio, '28 / 15')
  assert.equal(style.width, '100%')
  assert.equal(style.marginInline, 'auto')
  assert.match(style.maxWidth, /100dvh/)
  assert.ok(style.maxWidth.includes('28 / 15'))
  assert.deepEqual(
    { ...courtColumnStyle(court) },
    { width: '100%', maxWidth: style.maxWidth, marginInline: 'auto' },
  )
})

test('court components use the shared frame style instead of inline aspect ratio', () => {
  for (const file of ['CourtPositionsCourt', 'CourtPositionsHeatmap', 'CourtPositionsPlayback', 'ShotChartCourt']) {
    const source = readFileSync(new URL(`../src/components/analysis/${file}.tsx`, import.meta.url), 'utf8')
    assert.ok(source.includes('courtFrameStyle(court)'), `${file} uses courtFrameStyle`)
    assert.ok(!source.includes('aspectRatio: `${court.lengthM} / ${court.widthM}`'), `${file} has no inline aspectRatio`)
  }
})
