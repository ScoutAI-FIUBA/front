import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { analysisService } from '@/services/registry'
import type { AnalysisSession } from '@/types'

export function AnalysisPage() {
  const [sessions, setSessions] = useState<AnalysisSession[]>([])

  useEffect(() => {
    void analysisService.listSessions().then(setSessions)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Análisis</h1>
          <p className="text-sm text-muted-foreground">Sesiones de análisis de video y resultados detectados.</p>
        </div>
        <Button asChild>
          <Link to="/analisis/nuevo"><Plus className="h-4 w-4" /> Nuevo analisis</Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {sessions.map((s) => (
          <Card key={s.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Sesión #{s.sessionCode}</CardTitle>
              <Badge variant={s.status === 'completed' ? 'analyzed' : 'processing'}>
                {s.status === 'completed' ? 'Completado' : 'En proceso'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={s.progressPercent} />
              <p className="text-sm text-muted-foreground">{s.progressPercent}% · {s.framesAnalyzed.toLocaleString()} frames</p>
              <Button asChild size="sm">
                <Link to={`/analisis/${s.id}`}><BarChart3 className="h-4 w-4" /> Ver detalle</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

