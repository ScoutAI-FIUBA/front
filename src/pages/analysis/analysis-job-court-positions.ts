import type { IAnalysisJobCourtPositionsService } from '../../services/contracts/analysis-job-court-positions.service.ts'
import type {
  AnalysisJobCourtPositions,
  AnalysisJobCourtPositionsPlayer,
  AnalysisJobTeamSide,
  ProcessingJob,
  ProcessingJobStatus,
} from '../../types/index.ts'
import { analysisJobTeamGroupLabel } from './analysis-job-team-side.ts'
import {
  analysisJobPlayerKey,
  analysisJobPlayerLabel,
  type AnalysisJobPlayerKey,
} from './analysis-job-player-identity.ts'

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
  | AnalysisJobPlayerKey

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

  return players.filter((player) => analysisJobPlayerKey(player) === filter)
}

export function defaultCourtPositionFilter(
  players: AnalysisJobCourtPositionsPlayer[],
  ourTeamSide: AnalysisJobTeamSide | null,
): CourtPositionsFilter {
  const preferred = ourTeamSide == null
    ? players[0]
    : players.find((player) => player.teamSide === ourTeamSide) ?? players[0]
  return preferred ? analysisJobPlayerKey(preferred) ?? 'all' : 'all'
}

export function isCourtPositionPlayerFilter(
  filter: CourtPositionsFilter,
): filter is AnalysisJobPlayerKey {
  return filter.startsWith('stable:') || filter.startsWith('track:')
}

export function movementSequenceIndex(progress: number, sampleCount: number): number {
  if (sampleCount <= 1) return 0
  const safeProgress = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0))
  return Math.min(sampleCount - 1, Math.round(safeProgress * (sampleCount - 1)))
}

export function courtPositionPlayerLabel(
  player: Pick<AnalysisJobCourtPositionsPlayer, 'stablePlayerId' | 'jerseyNumber' | 'trackId'>,
): string {
  return analysisJobPlayerLabel(player)
}

export function courtPositionSideLabel(side: AnalysisJobTeamSide | null): string {
  return side == null ? 'Sin grupo' : analysisJobTeamGroupLabel(side)
}
