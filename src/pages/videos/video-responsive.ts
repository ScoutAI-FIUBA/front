export const VIDEOS_DESKTOP_BREAKPOINT_PX = 1280

export type VideosLayout = 'cards' | 'table'

export function videosLayoutForViewport(width: number): VideosLayout {
  return width >= VIDEOS_DESKTOP_BREAKPOINT_PX ? 'table' : 'cards'
}
