import { type ChangeEvent, type DragEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Folder, Info, Plus, Save, Upload, Video } from 'lucide-react'
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
import { analysisService, playerService, teamService, videoService } from '@/services/registry'
import type { ManualAnalysisClip, Player, Team } from '@/types'

const DEFAULT_LABELS = ['Pick and Roll', 'Transición', 'Defensa', 'Tiro exterior']

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

  const addClip = () => {
    const start = Number(clipStart)
    const end = Number(clipEnd)
    const label = clipLabel.trim()

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

    setClips((current) => [
      ...current,
      {
        id: `clip-${crypto.randomUUID().slice(0, 8)}`,
        label,
        startSecond: start,
        endSecond: end,
      },
    ])
    setClipStart(String(end))
    setClipEnd(String(end))
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
        file,
      })
      preservedVideoUrlRef.current = videoUrl
      const session = await analysisService.saveManualAnalysis({
        name: name.trim(),
        video: { ...uploadedVideo, storageUrl: videoUrl || uploadedVideo.storageUrl },
        team: selectedTeam,
        rivalTeam: selectedRivalTeam,
        teamId: selectedTeam.id,
        rivalTeamId: selectedRivalTeam?.id,
        playerIds: selectedPlayerIds,
        clips,
      })

      toast.success('Análisis guardado para demo')
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
  const previewStart = Number(clipStart)
  const previewEnd = Number(clipEnd)
  const canPreviewRange = duration > 0
    && Number.isFinite(previewStart)
    && Number.isFinite(previewEnd)
    && previewStart >= 0
    && previewEnd > previewStart
  const previewLeft = canPreviewRange ? Math.min((previewStart / duration) * 100, 100) : 0
  const previewWidth = canPreviewRange ? Math.min(((previewEnd - previewStart) / duration) * 100, 100 - previewLeft) : 0
  const currentMarkerLeft = duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Playground de análisis</p>
          <h1 className="text-2xl font-bold">Nuevo análisis</h1>
          <p className="text-sm text-muted-foreground">Carga un video, marca clips y guárdalos como una demo local.</p>
        </div>
        <Button onClick={() => void saveAnalysis()} disabled={saving}>
          <Save className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar análisis'}
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle className="text-base">1. Datos del análisis</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej: vs River Plate - 15/05/2025" className="mt-1" />
            </div>
            <div>
              <Label>Equipo local</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar equipo" /></SelectTrigger>
                <SelectContent>{teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Equipo visitante opcional</Label>
              <Select value={rivalTeamId} onValueChange={setRivalTeamId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar rival" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin rival</SelectItem>
                  {teams.filter((team) => team.id !== teamId).map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
          <CardHeader><CardTitle className="text-base">2. Video</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition ${isDraggingVideo ? 'border-primary bg-primary/10' : 'border-primary/30 bg-accent/50'}`}
              onDragOver={(event) => {
                event.preventDefault()
                setIsDraggingVideo(true)
              }}
              onDragLeave={() => setIsDraggingVideo(false)}
              onDrop={handleVideoDrop}
            >
              <Upload className="mb-3 h-8 w-8 text-primary/60" />
              <span className="text-sm font-medium">Subir video</span>
              <span className="mt-1 text-xs text-muted-foreground">Arrastra o selecciona 1 video por análisis</span>
              <input type="file" accept="video/*" className="hidden" onChange={handleFile} />
            </label>
            <p className="truncate text-xs text-muted-foreground">{file ? file.name : 'Sin archivo seleccionado'}</p>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">3. Jugadores relacionados</CardTitle>
            <Badge variant="outline">{selectedPlayerIds.length}</Badge>
          </CardHeader>
          <CardContent className="grid max-h-52 gap-2 overflow-y-auto sm:grid-cols-2">
            {players.map((player) => (
              <label key={player.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                <input type="checkbox" checked={selectedPlayerIds.includes(player.id)} onChange={() => togglePlayer(player.id)} />
                <span className="font-medium">{player.jerseyNumber ?? '--'}</span>
                <span>{player.firstName} {player.lastName}</span>
              </label>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 rounded-lg border bg-white p-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 text-primary" /> Todo queda local hasta presionar Guardar análisis.
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader><CardTitle className="text-base">Video</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-hidden rounded-lg border bg-black">
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="aspect-video w-full"
                  onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
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
            <div className="space-y-2">
              <div className="relative h-8 overflow-hidden rounded-md border bg-accent">
                {canPreviewRange && (
                  <div
                    className="absolute top-0 h-full rounded-sm border border-primary bg-primary/20"
                    style={{ left: `${previewLeft}%`, width: `${Math.max(previewWidth, 2)}%` }}
                    title={`Rango nuevo ${formatSeconds(previewStart)}-${formatSeconds(previewEnd)}`}
                  />
                )}
                {clips.map((clip) => {
                  const left = duration > 0 ? (clip.startSecond / duration) * 100 : 0
                  const width = duration > 0 ? ((clip.endSecond - clip.startSecond) / duration) * 100 : 0
                  return (
                    <div
                      key={clip.id}
                      className="absolute top-0 h-full rounded-sm bg-primary/60"
                      style={{ left: `${Math.min(left, 100)}%`, width: `${Math.max(width, 2)}%` }}
                      title={`${clip.label} ${formatSeconds(clip.startSecond)}-${formatSeconds(clip.endSecond)}`}
                    />
                  )
                })}
                {duration > 0 && (
                  <div
                    className="absolute top-0 h-full w-0.5 bg-primary"
                    style={{ left: `${currentMarkerLeft}%` }}
                    title={`Tiempo actual ${formatSeconds(currentTime)}`}
                  />
                )}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>00:00</span>
                <span>Actual: {formatSeconds(currentTime)}</span>
                <span>{duration > 0 ? formatSeconds(duration) : '00:00'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader><CardTitle className="text-base">Etiquetas y clips</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 rounded-lg border p-3">
              {Object.entries(groupedClips).length === 0 && (
                <p className="text-sm text-muted-foreground">Todavía no hay clips marcados.</p>
              )}
              {Object.entries(groupedClips).map(([label, labelClips]) => (
                <div key={label} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold"><Folder className="h-4 w-4" /> {label}</div>
                  {labelClips.map((clip) => (
                    <div key={clip.id} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                      <button type="button" className="flex-1 text-left hover:text-primary" onClick={() => playClip(clip)}>
                        {formatSeconds(clip.startSecond)}-{formatSeconds(clip.endSecond)}
                      </button>
                      <Button variant="ghost" size="sm" onClick={() => removeClip(clip.id)}>Quitar</Button>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="space-y-3 rounded-lg border border-dashed p-3">
              <p className="text-sm font-semibold">Marcar clip</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Inicio</Label>
                  <div className="mt-1 flex gap-2">
                    <Input type="number" min="0" value={clipStart} onChange={(event) => setClipStart(event.target.value)} />
                    <Button variant="outline" onClick={() => applyCurrentTime(setClipStart)}>Usar actual</Button>
                  </div>
                </div>
                <div>
                  <Label>Fin</Label>
                  <div className="mt-1 flex gap-2">
                    <Input type="number" min="0" value={clipEnd} onChange={(event) => setClipEnd(event.target.value)} />
                    <Button variant="outline" onClick={() => applyCurrentTime(setClipEnd)}>Usar actual</Button>
                  </div>
                </div>
              </div>
              <div>
                <Label>Etiqueta</Label>
                <Input list="analysis-labels" value={clipLabel} onChange={(event) => setClipLabel(event.target.value)} className="mt-1" />
                <datalist id="analysis-labels">{DEFAULT_LABELS.map((label) => <option key={label} value={label} />)}</datalist>
              </div>
              <Button className="w-full" onClick={addClip}><Plus className="h-4 w-4" /> Marcar clip</Button>
            </div>

            {relatedPlayers.length > 0 && (
              <div className="space-y-2 rounded-lg bg-accent p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Jugadores vinculados</p>
                <div className="flex flex-wrap gap-2">
                  {relatedPlayers.map((player) => (
                    <span key={player.id} className="rounded-full border bg-white px-2 py-1 text-foreground">
                      {player.jerseyNumber ? `${player.jerseyNumber} · ` : ''}{player.firstName} {player.lastName}
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
