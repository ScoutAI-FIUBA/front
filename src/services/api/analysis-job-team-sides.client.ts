import type {
  AnalysisJobTeamSide,
  AnalysisJobTeamSides,
  DetectedAnalysisJobTeamSide,
  ProcessingJob,
} from '../../types/index.ts'
import type { IAnalysisJobTeamSideService } from '../contracts/analysis-job-team-sides.service.ts'
import {
  mapProcessingJob,
  type AnalysisJobRequest,
  type ApiProcessingJob,
} from './analysis-jobs.client.ts'

export interface ApiDetectedAnalysisJobTeamSide {
  team_side: AnalysisJobTeamSide
  track_count: number
  numbers: string[]
  roster_matches: number
}

export interface ApiAnalysisJobTeamSides {
  job_id: string
  video_id: string
  our_team_side: AnalysisJobTeamSide | null
  suggested_team_side: AnalysisJobTeamSide | null
  sides: ApiDetectedAnalysisJobTeamSide[]
  roster_numbers_known: number
}

interface ProcessingJobResponse {
  job: ApiProcessingJob
}

function withTeamId(path: string, teamId: string): string {
  return `${path}?team_id=${encodeURIComponent(teamId)}`
}

export function mapDetectedAnalysisJobTeamSide(
  side: ApiDetectedAnalysisJobTeamSide,
): DetectedAnalysisJobTeamSide {
  return {
    teamSide: side.team_side,
    trackCount: side.track_count,
    numbers: side.numbers,
    rosterMatches: side.roster_matches,
  }
}

export function mapAnalysisJobTeamSides(
  response: ApiAnalysisJobTeamSides,
): AnalysisJobTeamSides {
  return {
    jobId: response.job_id,
    videoId: response.video_id,
    ourTeamSide: response.our_team_side,
    suggestedTeamSide: response.suggested_team_side,
    sides: response.sides.map(mapDetectedAnalysisJobTeamSide),
    rosterNumbersKnown: response.roster_numbers_known,
  }
}

export function createAnalysisJobTeamSideService(
  request: AnalysisJobRequest,
): IAnalysisJobTeamSideService {
  return {
    async get(jobId, teamId): Promise<AnalysisJobTeamSides> {
      const path = withTeamId(
        `/jobs/${encodeURIComponent(jobId)}/team-sides`,
        teamId,
      )
      const data = await request<ApiAnalysisJobTeamSides>(path)
      return mapAnalysisJobTeamSides(data)
    },

    async setOurTeamSide(jobId, teamId, side): Promise<ProcessingJob> {
      const path = withTeamId(
        `/jobs/${encodeURIComponent(jobId)}/our-team`,
        teamId,
      )
      const data = await request<ProcessingJobResponse>(path, {
        method: 'PUT',
        body: JSON.stringify({ team_side: side }),
      })
      return mapProcessingJob(data.job)
    },
  }
}
