import { type ChangeEvent, useEffect, useState } from 'react'
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
import { teamService, videoService } from '@/services/registry'
import type { Team } from '@/types'
import { toast } from 'sonner'

export function VideoUploadPage() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState<Team[]>([])
  const [title, setTitle] = useState('')
  const [teamId, setTeamId] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState('Esperando archivo...')

  useEffect(() => {
    void teamService.list().then(setTeams)
  }, [])

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setUploadStatus(`Archivo listo: ${selectedFile.name}`)
    }
  }

  const handleUpload = async () => {
    if (!title || !teamId || !file) {
      toast.error('Completá título, equipo y archivo')
      return
    }

    try {
      setUploadStatus('Subiendo...')
      await videoService.upload({ title, teamId, description, file })
      toast.success('Video subido correctamente')
      navigate('/videos')
    } catch (error) {
      setUploadStatus('Error al subir el video')
      toast.error(error instanceof Error ? error.message : 'No se pudo subir el video')
    }
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
            <h2 className="font-semibold">Detalles del video</h2>
            <div>
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Final Copa Regional 2024" className="mt-1" />
            </div>
            <div>
              <Label>Equipo asociado</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar equipo" /></SelectTrigger>
                <SelectContent>{teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descripción</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Contexto opcional del video" className="mt-1" />
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

