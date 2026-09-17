import { cn } from '@/lib/utils'
import type {
  AnalysisJobShotChartCourt,
  AnalysisJobShotChartPlayer,
  AnalysisJobShotChartShot,
  ShotChartResult,
} from '@/types'
import { shotChartPointToPercent, shotChartResultLabel } from './shot-chart-court'

interface ShotChartCourtProps {
  court: AnalysisJobShotChartCourt
  shots: AnalysisJobShotChartShot[]
  players: AnalysisJobShotChartPlayer[]
}

const RESULT_STYLES: Record<ShotChartResult, string> = {
  made: 'border-success bg-success text-white',
  missed: 'border-destructive bg-surface text-destructive',
  unknown: 'border-information border-dashed bg-surface text-information',
}

function shotPlayerLabel(
  shot: AnalysisJobShotChartShot,
  playersByTrack: Map<number, string>,
): string {
  if (shot.rosterName) return shot.rosterName
  if (shot.trackId != null) return playersByTrack.get(shot.trackId) ?? `Track ${shot.trackId}`
  if (shot.jerseyNumber) return `#${shot.jerseyNumber}`
  return 'Tirador no identificado'
}

export function ShotChartCourt({ court, shots, players }: ShotChartCourtProps) {
  const playersByTrack = new Map(players.map((player) => [player.trackId, player.displayName]))
  const cornerLineOffset = court.widthM / 2 - court.cornerThreeLateralM
  const cornerArcDelta = Math.sqrt(Math.max(
    0,
    court.threePointRadiusM ** 2 - court.cornerThreeLateralM ** 2,
  ))

  return (
    <div>
      <div
        className="relative w-full overflow-hidden rounded-lg border border-border-strong bg-[#d7b985]"
        style={{ aspectRatio: `${court.lengthM} / ${court.widthM}` }}
        aria-label="Cancha con ubicación de tiros"
      >
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${court.lengthM} ${court.widthM}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <rect
            x="0.08"
            y="0.08"
            width={Math.max(0, court.lengthM - 0.16)}
            height={Math.max(0, court.widthM - 0.16)}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.12"
            className="text-white/80"
          />
          <line
            x1={court.lengthM / 2}
            y1="0"
            x2={court.lengthM / 2}
            y2={court.widthM}
            stroke="currentColor"
            strokeWidth="0.1"
            className="text-white/75"
          />
          <circle
            cx={court.hoops.home.xM}
            cy={court.hoops.home.yM}
            r={court.threePointRadiusM}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.1"
            className="text-white/70"
          />
          <circle
            cx={court.hoops.away.xM}
            cy={court.hoops.away.yM}
            r={court.threePointRadiusM}
            fill="none"
            stroke="currentColor"
            strokeWidth="0.1"
            className="text-white/70"
          />
          {[cornerLineOffset, court.widthM - cornerLineOffset].map((y) => (
            <g key={y}>
              <line
                x1="0"
                y1={y}
                x2={court.hoops.home.xM + cornerArcDelta}
                y2={y}
                stroke="currentColor"
                strokeWidth="0.1"
                className="text-white/70"
              />
              <line
                x1={court.hoops.away.xM - cornerArcDelta}
                y1={y}
                x2={court.lengthM}
                y2={y}
                stroke="currentColor"
                strokeWidth="0.1"
                className="text-white/70"
              />
            </g>
          ))}
          {[court.hoops.home, court.hoops.away].map((hoop, index) => (
            <circle
              key={index}
              cx={hoop.xM}
              cy={hoop.yM}
              r={Math.min(court.lengthM, court.widthM) * 0.012}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.12"
              className="text-white"
            />
          ))}
        </svg>

        {shots.map((shot, index) => {
          const point = shotChartPointToPercent(court, shot)
          if (!point) return null
          const player = shotPlayerLabel(shot, playersByTrack)
          const result = shotChartResultLabel(shot.result)
          const description = `${player} · ${shot.points}P · ${result} · ${shot.zone}`

          return (
            <span
              key={`${shot.shotId ?? 'shot'}-${index}`}
              className={cn(
                'absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                RESULT_STYLES[shot.result],
              )}
              style={{ left: `${point.leftPercent}%`, top: `${point.topPercent}%` }}
              title={description}
              aria-label={description}
              role="img"
              tabIndex={0}
            >
              {shot.points}
            </span>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground" aria-label="Leyenda de resultados">
        {(['made', 'missed', 'unknown'] as const).map((result) => (
          <span key={result} className="inline-flex items-center gap-1.5">
            <span className={cn('h-3 w-3 rounded-full border-2', RESULT_STYLES[result])} aria-hidden="true" />
            {shotChartResultLabel(result)}
          </span>
        ))}
        <span>El número del marcador indica 2P o 3P.</span>
      </div>
    </div>
  )
}
