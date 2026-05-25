import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { matchService, teamService } from '@/services/registry'
import type { Match, Team } from '@/types'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'

export function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [homeId, setHomeId] = useState('')
  const [awayId, setAwayId] = useState('')
  const [date, setDate] = useState('')
  const [title, setTitle] = useState('')
  const [rosterMatch, setRosterMatch] = useState<Match | null>(null)
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])

  const load = async () => {
    const [m, t] = await Promise.all([matchService.list(), teamService.list()])
    setMatches(m)
    setTeams(t)
  }

  useEffect(() => { void load() }, [])

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? id

  const handleCreate = async () => {
    if (!homeId || !awayId || !date) {
      toast.error('Completá equipo local, visitante y fecha')
      return
    }
    await matchService.create({ homeTeamId: homeId, awayTeamId: awayId, scheduledAt: date, title })
    toast.success('Partido creado')
    setHomeId('')
    setAwayId('')
    setDate('')
    setTitle('')
    void load()
  }

  const handleRoster = async () => {
    if (!rosterMatch) return
    const entries = selectedPlayers.map((playerId) => ({
      playerId,
      teamId: rosterMatch.homeTeamId,
      isStarter: true,
    }))
    await matchService.setRoster(rosterMatch.id, entries)
    toast.success('Roster guardado')
    setRosterMatch(null)
    setSelectedPlayers([])
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Partidos</h1>
          <p className="text-sm text-muted-foreground">Creá encuentros y asigná el roster de jugadores.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4" /> Nuevo partido</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Crear partido</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Final Copa Regional" className="mt-1" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Equipo local</Label>
                  <Select value={homeId} onValueChange={setHomeId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Local" /></SelectTrigger>
                    <SelectContent>{teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Equipo visitante</Label>
                  <Select value={awayId} onValueChange={setAwayId}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Visitante" /></SelectTrigger>
                    <SelectContent>{teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Fecha</Label><Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" /></div>
              <Button className="w-full" onClick={() => void handleCreate()}>Crear partido</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {matches.map((m) => (
          <Card key={m.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">{m.title ?? `${teamName(m.homeTeamId)} vs ${teamName(m.awayTeamId)}`}</CardTitle>
              <Badge variant="outline">{m.status}</Badge>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">{formatDate(m.scheduledAt)} · {m.competition}</p>
              <Button variant="outline" size="sm" onClick={() => setRosterMatch(m)}>Definir roster</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!rosterMatch} onOpenChange={(o) => !o && setRosterMatch(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Roster — {rosterMatch?.title}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Seleccioná jugadores convocados (mock: IDs del equipo local).</p>
          <Input
            placeholder="IDs jugador separados por coma (ej. player-1,player-4)"
            value={selectedPlayers.join(',')}
            onChange={(e) => setSelectedPlayers(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          />
          <Button onClick={() => void handleRoster()}>Guardar roster</Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

