import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Image, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import type { Team } from '@/types'
import { calcAge } from '@/lib/utils'
import { toast } from 'sonner'
import { PlayerFormFields } from './PlayerFormFields'
import {
  emptyPlayerFormValues,
  playerFormSchema,
  playerFormToCreateDto,
  type PlayerFormValues,
} from './player-form'

export function PlayerNewPage() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState<Team[]>([])
  const [teamId, setTeamId] = useState('')
  const form = useForm<PlayerFormValues>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: { ...emptyPlayerFormValues, heightCm: '180', weightKg: '75' },
  })

  useEffect(() => {
    void teamService.list().then(setTeams)
  }, [])

  const handleSave = async (values: PlayerFormValues) => {
    try {
      await playerService.create(playerFormToCreateDto(values, teamId || undefined))
      toast.success('Jugador guardado')
      navigate('/jugadores')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar el jugador')
    }
  }

  const birthDate = form.watch('birthDate')
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

        <form className="space-y-4 rounded-lg border bg-white p-6" onSubmit={form.handleSubmit(handleSave)}>
          <PlayerFormFields form={form} />
          {age !== null && <p className="text-xs text-muted-foreground">Edad actual: {age} años</p>}
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
            <Button type="button" variant="outline" onClick={() => navigate('/jugadores')}>Cancelar</Button>
            <Button type="submit">Guardar Jugador</Button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-3 gap-4 rounded-lg border bg-white p-4 text-center text-xs">
        <div><p className="text-muted-foreground">ESTADO</p><p className="font-medium text-orange-600">● Pendiente</p></div>
        <div><p className="text-muted-foreground">CREADO POR</p><p className="font-medium">Analista</p></div>
        <div><p className="text-muted-foreground">FECHA</p><p className="font-medium">{new Date().toLocaleDateString('es-AR')}</p></div>
      </div>
    </div>
  )
}

