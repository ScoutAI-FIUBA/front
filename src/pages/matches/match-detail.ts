import type { IAnalysisJobService } from '../../services/contracts/analysis-jobs.service.ts'
import type { IClipCollectionService } from '../../services/contracts/clip-collections.service.ts'
import type { ITeamService } from '../../services/contracts/teams.service.ts'
import type { IVideoService } from '../../services/contracts/videos.service.ts'
import type {
  ClipCollection,
  ClipCollectionItem,
  ProcessingJob,
  Team,
  Video,
} from '../../types/index.ts'
import { latestVideoAnalysisJob } from '../videos/video-library-filters.ts'

export type MatchDetailTab = 'video' | 'reporte' | 'clips'

export interface MatchDetailModel {
  video: Video
  team: Team | null
  latestJob: ProcessingJob | null
  jobsUnavailable: boolean
}

export interface MatchClipCollection {
  collection: ClipCollection
  items: ClipCollectionItem[] | null
}

export interface MatchClipsModel {
  collections: MatchClipCollection[]
  hasPartialFailure: boolean
}

interface MatchDetailDependencies {
  videos: Pick<IVideoService, 'getById'>
  teams: Pick<ITeamService, 'getById'>
  jobs: Pick<IAnalysisJobService, 'listForVideo'>
}

export function matchDetailPath(videoId: string, tab: MatchDetailTab = 'video'): string {
  const base = `/partidos/${encodeURIComponent(videoId)}`
  return tab === 'video' ? base : `${base}?tab=${tab}`
}

export function resolveMatchDetailTab(searchParams: URLSearchParams): MatchDetailTab {
  const requested = searchParams.get('tab')
  return requested === 'reporte' || requested === 'clips' ? requested : 'video'
}

export function matchAnalysisPath(video: Video): string {
  const searchParams = new URLSearchParams({ team_id: video.teamId, video_id: video.id })
  return `/analisis/nuevo?${searchParams.toString()}`
}

export async function loadMatchDetail(
  videoId: string,
  dependencies: MatchDetailDependencies,
): Promise<MatchDetailModel | null> {
  const video = await dependencies.videos.getById(videoId)
  if (!video) return null

  const [teamResult, jobsResult] = await Promise.allSettled([
    dependencies.teams.getById(video.teamId),
    dependencies.jobs.listForVideo(video.id, video.teamId),
  ])

  const jobs = jobsResult.status === 'fulfilled' ? jobsResult.value : []
  return {
    video,
    team: teamResult.status === 'fulfilled' ? teamResult.value : null,
    latestJob: latestVideoAnalysisJob(video.id, jobs),
    jobsUnavailable: jobsResult.status === 'rejected',
  }
}

export async function loadMatchClips(
  videoId: string,
  clips: Pick<IClipCollectionService, 'list' | 'getDetail'>,
): Promise<MatchClipsModel> {
  const collections = await clips.list(videoId)
  const details = await Promise.allSettled(
    collections.map((collection) => clips.getDetail(videoId, collection.id)),
  )

  return {
    collections: collections.map((collection, index) => {
      const detail = details[index]
      return {
        collection,
        items: detail.status === 'fulfilled' ? detail.value.items : null,
      }
    }),
    hasPartialFailure: details.some((detail) => detail.status === 'rejected'),
  }
}

function formatClipTime(milliseconds: number): string {
  const totalSeconds = Math.floor(Math.max(0, milliseconds) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function clipFallbackLabel(item: ClipCollectionItem): string {
  return `Clip ${item.position} · ${formatClipTime(item.startMs)}–${formatClipTime(item.endMs)}`
}

export function clipDisplayTitle(item: ClipCollectionItem): string {
  return item.description?.trim() || clipFallbackLabel(item)
}

export function clipTimeRange(item: ClipCollectionItem): string {
  return `${formatClipTime(item.startMs)}–${formatClipTime(item.endMs)}`
}
