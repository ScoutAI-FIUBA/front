import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CalendarDays, CircleAlert, GitCompareArrows, LoaderCircle, Video as VideoIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { analysisJobSimilarService, videoService } from '@/services/registry'
import type { AnalysisJobSimilarAnalyses, AnalysisJobSimilarResult, ProcessingJob, Video } from '@/types'
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
  teamName?: string
  presentation?: 'legacy' | 'match-report'
}

type LoadState = 'idle' | 'loading' | 'success' | 'error'

function SimilarityScore({ label, value }: { label: string; value: number }) {
  const percentage = Math.min(100, Math.max(0, value * 100))
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-foreground">{formatSimilarityScore(value)}</dd>
      <dd className="col-span-2 h-1.5 overflow-hidden rounded-full bg-surface-subtle" aria-hidden="true">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
      </dd>
    </div>
  )
}

function SimilarAnalysisCard({
  result,
  teamId,
  video,
  teamName,
}: {
  result: AnalysisJobSimilarResult
  teamId: string
  video: Video | null
  teamName?: string
}) {
  return (
    <article className="grid min-w-0 gap-5 py-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(260px,1.15fr)_auto] lg:items-center">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/35 text-primary">
          <VideoIcon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Partido comparable</p>
          <h3 className="mt-0.5 truncate font-semibold text-foreground">
            {video?.title ?? 'Video sin contexto disponible'}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {teamName && <span>{teamName}</span>}
            {video?.uploadedAt && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" aria-hidden="true" />
                {new Date(video.uploadedAt).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
          </p>
        </div>
      </div>

      <dl className="grid gap-3">
        <SimilarityScore label="Similitud general" value={result.score} />
        <SimilarityScore label="Similitud de tiros" value={result.shotScore} />
        <SimilarityScore label="Similitud de movimiento" value={result.movementScore} />
      </dl>

      <div className="flex items-center gap-3 lg:flex-col lg:items-end">
        <Button asChild variant="outline" size="sm">
          <Link to={analysisJobSimilarPath(result.jobId, teamId)}>
            Ver análisis <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
        <p className="break-all font-mono text-[10px] text-muted-foreground">ID {result.jobId}</p>
      </div>
    </article>
  )
}

function formatVideoDate(video: Video | null): string {
  if (!video?.uploadedAt) return 'Fecha no disponible'
  const date = new Date(video.uploadedAt)
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible'
  return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function SimilarAnalysisReportRow({
  result,
  teamId,
  video,
  teamName,
}: {
  result: AnalysisJobSimilarResult
  teamId: string
  video: Video | null
  teamName?: string
}) {
  const title = video?.title?.trim() || 'Sin título disponible'
  const comparisons = [
    { label: 'Similitud de tiros', value: result.shotScore },
    { label: 'Similitud de movimiento', value: result.movementScore },
  ]

  return (
    <article>
      <Link
        to={analysisJobSimilarPath(result.jobId, teamId)}
        className="group grid min-w-0 gap-6 py-6 outline-none transition-colors focus-visible:bg-white/[0.03] lg:grid-cols-[150px_minmax(0,1fr)_minmax(300px,0.75fr)_48px] lg:items-center"
        aria-label={`Abrir análisis similar: ${title}`}
      >
        <div>
          <p className="scout-display text-5xl font-extrabold tabular-nums text-[#F4F5F7]">
            {formatSimilarityScore(result.score)}
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#788397]">Similitud general</p>
        </div>

        <div className="min-w-0">
          <h3 className="scout-display truncate text-2xl font-bold text-[#F4F5F7] transition-colors group-hover:text-[#FF9A68] group-focus-visible:text-[#FF9A68]">
            {title}
          </h3>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-[#A3ABBA]">
            {teamName ? <span>{teamName}</span> : null}
            {teamName ? <span aria-hidden="true">·</span> : null}
            <span>{formatVideoDate(video)}</span>
          </p>
        </div>

        <dl className="grid gap-5 sm:grid-cols-2">
          {comparisons.map((comparison) => {
            const percentage = Math.min(100, Math.max(0, comparison.value * 100))
            return (
              <div key={comparison.label}>
                <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#788397]">{comparison.label}</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-[#F4F5F7]">{formatSimilarityScore(comparison.value)}</dd>
                <dd className="mt-2 h-1 overflow-hidden bg-[#252B38]" aria-hidden="true">
                  <span className="block h-full bg-[#A3ABBA]" style={{ width: `${percentage}%` }} />
                </dd>
              </div>
            )
          })}
        </dl>

        <span className="flex h-11 w-11 items-center justify-center justify-self-start rounded-full border border-[#3A4254] text-[#FF6A1F] transition-colors group-hover:border-[#FF6A1F] group-focus-visible:border-[#FF6A1F] lg:justify-self-end" aria-hidden="true">
          <ArrowRight className="h-5 w-5" />
        </span>
      </Link>
    </article>
  )
}

export function AnalysisJobSimilarAnalysesView({
  job,
  teamName,
  presentation = 'legacy',
}: AnalysisJobSimilarAnalysesProps) {
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
  const [videosById, setVideosById] = useState<Map<string, Video>>(new Map())

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

  useEffect(() => {
    let active = true
    if (!similar || similar.results.length === 0) {
      setVideosById(new Map())
      return () => { active = false }
    }

    void videoService.filterByTeam(teamId).then(
      (videos) => {
        if (active) setVideosById(new Map(videos.map((video) => [video.id, video])))
      },
      () => {
        if (active) setVideosById(new Map())
      },
    )
    return () => { active = false }
  }, [similar, teamId])

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

  if (presentation === 'match-report') {
    return (
      <section className="min-w-0 space-y-6" aria-labelledby="similar-analyses-title">
        <header className="flex flex-col gap-3 border-b border-[#252B38] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#788397]">Comparación del equipo</p>
            <h2 id="similar-analyses-title" className="scout-display mt-2 text-4xl font-extrabold text-[#F4F5F7]">Partidos similares</h2>
            <p className="mt-2 max-w-2xl text-sm text-[#A3ABBA]">Similitud general, de tiros y de movimiento según el análisis disponible.</p>
          </div>
          <p className="text-xs text-[#788397]">{similar.candidatesCompared} análisis comparados</p>
        </header>

        {results.length === 0 ? (
          <EmptyState
            className="border-y border-[#252B38] py-10"
            icon={<GitCompareArrows className="h-5 w-5" aria-hidden="true" />}
            title="No encontramos otros análisis comparables para este equipo."
            description="El sistema no encontró resultados similares para este análisis."
          />
        ) : (
          <div className="divide-y divide-[#252B38] border-y border-[#252B38]">
            {results.map((result) => (
              <SimilarAnalysisReportRow
                key={result.jobId}
                result={result}
                teamId={teamId}
                video={videosById.get(result.videoId) ?? null}
                teamName={teamName}
              />
            ))}
          </div>
        )}

        <p className="text-xs text-[#788397]">Los porcentajes son puntajes de similitud devueltos por el análisis.</p>
      </section>
    )
  }

  return (
    <section className="min-w-0 space-y-5" aria-labelledby="similar-analyses-title">
      <div className="min-w-0">
        <h2 id="similar-analyses-title" className="text-xl font-semibold text-foreground">Partidos similares</h2>
        <p className="mt-1 text-sm text-muted-foreground">Compará patrones de tiro y movimiento con otros análisis del equipo.</p>
      </div>

      {results.length === 0 ? (
        <EmptyState
          className="py-8"
          icon={<GitCompareArrows className="h-5 w-5" aria-hidden="true" />}
          title="No encontramos otros análisis comparables para este equipo."
          description="El sistema no encontró resultados similares para este análisis."
        />
      ) : (
        <div className="divide-y divide-white/10 border-y border-white/10">
          {results.map((result) => (
            <SimilarAnalysisCard
              key={result.jobId}
              result={result}
              teamId={teamId}
              video={videosById.get(result.videoId) ?? null}
              teamName={teamName}
            />
          ))}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Análisis comparados por el sistema: {similar.candidatesCompared}.
      </p>
    </section>
  )
}
