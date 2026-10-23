import { ChevronDown, CircleAlert, FileSearch, Info } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import type { ProcessingJob, Team, Video } from '@/types'
import type { AnalysisMovementTechnicalSummary } from './AnalysisJobCourtPositions'
import type { AnalysisShootingSummary } from './use-analysis-job-shooting-data'

interface AnalysisJobDetailsProps {
  job: ProcessingJob
  video: Video | null
  team: Team | null
  shootingSummary: AnalysisShootingSummary | null
  movementSummary: AnalysisMovementTechnicalSummary | null
}

function formatDate(value: string | null): string {
  if (!value) return 'No informado'
  return new Date(value).toLocaleString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function AnalysisJobDetails({
  job,
  video,
  team,
  shootingSummary,
  movementSummary,
}: AnalysisJobDetailsProps) {
  return (
    <section className="space-y-6" aria-labelledby="analysis-details-title">
      <div>
        <h2 id="analysis-details-title" className="text-xl font-semibold text-foreground">Detalles del análisis</h2>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Cobertura, ejecución y límites para interpretar correctamente los resultados.</p>
      </div>

      <div className="border-y border-white/10 py-5">
        <div className="flex items-center gap-2">
          <FileSearch className="h-5 w-5 text-primary" aria-hidden="true" />
          <h3 className="font-semibold text-foreground">Ejecución</h3>
        </div>
        <dl className="mt-5 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Video</dt><dd className="mt-1 text-foreground">{video?.title ?? job.videoId}</dd></div>
          <div><dt className="text-muted-foreground">Equipo</dt><dd className="mt-1 text-foreground">{team?.name ?? job.teamId}</dd></div>
        </dl>
        <details className="group mt-5 rounded-lg border border-white/10 bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/30">
            Ver datos técnicos
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="border-t border-white/10 px-4 py-4">
            <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
              <div><dt className="text-muted-foreground">Creado</dt><dd className="mt-1 text-foreground">{formatDate(job.createdAt)}</dd></div>
              <div><dt className="text-muted-foreground">Actualizado</dt><dd className="mt-1 text-foreground">{formatDate(job.updatedAt)}</dd></div>
              <div><dt className="text-muted-foreground">Inicio</dt><dd className="mt-1 text-foreground">{formatDate(job.startedAt)}</dd></div>
              <div><dt className="text-muted-foreground">Finalización</dt><dd className="mt-1 text-foreground">{formatDate(job.finishedAt)}</dd></div>
              <div className="sm:col-span-2"><dt className="text-muted-foreground">ID técnico del análisis</dt><dd className="mt-1 break-all font-mono text-xs text-foreground">{job.id}</dd></div>
              {movementSummary && (
                <>
                  <div><dt className="text-muted-foreground">Seguimientos espaciales</dt><dd className="mt-1 font-semibold text-foreground">{movementSummary.playerCount}</dd></div>
                  <div><dt className="text-muted-foreground">Registros leídos</dt><dd className="mt-1 font-semibold text-foreground">{movementSummary.coverage.recordsRead}</dd></div>
                  <div><dt className="text-muted-foreground">Registros fuera de cancha</dt><dd className="mt-1 font-semibold text-foreground">{movementSummary.coverage.recordsOffCourt}</dd></div>
                  <div><dt className="text-muted-foreground">Muestreo</dt><dd className="mt-1 font-semibold text-foreground">Cada {movementSummary.coverage.sampleEvery} registros</dd></div>
                </>
              )}
            </dl>
          </div>
        </details>
      </div>

      {(shootingSummary || movementSummary?.coverage.truncated) && (
        <div className="border-b border-white/10 pb-5">
          <h3 className="font-semibold text-foreground">Cobertura disponible</h3>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {shootingSummary && (
              <>
                <div><dt className="text-muted-foreground">Tiros detectados</dt><dd className="mt-1 font-semibold text-foreground">{shootingSummary.coverage.shotsDetected}</dd></div>
                <div><dt className="text-muted-foreground">Tiros contabilizados</dt><dd className="mt-1 font-semibold text-foreground">{shootingSummary.coverage.shotsScored}</dd></div>
                <div><dt className="text-muted-foreground">Sin posición de cancha</dt><dd className="mt-1 font-semibold text-foreground">{shootingSummary.coverage.shotsWithoutCourtPosition}</dd></div>
                <div><dt className="text-muted-foreground">Sin tirador identificado</dt><dd className="mt-1 font-semibold text-foreground">{shootingSummary.coverage.shotsWithoutShooter}</dd></div>
              </>
            )}
          </dl>
          {movementSummary?.coverage.truncated && (
            <Alert className="mt-4 flex items-start gap-3 border-information/25 bg-information/5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-information" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">La lectura de posiciones fue truncada; las métricas corresponden a los datos disponibles.</p>
            </Alert>
          )}
        </div>
      )}

      <Alert className="flex items-start gap-3 border-white/10 bg-surface p-5">
        <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="font-semibold text-foreground">Límites de interpretación</p>
          <p className="mt-1 text-sm text-muted-foreground">Las estadísticas son métricas detectadas, no un box score oficial. Las posiciones son aproximadas y no están sincronizadas con la reproducción. Los tiempos de tiro deben verificarse visualmente en el video fuente.</p>
        </div>
      </Alert>
    </section>
  )
}
