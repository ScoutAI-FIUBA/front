import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Pencil, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

interface PlayerRow extends Player {
  teamName: string | null
}

export function PlayersPage() {
  const [rows, setRows] = useState<PlayerRow[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('all')

  useEffect(() => {
    void (async () => {
      const [players, teamList] = await Promise.all([playerService.list(), teamService.list()])
      setTeams(teamList)
      const enriched = await Promise.all(
        players.map(async (p) => ({
          ...p,
          teamName: await playerService.getTeamName(p.id),
        })),
      )
      setRows(enriched)
    })()
  }, [])

  const filtered = rows.filter((p) => {
    const name = `${p.firstName} ${p.lastName}`.toLowerCase()
    const matchSearch = name.includes(search.toLowerCase())
    const matchTeam = teamFilter === 'all' || p.teamName === teams.find((t) => t.id === teamFilter)?.name
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
                  <div className="flex gap-2 text-primary">
                    <button type="button" className="flex items-center gap-1 text-xs hover:underline"><Eye className="h-3 w-3" /> Ver detalle</button>
                    <Pencil className="h-3 w-3" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t p-4 text-xs text-muted-foreground">Mostrando 1-{filtered.length} de {filtered.length} jugadores</p>
      </div>
    </div>
  )
}

