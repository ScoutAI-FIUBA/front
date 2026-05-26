import type { Video } from '@/types'

export interface UploadVideoDto {
  matchId: string
  teamId: string
  title: string
  rivalName?: string
  fileName?: string
}

export interface IVideoService {
  list(): Promise<Video[]>
  getById(id: string): Promise<Video | null>
  filterByTeam(teamId: string): Promise<Video[]>
  filterByStatus(status: Video['status'] | 'all'): Promise<Video[]>
  upload(dto: UploadVideoDto): Promise<Video>
  requestAnalysis(videoId: string): Promise<Video>
}
