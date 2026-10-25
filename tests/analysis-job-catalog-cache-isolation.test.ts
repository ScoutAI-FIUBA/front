import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AnalysisCatalogIdentityChangedError,
  UserScopedAnalysisCatalogCache,
} from '../src/pages/analysis/user-scoped-analysis-catalog-cache.ts'
import type { AnalysisJobCatalog } from '../src/pages/analysis/analysis-job-catalog.ts'
import type { Team, Video } from '../src/types/index.ts'

const USER_A = 'user-a'
const USER_B = 'user-b'

function team(id: string): Team {
  return {
    id,
    name: `Equipo ${id}`,
    shortName: id.toUpperCase(),
    city: 'Buenos Aires',
    country: 'Argentina',
    isOwn: false,
  }
}

function video(id: string, teamId: string): Video {
  return {
    id,
    teamId,
    title: `Partido ${id}`,
    storageUrl: '',
    uploadedAt: '2026-10-18T12:00:00Z',
    status: 'uploaded',
  }
}

function catalogFor(userId: string, videos: Video[] = []): AnalysisJobCatalog {
  const ownerTeam = team(`team-${userId}`)
  return {
    items: [],
    teams: [ownerTeam],
    videos,
    loadedJobVideoIds: videos.map((item) => item.id),
    partialFailures: [],
    updatedAt: 1_000,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((accept) => {
    resolve = accept
  })
  return { promise, resolve }
}

test('logout invalidates user A catalog before user B starts', async () => {
  const cache = new UserScopedAnalysisCatalogCache(60_000)
  const aVideo = video('video-a', 'team-user-a')
  cache.setIdentity(USER_A)
  await cache.load(USER_A, async () => catalogFor(USER_A, [aVideo]), { now: () => 1_000 })
  assert.deepEqual(cache.peek(USER_A)?.videos, [aVideo])

  cache.setIdentity(null)
  cache.setIdentity(USER_B)

  assert.equal(cache.peek(USER_A), null)
  assert.equal(cache.peek(USER_B), null)
  const bCatalog = await cache.load(USER_B, async () => catalogFor(USER_B), { now: () => 1_000 })
  assert.deepEqual(bCatalog.videos, [])
})

test('a pending request from user A cannot overwrite user B catalog', async () => {
  const cache = new UserScopedAnalysisCatalogCache(60_000)
  const pendingA = deferred<AnalysisJobCatalog>()
  cache.setIdentity(USER_A)
  const aRequest = cache.load(USER_A, () => pendingA.promise)

  cache.setIdentity(USER_B)
  const bCatalog = catalogFor(USER_B, [video('video-b', 'team-user-b')])
  await cache.load(USER_B, async () => bCatalog)
  pendingA.resolve(catalogFor(USER_A, [video('video-a', 'team-user-a')]))

  await assert.rejects(aRequest, AnalysisCatalogIdentityChangedError)
  assert.equal(cache.peek(USER_B), bCatalog)
})

test('late polling from user A cannot replace user B catalog', async () => {
  const cache = new UserScopedAnalysisCatalogCache(60_000)
  const pendingPoll = deferred<AnalysisJobCatalog>()
  cache.setIdentity(USER_A)
  await cache.load(USER_A, async () => catalogFor(USER_A))
  const aPoll = cache.updateFromAsync(USER_A, () => pendingPoll.promise)

  cache.setIdentity(USER_B)
  const bCatalog = catalogFor(USER_B, [video('video-b', 'team-user-b')])
  await cache.load(USER_B, async () => bCatalog)
  pendingPoll.resolve(catalogFor(USER_A, [video('polled-a', 'team-user-a')]))

  await assert.rejects(aPoll, AnalysisCatalogIdentityChangedError)
  assert.equal(cache.peek(USER_B), bCatalog)
})

test('a recent upload from user A is never inserted into user B catalog', async () => {
  const cache = new UserScopedAnalysisCatalogCache(60_000)
  cache.setIdentity(USER_A)
  await cache.load(USER_A, async () => catalogFor(USER_A))
  assert.equal(cache.mutate(USER_A, (catalog) => ({
    ...catalog,
    videos: [...catalog.videos, video('recent-a', 'team-user-a')],
  })), true)
  assert.deepEqual(cache.peek(USER_A)?.videos.map((item) => item.id), ['recent-a'])

  cache.setIdentity(USER_B)
  await cache.load(USER_B, async () => catalogFor(USER_B))
  assert.equal(cache.mutate(USER_A, (catalog) => ({
    ...catalog,
    videos: [...catalog.videos, video('late-a', 'team-user-a')],
  })), false)

  assert.deepEqual(cache.peek(USER_B)?.videos, [])
})

test('the same authenticated user reuses a fresh cached catalog', async () => {
  const cache = new UserScopedAnalysisCatalogCache(60_000)
  const expected = catalogFor(USER_A, [video('video-a', 'team-user-a')])
  let loads = 0
  const loader = async () => {
    loads += 1
    return expected
  }

  cache.setIdentity(USER_A)
  assert.equal(await cache.load(USER_A, loader, { now: () => 1_000 }), expected)
  cache.setIdentity(USER_A)
  assert.equal(await cache.load(USER_A, loader, { now: () => 1_001 }), expected)
  assert.equal(loads, 1)
})
