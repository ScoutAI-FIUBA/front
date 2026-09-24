import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CircleAlert, GitCompareArrows, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { analysisJobSimilarService } from '@/services/registry'
import type { AnalysisJobSimilarAnalyses, AnalysisJobSimilarResult, ProcessingJob } from '@/types'
import {
  analysisJobSimilarContextForJob,
  analysisJobSimilarLoadKey,
  analysisJobSimilarPath,
  formatSimilarityScore,
  loadAnalysisJobSimilar,
  similarResultsForDisplay,
} from './analysis-job-similar'

interface AnalysisJobSimilarAnalysesProps {
  job: ProcessingJob
}

type LoadState = 'idle' | 'loading' | 'success' | 'error'

function SimilarityScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-md bg-muted/50 p-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-lg font-semibold tabular-nums text-foreground">
          {formatSimilarityScore(value)}
        </span>
        <span className="text-xs text-muted-foreground">score de similitud</span>
      </dd>
    </div>
  )
}

function SimilarAnalysisCard({
  result,
  teamId,
}: {
  result: AnalysisJobSimilarResult
  teamId: string
}) {
  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-lg border bg-surface p-4 sm:p-5">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Análisis de video</p>
        <h3 className="mt-1 break-all font-mono text-sm font-semibold text-foreground">
          {result.jobId}
        </h3>
      </div>

      <dl className="grid gap-2 sm:grid-cols-3">
        <SimilarityScore label="Similitud general" value={result.score} />
        <SimilarityScore label="Similitud de tiros" value={result.shotScore} />
        <SimilarityScore label="Similitud de movimiento" value={result.movementScore} />
      </dl>

      <div className="mt-auto">
        <Button asChild variant="outline" size="sm">
          <Link to={analysisJobSimilarPath(result.jobId, teamId)}>
            Ver análisis <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </article>
  )
}

export function AnalysisJobSimilarAnalysesView({ job }: AnalysisJobSimilarAnalysesProps) {
  const { id: jobId, status: jobStatus, teamId } = job
  const context = useMemo(
    () => analysisJobSimilarContextForJob({ id: jobId, status: jobStatus, teamId }),
    [jobId, jobStatus, teamId],
  )
  const loadKey = analysisJobSimilarLoadKey(context)
  const [loadState, setLoadState] = useState<LoadState>(loadKey ? 'loading' : 'idle')
  const [similar, setSimilar] = useState<AnalysisJobSimilarAnalyses | null>(null)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true

    if (!loadKey) {
      setSimilar(null)
      setError('')
      setLoadState('idle')
      return () => {
        active = false
      }
    }

    setSimilar(null)
    setError('')
    setLoadState('loading')
    void loadAnalysisJobSimilar(context, analysisJobSimilarService).then(
      (loaded) => {
        if (!active || !loaded) return
        setSimilar(loaded)
        setLoadState('success')
      },
      () => {
        if (!active) return
        setError('No pudimos cargar esta información. Reintentá en unos segundos.')
        setLoadState('error')
      },
    )

    return () => {
      active = false
    }
  }, [context, loadKey, reloadKey])

  if (job.status !== 'DONE') return null

  if (loadState === 'loading') {
    return (
      <section className="rounded-lg border bg-surface p-5 sm:p-6" aria-busy="true" aria-live="polite">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          Cargando análisis similares…
        </div>
      </section>
    )
  }

  if (loadState === 'error' || !similar) {
    return (
      <section className="rounded-lg border bg-surface p-5 sm:p-6" aria-labelledby="similar-analyses-title">
        <h2 id="similar-analyses-title" className="font-semibold text-foreground">Análisis similares</h2>
        <Alert className="mt-4 flex flex-col gap-4 border-destructive/25 bg-destructive/5 sm:flex-row sm:items-center">
          <CircleAlert className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">No pudimos cargar los análisis similares</p>
            <p className="mt-1 break-words text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
            Reintentar
          </Button>
        </Alert>
      </section>
    )
  }

  const results = similarResultsForDisplay(similar.results)

  return (
    <section className="min-w-0 rounded-lg border bg-surface p-5 sm:p-6" aria-labelledby="similar-analyses-title">
      <div className="flex items-start gap-3">
        <GitCompareArrows className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <h2 id="similar-analyses-title" className="font-semibold text-foreground">Análisis similares</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Otros análisis completados del mismo equipo, en el orden informado por el sistema.
          </p>
        </div>
      </div>

      {results.length === 0 ? (
        <EmptyState
          className="py-8"
          icon={<GitCompareArrows className="h-5 w-5" aria-hidden="true" />}
          title="No encontramos otros análisis comparables para este equipo."
          description="El sistema no encontró resultados similares para este análisis."
        />
      ) : (
        <div className="mt-5 space-y-3">
          {results.map((result) => (
            <SimilarAnalysisCard key={result.jobId} result={result} teamId={teamId} />
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Análisis comparados por el sistema: {similar.candidatesCompared}.
      </p>
    </section>
  )
}
