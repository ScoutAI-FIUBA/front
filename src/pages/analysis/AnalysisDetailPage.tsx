import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ChevronDown,
  CircleAlert,
  FolderOpen,
  LoaderCircle,
  Play,
  Target,
  TriangleAlert,
  UserRound,
  VideoOff,
} from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Progress } from '@/components/ui/progress'
import { StatusIndicator } from '@/components/ui/status-indicator'
import { cn, formatDate } from '@/lib/utils'
import { analysisService, isMockApiEnabled, videoService } from '@/services/registry'
import type { AnalysisDetail, AnalysisStatus, GameEvent } from '@/types'

type LoadState = 'loading' | 'success' | 'error' | 'not-found'

const statusLabels: Record<AnalysisStatus, string> = {
  pending: 'Pendiente',
  processing: 'En proceso',
  completed: 'Completado',
}

function formatSeconds(value: number): string {
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function ReviewStatus({ status }: { status: AnalysisStatus }) {
  if (status === 'completed') {
    return <StatusIndicator state="success">{statusLabels[status]}</StatusIndicator>
  }

  if (status === 'processing') {
    return <StatusIndicator state="information">{statusLabels[status]}</StatusIndicator>
  }

  return <StatusIndicator>{statusLabels[status]}</StatusIndicator>
}

function eventRange(event: GameEvent): { startSecond: number; endSecond: number } | null {
  const { startSecond, endSecond } = event.metadata
  if (typeof startSecond !== 'number' || typeof endSecond !== 'number' || endSecond <= startSecond) {
    return null
  }
  return { startSecond, endSecond }
}

export function AnalysisDetailPage() {
  const { id } = useParams<{ id: string }>()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [detail, setDetail] = useState<AnalysisDetail | null>(null)
  const [activeClipEnd, setActiveClipEnd] = useState<number | null>(null)
  const [videoAvailable, setVideoAvailable] = useState(true)
  const videoSource = detail?.video.storageUrl ?? ''

  const loadDetail = useCallback(async () => {
    setActiveClipEnd(null)
    setDetail(null)

    if (!id) {
      setLoadState('not-found')
      return
    }

    if (!isMockApiEnabled) {
      setLoadState('not-found')
      return
    }

    setLoadState('loading')

    try {
      let data = await analysisService.getBySessionId(id)
      if (!data) {
        const video = await videoService.getById(id)
        if (video?.matchId) data = await analysisService.getByMatchId(video.matchId)
      }

      if (!data) {
        setLoadState('not-found')
        return
      }

      setDetail(data)
      setVideoAvailable(true)
      setLoadState('success')
    } catch {
      setLoadState('error')
    }
  }, [id])

  useEffect(() => {
    void loadDetail()
  }, [loadDetail])

  useEffect(() => {
    setActiveClipEnd(null)
  }, [videoSource])

  useEffect(() => {
    if (!videoAvailable) setActiveClipEnd(null)
  }, [videoAvailable])

  const playRange = (startSecond: number, endSecond: number) => {
    if (!videoAvailable || !videoRef.current) return
    videoRef.current.currentTime = startSecond
    setActiveClipEnd(endSecond)
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

  if (loadState === 'loading') {
    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-6">
        <Link to="/revision-manual" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a Análisis
        </Link>
        <section
          className="flex min-h-48 items-center gap-3 border-y py-10 text-sm text-muted-foreground"
          aria-live="polite"
          aria-busy="true"
        >
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          Cargando revisión…
        </section>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-6">
        <Link to="/revision-manual" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a Análisis
        </Link>
        <Alert className="flex max-w-2xl flex-col gap-4 border-destructive/25 bg-destructive/5 p-5 sm:flex-row sm:items-center">
          <CircleAlert className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">No pudimos cargar esta revisión</p>
            <p className="mt-1 text-muted-foreground">
              Revisá la conexión y volvé a intentarlo sin salir de este análisis.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadDetail()}>
            Reintentar
          </Button>
        </Alert>
      </div>
    )
  }

  if (loadState === 'not-found' || !detail) {
    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-6">
        <Link to="/revision-manual" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a Análisis
        </Link>
        <EmptyState
          icon={<CircleAlert className="h-5 w-5" aria-hidden="true" />}
          title="No encontramos este análisis"
          description={isMockApiEnabled ? 'Es posible que el enlace ya no sea válido o que el análisis no esté disponible.' : 'Las revisiones manuales reales se guardan como colecciones de clips.'}
          action={(
            <Button asChild variant="outline">
              <Link to="/revision-manual">Ver todas las revisiones</Link>
            </Button>
          )}
        />
      </div>
    )
  }

  const { session, match, video, homeTeam, awayTeam, manualAnalysis, events, detectedPlayers } = detail
  const clips = manualAnalysis?.clips ?? []
  const videoPlayable = videoAvailable && Boolean(video.storageUrl)
  const reviewTitle = manualAnalysis?.name || match.title || video.title || `Análisis ${session.sessionCode}`
  const matchLabel = awayTeam ? `${homeTeam.name} vs ${awayTeam.name}` : homeTeam.name
  const momentCount = clips.length > 0 ? clips.length : events.length
  const momentsTitle = clips.length > 0 ? 'Clips guardados' : 'Eventos detectados'

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-8">
      <Link to="/revision-manual" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a Análisis
      </Link>

      <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{reviewTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{matchLabel} · {video.title}</p>
          <p className="mt-2 text-xs text-muted-foreground">Sesión #{session.sessionCode}</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <ReviewStatus status={session.status} />
          {manualAnalysis?.clipCollectionId && (
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <Link to={`/videos/${video.id}/colecciones/${manualAnalysis.clipCollectionId}`}>
                <FolderOpen className="h-4 w-4" aria-hidden="true" /> Ver colección
              </Link>
            </Button>
          )}
        </div>
      </header>

      {session.status === 'processing' && (
        <section className="rounded-lg border bg-surface p-5 sm:p-6" aria-labelledby="processing-title">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="processing-title" className="font-semibold text-foreground">Análisis en proceso</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Los resultados pueden cambiar hasta que termine el procesamiento.
              </p>
            </div>
            <span className="text-sm font-semibold text-primary">{session.progressPercent}% procesado</span>
          </div>
          <Progress
            value={session.progressPercent}
            className="mt-4"
            aria-label={`Progreso del análisis: ${session.progressPercent}%`}
          />
          <p className="mt-2 text-sm text-muted-foreground">Tiempo restante: {session.remainingTime}</p>
        </section>
      )}

      {session.status === 'pending' && (
        <Alert className="border-border bg-surface p-5">
          <p className="font-semibold text-foreground">El análisis está pendiente</p>
          <p className="mt-1 text-muted-foreground">
            El procesamiento todavía no comenzó. Podés volver más tarde para consultar su estado.
          </p>
        </Alert>
      )}

      {!videoPlayable && (
        <Alert className="flex items-start gap-3 border-border bg-surface p-5">
          <VideoOff className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">Video no disponible para reproducción</p>
            <p className="mt-1 text-muted-foreground">
              Podés revisar los momentos y la información guardada, pero no reproducir este material desde la sesión actual.
            </p>
          </div>
        </Alert>
      )}

      <div className={cn('grid gap-6', videoPlayable && 'lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]')}>
        {videoPlayable && (
          <section className="overflow-hidden rounded-lg border bg-black" aria-label={`Video: ${video.title}`}>
            <video
              ref={videoRef}
              src={video.storageUrl}
              controls
              className="aspect-video w-full bg-black"
              onError={() => {
                setActiveClipEnd(null)
                setVideoAvailable(false)
              }}
              onTimeUpdate={handleVideoTimeUpdate}
            />
            <div className="border-t border-white/10 bg-black px-4 py-3 text-sm text-white/75">
              {video.title}
            </div>
          </section>
        )}

        <section className="rounded-lg border bg-surface p-5 sm:p-6" aria-labelledby="moments-title">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="moments-title" className="text-lg font-semibold text-foreground">{momentsTitle}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {clips.length > 0 ? 'Seleccioná un clip para reproducir su rango.' : 'Resultados disponibles en este análisis.'}
              </p>
            </div>
            <span className="rounded-full bg-primary-subtle px-2.5 py-1 text-xs font-semibold text-primary">
              {momentCount}
            </span>
          </div>

          {momentCount === 0 && (
            <div className="py-3 text-center sm:py-4">
              <Target className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-foreground">Todavía no hay momentos disponibles</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                {session.status === 'completed'
                  ? 'Este análisis no tiene clips ni eventos para revisar.'
                  : 'Los momentos aparecerán cuando el procesamiento produzca resultados.'}
              </p>
            </div>
          )}

          {clips.length > 0 && (
            <div className="mt-5 divide-y border-y">
              {clips.map((clip) => {
                const content = (
                  <>
                    <span className="font-medium text-foreground">{clip.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatSeconds(clip.startSecond)}–{formatSeconds(clip.endSecond)}
                    </span>
                  </>
                )

                return videoPlayable ? (
                  <button
                    key={clip.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-1 py-4 text-left text-sm transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:px-3"
                    onClick={() => playRange(clip.startSecond, clip.endSecond)}
                  >
                    <span className="flex min-w-0 flex-col gap-1">{content}</span>
                    <Play className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  </button>
                ) : (
                  <div key={clip.id} className="flex items-center justify-between gap-4 px-1 py-4 text-sm sm:px-3">
                    <span className="flex min-w-0 flex-col gap-1">{content}</span>
                  </div>
                )
              })}
            </div>
          )}

          {clips.length === 0 && events.length > 0 && (
            <div className="mt-5 divide-y border-y">
              {events.map((event) => {
                const label = typeof event.metadata.label === 'string' ? event.metadata.label : event.eventType
                const minute = typeof event.metadata.minute === 'string' ? event.metadata.minute : null
                const playerNumber = typeof event.metadata.playerNumber === 'string' || typeof event.metadata.playerNumber === 'number'
                  ? String(event.metadata.playerNumber)
                  : null
                const range = eventRange(event)
                const canPlay = videoPlayable && range !== null
                const Icon = event.eventType === 'foul' ? TriangleAlert : Target
                const content = (
                  <>
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground">{label}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Q{event.quarter}
                        {minute ? ` · Min ${minute}` : ''}
                        {playerNumber ? ` · Jugador #${playerNumber}` : ''}
                      </span>
                    </span>
                  </>
                )

                return canPlay ? (
                  <button
                    key={event.id}
                    type="button"
                    className="flex w-full items-start gap-3 px-1 py-4 text-left text-sm transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:px-3"
                    onClick={() => playRange(range.startSecond, range.endSecond)}
                  >
                    {content}
                    <Play className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  </button>
                ) : (
                  <div key={event.id} className="flex items-start gap-3 px-1 py-4 text-sm sm:px-3">
                    {content}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <section className="space-y-3" aria-label="Información secundaria del análisis">
        <details className="group rounded-lg border bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30">
            Información del análisis
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="grid gap-6 border-t px-5 py-5 text-sm sm:grid-cols-2">
            <div>
              <h2 className="font-semibold text-foreground">Encuentro</h2>
              <p className="mt-2 text-foreground">{match.title ?? matchLabel}</p>
              {match.competition && <p className="mt-1 text-muted-foreground">{match.competition}</p>}
              <dl className="mt-4 space-y-2 text-muted-foreground">
                <div className="flex justify-between gap-4"><dt>Local</dt><dd className="text-right text-foreground">{homeTeam.name}</dd></div>
                <div className="flex justify-between gap-4"><dt>Visitante</dt><dd className="text-right text-foreground">{awayTeam?.name ?? 'Sin rival seleccionado'}</dd></div>
              </dl>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Material</h2>
              <dl className="mt-2 space-y-2 text-muted-foreground">
                <div className="flex justify-between gap-4"><dt>Video</dt><dd className="text-right text-foreground">{video.title}</dd></div>
                <div className="flex justify-between gap-4"><dt>Sesión</dt><dd className="text-right text-foreground">#{session.sessionCode}</dd></div>
                {manualAnalysis?.savedAt && (
                  <div className="flex justify-between gap-4"><dt>Guardado</dt><dd className="text-right text-foreground">{formatDate(manualAnalysis.savedAt)}</dd></div>
                )}
              </dl>
            </div>
          </div>
        </details>

        {detectedPlayers.length > 0 && (
          <details className="group rounded-lg border bg-surface">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30">
              <span className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Jugadores detectados
                <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs text-muted-foreground">{detectedPlayers.length}</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="border-t px-5 py-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {detectedPlayers.map((player) => (
                  <div key={player.playerId} className="flex items-center gap-3 rounded-lg border bg-background p-3 text-sm">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-xs font-semibold text-primary">
                      {player.jerseyNumber || '—'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{player.name}</p>
                      <p className="text-xs text-muted-foreground">{player.position}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </details>
        )}
      </section>
    </div>
  )
}

