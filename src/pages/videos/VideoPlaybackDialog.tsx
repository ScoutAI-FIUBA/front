import { useEffect, useState } from 'react'
import { CircleAlert, LoaderCircle } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { videoService } from '@/services/registry'
import type { Video } from '@/types'
import { loadVideoPlayback } from './video-playback'

type PlaybackState = 'loading' | 'ready' | 'error'

interface VideoPlaybackDialogProps {
  video: Video
  onClose: () => void
}

export function VideoPlaybackDialog({ video, onClose }: VideoPlaybackDialogProps) {
  const [state, setState] = useState<PlaybackState>('loading')
  const [playbackVideo, setPlaybackVideo] = useState<Video | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true

    setState('loading')
    setPlaybackVideo(null)

    void loadVideoPlayback(video.id, videoService).then(
      (loadedVideo) => {
        if (!active) return
        setPlaybackVideo(loadedVideo)
        setState('ready')
      },
      () => {
        if (!active) return
        setState('error')
      },
    )

    return () => {
      active = false
    }
  }, [attempt, video.id])

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{video.title}</DialogTitle>
          <DialogDescription>
            Reproducción del video original disponible para este equipo.
          </DialogDescription>
        </DialogHeader>

        {state === 'loading' && (
          <div
            className="flex aspect-video items-center justify-center gap-3 rounded-lg border bg-surface-subtle text-sm text-muted-foreground"
            aria-live="polite"
            aria-busy="true"
          >
            <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
            Preparando video…
          </div>
        )}

        {state === 'error' && (
          <Alert className="flex flex-col gap-4 border-destructive/25 bg-destructive/5 p-5 sm:flex-row sm:items-center">
            <CircleAlert className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">No pudimos cargar el video</p>
              <p className="mt-1 text-muted-foreground">
                Volvé a intentarlo para solicitar un enlace de reproducción nuevo.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setAttempt((value) => value + 1)}>
              Reintentar
            </Button>
          </Alert>
        )}

        {state === 'ready' && playbackVideo?.storageUrl && (
          <div className="overflow-hidden rounded-lg border bg-black">
            <video
              key={playbackVideo.storageUrl}
              src={playbackVideo.storageUrl}
              controls
              preload="metadata"
              className="aspect-video w-full bg-black"
              onError={() => setState('error')}
            />
          </div>
        )}

        <div className="flex justify-end">
          <DialogClose asChild>
            <Button variant="outline">Cerrar</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
