import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createMatchVideoPreparationPoller,
  type MatchVideoPreparationPollingScheduler,
} from '../src/pages/matches/match-video-preparation-polling.ts'
import type { Video, VideoStatus } from '../src/types/index.ts'

function video(status: VideoStatus): Video {
  return {
    id: 'video-1',
    teamId: 'team-1',
    title: 'Partido',
    storageUrl: '',
    uploadedAt: '2026-10-06T12:00:00Z',
    status,
  }
}

class ManualScheduler implements MatchVideoPreparationPollingScheduler {
  private nextId = 1
  readonly timers = new Map<number, () => void>()

  setTimeout(callback: () => void): number {
    const id = this.nextId
    this.nextId += 1
    this.timers.set(id, callback)
    return id
  }

  clearTimeout(handle: unknown): void {
    this.timers.delete(handle as number)
  }

  runNext(): void {
    const next = this.timers.entries().next().value as [number, () => void] | undefined
    if (!next) return
    this.timers.delete(next[0])
    next[1]()
  }
}

async function flushPolling(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve))
}

test('preparation polling replaces PENDING_UPLOAD with the real READY video and stops', async () => {
  const scheduler = new ManualScheduler()
  const updates: Video[] = []
  const poller = createMatchVideoPreparationPoller({
    scheduler,
    load: async () => video('uploaded'),
    onVideo: (next) => updates.push(next),
  })

  poller.start('processing')
  assert.equal(scheduler.timers.size, 1)
  scheduler.runNext()
  await flushPolling()

  assert.equal(updates[0]?.status, 'uploaded')
  assert.equal(scheduler.timers.size, 0)
})

test('preparation polling accepts FAILED as terminal without inventing progress', async () => {
  const scheduler = new ManualScheduler()
  let terminalStatus: VideoStatus | null = null
  const poller = createMatchVideoPreparationPoller({
    scheduler,
    load: async () => video('failed'),
    onVideo: (next) => { terminalStatus = next.status },
  })

  poller.start('processing')
  scheduler.runNext()
  await flushPolling()

  assert.equal(terminalStatus, 'failed')
  assert.equal(scheduler.timers.size, 0)
})

test('preparation polling is bounded and never starts for a terminal material state', async () => {
  const scheduler = new ManualScheduler()
  let exhausted = 0
  let loadCalls = 0
  const poller = createMatchVideoPreparationPoller({
    scheduler,
    maxAttempts: 2,
    load: async () => {
      loadCalls += 1
      return video('processing')
    },
    onVideo: () => undefined,
    onExhausted: () => { exhausted += 1 },
  })

  poller.start('uploaded')
  assert.equal(scheduler.timers.size, 0)

  poller.start('processing')
  scheduler.runNext()
  await flushPolling()
  scheduler.runNext()
  await flushPolling()

  assert.equal(loadCalls, 2)
  assert.equal(exhausted, 1)
  assert.equal(scheduler.timers.size, 0)
})
