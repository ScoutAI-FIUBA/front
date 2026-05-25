import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lightbulb, Play, Upload } from 'lucide-react'
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
import { matchService, teamService, videoService } from '@/services/registry'
import type { Match, Team } from '@/types'
import { toast } from 'sonner'

export function VideoUploadPage() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [teamId, setTeamId] = useState('')
  const [matchId, setMatchId] = useState('')
  const [rival, setRival] = useState('')
  const [fileName, setFileName] = useState('')
  const [uploadStatus, setUploadStatus] = useState('Esperando archivo...')

  useEffect(() => {
    void Promise.all([teamService.list(), matchService.list()]).then(([t, m]) => {
      setTeams(t)
      setMatches(m)
    })
  }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
      setUploadStatus(`Archivo listo: ${file.name}`)
    }
  }

  const handleUpload = async () => {
    if (!title || !teamId || !matchId) {
      toast.error('Completá título, equipo y partido')
      return
    }
    setUploadStatus('Subiendo...')
    await videoService.upload({ title, teamId, matchId, rivalName: rival, fileName })
    toast.success('Video subido correctamente')
    navigate('/videos')
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase text-primary">Análisis de video</p>
        <h1 className="text-2xl font-bold">Subir video de partido</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4 p-6">
            <h2 className="font-semibold">Detalles del Partido</h2>
            <div>
              <Label>Nombre del partido</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Final Copa Regional 2024" className="mt-1" />
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Equipo asociado</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar equipo" /></SelectTrigger>
                <SelectContent>{teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Partido</Label>
              <Select value={matchId} onValueChange={setMatchId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar partido" /></SelectTrigger>
                <SelectContent>{matches.map((m) => <SelectItem key={m.id} value={m.id}>{m.title ?? m.id}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rival / oponente</Label>
              <Input value={rival} onChange={(e) => setRival(e.target.value)} placeholder="Nombre del oponente" className="mt-1" />
            </div>
            <div className="flex gap-2 rounded-lg bg-accent p-3 text-xs text-muted-foreground">
              <Lightbulb className="h-4 w-4 shrink-0 text-primary" />
              Para mejores resultados, subí un video con buena visibilidad del campo
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/30 bg-accent/50 p-12 text-center">
            <Upload className="mb-4 h-12 w-12 text-primary/60" />
            <p className="text-sm font-medium">Arrastrá el archivo de video aquí o hacé click</p>
            <p className="mt-2 text-xs text-muted-foreground">Formatos: MP4, MOV, AVI</p>
            <input type="file" accept="video/*" className="hidden" onChange={handleFile} />
          </label>
          <p className="text-sm"><span className="font-medium">Estado de carga:</span> {uploadStatus}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => navigate('/videos')}>Cancelar</Button>
            <Button onClick={() => void handleUpload()}><Play className="h-4 w-4" /> Subir video</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

