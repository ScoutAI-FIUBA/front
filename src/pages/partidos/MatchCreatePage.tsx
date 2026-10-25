import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { ArrowLeft, LoaderCircle, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { isApiAuthenticationError } from '@/services/api/errors'
import { isMatchApiError, teamMismatchDetails } from '@/services/api/matches.client'
import { matchService, teamService } from '@/services/registry'
import type { MatchSide, MatchStatsImportPreview, Team, TeamMismatchDetail } from '@/types'
import {
  MATCH_DESCRIPTION_MAX,
  emptyMatchFormValues,
  matchFormSchema,
  matchFormToCreateInput,
  type MatchFormValues,
} from './match-form'
import { type MatchErrorCopy, matchErrorCopy, runCreateWithStats } from './match-import'
import { MATCHES_PATH, matchDetailPath } from './match-routes'
import { ImportErrorAlert, MatchImportPreview, TeamMismatchAlerts } from './MatchImportPreview'
import { StatsFileDropzone } from './StatsFileDropzone'
import { TeamQuickCreateDialog } from './TeamQuickCreateDialog'
import { suggestForSides, teamNamesInFile } from './team-suggestion'
import { sortTeamsOwnFirst } from '@/pages/teams/team-ownership'
import { TeamNameWithBadge } from '@/components/OwnTeamBadge'

type TeamsState = 'loading' | 'success' | 'error' | 'session-expired'
type Busy = 'preview' | 'saving' | 'creating'

interface PreviewSnapshot {
  preview: MatchStatsImportPreview
  values: MatchFormValues
}

interface MismatchState {
  details: TeamMismatchDetail[]
  values: MatchFormValues
}

const textareaClass =
  'flex min-h-24 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60'

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return <p id={id} className="mt-1 text-xs text-destructive">{message}</p>
}

export function MatchCreatePage() {
  const navigate = useNavigate()
  const form = useForm<MatchFormValues>({
    resolver: zodResolver(matchFormSchema),
    defaultValues: emptyMatchFormValues(),
  })
  const { register, control, setValue, watch, formState: { errors } } = form

  const [teams, setTeams] = useState<Team[]>([])
  const [teamsState, setTeamsState] = useState<TeamsState>('loading')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState<Busy | null>(null)
  const busyRef = useRef(false)
  const [error, setError] = useState<MatchErrorCopy | null>(null)
  const [mismatch, setMismatch] = useState<MismatchState | null>(null)
  const [snapshot, setSnapshot] = useState<PreviewSnapshot | null>(null)
  const [createdMatchId, setCreatedMatchId] = useState<string | null>(null)
  const [focusFormTick, setFocusFormTick] = useState(0)
  // Team names read from the chosen file (no ids sent), used only to suggest teams.
  const [fileNames, setFileNames] = useState<Record<MatchSide, string> | null>(null)
  const [reading, setReading] = useState(false)
  const readTokenRef = useRef(0)
  const [createSide, setCreateSide] = useState<MatchSide | null>(null)
  const previewHeadingRef = useRef<HTMLHeadingElement>(null)
  const activeRef = useRef(true)

  useEffect(() => {
    activeRef.current = true
    return () => { activeRef.current = false }
  }, [])

  const loadTeams = useCallback(async (isActive: () => boolean = () => true) => {
    setTeamsState('loading')
    try {
      const loaded = await teamService.list()
      if (!isActive()) return
      setTeams(sortTeamsOwnFirst(loaded))
      setTeamsState('success')
    } catch (loadError) {
      if (!isActive()) return
      setTeamsState(isApiAuthenticationError(loadError) ? 'session-expired' : 'error')
    }
  }, [])

  useEffect(() => {
    let active = true
    void loadTeams(() => active)
    return () => { active = false }
  }, [loadTeams])

  useEffect(() => {
    if (snapshot) previewHeadingRef.current?.focus()
  }, [snapshot])

  useEffect(() => {
    if (focusFormTick > 0) document.getElementById('match-home-team')?.focus()
  }, [focusFormTick])

  const watched = watch()
  const homeTeamId = watched.homeTeamId
  const awayTeamId = watched.awayTeamId
  const descriptionLength = watched.description.length
  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams])

  // The mismatch only applies to the exact teams and file it was computed for.
  const mismatchVisible = mismatch !== null
    && file !== null
    && mismatch.values.homeTeamId === homeTeamId
    && mismatch.values.awayTeamId === awayTeamId

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

  const readFileNames = async (next: File) => {
    const token = ++readTokenRef.current
    setReading(true)
    try {
      const read = await matchService.previewStatsImport({ file: next, fileName: next.name })
      if (activeRef.current && token === readTokenRef.current) setFileNames(teamNamesInFile(read))
    } catch (readError) {
      if (activeRef.current && token === readTokenRef.current) setError(matchErrorCopy(readError, 'preview'))
    } finally {
      if (activeRef.current && token === readTokenRef.current) setReading(false)
    }
  }

  const handleFileChange = (next: File | null) => {
    readTokenRef.current += 1
    setFile(next)
    setFileNames(null)
    setReading(false)
    setMismatch(null)
    setError(null)
    if (next) void readFileNames(next)
  }

  const chooseTeam = (side: MatchSide, teamId: string) => {
    if (side === 'AWAY' && teamId === homeTeamId) {
      toast.error('Ese equipo ya es el local')
      return
    }
    if (side === 'HOME' && teamId === awayTeamId) setValue('awayTeamId', '', { shouldValidate: false })
    setValue(side === 'HOME' ? 'homeTeamId' : 'awayTeamId', teamId, { shouldValidate: true })
  }

  const requestPreview = (values: MatchFormValues, allowTeamMismatch: boolean) => {
    if (!file) return Promise.resolve()
    return withLock('preview', async () => {
      setError(null)
      setMismatch(null)
      try {
        const preview = await matchService.previewStatsImport({
          file,
          fileName: file.name,
          homeTeamId: values.homeTeamId,
          awayTeamId: values.awayTeamId,
          allowTeamMismatch: allowTeamMismatch || undefined,
        })
        setSnapshot({ preview, values })
      } catch (previewError) {
        if (isMatchApiError(previewError, 'TEAM_MISMATCH')) {
          setMismatch({ details: teamMismatchDetails(previewError), values })
        } else {
          setError(matchErrorCopy(previewError, 'preview'))
        }
      }
    })
  }

  const createOnly = (values: MatchFormValues) => withLock('creating', async () => {
    setError(null)
    try {
      const created = await matchService.create(matchFormToCreateInput(values))
      if (!activeRef.current) return
      toast.success('Partido creado')
      navigate(matchDetailPath(created.id))
    } catch (createError) {
      setError(matchErrorCopy(createError))
    }
  })

  const onSubmit = (values: MatchFormValues) => (file ? requestPreview(values, false) : createOnly(values))

  const confirmSave = () => {
    if (!snapshot) return Promise.resolve()
    return withLock('saving', async () => {
      setError(null)
      const result = await runCreateWithStats({
        service: matchService,
        input: matchFormToCreateInput(snapshot.values),
        payload: snapshot.preview.savePayload,
        createdMatchId,
      })
      if (result.matchId) setCreatedMatchId(result.matchId)
      if (result.statsSaved && result.matchId) {
        if (!activeRef.current) return
        toast.success('Partido y estadísticas guardados')
        navigate(matchDetailPath(result.matchId))
        return
      }
      if (result.matchId) toast.error('El partido se creó pero no se guardaron las estadísticas')
      setError(matchErrorCopy(result.error))
    })
  }

  const backToForm = () => {
    setSnapshot(null)
    setError(null)
    setFocusFormTick((tick) => tick + 1)
  }

  const changeTeams = () => {
    setMismatch(null)
    setFocusFormTick((tick) => tick + 1)
  }

  const homeTeam = snapshot ? teamsById.get(snapshot.values.homeTeamId) : undefined
  const awayTeam = snapshot ? teamsById.get(snapshot.values.awayTeamId) : undefined
  const submitting = busy !== null || reading

  // Never suggest the team already chosen for the other side.
  const suggestions = useMemo(() => {
    if (!fileNames) return { HOME: null, AWAY: null }
    return {
      HOME: suggestForSides(fileNames, teams.filter((team) => team.id !== awayTeamId)).HOME,
      AWAY: suggestForSides(fileNames, teams.filter((team) => team.id !== homeTeamId)).AWAY,
    }
  }, [fileNames, teams, homeTeamId, awayTeamId])

  const sideHelp = (side: MatchSide) => {
    const selectedId = side === 'HOME' ? homeTeamId : awayTeamId
    const nameInFile = fileNames?.[side] ?? ''
    const suggestion = suggestions[side]
    return (
      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        {!selectedId && suggestion ? (
          <p className="flex flex-wrap items-center gap-2">
            <span>
              Parece ser <span className="font-semibold text-foreground">{suggestion.team.name}</span>
              {' '}(en la planilla: «{nameInFile}»)
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={submitting}
              onClick={() => chooseTeam(side, suggestion.team.id)}
            >
              Usarlo
            </Button>
          </p>
        ) : null}
        {!selectedId && !suggestion && nameInFile ? <p>En la planilla figura «{nameInFile}»</p> : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-3"
          disabled={submitting}
          onClick={() => setCreateSide(side)}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Crear equipo nuevo
        </Button>
      </div>
    )
  }

  const header = (
    <>
      <Link
        to={MATCHES_PATH}
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Volver a Partidos
      </Link>
      <PageHeader
        title="Nuevo partido"
        description="Elegí los equipos y la fecha. Si tenés la planilla de estadísticas de la federación, podés importarla acá."
      />
    </>
  )

  if (teamsState === 'loading') {
    return (
      <div className="pb-16 pt-6">
        {header}
        <div className="mt-8 flex items-center gap-3 text-muted-foreground" role="status">
          <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin text-primary" />
          Cargando equipos…
        </div>
      </div>
    )
  }

  if (teamsState === 'error' || teamsState === 'session-expired') {
    return (
      <div className="pb-16 pt-6">
        {header}
        <Alert className="mt-8 border-destructive/40 bg-destructive/10 text-red-200">
          {teamsState === 'session-expired' ? (
            <>
              <p className="font-semibold">Tu sesión terminó</p>
              <p className="mt-1">Redirigiendo al ingreso…</p>
            </>
          ) : (
            <>
              <p className="font-semibold">No pudimos cargar tus equipos</p>
              <p className="mt-1">Revisá tu conexión e intentá nuevamente.</p>
              <Button type="button" variant="outline" className="mt-3" onClick={() => void loadTeams()}>
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                Reintentar
              </Button>
            </>
          )}
        </Alert>
      </div>
    )
  }

  if (snapshot) {
    return (
      <div className="pb-16 pt-6">
        {header}
        <div className="mt-8">
          <MatchImportPreview
            ref={previewHeadingRef}
            preview={snapshot.preview}
            homeTeam={{ id: snapshot.values.homeTeamId, name: homeTeam?.name ?? 'Equipo local' }}
            awayTeam={{ id: snapshot.values.awayTeamId, name: awayTeam?.name ?? 'Equipo visitante' }}
            onConfirm={() => void confirmSave()}
            onBack={backToForm}
            saving={busy === 'saving'}
            replacing={false}
            confirmLabel={createdMatchId ? 'Reintentar guardar las estadísticas' : 'Guardar partido y estadísticas'}
            canGoBack={createdMatchId === null}
          />
          <div aria-live="polite" className="mt-4 space-y-3">
            {createdMatchId ? (
              <Alert className="border-amber-400/30 bg-amber-400/[0.06] text-amber-200">
                <p className="font-semibold">El partido se creó pero no se guardaron las estadísticas</p>
                <p className="mt-1">
                  Podés reintentar solo el guardado de las estadísticas o abrir el partido y importarlas más tarde.
                </p>
                <Button asChild variant="outline" className="mt-3">
                  <Link to={matchDetailPath(createdMatchId)}>Ir al partido</Link>
                </Button>
              </Alert>
            ) : null}
            {error ? <ImportErrorAlert copy={error} /> : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-16 pt-6">
      {header}
      <form className="mt-8 max-w-2xl space-y-6" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <fieldset disabled={submitting} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="match-home-team">Local</Label>
              <Controller
                name="homeTeamId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      if (value === awayTeamId) setValue('awayTeamId', '', { shouldValidate: false })
                    }}
                    disabled={submitting}
                  >
                    <SelectTrigger
                      id="match-home-team"
                      className="mt-1"
                      aria-invalid={errors.homeTeamId ? true : undefined}
                      aria-describedby={errors.homeTeamId ? 'match-home-team-error' : undefined}
                    >
                      <SelectValue placeholder="Elegí el equipo local" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortTeamsOwnFirst(teams).map((team) => <SelectItem key={team.id} value={team.id}><TeamNameWithBadge team={team} /></SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError id="match-home-team-error" message={errors.homeTeamId?.message} />
              {sideHelp('HOME')}
            </div>
            <div>
              <Label htmlFor="match-away-team">Visitante</Label>
              <Controller
                name="awayTeamId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={submitting}>
                    <SelectTrigger
                      id="match-away-team"
                      className="mt-1"
                      aria-invalid={errors.awayTeamId ? true : undefined}
                      aria-describedby={errors.awayTeamId ? 'match-away-team-error' : undefined}
                    >
                      <SelectValue placeholder="Elegí el equipo visitante" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortTeamsOwnFirst(teams).map((team) => (
                        <SelectItem key={team.id} value={team.id} disabled={team.id === homeTeamId}>
                          <TeamNameWithBadge team={team} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError id="match-away-team-error" message={errors.awayTeamId?.message} />
              {sideHelp('AWAY')}
            </div>
          </div>

          <div className="max-w-xs">
            <Label htmlFor="match-date">Fecha</Label>
            <Input
              id="match-date"
              type="date"
              className="mt-1"
              aria-invalid={errors.matchDate ? true : undefined}
              aria-describedby={errors.matchDate ? 'match-date-error' : undefined}
              {...register('matchDate')}
            />
            <FieldError id="match-date-error" message={errors.matchDate?.message} />
          </div>

          <div>
            <Label htmlFor="match-description">
              Descripción <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <textarea
              id="match-description"
              rows={3}
              className={`mt-1 ${textareaClass}`}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={`match-description-count${errors.description ? ' match-description-error' : ''}`}
              {...register('description')}
            />
            <div className="mt-1 flex items-start justify-between gap-3">
              <FieldError id="match-description-error" message={errors.description?.message} />
              <p id="match-description-count" className="ml-auto text-xs text-muted-foreground">
                {descriptionLength}/{MATCH_DESCRIPTION_MAX}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">Importar estadísticas (opcional)</p>
            <p className="mb-2 mt-1 text-xs text-muted-foreground">
              Primero vas a ver una vista previa. No se crea nada hasta que lo confirmes.
            </p>
            <StatsFileDropzone
              file={file}
              onFileChange={handleFileChange}
              disabled={busy !== null}
            />
          </div>
        </fieldset>

        <div aria-live="polite" className="space-y-3">
          {mismatchVisible && mismatch ? (
            <TeamMismatchAlerts
              details={mismatch.details}
              onChangeTeams={changeTeams}
              onImportAnyway={() => void form.handleSubmit((values) => requestPreview(values, true))()}
              busy={busy === 'preview'}
            />
          ) : null}
          {error ? <ImportErrorAlert copy={error} /> : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={submitting}>
            {submitting ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
            {reading
              ? 'Leyendo la planilla…'
              : busy === 'preview'
              ? 'Revisando…'
              : busy === 'creating'
                ? 'Creando…'
                : file
                  ? 'Revisar estadísticas'
                  : 'Crear partido'}
          </Button>
          <Button asChild variant="ghost">
            <Link to={MATCHES_PATH}>Cancelar</Link>
          </Button>
        </div>
      </form>

      <TeamQuickCreateDialog
        open={createSide !== null}
        onOpenChange={(open) => { if (!open) setCreateSide(null) }}
        title={createSide === 'AWAY' ? 'Crear equipo visitante' : 'Crear equipo local'}
        initialName={createSide ? fileNames?.[createSide] ?? '' : ''}
        teams={teams}
        onCreated={(team) => {
          if (!createSide) return
          setTeams((current) => sortTeamsOwnFirst([...current, team]))
          chooseTeam(createSide, team.id)
        }}
        onUseExisting={(team) => { if (createSide) chooseTeam(createSide, team.id) }}
      />
    </div>
  )
}
