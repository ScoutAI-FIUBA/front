import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, CircleAlert, Clapperboard, LoaderCircle, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { StatusIndicator } from '@/components/ui/status-indicator'
import { analysisService, isMockApiEnabled } from '@/services/registry'
import type { AnalysisSession } from '@/types'

export function ManualAnalysisPage() {
  const [sessions, setSessions] = useState<AnalysisSession[]>([])
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')

  const load = useCallback(async () => {
    setState('loading')
    if (!isMockApiEnabled) {
      setSessions([])
      setState('success')
      return
    }
    try {
      setSessions(await analysisService.listSessions())
      setState('success')
    } catch {
      setState('error')
    }
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <div className="mx-auto w-full max-w-[1040px] space-y-8">
      <PageHeader
        title="Revisión manual"
        description="Seleccioná momentos manualmente y guardalos como clips."
        action={<Button asChild><Link to="/revision-manual/nuevo"><Plus className="h-4 w-4" />Nueva revisión</Link></Button>}
      />

      <Alert className="border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
        {isMockApiEnabled
          ? 'Estas sesiones son datos locales de demostración.'
          : 'Las revisiones manuales reales se guardan como colecciones de clips.'}
      </Alert>

      {state === 'loading' && <div className="flex min-h-32 items-center gap-3 border-y py-8 text-sm text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin text-primary" />Cargando revisiones…</div>}
      {state === 'error' && <Alert className="flex items-center gap-3 border-destructive/25 bg-destructive/5 p-5"><CircleAlert className="h-5 w-5 text-destructive" /><div className="flex-1"><p className="font-semibold">No pudimos cargar las revisiones</p><p className="mt-1 text-sm text-muted-foreground">Reintentá para consultar las sesiones guardadas.</p></div><Button variant="outline" size="sm" onClick={() => void load()}>Reintentar</Button></Alert>}
      {state === 'success' && sessions.length === 0 && <EmptyState icon={<Clapperboard className="h-5 w-5" />} title="Todavía no hay revisiones manuales" description="Creá una revisión manual para seleccionar momentos y guardarlos como clips." action={<Button asChild><Link to="/revision-manual/nuevo">Nueva revisión</Link></Button>} />}
      {state === 'success' && sessions.length > 0 && (
        <div className="divide-y border-y">
          {sessions.map((session) => (
            <article key={session.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-foreground">Sesión manual {session.sessionCode}</h2><StatusIndicator state={session.status === 'completed' ? 'success' : session.status === 'processing' ? 'information' : 'neutral'}>{session.status === 'completed' ? 'Guardada' : session.status === 'processing' ? 'En edición' : 'Pendiente'}</StatusIndicator></div>
                <p className="mt-1 text-sm text-muted-foreground">Flujo de clips · {session.totalMinutes} min</p>
              </div>
              <Button asChild variant="outline" size="sm"><Link to={`/analisis/${session.id}`}>Abrir revisión<ArrowRight className="h-4 w-4" /></Link></Button>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
