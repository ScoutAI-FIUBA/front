import { Fragment, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, BarChart2, ChevronDown, CircleAlert, FolderOpen, LoaderCircle, Play, Plus, Video as VideoIcon } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ProcessingJob, Team, Video } from '@/types'
import { formatDate } from '@/lib/utils'
import { VideoAnalysisJobs } from './VideoAnalysisJobs'
import { ALL_VIDEO_TEAMS_FILTER, resolveVideoTeamFilter, VIDEO_TEAM_QUERY_PARAM, withVideoTeamFilter } from './video-team-navigation'
import { VIDEOS_DESKTOP_BREAKPOINT_PX, videosLayoutForViewport, type VideosLayout } from './video-responsive'
import { VideoPlaybackDialog } from './VideoPlaybackDialog'
import { canOpenVideoPlayback } from './video-playback'
import { videoUploadPath } from './video-upload-navigation'
import { analysisJobDetailPath } from '@/pages/analysis/analysis-job-detail'
import { AnalysisPollingNotice } from '@/components/analysis/AnalysisPollingNotice'
import { useAnalysisJobCatalog } from '@/pages/analysis/use-analysis-job-catalog'
import {
  filterVideoLibrary,
  latestVideoAnalysisJob,
  videoAnalysisLabel,
  videoAnalysisState,
  videoMaterialLabel,
  videoMaterialState,
  videoPrimaryAnalysisAction,
  type VideoAnalysisFilter,
  type VideoMaterialFilter,
} from './video-library-filters'

const MATERIAL_FILTERS = new Set<VideoMaterialFilter>(['all', 'ready', 'preparing', 'failed'])
const ANALYSIS_FILTERS = new Set<VideoAnalysisFilter>(['all', 'none', 'QUEUED', 'RUNNING', 'DONE', 'FAILED'])

function materialVariant(state: ReturnType<typeof videoMaterialState>): 'uploaded' | 'processing' | 'failed' {
  if (state === 'preparing') return 'processing'
  if (state === 'failed') return 'failed'
  return 'uploaded'
}

interface VideoActionsProps {
  video: Video
  latestJob: ProcessingJob | null
  historyOpen: boolean
  layout: VideosLayout
  onToggleHistory: () => void
  onPlayVideo: (video: Video) => void
}

function VideoActions({ video, latestJob, historyOpen, layout, onToggleHistory, onPlayVideo }: VideoActionsProps) {
  const analysisAction = videoPrimaryAnalysisAction(video, latestJob)

  return (
    <div className={layout === 'cards' ? 'space-y-1.5' : 'flex flex-wrap items-center gap-1'}>
      <div className="flex flex-wrap items-center gap-2">
        {canOpenVideoPlayback(video) && <Button variant="outline" size="sm" onClick={() => onPlayVideo(video)}><Play className="h-4 w-4" aria-hidden="true" />Ver video</Button>}
        {analysisAction?.type === 'analysis-job' ? (
          <Button asChild size="sm"><Link to={analysisJobDetailPath(analysisAction.job)}>{analysisAction.label}<ArrowRight className="h-4 w-4" /></Link></Button>
        ) : analysisAction ? (
          <Button asChild size="sm"><Link to={`/analisis/nuevo?team_id=${encodeURIComponent(video.teamId)}&video_id=${encodeURIComponent(video.id)}`}>{analysisAction.label}<ArrowRight className="h-4 w-4" /></Link></Button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Button asChild variant="ghost" size="sm" className="px-2"><Link to={`/videos/${video.id}/colecciones`}><FolderOpen className="h-4 w-4" />Clips</Link></Button>
        <Button variant="ghost" size="sm" className="px-2" aria-label="Historial de análisis" aria-expanded={historyOpen} aria-controls={`video-analysis-history-${video.id}`} onClick={onToggleHistory}><BarChart2 className="h-4 w-4" />Historial<ChevronDown className={`h-4 w-4 transition-transform ${historyOpen ? 'rotate-180' : ''}`} /></Button>
      </div>
    </div>
  )
}

function useVideosLayout(): VideosLayout {
  const [layout, setLayout] = useState<VideosLayout>(() => typeof window === 'undefined' ? 'table' : videosLayoutForViewport(window.innerWidth))
  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${VIDEOS_DESKTOP_BREAKPOINT_PX}px)`)
    const updateLayout = () => setLayout(mediaQuery.matches ? 'table' : 'cards')
    updateLayout()
    mediaQuery.addEventListener('change', updateLayout)
    return () => mediaQuery.removeEventListener('change', updateLayout)
  }, [])
  return layout
}

export function VideosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { catalog, loadState, isPollingDisconnected, refresh } = useAnalysisJobCatalog()
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null)
  const [playbackVideo, setPlaybackVideo] = useState<Video | null>(null)
  const videosLayout = useVideosLayout()

  const videos = catalog?.videos ?? []
  const teams = catalog?.teams ?? []
  const jobs = catalog?.items.map((item) => item.job) ?? []
  const teamFilter = resolveVideoTeamFilter(searchParams, teams)
  const requestedMaterial = searchParams.get('video_status') as VideoMaterialFilter | null
  const requestedAnalysis = searchParams.get('analysis_status') as VideoAnalysisFilter | null
  const materialFilter = requestedMaterial && MATERIAL_FILTERS.has(requestedMaterial) ? requestedMaterial : 'all'
  const analysisFilter = requestedAnalysis && ANALYSIS_FILTERS.has(requestedAnalysis) ? requestedAnalysis : 'all'

  useEffect(() => {
    if (!catalog || !searchParams.has(VIDEO_TEAM_QUERY_PARAM) || teamFilter !== ALL_VIDEO_TEAMS_FILTER) return
    setSearchParams(withVideoTeamFilter(searchParams, ALL_VIDEO_TEAMS_FILTER), { replace: true })
  }, [catalog, searchParams, setSearchParams, teamFilter])

  const changeFilter = (key: 'video_status' | 'analysis_status', value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'all') next.delete(key)
    else next.set(key, value)
    setSearchParams(next)
  }
  const filtered = filterVideoLibrary(videos, { teamId: teamFilter, material: materialFilter, analysis: analysisFilter, jobs, loadedJobVideoIds: catalog?.loadedJobVideoIds ?? [] })
  const teamName = (id: string) => teams.find((team: Team) => team.id === id)?.name ?? 'Equipo'
  const uploadLink = videoUploadPath({ teamId: teamFilter === 'all' ? undefined : teamFilter, returnTo: teamFilter === 'all' ? '/videos' : `/videos?team_id=${encodeURIComponent(teamFilter)}` })
  const contentColumnClass = 'lg:col-span-4'

  return (
    <div className="mx-auto w-full max-w-[1320px] space-y-6">
      <PageHeader title="Videos" description="Tu biblioteca de material: reproducí, organizá clips o iniciá un análisis." action={<Button asChild><Link to={uploadLink}><Plus className="h-4 w-4" />Subir video</Link></Button>} />

      {loadState === 'loading' && !catalog && <section className="space-y-4 border-y py-8" aria-busy="true"><div className="h-5 w-48 animate-pulse rounded bg-accent" /><div className="h-40 animate-pulse rounded-lg bg-accent/50" /><span className="sr-only">Cargando videos…</span></section>}
      {loadState === 'session-expired' && <div className="flex min-h-32 items-center gap-3 border-y py-8 text-sm text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin text-primary" />Tu sesión terminó. Redirigiendo al ingreso…</div>}
      {loadState === 'error' && !catalog && <Alert className="flex max-w-2xl flex-col gap-4 border-destructive/25 bg-destructive/5 p-5 sm:flex-row sm:items-center"><CircleAlert className="h-5 w-5 shrink-0 text-destructive" /><div className="min-w-0 flex-1"><p className="font-semibold">No pudimos cargar los videos</p><p className="mt-1 text-sm text-muted-foreground">No hubo respuesta de los servicios. Revisá la conexión y reintentá.</p></div><Button variant="outline" size="sm" onClick={() => void refresh()}>Reintentar</Button></Alert>}

      {isPollingDisconnected && <AnalysisPollingNotice />}

      {catalog && (
        <>
          {catalog.partialFailures.some((failure) => failure.scope !== 'active-job') && <Alert className="flex items-start gap-3 border-amber-500/30 bg-amber-500/5 p-4"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><div><p className="text-sm font-semibold">Algunos historiales no están disponibles</p><p className="mt-1 text-sm text-muted-foreground">La biblioteca permanece visible. Los videos no verificados no se clasifican como “Sin análisis”.</p></div></Alert>}

          <section className="border-y py-4" aria-label="Filtros de la biblioteca">
            <div className="grid gap-3 sm:grid-cols-3">
              <Select value={teamFilter} onValueChange={(value) => setSearchParams(withVideoTeamFilter(searchParams, value))}><SelectTrigger aria-label="Filtrar por equipo"><SelectValue placeholder="Equipo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los equipos</SelectItem>{teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}</SelectContent></Select>
              <Select value={materialFilter} onValueChange={(value) => changeFilter('video_status', value)}><SelectTrigger aria-label="Estado del video"><SelectValue placeholder="Estado del video" /></SelectTrigger><SelectContent><SelectItem value="all">Cualquier estado del video</SelectItem><SelectItem value="ready">Listo</SelectItem><SelectItem value="preparing">Preparando archivo</SelectItem><SelectItem value="failed">Error</SelectItem></SelectContent></Select>
              <Select value={analysisFilter} onValueChange={(value) => changeFilter('analysis_status', value)}><SelectTrigger aria-label="Estado del análisis"><SelectValue placeholder="Estado del análisis" /></SelectTrigger><SelectContent><SelectItem value="all">Cualquier estado de análisis</SelectItem><SelectItem value="none">Sin análisis</SelectItem><SelectItem value="QUEUED">En cola</SelectItem><SelectItem value="RUNNING">En proceso</SelectItem><SelectItem value="DONE">Completado</SelectItem><SelectItem value="FAILED">Fallido</SelectItem></SelectContent></Select>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-4">
            {filtered.length === 0 ? <div className={`rounded-lg border bg-surface px-5 ${contentColumnClass}`}><EmptyState icon={<VideoIcon className="h-5 w-5" />} title={videos.length === 0 ? 'Todavía no hay videos' : 'No hay videos para estos filtros'} description={videos.length === 0 ? 'Subí el primer video para empezar a analizarlo.' : 'Probá con otro equipo o estado.'} action={videos.length === 0 ? <Button asChild variant="outline"><Link to={uploadLink}>Subir video</Link></Button> : undefined} /></div> : videosLayout === 'table' ? (
              <div className={`${contentColumnClass} overflow-hidden rounded-lg border bg-surface`}><table className="w-full table-fixed text-sm"><colgroup><col className="w-[25%]" /><col className="w-[16%]" /><col className="w-[16%]" /><col className="w-[17%]" /><col className="w-[26%]" /></colgroup><thead className="bg-surface-subtle text-xs uppercase text-muted-foreground"><tr><th className="px-3 py-2.5 text-left">Video</th><th className="px-3 py-2.5 text-left">Equipo</th><th className="px-3 py-2.5 text-left">Estado del video</th><th className="px-3 py-2.5 text-left">Estado del análisis</th><th className="px-3 py-2.5 text-left">Acciones</th></tr></thead><tbody>{filtered.map((video) => { const historyOpen = expandedVideoId === video.id; const latestJob = latestVideoAnalysisJob(video.id, jobs); const aState = videoAnalysisState(video.id, jobs, catalog.loadedJobVideoIds); const mState = videoMaterialState(video); return <Fragment key={video.id}><tr className="border-t align-middle"><td className="p-3"><p className="truncate font-semibold">{video.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{video.description ?? formatDate(video.uploadedAt)}</p></td><td className="p-3">{teamName(video.teamId)}</td><td className="p-3"><Badge variant={materialVariant(mState)}>{videoMaterialLabel(mState)}</Badge></td><td className="p-3"><span className="text-sm font-medium text-foreground">{videoAnalysisLabel(aState)}</span>{latestJob?.status === 'RUNNING' && latestJob.progressPercent != null && <span className="mt-1 block text-xs text-muted-foreground">{latestJob.progressPercent}% procesado</span>}</td><td className="p-3"><VideoActions video={video} latestJob={latestJob} historyOpen={historyOpen} layout="table" onToggleHistory={() => setExpandedVideoId(historyOpen ? null : video.id)} onPlayVideo={setPlaybackVideo} /></td></tr>{historyOpen && <tr id={`video-analysis-history-${video.id}`}><td colSpan={5} className="border-t p-0"><VideoAnalysisJobs videoId={video.id} teamId={video.teamId} videoTitle={video.title} videoReady={mState === 'ready'} /></td></tr>}</Fragment>})}</tbody></table><p className="border-t p-3 text-xs text-muted-foreground">Mostrando {filtered.length} {filtered.length === 1 ? 'video' : 'videos'}</p></div>
            ) : (
              <div className={`space-y-3 ${contentColumnClass}`}>{filtered.map((video) => { const historyOpen = expandedVideoId === video.id; const latestJob = latestVideoAnalysisJob(video.id, jobs); const aState = videoAnalysisState(video.id, jobs, catalog.loadedJobVideoIds); const mState = videoMaterialState(video); return <article key={video.id} className="overflow-hidden rounded-lg border bg-surface"><div className="p-4"><div className="min-w-0"><h2 className="font-semibold">{video.title}</h2><p className="mt-1 text-sm text-muted-foreground">{teamName(video.teamId)} · {formatDate(video.uploadedAt)}</p></div><dl className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-sm"><div><dt className="text-xs text-muted-foreground">Video</dt><dd className="mt-1"><Badge variant={materialVariant(mState)}>{videoMaterialLabel(mState)}</Badge></dd></div><div><dt className="text-xs text-muted-foreground">Análisis</dt><dd className="mt-1 font-medium">{videoAnalysisLabel(aState)}</dd></div></dl><div className="mt-3 border-t pt-2"><VideoActions video={video} latestJob={latestJob} historyOpen={historyOpen} layout="cards" onToggleHistory={() => setExpandedVideoId(historyOpen ? null : video.id)} onPlayVideo={setPlaybackVideo} /></div></div>{historyOpen && <div id={`video-analysis-history-${video.id}`} className="border-t"><VideoAnalysisJobs videoId={video.id} teamId={video.teamId} videoTitle={video.title} videoReady={mState === 'ready'} /></div>}</article>})}<p className="px-1 text-xs text-muted-foreground">Mostrando {filtered.length} {filtered.length === 1 ? 'video' : 'videos'}</p></div>
            )}
          </div>
        </>
      )}

      {playbackVideo && <VideoPlaybackDialog video={playbackVideo} onClose={() => setPlaybackVideo(null)} />}
    </div>
  )
}
