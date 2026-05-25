import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart2, Clock, Eye, Lock, Plus } from 'lucide-react'
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

const statusVariant = (s: Video['status']) =>
  s === 'analyzed' ? 'analyzed' : s === 'processing' ? 'processing' : 'uploaded'

const statusLabel = (s: Video['status']) =>
  s === 'analyzed' ? 'Analizado' : s === 'processing' ? 'Procesando' : 'Subido'

export function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [teamFilter, setTeamFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activity, setActivity] = useState<ActivityItem[]>([])

  const load = async () => {
    const [v, t, a] = await Promise.all([
      videoService.list(),
      teamService.list(),
      analysisService.getRecentActivity(),
    ])
    setVideos(v)
    setTeams(t)
    setActivity(a.filter((x) => x.type === 'video' || x.type === 'analysis'))
  }

  useEffect(() => { void load() }, [])

  const filtered = videos.filter((v) => {
    if (teamFilter !== 'all' && v.teamId !== teamFilter) return false
    if (statusFilter !== 'all' && v.status !== statusFilter) return false
    return true
  })

  const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? '—'

  const requestAnalysis = async (id: string) => {
    await videoService.requestAnalysis(id)
    toast.success('Análisis solicitado')
    void load()
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
        <Select value={teamFilter} onValueChange={setTeamFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Equipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los equipos</SelectItem>
            {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Cualquier estado</SelectItem>
            <SelectItem value="analyzed">Analizado</SelectItem>
            <SelectItem value="processing">Procesando</SelectItem>
            <SelectItem value="uploaded">Subido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 overflow-hidden rounded-lg border bg-white">
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
              {filtered.map((v) => (
                <tr key={v.id} className="border-t">
                  <td className="p-4">
                    <p className="font-medium">{v.title}</p>
                    <p className="text-xs text-muted-foreground">{v.resolution}</p>
                  </td>
                  <td className="p-4">{teamName(v.teamId)}</td>
                  <td className="p-4">{v.rivalName ?? '—'}</td>
                  <td className="p-4">{formatDate(v.uploadedAt)}</td>
                  <td className="p-4"><Badge variant={statusVariant(v.status)}>{statusLabel(v.status)}</Badge></td>
                  <td className="p-4">
                    {v.status === 'analyzed' && (
                      <div className="flex gap-2">
                        <Link to={`/analisis/${v.id}`} className="text-primary hover:text-primary/80"><Eye className="h-4 w-4" /></Link>
                        <BarChart2 className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    {v.status === 'processing' && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> En espera</span>}
                    {v.status === 'uploaded' && (
                      <Button size="sm" onClick={() => void requestAnalysis(v.id)}>Solicitar análisis</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t p-3 text-xs text-muted-foreground">Mostrando {filtered.length} videos</p>
        </div>

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

