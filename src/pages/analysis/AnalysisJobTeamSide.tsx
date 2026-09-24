import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleAlert, CircleCheck, LoaderCircle, Users } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { analysisJobTeamSideService } from '@/services/registry'
import type {
  AnalysisJobTeamSide,
  AnalysisJobTeamSides,
  ProcessingJob,
} from '@/types'
import {
  analysisJobTeamGroupLabel,
  createAnalysisJobTeamSideConfirmation,
  initialAnalysisJobTeamSide,
} from './analysis-job-team-side'

interface AnalysisJobTeamSideProps {
  job: ProcessingJob
  onJobUpdated: (job: ProcessingJob) => void
}

type LoadState = 'loading' | 'success' | 'error'

const TEAM_SIDES: AnalysisJobTeamSide[] = [0, 1]

export function AnalysisJobTeamSideSelector({
  job,
  onJobUpdated,
}: AnalysisJobTeamSideProps) {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [teamSides, setTeamSides] = useState<AnalysisJobTeamSides | null>(null)
  const [selectedSide, setSelectedSide] = useState<AnalysisJobTeamSide | null>(null)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setLoadState('loading')
    setLoadError('')

    void analysisJobTeamSideService.get(job.id, job.teamId).then(
      (loaded) => {
        if (!active) return
        setTeamSides(loaded)
        setSelectedSide(initialAnalysisJobTeamSide(loaded))
        setIsExpanded(loaded.ourTeamSide == null)
        setLoadState('success')
      },
      () => {
        if (!active) return
        setLoadError('No pudimos cargar esta información. Reintentá en unos segundos.')
        setLoadState('error')
      },
    )

    return () => {
      active = false
    }
  }, [job.id, job.teamId, reloadKey])

  const handleConfirmed = useCallback((updatedJob: ProcessingJob) => {
    setSaveError('')
    setTeamSides((current) => current
      ? { ...current, ourTeamSide: updatedJob.ourTeamSide }
      : current)
    if (updatedJob.ourTeamSide != null) setSelectedSide(updatedJob.ourTeamSide)
    setIsExpanded(false)
    onJobUpdated(updatedJob)
  }, [onJobUpdated])

  const handleSaveError = useCallback(() => {
    setSaveError('No pudimos guardar la selección. Reintentá en unos segundos.')
  }, [])

  const confirmation = useMemo(() => createAnalysisJobTeamSideConfirmation({
    service: analysisJobTeamSideService,
    jobId: job.id,
    teamId: job.teamId,
    onConfirmed: handleConfirmed,
    onError: handleSaveError,
    onSubmittingChange: setIsSaving,
  }), [handleConfirmed, handleSaveError, job.id, job.teamId])

  if (loadState === 'loading') {
    return (
      <section className="rounded-lg border bg-surface p-5 sm:p-6" aria-busy="true" aria-live="polite">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          Cargando grupos detectados…
        </div>
      </section>
    )
  }

  if (loadState === 'error' || !teamSides) {
    return (
      <section className="rounded-lg border bg-surface p-5 sm:p-6" aria-labelledby="team-side-title">
        <h2 id="team-side-title" className="font-semibold text-foreground">Identificá tu equipo</h2>
        <Alert className="mt-4 flex flex-col gap-4 border-destructive/25 bg-destructive/5 sm:flex-row sm:items-center">
          <CircleAlert className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">No pudimos cargar los grupos detectados</p>
            <p className="mt-1 text-muted-foreground">{loadError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>
            Reintentar
          </Button>
        </Alert>
      </section>
    )
  }

  const confirmedSide = teamSides.ourTeamSide
  const isConfirmed = confirmedSide != null
  const selectedIsConfirmed = isConfirmed && selectedSide === confirmedSide

  if (isConfirmed && !isExpanded) {
    return (
      <section className="rounded-lg border bg-surface p-4 sm:p-5" aria-labelledby="team-side-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <div>
              <h2 id="team-side-title" className="font-semibold text-foreground">
                Tu equipo: {analysisJobTeamGroupLabel(confirmedSide)}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Esta selección se usa para asociar las detecciones con tu plantel.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsExpanded(true)}>
            Cambiar
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-lg border bg-surface p-5 sm:p-6" aria-labelledby="team-side-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="team-side-title" className="font-semibold text-foreground">Identificá tu equipo</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            El sistema separó las detecciones en dos grupos. Elegí cuál corresponde a tu equipo.
          </p>
        </div>
        {isConfirmed && (
          <Badge variant="analyzed" className="w-fit gap-1">
            <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {analysisJobTeamGroupLabel(confirmedSide)} confirmado
          </Badge>
        )}
      </div>

      {!isConfirmed && teamSides.suggestedTeamSide != null && (
        <p className="mt-4 text-sm text-muted-foreground">
          Preseleccionamos {analysisJobTeamGroupLabel(teamSides.suggestedTeamSide)} por sus coincidencias con el plantel. Todavía no está guardado.
        </p>
      )}

      <fieldset className="mt-5">
        <legend className="sr-only">Seleccionar el grupo detectado correspondiente a tu equipo</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {TEAM_SIDES.map((sideValue) => {
            const side = teamSides.sides.find((item) => item.teamSide === sideValue)
            const selected = selectedSide === sideValue
            const suggested = teamSides.suggestedTeamSide === sideValue
            const confirmed = teamSides.ourTeamSide === sideValue

            return (
              <label
                key={sideValue}
                className={cn(
                  'cursor-pointer rounded-lg border p-4 transition-colors',
                  selected ? 'border-primary bg-primary-subtle/60' : 'border-border hover:border-primary/30',
                  isSaving && 'cursor-not-allowed opacity-70',
                )}
              >
                <input
                  type="radio"
                  name="analysis-job-team-side"
                  value={sideValue}
                  checked={selected}
                  disabled={isSaving}
                  onChange={() => {
                    setSelectedSide(sideValue)
                    setSaveError('')
                  }}
                  className="sr-only"
                />
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full border',
                        selected ? 'border-primary bg-primary' : 'border-border-strong bg-surface',
                      )}
                      aria-hidden="true"
                    >
                      {selected && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
                    </span>
                    <span className="font-semibold text-foreground">{analysisJobTeamGroupLabel(sideValue)}</span>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {suggested && <Badge variant="position">Sugerido</Badge>}
                    {confirmed && <Badge variant="analyzed">Confirmado</Badge>}
                  </div>
                </div>

                {side ? (
                  <div className="mt-4 space-y-3 text-sm">
                    <p className="flex items-center gap-2 text-foreground">
                      <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      {side.trackCount} seguimientos detectados
                    </p>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Camisetas detectadas</p>
                      {side.numbers.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {side.numbers.map((number) => (
                            <Badge key={number} variant="outline">#{number}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-muted-foreground">No identificadas</p>
                      )}
                    </div>
                    <p className="text-muted-foreground">
                      Coincidencias con el plantel: <span className="font-semibold text-foreground">{side.rosterMatches}</span>
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">El sistema no informó detecciones para este grupo.</p>
                )}
              </label>
            )
          })}
        </div>
      </fieldset>

      <p className="mt-4 text-xs text-muted-foreground">
        Números de camiseta conocidos en el plantel: {teamSides.rosterNumbersKnown}.
      </p>

      {saveError && (
        <Alert className="mt-4 flex items-start gap-3 border-destructive/25 bg-destructive/5">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="font-semibold text-foreground">No pudimos confirmar la selección</p>
            <p className="mt-1 text-destructive">{saveError}</p>
          </div>
        </Alert>
      )}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {isConfirmed && (
          <Button
            type="button"
            variant="ghost"
            disabled={isSaving}
            onClick={() => {
              setSelectedSide(confirmedSide)
              setSaveError('')
              setIsExpanded(false)
            }}
          >
            Cancelar
          </Button>
        )}
        <Button
          type="button"
          disabled={selectedSide == null || isSaving || selectedIsConfirmed}
          onClick={() => {
            if (selectedSide != null) void confirmation.submit(selectedSide)
          }}
        >
          {isSaving && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {isSaving
            ? 'Guardando…'
            : selectedIsConfirmed
              ? 'Selección confirmada'
              : isConfirmed
                ? 'Actualizar selección'
                : 'Confirmar equipo'}
        </Button>
      </div>
    </section>
  )
}
