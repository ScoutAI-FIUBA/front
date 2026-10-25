import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, MapPin, Pencil, Plus, Search, Shield, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { positionLabel } from '@/lib/positions'
import { playerService, teamService } from '@/services/registry'
import type { CreateTeamDto } from '@/services/contracts/teams.service'
import type { Player, Team } from '@/types'
import { TeamFormDialog } from './TeamFormDialog'
import { TeamRosterPlayerSheet, type RosterSheetIntent } from './TeamRosterPlayerSheet'
import { duplicateJerseyNumbers, filterRosterPlayers } from './team-roster'

type LoadState = 'loading' | 'ready' | 'error'

export function TeamDetailPage() {
  const { teamId = '' } = useParams()
  const [team, setTeam] = useState<Team | null>(null)
  const [teamState, setTeamState] = useState<LoadState>('loading')
  const [teamError, setTeamError] = useState('')
  const [roster, setRoster] = useState<Player[]>([])
  const [rosterState, setRosterState] = useState<LoadState>('loading')
  const [rosterError, setRosterError] = useState('')
  const [query, setQuery] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetIntent, setSheetIntent] = useState<RosterSheetIntent>({ kind: 'add' })
  const [teamEditOpen, setTeamEditOpen] = useState(false)
  const [teamSubmitting, setTeamSubmitting] = useState(false)

  const loadTeam = useCallback(async () => {
    setTeamState('loading')
    setTeamError('')
    try {
      const loadedTeam = await teamService.getById(teamId)
      setTeam(loadedTeam)
      setTeamState('ready')
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'No se pudo cargar el equipo')
      setTeamState('error')
    }
  }, [teamId])

  const loadRoster = useCallback(async () => {
    setRosterState('loading')
    setRosterError('')
    try {
      setRoster(await playerService.filterByTeam(teamId))
      setRosterState('ready')
    } catch (error) {
      setRosterError(error instanceof Error ? error.message : 'No se pudo cargar el plantel')
      setRosterState('error')
    }
  }, [teamId])

  useEffect(() => {
    void Promise.allSettled([loadTeam(), loadRoster()])
  }, [loadRoster, loadTeam])

  const filteredRoster = useMemo(() => filterRosterPlayers(roster, query), [query, roster])
  const duplicateJerseys = useMemo(() => duplicateJerseyNumbers(roster), [roster])
  const duplicateJerseySummary = useMemo(
    () => [...duplicateJerseys].map((jerseyNumber) => ({
      jerseyNumber,
      count: roster.filter((player) => player.jerseyNumber === jerseyNumber).length,
    })),
    [duplicateJerseys, roster],
  )

  const openAdd = () => {
    setSheetIntent({ kind: 'add' })
    setSheetOpen(true)
  }

  const openEdit = (player: Player) => {
    setSheetIntent({ kind: 'edit', player })
    setSheetOpen(true)
  }

  const updateTeam = async (values: CreateTeamDto) => {
    if (!team) return
    setTeamSubmitting(true)
    try {
      const updatedTeam = await teamService.update(team.id, { ...values, isOwn: team.isOwn })
      setTeam(updatedTeam)
      setTeamEditOpen(false)
      toast.success('Equipo actualizado')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo actualizar el equipo')
    } finally {
      setTeamSubmitting(false)
    }
  }

  if (teamState === 'loading') {
    return (
      <div className="space-y-6">
        <div className="h-5 w-32 animate-pulse rounded bg-surface-subtle" />
        <div className="h-32 animate-pulse rounded-xl border bg-surface" />
        <div className="h-64 animate-pulse rounded-xl border bg-surface" />
      </div>
    )
  }

  if (teamState === 'error') {
    return (
      <EmptyState
        title="No pudimos cargar el equipo"
        description={teamError}
        icon={<Shield className="h-5 w-5" />}
        action={<Button onClick={() => void loadTeam()}>Reintentar</Button>}
        secondaryAction={<Button asChild variant="outline"><Link to="/equipos">Volver a equipos</Link></Button>}
      />
    )
  }

  if (!team) {
    return (
      <EmptyState
        title="Equipo no encontrado"
        description="El equipo no existe o ya no está disponible."
        icon={<Shield className="h-5 w-5" />}
        action={<Button asChild><Link to="/equipos">Volver a equipos</Link></Button>}
      />
    )
  }

  return (
    <div className="space-y-7">
      <Link to="/equipos" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Equipos
      </Link>

      <section className="overflow-hidden rounded-xl border bg-surface">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-lg font-black tracking-tight text-primary">
            {team.shortName}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Equipo</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight">{team.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {team.city}, {team.country}
            </p>
          </div>
          <Button size="sm" variant="ghost" className="self-start text-muted-foreground sm:self-center" onClick={() => setTeamEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" /> Editar equipo
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Plantel
            {rosterState === 'ready' && (
              <span className="ml-2 align-middle text-sm font-medium text-muted-foreground">
                · {roster.length} {roster.length === 1 ? 'jugador' : 'jugadores'}
              </span>
            )}
          </h2>
          <Button size="sm" onClick={openAdd}><Plus className="h-3.5 w-3.5" /> Agregar jugador</Button>
        </div>

        {duplicateJerseys.size > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-amber-400/30 bg-amber-400/[0.06] px-3 py-2 text-xs text-amber-300" role="status">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {duplicateJerseySummary.map(({ jerseyNumber, count }) => (
                <span key={jerseyNumber}>Dorsal {jerseyNumber} repetido · {count} jugadores</span>
              ))}
            </div>
          </div>
        )}

        {rosterState === 'ready' && roster.length > 0 && (
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o dorsal" />
          </div>
        )}

        {rosterState === 'loading' && (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl border bg-surface" />)}
          </div>
        )}

        {rosterState === 'error' && (
          <Alert className="border-destructive/30 bg-red-50 text-destructive">
            <p className="font-medium">No pudimos cargar el plantel</p>
            <p className="mt-1 text-sm">{rosterError}</p>
            <Button className="mt-3" size="sm" variant="outline" onClick={() => void loadRoster()}>Reintentar</Button>
          </Alert>
        )}

        {rosterState === 'ready' && roster.length === 0 && (
          <Card className="border-dashed">
            <CardContent>
              <EmptyState
                className="mx-auto text-center"
                title="El plantel todavía está vacío"
                description="Creá un jugador o asigná uno existente para empezar a armar el equipo."
                icon={<Users className="h-5 w-5" />}
                action={<Button onClick={openAdd}><Plus className="h-4 w-4" /> Agregar jugador</Button>}
              />
            </CardContent>
          </Card>
        )}

        {rosterState === 'ready' && roster.length > 0 && filteredRoster.length === 0 && (
          <EmptyState
            title="No hay coincidencias"
            description="Probá con otro nombre o dorsal."
            icon={<Search className="h-5 w-5" />}
            action={<Button variant="outline" onClick={() => setQuery('')}>Limpiar búsqueda</Button>}
          />
        )}

        {rosterState === 'ready' && filteredRoster.length > 0 && (
          <div className="overflow-hidden rounded-lg border bg-surface">
            {filteredRoster.map((player) => {
              const duplicate = Boolean(player.jerseyNumber && duplicateJerseys.has(player.jerseyNumber))
              return (
                <article key={player.id} className="group flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0 sm:px-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-border-strong bg-surface-subtle text-base font-bold text-foreground">
                    {player.jerseyNumber ?? '—'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="truncate text-sm font-semibold">{player.firstName} {player.lastName}</h3>
                      {duplicate && (
                        <span
                          className="inline-flex text-amber-400"
                          title={`Dorsal ${player.jerseyNumber} repetido`}
                          aria-label={`Dorsal ${player.jerseyNumber} repetido`}
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{positionLabel(player.primaryPosition)}</span>
                      {player.heightCm != null && <span>{player.heightCm} cm</span>}
                      {player.weightKg != null && <span>{player.weightKg} kg</span>}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground/60 opacity-70 transition-opacity hover:text-foreground hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
                    onClick={() => openEdit(player)}
                    aria-label={`Editar a ${player.firstName} ${player.lastName}`}
                    title="Editar jugador"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <TeamRosterPlayerSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        intent={sheetIntent}
        team={team}
        roster={roster}
        onRosterChanged={loadRoster}
      />
      <TeamFormDialog
        open={teamEditOpen}
        onOpenChange={setTeamEditOpen}
        team={team}
        submitting={teamSubmitting}
        onSubmit={updateTeam}
      />
    </div>
  )
}
