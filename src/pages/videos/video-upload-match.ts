import type { MatchRecord } from '../../types/index.ts'
import { formatMatchDate } from '../partidos/box-score-format.ts'

/** Radix Select does not accept an empty value, so "no match" has its own sentinel. */
export const NO_MATCH_VALUE = 'none'
export const NO_MATCH_LABEL = 'Sin partido'
export const MATCH_LOAD_ERROR_NOTE = 'No pudimos cargar los partidos. Podés subir el video igual y vincularlo después desde el partido.'
export const MATCH_LINK_FAILED_TOAST = 'El video se subió pero no se pudo vincular al partido. Podés vincularlo desde el partido.'

export interface UploadMatchOption {
  value: string
  label: string
}

/** 'Local vs Visitante · dd/mm/aaaa' */
export function uploadMatchLabel(match: MatchRecord, teamNames: ReadonlyMap<string, string>): string {
  const nameOf = (teamId: string) => teamNames.get(teamId) ?? 'Equipo no disponible'
  return `${nameOf(match.homeTeamId)} vs ${nameOf(match.awayTeamId)} · ${formatMatchDate(match.matchDate)}`
}

/** Matches played by the team, newest first. */
export function uploadMatchOptions(
  matches: readonly MatchRecord[],
  teamId: string,
  teamNames: ReadonlyMap<string, string>,
): UploadMatchOption[] {
  return matches
    .filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId)
    .sort((left, right) => right.matchDate.localeCompare(left.matchDate))
    .map((match) => ({ value: match.id, label: uploadMatchLabel(match, teamNames) }))
}

/** The match id to link after the upload, or null when nothing must be linked (none chosen or not offered for this team). */
export function matchIdToLink(selected: string, options: readonly UploadMatchOption[]): string | null {
  if (!selected || selected === NO_MATCH_VALUE) return null
  return options.some((option) => option.value === selected) ? selected : null
}
