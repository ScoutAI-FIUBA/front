import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Film, Folder, Info, Pencil, Plus, Save, Video, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { analysisService, clipCollectionService } from '@/services/registry'
import type { ManualAnalysisClip } from '@/types'
import { ClipTimeline } from './ClipTimeline'
import { AnalysisSetup, type PreparedAnalysisSetup } from './AnalysisSetup'

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
  const ownedVideoUrlRef = useRef('')
  const [preparedSetup, setPreparedSetup] = useState<PreparedAnalysisSetup | null>(null)
  const [editingSetup, setEditingSetup] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [clipStart, setClipStart] = useState('0')
  const [clipEnd, setClipEnd] = useState('0')
  const [clipLabel, setClipLabel] = useState(DEFAULT_LABELS[0])
  const [clips, setClips] = useState<ManualAnalysisClip[]>([])
  const [activeClipEnd, setActiveClipEnd] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    return () => {
      if (ownedVideoUrlRef.current) URL.revokeObjectURL(ownedVideoUrlRef.current)
    }
  }, [])

  useEffect(() => {
    setActiveClipEnd(null)
  }, [videoUrl])

  useEffect(() => {
    if (!preparedSetup?.uploadedDuringSetup) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [preparedSetup?.uploadedDuringSetup])

  const handlePreparedSetup = (nextSetup: PreparedAnalysisSetup) => {
    const materialChanged = preparedSetup?.video.id !== nextSetup.video.id
    if (materialChanged && clips.length > 0) {
      toast.error('El video no puede cambiarse porque ya hay clips marcados')
      return
    }

    if (materialChanged) {
      if (ownedVideoUrlRef.current) URL.revokeObjectURL(ownedVideoUrlRef.current)
      ownedVideoUrlRef.current = nextSetup.playbackUrl.startsWith('blob:')
        ? nextSetup.playbackUrl
        : ''
      setVideoUrl(nextSetup.playbackUrl)
      setDuration(nextSetup.durationSeconds)
      setCurrentTime(0)
      setClipStart('0')
      setClipEnd(String(Math.round(Math.min(10, nextSetup.durationSeconds) * 10) / 10))
      setActiveClipEnd(null)
      setClips([])
    }

    setPreparedSetup(nextSetup)
    setEditingSetup(false)
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
    if (!preparedSetup) {
      toast.error('Prepará el material antes de guardar el análisis')
      return
    }

    if (clips.length === 0) {
      toast.error('Agrega al menos un clip')
      return
    }

    try {
      setSaving(true)
      const collection = await clipCollectionService.create(preparedSetup.video.id, {
        name: preparedSetup.analysisName,
        description: `Clips creados desde el análisis ${preparedSetup.analysisName}`,
      })
      await clipCollectionService.addClips(
        preparedSetup.video.id,
        collection.id,
        clips.map((clip) => ({
          startMs: Math.round(clip.startSecond * 1000),
          endMs: Math.round(clip.endSecond * 1000),
        })),
      )
      // Setup intentionally defers player association while preserving the
      // existing contract boundary for future workspace player tooling.
      const relatedPlayerIds: string[] = []
      const session = await analysisService.saveManualAnalysis({
        name: preparedSetup.analysisName,
        video: { ...preparedSetup.video, storageUrl: videoUrl || preparedSetup.video.storageUrl },
        clipCollectionId: collection.id,
        team: preparedSetup.team,
        rivalTeam: preparedSetup.rivalTeam,
        teamId: preparedSetup.team.id,
        rivalTeamId: preparedSetup.rivalTeam?.id,
        playerIds: relatedPlayerIds,
        clips,
      })

      // The mock persistence layer keeps the local blob URL as the playable
      // source for this browser session. Transfer its lifetime to the saved
      // analysis detail instead of revoking it as this page unmounts.
      if (ownedVideoUrlRef.current === videoUrl) ownedVideoUrlRef.current = ''
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
  const previewStart = Number(clipStart)
  const previewEnd = Number(clipEnd)

  if (!preparedSetup || editingSetup) {
    return (
      <AnalysisSetup
        initialValue={preparedSetup}
        lockMaterial={clips.length > 0}
        onStart={handlePreparedSetup}
        onCancel={preparedSetup ? () => setEditingSetup(false) : undefined}
      />
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Playground de análisis</p>
          <h1 className="text-2xl font-bold">Nuevo análisis</h1>
          <p className="text-sm text-muted-foreground">
            {preparedSetup.analysisName} · {preparedSetup.team.name}
          </p>
          {preparedSetup.uploadedDuringSetup && (
            <p className="mt-1 text-xs font-medium text-information">
              El video ya fue subido. El análisis todavía no está guardado.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditingSetup(true)} disabled={saving}>
            <Pencil className="h-4 w-4" /> Editar preparación
          </Button>
          <Button onClick={() => void saveAnalysis()} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? 'Guardando...' : 'Guardar análisis'}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="overflow-hidden border-foreground/10">
          <CardHeader className="flex flex-row items-center justify-between gap-4 border-b bg-muted/35 py-3">
            <div>
              <CardTitle className="text-sm">Monitor y línea de tiempo</CardTitle>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {preparedSetup.sourceFile?.name ?? preparedSetup.video.title}
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

          </CardContent>
        </Card>
      </div>
    </div>
  )
}
