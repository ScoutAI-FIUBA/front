import { useCallback, useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { AlertTriangle, Search, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { PlayerFormFields } from '@/pages/players/PlayerFormFields'
import {
  emptyPlayerFormValues,
  playerFormSchema,
  playerFormToCreateDto,
  playerFormToDto,
  playerToFormValues,
  type PlayerFormValues,
} from '@/pages/players/player-form'
import { positionLabel } from '@/lib/positions'
import { playerService, teamService } from '@/services/registry'
import type { Player, Team } from '@/types'
import { playersWithJersey } from './team-roster'

export type RosterSheetIntent =
  | { kind: 'add' }
  | { kind: 'edit'; player: Player }

interface TeamRosterPlayerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  intent: RosterSheetIntent
  team: Team
  roster: Player[]
  onRosterChanged: () => Promise<void>
}

type AddMode = 'new' | 'existing'

export function TeamRosterPlayerSheet({
  open,
  onOpenChange,
  intent,
  team,
  roster,
  onRosterChanged,
}: TeamRosterPlayerSheetProps) {
  const [addMode, setAddMode] = useState<AddMode>('new')
  const [submitting, setSubmitting] = useState(false)
  const [candidateQuery, setCandidateQuery] = useState('')
  const [candidates, setCandidates] = useState<Player[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [candidatesLoading, setCandidatesLoading] = useState(false)
  const [candidatesError, setCandidatesError] = useState<string | null>(null)

  const form = useForm<PlayerFormValues>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: emptyPlayerFormValues,
  })

  useEffect(() => {
    if (!open) return
    setSubmitting(false)
    setAddMode('new')
    setCandidateQuery('')
    setSelectedPlayerId('')
    setCandidates([])
    setTeams([])
    setCandidatesError(null)
    form.reset(intent.kind === 'edit' ? playerToFormValues(intent.player) : emptyPlayerFormValues)
  }, [form, intent, open])

  const loadCandidates = useCallback(async () => {
    setCandidatesLoading(true)
    setCandidatesError(null)
    try {
      const [players, teamList] = await Promise.all([playerService.list(), teamService.list()])
      setCandidates(players.filter((player) => player.teamId !== team.id))
      setTeams(teamList)
    } catch (error) {
      setCandidatesError(error instanceof Error ? error.message : 'No se pudieron cargar los jugadores')
    } finally {
      setCandidatesLoading(false)
    }
  }, [team.id])

  useEffect(() => {
    if (open && intent.kind === 'add' && addMode === 'existing' && candidates.length === 0) {
      void loadCandidates()
    }
  }, [addMode, candidates.length, intent.kind, loadCandidates, open])

  const watchedJersey = form.watch('jerseyNumber')
  const duplicatePlayers = playersWithJersey(
    roster,
    watchedJersey,
    intent.kind === 'edit' ? intent.player.id : undefined,
  )
  const jerseyWarning = duplicatePlayers.length > 0
    ? `El dorsal ${watchedJersey} ya lo usa ${duplicatePlayers.map((player) => `${player.firstName} ${player.lastName}`).join(', ')}. Podés guardar, pero el análisis no podrá vincular automáticamente a estos jugadores por dorsal.`
    : null

  const savePlayer = async (values: PlayerFormValues, addAnother: boolean) => {
    setSubmitting(true)
    try {
      if (intent.kind === 'edit') {
        await playerService.update(intent.player.id, playerFormToDto(values))
        toast.success('Jugador actualizado')
        await onRosterChanged()
        onOpenChange(false)
        return
      }

      await playerService.create(playerFormToCreateDto(values, team.id))
      toast.success('Jugador agregado al plantel')
      await onRosterChanged()
      if (addAnother) {
        form.reset(emptyPlayerFormValues)
        form.setFocus('firstName')
      } else {
        onOpenChange(false)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el jugador')
    } finally {
      setSubmitting(false)
    }
  }

  const deletePlayer = async () => {
    if (intent.kind !== 'edit') return
    const fullName = `${intent.player.firstName} ${intent.player.lastName}`
    const confirmed = window.confirm(
      `¿Eliminar a ${fullName} del sistema? Esta acción elimina su perfil completo; no es sólo quitarlo de ${team.name}.`,
    )
    if (!confirmed) return
    setSubmitting(true)
    try {
      await playerService.delete(intent.player.id)
      toast.success('Jugador eliminado del sistema')
      await onRosterChanged()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el jugador')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredCandidates = useMemo(() => {
    const query = candidateQuery.trim().toLocaleLowerCase('es')
    const filtered = query
      ? candidates.filter((player) => (
          `${player.firstName} ${player.lastName} ${player.jerseyNumber ?? ''} ${positionLabel(player.primaryPosition)}`
            .toLocaleLowerCase('es')
            .includes(query)
        ))
      : candidates
    return filtered.slice(0, 12)
  }, [candidateQuery, candidates])

  const selectedPlayer = candidates.find((player) => player.id === selectedPlayerId) ?? null
  const teamNames = new Map(teams.map((candidateTeam) => [candidateTeam.id, candidateTeam.name]))
  const selectedDuplicate = selectedPlayer?.jerseyNumber
    ? playersWithJersey(roster, selectedPlayer.jerseyNumber)
    : []

  const assignSelected = async () => {
    if (!selectedPlayer) return
    setSubmitting(true)
    try {
      await teamService.addMember(team.id, selectedPlayer.id)
      toast.success(`${selectedPlayer.firstName} ${selectedPlayer.lastName} ahora integra ${team.name}`)
      await onRosterChanged()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo asignar el jugador')
    } finally {
      setSubmitting(false)
    }
  }

  const isAdd = intent.kind === 'add'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isAdd ? 'Agregar jugador' : 'Editar jugador'}</SheetTitle>
          <SheetDescription>
            {isAdd ? `Sumá un perfil nuevo o existente al plantel de ${team.name}.` : `Actualizá el perfil sin salir del plantel de ${team.name}.`}
          </SheetDescription>
        </SheetHeader>

        {isAdd && (
          <div className="border-b px-5 py-4 sm:px-7">
            <div className="grid grid-cols-2 rounded-lg bg-surface-subtle p-1">
              <Button
                type="button"
                size="sm"
                variant={addMode === 'new' ? 'default' : 'ghost'}
                onClick={() => setAddMode('new')}
              >
                Crear nuevo
              </Button>
              <Button
                type="button"
                size="sm"
                variant={addMode === 'existing' ? 'default' : 'ghost'}
                onClick={() => setAddMode('existing')}
              >
                Jugador existente
              </Button>
            </div>
          </div>
        )}

        {(!isAdd || addMode === 'new') ? (
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit((values) => savePlayer(values, false))}
          >
            <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
              <PlayerFormFields form={form} jerseyWarning={jerseyWarning} />

              {!isAdd && (
                <div className="mt-10 border-t pt-6">
                  <p className="text-sm font-medium">Eliminar jugador</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Esto elimina el perfil completo del sistema. No sólo lo quita de este equipo.
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-3 text-destructive hover:bg-red-50 hover:text-destructive"
                    onClick={() => void deletePlayer()}
                    disabled={submitting}
                  >
                    <Trash2 className="h-4 w-4" /> Eliminar jugador del sistema
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t bg-surface-elevated px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
              {isAdd && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => void form.handleSubmit((values) => savePlayer(values, true))()}
                >
                  Guardar y agregar otro
                </Button>
              )}
              <Button type="submit" disabled={submitting}>{submitting ? 'Guardando…' : 'Guardar'}</Button>
            </div>
          </form>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={candidateQuery}
                  onChange={(event) => {
                    setCandidateQuery(event.target.value)
                    setSelectedPlayerId('')
                  }}
                  className="pl-9"
                  placeholder="Buscar por nombre, dorsal o posición"
                />
              </div>

              {candidatesLoading && <p className="py-8 text-sm text-muted-foreground">Cargando jugadores…</p>}
              {candidatesError && (
                <Alert className="mt-4 border-destructive/30 bg-red-50 text-destructive">
                  <p>{candidatesError}</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => void loadCandidates()}>Reintentar</Button>
                </Alert>
              )}
              {!candidatesLoading && !candidatesError && filteredCandidates.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">No encontramos jugadores disponibles.</p>
              )}

              <div className="mt-4 space-y-2">
                {filteredCandidates.map((player) => {
                  const isSelected = player.id === selectedPlayerId
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => setSelectedPlayerId(player.id)}
                      className={`w-full rounded-lg border p-4 text-left transition-colors ${isSelected ? 'border-primary bg-primary-subtle' : 'bg-surface hover:border-primary/40'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{player.firstName} {player.lastName}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {player.jerseyNumber ? `#${player.jerseyNumber} · ` : ''}{positionLabel(player.primaryPosition)}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {player.teamId ? teamNames.get(player.teamId) ?? 'Otro equipo' : 'Sin equipo'}
                        </Badge>
                      </div>
                    </button>
                  )
                })}
              </div>

              {selectedPlayer?.teamId && selectedPlayer.teamId !== team.id && (
                <Alert className="mt-4 border-amber-400/30 bg-amber-400/[0.06] p-3 text-xs leading-5 text-amber-300">
                  <div className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <p>
                      Al confirmar, {selectedPlayer.firstName} {selectedPlayer.lastName} se moverá desde {teamNames.get(selectedPlayer.teamId) ?? 'su equipo actual'} a {team.name}.
                    </p>
                  </div>
                </Alert>
              )}
              {selectedPlayer && selectedDuplicate.length > 0 && (
                <Alert className="mt-3 border-amber-400/30 bg-amber-400/[0.06] p-3 text-xs leading-5 text-amber-300">
                  El dorsal {selectedPlayer.jerseyNumber} ya está en este plantel. Podés continuar, pero el análisis no podrá vincular automáticamente a esos jugadores por dorsal.
                </Alert>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4 sm:px-7">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
              <Button onClick={() => void assignSelected()} disabled={!selectedPlayer || submitting}>
                <UserPlus className="h-4 w-4" /> {submitting ? 'Asignando…' : 'Asignar al plantel'}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
