import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { processingShotArcState } from '../src/components/analysis/processing-shot-arc.ts'

const readSource = (relativePath: string) => readFileSync(
  new URL(relativePath, import.meta.url),
  'utf8',
)

test('maps the real processing percentage to the shot trajectory', () => {
  const start = processingShotArcState(0)
  const middle = processingShotArcState(50)
  const end = processingShotArcState(100)

  assert.deepEqual(start, {
    percent: 0,
    ballX: 30,
    ballY: 102,
    strokeDashoffset: 100,
  })
  assert.equal(middle.percent, 50)
  assert.equal(middle.strokeDashoffset, 50)
  assert.ok(middle.ballX > start.ballX && middle.ballX < end.ballX)
  assert.ok(middle.ballY < start.ballY)
  assert.deepEqual(end, {
    percent: 100,
    ballX: 314,
    ballY: 58,
    strokeDashoffset: 0,
  })
})

test('clamps only the decorative position to the visible trajectory', () => {
  assert.deepEqual(processingShotArcState(-15), processingShotArcState(0))
  assert.deepEqual(processingShotArcState(125), processingShotArcState(100))
  assert.deepEqual(processingShotArcState(Number.NaN), processingShotArcState(0))
})

test('keeps the visual decorative, reduced-motion safe, and scoped to RUNNING jobs', () => {
  const componentSource = readSource('../src/components/analysis/ProcessingShotArc.tsx')
  const overviewSource = readSource('../src/pages/analysis/AnalysisJobOverview.tsx')
  const runningStart = overviewSource.indexOf("job.status === 'RUNNING'")
  const failedStart = overviewSource.indexOf("job.status === 'FAILED'")
  const doneStart = overviewSource.indexOf('const teamStats')

  assert.match(componentSource, /aria-hidden="true"/)
  assert.match(componentSource, /motion-reduce:transition-none/)
  assert.ok(runningStart >= 0 && failedStart > runningStart && doneStart > failedStart)
  assert.match(overviewSource.slice(runningStart, failedStart), /<ProcessingShotArc/)
  assert.doesNotMatch(overviewSource.slice(doneStart), /<ProcessingShotArc/)
})
