import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, LoaderCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { isApiAuthenticationError } from '@/services/api/errors'
import { isMatchApiError, teamMismatchDetails } from '@/services/api/matches.client'
import { matchService, teamService } from '@/services/registry'
import type { MatchRecord, MatchStatsImportPreview, Team, TeamMismatchDetail } from '@/types'
import {
  NOT_EDITABLE_NOTE,
  OVERWRITE_WARNING,
  type MatchErrorCopy,
  matchErrorCopy,
} from './match-import'
import { formatMatchDate } from './box-score-format'
import { MATCH_DIALOG_CLASS } from './dialog-theme'
import { MATCHES_PATH, matchDetailPath } from './match-routes'
import { ImportErrorAlert, MatchImportPreview, TeamMismatchAlerts } from './MatchImportPreview'
import { StatsFileDropzone } from './StatsFileDropzone'

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; match: MatchRecord; teams: Team[] }
  | { kind: 'not-found' }
  | { kind: 'error'; copy: MatchErrorCopy }
  | { kind: 'session-expired' }

type Busy = 'preview' | 'saving'

const UNAVAILABLE_TEAM = 'Equipo no disponible'

export function MatchStatsImportPage() {
  const { matchId = '' } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const [load, setLoad] = useState<LoadState>({ kind: 'loading' })
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState<Busy | null>(null)
  const busyRef = useRef(false)
  const [error, setError] = useState<MatchErrorCopy | null>(null)
  const [mismatch, setMismatch] = useState<TeamMismatchDetail[] | null>(null)
  const [preview, setPreview] = useState<MatchStatsImportPreview | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const previewHeadingRef = useRef<HTMLHeadingElement>(null)
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true
    return () => { activeRef.current = false }
  }, [])

  const loadMatch = useCallback(async (isActive: () => boolean = () => true) => {
    setLoad({ kind: 'loading' })
    try {
      const [loaded, teams] = await Promise.all([
        matchService.getWithParticipants(matchId),
        // Team names are secondary: a failure only shows 'Equipo no disponible'.
        teamService.list().catch(() => [] as Team[]),
      ])
      if (isActive()) setLoad({ kind: 'ready', match: loaded.match, teams })
    } catch (loadError) {
      if (!isActive()) return
      if (isApiAuthenticationError(loadError)) {
        setLoad({ kind: 'session-expired' })
      } else if (isMatchApiError(loadError, 'MATCH_NOT_FOUND') || isMatchApiError(loadError, 'VALIDATION_ERROR')) {
        setLoad({ kind: 'not-found' })
      } else {
        setLoad({ kind: 'error', copy: matchErrorCopy(loadError) })
      }
    }
  }, [matchId])

  useEffect(() => {
    let active = true
    void loadMatch(() => active)
    return () => { active = false }
  }, [loadMatch])

  useEffect(() => {
    if (preview) previewHeadingRef.current?.focus()
  }, [preview])

  const withLock = async (kind: Busy, task: () => Promise<void>) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(kind)
    try {
      await task()
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }

  const header = (
    <div>
      <Link
        to={load.kind === 'ready' ? matchDetailPath(load.match.id) : MATCHES_PATH}
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        {load.kind === 'ready' ? 'Volver al partido' : 'Volver a Partidos'}
      </Link>
    </div>
  )

  if (load.kind === 'loading') {
    return (
      <div className="pb-16 pt-6">
        {header}
        <div className="flex items-center gap-3 text-muted-foreground" role="status">
          <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin text-primary" />
          Cargando el partido…
        </div>
      </div>
    )
  }

  if (load.kind === 'session-expired') {
    return (
      <div className="pb-16 pt-6">
        {header}
        <Alert className="border-destructive/40 bg-destructive/10 text-red-200">
          <p className="font-semibold">Tu sesión terminó</p>
          <p className="mt-1">Redirigiendo al ingreso…</p>
        </Alert>
      </div>
    )
  }

  if (load.kind === 'not-found') {
    return (
      <div className="pb-16 pt-6">
        {header}
        <EmptyState
          title="No encontramos este partido"
          description="Puede que el enlace sea incorrecto o que el partido ya no exista."
          action={<Button asChild><Link to={MATCHES_PATH}>Ir a Partidos</Link></Button>}
        />
      </div>
    )
  }

  if (load.kind === 'error') {
    return (
      <div className="pb-16 pt-6">
        {header}
        <ImportErrorAlert copy={load.copy} />
        <Button type="button" variant="outline" className="mt-3" onClick={() => void loadMatch()}>
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Reintentar
        </Button>
      </div>
    )
  }

  const { match, teams } = load
  const homeName = teams.find((team) => team.id === match.homeTeamId)?.name ?? UNAVAILABLE_TEAM
  const awayName = teams.find((team) => team.id === match.awayTeamId)?.name ?? UNAVAILABLE_TEAM
  const hasStats = match.statsFormat !== 'none'

  // The match ids are always sent: the backend links players and computes the winner only with both.
  const requestPreview = (allowTeamMismatch: boolean) => {
    if (!file) return Promise.resolve()
    return withLock('preview', async () => {
      setError(null)
      setMismatch(null)
      try {
        setPreview(await matchService.previewStatsImport({
          file,
          fileName: file.name,
          homeTeamId: match.homeTeamId,
          awayTeamId: match.awayTeamId,
          allowTeamMismatch: allowTeamMismatch || undefined,
        }))
      } catch (previewError) {
        if (isMatchApiError(previewError, 'TEAM_MISMATCH')) {
          setMismatch(teamMismatchDetails(previewError))
        } else {
          setError(matchErrorCopy(previewError, 'preview'))
        }
      }
    })
  }

  const save = () => {
    if (!preview) return Promise.resolve()
    return withLock('saving', async () => {
      setError(null)
      try {
        await matchService.saveStats(match.id, preview.savePayload)
        if (!activeRef.current) return
        toast.success('Estadísticas guardadas')
        navigate(matchDetailPath(match.id))
      } catch (saveError) {
        setError(matchErrorCopy(saveError))
      }
    })
  }

  const handleConfirm = () => {
    if (hasStats) setConfirmOpen(true)
    else void save()
  }

  const backToFile = () => {
    setPreview(null)
    setError(null)
  }

  return (
    <div className="pb-16 pt-6">
      {header}
      <PageHeader
        title={hasStats ? 'Reemplazar estadísticas' : 'Importar estadísticas'}
        description={`${homeName} vs ${awayName} · ${formatMatchDate(match.matchDate)}`}
      />
      <p className="mt-2 text-sm text-muted-foreground">{NOT_EDITABLE_NOTE}</p>

      {preview ? (
        <div className="mt-8">
          <MatchImportPreview
            ref={previewHeadingRef}
            preview={preview}
            homeTeam={{ id: match.homeTeamId, name: homeName }}
            awayTeam={{ id: match.awayTeamId, name: awayName }}
            onConfirm={handleConfirm}
            onBack={backToFile}
            saving={busy === 'saving'}
            replacing={hasStats}
            confirmLabel={hasStats ? 'Reemplazar estadísticas' : 'Guardar estadísticas'}
          />
          <div aria-live="polite" className="mt-4">
            {error ? <ImportErrorAlert copy={error} /> : null}
          </div>
        </div>
      ) : (
        <div className="mt-8 max-w-2xl space-y-6">
          {hasStats ? (
            <Alert className="border-amber-400/30 bg-amber-400/[0.06] text-amber-200" role="note">
              {OVERWRITE_WARNING}
            </Alert>
          ) : null}
          <div>
            <p className="text-sm font-medium text-foreground">Planilla de estadísticas de la federación</p>
            <p className="mb-2 mt-1 text-xs text-muted-foreground">
              Primero vas a ver una vista previa. No se guarda nada hasta que lo confirmes.
            </p>
            <StatsFileDropzone
              file={file}
              onFileChange={(next) => { setFile(next); setMismatch(null); setError(null) }}
              disabled={busy !== null}
            />
          </div>

          <div aria-live="polite" className="space-y-3">
            {mismatch && file ? (
              <TeamMismatchAlerts
                details={mismatch}
                onChangeTeams={() => { setMismatch(null); setFile(null) }}
                onImportAnyway={() => void requestPreview(true)}
                busy={busy === 'preview'}
                changeLabel="Elegir otra planilla"
              />
            ) : null}
            {error ? <ImportErrorAlert copy={error} /> : null}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" disabled={!file || busy !== null} onClick={() => void requestPreview(false)}>
              {busy === 'preview' ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
              {busy === 'preview' ? 'Revisando…' : 'Revisar estadísticas'}
            </Button>
            <Button asChild variant="ghost">
              <Link to={matchDetailPath(match.id)}>Cancelar</Link>
            </Button>
          </div>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={(open) => { if (busy === null) setConfirmOpen(open) }}>
        <DialogContent className={MATCH_DIALOG_CLASS}>
          <DialogHeader>
            <DialogTitle>Reemplazar estadísticas</DialogTitle>
            <DialogDescription>{OVERWRITE_WARNING}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)} disabled={busy !== null}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={busy !== null}
              onClick={() => { setConfirmOpen(false); void save() }}
            >
              Reemplazar estadísticas
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
