import type { ProcessingJob, Team, Video } from '../../types/index.ts'
import type { AnalysisJobCatalog } from '../analysis/analysis-job-catalog.ts'
import {
  latestVideoAnalysisJob,
  videoAnalysisState,
  videoMaterialState,
  type VideoAnalysisState,
  type VideoMaterialState,
} from '../videos/video-library-filters.ts'
import { matchDetailPath } from './match-detail.ts'

export type MatchLibraryFilter = 'all' | 'active' | 'done' | 'failed'

export type MatchLibraryDisplayState =
  | 'preparing-file'
  | 'unanalyzed'
  | 'queued'
  | 'analyzing'
  | 'report-ready'
  | 'analysis-error'
  | 'unavailable'

export interface MatchLibraryAction {
  kind: 'new-analysis' | 'job'
  label: 'Analizar' | 'Ver progreso' | 'Ver reporte' | 'Ver problema'
  to: string
}

export interface MatchLibraryItem {
  video: Video
  team: Team | null
  latestJob: ProcessingJob | null
  materialState: VideoMaterialState
  analysisState: VideoAnalysisState
  action: MatchLibraryAction | null
}

export function matchLibraryDisplayState(
  item: Pick<MatchLibraryItem, 'materialState' | 'analysisState'>,
): MatchLibraryDisplayState {
  if (item.materialState !== 'ready') return 'preparing-file'

  switch (item.analysisState) {
    case 'none':
      return 'unanalyzed'
    case 'QUEUED':
      return 'queued'
    case 'RUNNING':
      return 'analyzing'
    case 'DONE':
      return 'report-ready'
    case 'FAILED':
      return 'analysis-error'
    case 'unknown':
      return 'unavailable'
  }
}

export function matchLibraryDisplayLabel(state: MatchLibraryDisplayState): string {
  switch (state) {
    case 'preparing-file':
      return 'Preparando archivo'
    case 'unanalyzed':
      return 'Sin analizar'
    case 'queued':
      return 'En cola'
    case 'analyzing':
      return 'Analizando'
    case 'report-ready':
      return 'Reporte listo'
    case 'analysis-error':
      return 'Error de análisis'
    case 'unavailable':
      return 'Estado no disponible'
  }
}

function jobAction(video: Video, job: ProcessingJob): MatchLibraryAction {
  switch (job.status) {
    case 'QUEUED':
    case 'RUNNING':
      return { kind: 'job', label: 'Ver progreso', to: matchDetailPath(video.id, 'reporte') }
    case 'DONE':
      return { kind: 'job', label: 'Ver reporte', to: matchDetailPath(video.id, 'reporte') }
    case 'FAILED':
      return { kind: 'job', label: 'Ver problema', to: matchDetailPath(video.id, 'reporte') }
  }

  throw new Error(`Estado de análisis no soportado: ${String(job.status)}`)
}

export function buildMatchLibrary(catalog: AnalysisJobCatalog): MatchLibraryItem[] {
  const teamById = new Map(catalog.teams.map((team) => [team.id, team]))
  const jobs = catalog.items.map(({ job }) => job)

  return catalog.videos.map((video) => {
    const latestJob = latestVideoAnalysisJob(video.id, jobs)
    const materialState = videoMaterialState(video)
    const analysisState = videoAnalysisState(video.id, jobs, catalog.loadedJobVideoIds)
    const action = latestJob
      ? jobAction(video, latestJob)
      : materialState === 'ready' && analysisState === 'none'
        ? {
            kind: 'new-analysis' as const,
            label: 'Analizar' as const,
            to: matchDetailPath(video.id, 'reporte'),
          }
        : null

    return {
      video,
      team: teamById.get(video.teamId) ?? null,
      latestJob,
      materialState,
      analysisState,
      action,
    }
  })
}

export function filterMatchLibrary(
  items: MatchLibraryItem[],
  filter: MatchLibraryFilter,
): MatchLibraryItem[] {
  switch (filter) {
    case 'active':
      return items.filter(
        ({ analysisState }) => analysisState === 'QUEUED' || analysisState === 'RUNNING',
      )
    case 'done':
      return items.filter(({ analysisState }) => analysisState === 'DONE')
    case 'failed':
      return items.filter(
        ({ analysisState, materialState }) =>
          analysisState === 'FAILED' || materialState === 'failed',
      )
    case 'all':
      return items
  }
}
