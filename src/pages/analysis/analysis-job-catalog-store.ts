import { analysisJobService, teamService, videoService } from '@/services/registry'
import type { ProcessingJob } from '@/types'
import {
  composeAnalysisJobCatalog,
  refreshActiveCatalogJobs,
  type AnalysisCatalogSeed,
  type AnalysisJobCatalog,
} from './analysis-job-catalog'

export const ANALYSIS_CATALOG_CACHE_TTL_MS = 60_000

let cachedCatalog: AnalysisJobCatalog | null = null
let loadInFlight: Promise<AnalysisJobCatalog> | null = null

export function peekAnalysisJobCatalog(): AnalysisJobCatalog | null {
  return cachedCatalog
}

export async function loadAnalysisJobCatalog(options: {
  force?: boolean
  seed?: AnalysisCatalogSeed
} = {}): Promise<AnalysisJobCatalog> {
  const cacheIsFresh = cachedCatalog
    && Date.now() - cachedCatalog.updatedAt < ANALYSIS_CATALOG_CACHE_TTL_MS
  if (!options.force && cacheIsFresh) return cachedCatalog as AnalysisJobCatalog
  if (loadInFlight) return loadInFlight

  loadInFlight = composeAnalysisJobCatalog(
    { teams: teamService, videos: videoService, jobs: analysisJobService },
    { seed: options.seed },
  ).then((catalog) => {
    cachedCatalog = catalog
    return catalog
  }).finally(() => {
    loadInFlight = null
  })

  return loadInFlight
}

export async function refreshCachedActiveAnalysisJobs(
  catalog: AnalysisJobCatalog,
): Promise<AnalysisJobCatalog> {
  const refreshed = await refreshActiveCatalogJobs(catalog, analysisJobService)
  cachedCatalog = refreshed
  return refreshed
}

export function addCreatedJobToAnalysisCatalog(job: ProcessingJob): void {
  if (!cachedCatalog) return
  const video = cachedCatalog.videos.find((candidate) => candidate.id === job.videoId)
  const team = cachedCatalog.teams.find((candidate) => candidate.id === job.teamId)
  if (!video || !team) return

  cachedCatalog = {
    ...cachedCatalog,
    items: [
      { job, video, team },
      ...cachedCatalog.items.filter((item) => item.job.id !== job.id),
    ],
    updatedAt: Date.now(),
  }
}

export function resetAnalysisJobCatalogForTests(): void {
  cachedCatalog = null
  loadInFlight = null
}
