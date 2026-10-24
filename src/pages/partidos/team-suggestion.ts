import type { MatchSide, MatchStatsImportPreview, Team } from '../../types/index.ts'

/** Words that do not identify a team in a federation name. */
const GENERIC_TOKENS = new Set([
  'club', 'ca', 'cd', 'cb', 'cf', 'sc', 'fc', 'asociacion', 'asoc', 'deportivo', 'deportiva',
  'atletico', 'social', 'cultural', 'basquet', 'basquetbol', 'basket', 'baloncesto',
  'de', 'del', 'la', 'el', 'los', 'las', 'y',
])

/** A wrong suggestion is worse than none: the user confirms anyway. */
export const SUGGEST_THRESHOLD = 0.8
/** The duplicate warning is cheap, so it is more sensitive. */
export const SIMILAR_THRESHOLD = 0.6
/** Two candidates this close to each other make the suggestion ambiguous. */
const AMBIGUITY_MARGIN = 0.1

/** Lowercase, no accents, no punctuation, single spaces. `C.A.` collapses to `ca`. */
export function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b([a-z])\.\s*(?=[a-z]\b)/g, '$1')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function nameTokens(name: string): string[] {
  const all = normalizeTeamName(name).split(' ').filter(Boolean)
  const distinctive = all.filter((token) => !GENERIC_TOKENS.has(token))
  return [...new Set(distinctive.length > 0 ? distinctive : all)]
}

/** Numbers and single letters tell apart `Sub 17`/`Sub 19` and `Equipo A`/`Equipo B`. */
const isDiscriminator = (token: string) => token.length === 1 || /\d/.test(token)

/** 0..1 similarity of two team names; 0 when they differ in a number or a single letter. */
export function teamNameScore(a: string, b: string): number {
  const left = nameTokens(a)
  const right = nameTokens(b)
  if (left.length === 0 || right.length === 0) return 0
  const rightSet = new Set(right)
  const leftSet = new Set(left)
  const sameDiscriminators =
    left.filter(isDiscriminator).sort().join('|') === right.filter(isDiscriminator).sort().join('|')
  if (!sameDiscriminators) return 0
  const overlap = left.filter((token) => rightSet.has(token)).length
  if (overlap === 0) return 0
  const dice = (2 * overlap) / (leftSet.size + rightSet.size)
  const containment = overlap / Math.min(leftSet.size, rightSet.size)
  return (dice + containment) / 2
}

export interface TeamMatch {
  team: Team
  score: number
}

function rank(name: string, teams: Team[], threshold: number): TeamMatch[] {
  return teams
    .map((team) => ({ team, score: teamNameScore(name, team.name) }))
    .filter((match) => match.score >= threshold)
    .sort((x, y) => y.score - x.score)
}

/** The one existing team that clearly looks like `name`, or null (no match or ambiguous). */
export function suggestTeam(name: string, teams: Team[]): TeamMatch | null {
  const ranked = rank(name, teams, SUGGEST_THRESHOLD)
  if (ranked.length === 0) return null
  if (ranked.length > 1 && ranked[0].score - ranked[1].score < AMBIGUITY_MARGIN) return null
  return ranked[0]
}

/** Existing teams that look like `name`, best first (for the duplicate warning). */
export function similarTeams(name: string, teams: Team[]): TeamMatch[] {
  return rank(name, teams, SIMILAR_THRESHOLD)
}

/** Suggestions for both sides of a file; the same team is never suggested twice (the better score keeps it). */
export function suggestForSides(
  names: Record<MatchSide, string>,
  teams: Team[],
): Record<MatchSide, TeamMatch | null> {
  const home = suggestTeam(names.HOME, teams)
  const away = suggestTeam(names.AWAY, teams)
  if (home && away && home.team.id === away.team.id) {
    return home.score >= away.score ? { HOME: home, AWAY: null } : { HOME: null, AWAY: away }
  }
  return { HOME: home, AWAY: away }
}

/** Defaults for the fields the backend requires but this flow does not ask for. */
export const NEW_TEAM_DEFAULT_CITY = 'Sin especificar'
export const NEW_TEAM_DEFAULT_COUNTRY = 'Argentina'

export function newTeamDefaults(name: string) {
  const trimmed = name.trim()
  return {
    name: trimmed,
    shortName: trimmed.slice(0, 3).toUpperCase(),
    city: NEW_TEAM_DEFAULT_CITY,
    country: NEW_TEAM_DEFAULT_COUNTRY,
  }
}

/** The team names written in the file, per side (empty string when the file has none). */
export function teamNamesInFile(preview: MatchStatsImportPreview): Record<MatchSide, string> {
  const nameFor = (side: MatchSide) =>
    (
      preview.report.teams.find((check) => check.side === side)?.excelName
      || preview.boxScore?.teams[side].name
      || ''
    ).trim()
  return { HOME: nameFor('HOME'), AWAY: nameFor('AWAY') }
}
