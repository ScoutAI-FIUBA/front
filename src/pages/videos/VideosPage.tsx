import { Fragment, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BarChart2, ChevronDown, Clock, FolderOpen, Lock, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { videoService, teamService, analysisService } from '@/services/registry'
import type { ActivityItem, Team, Video } from '@/types'
import { formatDate } from '@/lib/utils'
import { toast } from 'sonner'
import { VideoAnalysisJobs } from './VideoAnalysisJobs'
import {
  ALL_VIDEO_TEAMS_FILTER,
  resolveVideoTeamFilter,
  VIDEO_TEAM_QUERY_PARAM,
  withVideoTeamFilter,
} from './video-team-navigation'
import {
  VIDEOS_DESKTOP_BREAKPOINT_PX,
  videosLayoutForViewport,
  type VideosLayout,
} from './video-responsive'

const statusVariant = (s: Video['status']) =>
  s === 'analyzed' ? 'analyzed' : s === 'processing' ? 'processing' : s === 'failed' ? 'failed' : 'uploaded'

const statusLabel = (s: Video['status']) =>
  s === 'analyzed' ? 'Analizado' : s === 'processing' ? 'Procesando' : s === 'failed' ? 'Fallido' : 'Subido'

interface VideoActionsProps {
  video: Video
  historyOpen: boolean
  onToggleHistory: () => void
  onRequestAnalysis: (videoId: string) => void
}

function VideoActions({
  video,
  historyOpen,
  onToggleHistory,
  onRequestAnalysis,
}: VideoActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-start">
      <Button asChild variant="outline" size="sm">
        <Link to={`/videos/${video.id}/colecciones`}>
          <FolderOpen className="h-4 w-4" /> Colecciones
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-expanded={historyOpen}
        aria-controls={`video-analysis-history-${video.id}`}
        onClick={onToggleHistory}
      >
        <BarChart2 className="h-4 w-4" aria-hidden="true" />
        Historial de análisis
        <ChevronDown
          className={`h-4 w-4 transition-transform ${historyOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </Button>
      {video.status === 'processing' && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" /> En espera
        </span>
      )}
      {video.status === 'uploaded' && videoService.canRequestAnalysis && (
        <Button size="sm" onClick={() => onRequestAnalysis(video.id)}>Solicitar análisis</Button>
      )}
      {video.status === 'uploaded' && !videoService.canRequestAnalysis && (
        <span className="text-xs text-muted-foreground">Listo para reproducir</span>
      )}
      {video.status === 'failed' && <span className="text-xs text-red-600">Subida fallida</span>}
    </div>
  )
}

function useVideosLayout(): VideosLayout {
  const [layout, setLayout] = useState<VideosLayout>(() => (
    typeof window === 'undefined' ? 'table' : videosLayoutForViewport(window.innerWidth)
  ))

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
  const [videos, setVideos] = useState<Video[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [teamsLoaded, setTeamsLoaded] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null)
  const videosLayout = useVideosLayout()

  const load = async () => {
    const [v, t, a] = await Promise.all([
      videoService.list(),
      teamService.list(),
      analysisService.getRecentActivity(),
    ])
    setVideos(v)
    setTeams(t)
    setTeamsLoaded(true)
    setActivity(a.filter((x) => x.type === 'video' || x.type === 'analysis'))
  }

  useEffect(() => { void load() }, [])

  const teamFilter = resolveVideoTeamFilter(searchParams, teams)

  useEffect(() => {
    if (!teamsLoaded || !searchParams.has(VIDEO_TEAM_QUERY_PARAM)) return
    if (teamFilter !== ALL_VIDEO_TEAMS_FILTER) return
    setSearchParams(withVideoTeamFilter(searchParams, ALL_VIDEO_TEAMS_FILTER), { replace: true })
  }, [searchParams, setSearchParams, teamFilter, teamsLoaded])

  const handleTeamFilterChange = (nextTeamFilter: string) => {
    setSearchParams(withVideoTeamFilter(searchParams, nextTeamFilter))
  }

  const filtered = videos.filter((v) => {
    if (teamFilter !== 'all' && v.teamId !== teamFilter) return false
    if (statusFilter !== 'all' && v.status !== statusFilter) return false
    return true
  })

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? '—'

  const requestAnalysis = async (id: string) => {
    try {
      await videoService.requestAnalysis(id)
      toast.success('Análisis solicitado')
      void load()
    } catch {
      toast.error('No pudimos solicitar el análisis. Reintentá en unos segundos.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Videos de partido</p>
          <h1 className="text-2xl font-bold">Gestor de videos</h1>
        </div>
        <Button asChild><Link to="/videos/subir"><Plus className="h-4 w-4" /> Subir video</Link></Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={teamFilter} onValueChange={handleTeamFilterChange}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Equipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VIDEO_TEAMS_FILTER}>Todos los equipos</SelectItem>
            {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Cualquier estado</SelectItem>
            <SelectItem value="analyzed">Analizado</SelectItem>
            <SelectItem value="processing">Procesando</SelectItem>
            <SelectItem value="failed">Fallido</SelectItem>
            <SelectItem value="uploaded">Subido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {videosLayout === 'table' ? (
          <div className="overflow-hidden rounded-lg border bg-white lg:col-span-3">
            <table className="w-full text-sm">
              <thead className="bg-accent/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-4 text-left">Partido / Video</th>
                  <th className="p-4 text-left">Equipo</th>
                  <th className="p-4 text-left">Rival</th>
                  <th className="p-4 text-left">Fecha</th>
                  <th className="p-4 text-left">Estado</th>
                  <th className="p-4 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((v) => {
                  const historyOpen = expandedVideoId === v.id

                  return (
                    <Fragment key={v.id}>
                      <tr className="border-t">
                        <td className="p-4">
                          <p className="font-medium">{v.title}</p>
                          <p className="text-xs text-muted-foreground">{v.resolution}</p>
                        </td>
                        <td className="p-4">{teamName(v.teamId)}</td>
                        <td className="p-4">{v.rivalName ?? '—'}</td>
                        <td className="p-4">{formatDate(v.uploadedAt)}</td>
                        <td className="p-4"><Badge variant={statusVariant(v.status)}>{statusLabel(v.status)}</Badge></td>
                        <td className="p-4">
                          <VideoActions
                            video={v}
                            historyOpen={historyOpen}
                            onToggleHistory={() => setExpandedVideoId(historyOpen ? null : v.id)}
                            onRequestAnalysis={(videoId) => void requestAnalysis(videoId)}
                          />
                        </td>
                      </tr>
                      {historyOpen && (
                        <tr id={`video-analysis-history-${v.id}`}>
                          <td colSpan={6} className="border-t p-0">
                            <VideoAnalysisJobs
                              videoId={v.id}
                              teamId={v.teamId}
                              videoTitle={v.title}
                              videoReady={v.status === 'uploaded'}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
            <p className="border-t p-3 text-xs text-muted-foreground">Mostrando {filtered.length} videos</p>
          </div>
        ) : (
          <div className="space-y-4 lg:col-span-3">
            {filtered.map((video) => {
              const historyOpen = expandedVideoId === video.id

              return (
                <article key={video.id} className="overflow-hidden rounded-lg border bg-white">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-semibold text-foreground">{video.title}</h2>
                        {video.resolution && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{video.resolution}</p>
                        )}
                      </div>
                      <Badge variant={statusVariant(video.status)}>{statusLabel(video.status)}</Badge>
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div>
                        <dt className="text-xs text-muted-foreground">Equipo</dt>
                        <dd className="mt-0.5 text-foreground">{teamName(video.teamId)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">Rival</dt>
                        <dd className="mt-0.5 text-foreground">{video.rivalName ?? '—'}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-xs text-muted-foreground">Fecha</dt>
                        <dd className="mt-0.5 text-foreground">{formatDate(video.uploadedAt)}</dd>
                      </div>
                    </dl>

                    <div className="mt-4 border-t pt-4">
                      <VideoActions
                        video={video}
                        historyOpen={historyOpen}
                        onToggleHistory={() => setExpandedVideoId(historyOpen ? null : video.id)}
                        onRequestAnalysis={(videoId) => void requestAnalysis(videoId)}
                      />
                    </div>
                  </div>

                  {historyOpen && (
                    <div id={`video-analysis-history-${video.id}`} className="border-t">
                      <VideoAnalysisJobs
                        videoId={video.id}
                        teamId={video.teamId}
                        videoTitle={video.title}
                        videoReady={video.status === 'uploaded'}
                      />
                    </div>
                  )}
                </article>
              )
            })}
            <p className="px-1 text-xs text-muted-foreground">Mostrando {filtered.length} videos</p>
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Clock className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activity.map((a) => (
              <div key={a.id}>
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

