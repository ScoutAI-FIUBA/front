import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Pencil, Plus, Search, Trash2 } from 'lucide-react'
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

const POSITIONS: Player['primaryPosition'][] = ['DEL', 'MC', 'MCD', 'DFC', 'MED', 'DEF', 'EXT', 'POR']

export function PlayersPage() {
  const [rows, setRows] = useState<PlayerRow[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('all')
  const [editOpen, setEditOpen] = useState(false)
  const [editPlayerId, setEditPlayerId] = useState('')
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editPosition, setEditPosition] = useState<Player['primaryPosition'] | ''>('')
  const [editJersey, setEditJersey] = useState('')
  const [editBirthDate, setEditBirthDate] = useState('')
  const [editHeightCm, setEditHeightCm] = useState('')
  const [editWeightKg, setEditWeightKg] = useState('')

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
    setEditFirstName(player.firstName)
    setEditLastName(player.lastName)
    setEditPosition(player.primaryPosition)
    setEditJersey(player.jerseyNumber ? String(player.jerseyNumber) : '')
    setEditBirthDate(player.birthDate)
    setEditHeightCm(player.heightCm ? String(player.heightCm) : '')
    setEditWeightKg(player.weightKg ? String(player.weightKg) : '')
    setEditOpen(true)
  }

  const handleUpdate = async () => {
    if (!editPlayerId || !editFirstName.trim() || !editLastName.trim() || !editPosition || !editBirthDate) {
      toast.error('Completá los campos obligatorios')
      return
    }
    const height = Number(editHeightCm)
    const weight = Number(editWeightKg)
    if (!height || height <= 0 || !weight || weight <= 0) {
      toast.error('Altura y peso deben ser números válidos')
      return
    }
    try {
      await playerService.update(editPlayerId, {
        firstName: editFirstName,
        lastName: editLastName,
        birthDate: editBirthDate,
        primaryPosition: editPosition,
        jerseyNumber: editJersey ? Number(editJersey) : undefined,
        heightCm: height,
        weightKg: weight,
      })
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
                <td className="p-4"><Badge variant="position">{p.primaryPosition}</Badge></td>
                <td className="p-4">{calcAge(p.birthDate)}</td>
                <td className="p-4">#{p.jerseyNumber ?? '—'}</td>
                <td className="p-4 text-muted-foreground">{p.teamName ?? '—'}</td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-2 text-primary">
                    <button type="button" className="flex items-center gap-1 text-xs hover:underline"><Eye className="h-3 w-3" /> Ver detalle</button>
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
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Apellido</label>
                <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Posición</label>
              <Select value={editPosition} onValueChange={(value) => setEditPosition(value as Player['primaryPosition'])}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccione una posición" /></SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((position) => (
                    <SelectItem key={position} value={position}>{position}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Dorsal</label>
                <Input type="number" value={editJersey} onChange={(e) => setEditJersey(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Fecha de nacimiento</label>
                <Input type="date" value={editBirthDate} onChange={(e) => setEditBirthDate(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium">Altura (cm)</label>
                <Input type="number" value={editHeightCm} onChange={(e) => setEditHeightCm(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">Peso (kg)</label>
                <Input type="number" value={editWeightKg} onChange={(e) => setEditWeightKg(e.target.value)} className="mt-1" />
              </div>
            </div>
            <Button onClick={() => void handleUpdate()} className="w-full">Guardar cambios</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

