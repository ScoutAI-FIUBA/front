import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AnalysisJobCourtPositions, AnalysisJobCourtPositionsPlayer } from '@/types'
import {
  analysisJobPlayerKey,
  analysisJobPlayerLabelFromMap,
  buildAnalysisJobPlayerLabels,
  type AnalysisJobPlayerKey,
} from '@/pages/analysis/analysis-job-player-identity'
import { playerColor, validCourtPositions } from './court-positions-court'
import {
  GROUP_PLAYBACK_DEFAULT_TAIL,
  GROUP_PLAYBACK_SPEEDS,
  GROUP_PLAYBACK_TAILS,
  advanceProgress,
  buildGroupTimeline,
  cappedElapsedSeconds,
  groupDotLabels,
  pointAt,
  progressAtStepIndex,
  stepAtTime,
  stepIndexAtProgress,
  tailSegments,
  tailSpan,
  timeAtProgress,
  type GroupPlaybackTailId,
} from './court-positions-group-playback'
import { BasketballCourtLines } from './BasketballCourtLines'
import { courtColumnStyle, courtFrameStyle } from './court-size'

interface CourtPositionsGroupPlaybackProps {
  court: AnalysisJobCourtPositions['court']
  players: AnalysisJobCourtPositionsPlayer[]
  playerLabels?: Map<AnalysisJobPlayerKey, string>
  presentation?: 'legacy' | 'match-report'
}

// The playhead state is refreshed at most this often so large rosters do not re-render at 60 Hz.
const FRAME_INTERVAL_MS = 40

export function CourtPositionsGroupPlayback({
  court,
  players,
  playerLabels: providedLabels,
  presentation = 'legacy',
}: CourtPositionsGroupPlaybackProps) {
  const reduceMotion = useReducedMotion()
  const playerLabels = useMemo(
    () => providedLabels ?? buildAnalysisJobPlayerLabels(players),
    [providedLabels, players],
  )
  const timeline = useMemo(
    () => buildGroupTimeline(players.map((player) => ({
      key: String(analysisJobPlayerKey(player)),
      positions: validCourtPositions(court, player.positions),
    }))),
    [court, players],
  )
  const playersByKey = useMemo(
    () => new Map(players.map((player) => [String(analysisJobPlayerKey(player)), player])),
    [players],
  )
  const dotLabels = useMemo(
    () => groupDotLabels(players.map((player) => ({
      key: String(analysisJobPlayerKey(player)),
      jerseyNumber: player.jerseyNumber,
      label: playerLabels.get(analysisJobPlayerKey(player) as AnalysisJobPlayerKey),
      fallback: player.stablePlayerId ? 'J' : String(player.trackId),
    }))),
    [players, playerLabels],
  )
  const [progress, setProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState<number>(1)
  const [tailId, setTailId] = useState<GroupPlaybackTailId>(GROUP_PLAYBACK_DEFAULT_TAIL)
  const progressRef = useRef(0)

  useEffect(() => {
    progressRef.current = 0
    setProgress(0)
    setIsPlaying(false)
  }, [timeline])

  useEffect(() => {
    if (!isPlaying || reduceMotion) return
    let frame = 0
    let last = performance.now()
    let lastRender = last
    const tick = (now: number) => {
      const result = advanceProgress(progressRef.current, cappedElapsedSeconds(now, last), timeline, speed)
      last = now
      progressRef.current = result.progress
      if (result.ended) {
        setProgress(result.progress)
        setIsPlaying(false)
        return
      }
      if (now - lastRender >= FRAME_INTERVAL_MS) {
        lastRender = now
        setProgress(result.progress)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [isPlaying, reduceMotion, speed, timeline])

  const time = timeAtProgress(timeline, progress)
  const step = stepAtTime(timeline, time)
  const stepCount = timeline.ticks.length
  const span = tailSpan(timeline, tailId)
  const tolerance = timeline.spacing

  const scrubTo = (value: number) => {
    const next = Math.min(1, Math.max(0, value))
    progressRef.current = next
    setProgress(next)
    setIsPlaying(false)
  }

  const play = () => {
    if (reduceMotion || stepCount < 2) return
    if (progressRef.current >= 1) {
      progressRef.current = 0
      setProgress(0)
    }
    setIsPlaying(true)
  }

  const restart = () => {
    progressRef.current = 0
    setProgress(0)
    setIsPlaying(false)
    if (!reduceMotion && stepCount >= 2) setIsPlaying(true)
  }

  if (timeline.tracks.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Estos jugadores no tienen posiciones válidas para reproducir.</p>
  }

  const stepText = `Paso ${step} de ${stepCount}`
  const scene = timeline.tracks.map((track) => {
    const player = playersByKey.get(track.key)
    if (!player) return null
    const point = pointAt(track, time, tolerance, timeline.maxGap)
    if (!point) return null
    return {
      key: track.key,
      color: playerColor(player),
      dot: dotLabels.get(track.key) ?? '',
      point,
      tail: tailSegments(track, time, span, tolerance, timeline.maxGap),
    }
  })

  return (
    <div className="space-y-4" style={courtColumnStyle(court)}>
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border',
          presentation === 'match-report'
            ? 'border-[#3A4254] bg-[#11151D]'
            : 'border-border-strong bg-[#d7b985]',
        )}
        style={courtFrameStyle(court)}
      >
        <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${court.lengthM} ${court.widthM}`} preserveAspectRatio="none" role="img" aria-label="Movimiento conjunto de los jugadores identificados">
          <BasketballCourtLines lengthM={court.lengthM} widthM={court.widthM} />
          {scene.map((item) => item && item.tail.map((segment, index) => (
            <line
              key={`${item.key}-tail-${index}`}
              x1={segment.x1}
              y1={segment.y1}
              x2={segment.x2}
              y2={segment.y2}
              stroke={item.color}
              strokeOpacity={segment.opacity}
              strokeWidth="0.26"
              strokeLinecap="round"
            />
          )))}
          {scene.map((item) => item && (
            <g key={`${item.key}-dot`}>
              <circle cx={item.point.xM} cy={item.point.yM} r="0.52" fill={item.color} stroke="white" strokeWidth="0.1" />
              <text x={item.point.xM} y={item.point.yM} dy="0.15" textAnchor="middle" fill="white" fontSize={item.dot.length > 2 ? 0.34 : 0.44} fontWeight="700">
                {item.dot}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground" role="group" aria-label="Jugadores visibles">
        {players.map((player) => (
          <span key={analysisJobPlayerKey(player)} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: playerColor(player) }} aria-hidden="true" />
            {analysisJobPlayerLabelFromMap(player, playerLabels)}
          </span>
        ))}
      </div>

      <div className="space-y-3 border-t border-white/10 pt-3">
        {reduceMotion ? (
          <p className="text-sm text-muted-foreground">Movimiento reducido activo: no hay reproducción automática. Usá el control para avanzar paso a paso.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {isPlaying ? (
              <Button type="button" size="sm" variant="outline" onClick={() => {
                setProgress(progressRef.current)
                setIsPlaying(false)
              }}>
                <Pause className="h-4 w-4" aria-hidden="true" /> Pausar
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={play} disabled={stepCount < 2}>
                <Play className="h-4 w-4" aria-hidden="true" /> Reproducir
              </Button>
            )}
            <Button type="button" size="sm" variant="ghost" onClick={restart} disabled={stepCount < 2}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" /> Reiniciar
            </Button>
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">{stepText}</span>
          </div>
        )}
        <label className="block">
          <span className="sr-only">Progreso del movimiento conjunto</span>
          <input
            type="range"
            min="0"
            max={Math.max(1, stepCount - 1)}
            step="1"
            value={stepIndexAtProgress(timeline, progress)}
            disabled={stepCount < 2}
            onChange={(event) => scrubTo(progressAtStepIndex(timeline, Number(event.currentTarget.value)))}
            className="h-2 w-full cursor-pointer accent-primary"
            aria-valuetext={stepText}
          />
        </label>
        {reduceMotion && <p className="text-xs tabular-nums text-muted-foreground">{stepText}</p>}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          {!reduceMotion && (
            <div className="flex items-center gap-1" role="group" aria-label="Velocidad">
              <span className="mr-1">Velocidad</span>
              {GROUP_PLAYBACK_SPEEDS.map((option) => (
                <Button key={option} type="button" size="sm" variant={speed === option ? 'default' : 'ghost'} className="h-7 px-2" aria-pressed={speed === option} onClick={() => setSpeed(option)}>
                  {option}x
                </Button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1" role="group" aria-label="Cola">
            <span className="mr-1">Cola</span>
            {GROUP_PLAYBACK_TAILS.map((option) => (
              <Button key={option.id} type="button" size="sm" variant={tailId === option.id ? 'default' : 'ghost'} className="h-7 px-2" aria-pressed={tailId === option.id} onClick={() => setTailId(option.id)}>
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {timeline.mode === 'frames'
            ? 'Los jugadores avanzan juntos por instantes de video, pero el paso no es un tiempo medido: no representa tiempo real ni está sincronizado con el video.'
            : 'Estos datos no traen el instante de video de cada posición: cada jugador avanza por el orden de sus posiciones, sin garantía de coincidir en el tiempo. No representa tiempo real ni está sincronizado con el video.'}
        </p>
      </div>
    </div>
  )
}
