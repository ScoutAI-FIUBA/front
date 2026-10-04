import type { IAnalysisJobService } from '../../services/contracts/analysis-jobs.service.ts'
import type { ITeamService } from '../../services/contracts/teams.service.ts'
import type { IVideoService } from '../../services/contracts/videos.service.ts'
import { isApiAuthenticationError } from '../../services/api/errors.ts'
import type { ProcessingJob, Team, Video } from '../../types/index.ts'

export const ANALYSIS_CATALOG_TEAM_CONCURRENCY = 3
export const ANALYSIS_CATALOG_JOB_CONCURRENCY = 4

export interface AnalysisCatalogItem {
  job: ProcessingJob
  video: Video
  team: Team
}

export interface AnalysisCatalogFailure {
  scope: 'videos' | 'jobs' | 'active-job'
  teamId: string
  videoId?: string
}

export interface AnalysisJobCatalog {
  items: AnalysisCatalogItem[]
  teams: Team[]
  videos: Video[]
  loadedJobVideoIds: string[]
  partialFailures: AnalysisCatalogFailure[]
  updatedAt: number
}

export interface AnalysisCatalogDependencies {
  teams: Pick<ITeamService, 'list'>
  videos: Pick<IVideoService, 'filterByTeam'>
  jobs: Pick<IAnalysisJobService, 'listForVideo' | 'get'>
}

export interface AnalysisCatalogSeed {
  teams: Team[]
  videos: Video[]
}

export async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length)
  let cursor = 0

  const worker = async () => {
    while (cursor < values.length) {
      const index = cursor
      cursor += 1
      results[index] = await mapper(values[index], index)
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), values.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}

function newestFirst(left: AnalysisCatalogItem, right: AnalysisCatalogItem): number {
  return Date.parse(right.job.createdAt) - Date.parse(left.job.createdAt)
}

export async function composeAnalysisJobCatalog(
  dependencies: AnalysisCatalogDependencies,
  options: {
    seed?: AnalysisCatalogSeed
    teamConcurrency?: number
    jobConcurrency?: number
    now?: () => number
  } = {},
): Promise<AnalysisJobCatalog> {
  const partialFailures: AnalysisCatalogFailure[] = []
  const teams = options.seed?.teams ?? await dependencies.teams.list()
  let videos: Video[]

  if (options.seed) {
    videos = options.seed.videos
  } else {
    const groups = await mapWithConcurrency(
      teams,
      options.teamConcurrency ?? ANALYSIS_CATALOG_TEAM_CONCURRENCY,
      async (team) => {
        try {
          return await dependencies.videos.filterByTeam(team.id)
        } catch (error) {
          if (isApiAuthenticationError(error)) throw error
          partialFailures.push({ scope: 'videos', teamId: team.id })
          return []
        }
      },
    )
    videos = groups.flat()
  }

  const teamsById = new Map(teams.map((team) => [team.id, team]))
  const loadedJobVideoIds: string[] = []
  const itemGroups = await mapWithConcurrency(
    videos,
    options.jobConcurrency ?? ANALYSIS_CATALOG_JOB_CONCURRENCY,
    async (video) => {
      const team = teamsById.get(video.teamId)
      if (!team) return []

      try {
        const jobs = await dependencies.jobs.listForVideo(video.id, video.teamId)
        loadedJobVideoIds.push(video.id)
        return jobs.map((job) => ({ job, video, team }))
      } catch (error) {
        if (isApiAuthenticationError(error)) throw error
        partialFailures.push({ scope: 'jobs', teamId: video.teamId, videoId: video.id })
        return []
      }
    },
  )

  return {
    items: itemGroups.flat().sort(newestFirst),
    teams,
    videos: [...videos].sort((left, right) => Date.parse(right.uploadedAt) - Date.parse(left.uploadedAt)),
    loadedJobVideoIds,
    partialFailures,
    updatedAt: options.now?.() ?? Date.now(),
  }
}

export function hasActiveCatalogJobs(catalog: AnalysisJobCatalog): boolean {
  return catalog.items.some(({ job }) => job.status === 'QUEUED' || job.status === 'RUNNING')
}

export async function refreshActiveCatalogJobs(
  catalog: AnalysisJobCatalog,
  jobs: Pick<IAnalysisJobService, 'get'>,
  concurrency = ANALYSIS_CATALOG_JOB_CONCURRENCY,
  now: () => number = Date.now,
): Promise<AnalysisJobCatalog> {
  const activeItems = catalog.items.filter(
    ({ job }) => job.status === 'QUEUED' || job.status === 'RUNNING',
  )
  if (activeItems.length === 0) return catalog

  const refreshedById = new Map<string, ProcessingJob>()
  const failures: AnalysisCatalogFailure[] = []

  await mapWithConcurrency(activeItems, concurrency, async (item) => {
    try {
      refreshedById.set(item.job.id, await jobs.get(item.job.id, item.job.teamId))
    } catch (error) {
      if (isApiAuthenticationError(error)) throw error
      failures.push({ scope: 'active-job', teamId: item.job.teamId, videoId: item.job.videoId })
    }
  })

  return {
    ...catalog,
    items: catalog.items
      .map((item) => ({ ...item, job: refreshedById.get(item.job.id) ?? item.job }))
      .sort(newestFirst),
    partialFailures: [
      ...catalog.partialFailures.filter((failure) => failure.scope !== 'active-job'),
      ...failures,
    ],
    updatedAt: now(),
  }
}
