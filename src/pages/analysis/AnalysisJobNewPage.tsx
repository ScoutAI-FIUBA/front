import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, CircleAlert, LoaderCircle, Upload, Video as VideoIcon } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { analysisJobService } from '@/services/registry'
import { isApiAuthenticationError } from '@/services/api/errors'
import { formatDate } from '@/lib/utils'
import { analysisJobDetailPath } from './analysis-job-detail'
import { addCreatedJobToAnalysisCatalog } from './analysis-job-catalog-store'
import { useAnalysisJobCatalog } from './use-analysis-job-catalog'
import { videoUploadPath } from '@/pages/videos/video-upload-navigation'
import { AnalysisPollingNotice } from '@/components/analysis/AnalysisPollingNotice'
import { useAuth } from '@/contexts/AuthContext'
import { sortTeamsOwnFirst } from '@/pages/teams/team-ownership'
import { TeamNameWithBadge } from '@/components/OwnTeamBadge'

export function AnalysisJobNewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { catalog, loadState, isPollingDisconnected, refresh } = useAnalysisJobCatalog()
  const [selectedVideoId, setSelectedVideoId] = useState(searchParams.get('video_id') ?? '')
  const [isCreating, setIsCreating] = useState(false)
  const [creationError, setCreationError] = useState<string | null>(null)

  const requestedTeamId = searchParams.get('team_id') ?? 'all'
  const readyVideos = useMemo(() => (catalog?.videos ?? []).filter((video) => (
    (video.status === 'uploaded' || video.status === 'analyzed')
    && (requestedTeamId === 'all' || video.teamId === requestedTeamId)
  )), [catalog?.videos, requestedTeamId])

  useEffect(() => {
    if (selectedVideoId && readyVideos.some((video) => video.id === selectedVideoId)) return
    setSelectedVideoId(readyVideos[0]?.id ?? '')
  }, [readyVideos, selectedVideoId])

  const selectedVideo = readyVideos.find((video) => video.id === selectedVideoId) ?? null
  const selectedTeam = catalog?.teams.find((team) => team.id === selectedVideo?.teamId) ?? null
  const activeJob = catalog?.items.find(({ job }) => (
    job.videoId === selectedVideoId && (job.status === 'QUEUED' || job.status === 'RUNNING')
  ))?.job ?? null

  const changeTeam = (teamId: string) => {
    const next = new URLSearchParams(searchParams)
    if (teamId === 'all') next.delete('team_id')
    else next.set('team_id', teamId)
    next.delete('video_id')
    setSearchParams(next)
  }

  const changeVideo = (videoId: string) => {
    setSelectedVideoId(videoId)
    const next = new URLSearchParams(searchParams)
    next.set('video_id', videoId)
    const video = catalog?.videos.find((candidate) => candidate.id === videoId)
    if (video) next.set('team_id', video.teamId)
    setSearchParams(next, { replace: true })
  }

  const createAnalysis = async () => {
    if (!selectedVideo || isCreating) return
    setIsCreating(true)
    setCreationError(null)
    try {
      const job = await analysisJobService.create(selectedVideo.id, { teamId: selectedVideo.teamId })
      if (!user || !addCreatedJobToAnalysisCatalog(user.id, job)) return
      navigate(analysisJobDetailPath(job))
    } catch (error) {
      if (!isApiAuthenticationError(error)) setCreationError('No pudimos iniciar el análisis. El video sigue disponible para reintentar.')
    } finally {
      setIsCreating(false)
    }
  }

  const uploadReturnTo = requestedTeamId === 'all' ? '/analisis/nuevo' : `/analisis/nuevo?team_id=${encodeURIComponent(requestedTeamId)}`

  return (
    <div className="mx-auto w-full max-w-[1040px] space-y-8">
      <PageHeader title="Nuevo análisis" description="Elegí un video listo. ScoutAI procesa el material y organiza resultados y evidencia automáticamente." />

      {loadState === 'loading' && !catalog && <div className="flex min-h-40 items-center gap-3 border-y py-8 text-sm text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin text-primary" />Buscando videos listos…</div>}
      {loadState === 'session-expired' && <div className="flex min-h-32 items-center gap-3 border-y py-8 text-sm text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin text-primary" />Tu sesión terminó. Redirigiendo al ingreso…</div>}
      {loadState === 'error' && !catalog && <Alert className="flex items-center gap-3 border-destructive/25 bg-destructive/5 p-5"><CircleAlert className="h-5 w-5 text-destructive" /><div className="flex-1"><p className="font-semibold">No pudimos consultar tus videos</p><p className="mt-1 text-sm text-muted-foreground">Revisá la conexión y reintentá.</p></div><Button variant="outline" size="sm" onClick={() => void refresh()}>Reintentar</Button></Alert>}

      {isPollingDisconnected && <AnalysisPollingNotice />}

      {catalog && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section aria-labelledby="choose-video-title">
            <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Paso 1</p><h2 id="choose-video-title" className="mt-1 text-xl font-semibold">Elegí el material</h2></div>
              <Select value={requestedTeamId} onValueChange={changeTeam}><SelectTrigger className="w-full sm:w-56" aria-label="Filtrar por equipo"><SelectValue placeholder="Todos los equipos" /></SelectTrigger><SelectContent><SelectItem value="all">Todos los equipos</SelectItem>{sortTeamsOwnFirst(catalog.teams).map((team) => <SelectItem key={team.id} value={team.id}><TeamNameWithBadge team={team} /></SelectItem>)}</SelectContent></Select>
            </div>

            {readyVideos.length === 0 ? (
              <EmptyState className="mt-5" icon={<VideoIcon className="h-5 w-5" />} title="No hay videos listos en esta selección" description="Subí un video nuevo o elegí otro equipo." action={<Button asChild><Link to={videoUploadPath({ teamId: requestedTeamId === 'all' ? undefined : requestedTeamId, returnTo: uploadReturnTo })}><Upload className="h-4 w-4" />Subir video</Link></Button>} />
            ) : (
              <div className="mt-3 divide-y border-y">
                {readyVideos.map((video) => {
                  const team = catalog.teams.find((candidate) => candidate.id === video.teamId)
                  const selected = video.id === selectedVideoId
                  return <button key={video.id} type="button" className={`grid min-h-20 w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-3 px-2 py-4 text-left transition-colors ${selected ? 'bg-primary-subtle' : 'hover:bg-surface-subtle'}`} aria-pressed={selected} onClick={() => changeVideo(video.id)}><span className={`mt-1 h-4 w-4 rounded-full border-2 ${selected ? 'border-primary bg-primary shadow-[inset_0_0_0_3px_white]' : 'border-muted-foreground/40'}`} /><span className="min-w-0"><span className="block truncate font-semibold text-foreground">{video.title}</span><span className="mt-1 block text-sm text-muted-foreground">{team?.name ?? 'Equipo'} · {formatDate(video.uploadedAt)}</span></span></button>
                })}
              </div>
            )}
          </section>

          <aside className="h-fit rounded-lg border bg-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Paso 2</p>
            <h2 className="mt-2 font-semibold">Iniciar procesamiento</h2>
            {selectedVideo ? <><p className="mt-3 font-medium text-foreground">{selectedVideo.title}</p><p className="mt-1 text-sm text-muted-foreground">{selectedTeam?.name}</p>{activeJob ? <><Badge className="mt-4" variant="processing">Análisis en curso</Badge><Button asChild className="mt-4 w-full"><Link to={analysisJobDetailPath(activeJob)}>Seguir análisis<ArrowRight className="h-4 w-4" /></Link></Button></> : <Button className="mt-5 w-full" disabled={isCreating} onClick={() => void createAnalysis()}>{isCreating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{isCreating ? 'Iniciando…' : 'Iniciar análisis'}</Button>}</> : <p className="mt-3 text-sm text-muted-foreground">Seleccioná un video listo para continuar.</p>}
            {creationError && <p className="mt-3 text-sm text-destructive" role="alert">{creationError}</p>}
            <div className="mt-5 border-t pt-5"><Button asChild variant="outline" className="w-full"><Link to={videoUploadPath({ teamId: requestedTeamId === 'all' ? undefined : requestedTeamId, returnTo: uploadReturnTo })}><Upload className="h-4 w-4" />Subir otro video</Link></Button></div>
          </aside>
        </div>
      )}
    </div>
  )
}
