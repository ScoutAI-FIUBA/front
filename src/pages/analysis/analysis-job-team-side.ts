import type { IAnalysisJobTeamSideService } from '../../services/contracts/analysis-job-team-sides.service.ts'
import type { AnalysisJobTeamSide, AnalysisJobTeamSides, ProcessingJob } from '../../types/index.ts'

export function analysisJobTeamGroupLabel(side: AnalysisJobTeamSide): string {
  return `Grupo detectado ${side === 0 ? 'A' : 'B'}`
}

export function initialAnalysisJobTeamSide(
  teamSides: AnalysisJobTeamSides,
): AnalysisJobTeamSide | null {
  return teamSides.ourTeamSide ?? teamSides.suggestedTeamSide
}

interface TeamSideConfirmationOptions {
  service: Pick<IAnalysisJobTeamSideService, 'setOurTeamSide'>
  jobId: string
  teamId: string
  onConfirmed: (job: ProcessingJob) => void
  onError: (error: unknown) => void
  onSubmittingChange: (submitting: boolean) => void
}

export interface AnalysisJobTeamSideConfirmation {
  submit(side: AnalysisJobTeamSide): Promise<void>
}

export function createAnalysisJobTeamSideConfirmation({
  service,
  jobId,
  teamId,
  onConfirmed,
  onError,
  onSubmittingChange,
}: TeamSideConfirmationOptions): AnalysisJobTeamSideConfirmation {
  let inFlight: Promise<void> | null = null

  return {
    submit(side) {
      if (inFlight) return inFlight

      onSubmittingChange(true)
      inFlight = (async () => {
        try {
          const job = await service.setOurTeamSide(jobId, teamId, side)
          onConfirmed(job)
        } catch (error) {
          onError(error)
        } finally {
          onSubmittingChange(false)
          inFlight = null
        }
      })()
      return inFlight
    },
  }
}
