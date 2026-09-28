import { ArrowRight, CircleAlert, Clock3, LoaderCircle, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ProcessingShotArc } from '@/components/analysis/ProcessingShotArc'
import type { ProcessingJob } from '@/types'
import { AnalysisJobTeamSideSelector } from './AnalysisJobTeamSide'
import type { AnalysisShootingSummary } from './AnalysisJobShotsWorkspace'

type WorkspaceModule = 'overview' | 'shots' | 'movement' | 'similar' | 'details'

interface AnalysisJobOverviewProps {
  job: ProcessingJob
  shootingSummary: AnalysisShootingSummary | null
  onJobUpdated: (job: ProcessingJob) => void
  onNavigate: (module: WorkspaceModule) => void
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function elapsedLabel(startedAt: string | null): string | null {
  if (!startedAt) return null
  const elapsedMs = Math.max(0, Date.now() - Date.parse(startedAt))
  const minutes = Math.floor(elapsedMs / 60_000)
  if (minutes < 1) return 'menos de un minuto'
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return hours > 0 ? `${hours} h ${remainder} min` : `${minutes} min`
}

export function AnalysisJobOverview({
  job,
  shootingSummary,
  onJobUpdated,
  onNavigate,
}: AnalysisJobOverviewProps) {
  if (job.status === 'QUEUED') {
    return (
      <section className="space-y-5" aria-labelledby="overview-title">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Estado del análisis</p>
          <h2 id="overview-title" className="mt-1 text-xl font-semibold text-foreground">Esperando para comenzar</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">El trabajo está en cola. Esta pantalla se actualizará cuando el procesamiento comience.</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-surface p-5" aria-live="polite">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">En cola</p>
            <p className="mt-1 text-sm text-muted-foreground">Solicitado {formatDate(job.createdAt)}</p>
          </div>
        </div>
      </section>
    )
  }

  if (job.status === 'RUNNING') {
    const elapsed = elapsedLabel(job.startedAt)
    return (
      <section className="space-y-5" aria-labelledby="overview-title">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Estado del análisis</p>
          <h2 id="overview-title" className="mt-1 text-xl font-semibold text-foreground">Procesando el video</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Los resultados aparecerán aquí cuando el procesamiento termine.</p>
        </div>
        <div className="rounded-xl bg-surface p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-foreground">Análisis en curso</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {job.startedAt ? `Iniciado ${formatDate(job.startedAt)}` : 'El servidor todavía no informó la hora de inicio.'}
                {elapsed ? ` · Transcurrido ${elapsed}` : ''}
              </p>
            </div>
            {job.progressPercent != null && <span className="text-lg font-semibold tabular-nums text-primary">{job.progressPercent}%</span>}
          </div>
          {job.progressPercent != null ? (
            <>
              <ProcessingShotArc progressPercent={job.progressPercent} />
              <Progress className="mt-4" value={job.progressPercent} aria-label={`Progreso del análisis: ${job.progressPercent}%`} />
            </>
          ) : (
            <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <LoaderCircle className="h-4 w-4 animate-spin text-information motion-reduce:animate-none" aria-hidden="true" />
              Procesando sin porcentaje informado.
            </div>
          )}
        </div>
      </section>
    )
  }

  if (job.status === 'FAILED') {
    return (
      <section className="space-y-5" aria-labelledby="overview-title">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-destructive">Análisis interrumpido</p>
          <h2 id="overview-title" className="mt-1 text-xl font-semibold text-foreground">No pudimos completar este análisis</h2>
        </div>
        <Alert className="flex items-start gap-3 border-destructive/25 bg-destructive/5 p-5">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">El procesamiento finalizó con un error</p>
            <p className="mt-1 text-sm text-muted-foreground">El video sigue disponible. Podés volver a su historial para iniciar un análisis nuevo cuando corresponda.</p>
          </div>
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link to={`/videos?team_id=${encodeURIComponent(job.teamId)}`}>Volver a Videos</Link></Button>
          <Button type="button" variant="outline" onClick={() => onNavigate('details')}>Ver detalles técnicos</Button>
        </div>
      </section>
    )
  }

  const teamStats = shootingSummary?.team
  return (
    <section className="space-y-6" aria-labelledby="overview-title">
      <div>
        <h2 id="overview-title" className="text-xl font-semibold text-foreground">Resumen del partido</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Confirmá tu equipo y entrá directo a los tiros o al movimiento en cancha.</p>
      </div>

      <AnalysisJobTeamSideSelector job={job} onJobUpdated={onJobUpdated} />

      {job.ourTeamSide != null && teamStats && (
        <dl className="grid grid-cols-2 border-y border-white/10 sm:grid-cols-4 sm:divide-x sm:divide-white/10">
          {[
            ['Puntos detectados', teamStats.points],
            ['Tiros de campo', `${teamStats.fieldGoalsMade}/${teamStats.fieldGoalsAttempted}`],
            ['Tiros detectados', shootingSummary.coverage.shotsDetected],
            ['Seguimientos', shootingSummary.coverage.playersTracked],
          ].map(([label, value]) => (
            <div key={label} className="px-3 py-4 sm:px-4">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {job.ourTeamSide != null && !teamStats && (
        <div className="flex items-center gap-3 rounded-xl bg-surface px-5 py-4 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          Preparando la orientación de resultados…
        </div>
      )}

      <div className="divide-y divide-white/10 border-y border-white/10">
        <button type="button" className="group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-4 text-left" onClick={() => onNavigate('shots')}>
          <Target className="h-5 w-5 text-primary" aria-hidden="true" />
          <span><span className="block font-semibold text-foreground">Revisar tiros</span><span className="mt-0.5 block text-sm text-muted-foreground">Cancha, resultado y evidencia de cada lanzamiento.</span></span>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary motion-reduce:transition-none" aria-hidden="true" />
        </button>
        <button type="button" className="group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-4 text-left" onClick={() => onNavigate('movement')}>
          <Clock3 className="h-5 w-5 text-primary" aria-hidden="true" />
          <span><span className="block font-semibold text-foreground">Seguir movimiento</span><span className="mt-0.5 block text-sm text-muted-foreground">Recorrido individual y concentración espacial por jugador.</span></span>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary motion-reduce:transition-none" aria-hidden="true" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground">Análisis finalizado {job.finishedAt ? formatDate(job.finishedAt) : 'sin hora informada'}.</p>
    </section>
  )
}
