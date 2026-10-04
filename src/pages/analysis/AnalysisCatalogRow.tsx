import { ArrowRight, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { StatusIndicator } from '@/components/ui/status-indicator'
import { cn } from '@/lib/utils'
import { analysisJobDetailActionLabel, analysisJobDetailPath } from './analysis-job-detail'
import type { AnalysisCatalogItem } from './analysis-job-catalog'
import { getAnalysisJobPresentation } from '@/pages/videos/analysis-job-presentation'

function formatAnalysisDate(value: string): string {
  return new Date(value).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(durationMs: number | undefined): string | null {
  if (!durationMs || durationMs <= 0) return null
  const minutes = Math.round(durationMs / 60_000)
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return `${hours} h${remainder ? ` ${remainder} min` : ''}`
}

export function AnalysisCatalogRow({
  item,
  compact = false,
}: {
  item: AnalysisCatalogItem
  compact?: boolean
}) {
  const { job, video, team } = item
  const presentation = getAnalysisJobPresentation(job)
  const actionLabel = analysisJobDetailActionLabel(job)
  const duration = formatDuration(video.durationMs)
  const relevantDate = job.finishedAt ?? job.startedAt ?? job.createdAt
  const hasProgress = job.status === 'RUNNING' && job.progressPercent != null

  return (
    <article className={cn('py-5', compact ? 'px-0' : 'px-1 sm:px-3')}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-foreground">{video.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {team.name} · {formatAnalysisDate(relevantDate)}{duration ? ` · ${duration}` : ''}
              </p>
            </div>
            <StatusIndicator state={presentation.indicatorState}>{presentation.label}</StatusIndicator>
          </div>

          {hasProgress && (
            <div className="mt-3 max-w-xl">
              <Progress value={job.progressPercent ?? undefined} aria-label={`Progreso del análisis: ${job.progressPercent}%`} />
              <p className="mt-1.5 text-xs text-muted-foreground">{job.progressPercent}% procesado</p>
            </div>
          )}

          {job.status === 'RUNNING' && !hasProgress && (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <LoaderCircle className="h-4 w-4 animate-spin text-information" aria-hidden="true" />
              Procesando sin porcentaje informado
            </p>
          )}
        </div>

        {actionLabel && (
          <Button asChild variant={job.status === 'RUNNING' ? 'default' : 'outline'} size="sm" className="w-full md:w-auto">
            <Link to={analysisJobDetailPath(job)}>
              {actionLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
    </article>
  )
}
