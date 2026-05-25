import { useEffect, useState } from 'react'
import { Link2, Plus, Shield, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { teamService, playerService } from '@/services/registry'
import type { Player, Team } from '@/types'
import { toast } from 'sonner'

export function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [linkPlayer, setLinkPlayer] = useState('')
  const [linkTeam, setLinkTeam] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')

  const load = async () => {
    const list = await teamService.list()
    setTeams(list)
    const c: Record<string, number> = {}
    await Promise.all(list.map(async (t) => { c[t.id] = await teamService.getPlayerCount(t.id) }))
    setCounts(c)
  }

  useEffect(() => {
    void load()
    void playerService.list().then(setPlayers)
  }, [])

  const filtered = teams.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
  const totalPlayers = Object.values(counts).reduce((a, b) => a + b, 0)

  const handleCreate = async () => {
    if (!newName.trim()) return
    await teamService.create({
      name: newName,
      shortName: newName.slice(0, 3).toUpperCase(),
      city: '—',
      country: 'Argentina',
    })
    setNewName('')
    setCreateOpen(false)
    toast.success('Equipo creado')
    void load()
  }

  const handleLink = async () => {
    if (!linkPlayer || !linkTeam) {
      toast.error('Seleccioná jugador y equipo')
      return
    }
    await teamService.addMember(linkTeam, linkPlayer)
    toast.success('Jugador vinculado')
    setLinkPlayer('')
    setLinkTeam('')
    void load()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mis equipos</h1>
          <p className="text-sm text-muted-foreground">
            Gestioná los equipos registrados y accedé a sus jugadores y videos asociados.
          </p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <span><strong>TOTAL</strong> {teams.length}</span>
          <span><strong>JUGADORES</strong> {totalPlayers}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input placeholder="Buscar equipo..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4" /> Crear equipo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Crear equipo</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nombre del equipo</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej. Olympia FC" className="mt-1" />
              </div>
              <Button onClick={() => void handleCreate()} className="w-full">Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline"><Link2 className="h-4 w-4" /> Vincular jugador</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Vincular jugador con equipo</DialogTitle></DialogHeader>
            <Alert className="border-accent bg-accent text-sm">Jugador listo para vincular</Alert>
            <div className="space-y-4">
              <div>
                <Label className="text-xs uppercase">Seleccionar jugador</Label>
                <Select value={linkPlayer} onValueChange={setLinkPlayer}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Buscar jugador..." /></SelectTrigger>
                  <SelectContent>
                    {players.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase">Seleccionar equipo</Label>
                <Select value={linkTeam} onValueChange={setLinkTeam}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar equipo..." /></SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Alert className="border-red-200 bg-red-50 text-red-700 text-xs">
                Atención: Verificá que hayas seleccionado un jugador y un equipo antes de continuar.
              </Alert>
              <Button onClick={() => void handleLink()} className="w-full"><Link2 className="h-4 w-4" /> Vincular</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {filtered.map((team) => (
          <Card key={team.id}>
            <CardContent className="p-5">
              <div className="mb-4 flex items-start justify-between">
                <div className="rounded-lg bg-accent p-2 text-primary"><Shield className="h-5 w-5" /></div>
                {team.category && <Badge variant="outline">{team.category}</Badge>}
              </div>
              <h3 className="font-semibold">{team.name}</h3>
              <p className="text-sm text-muted-foreground">{team.league}</p>
              <p className="mt-4 text-xs font-medium text-muted-foreground">JUGADORES {counts[team.id] ?? 0}</p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" className="flex-1">Ver equipo</Button>
                <Button size="sm" variant="outline">Editar</Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="border-dashed border-primary/30 bg-accent/50">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <Plus className="mb-2 h-8 w-8 text-primary" />
            <h3 className="font-semibold">Crear nuevo equipo</h3>
            <p className="mt-2 text-sm text-muted-foreground">Registrá un equipo para asociarle jugadores y videos.</p>
            <Button variant="outline" className="mt-4" onClick={() => setCreateOpen(true)}>Crear equipo</Button>
          </CardContent>
        </Card>
      </div>

      {teams.length === 0 && (
        <Card className="border-dashed bg-accent/30 p-12 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-primary/50" />
          <h3 className="font-semibold">Todavía no cargaste equipos.</h3>
          <p className="mt-2 text-sm text-muted-foreground">Creá tu primer equipo para empezar.</p>
          <Button className="mt-4" onClick={() => setCreateOpen(true)}>+ Crear equipo</Button>
        </Card>
      )}
    </div>
  )
}

