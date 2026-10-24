import type { BoxScorePlayerLine, MatchRecord, MatchSide, ShootingSplit } from '../../types/index.ts'

const NO_VALUE = '—'

/** Backend percentages are already 0..100 with one decimal; they are only formatted here, never recomputed. */
export function formatPct(pct: number | null): string {
  if (pct === null || !Number.isFinite(pct)) return NO_VALUE
  return `${pct.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

export function formatSplit(split: ShootingSplit): string {
  return `${split.made}/${split.attempted}`
}

export function formatPlusMinus(value: number): string {
  if (value > 0) return `+${value}`
  if (value < 0) return `-${Math.abs(value)}`
  return '0'
}

/** 'YYYY-MM-DD' -> 'dd/mm/aaaa' by splitting the string: a Date would shift the day with the timezone. */
export function formatMatchDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value
  return `${match[3]}/${match[2]}/${match[1]}`
}

/** Keeps the file order. */
export function splitPlayed(
  players: BoxScorePlayerLine[],
  side: MatchSide,
): { played: BoxScorePlayerLine[]; didNotPlay: BoxScorePlayerLine[] } {
  const sidePlayers = players.filter((player) => player.teamSide === side)
  return {
    played: sidePlayers.filter((player) => player.played),
    didNotPlay: sidePlayers.filter((player) => !player.played),
  }
}

/** '71 – 73' (local first) or null when the match has no readable stats. */
export function matchScoreline(record: Pick<MatchRecord, 'boxScore'>): string | null {
  const boxScore = record.boxScore
  if (!boxScore) return null
  return `${boxScore.teams.HOME.points} – ${boxScore.teams.AWAY.points}`
}

/** 'Ganó {equipo}', 'Empate' or null when there are no stats to decide on. */
export function winnerLabel(
  record: Pick<MatchRecord, 'boxScore' | 'winnerTeamId'>,
  teamsById: Record<string, { name: string } | undefined>,
): string | null {
  if (!record.boxScore) return null
  if (record.winnerTeamId === null) return 'Empate'
  const name = teamsById[record.winnerTeamId]?.name ?? 'Equipo no disponible'
  return `Ganó ${name}`
}
