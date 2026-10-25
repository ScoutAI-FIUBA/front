import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart3, MapPinOff, Pencil, Plus, Search, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { positionLabel } from '@/lib/positions'
import { playerService, teamService } from '@/services/registry'
import type { Player, PlayerAnalysisSummary, Team } from '@/types'
import { GlobalPlayerSheet, type GlobalPlayerSheetIntent } from './GlobalPlayerSheet'
import { PlayerAnalysisStatsSheet } from './PlayerAnalysisStatsSheet'
import { formatRowSummary, hasAnalysisSummary, patchPlayerSummary } from './player-analysis-stats'
import {
  filterGlobalPlayers,
  sortGlobalPlayers,
  UNASSIGNED_TEAM_FILTER,
} from './global-player-list'
import { sortTeamsOwnFirst } from '@/pages/teams/team-ownership'
import { TeamNameWithBadge } from '@/components/OwnTeamBadge'

type LoadState = 'loading' | 'ready' | 'error'

interface PlayersPageProps {
  openCreateOnMount?: boolean
}

export function PlayersPage({ openCreateOnMount = false }: PlayersPageProps) {
  const navigate = useNavigate()
  const [players, setPlayers] = useState<Player[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('all')
  const [sheetOpen, setSheetOpen] = useState(openCreateOnMount)
  const [sheetIntent, setSheetIntent] = useState<GlobalPlayerSheetIntent>({ kind: 'create' })
  const [statsPlayerId, setStatsPlayerId] = useState<string | null>(null)
  const [statsOpen, setStatsOpen] = useState(false)

  const refreshData = useCallback(async () => {
    const [loadedPlayers, loadedTeams] = await Promise.all([
      playerService.list(),
      teamService.list(),
    ])
    setPlayers(sortGlobalPlayers(loadedPlayers))
    setTeams(loadedTeams)
  }, [])

  const load = useCallback(async () => {
    setLoadState('loading')
    setLoadError('')
    try {
      await refreshData()
      setLoadState('ready')
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudo cargar el registro de jugadores')
      setLoadState('error')
    }
  }, [refreshData])

  useEffect(() => {
    void load()
  }, [load])

  const teamNames = useMemo(
    () => new Map(teams.map((team) => [team.id, team.name])),
    [teams],
  )
  const filteredPlayers = useMemo(
    () => filterGlobalPlayers(players, search, teamFilter),
    [players, search, teamFilter],
  )

  const openCreate = () => {
    setSheetIntent({ kind: 'create' })
    setSheetOpen(true)
  }

  const openEdit = (player: Player) => {
    setSheetIntent({ kind: 'edit', player })
    setSheetOpen(true)
  }

  const statsPlayer = useMemo(
    () => players.find((player) => player.id === statsPlayerId) ?? null,
    [players, statsPlayerId],
  )

  const handleTotals = useCallback((playerId: string, summary: PlayerAnalysisSummary) => {
    setPlayers((current) => patchPlayerSummary(current, playerId, summary))
  }, [])

  const openStats = (player: Player) => {
    setStatsPlayerId(player.id)
    setStatsOpen(true)
  }

  const handleSheetOpenChange = (open: boolean) => {
    setSheetOpen(open)
    if (!open && openCreateOnMount) navigate('/jugadores', { replace: true })
  }

  const clearFilters = () => {
    setSearch('')
    setTeamFilter('all')
  }

  if (loadState === 'loading') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-16 w-72 animate-pulse rounded bg-surface-subtle" />
          <div className="h-10 w-36 animate-pulse rounded bg-surface-subtle" />
        </div>
        <div className="h-10 max-w-2xl animate-pulse rounded bg-surface-subtle" />
        <div className="h-80 animate-pulse rounded-xl border bg-surface" />
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <EmptyState
        title="No pudimos cargar los jugadores"
        description={loadError}
        icon={<Shield className="h-5 w-5" />}
        action={<Button onClick={() => void load()}>Reintentar</Button>}
      />
    )
  }

  const noResultsTitle = teamFilter === UNASSIGNED_TEAM_FILTER && !search
    ? 'No hay jugadores sin equipo'
    : 'No hay coincidencias'
  const noResultsDescription = teamFilter === UNASSIGNED_TEAM_FILTER && !search
    ? 'Todos los jugadores del registro pertenecen actualmente a un equipo.'
    : 'Probá con otro nombre, apellido, dorsal o equipo.'

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Registro global</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Jugadores</h1>
          <p className="mt-2 text-sm text-muted-foreground">Buscá jugadores, consultá su equipo y corregí datos fuera del flujo de plantel.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Nuevo jugador</Button>
      </header>

      {players.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nombre, apellido o dorsal"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-full sm:w-64"><SelectValue placeholder="Filtrar por equipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value={UNASSIGNED_TEAM_FILTER}>Sin equipo</SelectItem>
              {sortTeamsOwnFirst(teams).map((team) => <SelectItem key={team.id} value={team.id}><TeamNameWithBadge team={team} /></SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {players.length === 0 && (
        <EmptyState
          title="Todavía no hay jugadores"
          description="Creá el primer registro o agregalo desde el plantel de un equipo."
          icon={<Shield className="h-5 w-5" />}
          action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Nuevo jugador</Button>}
        />
      )}

      {players.length > 0 && filteredPlayers.length === 0 && (
        <EmptyState
          title={noResultsTitle}
          description={noResultsDescription}
          icon={teamFilter === UNASSIGNED_TEAM_FILTER ? <MapPinOff className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          action={<Button variant="outline" onClick={clearFilters}>Limpiar filtros</Button>}
        />
      )}

      {filteredPlayers.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-surface">
          <div className="hidden items-center gap-4 px-4 pb-1 pt-2.5 sm:flex" aria-hidden="true">
            <div className="h-11 w-11 shrink-0" />
            <div className="min-w-0 flex-1" />
            <span className="min-w-48 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
              Equipo
            </span>
            <span className="hidden w-52 shrink-0 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70 md:block">
              Análisis
            </span>
            <div className="hidden min-w-36 lg:block" />
            <div className="h-8 w-8 shrink-0" />
            <div className="h-8 w-8 shrink-0" />
          </div>
          {filteredPlayers.map((player) => {
            const teamName = player.teamId ? teamNames.get(player.teamId) : null
            const summaryClass = hasAnalysisSummary(player.analysisSummary) ? '' : 'text-muted-foreground'
            return (
              <article key={player.id} className="group flex items-center gap-4 border-b px-4 py-2.5 last:border-b-0 hover:bg-surface-subtle/40">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-sm font-bold text-foreground">
                  {player.jerseyNumber || '—'}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-sm font-semibold">{player.firstName} {player.lastName}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{positionLabel(player.primaryPosition)}</p>
                  <p className={`mt-0.5 text-xs md:hidden ${summaryClass}`}>{formatRowSummary(player.analysisSummary)}</p>
                </div>
                <div className="hidden min-w-48 text-sm sm:block">
                  {player.teamId && teamName ? (
                    <Link className="text-foreground underline-offset-4 hover:text-primary hover:underline focus-visible:text-primary focus-visible:underline" to={`/equipos/${player.teamId}`}>{teamName}</Link>
                  ) : (
                    <span className="text-muted-foreground">Sin equipo</span>
                  )}
                </div>
                <div className={`hidden w-52 shrink-0 whitespace-nowrap text-xs tabular-nums md:block ${summaryClass}`}>
                  {formatRowSummary(player.analysisSummary)}
                </div>
                <div className="hidden min-w-36 text-xs text-muted-foreground lg:block">
                  {[player.heightCm ? `${player.heightCm} cm` : null, player.weightKg ? `${player.weightKg} kg` : null]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground opacity-70 group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={`Ver estadísticas de ${player.firstName} ${player.lastName}`}
                  title="Ver estadísticas"
                  onClick={() => openStats(player)}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground opacity-70 group-hover:opacity-100 focus-visible:opacity-100"
                  aria-label={`Editar a ${player.firstName} ${player.lastName}`}
                  onClick={() => openEdit(player)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </article>
            )
          })}
        </div>
      )}

      <GlobalPlayerSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        intent={sheetIntent}
        players={players}
        teams={teams}
        onDataChanged={refreshData}
      />

      <PlayerAnalysisStatsSheet
        key={statsPlayerId ?? 'none'}
        open={statsOpen}
        onOpenChange={setStatsOpen}
        player={statsPlayer}
        onTotals={handleTotals}
      />
    </div>
  )
}
