import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, Play, Target, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { analysisService, videoService } from '@/services/registry'
import type { AnalysisDetail } from '@/types'

function formatSeconds(value: number): string {
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [detail, setDetail] = useState<AnalysisDetail | null>(null)
  const [activeClipEnd, setActiveClipEnd] = useState<number | null>(null)
  const [videoAvailable, setVideoAvailable] = useState(true)
  const videoSource = detail?.video.storageUrl ?? ''

  useEffect(() => {
    setActiveClipEnd(null)
    if (!id) return
    void (async () => {
      let data = await analysisService.getBySessionId(id)
      if (!data) {
        const video = await videoService.getById(id)
        if (video?.matchId) data = await analysisService.getByMatchId(video.matchId)
      }
      setDetail(data)
      setVideoAvailable(true)
    })()
  }, [id])

  useEffect(() => {
    setActiveClipEnd(null)
  }, [videoSource])

  useEffect(() => {
    if (!videoAvailable) setActiveClipEnd(null)
  }, [videoAvailable])

  if (!detail) {
    return <p className="text-muted-foreground">Cargando análisis...</p>
  }

  const { session, match, video, homeTeam, awayTeam, manualAnalysis, events, detectedPlayers } = detail
  const clips = manualAnalysis?.clips ?? []
  const videoPlayable = videoAvailable && Boolean(video.storageUrl)

  const playClip = (startSecond: number, endSecond?: number) => {
    if (!videoPlayable || !videoRef.current) return
    videoRef.current.currentTime = startSecond
    setActiveClipEnd(endSecond ?? null)
    void videoRef.current.play().catch(() => undefined)
  }

  const handleVideoTimeUpdate = () => {
    const player = videoRef.current
    if (!player || activeClipEnd == null) return
    if (player.currentTime >= activeClipEnd) {
      player.pause()
      setActiveClipEnd(null)
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/analisis" className="flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a Análisis
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Detalle de análisis</h1>
          <p className="text-sm text-muted-foreground">ID de Sesión: #{session.sessionCode}</p>
        </div>
        <div className="flex gap-2">
          <Badge className="bg-accent text-primary">● Análisis en proceso</Badge>
          <Button variant="outline" size="sm">Exportar Datos</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="relative overflow-hidden rounded-t-lg bg-black p-0 text-white">
              {videoPlayable ? (
                <video
                  ref={videoRef}
                  src={video.storageUrl}
                  controls
                  className="aspect-video w-full"
                  onError={() => {
                    setActiveClipEnd(null)
                    setVideoAvailable(false)
                  }}
                  onTimeUpdate={handleVideoTimeUpdate}
                />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 p-8">
                  <div className="text-center">
                    <Play className="mx-auto mb-4 h-16 w-16 opacity-80" />
                    <p className="text-lg font-medium">Vista previa del video</p>
                    <p className="text-sm uppercase tracking-widest opacity-70">Video no disponible en esta sesion</p>
                  </div>
                </div>
              )}
            </CardContent>
            <div className="px-4 pb-4">
              <Progress value={session.progressPercent} className="mb-2" />
              <p className="text-xs text-muted-foreground">{video.title}</p>
            </div>
          </Card>

          {clips.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Clips guardados</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {!videoPlayable && (
                  <p className="text-sm text-muted-foreground">El video no está disponible para reproducir estos clips.</p>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  {clips.map((clip) => (
                    <button
                      key={clip.id}
                      type="button"
                      className={`rounded-lg border p-3 text-left text-sm transition ${videoPlayable ? 'hover:border-primary hover:bg-accent' : 'cursor-not-allowed opacity-70'}`}
                      disabled={!videoPlayable}
                      onClick={() => playClip(clip.startSecond, clip.endSecond)}
                    >
                      <p className="font-medium">{clip.label}</p>
                      <p className="text-xs text-muted-foreground">{formatSeconds(clip.startSecond)} - {formatSeconds(clip.endSecond)}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row justify-between">
              <CardTitle className="text-base">Tiempo procesado</CardTitle>
              <span className="text-sm font-medium text-primary">{session.progressPercent}% Completado</span>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div><p className="text-muted-foreground">Minutos Totales</p><p className="font-semibold">{session.totalMinutes}m 00s</p></div>
              <div><p className="text-muted-foreground">Frames Analizados</p><p className="font-semibold">{session.framesAnalyzed.toLocaleString()}</p></div>
              <div><p className="text-muted-foreground">Estado</p><p className="font-semibold capitalize">{session.status}</p></div>
              <div><p className="text-muted-foreground">Tiempo Restante</p><p className="font-semibold">{session.remainingTime}</p></div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Información del Encuentro</CardTitle></CardHeader>
            <CardContent>
              <p className="font-semibold">{match.title ?? `${homeTeam.name} vs rival`}</p>
              <p className="text-sm text-muted-foreground">{match.competition}</p>
              <p className="mt-2 text-xs text-muted-foreground">Local: {homeTeam.name}</p>
              <p className="text-xs text-muted-foreground">Visitante: {awayTeam?.name ?? 'Sin rival seleccionado'}</p>
              <p className="mt-2 text-xs text-muted-foreground">Video: {video.title}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row justify-between">
              <CardTitle className="text-sm">Jugadores detectados</CardTitle>
              <Badge>{detectedPlayers.length}</Badge>
            </CardHeader>
            <CardContent className="max-h-48 space-y-2 overflow-y-auto">
              {detectedPlayers.map((p) => (
                <div key={p.playerId} className="flex items-center gap-2 text-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs text-white">{p.jerseyNumber}</span>
                  <div className="flex-1">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.position} / Heatmap: {p.heatmapPercent}%</p>
                  </div>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row justify-between">
              <CardTitle className="text-sm">Eventos detectados</CardTitle>
              <Badge>{events.length}</Badge>
            </CardHeader>
            <CardContent className="max-h-64 space-y-2 overflow-y-auto">
              {events.map((e) => {
                const label = (e.metadata.label as string) ?? e.eventType
                const minute = e.metadata.minute as string
                const Icon = e.eventType === 'foul' ? TriangleAlert : e.eventType === 'pass' ? Target : Target
                return (
                  <div key={e.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Icon className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">Q{e.quarter} · Min {minute} / Jugador #{(e.metadata.playerNumber as number) ?? '—'}</p>
                      </div>
                      {e.metadata.xp != null && (
                        <Badge variant="outline" className="ml-auto">XP: {String(e.metadata.xp)}</Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

