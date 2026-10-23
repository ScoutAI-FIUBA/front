import { cn } from '@/lib/utils'
import { BasketballCourtLines } from './BasketballCourtLines'
import { courtColumnStyle, courtFrameStyle } from './court-size'
import type {
  AnalysisJobShotChartCourt,
  AnalysisJobShotChartPlayer,
  AnalysisJobShotChartShot,
  ShotChartResult,
} from '@/types'
import { shotChartPointToPercent, shotChartResultLabel } from './shot-chart-court'
import {
  analysisJobPlayerLabelFromMap,
  buildAnalysisJobPlayerLabels,
  type AnalysisJobPlayerKey,
} from '@/pages/analysis/analysis-job-player-identity'

interface ShotChartCourtProps {
  court: AnalysisJobShotChartCourt
  shots: AnalysisJobShotChartShot[]
  players: AnalysisJobShotChartPlayer[]
  selectedShotKey?: string | null
  shotKey?: (shot: AnalysisJobShotChartShot, index: number) => string
  onSelectShot?: (shot: AnalysisJobShotChartShot, index: number) => void
  presentation?: 'legacy' | 'match-report'
}

const RESULT_STYLES: Record<ShotChartResult, string> = {
  made: 'border-success bg-success text-white',
  missed: 'border-destructive bg-surface text-destructive',
  unknown: 'border-information border-dashed bg-surface text-information',
}

const REPORT_RESULT_STYLES: Record<ShotChartResult, string> = {
  made: 'border-[#F4F5F7] bg-[#F4F5F7] text-[#11151D]',
  missed: 'border-[#F4F5F7] bg-[#11151D] text-[#F4F5F7]',
  unknown: 'border-[#788397] border-dashed bg-[#11151D] text-[#A3ABBA]',
}

function shotPlayerLabel(
  shot: AnalysisJobShotChartShot,
  playerLabels: Map<AnalysisJobPlayerKey, string>,
): string {
  return analysisJobPlayerLabelFromMap(shot, playerLabels)
}

export function ShotChartCourt({
  court,
  shots,
  players,
  selectedShotKey = null,
  shotKey,
  onSelectShot,
  presentation = 'legacy',
}: ShotChartCourtProps) {
  const playerLabels = buildAnalysisJobPlayerLabels(players)
  const resultStyles = presentation === 'match-report' ? REPORT_RESULT_STYLES : RESULT_STYLES

  return (
    <div style={courtColumnStyle(court)}>
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-lg border',
          presentation === 'match-report'
            ? 'border-[#3A4254] bg-[#11151D]'
            : 'border-border-strong bg-[#d7b985]',
        )}
        style={courtFrameStyle(court)}
        aria-label="Cancha con ubicación de tiros"
      >
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${court.lengthM} ${court.widthM}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <BasketballCourtLines
            lengthM={court.lengthM}
            widthM={court.widthM}
            hoopInsetM={court.hoopInsetM}
            threePointRadiusM={court.threePointRadiusM}
            cornerThreeLateralM={court.cornerThreeLateralM}
          />
        </svg>

        {shots.map((shot, index) => {
          const point = shotChartPointToPercent(court, shot)
          if (!point) return null
          const player = shotPlayerLabel(shot, playerLabels)
          const result = shotChartResultLabel(shot.result)
          const description = `${player} · ${shot.points}P · ${result} · ${shot.zone}`
          const markerKey = shotKey?.(shot, index) ?? `${shot.shotId ?? 'shot'}-${index}`
          const selected = markerKey === selectedShotKey

          if (onSelectShot) {
            return (
              <button
                type="button"
                key={markerKey}
                className={cn(
                  'absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-sm transition-[transform,box-shadow] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 motion-reduce:transition-none',
                  resultStyles[shot.result],
                  selected && presentation === 'match-report'
                    ? 'z-10 scale-125 border-[#FF6A1F] bg-[#FF6A1F] text-white ring-2 ring-[#FF6A1F] ring-offset-2 ring-offset-[#0B0D12]'
                    : selected && 'z-10 scale-125 ring-2 ring-white ring-offset-2 ring-offset-black/40',
                )}
                style={{ left: `${point.leftPercent}%`, top: `${point.topPercent}%` }}
                title={description}
                aria-label={`${description}. Seleccionar tiro`}
                aria-pressed={selected}
                onClick={() => onSelectShot(shot, index)}
              >
                {shot.points}
              </button>
            )
          }

          return (
            <span
              key={markerKey}
              className={cn(
                'absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[10px] font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
                resultStyles[shot.result],
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
            <span className={cn('h-3 w-3 rounded-full border-2', resultStyles[result])} aria-hidden="true" />
            {shotChartResultLabel(result)}
          </span>
        ))}
        <span>El número del marcador indica 2P o 3P.</span>
      </div>
    </div>
  )
}
