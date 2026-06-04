import type { Video } from '@/types'

export interface UploadVideoDto {
  teamId: string
  title: string
  description?: string
  file: File
}

export interface IVideoService {
  canRequestAnalysis: boolean
  list(): Promise<Video[]>
  getById(id: string): Promise<Video | null>
  filterByTeam(teamId: string): Promise<Video[]>
  filterByStatus(status: Video['status'] | 'all'): Promise<Video[]>
  upload(dto: UploadVideoDto): Promise<Video>
  requestAnalysis(videoId: string): Promise<Video>
}
