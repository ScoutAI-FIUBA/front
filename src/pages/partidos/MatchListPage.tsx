import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleAlert, Plus, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { isApiAuthenticationError } from '@/services/api/errors'
import { matchService, teamService } from '@/services/registry'
import type { MatchRecord, Team } from '@/types'
import { formatMatchDate, matchScoreline } from './box-score-format'
import { MATCH_CREATE_PATH, matchDetailPath } from './match-routes'

type LoadState = 'loading' | 'error' | 'session-expired' | 'success'

const NEW_MATCH_ACTION = (
  <Button asChild>
    <Link to={MATCH_CREATE_PATH}>
      <Plus aria-hidden="true" className="h-4 w-4" />
      Nuevo partido
    </Link>
  </Button>
)

export function MatchListPage() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [matches, setMatches] = useState<MatchRecord[]>([])
  const [teams, setTeams] = useState<Team[]>([])

  const load = useCallback(async () => {
    setLoadState('loading')
    try {
      const [loadedMatches, loadedTeams] = await Promise.all([matchService.list(), teamService.list()])
      setMatches(loadedMatches)
      setTeams(loadedTeams)
      setLoadState('success')
    } catch (error) {
      setLoadState(isApiAuthenticationError(error) ? 'session-expired' : 'error')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const teamNames = useMemo(
    () => new Map(teams.map((team) => [team.id, team.name])),
    [teams],
  )
  const nameOf = (teamId: string) => teamNames.get(teamId) ?? 'Equipo no disponible'

  return (
    <div className="space-y-8">
      <PageHeader
        title="Partidos"
        description="Resultados y estadísticas de los partidos que cargaste."
        action={NEW_MATCH_ACTION}
      />

      {loadState === 'loading' ? (
        <p role="status" className="text-sm text-muted-foreground">Cargando partidos…</p>
      ) : null}

      {loadState === 'error' ? (
        <Alert className="flex flex-col gap-4 border-destructive/30 bg-destructive/5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold text-destructive">
              <CircleAlert aria-hidden="true" className="h-4 w-4" />
              No pudimos cargar tus partidos
            </div>
            <p className="mt-1 text-muted-foreground">Revisá tu conexión e intentá nuevamente.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => void load()}>
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Reintentar
          </Button>
        </Alert>
      ) : null}

      {loadState === 'session-expired' ? (
        <Alert className="border-border-strong bg-surface">
          <h2 className="font-semibold text-foreground">Tu sesión terminó</h2>
          <p className="mt-1 text-muted-foreground">Redirigiendo al ingreso…</p>
        </Alert>
      ) : null}

      {loadState === 'success' && matches.length === 0 ? (
        <EmptyState
          title="Todavía no cargaste partidos"
          description="Creá un partido e importá la planilla de estadísticas de la federación para ver el resultado y el detalle de cada jugador."
          action={NEW_MATCH_ACTION}
        />
      ) : null}

      {loadState === 'success' && matches.length > 0 ? (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {matches.map((match) => {
            const scoreline = matchScoreline(match)
            return (
              <li key={match.id}>
                <Link
                  to={matchDetailPath(match.id)}
                  className="flex flex-col gap-2 px-4 py-4 transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-muted-foreground">{formatMatchDate(match.matchDate)}</p>
                    <p className="mt-0.5 font-semibold text-foreground">
                      {nameOf(match.homeTeamId)} vs {nameOf(match.awayTeamId)}
                    </p>
                    {match.description ? (
                      <p className="mt-1 max-w-xl truncate text-sm text-muted-foreground">{match.description}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {scoreline ? <span className="text-lg font-semibold tabular-nums text-foreground">{scoreline}</span> : null}
                    <Badge variant={match.statsFormat === 'none' ? 'uploaded' : 'analyzed'}>
                      {match.statsFormat === 'none' ? 'Sin estadísticas' : 'Estadísticas cargadas'}
                    </Badge>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
