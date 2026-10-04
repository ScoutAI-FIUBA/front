import { ArrowRight, CircleAlert, LoaderCircle, Play, Plus, Video as VideoIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { AnalysisCatalogRow } from '@/pages/analysis/AnalysisCatalogRow'
import { analysisJobDetailPath } from '@/pages/analysis/analysis-job-detail'
import { useAnalysisJobCatalog } from '@/pages/analysis/use-analysis-job-catalog'
import { latestVideoAnalysisJob, videoMaterialLabel, videoMaterialState, videoPrimaryAnalysisAction } from '@/pages/videos/video-library-filters'
import { formatDate } from '@/lib/utils'

export function DashboardPage() {
  const { catalog, loadState, refresh } = useAnalysisJobCatalog()
  const active = catalog?.items.filter(({ job }) => job.status === 'QUEUED' || job.status === 'RUNNING') ?? []
  const completed = catalog?.items.filter(({ job }) => job.status === 'DONE').slice(0, 3) ?? []
  const recentVideos = catalog?.videos.slice(0, 3) ?? []
  const jobs = catalog?.items.map((item) => item.job) ?? []
  const hasWork = active.length > 0 || completed.length > 0 || recentVideos.length > 0

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-8">
      <PageHeader
        title="Inicio"
        description="Seguí lo que está en proceso y retomá resultados recientes."
        action={<div className="lg:hidden"><Button asChild className="w-full sm:w-auto"><Link to="/analisis/nuevo"><Plus className="h-4 w-4" />Nuevo análisis</Link></Button></div>}
      />

      {loadState === 'loading' && !catalog && (
        <section className="space-y-5 border-y py-8" aria-busy="true" aria-live="polite">
          <div className="h-5 w-48 animate-pulse rounded bg-accent" />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)]"><div className="h-44 animate-pulse rounded-lg bg-accent/60" /><div className="h-44 animate-pulse rounded-lg bg-accent/40" /></div>
          <span className="sr-only">Cargando actividad…</span>
        </section>
      )}

      {loadState === 'session-expired' && <div className="flex min-h-32 items-center gap-3 border-y py-8 text-sm text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin text-primary" />Tu sesión terminó. Redirigiendo al ingreso…</div>}

      {loadState === 'error' && !catalog && (
        <Alert className="flex max-w-2xl flex-col gap-4 border-destructive/25 bg-destructive/5 p-5 sm:flex-row sm:items-center"><CircleAlert className="h-5 w-5 shrink-0 text-destructive" /><div className="min-w-0 flex-1"><p className="font-semibold">No pudimos cargar tu actividad</p><p className="mt-1 text-sm text-muted-foreground">No hubo respuesta de los servicios. Revisá la conexión y reintentá.</p></div><Button variant="outline" size="sm" onClick={() => void refresh()}>Reintentar</Button></Alert>
      )}

      {catalog && !hasWork && (
        <EmptyState
          icon={<VideoIcon className="h-5 w-5" />}
          title="Subí tu primer video"
          description="El análisis automático empieza con material listo. Después vas a poder seguir su procesamiento y revisar la evidencia desde acá."
          action={<Button asChild className="w-full sm:w-auto"><Link to="/videos/subir">Subir video<ArrowRight className="h-4 w-4" /></Link></Button>}
        />
      )}

      {catalog && hasWork && (
        <>
          {catalog.partialFailures.length > 0 && <Alert className="flex items-start gap-3 border-amber-500/30 bg-amber-500/5 p-4"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><div><p className="text-sm font-semibold">Actividad parcialmente actualizada</p><p className="mt-1 text-sm text-muted-foreground">Conservamos los análisis y videos disponibles mientras algunos historiales vuelven a responder.</p></div></Alert>}

          {active.length > 0 && (
            <section aria-labelledby="active-analysis-title">
              <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Ahora</p><h2 id="active-analysis-title" className="mt-1 text-xl font-semibold">Análisis en curso</h2></div><Link className="text-sm font-medium text-primary hover:underline" to="/analisis">Ver todos</Link></div>
              <div className="mt-4 divide-y border-y">{active.map((item) => <AnalysisCatalogRow key={item.job.id} item={item} compact />)}</div>
            </section>
          )}

          <div className="space-y-10">
            <section className={active.length > 0 ? 'border-t pt-8' : undefined} aria-labelledby="recent-results-title">
              <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Resultados</p><h2 id="recent-results-title" className="mt-1 text-xl font-semibold">Análisis recientes</h2></div>{completed.length > 0 && <Link className="text-sm font-medium text-primary hover:underline" to="/analisis">Ver todos</Link>}</div>
              {completed.length > 0 ? <div className="mt-4 divide-y border-y">{completed.map((item) => <AnalysisCatalogRow key={item.job.id} item={item} compact />)}</div> : <div className="mt-4 border-y py-8"><p className="font-medium">Todavía no hay resultados terminados</p><p className="mt-1 text-sm text-muted-foreground">Podés iniciar un análisis con uno de tus videos listos.</p><Button asChild size="sm" className="mt-4"><Link to="/analisis/nuevo">Nuevo análisis</Link></Button></div>}
            </section>

            <section className="border-t pt-8" aria-labelledby="recent-videos-title">
              <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Material</p><h2 id="recent-videos-title" className="mt-1 text-xl font-semibold">Videos recientes</h2></div><Link className="text-sm font-medium text-primary hover:underline" to="/videos">Biblioteca</Link></div>
              <div className="mt-4 divide-y border-y">
                {recentVideos.map((video) => {
                  const team = catalog.teams.find((candidate) => candidate.id === video.teamId)
                  const materialState = videoMaterialState(video)
                  const latestJob = latestVideoAnalysisJob(video.id, jobs)
                  const analysisAction = videoPrimaryAnalysisAction(video, latestJob, 'Analizar')
                  const analysisPath = analysisAction?.type === 'analysis-job'
                    ? analysisJobDetailPath(analysisAction.job)
                    : `/analisis/nuevo?team_id=${encodeURIComponent(video.teamId)}&video_id=${encodeURIComponent(video.id)}`
                  return <article key={video.id} className="py-4 sm:flex sm:items-center sm:justify-between sm:gap-6"><div className="flex min-w-0 flex-1 items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold">{video.title}</h3><p className="mt-1 text-sm text-muted-foreground">{team?.name ?? 'Equipo'} · {formatDate(video.uploadedAt)}</p></div><Badge variant={materialState === 'failed' ? 'failed' : materialState === 'preparing' ? 'processing' : 'uploaded'}>{videoMaterialLabel(materialState)}</Badge></div><div className="mt-3 flex shrink-0 flex-wrap gap-2 sm:mt-0">{analysisAction && <Button asChild variant="outline" size="sm"><Link to={analysisPath}>{analysisAction.type === 'new-analysis' ? <Play className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}{analysisAction.label}</Link></Button>}<Button asChild variant="ghost" size="sm"><Link to={`/videos?team_id=${encodeURIComponent(video.teamId)}`}>Ver en Videos</Link></Button></div></article>
                })}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
