import { useEffect, useMemo, useRef, useState } from 'react'
import {
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from 'motion/react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AnalysisJobCourtPositions, AnalysisJobCourtPositionsPlayer } from '@/types'
import { movementSequenceIndex } from '@/pages/analysis/analysis-job-court-positions'
import { validCourtPositions } from './court-positions-court'
import { BasketballCourtLines } from './BasketballCourtLines'
import {
  analysisJobPlayerKey,
  analysisJobPlayerLabel,
} from '@/pages/analysis/analysis-job-player-identity'

interface CourtPositionsPlaybackProps {
  court: AnalysisJobCourtPositions['court']
  player: AnalysisJobCourtPositionsPlayer
  presentation?: 'legacy' | 'match-report'
}

export function CourtPositionsPlayback({ court, player, presentation = 'legacy' }: CourtPositionsPlaybackProps) {
  const reduceMotion = useReducedMotion()
  const positions = useMemo(
    () => validCourtPositions(court, player.positions),
    [court, player.positions],
  )
  const progress = useMotionValue(reduceMotion ? 1 : 0)
  const [displayProgress, setDisplayProgress] = useState(reduceMotion ? 1 : 0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const controlsRef = useRef<ReturnType<typeof animate> | null>(null)

  const inputRange = useMemo(() => positions.length <= 1
    ? [0, 1]
    : positions.map((_, index) => index / (positions.length - 1)), [positions])
  const xRange = useMemo(() => positions.length <= 1
    ? [positions[0]?.xM ?? 0, positions[0]?.xM ?? 0]
    : positions.map((position) => position.xM), [positions])
  const yRange = useMemo(() => positions.length <= 1
    ? [positions[0]?.yM ?? 0, positions[0]?.yM ?? 0]
    : positions.map((position) => position.yM), [positions])
  const markerX = useTransform(progress, inputRange, xRange)
  const markerY = useTransform(progress, inputRange, yRange)
  const points = positions.map((position) => `${position.xM},${position.yM}`).join(' ')
  const sampleIndex = movementSequenceIndex(displayProgress, positions.length)
  const markerLabel = player.jerseyNumber ?? (player.stablePlayerId ? 'J' : String(player.trackId))
  const playerKey = analysisJobPlayerKey(player)
  const playerLabel = analysisJobPlayerLabel(player)

  useMotionValueEvent(progress, 'change', (latest) => {
    setDisplayProgress(latest)
  })

  useEffect(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    const initialProgress = reduceMotion ? 1 : 0
    progress.set(initialProgress)
    setDisplayProgress(initialProgress)
    setIsPlaying(false)
    setIsPaused(false)
  }, [playerKey, progress, reduceMotion])

  useEffect(() => () => controlsRef.current?.stop(), [])

  const startPlayback = () => {
    if (reduceMotion || positions.length < 2) return
    if (isPaused && controlsRef.current) {
      controlsRef.current.play()
      setIsPaused(false)
      setIsPlaying(true)
      return
    }

    if (progress.get() >= 1) progress.set(0)
    const remaining = 1 - progress.get()
    controlsRef.current?.stop()
    const controls = animate(progress, 1, {
      duration: Math.max(6, Math.min(12, positions.length * 0.12)) * remaining,
      ease: 'linear',
      onComplete: () => {
        setIsPlaying(false)
        setIsPaused(false)
        controlsRef.current = null
      },
    })
    controlsRef.current = controls
    setIsPlaying(true)
    setIsPaused(false)
  }

  const pausePlayback = () => {
    controlsRef.current?.pause()
    setIsPlaying(false)
    setIsPaused(true)
  }

  const restartPlayback = () => {
    controlsRef.current?.stop()
    controlsRef.current = null
    progress.set(0)
    setIsPlaying(false)
    setIsPaused(false)
    if (!reduceMotion) startPlayback()
  }

  const scrubTo = (value: number) => {
    controlsRef.current?.stop()
    controlsRef.current = null
    const nextProgress = Math.min(1, Math.max(0, value))
    progress.set(nextProgress)
    setIsPlaying(false)
    setIsPaused(nextProgress > 0 && nextProgress < 1)
  }

  if (positions.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Este seguimiento no tiene posiciones válidas para reproducir.</p>
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border',
          presentation === 'match-report'
            ? 'border-[#3A4254] bg-[#11151D]'
            : 'border-border-strong bg-[#d7b985]',
        )}
        style={{ aspectRatio: `${court.lengthM} / ${court.widthM}` }}
      >
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${court.lengthM} ${court.widthM}`} preserveAspectRatio="none" role="img" aria-label={`Recorrido espacial de ${playerLabel}`}>
          <BasketballCourtLines lengthM={court.lengthM} widthM={court.widthM} />
          {positions.length > 1 && (
            <>
              <polyline points={points} fill="none" stroke={presentation === 'match-report' ? 'rgba(244,245,247,0.2)' : 'rgba(15,23,42,0.28)'} strokeWidth="0.24" strokeLinecap="round" strokeLinejoin="round" />
              <motion.polyline
                points={points}
                fill="none"
                stroke={presentation === 'match-report' ? '#FF6A1F' : '#b45309'}
                strokeWidth="0.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength="1"
                style={{ pathLength: progress }}
              />
            </>
          )}
          <motion.circle cx={markerX} cy={markerY} r="0.48" fill={presentation === 'match-report' ? '#FF6A1F' : '#111827'} stroke="white" strokeWidth="0.12" />
          <motion.text x={markerX} y={markerY} dy="0.16" textAnchor="middle" fill="white" fontSize="0.46" fontWeight="700">
            {markerLabel}
          </motion.text>
        </svg>
      </div>

      {reduceMotion ? (
        <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-3 text-sm text-muted-foreground">
          <span>Movimiento reducido activo: mostramos el recorrido completo.</span>
          <span className="shrink-0 tabular-nums">{positions.length} muestras</span>
        </div>
      ) : (
        <div className="space-y-3 border-t border-white/10 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {isPlaying ? (
              <Button type="button" size="sm" variant="outline" onClick={pausePlayback}>
                <Pause className="h-4 w-4" aria-hidden="true" /> Pausar
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={startPlayback}>
                <Play className="h-4 w-4" aria-hidden="true" /> {isPaused ? 'Continuar' : 'Reproducir recorrido'}
              </Button>
            )}
            <Button type="button" size="sm" variant="ghost" onClick={restartPlayback}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reiniciar
            </Button>
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">
              Muestra {sampleIndex + 1} de {positions.length}
            </span>
          </div>
          <label className="block">
            <span className="sr-only">Progreso del recorrido por secuencia de muestras</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={Math.round(displayProgress * 100)}
              onChange={(event) => scrubTo(Number(event.currentTarget.value) / 100)}
              className="h-2 w-full cursor-pointer accent-primary"
              aria-valuetext={`Muestra ${sampleIndex + 1} de ${positions.length}`}
            />
          </label>
          <p className="text-xs text-muted-foreground">Avance por secuencia de muestras. No representa tiempo de partido ni está sincronizado con el video.</p>
        </div>
      )}
    </div>
  )
}
