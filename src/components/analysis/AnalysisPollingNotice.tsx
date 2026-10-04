import { WifiOff } from 'lucide-react'
import { Alert } from '@/components/ui/alert'

export function AnalysisPollingNotice() {
  return (
    <Alert className="flex items-start gap-3 border-amber-500/30 bg-amber-500/5 p-4" role="status">
      <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
      <div>
        <p className="font-semibold text-foreground">Perdimos la conexión con el análisis</p>
        <p className="mt-1 text-muted-foreground">
          Mostramos el último estado conocido y seguimos intentando actualizarlo.
        </p>
      </div>
    </Alert>
  )
}
