import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, UserPlus, Video } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { analysisService, playerService } from '@/services/registry'
import type { ActivityItem, DashboardStats, Player } from '@/types'
import { getInitials } from '@/lib/utils'

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [players, setPlayers] = useState<Player[]>([])

  useEffect(() => {
    void Promise.all([
      analysisService.getDashboardStats(),
      analysisService.getRecentActivity(),
      playerService.list(),
    ]).then(([s, a, p]) => {
      setStats(s)
      setActivity(a)
      setPlayers(p.slice(0, 4))
    })
  }, [])

  const statCards = stats
    ? [
        { label: 'TOTAL DE EQUIPOS', value: stats.totalTeams, link: '/equipos', text: 'Ver listado' },
        { label: 'TOTAL DE JUGADORES', value: stats.totalPlayers, link: '/jugadores', text: 'Explorar base' },
        { label: 'VIDEOS SUBIDOS', value: stats.totalVideos, link: '/videos', text: 'Gestor de medios' },
        { label: 'ANÁLISIS PENDIENTES', value: String(stats.pendingAnalysis).padStart(2, '0'), link: '/analisis', text: 'Revisar cola' },
      ]
    : []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard General</h1>
        <p className="text-sm text-muted-foreground">Resumen de tu actividad en ScoutAI</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { to: '/equipos', icon: Plus, title: 'Crear equipo', sub: 'Estructura' },
          { to: '/jugadores/nuevo', icon: UserPlus, title: 'Agregar jugador', sub: 'Reclutamiento' },
          { to: '/videos/subir', icon: Video, title: 'Subir video', sub: 'Multimedia' },
        ].map(({ to, icon: Icon, title, sub }) => (
          <Link key={to} to={to}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-accent p-3 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          {statCards.map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{s.value}</p>
                <Link to={s.link} className="mt-2 inline-block text-xs text-primary hover:underline">{s.text}</Link>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Actividad Reciente</CardTitle>
            <Link to="/analisis" className="text-xs text-primary">Detalles</Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {activity.map((a) => (
              <div key={a.id} className="border-b pb-3 last:border-0">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.detail}</p>
              </div>
            ))}
            <div className="rounded-lg bg-accent p-3 text-xs">
              <p className="font-semibold text-primary">SISTEMA OK</p>
              <p className="text-muted-foreground">La plataforma se encuentra operativa.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Últimos jugadores cargados</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="pb-3 font-medium">Jugador</th>
                <th className="pb-3 font-medium">Posición</th>
                <th className="pb-3 font-medium">Equipo</th>
                <th className="pb-3 font-medium">Calificación</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p, i) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-3">
                    <span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded bg-accent text-xs font-medium text-primary">
                      {getInitials(p.firstName, p.lastName)}
                    </span>
                    {p.firstName} {p.lastName}
                  </td>
                  <td><Badge variant="position">{p.primaryPosition}</Badge></td>
                  <td className="text-muted-foreground">—</td>
                  <td className="w-40"><Progress value={70 + i * 5} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

