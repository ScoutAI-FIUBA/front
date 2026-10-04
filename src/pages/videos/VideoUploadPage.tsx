import { type ChangeEvent, type DragEvent, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { FileVideo2, Lightbulb, LoaderCircle, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { teamService, videoService } from '@/services/registry'
import type { Team } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { videoUploadReturnPath, videoUploadSuccessPath } from './video-upload-navigation'

export function VideoUploadPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [teams, setTeams] = useState<Team[]>([])
  const [title, setTitle] = useState('')
  const [teamId, setTeamId] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [teamsState, setTeamsState] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    let active = true
    void teamService.list().then(
      (loaded) => {
        if (!active) return
        setTeams(loaded)
        const requestedTeamId = searchParams.get('team_id')
        if (requestedTeamId && loaded.some((team) => team.id === requestedTeamId)) setTeamId(requestedTeamId)
        setTeamsState('success')
      },
      () => { if (active) setTeamsState('error') },
    )
    return () => { active = false }
  }, [searchParams])

  const acceptFile = (selectedFile: File | undefined) => {
    if (!selectedFile) return
    if (selectedFile.type && !selectedFile.type.startsWith('video/')) {
      toast.error('Seleccioná un archivo de video')
      return
    }
    setFile(selectedFile)
    if (!title.trim()) setTitle(selectedFile.name.replace(/\.[^.]+$/, ''))
  }

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => acceptFile(event.target.files?.[0])
  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    acceptFile(event.dataTransfer.files?.[0])
  }

  const handleUpload = async () => {
    if (!title.trim() || !teamId || !file || isUploading) {
      if (!isUploading) toast.error('Completá título, equipo y archivo')
      return
    }

    try {
      setIsUploading(true)
      const uploaded = await videoService.upload({ title: title.trim(), teamId, description: description.trim(), file })
      toast.success('Video subido correctamente')
      navigate(videoUploadSuccessPath(searchParams, uploaded))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo subir el video')
    } finally {
      setIsUploading(false)
    }
  }

  const returnPath = videoUploadReturnPath(searchParams, teamId)

  return (
    <div className="mx-auto w-full max-w-[1080px] space-y-6">
      <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Biblioteca de material</p><h1 className="mt-1 text-2xl font-bold">Subir video</h1><p className="mt-2 text-sm text-muted-foreground">Prepará el material para reproducirlo, crear clips o iniciar su análisis automático.</p></div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card><CardContent className="space-y-4 p-6"><h2 className="font-semibold">Detalles del video</h2><div><Label htmlFor="video-title">Título</Label><Input id="video-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej: Liga Metropolitana: MET vs OLY" className="mt-1" disabled={isUploading} /></div><div><Label>Equipo asociado</Label><Select value={teamId} onValueChange={setTeamId} disabled={isUploading || teamsState !== 'success'}><SelectTrigger className="mt-1"><SelectValue placeholder={teamsState === 'loading' ? 'Cargando equipos…' : 'Seleccionar equipo'} /></SelectTrigger><SelectContent>{teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}</SelectContent></Select>{teamsState === 'error' && <p className="mt-2 text-sm text-destructive">No pudimos cargar los equipos. Volvé a ingresar a esta pantalla para reintentar.</p>}</div><div><Label htmlFor="video-description">Descripción</Label><Input id="video-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Contexto opcional del video" className="mt-1" disabled={isUploading} /></div><div className="flex gap-2 rounded-lg bg-accent p-3 text-xs text-muted-foreground"><Lightbulb className="h-4 w-4 shrink-0 text-primary" />Para mejores resultados, usá un video estable y con buena visibilidad de la cancha.</div></CardContent></Card>

        <div className="space-y-4">
          <label
            className={cn('flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors', isDragging ? 'border-primary bg-primary-subtle' : 'border-primary/30 bg-accent/40 hover:border-primary/60', isUploading && 'pointer-events-none opacity-60')}
            onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { if (event.currentTarget === event.target) setIsDragging(false) }}
            onDrop={handleDrop}
          >
            {file ? <FileVideo2 className="mb-4 h-12 w-12 text-primary" /> : <Upload className="mb-4 h-12 w-12 text-primary/60" />}
            <p className="text-sm font-semibold">{file ? file.name : 'Arrastrá el archivo de video aquí'}</p>
            <p className="mt-2 text-xs text-muted-foreground">{file ? `${(file.size / 1024 / 1024).toLocaleString('es-AR', { maximumFractionDigits: 1 })} MB · Hacé click para reemplazarlo` : 'o hacé click para seleccionarlo · MP4, MOV, AVI y otros formatos de video'}</p>
            <input type="file" accept="video/*" className="hidden" onChange={handleFile} disabled={isUploading} />
          </label>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="outline" disabled={isUploading} onClick={() => navigate(returnPath)}>Cancelar</Button><Button disabled={isUploading || teamsState !== 'success'} onClick={() => void handleUpload()}>{isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{isUploading ? 'Subiendo…' : 'Subir video'}</Button></div>
        </div>
      </div>
    </div>
  )
}
