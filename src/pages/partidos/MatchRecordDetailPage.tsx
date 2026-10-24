import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleAlert, FileUp, Pencil, RefreshCw } from 'lucide-react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { isLegacyVideoDetailSearch, legacyVideoRedirectPath } from '@/pages/videos/legacy-video-routes'
import { isApiAuthenticationError } from '@/services/api/errors'
import { isMatchApiError } from '@/services/api/matches.client'
import { matchService, playerService, teamService } from '@/services/registry'
import type { MatchRecord, Team } from '@/types'
import { BoxScoreTable } from './BoxScoreTable'
import { formatMatchDate, matchScoreline, winnerLabel } from './box-score-format'
import { MATCHES_PATH, matchStatsImportPath } from './match-routes'
import { MatchDetailsDialog } from './MatchDetailsDialog'
import { MatchVideosSection } from './MatchVideosSection'

type LoadState = 'loading' | 'error' | 'session-expired' | 'not-found' | 'success'

function MatchRecordDetail({ matchId }: { matchId: string }) {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [match, setMatch] = useState<MatchRecord | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [rosterNames, setRosterNames] = useState<Record<string, string>>({})
  const [editOpen, setEditOpen] = useState(false)

  const load = useCallback(async () => {
    setLoadState('loading')
    try {
      const { match: loaded } = await matchService.getWithParticipants(matchId)
      const [loadedTeams, homePlayers, awayPlayers] = await Promise.all([
        teamService.list().catch(() => [] as Team[]),
        playerService.filterByTeam(loaded.homeTeamId).catch(() => []),
        playerService.filterByTeam(loaded.awayTeamId).catch(() => []),
      ])
      const names: Record<string, string> = {}
      for (const player of [...homePlayers, ...awayPlayers]) {
        names[player.id] = `${player.firstName} ${player.lastName}`.trim()
      }
      setMatch(loaded)
      setTeams(loadedTeams)
      setRosterNames(names)
      setLoadState('success')
    } catch (error) {
      if (isApiAuthenticationError(error)) setLoadState('session-expired')
      else if (isMatchApiError(error, 'MATCH_NOT_FOUND') || isMatchApiError(error, 'VALIDATION_ERROR')) setLoadState('not-found')
      else setLoadState('error')
    }
  }, [matchId])

  useEffect(() => {
    void load()
  }, [load])

  const teamsById = useMemo(
    () => Object.fromEntries(teams.map((team) => [team.id, team])),
    [teams],
  )

  if (loadState === 'loading') {
    return <p role="status" className="text-sm text-muted-foreground">Cargando partido…</p>
  }

  if (loadState === 'session-expired') {
    return (
      <Alert className="border-border-strong bg-surface">
        <h2 className="font-semibold text-foreground">Tu sesión terminó</h2>
        <p className="mt-1 text-muted-foreground">Redirigiendo al ingreso…</p>
      </Alert>
    )
  }

  if (loadState === 'not-found' || (loadState === 'success' && !match)) {
    return (
      <EmptyState
        title="No encontramos este partido"
        description="Puede que el enlace sea incorrecto o que el partido ya no exista."
        action={<Button asChild><Link to={MATCHES_PATH}>Ver partidos</Link></Button>}
        secondaryAction={
          <Button asChild variant="link">
            <Link to="/videos">¿Era un enlace viejo a un video? Abrilo en Videos</Link>
          </Button>
        }
      />
    )
  }

  if (loadState === 'error' || !match) {
    return (
      <Alert className="flex flex-col gap-4 border-destructive/30 bg-destructive/5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 font-semibold text-destructive">
            <CircleAlert aria-hidden="true" className="h-4 w-4" />
            No pudimos cargar este partido
          </div>
          <p className="mt-1 text-muted-foreground">Revisá tu conexión e intentá nuevamente.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void load()}>
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Reintentar
        </Button>
      </Alert>
    )
  }

  const homeName = teamsById[match.homeTeamId]?.name ?? 'Equipo no disponible'
  const awayName = teamsById[match.awayTeamId]?.name ?? 'Equipo no disponible'
  const scoreline = matchScoreline(match)
  const winner = winnerLabel(match, teamsById)
  const boxScore = match.statsFormat === 'cabb_excel_v1' ? match.boxScore : null
  const hasStats = match.statsFormat !== 'none'

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${homeName} vs ${awayName}`}
        description={formatMatchDate(match.matchDate)}
        action={
          <Button asChild variant={hasStats ? 'outline' : 'default'}>
            <Link to={matchStatsImportPath(match.id)}>
              <FileUp aria-hidden="true" className="h-4 w-4" />
              {hasStats ? 'Reemplazar estadísticas' : 'Importar estadísticas'}
            </Link>
          </Button>
        }
      />

      <section aria-label="Resumen del partido" className="space-y-1 text-sm text-muted-foreground">
        {scoreline ? (
          <p className="text-lg font-semibold text-foreground">
            <span className="sr-only">Resultado: </span>
            {homeName} {scoreline} {awayName}
            {winner ? <span className="ml-3 text-sm font-medium text-muted-foreground">{winner}</span> : null}
          </p>
        ) : null}
        {match.description ? <p>{match.description}</p> : null}
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setEditOpen(true)}>
          <Pencil aria-hidden="true" className="h-4 w-4" />
          Editar fecha y descripción
        </Button>
        {boxScore?.competition ? <p>Competencia: {boxScore.competition}</p> : null}
        {boxScore ? <p>Fuente: planilla de estadísticas de la federación</p> : null}
      </section>

      <MatchVideosSection match={match} homeName={homeName} awayName={awayName} />

      {editOpen ? (
        <MatchDetailsDialog
          match={match}
          homeName={homeName}
          awayName={awayName}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={(updated) => setMatch((current) => current && {
            ...current,
            matchDate: updated.matchDate,
            description: updated.description,
            updatedAt: updated.updatedAt,
          })}
        />
      ) : null}

      {match.statsFormat === 'none' ? (
        <EmptyState
          title="Este partido todavía no tiene estadísticas"
          description="Importá la planilla de estadísticas de la federación para ver el detalle de cada jugador."
          action={
            <Button asChild>
              <Link to={matchStatsImportPath(match.id)}>Importar estadísticas</Link>
            </Button>
          }
        />
      ) : null}

      {match.statsFormat === 'unknown' ? (
        <EmptyState
          title="Estas estadísticas tienen un formato que esta versión no sabe mostrar"
          description="Podés reemplazarlas importando de nuevo la planilla de la federación."
        />
      ) : null}

      {boxScore ? (
        <div className="space-y-8">
          <BoxScoreTable
            side="HOME"
            team={boxScore.teams.HOME}
            players={boxScore.players}
            teamName={homeName}
            rosterNames={rosterNames}
          />
          <BoxScoreTable
            side="AWAY"
            team={boxScore.teams.AWAY}
            players={boxScore.players}
            teamName={awayName}
            rosterNames={rosterNames}
          />
        </div>
      ) : null}
    </div>
  )
}

export function MatchRecordDetailPage() {
  const { matchId = '' } = useParams()
  const location = useLocation()

  // Old app-made video links (/partidos/:videoId?tab=...) always carried ?tab=.
  if (isLegacyVideoDetailSearch(location.search)) {
    return (
      <Navigate
        to={legacyVideoRedirectPath({
          destination: 'detail',
          videoId: matchId,
          search: location.search,
          hash: location.hash,
        })}
        replace
      />
    )
  }

  return <MatchRecordDetail key={matchId} matchId={matchId} />
}
