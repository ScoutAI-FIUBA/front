import type { AnalysisJobCourtPositions } from '@/types'
import { cn } from '@/lib/utils'
import type { CourtPositionsHeatmapData } from './court-positions-heatmap'
import { BasketballCourtLines } from './BasketballCourtLines'
import { courtColumnStyle, courtFrameStyle } from './court-size'

interface CourtPositionsHeatmapProps {
  court: AnalysisJobCourtPositions['court']
  heatmap: CourtPositionsHeatmapData
  presentation?: 'legacy' | 'match-report'
}

export function CourtPositionsHeatmap({
  court,
  heatmap,
  presentation = 'legacy',
}: CourtPositionsHeatmapProps) {
  return (
    <div className="w-full max-w-full" style={courtColumnStyle(court)}>
      <div
        className={cn(
          'relative w-full max-w-full overflow-hidden rounded-lg border',
          presentation === 'match-report'
            ? 'border-[#3A4254] bg-[#11151D]'
            : 'border-border-strong bg-[#d7b985]',
        )}
        style={courtFrameStyle(court)}
      >
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${court.lengthM} ${court.widthM}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Mapa de calor de concentración relativa construido con ${heatmap.totalSamples} posiciones válidas`}
        >
          <title>Concentración relativa de posiciones</title>

          {heatmap.cells.map((cell) => (
            <rect
              key={`${cell.column}:${cell.row}`}
              x={cell.xM}
              y={cell.yM}
              width={cell.widthM}
              height={cell.heightM}
              fill={presentation === 'match-report' ? '#b91c1c' : '#dc2626'}
              fillOpacity={0.18 + cell.intensity * 0.72}
            >
              <title>{cell.samples} {cell.samples === 1 ? 'posición' : 'posiciones'}</title>
            </rect>
          ))}

          <BasketballCourtLines lengthM={court.lengthM} widthM={court.widthM} />
        </svg>
      </div>

      <div className="mt-3 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>{heatmap.totalSamples.toLocaleString('es-AR')} posiciones válidas utilizadas</span>
        <div className="flex items-center gap-2" aria-label="Escala de concentración relativa">
          <span>Menor</span>
          <span
            className={cn(
              'h-2.5 w-28 rounded-full bg-gradient-to-r',
              presentation === 'match-report' ? 'from-[#351A1A] to-[#B91C1C]' : 'from-red-100 to-red-700',
            )}
            aria-hidden="true"
          />
          <span>Mayor concentración</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        La intensidad es relativa al filtro actual; mapas con filtros distintos no comparten una escala absoluta.
      </p>
    </div>
  )
}
