import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { playerService, teamService } from '@/services/registry'
import type { Player, Team } from '@/types'
import { playersWithJersey } from '@/pages/teams/team-roster'
import { PlayerFormFields } from './PlayerFormFields'
import {
  emptyPlayerFormValues,
  playerFormHasChanges,
  playerFormSchema,
  playerFormToCreateDto,
  playerFormToDto,
  playerToFormValues,
  type PlayerFormValues,
} from './player-form'

const NO_TEAM = 'no-team'

export type GlobalPlayerSheetIntent =
  | { kind: 'create' }
  | { kind: 'edit'; player: Player }

interface GlobalPlayerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  intent: GlobalPlayerSheetIntent
  players: Player[]
  teams: Team[]
  onDataChanged: () => Promise<void>
}

interface MutationNotice {
  kind: 'error' | 'partial'
  message: string
}

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido'
}

export function GlobalPlayerSheet({
  open,
  onOpenChange,
  intent,
  players,
  teams,
  onDataChanged,
}: GlobalPlayerSheetProps) {
  const [selectedTeamId, setSelectedTeamId] = useState(NO_TEAM)
  const [currentTeamId, setCurrentTeamId] = useState<string | undefined>()
  const [baselinePlayer, setBaselinePlayer] = useState<Player | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<MutationNotice | null>(null)
  const form = useForm<PlayerFormValues>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: emptyPlayerFormValues,
  })

  useEffect(() => {
    if (!open) return
    const player = intent.kind === 'edit' ? intent.player : null
    setSelectedTeamId(player?.teamId ?? NO_TEAM)
    setCurrentTeamId(player?.teamId ?? undefined)
    setBaselinePlayer(player)
    setSubmitting(false)
    setNotice(null)
    form.reset(player ? playerToFormValues(player) : emptyPlayerFormValues)
  }, [form, intent, open])

  const destinationTeamId = selectedTeamId === NO_TEAM ? undefined : selectedTeamId
  const destinationTeam = teams.find((team) => team.id === destinationTeamId) ?? null
  const currentTeam = teams.find((team) => team.id === currentTeamId) ?? null
  const isCreate = intent.kind === 'create'
  const isTransfer = !isCreate
    && Boolean(currentTeamId)
    && Boolean(destinationTeamId)
    && currentTeamId !== destinationTeamId

  const watchedJersey = form.watch('jerseyNumber')
  const destinationRoster = useMemo(
    () => destinationTeamId ? players.filter((player) => player.teamId === destinationTeamId) : [],
    [destinationTeamId, players],
  )
  const duplicatePlayers = destinationTeamId
    ? playersWithJersey(destinationRoster, watchedJersey, baselinePlayer?.id)
    : []
  const jerseyWarning = duplicatePlayers.length > 0
    ? `El dorsal ${watchedJersey} ya lo usa ${duplicatePlayers.map((player) => `${player.firstName} ${player.lastName}`).join(', ')}. Podés guardar, pero el análisis no podrá vincular automáticamente a estos jugadores por dorsal.`
    : null

  const refreshOrReport = async (message: string): Promise<boolean> => {
    try {
      await onDataChanged()
      return true
    } catch {
      setNotice({
        kind: 'partial',
        message: `${message} No pudimos refrescar el registro; mantenemos este panel abierto para que puedas reintentar la consulta.`,
      })
      return false
    }
  }

  const savePlayer = async (values: PlayerFormValues) => {
    setSubmitting(true)
    setNotice(null)

    try {
      if (isCreate) {
        await playerService.create(playerFormToCreateDto(values, destinationTeamId))
        if (!await refreshOrReport('El jugador fue creado.')) return
        toast.success('Jugador creado')
        onOpenChange(false)
        return
      }

      if (!baselinePlayer) return
      const profileChanged = playerFormHasChanges(values, baselinePlayer)
      const teamChanged = Boolean(destinationTeamId) && destinationTeamId !== currentTeamId

      if (!profileChanged && !teamChanged) {
        onOpenChange(false)
        return
      }

      let profileSaved = false
      if (profileChanged) {
        try {
          const updated = await playerService.update(baselinePlayer.id, playerFormToDto(values))
          const updatedBaseline = { ...updated, teamId: currentTeamId }
          setBaselinePlayer(updatedBaseline)
          form.reset(playerToFormValues(updatedBaseline))
          profileSaved = true
        } catch (error) {
          setNotice({
            kind: 'error',
            message: teamChanged
              ? `No se guardaron los datos del perfil y el cambio de equipo no se intentó. ${errorDetail(error)}`
              : `No se guardaron los cambios del perfil. ${errorDetail(error)}`,
          })
          return
        }
      }

      if (teamChanged && destinationTeamId) {
        try {
          await teamService.addMember(destinationTeamId, baselinePlayer.id)
          setCurrentTeamId(destinationTeamId)
        } catch (error) {
          const refreshed = await refreshOrReport(profileSaved
            ? 'Los datos del perfil se guardaron, pero el cambio de equipo sigue pendiente.'
            : 'El perfil no tenía cambios y el cambio de equipo sigue pendiente.')
          setNotice({
            kind: profileSaved ? 'partial' : 'error',
            message: profileSaved
              ? `Los datos del perfil se guardaron, pero no se pudo mover al jugador a ${destinationTeam?.name ?? 'el equipo seleccionado'}. Podés reintentar sólo el traslado.${refreshed ? '' : ' Tampoco pudimos refrescar el registro.'} ${errorDetail(error)}`
              : `No se pudo mover al jugador a ${destinationTeam?.name ?? 'el equipo seleccionado'}. Podés intentarlo otra vez.${refreshed ? '' : ' Tampoco pudimos refrescar el registro.'} ${errorDetail(error)}`,
          })
          return
        }
      }

      if (!await refreshOrReport(profileSaved && teamChanged
        ? 'Los datos y el equipo se actualizaron.'
        : profileSaved
          ? 'Los datos del perfil se actualizaron.'
          : 'El equipo se actualizó.')) return

      toast.success(profileSaved && teamChanged
        ? 'Datos y equipo actualizados'
        : profileSaved
          ? 'Jugador actualizado'
          : 'Equipo actualizado')
      onOpenChange(false)
    } catch (error) {
      setNotice({
        kind: 'error',
        message: isCreate
          ? `No se pudo crear el jugador. ${errorDetail(error)}`
          : `No se pudo completar la operación pendiente. ${errorDetail(error)}`,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const deletePlayer = async () => {
    if (intent.kind !== 'edit') return
    const fullName = `${intent.player.firstName} ${intent.player.lastName}`
    if (!window.confirm(`¿Eliminar a ${fullName} del sistema? Esta acción elimina su perfil completo; no es sólo quitarlo de un equipo.`)) return

    setSubmitting(true)
    setNotice(null)
    try {
      await playerService.delete(intent.player.id)
      if (!await refreshOrReport('El jugador fue eliminado del sistema.')) return
      toast.success('Jugador eliminado del sistema')
      onOpenChange(false)
    } catch (error) {
      setNotice({ kind: 'error', message: `No se pudo eliminar el jugador del sistema. ${errorDetail(error)}` })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isCreate ? 'Nuevo jugador' : 'Editar jugador'}</SheetTitle>
          <SheetDescription>
            {isCreate
              ? 'Registrá un jugador con equipo o sin equipo.'
              : 'Corregí los datos del registro global o mové al jugador a otro equipo.'}
          </SheetDescription>
        </SheetHeader>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit(savePlayer)}>
          <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
            <div className="mb-5">
              <Label>Equipo</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId} disabled={submitting}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccioná un equipo" /></SelectTrigger>
                <SelectContent>
                  {(isCreate || !currentTeamId) && <SelectItem value={NO_TEAM}>Sin equipo</SelectItem>}
                  {teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {!isCreate && currentTeamId && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Podés mantener este equipo o mover al jugador a otro plantel.
                </p>
              )}
            </div>

            {isTransfer && (
              <Alert className="mb-5 border-amber-400/30 bg-amber-400/[0.06] p-3 text-xs leading-5 text-amber-300">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <p>
                    Al guardar, el jugador se moverá desde {currentTeam?.name ?? 'su equipo actual'} a {destinationTeam?.name ?? 'el equipo seleccionado'}.
                  </p>
                </div>
              </Alert>
            )}

            <PlayerFormFields form={form} jerseyWarning={jerseyWarning} />

            {notice && (
              <Alert className={`mt-5 p-3 text-xs leading-5 ${notice.kind === 'partial' ? 'border-amber-400/30 bg-amber-400/[0.06] text-amber-300' : 'border-destructive/40 bg-destructive/10 text-red-200'}`}>
                {notice.message}
              </Alert>
            )}

            {!isCreate && (
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
            <Button type="submit" disabled={submitting}>{submitting ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
