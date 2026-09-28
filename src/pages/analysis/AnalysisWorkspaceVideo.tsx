import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { CircleAlert, LoaderCircle, RefreshCw, VideoOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getVideoByIdForTeam } from '@/services/registry'
import type { Video } from '@/types'

export type AnalysisWorkspaceVideoState = 'loading' | 'ready' | 'error'

export interface AnalysisWorkspaceVideoHandle {
  seekTo: (seconds: number) => boolean
}

interface AnalysisWorkspaceVideoProps {
  video: Video | null
  videoId: string
  teamId: string
  title: string
  onStateChange?: (state: AnalysisWorkspaceVideoState) => void
}

function usablePlayback(video: Video | null): video is Video {
  return Boolean(video?.storageUrl)
}

export const AnalysisWorkspaceVideo = forwardRef<
  AnalysisWorkspaceVideoHandle,
  AnalysisWorkspaceVideoProps
>(function AnalysisWorkspaceVideo({ video, videoId, teamId, title, onStateChange }, ref) {
  const initialVideo = usablePlayback(video) ? video : null
  const [state, setState] = useState<AnalysisWorkspaceVideoState>(initialVideo ? 'ready' : 'loading')
  const [playbackVideo, setPlaybackVideo] = useState<Video | null>(initialVideo)
  const [attempt, setAttempt] = useState(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const restoreTimeRef = useRef(0)

  useImperativeHandle(ref, () => ({
    seekTo(seconds) {
      const element = videoRef.current
      if (!element || !Number.isFinite(seconds) || seconds < 0) return false
      element.currentTime = seconds
      void element.play().catch(() => undefined)
      return true
    },
  }), [])

  useEffect(() => {
    onStateChange?.(state)
  }, [onStateChange, state])

  useEffect(() => {
    let active = true

    if (attempt === 0 && initialVideo) {
      setPlaybackVideo(initialVideo)
      setState('ready')
      return () => {
        active = false
      }
    }

    setState('loading')
    void getVideoByIdForTeam(videoId, teamId).then(
      (loadedVideo) => {
        if (!active || !usablePlayback(loadedVideo)) {
          if (active) setState('error')
          return
        }
        setPlaybackVideo(loadedVideo)
        setState('ready')
      },
      () => {
        if (active) setState('error')
      },
    )

    return () => {
      active = false
    }
  }, [attempt, initialVideo, teamId, videoId])

  const refreshPlayback = () => {
    restoreTimeRef.current = videoRef.current?.currentTime ?? restoreTimeRef.current
    setAttempt((current) => current + 1)
  }

  return (
    <section
      id="analysis-source-video"
      className="overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl shadow-black/20"
      aria-label="Video fuente del análisis"
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#11151d] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Video fuente</p>
          <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {state === 'ready' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-muted-foreground"
            onClick={refreshPlayback}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Renovar enlace
          </Button>
        )}
      </div>

      {state === 'loading' && (
        <div className="flex aspect-video items-center justify-center gap-3 bg-[#07090d] text-sm text-slate-400" aria-live="polite" aria-busy="true">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          Preparando video…
        </div>
      )}

      {state === 'error' && (
        <div className="flex min-h-44 flex-col items-center justify-center gap-4 bg-[#07090d] px-6 py-7 text-center sm:min-h-52">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/5 text-slate-400">
            <VideoOff className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold text-slate-100">No pudimos cargar el video fuente</p>
            <p className="mt-1 max-w-md text-sm text-slate-400">
              Solicitá un enlace nuevo para continuar verificando los resultados.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={refreshPlayback}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Reintentar
          </Button>
        </div>
      )}

      {state === 'ready' && playbackVideo?.storageUrl && (
        <video
          ref={videoRef}
          key={playbackVideo.storageUrl}
          src={playbackVideo.storageUrl}
          controls
          preload="metadata"
          className="aspect-video w-full bg-black"
          aria-label={`Video fuente: ${title}`}
          onLoadedMetadata={(event) => {
            if (restoreTimeRef.current <= 0) return
            event.currentTarget.currentTime = Math.min(
              restoreTimeRef.current,
              Number.isFinite(event.currentTarget.duration)
                ? event.currentTarget.duration
                : restoreTimeRef.current,
            )
            restoreTimeRef.current = 0
          }}
          onError={() => {
            restoreTimeRef.current = videoRef.current?.currentTime ?? 0
            setState('error')
          }}
        />
      )}

      <div className="flex items-start gap-2 border-t border-white/10 bg-[#11151d] px-4 py-2.5 text-xs text-slate-400">
        <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {state === 'error'
          ? 'Sin video disponible no es posible verificar visualmente los momentos vinculados.'
          : 'Los momentos vinculados usan los tiempos informados por el análisis. Verificá siempre la jugada en el video.'}
      </div>
    </section>
  )
})
