import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { playerService, teamService } from '@/services/registry'
import type { Player, Team } from '@/types'
import { calcAge, getInitials } from '@/lib/utils'
import { toast } from 'sonner'

interface PlayerRow extends Player {
  teamName: string | null
}

import { positionLabel } from '@/lib/positions'
import { PlayerFormFields } from './PlayerFormFields'
import {
  emptyPlayerFormValues,
  playerFormSchema,
  playerFormToDto,
  playerToFormValues,
  type PlayerFormValues,
} from './player-form'

export function PlayersPage() {
  const [rows, setRows] = useState<PlayerRow[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('all')
  const [editOpen, setEditOpen] = useState(false)
  const [editPlayerId, setEditPlayerId] = useState('')
  const editForm = useForm<PlayerFormValues>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: emptyPlayerFormValues,
  })

  const load = async () => {
    const [players, teamList] = await Promise.all([playerService.list(), teamService.list()])
    setTeams(teamList)
    const teamNames = new Map(teamList.map((t) => [t.id, t.name]))
    setRows(
      players.map((p) => ({
        ...p,
        teamName: p.teamId ? teamNames.get(p.teamId) ?? null : null,
      })),
    )
  }

  useEffect(() => {
    void load()
  }, [])

  const openEdit = (player: PlayerRow) => {
    setEditPlayerId(player.id)
    editForm.reset(playerToFormValues(player))
    setEditOpen(true)
  }

  const handleUpdate = async (values: PlayerFormValues) => {
    if (!editPlayerId) return
    try {
      await playerService.update(editPlayerId, playerFormToDto(values))
      toast.success('Jugador actualizado')
      setEditOpen(false)
      void load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el jugador')
    }
  }

  const handleDelete = async (player: PlayerRow) => {
    const confirmed = window.confirm(`¿Eliminar a ${player.firstName} ${player.lastName}?`)
    if (!confirmed) return
    try {
      await playerService.delete(player.id)
      toast.success('Jugador eliminado')
      void load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar el jugador')
    }
  }

  const filtered = rows.filter((p) => {
    const name = `${p.firstName} ${p.lastName}`.toLowerCase()
    const matchSearch = name.includes(search.toLowerCase())
    const matchTeam = teamFilter === 'all' || p.teamId === teamFilter
    return matchSearch && matchTeam
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mis jugadores</h1>
          <p className="text-sm text-muted-foreground">Gestioná los jugadores registrados y su asociación con equipos.</p>
        </div>
        <Button asChild>
          <Link to="/jugadores/nuevo"><Plus className="h-4 w-4" /> Agregar jugador</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar jugador..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Filtrar por equipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los equipos</SelectItem>
            {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-accent/50">
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="p-4 font-medium">Nombre</th>
              <th className="p-4 font-medium">Posición</th>
              <th className="p-4 font-medium">Edad</th>
              <th className="p-4 font-medium">Dorsal</th>
              <th className="p-4 font-medium">Equipo</th>
              <th className="p-4 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{getInitials(p.firstName, p.lastName)}</AvatarFallback>
                    </Avatar>
                    {p.firstName} {p.lastName}
                  </div>
                </td>
                <td className="p-4"><Badge variant="position">{positionLabel(p.primaryPosition)}</Badge></td>
                <td className="p-4">{calcAge(p.birthDate)}</td>
                <td className="p-4">#{p.jerseyNumber ?? '—'}</td>
                <td className="p-4 text-muted-foreground">{p.teamName ?? '—'}</td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-2 text-primary">
                    <button type="button" className="flex items-center gap-1 text-xs hover:underline" onClick={() => openEdit(p)}>
                      <Pencil className="h-3 w-3" /> Editar
                    </button>
                    <button type="button" className="flex items-center gap-1 text-xs text-red-700 hover:underline" onClick={() => void handleDelete(p)}>
                      <Trash2 className="h-3 w-3" /> Borrar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t p-4 text-xs text-muted-foreground">Mostrando 1-{filtered.length} de {filtered.length} jugadores</p>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar jugador</DialogTitle>
            <DialogDescription>Actualizá los datos del perfil del jugador.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={editForm.handleSubmit(handleUpdate)}>
            <PlayerFormFields form={editForm} />
            <Button type="submit" className="w-full">Guardar cambios</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

