interface TimelineThumbnailVideo {
  crossOrigin: string | null
  muted: boolean
  preload: string
  playsInline: boolean
  src: string
}

export function configureTimelineThumbnailVideo(
  video: TimelineThumbnailVideo,
  videoUrl: string,
): void {
  // Canvas may only read a cross-origin video when the object response opts into CORS.
  // This must be assigned before src so the media request uses CORS mode.
  video.crossOrigin = 'anonymous'
  video.muted = true
  video.preload = 'auto'
  video.playsInline = true
  video.src = videoUrl
}

export function timelineThumbnailTimes(duration: number, count: number): number[] {
  if (!Number.isFinite(duration) || duration <= 0 || count <= 0) return []
  return Array.from({ length: count }, (_, index) => ((index + 0.5) / count) * duration)
}

export async function buildTimelineThumbnails(
  duration: number,
  count: number,
  seekFrame: (time: number) => Promise<void>,
  captureFrame: () => string,
  isCancelled: () => boolean = () => false,
): Promise<string[]> {
  try {
    const frames: string[] = []
    for (const time of timelineThumbnailTimes(duration, count)) {
      if (isCancelled()) return []
      await seekFrame(time)
      if (isCancelled()) return []
      frames.push(captureFrame())
    }
    return frames
  } catch {
    // SecurityError from a CORS-blocked canvas and media decode failures share the
    // existing safe fallback: the timeline remains usable without invented frames.
    return []
  }
}
