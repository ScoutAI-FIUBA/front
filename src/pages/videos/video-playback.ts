import type { IVideoService } from '@/services/contracts/videos.service'
import type { Video } from '@/types'

export function canOpenVideoPlayback(video: Video): boolean {
  return video.status === 'uploaded'
}

export async function loadVideoPlayback(
  videoId: string,
  videos: Pick<IVideoService, 'getById'>,
): Promise<Video> {
  const video = await videos.getById(videoId)
  if (!video?.storageUrl) throw new Error('VIDEO_PLAYBACK_UNAVAILABLE')
  return video
}
