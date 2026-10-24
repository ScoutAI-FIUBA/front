import type { MatchRecord, MatchSide, Video } from '../../types/index.ts'

// Re-exported so the video page does not import the box-score module (its tests keep that page free of score wording).
export { formatMatchDate } from './box-score-format.ts'

export type LinkCandidateState = 'free' | 'this-match' | 'other-match'

export interface LinkCandidate {
  video: Video
  side: MatchSide
  state: LinkCandidateState
}

export const VIDEOS_NOTE = 'Pueden ser clips o el partido completo.'
export const VIDEOS_EMPTY = 'Todavía no vinculaste videos a este partido'
export const OTHER_MATCH_LABEL = 'Ya está vinculado a otro partido'
export const THIS_MATCH_LABEL = 'Ya está vinculado a este partido'
export const MOVE_CONFIRMATION = 'Se va a mover a este partido'
export const TEAM_NOT_IN_MATCH_COPY = 'Ese video es de un equipo que no juega este partido.'

/** The backend list already omits deleted videos; this keeps a stale status from ever being shown. */
function isDeleted(video: Video): boolean {
  return (video.status as string) === 'deleted'
}

function newestFirst(left: Video, right: Video): number {
  return right.uploadedAt.localeCompare(left.uploadedAt)
}

/** Videos linked to the match, newest first. */
export function linkedVideos(match: Pick<MatchRecord, 'id'>, videos: readonly Video[]): Video[] {
  return videos
    .filter((video) => video.linkedMatchId === match.id && !isDeleted(video))
    .sort(newestFirst)
}

/**
 * Videos that can be linked: they belong to the home or the away team and are neither deleted nor failed.
 * Home team first, then away; newest first inside each team.
 */
export function linkCandidates(
  match: Pick<MatchRecord, 'id' | 'homeTeamId' | 'awayTeamId'>,
  videos: readonly Video[],
): LinkCandidate[] {
  const usable = videos.filter((video) => !isDeleted(video) && video.status !== 'failed')
  const forSide = (side: MatchSide, teamId: string): LinkCandidate[] =>
    usable
      .filter((video) => video.teamId === teamId)
      .sort(newestFirst)
      .map((video) => ({
        video,
        side,
        state: video.linkedMatchId === null || video.linkedMatchId === undefined
          ? 'free'
          : video.linkedMatchId === match.id
            ? 'this-match'
            : 'other-match',
      }))
  return [...forSide('HOME', match.homeTeamId), ...forSide('AWAY', match.awayTeamId)]
}

export const LINKED_MATCH_FALLBACK = 'Ver partido vinculado'

/** 'Partido: Local vs Visitante · dd/mm/aaaa' (the date is already formatted). */
export function linkedMatchLabel(homeName: string, awayName: string, formattedDate: string): string {
  return `Partido: ${homeName} vs ${awayName} · ${formattedDate}`
}
