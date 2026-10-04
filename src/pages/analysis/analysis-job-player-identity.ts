export interface AnalysisJobPlayerIdentity {
  stablePlayerId?: string | null
  trackId?: number | null
}

export interface AnalysisJobPlayerLabelSource extends AnalysisJobPlayerIdentity {
  rosterName?: string | null
  jerseyNumber?: string | null
  displayName?: string | null
}

export type AnalysisJobPlayerKey = `stable:${string}` | `track:${number}`

export function analysisJobPlayerKey(
  player: AnalysisJobPlayerIdentity,
): AnalysisJobPlayerKey | null {
  const stablePlayerId = player.stablePlayerId?.trim()
  if (stablePlayerId) return `stable:${stablePlayerId}`
  if (player.trackId != null && Number.isFinite(player.trackId)) {
    return `track:${player.trackId}`
  }
  return null
}

function meaningfulBackendLabel(player: AnalysisJobPlayerLabelSource): string | null {
  const displayName = player.displayName?.trim()
  if (!displayName) return null
  if (player.stablePlayerId && displayName === player.stablePlayerId) return null
  if (player.trackId != null && displayName === `Player ${player.trackId}`) return null
  return displayName
}

export function analysisJobPlayerLabel(
  player: AnalysisJobPlayerLabelSource,
  detectedPlayerNumber?: number,
): string {
  const rosterName = player.rosterName?.trim()
  if (rosterName) return rosterName

  const backendLabel = meaningfulBackendLabel(player)
  if (backendLabel) return backendLabel

  const jerseyNumber = player.jerseyNumber?.trim()
  if (jerseyNumber) return `#${jerseyNumber}`

  if (player.stablePlayerId) {
    return detectedPlayerNumber == null
      ? 'Jugador detectado'
      : `Jugador detectado ${detectedPlayerNumber}`
  }
  if (player.trackId != null) return `Seguimiento ${player.trackId}`
  return 'Jugador no identificado'
}

export function buildAnalysisJobPlayerLabels<T extends AnalysisJobPlayerLabelSource>(
  players: T[],
): Map<AnalysisJobPlayerKey, string> {
  const labels = new Map<AnalysisJobPlayerKey, string>()
  const anonymousStablePlayers = players.filter((player) => (
    Boolean(player.stablePlayerId)
    && !player.rosterName?.trim()
    && !meaningfulBackendLabel(player)
    && !player.jerseyNumber?.trim()
  ))
  let detectedPlayerNumber = 0

  for (const player of players) {
    const key = analysisJobPlayerKey(player)
    if (!key) continue
    const needsDetectedNumber = anonymousStablePlayers.includes(player)
    if (needsDetectedNumber) detectedPlayerNumber += 1
    labels.set(
      key,
      analysisJobPlayerLabel(
        player,
        needsDetectedNumber && anonymousStablePlayers.length > 1
          ? detectedPlayerNumber
          : undefined,
      ),
    )
  }

  return labels
}

export function analysisJobPlayerLabelFromMap(
  player: AnalysisJobPlayerLabelSource,
  labels: Map<AnalysisJobPlayerKey, string>,
): string {
  const key = analysisJobPlayerKey(player)
  return (key && labels.get(key)) ?? analysisJobPlayerLabel(player)
}
