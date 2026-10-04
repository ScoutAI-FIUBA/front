import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, CircleAlert, Clapperboard, LoaderCircle, Plus, RefreshCw } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'
import { AnalysisPollingNotice } from '@/components/analysis/AnalysisPollingNotice'
import { AnalysisCatalogRow } from './AnalysisCatalogRow'
import { useAnalysisJobCatalog } from './use-analysis-job-catalog'

type AnalysisFilter = 'all' | 'active' | 'done' | 'failed'

const FILTERS: Array<{ id: AnalysisFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'En curso' },
  { id: 'done', label: 'Completados' },
  { id: 'failed', label: 'Fallidos' },
]

export function AnalysisPage() {
  const { catalog, loadState, isPollingDisconnected, isRefreshing, refresh } = useAnalysisJobCatalog()
  const [filter, setFilter] = useState<AnalysisFilter>('all')

  const items = useMemo(() => {
    const allItems = catalog?.items ?? []
    if (filter === 'active') return allItems.filter(({ job }) => job.status === 'QUEUED' || job.status === 'RUNNING')
    if (filter === 'done') return allItems.filter(({ job }) => job.status === 'DONE')
    if (filter === 'failed') return allItems.filter(({ job }) => job.status === 'FAILED')
    return allItems
  }, [catalog?.items, filter])

  return (
    <div className="mx-auto w-full max-w-[1120px] space-y-8">
      <PageHeader
        title="Análisis"
        description="Seguí el procesamiento y volvé a los resultados de tus videos."
        action={(
          <div className="lg:hidden">
            <Button asChild className="w-full sm:w-auto">
              <Link to="/analisis/nuevo"><Plus className="h-4 w-4" aria-hidden="true" />Nuevo análisis</Link>
            </Button>
          </div>
        )}
      />

      {loadState === 'loading' && !catalog && (
        <section className="space-y-4 border-y py-6" aria-live="polite" aria-busy="true">
          <div className="h-5 w-44 animate-pulse rounded bg-accent" />
          {[0, 1, 2].map((item) => (
            <div key={item} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_8rem]">
              <div className="space-y-2"><div className="h-4 w-2/3 animate-pulse rounded bg-accent" /><div className="h-3 w-1/2 animate-pulse rounded bg-accent/70" /></div>
              <div className="h-9 animate-pulse rounded bg-accent/70" />
            </div>
          ))}
          <span className="sr-only">Cargando análisis…</span>
        </section>
      )}

      {loadState === 'session-expired' && (
        <div className="flex min-h-32 items-center gap-3 border-y py-8 text-sm text-muted-foreground" role="status">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          Tu sesión terminó. Redirigiendo al ingreso…
        </div>
      )}

      {loadState === 'error' && !catalog && (
        <Alert className="flex max-w-2xl flex-col gap-4 border-destructive/25 bg-destructive/5 p-5 sm:flex-row sm:items-center">
          <CircleAlert className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0 flex-1"><p className="font-semibold text-foreground">No pudimos cargar los análisis</p><p className="mt-1 text-muted-foreground">No hubo respuesta de los servicios. Revisá la conexión y reintentá.</p></div>
          <Button variant="outline" size="sm" onClick={() => void refresh()}>Reintentar</Button>
        </Alert>
      )}

      {isPollingDisconnected && <AnalysisPollingNotice />}

      {catalog && (
        <>
          {catalog.partialFailures.some((failure) => failure.scope !== 'active-job') && (
            <Alert className="flex items-start gap-3 border-amber-500/30 bg-amber-500/5 p-4">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              <div className="min-w-0 flex-1 text-sm"><p className="font-semibold text-foreground">Mostramos los análisis que pudimos verificar</p><p className="mt-1 text-muted-foreground">Algunos videos no respondieron. El trabajo disponible se conserva mientras reintentás.</p></div>
              <Button variant="ghost" size="sm" disabled={isRefreshing} onClick={() => void refresh()}><RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} aria-hidden="true" />Reintentar</Button>
            </Alert>
          )}

          {catalog.items.length === 0 ? (
            <EmptyState
              icon={<BarChart3 className="h-5 w-5" aria-hidden="true" />}
              title={catalog.videos.length > 0 ? 'Tus videos están listos para analizar' : 'Todavía no hay análisis'}
              description={catalog.videos.length > 0 ? 'Elegí uno de tus videos listos para iniciar su análisis automático.' : 'Subí un video y ScoutAI va a organizar su procesamiento y sus resultados en este espacio.'}
              action={<Button asChild className="w-full sm:w-auto"><Link to="/analisis/nuevo">Nuevo análisis</Link></Button>}
            />
          ) : (
            <section aria-labelledby="automatic-analyses-title">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div><h2 id="automatic-analyses-title" className="text-lg font-semibold text-foreground">Análisis automáticos</h2><p className="mt-1 text-sm text-muted-foreground">{catalog.items.length} ejecuciones encontradas en tus videos</p></div>
                <div className="flex flex-wrap gap-1 rounded-lg bg-surface-subtle p-1" aria-label="Filtrar análisis">
                  {FILTERS.map((option) => (
                    <button key={option.id} type="button" className={cn('min-h-9 rounded-md px-3 text-sm font-medium transition-colors', filter === option.id ? 'bg-surface text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')} aria-pressed={filter === option.id} onClick={() => setFilter(option.id)}>{option.label}</button>
                  ))}
                </div>
              </div>
              {items.length > 0 ? <div className="mt-4 divide-y border-y">{items.map((item) => <AnalysisCatalogRow key={item.job.id} item={item} />)}</div> : <p className="mt-6 border-y py-8 text-sm text-muted-foreground">No hay análisis para este filtro.</p>}
            </section>
          )}

          <section className="flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="manual-review-title">
            <div><h2 id="manual-review-title" className="flex items-center gap-2 font-semibold text-foreground"><Clapperboard className="h-4 w-4 text-primary" aria-hidden="true" />Revisión manual</h2><p className="mt-1 text-sm text-muted-foreground">Herramientas de clips para trabajo manual y sesiones anteriores.</p></div>
            <Button asChild variant="outline" size="sm"><Link to="/revision-manual">Abrir revisión manual</Link></Button>
          </section>
        </>
      )}
    </div>
  )
}
