import type { AnalysisJobCourtPositions } from '@/types'
import type { CourtPositionsHeatmapData } from './court-positions-heatmap'

interface CourtPositionsHeatmapProps {
  court: AnalysisJobCourtPositions['court']
  heatmap: CourtPositionsHeatmapData
}

export function CourtPositionsHeatmap({
  court,
  heatmap,
}: CourtPositionsHeatmapProps) {
  return (
    <div className="w-full max-w-full">
      <div
        className="relative w-full max-w-full overflow-hidden rounded-lg border border-border-strong bg-[#d7b985]"
        style={{ aspectRatio: `${court.lengthM} / ${court.widthM}` }}
      >
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${court.lengthM} ${court.widthM}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Mapa de calor de concentración relativa construido con ${heatmap.totalSamples} muestras válidas`}
        >
          <title>Concentración relativa de muestras espaciales</title>

          {heatmap.cells.map((cell) => (
            <rect
              key={`${cell.column}:${cell.row}`}
              x={cell.xM}
              y={cell.yM}
              width={cell.widthM}
              height={cell.heightM}
              fill="#dc2626"
              fillOpacity={0.18 + cell.intensity * 0.72}
            >
              <title>{cell.samples} {cell.samples === 1 ? 'muestra' : 'muestras'}</title>
            </rect>
          ))}

          <rect
            x="0.08"
            y="0.08"
            width={Math.max(0, court.lengthM - 0.16)}
            height={Math.max(0, court.widthM - 0.16)}
            fill="none"
            stroke="white"
            strokeOpacity="0.9"
            strokeWidth="0.12"
          />
          <line
            x1={court.lengthM / 2}
            y1="0"
            x2={court.lengthM / 2}
            y2={court.widthM}
            stroke="white"
            strokeOpacity="0.85"
            strokeWidth="0.1"
          />
        </svg>
      </div>

      <div className="mt-3 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>{heatmap.totalSamples.toLocaleString('es-AR')} muestras válidas utilizadas</span>
        <div className="flex items-center gap-2" aria-label="Escala de concentración relativa">
          <span>Menor</span>
          <span
            className="h-2.5 w-28 rounded-full bg-gradient-to-r from-red-100 to-red-700"
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
