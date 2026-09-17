import type {
  AnalysisJobTeamSide,
  AnalysisJobTeamSides,
  ProcessingJob,
} from '@/types'

export interface IAnalysisJobTeamSideService {
  get(jobId: string, teamId: string): Promise<AnalysisJobTeamSides>
  setOurTeamSide(
    jobId: string,
    teamId: string,
    side: AnalysisJobTeamSide,
  ): Promise<ProcessingJob>
}
