import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, MapPin, Pencil, Plus, Search, Shield, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { playerService, teamService } from '@/services/registry'
import type { CreateTeamDto } from '@/services/contracts/teams.service'
import type { Team } from '@/types'
import { TeamFormDialog } from './TeamFormDialog'
import {
  createTeamWithNavigationContext,
  TEAM_CREATION_RETURN_QUERY_PARAM,
} from './team-creation-navigation'

type LoadState = 'loading' | 'ready' | 'error'

export function TeamsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [teams, setTeams] = useState<Team[]>([])
  const [counts, setCounts] = useState<Record<string, number> | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoadState('loading')
    setLoadError('')
    setCounts(null)
    const playersPromise = playerService.list().catch(() => null)
    try {
      const loadedTeams = await teamService.list()
      setTeams(loadedTeams)
      setLoadState('ready')
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'No se pudieron cargar los equipos')
      setLoadState('error')
      return
    }

    void playersPromise.then((players) => {
      if (!players) return
      const nextCounts: Record<string, number> = {}
      players.forEach((player) => {
        if (player.teamId) nextCounts[player.teamId] = (nextCounts[player.teamId] ?? 0) + 1
      })
      setCounts(nextCounts)
    })
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filteredTeams = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es')
    if (!query) return teams
    return teams.filter((team) => (
      `${team.name} ${team.shortName} ${team.city} ${team.country}`
        .toLocaleLowerCase('es')
        .includes(query)
    ))
  }, [search, teams])

  const openCreate = () => {
    setEditingTeam(null)
    setFormOpen(true)
  }

  const openEdit = (team: Team) => {
    setEditingTeam(team)
    setFormOpen(true)
  }

  const submitTeam = async (values: CreateTeamDto) => {
    setSubmitting(true)
    try {
      let returnPath: string | null = null
      if (editingTeam) {
        await teamService.update(editingTeam.id, { ...values, isOwn: editingTeam.isOwn })
        toast.success('Equipo actualizado')
      } else {
        const created = await createTeamWithNavigationContext({
          values,
          requestedReturn: searchParams.get(TEAM_CREATION_RETURN_QUERY_PARAM),
          createTeam: (dto) => teamService.create(dto),
        })
        toast.success('Equipo creado')
        returnPath = created.returnPath
      }
      setFormOpen(false)
      if (returnPath) {
        navigate(returnPath, { replace: true })
        return
      }
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el equipo')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteTeam = async (team: Team) => {
    if (!window.confirm(`¿Eliminar el equipo ${team.name}?`)) return
    try {
      await teamService.delete(team.id)
      toast.success('Equipo eliminado')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el equipo')
    }
  }

  if (loadState === 'loading') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-14 w-56 animate-pulse rounded bg-surface-subtle" />
          <div className="h-10 w-36 animate-pulse rounded bg-surface-subtle" />
        </div>
        {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl border bg-surface" />)}
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <EmptyState
        title="No pudimos cargar tus equipos"
        description={loadError}
        icon={<Shield className="h-5 w-5" />}
        action={<Button onClick={() => void load()}>Reintentar</Button>}
      />
    )
  }

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Equipos</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Tus planteles</h1>
          <p className="mt-2 text-sm text-muted-foreground">Entrá a un equipo para gestionar sus jugadores y dorsales.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Nuevo equipo</Button>
      </header>

      {teams.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por equipo o ciudad" />
        </div>
      )}

      {teams.length === 0 && (
        <Card className="border-dashed">
          <CardContent>
            <EmptyState
              className="mx-auto text-center"
              title="Todavía no cargaste equipos"
              description="Creá tu primer equipo para empezar a construir su plantel."
              icon={<Shield className="h-5 w-5" />}
              action={<Button onClick={openCreate}><Plus className="h-4 w-4" /> Nuevo equipo</Button>}
            />
          </CardContent>
        </Card>
      )}

      {teams.length > 0 && filteredTeams.length === 0 && (
        <EmptyState
          title="No hay coincidencias"
          description="Probá con otro nombre, nombre corto o ubicación."
          icon={<Search className="h-5 w-5" />}
          action={<Button variant="outline" onClick={() => setSearch('')}>Limpiar búsqueda</Button>}
        />
      )}

      {filteredTeams.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-surface">
          {filteredTeams.map((team) => (
            <article key={team.id} className="group relative flex flex-col gap-5 border-b p-5 transition-colors last:border-b-0 hover:bg-surface-subtle/50 sm:flex-row sm:items-center">
              <Link
                to={`/equipos/${team.id}`}
                className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
                aria-label={`Ver plantel de ${team.name}`}
              />
              <div className="pointer-events-none relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-sm font-black tracking-wide text-primary">
                {team.shortName}
              </div>
              <div className="pointer-events-none relative z-10 min-w-0 flex-1">
                <h2 className="truncate text-lg font-semibold">{team.name}</h2>
                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {team.city}, {team.country}
                </p>
              </div>
              {counts && (
                <p className="pointer-events-none relative z-10 flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" /> {counts[team.id] ?? 0} {(counts[team.id] ?? 0) === 1 ? 'jugador' : 'jugadores'}
                </p>
              )}
              <div className="relative z-10 flex flex-wrap items-center gap-1">
                <Button asChild size="sm" variant="ghost" className="text-muted-foreground group-hover:text-foreground">
                  <Link to={`/equipos/${team.id}`}>Ver plantel <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button size="icon" variant="ghost" aria-label={`Editar ${team.name}`} onClick={() => openEdit(team)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" aria-label={`Eliminar ${team.name}`} onClick={() => void deleteTeam(team)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <TeamFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        team={editingTeam}
        submitting={submitting}
        onSubmit={submitTeam}
      />
    </div>
  )
}
