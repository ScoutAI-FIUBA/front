import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Image, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { playerService, teamService } from '@/services/registry'
import type { PositionCode, Team } from '@/types'
import { calcAge } from '@/lib/utils'
import { toast } from 'sonner'

const POSITIONS: PositionCode[] = ['DEL', 'MC', 'MCD', 'DFC', 'MED', 'DEF', 'EXT', 'POR']

export function PlayerNewPage() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState<Team[]>([])
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [position, setPosition] = useState<PositionCode | ''>('')
  const [jersey, setJersey] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [teamId, setTeamId] = useState('')

  useEffect(() => {
    void teamService.list().then(setTeams)
  }, [])

  const handleSave = async () => {
    if (!firstName || !lastName || !position || !birthDate) {
      toast.error('Completá los campos obligatorios')
      return
    }
    await playerService.create({
      firstName,
      lastName,
      birthDate,
      primaryPosition: position,
      jerseyNumber: jersey ? Number(jersey) : undefined,
      teamId: teamId || undefined,
    })
    toast.success('Jugador guardado')
    navigate('/jugadores')
  }

  const age = birthDate ? calcAge(birthDate) : null

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Crear perfil de jugador</h1>
        <p className="text-sm text-muted-foreground">Completá los datos del jugador para registrarlo en ScoutAI.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center border-2 border-dashed p-10 text-center">
              <Image className="mb-2 h-10 w-10 text-muted-foreground" />
              <p className="text-sm font-medium">Foto del jugador (opcional)</p>
              <p className="mt-1 text-xs text-muted-foreground">Arrastre o haga clic para subir imagen</p>
              <p className="mt-4 text-[10px] uppercase text-muted-foreground">Formato JPG, PNG. Máximo 5MB.</p>
            </CardContent>
          </Card>
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="flex gap-3 p-4">
              <Info className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Validación</p>
                <p className="text-sm opacity-90">Revisá que el dorsal y el equipo asociado sean correctos antes de guardar.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 rounded-lg border bg-white p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Nombre</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ej. Javier" className="mt-1" />
            </div>
            <div>
              <Label>Apellido</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Ej. Hernández" className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Posición</Label>
            <Select value={position} onValueChange={(v) => setPosition(v as PositionCode)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccione una posición" /></SelectTrigger>
              <SelectContent>
                {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Dorsal</Label>
              <Input type="number" value={jersey} onChange={(e) => setJersey(e.target.value)} placeholder="Ej. 10" className="mt-1" />
            </div>
            <div>
              <Label>Fecha de nacimiento</Label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Edad</Label>
            <Input value={age ?? ''} readOnly placeholder="Ej. 24" className="mt-1 bg-muted" />
          </div>
          <div>
            <Label>Equipo asociado</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar equipo" /></SelectTrigger>
              <SelectContent>
                {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => navigate('/jugadores')}>Cancelar</Button>
            <Button onClick={() => void handleSave()}>Guardar Jugador</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 rounded-lg border bg-white p-4 text-center text-xs">
        <div><p className="text-muted-foreground">ESTADO</p><p className="font-medium text-orange-600">● Pendiente</p></div>
        <div><p className="text-muted-foreground">CREADO POR</p><p className="font-medium">Analista</p></div>
        <div><p className="text-muted-foreground">FECHA</p><p className="font-medium">{new Date().toLocaleDateString('es-AR')}</p></div>
      </div>
    </div>
  )
}

