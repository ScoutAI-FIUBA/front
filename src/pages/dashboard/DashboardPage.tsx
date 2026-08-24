import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronRight, CircleAlert, LoaderCircle, Video } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { StatusIndicator } from '@/components/ui/status-indicator'
import { analysisService } from '@/services/registry'
import { formatDate } from '@/lib/utils'

type LoadState = 'loading' | 'success' | 'error'

interface RecentAnalysis {
  id: string
  title: string
  videoTitle: string
  savedAt: string
  clipCount: number
}

export function DashboardPage() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [recentAnalyses, setRecentAnalyses] = useState<RecentAnalysis[]>([])

  const loadRecentAnalyses = useCallback(async () => {
    setLoadState('loading')

    try {
      const sessions = await analysisService.listSessions()
      const details = await Promise.all(
        sessions.map((session) => analysisService.getBySessionId(session.id)),
      )

      // Only user-saved manual analyses expose trustworthy saved dates and clip counts.
      // Seed/demo sessions remain available in /analisis but are intentionally omitted here.
      const usableAnalyses = details
        .flatMap<RecentAnalysis>((detail) => {
          if (!detail?.manualAnalysis) return []

          return [{
            id: detail.session.id,
            title: detail.manualAnalysis.name,
            videoTitle: detail.video.title,
            savedAt: detail.manualAnalysis.savedAt,
            clipCount: detail.manualAnalysis.clips.length,
          }]
        })
        .sort((left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt))

      setRecentAnalyses(usableAnalyses)
      setLoadState('success')
    } catch {
      setRecentAnalyses([])
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    void loadRecentAnalyses()
  }, [loadRecentAnalyses])

  const latestAnalysis = recentAnalyses[0]
  const olderAnalyses = recentAnalyses.slice(1, 4)
  const hasHiddenAnalyses = recentAnalyses.length > 4

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-6">
      <PageHeader
        title="Inicio"
        description="Retomá tu trabajo de análisis o empezá uno nuevo."
      />

      {loadState === 'loading' && (
        <section
          className="flex min-h-48 items-center gap-3 border-y py-10 text-sm text-muted-foreground"
          aria-live="polite"
          aria-busy="true"
        >
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          Cargando tu trabajo…
        </section>
      )}

      {loadState === 'error' && (
        <Alert className="flex max-w-2xl flex-col gap-4 border-destructive/25 bg-destructive/5 p-5 sm:flex-row sm:items-center">
          <CircleAlert className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">No pudimos cargar tu trabajo</p>
            <p className="mt-1 text-muted-foreground">
              Revisá la conexión y volvé a intentarlo para consultar tus análisis guardados.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadRecentAnalyses()}>
            Reintentar
          </Button>
        </Alert>
      )}

      {loadState === 'success' && !latestAnalysis && (
        <EmptyState
          icon={<Video className="h-5 w-5" aria-hidden="true" />}
          title="Empezá tu primer análisis"
          description="Cargá un video, marcá los momentos importantes y organizá tus clips en un mismo espacio de trabajo."
          action={(
            <Button asChild className="w-full sm:w-auto">
              <Link to="/analisis/nuevo">
                Empezar análisis
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          )}
        />
      )}

      {loadState === 'success' && latestAnalysis && (
        <div className="space-y-8">
          <section className="rounded-lg border bg-surface p-5 sm:p-6" aria-labelledby="latest-analysis-title">
            <StatusIndicator state="success">Listo para revisar</StatusIndicator>
            <div className="mt-4 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0">
                <h2 id="latest-analysis-title" className="text-xl font-semibold tracking-tight text-foreground">
                  {latestAnalysis.title}
                </h2>
                <p className="mt-1 truncate text-sm text-muted-foreground">{latestAnalysis.videoTitle}</p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  <span>Guardado el {formatDate(latestAnalysis.savedAt)}</span>
                  <span>{latestAnalysis.clipCount} {latestAnalysis.clipCount === 1 ? 'clip' : 'clips'}</span>
                </div>
              </div>
              <Button asChild className="w-full md:w-auto">
                <Link to={`/analisis/${latestAnalysis.id}`}>
                  Revisar análisis
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </section>

          {olderAnalyses.length > 0 && (
            <section aria-labelledby="recent-work-title">
              <div className="flex items-center justify-between gap-4">
                <h2 id="recent-work-title" className="text-lg font-semibold text-foreground">
                  Trabajo reciente
                </h2>
                {hasHiddenAnalyses && (
                  <Link to="/analisis" className="text-sm font-medium text-primary hover:underline">
                    Ver todos los análisis
                  </Link>
                )}
              </div>
              <div className="mt-4 divide-y border-y">
                {olderAnalyses.map((analysis) => (
                  <Link
                    key={analysis.id}
                    to={`/analisis/${analysis.id}`}
                    className="group flex items-center gap-4 px-1 py-4 transition-colors hover:bg-surface-subtle sm:px-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{analysis.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatDate(analysis.savedAt)} · {analysis.clipCount}{' '}
                        {analysis.clipCount === 1 ? 'clip' : 'clips'}
                      </p>
                    </div>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

