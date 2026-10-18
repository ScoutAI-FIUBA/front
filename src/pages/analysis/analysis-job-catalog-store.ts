import { analysisJobService, teamService, videoService } from '@/services/registry'
import type { ProcessingJob, Video } from '@/types'
import {
  composeAnalysisJobCatalog,
  refreshActiveCatalogJobs,
  upsertAnalysisCatalogVideo,
  type AnalysisCatalogSeed,
  type AnalysisJobCatalog,
} from './analysis-job-catalog'
import {
  AnalysisCatalogIdentityChangedError,
  UserScopedAnalysisCatalogCache,
  isAnalysisCatalogIdentityChangedError,
} from './user-scoped-analysis-catalog-cache'

export { AnalysisCatalogIdentityChangedError, isAnalysisCatalogIdentityChangedError }

export const ANALYSIS_CATALOG_CACHE_TTL_MS = 60_000

const catalogCache = new UserScopedAnalysisCatalogCache(ANALYSIS_CATALOG_CACHE_TTL_MS)

export function setAnalysisJobCatalogIdentity(userId: string | null): void {
  catalogCache.setIdentity(userId)
}

export function peekAnalysisJobCatalog(userId: string): AnalysisJobCatalog | null {
  return catalogCache.peek(userId)
}

export async function loadAnalysisJobCatalog(userId: string, options: {
  force?: boolean
  seed?: AnalysisCatalogSeed
} = {}): Promise<AnalysisJobCatalog> {
  return catalogCache.load(
    userId,
    () => composeAnalysisJobCatalog(
      { teams: teamService, videos: videoService, jobs: analysisJobService },
      { seed: options.seed },
    ),
    { force: options.force },
  )
}

export async function refreshCachedActiveAnalysisJobs(
  userId: string,
  catalog: AnalysisJobCatalog,
): Promise<AnalysisJobCatalog> {
  return catalogCache.updateFromAsync(
    userId,
    () => refreshActiveCatalogJobs(catalog, analysisJobService),
  )
}

export function addCreatedJobToAnalysisCatalog(userId: string, job: ProcessingJob): boolean {
  return catalogCache.mutate(userId, (catalog) => {
    const video = catalog.videos.find((candidate) => candidate.id === job.videoId)
    const team = catalog.teams.find((candidate) => candidate.id === job.teamId)
    if (!video || !team) return catalog
    return {
      ...catalog,
      items: [
        { job, video, team },
        ...catalog.items.filter((item) => item.job.id !== job.id),
      ],
      updatedAt: Date.now(),
    }
  })
}

export function upsertVideoInAnalysisCatalog(userId: string, video: Video): boolean {
  return catalogCache.mutate(
    userId,
    (catalog) => upsertAnalysisCatalogVideo(catalog, video),
  )
}

export function resetAnalysisJobCatalogForTests(): void {
  catalogCache.reset()
}
