export type LegacyVideoDestination = 'library' | 'upload' | 'detail'

export function legacyVideoRedirectPath({
  destination,
  videoId = '',
  search = '',
  hash = '',
}: {
  destination: LegacyVideoDestination
  videoId?: string
  search?: string
  hash?: string
}): string {
  const pathname = destination === 'detail'
    ? `/videos/${encodeURIComponent(videoId)}`
    : destination === 'upload'
      ? '/videos/subir'
      : '/videos'

  return `${pathname}${search}${hash}`
}
