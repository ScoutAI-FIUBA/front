import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  processingShotArcState,
  processingShotArcVisualState,
} from '../src/components/analysis/processing-shot-arc.ts'

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

test('only RUNNING with a real percentage advances on the trajectory', () => {
  for (const variant of ['waiting', 'preparing', 'queued'] as const) {
    assert.deepEqual(processingShotArcVisualState(variant, 64), {
      ...processingShotArcState(0),
      hasRealProgress: false,
    })
  }

  assert.deepEqual(processingShotArcVisualState('running', null), {
    ...processingShotArcState(0),
    hasRealProgress: false,
  })
  assert.deepEqual(processingShotArcVisualState('running', Number.NaN), {
    ...processingShotArcState(0),
    hasRealProgress: false,
  })
  assert.deepEqual(processingShotArcVisualState('running', 64), {
    ...processingShotArcState(64),
    hasRealProgress: true,
  })
})

test('FAILED uses a fixed interrupted-shot composition without claiming progress', () => {
  const failed = processingShotArcVisualState('failed', 91)

  assert.equal(failed.hasRealProgress, false)
  assert.equal(failed.percent, 0)
  assert.deepEqual(failed, processingShotArcVisualState('failed', null))
  assert.notDeepEqual(failed, processingShotArcVisualState('running', 91))
})

test('keeps the visual decorative, reduced-motion safe, and preserves the legacy RUNNING scope', () => {
  const componentSource = readSource('../src/components/analysis/ProcessingShotArc.tsx')
  const overviewSource = readSource('../src/pages/analysis/AnalysisJobOverview.tsx')
  const reportSource = readSource('../src/pages/matches/MatchDetailPage.tsx')
  const runningStart = overviewSource.indexOf("job.status === 'RUNNING'")
  const failedStart = overviewSource.indexOf("job.status === 'FAILED'")
  const doneStart = overviewSource.lastIndexOf('const teamStats')

  assert.match(componentSource, /aria-hidden="true"/)
  assert.match(componentSource, /presentation === 'legacy'/)
  assert.match(componentSource, /bg-transparent/)
  assert.match(componentSource, /motion-safe:animate-pulse/)
  assert.match(componentSource, /motion-reduce:transition-none/)
  assert.ok(runningStart >= 0 && failedStart > runningStart && doneStart > failedStart)
  assert.match(overviewSource.slice(runningStart, failedStart), /<ProcessingShotArc/)
  assert.match(overviewSource.slice(runningStart, failedStart), /presentation="legacy"/)
  assert.doesNotMatch(overviewSource.slice(doneStart), /<ProcessingShotArc/)
  assert.match(reportSource, /variant=\{failed \? 'failed' : ready \? 'waiting' : 'preparing'\}/)
  assert.match(reportSource, /variant="queued"/)
  assert.match(reportSource, /variant="running"/)
  assert.match(reportSource, /variant="failed"/)
  assert.doesNotMatch(reportSource, /variant="done"/)
})

test('Partido RUNNING keeps accessible progress text and removes the redundant bar', () => {
  const reportSource = readSource('../src/pages/matches/MatchDetailPage.tsx')
  const runningStart = reportSource.indexOf("job.status === 'RUNNING'")
  const failedStart = reportSource.indexOf("job.status === 'FAILED'")
  const runningSource = reportSource.slice(runningStart, failedStart)

  assert.match(runningSource, /\{job\.progressPercent\}%/)
  assert.match(runningSource, /progressPercent=\{job\.progressPercent\}/)
  assert.doesNotMatch(runningSource, /<Progress/)
})
