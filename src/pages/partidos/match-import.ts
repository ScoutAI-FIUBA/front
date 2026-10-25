import type {
  MatchSide,
  MatchStatsImportPreview,
  MatchStatsSavePayload,
  TeamMismatchDetail,
  UnlinkedReason,
} from '../../types/index.ts'
import type { RosterPlayerInput, TeamRosterResult } from '../../services/contracts/players.service.ts'
import type { CreateMatchInput, IMatchService } from '../../services/contracts/matches.service.ts'
import {
  ApiNetworkError,
  ApiResponseError,
  ApiTimeoutError,
  isApiAuthenticationError,
} from '../../services/api/errors.ts'
import { normalizeJerseyNumber } from '../../lib/jersey.ts'
import { MatchApiError } from '../../services/api/matches.client.ts'

export const MAX_STATS_FILE_BYTES = 5 * 1024 * 1024
export const STATS_FILE_SOURCE_LABEL = 'Planilla de estadísticas de la federación'
export const STATS_FILE_TYPE_ERROR = 'Elegí la planilla de la federación en .xlsx o .csv'
export const STATS_FILE_SIZE_ERROR = 'El archivo supera 5 MB'
export const UNLINKED_SAVE_NOTE = 'Se guarda con el nombre del archivo, sin vincular a tu plantel.'
export const OVERWRITE_WARNING = 'Esto reemplaza las estadísticas guardadas de este partido. No se puede deshacer.'
export const TEAM_NOT_IN_MATCH_COPY = 'Ese video es de un equipo que no juega este partido.'
export const NOT_EDITABLE_NOTE = 'Los equipos todavía no se pueden editar.'

/** Returns the Spanish error to show, or null when the file can be sent. */
export function validateStatsFile(file: { name: string; size: number }): string | null {
  if (!/\.(xlsx|csv)$/i.test(file.name)) return STATS_FILE_TYPE_ERROR
  if (file.size <= 0) return STATS_FILE_TYPE_ERROR
  if (file.size > MAX_STATS_FILE_BYTES) return STATS_FILE_SIZE_ERROR
  return null
}

export function fileSizeLabel(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024).toLocaleString('es-AR')} KB`
  return `${(size / 1024 / 1024).toLocaleString('es-AR', { maximumFractionDigits: 1 })} MB`
}

/** Message when a newly chosen file is rejected; says so if it also dropped the previous selection. */
export function rejectedFileMessage(problem: string, hadSelectedFile: boolean): string {
  return hadSelectedFile ? `${problem}. Quitamos la planilla que habías elegido antes.` : problem
}

export function playedSummary(count: number): string {
  return count === 1
    ? 'Las estadísticas de 1 jugador que jugó.'
    : `Las estadísticas de ${count} jugadores que jugaron.`
}

export function linkedSummary(count: number): string {
  return count === 1 ? '1 vinculado a tu plantel.' : `${count} vinculados a tu plantel.`
}

export function fileCountsSummary(inFile: number, played: number): string {
  const inFileText = inFile === 1 ? '1 en el archivo' : `${inFile} en el archivo`
  return `${inFileText}, ${played === 1 ? '1 jugó' : `${played} jugaron`}`
}

export const PREVIEW_ROUTE_MISSING_COPY = 'El servidor todavía no tiene la importación de planillas.'

export function sideLabel(side: MatchSide): string {
  return side === 'HOME' ? 'Local' : 'Visitante'
}

export function unlinkedReasonLabel(
  reason: UnlinkedReason | string,
  teamName: string,
  jerseyNumber: string | null,
): string {
  const number = jerseyNumber ?? ''
  switch (reason) {
    case 'no_roster_player':
      return number
        ? `Nadie de tu plantel de ${teamName} usa el número ${number}.`
        : `Nadie de tu plantel de ${teamName} coincide con este jugador.`
    case 'ambiguous_jersey_number':
      return number
        ? `Hay más de un jugador de ${teamName} con el número ${number}.`
        : `Hay más de un jugador de ${teamName} que coincide con este jugador.`
    case 'no_jersey_number':
      return 'El archivo no trae número de camiseta.'
    case 'no_team_selected':
      return 'No hay un equipo elegido para vincular a este jugador.'
    default:
      return 'No se pudo vincular.'
  }
}

const POINTS_MISMATCH = /^(.+?) #(\S+) (.+): points do not equal 2P\/3P\/FT made$/
const JERSEY_TWICE = /^(.+): jersey number (\S+) appears twice$/
const TOTALS_MISMATCH = /^(.+): player points add up to (-?\d+) but the file totals say (-?\d+)$/
const MISMATCH_ACCEPTED =
  /^The file's team (['"])(.*)\1 does not look like (['"])(.*)\3 \(accepted because the mismatch was allowed\)\.?$/

/** Translates the four known backend warnings; anything else is returned verbatim. */
export function translateImportWarning(warning: string): string {
  const points = POINTS_MISMATCH.exec(warning)
  if (points) {
    return `${points[1]} #${points[2]} ${points[3]}: los puntos no coinciden con los tiros convertidos (2P, 3P y TL).`
  }
  const twice = JERSEY_TWICE.exec(warning)
  if (twice) return `${twice[1]}: el número ${twice[2]} aparece dos veces.`
  const totals = TOTALS_MISMATCH.exec(warning)
  if (totals) {
    return `${totals[1]}: los puntos de los jugadores suman ${totals[2]}, pero el total del archivo dice ${totals[3]}.`
  }
  const accepted = MISMATCH_ACCEPTED.exec(warning)
  if (accepted) {
    return `El equipo «${accepted[2]}» del archivo no se parece a «${accepted[4]}». Se aceptó porque elegiste importar igual.`
  }
  return warning
}

export function mismatchMessage(detail: TeamMismatchDetail): string {
  return `Elegiste ${detail.selectedTeam} como ${sideLabel(detail.side)}, pero en el archivo figura «${detail.nameInFile}».`
}

const FALLBACK_DESCRIPTION = 'Intentá de nuevo en unos minutos.'

export interface MatchErrorCopy {
  title: string
  description: string
  /** Backend message (English), shown as secondary 'Detalle técnico'. */
  detail?: string
}

/** Spanish copy per error code. The backend message is kept only as a technical detail. */
export function matchErrorCopy(error: unknown, context?: 'preview'): MatchErrorCopy {
  if (isApiAuthenticationError(error)) {
    return { title: 'Tu sesión terminó', description: 'Ingresá de nuevo para continuar.' }
  }
  if (error instanceof MatchApiError && error.code) {
    const detail = error.message.trim() || undefined
    switch (error.code) {
      case 'TEAM_MISMATCH':
        return {
          title: 'Los equipos no coinciden con la planilla',
          description: 'Los nombres del archivo no se parecen a los equipos que elegiste.',
          detail,
        }
      case 'INVALID_STATS_FILE':
        return {
          title: 'No pudimos leer la planilla',
          description:
            'Revisá que sea la planilla de estadísticas de la federación, no otro tipo de archivo (por ejemplo, una lista de jugadores).',
          detail,
        }
      case 'STATS_FILE_TOO_LARGE':
        return {
          title: STATS_FILE_SIZE_ERROR,
          description: 'Elegí una planilla de hasta 5 MB.',
          detail,
        }
      case 'TEAM_NOT_FOUND':
        return {
          title: 'No encontramos uno de los equipos',
          description: 'Puede que ya no exista. Volvé a elegir los equipos e intentá de nuevo.',
          detail,
        }
      case 'INVALID_MATCH_TEAMS':
        return {
          title: 'Los equipos no son válidos',
          description: 'El equipo local y el visitante tienen que ser distintos.',
          detail,
        }
      case 'INVALID_WINNER_TEAM':
        return {
          title: 'El ganador no es válido',
          description: 'El ganador de las estadísticas no es uno de los equipos del partido. Revisá la planilla.',
          detail,
        }
      case 'PLAYER_NOT_FOUND':
        return {
          title: 'No encontramos a un jugador vinculado',
          description:
            'Un jugador del plantel ya no existe. Si el partido ya se creó, abrilo con "Ir al partido" e importá las estadísticas de nuevo desde ahí; si no, volvé a revisar las estadísticas.',
          detail,
        }
      case 'VALIDATION_ERROR':
        return {
          title: 'Los datos enviados no son válidos',
          description: 'Revisá los campos e intentá de nuevo.',
          detail,
        }
      case 'VIDEO_TEAM_NOT_IN_MATCH':
        return {
          title: 'No se puede vincular este video',
          description: TEAM_NOT_IN_MATCH_COPY,
          detail,
        }
      case 'VIDEO_NOT_FOUND':
        return {
          title: 'No encontramos este video',
          description: 'Puede que ya no exista. Actualizá la lista e intentá de nuevo.',
          detail,
        }
      case 'MATCH_NOT_FOUND':
        return {
          title: 'No encontramos este partido',
          description: 'Puede que el enlace sea incorrecto.',
          detail,
        }
    }
  }
  const message = error instanceof Error ? error.message.trim() : ''
  // A backend without the preview route answers 404/405 with a null code.
  if (
    context === 'preview'
    && error instanceof ApiResponseError
    && (error.status === 404 || error.status === 405)
  ) {
    return {
      title: 'No pudimos leer la planilla',
      description: PREVIEW_ROUTE_MISSING_COPY,
      detail: message || undefined,
    }
  }
  // Timeouts and connection errors already carry Spanish text.
  if (error instanceof ApiTimeoutError || error instanceof ApiNetworkError) {
    return { title: 'No pudimos completar la operación', description: message || FALLBACK_DESCRIPTION }
  }
  return {
    title: 'No pudimos completar la operación',
    description: FALLBACK_DESCRIPTION,
    detail: message || undefined,
  }
}

export interface RunCreateWithStatsParams {
  service: Pick<IMatchService, 'create' | 'saveStats'>
  input: CreateMatchInput
  payload: MatchStatsSavePayload
  /** When set, the match already exists: only the stats PUT is repeated. */
  createdMatchId?: string | null
}

export interface RunCreateWithStatsResult {
  /** Null only when the POST itself failed. */
  matchId: string | null
  statsSaved: boolean
  error: unknown
}

export async function runCreateWithStats({
  service,
  input,
  payload,
  createdMatchId,
}: RunCreateWithStatsParams): Promise<RunCreateWithStatsResult> {
  let matchId = createdMatchId ?? null
  if (!matchId) {
    try {
      matchId = (await service.create(input)).id
    } catch (error) {
      return { matchId: null, statsSaved: false, error }
    }
  }
  try {
    await service.saveStats(matchId, payload)
    return { matchId, statsSaved: true, error: null }
  } catch (error) {
    return { matchId, statsSaved: false, error }
  }
}

export const ROSTER_CONFIRM_LABEL = 'Crear jugadores y guardar'
export const ROSTER_FIELDS_NOTE = 'Fecha de nacimiento, altura, peso y posición quedan vacías; podés completarlas después en Jugadores.'
const NAME_MAX = 120
const LOWER_PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'da', 'di', 'van', 'von'])

function collapse(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function capitalize(word: string): string {
  return word.toLowerCase().replace(/(^|[-'’])(\p{L})/gu, (_match, sep: string, letter: string) => sep + letter.toUpperCase())
}

/** Re-cases only an all-upper-case name; particles stay lower unless they are the first word. */
function recase(name: string): string {
  if (name !== name.toUpperCase() || name === name.toLowerCase()) return name
  return name
    .split(' ')
    .map((word, index) => (index > 0 && LOWER_PARTICLES.has(word.toLowerCase()) ? word.toLowerCase() : capitalize(word)))
    .join(' ')
}

/** Splits a name from the stats file into first and last name; null when it cannot be split (single word). */
export function splitFileName(name: string): { firstName: string; lastName: string } | null {
  const clean = collapse(name)
  let first: string
  let last: string
  const comma = clean.indexOf(',')
  if (comma >= 0) {
    last = collapse(clean.slice(0, comma))
    first = collapse(clean.slice(comma + 1))
  } else {
    const words = clean.split(' ')
    if (words.length < 2) return null
    last = words[words.length - 1]
    first = words.slice(0, -1).join(' ')
  }
  if (!first || !last) return null
  const firstName = recase(first).slice(0, NAME_MAX).trim()
  const lastName = recase(last).slice(0, NAME_MAX).trim()
  return firstName && lastName ? { firstName, lastName } : null
}

export interface RosterCandidate extends RosterPlayerInput {
  /** Name as written in the file, for display. */
  fileName: string
}

/** Players of one side that "Crear plantel" would create; empty when none qualifies. */
export function rosterCandidates(preview: MatchStatsImportPreview, side: MatchSide): RosterCandidate[] {
  const check = preview.report.teams.find((entry) => entry.side === side)
  if (check?.matchesSelectedTeam === false) return []
  const inFile = preview.boxScore?.players.filter((player) => player.teamSide === side) ?? []
  const counts = new Map<string, number>()
  for (const player of inFile) {
    const jersey = player.jerseyNumber
    if (jersey) {
      const key = normalizeJerseyNumber(jersey)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  const result: RosterCandidate[] = []
  for (const player of preview.report.unlinkedPlayers) {
    if (player.teamSide !== side || player.reason !== 'no_roster_player' || !player.jerseyNumber) continue
    if (!/^[0-9]{1,2}$/.test(player.jerseyNumber)) continue
    if ((counts.get(normalizeJerseyNumber(player.jerseyNumber)) ?? 0) > 1) continue
    const split = splitFileName(player.name)
    if (!split) continue
    result.push({ ...split, jerseyNumber: player.jerseyNumber, fileName: player.name })
  }
  return result
}

export interface CreateRostersParams {
  playerService: { createTeamRoster: (teamId: string, players: RosterPlayerInput[]) => Promise<TeamRosterResult> }
  repreview: () => Promise<MatchStatsImportPreview>
  /** Per side: the team and the candidates to create; sides left out (or empty) are skipped. */
  rosters: Partial<Record<MatchSide, { teamId: string; teamName: string; players: RosterPlayerInput[] }>>
}

export interface CreateRostersResult {
  preview: MatchStatsImportPreview
  /** One entry per created side, for the toast. */
  createdBySide: { side: MatchSide; teamName: string; count: number }[]
}

/** Creates the rosters side by side and previews the same file again so the new players get linked. */
export async function createRostersThenRepreview({
  playerService,
  repreview,
  rosters,
}: CreateRostersParams): Promise<CreateRostersResult> {
  const createdBySide: CreateRostersResult['createdBySide'] = []
  for (const side of ['HOME', 'AWAY'] as MatchSide[]) {
    const roster = rosters[side]
    if (!roster || roster.players.length === 0) continue
    const result = await playerService.createTeamRoster(roster.teamId, roster.players)
    createdBySide.push({ side, teamName: roster.teamName, count: result.created.length })
  }
  return { preview: await repreview(), createdBySide }
}

export function rosterCreatedMessage(createdBySide: CreateRostersResult['createdBySide']): string | null {
  const parts = createdBySide
    .filter((entry) => entry.count > 0)
    .map((entry) => `${entry.count === 1 ? 'Se creó 1 jugador' : `Se crearon ${entry.count} jugadores`} en ${entry.teamName}`)
  return parts.length > 0 ? parts.join('. ') : null
}

export type RosterChoice = Record<MatchSide, boolean>
export const NO_ROSTER_CHOICE: RosterChoice = { HOME: false, AWAY: false }

export function anyRosterChoice(choice: RosterChoice): boolean {
  return choice.HOME || choice.AWAY
}

/** The rosters to create: only sides the owner turned on, with the candidates of the current preview. */
export function buildRosterRequest(
  preview: MatchStatsImportPreview,
  choice: RosterChoice,
  teams: Record<MatchSide, { id: string; name: string }>,
): CreateRostersParams['rosters'] {
  const rosters: CreateRostersParams['rosters'] = {}
  for (const side of ['HOME', 'AWAY'] as MatchSide[]) {
    if (!choice[side]) continue
    const players = rosterCandidates(preview, side).map(({ firstName, lastName, jerseyNumber }) => ({
      firstName,
      lastName,
      jerseyNumber,
    }))
    if (players.length > 0) rosters[side] = { teamId: teams[side].id, teamName: teams[side].name, players }
  }
  return rosters
}

/** True when this preview was only possible by accepting a team mismatch, so a re-preview must allow it too. */
export function mismatchAccepted(preview: MatchStatsImportPreview): boolean {
  return preview.report.teams.some((entry) => entry.matchesSelectedTeam === false)
}
