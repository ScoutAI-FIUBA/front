import type { ProcessingJob, Video } from '../../types/index.ts'

export type VideoMaterialFilter = 'all' | 'ready' | 'preparing' | 'failed'
export type VideoMaterialState = Exclude<VideoMaterialFilter, 'all'>
export type VideoAnalysisFilter = 'all' | 'none' | 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED'
export type VideoAnalysisState = Exclude<VideoAnalysisFilter, 'all'> | 'unknown'
export type VideoPrimaryAnalysisAction =
  | { type: 'new-analysis'; label: string }
  | { type: 'analysis-job'; label: 'Ver progreso' | 'Ver análisis' | 'Ver detalle'; job: ProcessingJob }

export function videoMaterialState(video: Video): VideoMaterialState {
  if (video.status === 'processing') return 'preparing'
  if (video.status === 'failed') return 'failed'
  return 'ready'
}

export function videoMaterialLabel(state: VideoMaterialState): string {
  if (state === 'preparing') return 'Preparando archivo'
  if (state === 'failed') return 'Error'
  return 'Listo'
}

export function videoAnalysisLabel(state: VideoAnalysisState): string {
  if (state === 'QUEUED') return 'En cola'
  if (state === 'RUNNING') return 'En proceso'
  if (state === 'DONE') return 'Completado'
  if (state === 'FAILED') return 'Fallido'
  if (state === 'none') return 'Sin análisis'
  return 'No verificado'
}

export function videoPrimaryAnalysisAction(
  video: Video,
  latestJob: ProcessingJob | null,
  newAnalysisLabel = 'Nuevo análisis',
): VideoPrimaryAnalysisAction | null {
  if (latestJob) {
    if (latestJob.status === 'QUEUED' || latestJob.status === 'RUNNING') {
      return { type: 'analysis-job', label: 'Ver progreso', job: latestJob }
    }
    if (latestJob.status === 'DONE') {
      return { type: 'analysis-job', label: 'Ver análisis', job: latestJob }
    }
    return { type: 'analysis-job', label: 'Ver detalle', job: latestJob }
  }

  return videoMaterialState(video) === 'ready'
    ? { type: 'new-analysis', label: newAnalysisLabel }
    : null
}

export function latestVideoAnalysisJob(videoId: string, jobs: readonly ProcessingJob[]): ProcessingJob | null {
  return jobs
    .filter((job) => job.videoId === videoId)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))[0] ?? null
}

export function videoAnalysisState(
  videoId: string,
  jobs: readonly ProcessingJob[],
  loadedJobVideoIds: readonly string[],
): VideoAnalysisState {
  const latest = latestVideoAnalysisJob(videoId, jobs)
  if (latest) return latest.status
  return loadedJobVideoIds.includes(videoId) ? 'none' : 'unknown'
}

export function filterVideoLibrary(
  videos: readonly Video[],
  options: {
    teamId: string
    material: VideoMaterialFilter
    analysis: VideoAnalysisFilter
    jobs: readonly ProcessingJob[]
    loadedJobVideoIds: readonly string[]
  },
): Video[] {
  return videos.filter((video) => {
    if (options.teamId !== 'all' && video.teamId !== options.teamId) return false
    if (options.material !== 'all' && videoMaterialState(video) !== options.material) return false
    if (options.analysis !== 'all' && videoAnalysisState(video.id, options.jobs, options.loadedJobVideoIds) !== options.analysis) return false
    return true
  })
}
