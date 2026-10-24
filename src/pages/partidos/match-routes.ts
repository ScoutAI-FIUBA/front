export const MATCHES_PATH = '/partidos'
export const MATCH_CREATE_PATH = '/partidos/nuevo'

export function matchDetailPath(id: string): string {
  return `${MATCHES_PATH}/${encodeURIComponent(id)}`
}

export function matchStatsImportPath(id: string): string {
  return `${matchDetailPath(id)}/estadisticas`
}
