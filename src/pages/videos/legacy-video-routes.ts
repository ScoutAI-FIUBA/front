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

/** App-made links to the old video detail (/partidos/:videoId) always carried ?tab=. */
export function isLegacyVideoDetailSearch(search: string): boolean {
  return new URLSearchParams(search).has('tab')
}
