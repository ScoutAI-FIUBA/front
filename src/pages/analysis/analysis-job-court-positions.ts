import type { IAnalysisJobCourtPositionsService } from '../../services/contracts/analysis-job-court-positions.service.ts'
import type {
  AnalysisJobCourtPositions,
  AnalysisJobCourtPositionsPlayer,
  AnalysisJobTeamSide,
  ProcessingJob,
  ProcessingJobStatus,
} from '../../types/index.ts'

export interface AnalysisJobCourtPositionsLoadContext {
  jobId: string
  teamId: string
  status: ProcessingJobStatus
}

export type CourtPositionsFilter =
  | 'all'
  | 'side-0'
  | 'side-1'
  | 'unassigned'
  | `track:${number}`

export function analysisJobCourtPositionsContextForJob(
  job: Pick<ProcessingJob, 'id' | 'teamId' | 'status'>,
): AnalysisJobCourtPositionsLoadContext {
  return {
    jobId: job.id,
    teamId: job.teamId,
    status: job.status,
  }
}

export function analysisJobCourtPositionsLoadKey(
  context: AnalysisJobCourtPositionsLoadContext,
): string | null {
  if (context.status !== 'DONE') return null
  return `${context.jobId}:${context.teamId}`
}

export async function loadAnalysisJobCourtPositions(
  context: AnalysisJobCourtPositionsLoadContext,
  service: Pick<IAnalysisJobCourtPositionsService, 'get'>,
): Promise<AnalysisJobCourtPositions | null> {
  if (!analysisJobCourtPositionsLoadKey(context)) return null
  return service.get(context.jobId, context.teamId)
}

export function filterCourtPositionPlayers(
  players: AnalysisJobCourtPositionsPlayer[],
  filter: CourtPositionsFilter,
): AnalysisJobCourtPositionsPlayer[] {
  if (filter === 'all') return players
  if (filter === 'side-0') return players.filter((player) => player.teamSide === 0)
  if (filter === 'side-1') return players.filter((player) => player.teamSide === 1)
  if (filter === 'unassigned') return players.filter((player) => player.teamSide == null)

  const trackId = Number(filter.slice('track:'.length))
  return players.filter((player) => player.trackId === trackId)
}

export function courtPositionPlayerLabel(
  player: Pick<AnalysisJobCourtPositionsPlayer, 'jerseyNumber' | 'trackId'>,
): string {
  return player.jerseyNumber
    ? `#${player.jerseyNumber} · Track ${player.trackId}`
    : `Track ${player.trackId}`
}

export function courtPositionSideLabel(side: AnalysisJobTeamSide | null): string {
  return side == null ? 'Sin lado' : `Lado ${side}`
}
