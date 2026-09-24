import type { IAnalysisService } from '@/services/contracts/analysis.service'
import type { ITeamService } from '@/services/contracts/teams.service'
import type { IVideoService } from '@/services/contracts/videos.service'
import type { ActivityItem, Team, Video } from '@/types'

interface VideosPageDataDependencies {
  videos: Pick<IVideoService, 'list'>
  teams: Pick<ITeamService, 'list'>
}

export interface VideosPageData {
  videos: Video[]
  teams: Team[]
}

export async function loadVideosPageData({
  videos,
  teams,
}: VideosPageDataDependencies): Promise<VideosPageData> {
  const [loadedVideos, loadedTeams] = await Promise.all([
    videos.list(),
    teams.list(),
  ])

  return { videos: loadedVideos, teams: loadedTeams }
}

export async function loadVideosRecentActivity(
  mockModeEnabled: boolean,
  analysis: Pick<IAnalysisService, 'getRecentActivity'>,
): Promise<ActivityItem[]> {
  if (!mockModeEnabled) return []

  const activity = await analysis.getRecentActivity()
  return activity.filter((item) => item.type === 'video' || item.type === 'analysis')
}
