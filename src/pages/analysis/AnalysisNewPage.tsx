import { type ChangeEvent, type DragEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Film, Folder, Info, Plus, Save, Upload, Video, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { analysisService, clipCollectionService, playerService, teamService, videoService } from '@/services/registry'
import type { ManualAnalysisClip, Player, Team } from '@/types'
import { ClipTimeline } from './ClipTimeline'

const DEFAULT_LABELS = ['Pick and Roll', 'Transición', 'Defensa', 'Tiro exterior']
const MAX_CLIP_DURATION_SECONDS = 30

function formatSeconds(value: number): string {
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function AnalysisNewPage() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const preservedVideoUrlRef = useRef('')
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [name, setName] = useState('')
  const [teamId, setTeamId] = useState('')
  const [rivalTeamId, setRivalTeamId] = useState('none')
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [clipStart, setClipStart] = useState('0')
  const [clipEnd, setClipEnd] = useState('0')
  const [clipLabel, setClipLabel] = useState(DEFAULT_LABELS[0])
  const [clips, setClips] = useState<ManualAnalysisClip[]>([])
  const [activeClipEnd, setActiveClipEnd] = useState<number | null>(null)
  const [isDraggingVideo, setIsDraggingVideo] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void Promise.all([teamService.list(), playerService.list()]).then(([teamData, playerData]) => {
      setTeams(teamData)
      setPlayers(playerData)
    })
  }, [])

  useEffect(() => {
    return () => {
      if (videoUrl && preservedVideoUrlRef.current !== videoUrl) URL.revokeObjectURL(videoUrl)
    }
  }, [videoUrl])

  useEffect(() => {
    setActiveClipEnd(null)
  }, [videoUrl])

  const selectVideoFile = (selectedFile: File) => {
    if (!selectedFile) return
    if (!selectedFile.type.startsWith('video/')) {
      toast.error('Selecciona un archivo de video')
      return
    }

    if (videoUrl) URL.revokeObjectURL(videoUrl)
    preservedVideoUrlRef.current = ''
    setActiveClipEnd(null)
    setCurrentTime(0)
    setDuration(0)
    setClipStart('0')
    setClipEnd('0')
    setFile(selectedFile)
    setVideoUrl(URL.createObjectURL(selectedFile))
  }

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) selectVideoFile(selectedFile)
  }

  const handleVideoDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDraggingVideo(false)
    const selectedFile = Array.from(event.dataTransfer.files).find((item) => item.type.startsWith('video/'))
    if (!selectedFile) {
      toast.error('Arrastra un archivo de video')
      return
    }
    selectVideoFile(selectedFile)
  }

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    )
  }

  const applyCurrentTime = (setter: (value: string) => void) => {
    const currentTime = videoRef.current?.currentTime ?? 0
    setter(String(Math.floor(currentTime)))
  }

  const seekVideo = (time: number) => {
    if (!videoRef.current) return
    setActiveClipEnd(null)
    videoRef.current.currentTime = time
    setCurrentTime(time)
  }

  const updateClipRange = (start: number, end: number) => {
    const normalize = (value: number) => String(Math.round(value * 10) / 10)
    const previousStart = Number(clipStart)
    const previousEnd = Number(clipEnd)
    setClipStart(normalize(start))
    setClipEnd(normalize(end))
    if (Math.abs(start - previousStart) > 0.01) seekVideo(start)
    else if (Math.abs(end - previousEnd) > 0.01) seekVideo(end)
  }

  const addClip = () => {
    const start = Number(clipStart)
    const end = Number(clipEnd)
    const label = clipLabel.trim()

    if (!videoUrl || duration <= 0) {
      toast.error('Carga un video antes de guardar clips')
      return
    }

    if (!label) {
      toast.error('Agrega una etiqueta')
      return
    }

    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0) {
      toast.error('El clip necesita tiempos válidos')
      return
    }

    if (end <= start) {
      toast.error('El fin tiene que ser mayor que el inicio')
      return
    }

    if (end > duration) {
      toast.error('El rango no puede superar la duración del video')
      return
    }

    if (end - start > MAX_CLIP_DURATION_SECONDS) {
      toast.error('Cada clip puede durar como máximo 30 segundos')
      return
    }

    setClips((current) => [
      ...current,
      {
        id: `clip-${crypto.randomUUID().slice(0, 8)}`,
        label,
        startSecond: start,
        endSecond: end,
      },
    ])
  }

  const playClip = (clip: ManualAnalysisClip) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = clip.startSecond
    setActiveClipEnd(clip.endSecond)
    void videoRef.current.play().catch(() => undefined)
  }

  const handleVideoTimeUpdate = () => {
    const video = videoRef.current
    if (!video) return
    setCurrentTime(video.currentTime)
    if (activeClipEnd != null && video.currentTime >= activeClipEnd) {
      video.pause()
      setActiveClipEnd(null)
    }
  }

  const removeClip = (clipId: string) => {
    setClips((current) => current.filter((clip) => clip.id !== clipId))
  }

  const saveAnalysis = async () => {
    const selectedTeam = teams.find((team) => team.id === teamId)
    const selectedRivalTeam = rivalTeamId === 'none'
      ? undefined
      : teams.find((team) => team.id === rivalTeamId)

    if (!name.trim() || !selectedTeam || !file) {
      toast.error('Completa nombre, equipo local y video')
      return
    }

    if (clips.length === 0) {
      toast.error('Agrega al menos un clip')
      return
    }

    try {
      setSaving(true)
      const uploadedVideo = await videoService.upload({
        title: name.trim(),
        teamId,
        description: selectedRivalTeam?.name,
        durationMs: Math.round(duration * 1000),
        file,
      })
      const collection = await clipCollectionService.create(uploadedVideo.id, {
        name: name.trim(),
        description: `Clips creados desde el análisis ${name.trim()}`,
      })
      await clipCollectionService.addClips(
        uploadedVideo.id,
        collection.id,
        clips.map((clip) => ({
          startMs: Math.round(clip.startSecond * 1000),
          endMs: Math.round(clip.endSecond * 1000),
        })),
      )
      preservedVideoUrlRef.current = videoUrl
      const session = await analysisService.saveManualAnalysis({
        name: name.trim(),
        video: { ...uploadedVideo, storageUrl: videoUrl || uploadedVideo.storageUrl },
        clipCollectionId: collection.id,
        team: selectedTeam,
        rivalTeam: selectedRivalTeam,
        teamId: selectedTeam.id,
        rivalTeamId: selectedRivalTeam?.id,
        playerIds: selectedPlayerIds,
        clips,
      })

      toast.success(`Análisis y ${clips.length} clips guardados`)
      navigate(`/analisis/${session.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo guardar el análisis')
    } finally {
      setSaving(false)
    }
  }

  const groupedClips = clips.reduce<Record<string, ManualAnalysisClip[]>>((groups, clip) => {
    groups[clip.label] = [...(groups[clip.label] ?? []), clip]
    return groups
  }, {})

  const relatedPlayers = selectedPlayerIds.length > 0
    ? players.filter((player) => selectedPlayerIds.includes(player.id))
    : []
  const localPlayers = teamId ? players.filter((player) => player.teamId === teamId) : players
  const visitorPlayers = rivalTeamId === 'none'
    ? []
    : players.filter((player) => player.teamId === rivalTeamId)
  const shownLocalPlayers = teamId ? localPlayers : players
  const previewStart = Number(clipStart)
  const previewEnd = Number(clipEnd)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Playground de análisis</p>
          <h1 className="text-2xl font-bold">Nuevo análisis</h1>
          <p className="text-sm text-muted-foreground">Carga un video, marca clips y organízalos por etiquetas.</p>
        </div>
        <Button onClick={() => void saveAnalysis()} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar análisis'}
        </Button>
      </div>

      <Card className="overflow-visible">
        <CardContent className="p-0">
          <div className="grid divide-y xl:grid-cols-[minmax(240px,1.6fr)_minmax(190px,1fr)_minmax(170px,.9fr)_minmax(170px,.9fr)_minmax(190px,1fr)] xl:divide-x xl:divide-y-0">
            <div className="p-4">
              <Label className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Análisis</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej: vs River Plate - 15/05/2025" className="mt-2" />
            </div>

            <div className="p-4">
              <Label className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Fuente de video</Label>
              <label
                className={`mt-2 flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition ${isDraggingVideo ? 'border-primary bg-primary/10' : 'bg-white hover:border-primary/30 hover:bg-accent'}`}
                onDragOver={(event) => {
                  event.preventDefault()
                  setIsDraggingVideo(true)
                }}
                onDragLeave={() => setIsDraggingVideo(false)}
                onDrop={handleVideoDrop}
              >
                <Upload className="h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0 truncate">{file ? file.name : 'Seleccionar archivo'}</span>
                <input type="file" accept="video/*" className="hidden" onChange={handleFile} />
              </label>
            </div>

            <div className="p-4">
              <Label className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Equipo local</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="p-4">
              <Label className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Equipo visitante</Label>
              <Select value={rivalTeamId} onValueChange={setRivalTeamId}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin rival</SelectItem>
                  {teams.filter((team) => team.id !== teamId).map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="relative p-4">
              <Label className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Plantel relacionado</Label>
              <details className="group mt-2">
                <summary className="flex h-10 cursor-pointer list-none items-center justify-between rounded-lg border bg-white px-3 text-sm font-medium shadow-sm transition hover:border-primary/30 hover:bg-accent">
                  <span>Jugadores</span>
                  <Badge variant="outline">{selectedPlayerIds.length}</Badge>
                </summary>
                <div className="absolute left-4 right-4 top-[76px] z-30 max-h-80 space-y-3 overflow-y-auto rounded-xl border bg-white p-3 text-sm shadow-xl xl:left-auto xl:w-72">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">Equipo local</p>
                    {shownLocalPlayers.length === 0 && (
                      <p className="text-xs text-muted-foreground">No hay jugadores para este equipo.</p>
                    )}
                    {shownLocalPlayers.map((player) => (
                      <label key={player.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
                        <input type="checkbox" checked={selectedPlayerIds.includes(player.id)} onChange={() => togglePlayer(player.id)} />
                        <span className="font-medium">{player.jerseyNumber ? `#${player.jerseyNumber}` : 'S/N'}</span>
                        <span className="truncate">{player.firstName} {player.lastName}</span>
                      </label>
                    ))}
                  </div>
                  {visitorPlayers.length > 0 && (
                    <div className="space-y-2 border-t pt-3">
                      <p className="text-xs font-semibold text-muted-foreground">Equipo visitante</p>
                      {visitorPlayers.map((player) => (
                        <label key={player.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
                          <input type="checkbox" checked={selectedPlayerIds.includes(player.id)} onChange={() => togglePlayer(player.id)} />
                          <span className="font-medium">{player.jerseyNumber ? `#${player.jerseyNumber}` : 'S/N'}</span>
                          <span className="truncate">{player.firstName} {player.lastName}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden border-foreground/10">
          <CardHeader className="flex flex-row items-center justify-between gap-4 border-b bg-muted/35 py-3">
            <div>
              <CardTitle className="text-sm">Monitor y línea de tiempo</CardTitle>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {file?.name ?? 'Sin fuente de video seleccionada'}
              </p>
            </div>
            <Badge variant="outline" className="shrink-0 bg-background">
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
              Borrador local
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="overflow-hidden rounded-xl border border-black/40 bg-[#151217] shadow-inner">
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="aspect-video w-full"
                  onLoadedMetadata={(event) => {
                    const videoDuration = event.currentTarget.duration
                    setDuration(videoDuration)
                    setClipStart('0')
                    setClipEnd(String(Math.round(Math.min(10, videoDuration) * 10) / 10))
                  }}
                  onTimeUpdate={handleVideoTimeUpdate}
                />
              ) : (
                <div className="flex aspect-video items-center justify-center text-white">
                  <div className="text-center">
                    <Video className="mx-auto mb-3 h-12 w-12 opacity-70" />
                    <p className="text-sm">Carga un video para empezar</p>
                  </div>
                </div>
              )}
            </div>
            <ClipTimeline
              videoUrl={videoUrl}
              duration={duration}
              currentTime={currentTime}
              rangeStart={Number.isFinite(previewStart) ? previewStart : 0}
              rangeEnd={Number.isFinite(previewEnd) ? previewEnd : 0}
              maxRangeSeconds={MAX_CLIP_DURATION_SECONDS}
              onSeek={seekVideo}
              onRangeChange={updateClipRange}
            />
          </CardContent>
        </Card>

        <Card className="overflow-hidden xl:sticky xl:top-20 xl:self-start">
          <CardHeader className="flex flex-row items-center justify-between gap-3 border-b py-3">
            <div>
              <CardTitle className="text-sm">Nuevo clip</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">Selecciona el rango directamente sobre el video.</p>
            </div>
            <Badge variant="secondary">{clips.length} clips</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 rounded-xl border border-dashed bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Rango seleccionado</p>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatSeconds(Number(clipStart) || 0)}–{formatSeconds(Number(clipEnd) || 0)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Inicio</Label>
                  <div className="mt-1 flex gap-1.5">
                    <Input type="number" min="0" value={clipStart} onChange={(event) => setClipStart(event.target.value)} />
                    <Button variant="outline" size="sm" onClick={() => applyCurrentTime(setClipStart)}>Actual</Button>
                  </div>
                </div>
                <div>
                  <Label>Fin</Label>
                  <div className="mt-1 flex gap-1.5">
                    <Input type="number" min="0" value={clipEnd} onChange={(event) => setClipEnd(event.target.value)} />
                    <Button variant="outline" size="sm" onClick={() => applyCurrentTime(setClipEnd)}>Actual</Button>
                  </div>
                </div>
              </div>
              <div>
                <Label>Etiqueta</Label>
                <Input list="analysis-labels" value={clipLabel} onChange={(event) => setClipLabel(event.target.value)} className="mt-1" />
                <datalist id="analysis-labels">{DEFAULT_LABELS.map((label) => <option key={label} value={label} />)}</datalist>
              </div>
              <Button className="w-full" onClick={addClip}><Plus className="h-4 w-4" /> Guardar clip</Button>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-4 w-4 shrink-0" /> Arrastra los extremos de la línea de tiempo o ajusta los valores con precisión.
              </p>
            </div>

            <div className="space-y-3 rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Biblioteca</p>
                <span className="text-xs text-muted-foreground">{Object.keys(groupedClips).length} etiquetas</span>
              </div>
              {Object.entries(groupedClips).length === 0 && (
                <div className="rounded-lg bg-muted/40 px-3 py-5 text-center">
                  <Film className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Todavía no hay clips marcados.</p>
                </div>
              )}
              {Object.entries(groupedClips).map(([label, labelClips]) => (
                <div key={label} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold"><Folder className="h-4 w-4" /> {label}</div>
                  {labelClips.map((clip) => (
                    <div key={clip.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                      <button type="button" className="flex flex-1 items-center gap-2 text-left hover:text-primary" onClick={() => playClip(clip)}>
                        <Film className="h-4 w-4 text-muted-foreground" />
                        <span>Clip {formatSeconds(clip.startSecond)}-{formatSeconds(clip.endSecond)}</span>
                      </button>
                      <Button variant="ghost" size="sm" onClick={() => removeClip(clip.id)} aria-label="Quitar clip">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {relatedPlayers.length > 0 && (
              <div className="space-y-2 rounded-lg bg-accent p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Jugadores vinculados</p>
                <div className="flex flex-wrap gap-2">
                  {relatedPlayers.map((player) => (
                    <span key={player.id} className="rounded-full border bg-white px-2 py-1 text-foreground">
                      {player.jerseyNumber ? `#${player.jerseyNumber} ` : ''}{player.firstName} {player.lastName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
