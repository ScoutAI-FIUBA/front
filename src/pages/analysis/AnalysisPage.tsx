import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BarChart3, CircleAlert, LoaderCircle, Plus } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Progress } from '@/components/ui/progress'
import { StatusIndicator } from '@/components/ui/status-indicator'
import { analysisService } from '@/services/registry'
import type { AnalysisSession, AnalysisStatus } from '@/types'

type LoadState = 'loading' | 'success' | 'error'

const statusLabels: Record<AnalysisStatus, string> = {
  pending: 'Pendiente',
  processing: 'En proceso',
  completed: 'Completado',
}

function SessionStatus({ status }: { status: AnalysisStatus }) {
  if (status === 'completed') {
    return <StatusIndicator state="success">{statusLabels[status]}</StatusIndicator>
  }

  if (status === 'processing') {
    return <StatusIndicator state="information">{statusLabels[status]}</StatusIndicator>
  }

  return <StatusIndicator>{statusLabels[status]}</StatusIndicator>
}

function sessionActionLabel(status: AnalysisStatus): string {
  if (status === 'completed') return 'Revisar análisis'
  if (status === 'processing') return 'Ver progreso'
  return 'Ver estado'
}

export function AnalysisPage() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [sessions, setSessions] = useState<AnalysisSession[]>([])

  const loadSessions = useCallback(async () => {
    setLoadState('loading')

    try {
      // The list contract already contains the reliable status metadata needed here.
      // Avoid per-row detail hydration until the backend exposes a summary contract.
      const data = await analysisService.listSessions()
      setSessions(data)
      setLoadState('success')
    } catch {
      setSessions([])
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-8">
      <PageHeader
        title="Análisis"
        description="Consultá el estado de tus análisis y revisá los resultados disponibles."
        action={(
          <Button asChild className="w-full sm:w-auto">
            <Link to="/analisis/nuevo">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Empezar análisis
            </Link>
          </Button>
        )}
      />

      {loadState === 'loading' && (
        <section
          className="flex min-h-48 items-center gap-3 border-y py-10 text-sm text-muted-foreground"
          aria-live="polite"
          aria-busy="true"
        >
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          Cargando análisis…
        </section>
      )}

      {loadState === 'error' && (
        <Alert className="flex max-w-2xl flex-col gap-4 border-destructive/25 bg-destructive/5 p-5 sm:flex-row sm:items-center">
          <CircleAlert className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">No pudimos cargar los análisis</p>
            <p className="mt-1 text-muted-foreground">
              Revisá la conexión y volvé a intentarlo para consultar el estado de tu trabajo.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadSessions()}>
            Reintentar
          </Button>
        </Alert>
      )}

      {loadState === 'success' && sessions.length === 0 && (
        <EmptyState
          icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
          title="Todavía no hay análisis"
          description="Elegí un video, marcá los momentos importantes y guardá tu primer análisis para revisarlo acá."
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

      {loadState === 'success' && sessions.length > 0 && (
        <section aria-labelledby="analysis-work-title">
          <div>
            <h2 id="analysis-work-title" className="text-lg font-semibold text-foreground">
              Tu trabajo
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {sessions.length} análisis
            </p>
          </div>

          <div className="mt-4 divide-y border-y">
            {sessions.map((session) => (
              <article
                key={session.id}
                className="flex flex-col gap-4 px-1 py-5 sm:px-3 md:flex-row md:items-center md:gap-8"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="truncate text-base font-semibold text-foreground">
                      Análisis {session.sessionCode}
                    </h3>
                    <SessionStatus status={session.status} />
                  </div>

                  {session.status === 'processing' && (
                    <div className="mt-4 max-w-2xl">
                      <Progress
                        value={session.progressPercent}
                        aria-label={`Progreso del análisis: ${session.progressPercent}%`}
                      />
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>{session.progressPercent}% procesado</span>
                        <span>Tiempo restante: {session.remainingTime}</span>
                      </div>
                    </div>
                  )}

                  {session.status === 'pending' && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      El análisis está esperando para comenzar.
                    </p>
                  )}

                  {session.status === 'completed' && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Los resultados están disponibles para revisión.
                    </p>
                  )}
                </div>

                <Button
                  asChild
                  variant={session.status === 'completed' ? 'outline' : 'ghost'}
                  size="sm"
                  className="w-full md:w-auto"
                >
                  <Link to={`/analisis/${session.id}`}>
                    {sessionActionLabel(session.status)}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

