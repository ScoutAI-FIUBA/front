import {
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from 'react'

interface ClipTimelineProps {
  videoUrl: string
  duration: number
  currentTime: number
  rangeStart: number
  rangeEnd: number
  maxRangeSeconds?: number
  onSeek: (time: number) => void
  onRangeChange: (start: number, end: number) => void
}

type RangeEdge = 'start' | 'end'

const THUMBNAIL_COUNT = 12
const MIN_RANGE_SECONDS = 0.1

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function formatSeconds(value: number): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0
  const minutes = Math.floor(safeValue / 60)
  const seconds = Math.floor(safeValue % 60)
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

function formatRangeDuration(value: number): string {
  const rounded = Math.round(Math.max(0, value) * 10) / 10
  return rounded % 1 === 0 ? formatSeconds(rounded) : `${formatSeconds(rounded)}.${Math.round((rounded % 1) * 10)}`
}

export function ClipTimeline({
  videoUrl,
  duration,
  currentTime,
  rangeStart,
  rangeEnd,
  maxRangeSeconds,
  onSeek,
  onRangeChange,
}: ClipTimelineProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const [draggingEdge, setDraggingEdge] = useState<RangeEdge | null>(null)

  useEffect(() => {
    if (!videoUrl || duration <= 0) {
      setThumbnails([])
      return
    }

    let cancelled = false
    const thumbnailVideo = document.createElement('video')
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    thumbnailVideo.src = videoUrl
    thumbnailVideo.muted = true
    thumbnailVideo.preload = 'auto'
    thumbnailVideo.playsInline = true

    const seekTo = (time: number) => new Promise<void>((resolve, reject) => {
      const handleSeeked = () => {
        cleanup()
        resolve()
      }
      const handleError = () => {
        cleanup()
        reject(new Error('No se pudo leer un fotograma del video'))
      }
      const cleanup = () => {
        thumbnailVideo.removeEventListener('seeked', handleSeeked)
        thumbnailVideo.removeEventListener('error', handleError)
      }

      thumbnailVideo.addEventListener('seeked', handleSeeked, { once: true })
      thumbnailVideo.addEventListener('error', handleError, { once: true })
      thumbnailVideo.currentTime = clamp(time, 0, Math.max(0, duration - 0.05))
    })

    const generateThumbnails = async () => {
      if (!context) return

      try {
        if (thumbnailVideo.readyState < 1) {
          await new Promise<void>((resolve, reject) => {
            thumbnailVideo.addEventListener('loadedmetadata', () => resolve(), { once: true })
            thumbnailVideo.addEventListener('error', () => reject(new Error('No se pudo leer el video')), { once: true })
          })
        }

        const aspectRatio = thumbnailVideo.videoWidth > 0 && thumbnailVideo.videoHeight > 0
          ? thumbnailVideo.videoWidth / thumbnailVideo.videoHeight
          : 16 / 9
        canvas.height = 96
        canvas.width = Math.round(canvas.height * aspectRatio)

        const frames: string[] = []
        for (let index = 0; index < THUMBNAIL_COUNT; index += 1) {
          if (cancelled) return
          const time = ((index + 0.5) / THUMBNAIL_COUNT) * duration
          await seekTo(time)
          context.drawImage(thumbnailVideo, 0, 0, canvas.width, canvas.height)
          frames.push(canvas.toDataURL('image/jpeg', 0.68))
        }

        if (!cancelled) setThumbnails(frames)
      } catch {
        if (!cancelled) setThumbnails([])
      }
    }

    void generateThumbnails()

    return () => {
      cancelled = true
      thumbnailVideo.removeAttribute('src')
      thumbnailVideo.load()
    }
  }, [duration, videoUrl])

  const timeFromPointer = (clientX: number): number => {
    const bounds = trackRef.current?.getBoundingClientRect()
    if (!bounds || duration <= 0) return 0
    return clamp(((clientX - bounds.left) / bounds.width) * duration, 0, duration)
  }

  const updateEdge = (edge: RangeEdge, nextTime: number) => {
    if (edge === 'start') {
      const minimumStart = maxRangeSeconds == null ? 0 : Math.max(0, rangeEnd - maxRangeSeconds)
      onRangeChange(clamp(nextTime, minimumStart, Math.max(0, rangeEnd - MIN_RANGE_SECONDS)), rangeEnd)
      return
    }
    const maximumEnd = maxRangeSeconds == null ? duration : Math.min(duration, rangeStart + maxRangeSeconds)
    onRangeChange(rangeStart, clamp(nextTime, Math.min(duration, rangeStart + MIN_RANGE_SECONDS), maximumEnd))
  }

  const handleTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return
    onSeek(timeFromPointer(event.clientX))
  }

  const handleEdgePointerDown = (event: PointerEvent<HTMLButtonElement>, edge: RangeEdge) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDraggingEdge(edge)
  }

  const handleEdgePointerMove = (event: PointerEvent<HTMLButtonElement>, edge: RangeEdge) => {
    if (draggingEdge !== edge) return
    updateEdge(edge, timeFromPointer(event.clientX))
  }

  const handleEdgePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDraggingEdge(null)
  }

  const handleEdgeKeyDown = (event: KeyboardEvent<HTMLButtonElement>, edge: RangeEdge) => {
    const step = event.shiftKey ? 5 : 1
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      updateEdge(edge, (edge === 'start' ? rangeStart : rangeEnd) - step)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      updateEdge(edge, (edge === 'start' ? rangeStart : rangeEnd) + step)
    }
  }

  const hasRange = duration > 0 && rangeEnd > rangeStart
  const startPercent = duration > 0 ? clamp((rangeStart / duration) * 100, 0, 100) : 0
  const endPercent = duration > 0 ? clamp((rangeEnd / duration) * 100, 0, 100) : 0
  const currentPercent = duration > 0 ? clamp((currentTime / duration) * 100, 0, 100) : 0
  const tickCount = duration >= 300 ? 6 : 5

  return (
    <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Línea de tiempo</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Haz clic para navegar o arrastra los extremos del clip.</p>
        </div>
        <span className="font-mono text-xs font-semibold text-foreground">
          {formatSeconds(currentTime)} / {formatSeconds(duration)}
        </span>
      </div>

      <div className="flex justify-between font-mono text-[10px] text-muted-foreground" aria-hidden="true">
        {Array.from({ length: tickCount }, (_, index) => {
          const time = tickCount > 1 ? (duration * index) / (tickCount - 1) : 0
          return <span key={index}>{formatSeconds(time)}</span>
        })}
      </div>

      <div
        ref={trackRef}
        className={`relative h-24 touch-none select-none overflow-visible rounded-lg border bg-background shadow-inner ${duration > 0 ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
        onPointerDown={handleTrackPointerDown}
        role="slider"
        aria-label="Posición del video"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        tabIndex={duration > 0 ? 0 : -1}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') onSeek(clamp(currentTime - 1, 0, duration))
          if (event.key === 'ArrowRight') onSeek(clamp(currentTime + 1, 0, duration))
        }}
      >
        <div className="absolute inset-0 flex overflow-hidden rounded-lg">
          {thumbnails.length > 0 ? thumbnails.map((thumbnail, index) => (
            <img
              key={`${thumbnail.slice(-24)}-${index}`}
              src={thumbnail}
              alt=""
              draggable={false}
              className="h-full min-w-0 flex-1 object-cover"
            />
          )) : (
            <div className="h-full w-full bg-gradient-to-r from-muted via-background to-muted" />
          )}
        </div>

        {hasRange && (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 rounded-l-lg bg-black/45" style={{ width: `${startPercent}%` }} />
            <div className="pointer-events-none absolute inset-y-0 right-0 rounded-r-lg bg-black/45" style={{ width: `${100 - endPercent}%` }} />
            <div
              className="pointer-events-none absolute inset-y-0 border-y-2 border-primary bg-primary/20"
              style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }}
            >
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-2 py-1 font-mono text-[10px] font-semibold text-primary-foreground shadow-sm">
                {formatRangeDuration(rangeEnd - rangeStart)}
              </span>
            </div>

            {(['start', 'end'] as const).map((edge) => {
              const isStart = edge === 'start'
              const percent = isStart ? startPercent : endPercent
              const value = isStart ? rangeStart : rangeEnd
              return (
                <button
                  key={edge}
                  type="button"
                  className="absolute inset-y-0 z-20 w-4 -translate-x-1/2 cursor-ew-resize touch-none rounded-md border-2 border-white bg-primary shadow-md outline-none ring-primary/30 focus-visible:ring-4"
                  style={{ left: `${percent}%` }}
                  aria-label={`Ajustar ${isStart ? 'inicio' : 'fin'} del clip`}
                  aria-valuemin={isStart ? 0 : rangeStart}
                  aria-valuemax={isStart ? rangeEnd : duration}
                  aria-valuenow={value}
                  onPointerDown={(event) => handleEdgePointerDown(event, edge)}
                  onPointerMove={(event) => handleEdgePointerMove(event, edge)}
                  onPointerUp={handleEdgePointerUp}
                  onPointerCancel={handleEdgePointerUp}
                  onKeyDown={(event) => handleEdgeKeyDown(event, edge)}
                >
                  <span className="absolute left-1/2 top-1/2 h-7 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90" />
                  <span className={`pointer-events-none absolute bottom-full mb-2 whitespace-nowrap rounded bg-primary px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary-foreground shadow-sm ${isStart ? 'left-1/2 -translate-x-1/2' : 'right-1/2 translate-x-1/2'}`}>
                    {formatSeconds(value)}
                  </span>
                </button>
              )
            })}
          </>
        )}

        {duration > 0 && (
          <div
            className="pointer-events-none absolute -bottom-1 -top-3 z-10 w-0.5 -translate-x-1/2 bg-foreground shadow-sm"
            style={{ left: `${currentPercent}%` }}
          >
            <span className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-background bg-foreground" />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Flechas: 1 s · Shift + flechas: 5 s</span>
        {hasRange && <span className="font-medium text-foreground">Clip: {formatSeconds(rangeStart)}–{formatSeconds(rangeEnd)}</span>}
      </div>
    </div>
  )
}
