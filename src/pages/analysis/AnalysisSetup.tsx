import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  ArrowRight,
  Film,
  LoaderCircle,
  Plus,
  RotateCcw,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusIndicator } from '@/components/ui/status-indicator'
import { teamService, videoService } from '@/services/registry'
import type { Team, Video } from '@/types'

type ResourceState = 'loading' | 'ready' | 'error'
type SourceKind = 'none' | 'existing' | 'upload'
type MaterialState =
  | 'initial'
  | 'resolving'
  | 'validating'
  | 'file-ready'
  | 'uploading'
  | 'upload-error'
  | 'source-error'
  | 'ready'

export interface PreparedAnalysisSetup {
  sourceKind: Exclude<SourceKind, 'none'>
  video: Video
  team: Team
  rivalTeam?: Team
  analysisName: string
  matchDate: string
  matchContext: string
  playbackUrl: string
  durationSeconds: number
  sourceFile?: File
  uploadedDuringSetup: boolean
}

interface AnalysisSetupProps {
  initialValue?: PreparedAnalysisSetup | null
  lockMaterial?: boolean
  onStart: (setup: PreparedAnalysisSetup) => void
  onCancel?: () => void
}

const PLAYBACK_RESOLUTION_TIMEOUT_MS = 15_000

function inferAnalysisName(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '').trim() || 'Nuevo análisis'
}

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`
  return `${(size / (1024 * 1024)).toFixed(size < 10 * 1024 * 1024 ? 1 : 0)} MB`
}

function resolvePlaybackMetadata(source: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const media = document.createElement('video')
    const timeout = window.setTimeout(() => {
      cleanup()
      reject(new Error('El video tardó demasiado en responder'))
    }, PLAYBACK_RESOLUTION_TIMEOUT_MS)

    const cleanup = () => {
      window.clearTimeout(timeout)
      media.removeAttribute('src')
      media.load()
    }

    media.preload = 'metadata'
    media.onloadedmetadata = () => {
      const duration = media.duration
      cleanup()
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error('No pudimos leer la duración del video'))
        return
      }
      resolve(duration)
    }
    media.onerror = () => {
      cleanup()
      reject(new Error('No pudimos reproducir esta fuente de video'))
    }
    media.src = source
  })
}

export function AnalysisSetup({
  initialValue = null,
  lockMaterial = false,
  onStart,
  onCancel,
}: AnalysisSetupProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const ownedPlaybackUrlRef = useRef('')
  const materialRequestRef = useRef(0)
  const [resourceState, setResourceState] = useState<ResourceState>('loading')
  const [resourceError, setResourceError] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [unavailableVideoIds, setUnavailableVideoIds] = useState<string[]>([])
  const [sourceKind, setSourceKind] = useState<SourceKind>(initialValue?.sourceKind ?? 'none')
  const [materialState, setMaterialState] = useState<MaterialState>(initialValue ? 'ready' : 'initial')
  const [materialError, setMaterialError] = useState('')
  const [selectedVideoId, setSelectedVideoId] = useState(initialValue?.video.id ?? '')
  const [file, setFile] = useState<File | null>(initialValue?.sourceFile ?? null)
  const [playbackUrl, setPlaybackUrl] = useState(initialValue?.playbackUrl ?? '')
  const [durationSeconds, setDurationSeconds] = useState(initialValue?.durationSeconds ?? 0)
  const [preparedVideo, setPreparedVideo] = useState<Video | null>(initialValue?.video ?? null)
  const [uploadedDuringSetup, setUploadedDuringSetup] = useState(
    initialValue?.uploadedDuringSetup ?? false,
  )
  const [analysisName, setAnalysisName] = useState(initialValue?.analysisName ?? '')
  const [teamId, setTeamId] = useState(initialValue?.team.id ?? '')
  const [rivalTeamId, setRivalTeamId] = useState(initialValue?.rivalTeam?.id ?? 'none')
  const [matchDate, setMatchDate] = useState(initialValue?.matchDate ?? '')
  const [matchContext, setMatchContext] = useState(initialValue?.matchContext ?? '')
  const [isDraggingVideo, setIsDraggingVideo] = useState(false)
  const [createTeamOpen, setCreateTeamOpen] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamCity, setNewTeamCity] = useState('')
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [createTeamError, setCreateTeamError] = useState('')

  const loadResources = useCallback(async () => {
    setResourceState('loading')
    setResourceError('')
    try {
      const [teamData, videoData] = await Promise.all([teamService.list(), videoService.list()])
      const nextTeams = initialValue && !teamData.some((team) => team.id === initialValue.team.id)
        ? [initialValue.team, ...teamData]
        : teamData
      const nextVideos = initialValue && !videoData.some((video) => video.id === initialValue.video.id)
        ? [initialValue.video, ...videoData]
        : videoData
      setTeams(nextTeams)
      setVideos(nextVideos)
      setResourceState('ready')
    } catch (error) {
      setResourceError(error instanceof Error ? error.message : 'No pudimos cargar videos y equipos')
      setResourceState('error')
    }
  }, [initialValue])

  useEffect(() => {
    void loadResources()
  }, [loadResources])

  useEffect(() => {
    return () => {
      materialRequestRef.current += 1
      if (ownedPlaybackUrlRef.current) URL.revokeObjectURL(ownedPlaybackUrlRef.current)
    }
  }, [])

  const replaceOwnedPlaybackUrl = (nextUrl: string) => {
    if (ownedPlaybackUrlRef.current) URL.revokeObjectURL(ownedPlaybackUrlRef.current)
    ownedPlaybackUrlRef.current = nextUrl
    setPlaybackUrl(nextUrl)
  }

  const availableVideos = videos.filter(
    (video) =>
      (video.status === 'uploaded' || video.status === 'analyzed')
      && !unavailableVideoIds.includes(video.id),
  )

  const selectedTeam = teams.find((team) => team.id === teamId)
  const selectedRivalTeam = rivalTeamId === 'none'
    ? undefined
    : teams.find((team) => team.id === rivalTeamId)
  const selectedListedVideo = videos.find((video) => video.id === selectedVideoId)
  const selectedMaterialTitle = preparedVideo?.title ?? file?.name ?? selectedListedVideo?.title ?? ''
  const canEditContext = materialState === 'file-ready'
    || materialState === 'upload-error'
    || materialState === 'uploading'
    || materialState === 'ready'

  const resetMaterial = () => {
    if (materialState === 'uploading') return
    if (
      uploadedDuringSetup
      && !window.confirm('El video ya fue subido y seguirá disponible en Videos aunque cambies el material.')
    ) {
      return
    }
    materialRequestRef.current += 1
    if (ownedPlaybackUrlRef.current) URL.revokeObjectURL(ownedPlaybackUrlRef.current)
    ownedPlaybackUrlRef.current = ''
    if (fileInputRef.current) fileInputRef.current.value = ''
    setSourceKind('none')
    setMaterialState('initial')
    setMaterialError('')
    setSelectedVideoId('')
    setFile(null)
    setPlaybackUrl('')
    setDurationSeconds(0)
    setPreparedVideo(null)
    setUploadedDuringSetup(false)
    setAnalysisName('')
    setTeamId('')
  }

  const resolveExistingVideo = async (videoId: string) => {
    const requestId = ++materialRequestRef.current
    const listedVideo = videos.find((video) => video.id === videoId)
    if (!listedVideo || (listedVideo.status !== 'uploaded' && listedVideo.status !== 'analyzed')) {
      setMaterialState('source-error')
      setMaterialError('Este video todavía no está disponible para analizar.')
      return
    }

    if (ownedPlaybackUrlRef.current) URL.revokeObjectURL(ownedPlaybackUrlRef.current)
    ownedPlaybackUrlRef.current = ''
    setSourceKind('existing')
    setSelectedVideoId(videoId)
    setFile(null)
    setPlaybackUrl('')
    setDurationSeconds(0)
    setPreparedVideo(null)
    setUploadedDuringSetup(false)
    setMaterialState('resolving')
    setMaterialError('')
    setAnalysisName(listedVideo.title)
    setTeamId(listedVideo.teamId)

    try {
      const resolvedVideo = await videoService.getById(videoId)
      if (requestId !== materialRequestRef.current) return
      if (
        !resolvedVideo
        || (resolvedVideo.status !== 'uploaded' && resolvedVideo.status !== 'analyzed')
        || !resolvedVideo.storageUrl.trim()
      ) {
        throw new Error('No pudimos obtener una fuente reproducible para este video')
      }
      const resolvedTeam = teams.find((team) => team.id === resolvedVideo.teamId)
      if (!resolvedTeam) throw new Error('No pudimos resolver el equipo asociado a este video')
      const resolvedDuration = await resolvePlaybackMetadata(resolvedVideo.storageUrl)
      if (requestId !== materialRequestRef.current) return
      setPreparedVideo(resolvedVideo)
      setPlaybackUrl(resolvedVideo.storageUrl)
      setDurationSeconds(resolvedDuration)
      setTeamId(resolvedTeam.id)
      setMaterialState('ready')
    } catch (error) {
      if (requestId !== materialRequestRef.current) return
      setUnavailableVideoIds((current) => current.includes(videoId) ? current : [...current, videoId])
      setPreparedVideo(null)
      setPlaybackUrl('')
      setMaterialState('source-error')
      setMaterialError(error instanceof Error ? error.message : 'No pudimos preparar este video')
    }
  }

  const validateVideoFile = async (selectedFile: File) => {
    const requestId = ++materialRequestRef.current
    setSourceKind('upload')
    setSelectedVideoId('')
    setPreparedVideo(null)
    setUploadedDuringSetup(false)
    setFile(selectedFile)
    setDurationSeconds(0)
    setMaterialError('')
    setAnalysisName(inferAnalysisName(selectedFile.name))

    if (!selectedFile.type.startsWith('video/')) {
      setMaterialState('source-error')
      setMaterialError('Seleccioná un archivo de video válido.')
      return
    }
    if (selectedFile.size <= 0) {
      setMaterialState('source-error')
      setMaterialError('El archivo seleccionado está vacío.')
      return
    }

    const nextPlaybackUrl = URL.createObjectURL(selectedFile)
    replaceOwnedPlaybackUrl(nextPlaybackUrl)
    setMaterialState('validating')
    try {
      const resolvedDuration = await resolvePlaybackMetadata(nextPlaybackUrl)
      if (requestId !== materialRequestRef.current) return
      setDurationSeconds(resolvedDuration)
      setMaterialState('file-ready')
    } catch (error) {
      if (requestId !== materialRequestRef.current) return
      setMaterialState('source-error')
      setMaterialError(error instanceof Error ? error.message : 'No pudimos validar el archivo')
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) void validateVideoFile(selectedFile)
  }

  const handleVideoDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDraggingVideo(false)
    const selectedFile = Array.from(event.dataTransfer.files)[0]
    if (selectedFile) void validateVideoFile(selectedFile)
  }

  const handleTeamChange = (nextTeamId: string) => {
    setTeamId(nextTeamId)
    if (rivalTeamId === nextTeamId) setRivalTeamId('none')
  }

  const uploadVideo = async () => {
    if (!file || !selectedTeam || materialState === 'uploading') return
    const title = analysisName.trim() || inferAnalysisName(file.name)
    setAnalysisName(title)
    setMaterialState('uploading')
    setMaterialError('')
    try {
      const uploadedVideo = await videoService.upload({
        title,
        teamId: selectedTeam.id,
        description: matchContext.trim() || selectedRivalTeam?.name,
        durationMs: Math.round(durationSeconds * 1000),
        file,
      })
      setPreparedVideo(uploadedVideo)
      setUploadedDuringSetup(true)
      setMaterialState('ready')
    } catch (error) {
      setMaterialState('upload-error')
      setMaterialError(error instanceof Error ? error.message : 'No pudimos subir el video')
    }
  }

  const startAnalysis = () => {
    if (!preparedVideo || !selectedTeam || !playbackUrl || !analysisName.trim()) return
    if (ownedPlaybackUrlRef.current === playbackUrl) ownedPlaybackUrlRef.current = ''
    onStart({
      sourceKind: sourceKind === 'none' ? 'existing' : sourceKind,
      video: preparedVideo,
      team: selectedTeam,
      rivalTeam: selectedRivalTeam,
      analysisName: analysisName.trim(),
      matchDate,
      matchContext: matchContext.trim(),
      playbackUrl,
      durationSeconds,
      sourceFile: file ?? undefined,
      uploadedDuringSetup,
    })
  }

  const createTeam = async () => {
    const name = newTeamName.trim()
    const city = newTeamCity.trim()
    if (!name || !city) {
      setCreateTeamError('Completá el nombre y la ciudad del equipo.')
      return
    }
    setCreatingTeam(true)
    setCreateTeamError('')
    try {
      const createdTeam = await teamService.create({
        name,
        shortName: name.slice(0, 3).toUpperCase(),
        city,
        country: 'Argentina',
      })
      setTeams((current) => [createdTeam, ...current.filter((team) => team.id !== createdTeam.id)])
      setTeamId(createdTeam.id)
      setNewTeamName('')
      setNewTeamCity('')
      setCreateTeamOpen(false)
      toast.success('Equipo creado')
    } catch (error) {
      setCreateTeamError(error instanceof Error ? error.message : 'No pudimos crear el equipo')
    } finally {
      setCreatingTeam(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[960px] space-y-6">
      <PageHeader
        title={initialValue ? 'Editar preparación' : 'Nuevo análisis'}
        description="Elegí y prepará el material antes de entrar al espacio de análisis."
        action={onCancel ? (
          <Button variant="outline" onClick={onCancel}>Volver al análisis</Button>
        ) : undefined}
      />

      <section aria-labelledby="setup-question" className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Preparación</p>
          <h2 id="setup-question" className="mt-1 text-xl font-semibold tracking-tight">
            ¿Qué material querés analizar?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Podés elegir un video disponible o subir uno nuevo.
          </p>
        </div>

        {resourceState === 'loading' && (
          <div className="flex min-h-40 items-center gap-3 border-y py-8 text-sm text-muted-foreground" aria-live="polite">
            <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
            Cargando material disponible…
          </div>
        )}

        {resourceState === 'error' && (
          <Alert className="flex flex-col gap-4 border-destructive/25 bg-destructive/5 p-5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">No pudimos preparar el inicio del análisis</p>
              <p className="mt-1 text-muted-foreground">{resourceError}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadResources()}>Reintentar</Button>
          </Alert>
        )}

        {resourceState === 'ready' && sourceKind === 'none' && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border bg-surface p-5">
              <Film className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="mt-4 font-semibold">Elegir un video existente</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Usá material que ya esté disponible para reproducción.
              </p>
              {availableVideos.length > 0 ? (
                <Select value="" onValueChange={(value) => void resolveExistingVideo(value)}>
                  <SelectTrigger className="mt-5"><SelectValue placeholder="Seleccionar video" /></SelectTrigger>
                  <SelectContent>
                    {availableVideos.map((video) => (
                      <SelectItem key={video.id} value={video.id}>{video.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="mt-5 text-sm text-muted-foreground">No hay videos existentes disponibles.</p>
              )}
            </div>

            <label
              className={`rounded-lg border border-dashed p-5 transition-colors ${
                isDraggingVideo ? 'border-primary bg-primary-subtle' : 'bg-surface hover:border-primary/40 hover:bg-primary-subtle/40'
              }`}
              onDragOver={(event) => {
                event.preventDefault()
                setIsDraggingVideo(true)
              }}
              onDragLeave={() => setIsDraggingVideo(false)}
              onDrop={handleVideoDrop}
            >
              <Upload className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="mt-4 font-semibold">Subir un video nuevo</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Arrastrá un archivo de video o seleccionalo desde tu equipo.
              </p>
              <span className="mt-5 inline-flex h-10 items-center rounded-lg border border-border-strong bg-surface px-4 text-sm font-semibold">
                Seleccionar archivo
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="sr-only"
                onChange={handleFileChange}
              />
            </label>
          </div>
        )}

        {resourceState === 'ready' && sourceKind !== 'none' && (
          <div className="rounded-lg border bg-surface p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Material seleccionado
                </p>
                <h3 className="mt-2 truncate text-lg font-semibold">{selectedMaterialTitle}</h3>
                {file && <p className="mt-1 text-sm text-muted-foreground">{formatFileSize(file.size)}</p>}
                {materialState === 'ready' && (
                  <StatusIndicator state="success" className="mt-3">Fuente lista</StatusIndicator>
                )}
              </div>
              {!lockMaterial && materialState !== 'uploading' && (
                <Button variant="ghost" size="sm" onClick={resetMaterial}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Cambiar material
                </Button>
              )}
            </div>

            {lockMaterial && (
              <Alert className="mt-5 border-information/20 bg-information/5 text-sm">
                El video queda bloqueado porque ya marcaste clips. Podés editar el nombre y el contexto sin perder ese trabajo.
              </Alert>
            )}

            {(materialState === 'resolving' || materialState === 'validating') && (
              <div className="mt-6 flex items-center gap-3 border-t pt-6 text-sm text-muted-foreground" aria-live="polite">
                <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
                {materialState === 'resolving' ? 'Comprobando la fuente de video…' : 'Validando el archivo…'}
              </div>
            )}

            {materialState === 'source-error' && (
              <Alert className="mt-6 border-destructive/25 bg-destructive/5">
                <p className="font-semibold">Este material no está listo</p>
                <p className="mt-1 text-muted-foreground">{materialError}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {sourceKind === 'existing' && selectedVideoId && (
                    <Button variant="outline" size="sm" onClick={() => void resolveExistingVideo(selectedVideoId)}>
                      Reintentar
                    </Button>
                  )}
                  {sourceKind === 'upload' && file && file.type.startsWith('video/') && file.size > 0 && (
                    <Button variant="outline" size="sm" onClick={() => void validateVideoFile(file)}>
                      Validar nuevamente
                    </Button>
                  )}
                </div>
              </Alert>
            )}

            {canEditContext && (
              <div className="mt-6 space-y-5 border-t pt-6">
                <div>
                  <Label htmlFor="analysis-name">Nombre del análisis</Label>
                  <Input
                    id="analysis-name"
                    value={analysisName}
                    onChange={(event) => setAnalysisName(event.target.value)}
                    className="mt-2"
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">Lo sugerimos a partir del material; podés editarlo.</p>
                </div>

                <div>
                  <Label>Equipo</Label>
                  {sourceKind === 'existing' || preparedVideo ? (
                    <div className="mt-2 rounded-lg border bg-surface-subtle px-3 py-2.5 text-sm font-medium">
                      {selectedTeam?.name ?? 'Equipo no disponible'}
                    </div>
                  ) : teams.length > 0 ? (
                    <Select value={teamId} onValueChange={handleTeamChange}>
                      <SelectTrigger className="mt-2"><SelectValue placeholder="Seleccionar equipo" /></SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Alert className="mt-2 border-information/20 bg-information/5">
                      <p className="font-semibold">No tenés equipos todavía</p>
                      <p className="mt-1 text-muted-foreground">Creá el mínimo necesario sin salir de este análisis.</p>
                      <Button className="mt-4" size="sm" onClick={() => setCreateTeamOpen(true)}>
                        <Plus className="h-4 w-4" aria-hidden="true" /> Crear equipo
                      </Button>
                    </Alert>
                  )}
                </div>

                <details className="rounded-lg border px-4 py-3">
                  <summary className="cursor-pointer text-sm font-semibold">Agregar contexto del partido (opcional)</summary>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Rival</Label>
                      <Select value={rivalTeamId} onValueChange={setRivalTeamId}>
                        <SelectTrigger className="mt-2"><SelectValue placeholder="Sin rival" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin rival</SelectItem>
                          {teams
                            .filter((team) => team.id !== teamId)
                            .map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="match-date">Fecha</Label>
                      <Input
                        id="match-date"
                        type="date"
                        value={matchDate}
                        onChange={(event) => setMatchDate(event.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="match-context">Competencia o contexto</Label>
                      <Input
                        id="match-context"
                        value={matchContext}
                        onChange={(event) => setMatchContext(event.target.value)}
                        placeholder="Ej. semifinal, amistoso, entrenamiento"
                        className="mt-2"
                      />
                    </div>
                  </div>
                </details>

                {materialState === 'upload-error' && (
                  <Alert className="border-destructive/25 bg-destructive/5">
                    <p className="font-semibold">No pudimos subir el video</p>
                    <p className="mt-1 text-muted-foreground">{materialError}</p>
                  </Alert>
                )}

                {materialState === 'uploading' && (
                  <div className="flex items-center gap-3 rounded-lg border bg-surface-subtle p-4" aria-live="polite">
                    <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold">Subiendo video…</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Puede demorar según el tamaño del archivo.</p>
                    </div>
                  </div>
                )}

                {materialState === 'ready' && uploadedDuringSetup && (
                  <Alert className="border-information/20 bg-information/5">
                    <p className="font-semibold">El video ya fue subido</p>
                    <p className="mt-1 text-muted-foreground">
                      Ya está disponible en Videos. El análisis se guardará después de que marques al menos un clip.
                    </p>
                  </Alert>
                )}

                <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-end">
                  {onCancel && <Button variant="ghost" onClick={onCancel}>Cancelar cambios</Button>}
                  {(materialState === 'file-ready' || materialState === 'upload-error') && (
                    <Button
                      onClick={() => void uploadVideo()}
                      disabled={!selectedTeam || !analysisName.trim()}
                      className="w-full sm:w-auto"
                    >
                      <Upload className="h-4 w-4" aria-hidden="true" />
                      {materialState === 'upload-error' ? 'Reintentar subida' : 'Subir video'}
                    </Button>
                  )}
                  {materialState === 'ready' && (
                    <Button
                      onClick={startAnalysis}
                      disabled={!selectedTeam || !analysisName.trim()}
                      className="w-full sm:w-auto"
                    >
                      {initialValue ? 'Aplicar cambios' : 'Empezar análisis'}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear equipo</DialogTitle>
            <DialogDescription>
              Ingresá lo mínimo necesario y después vas a volver al video seleccionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-team-name">Nombre del equipo</Label>
              <Input
                id="new-team-name"
                value={newTeamName}
                onChange={(event) => setNewTeamName(event.target.value)}
                placeholder="Ej. Olympia FC"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="new-team-city">Ciudad</Label>
              <Input
                id="new-team-city"
                value={newTeamCity}
                onChange={(event) => setNewTeamCity(event.target.value)}
                placeholder="Ej. Buenos Aires"
                className="mt-2"
              />
            </div>
            {createTeamError && (
              <Alert className="border-destructive/25 bg-destructive/5 text-destructive">
                {createTeamError}
              </Alert>
            )}
            <Button onClick={() => void createTeam()} disabled={creatingTeam} className="w-full">
              {creatingTeam ? (
                <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
              {creatingTeam ? 'Creando…' : 'Crear y continuar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
