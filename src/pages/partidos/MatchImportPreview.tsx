import { forwardRef, useMemo } from 'react'
import { AlertTriangle, Link2, LoaderCircle } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { MatchSide, MatchStatsImportPreview, TeamMismatchDetail } from '@/types'
import { BoxScoreTable } from './BoxScoreTable'
import {
  STATS_FILE_SOURCE_LABEL,
  UNLINKED_SAVE_NOTE,
  mismatchMessage,
  sideLabel,
  translateImportWarning,
  unlinkedReasonLabel,
  fileCountsSummary,
  linkedSummary,
  playedSummary,
  type MatchErrorCopy,
} from './match-import'

export interface PreviewTeam {
  id: string
  name: string
}

interface MatchImportPreviewProps {
  preview: MatchStatsImportPreview
  homeTeam: PreviewTeam
  awayTeam: PreviewTeam
  onConfirm: () => void
  onBack: () => void
  /** A request is pending: every button is disabled. */
  saving: boolean
  /** The match already has stats, so confirming overwrites them. */
  replacing: boolean
  confirmLabel?: string
  /** Hides 'Volver' once something was already created and cannot be undone from here. */
  canGoBack?: boolean
}

const SIDES: MatchSide[] = ['HOME', 'AWAY']

export const MatchImportPreview = forwardRef<HTMLHeadingElement, MatchImportPreviewProps>(
  function MatchImportPreview(
    { preview, homeTeam, awayTeam, onConfirm, onBack, saving, replacing, confirmLabel, canGoBack = true },
    headingRef,
  ) {
    const { boxScore, report, savePayload } = preview
    const teamBySide: Record<MatchSide, PreviewTeam> = { HOME: homeTeam, AWAY: awayTeam }
    const rosterNames = useMemo(() => {
      const names: Record<string, string> = {}
      for (const player of report.linkedPlayers) names[player.playerId] = player.rosterName
      return names
    }, [report.linkedPlayers])

    const winner = preview.winnerTeamId === homeTeam.id
      ? homeTeam
      : preview.winnerTeamId === awayTeam.id
        ? awayTeam
        : null
    const winnerText = winner ? `Ganó ${winner.name}` : 'Empate'
    const playedCount = savePayload.participants.length
    const label = confirmLabel ?? (replacing ? 'Reemplazar estadísticas' : 'Guardar estadísticas')

    return (
      <div className="space-y-8">
        <section aria-labelledby="preview-summary-title">
          <h2
            id="preview-summary-title"
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-semibold tracking-tight text-foreground outline-none"
          >
            Revisá las estadísticas antes de guardar
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {STATS_FILE_SOURCE_LABEL}. Todavía no se guardó nada.
          </p>
          {boxScore ? (
            <div className="mt-4">
              {boxScore.competition || boxScore.title ? (
                <p className="text-sm text-muted-foreground">
                  {[boxScore.competition, boxScore.title].filter(Boolean).join(' · ')}
                </p>
              ) : null}
              <p className="mt-2 text-lg font-semibold text-foreground">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Local </span>
                {homeTeam.name} {boxScore.teams.HOME.points} – {boxScore.teams.AWAY.points} {awayTeam.name}
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground"> Visitante</span>
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">{winnerText}</p>
            </div>
          ) : (
            <Alert className="mt-4 border-destructive/40 bg-destructive/10 text-red-200">
              La planilla no trae tablas de estadísticas que podamos mostrar. No se puede guardar.
            </Alert>
          )}
        </section>

        {report.warnings.length > 0 ? (
          <section aria-labelledby="preview-warnings-title">
            <Alert className="border-amber-400/30 bg-amber-400/[0.06] text-amber-200" role="status">
              <h3 id="preview-warnings-title" className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle aria-hidden="true" className="h-4 w-4" />
                Avisos
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {report.warnings.map((warning, index) => (
                  <li key={`${index}-${warning}`}>{translateImportWarning(warning)}</li>
                ))}
              </ul>
            </Alert>
          </section>
        ) : null}

        {SIDES.map((side) => {
          const team = teamBySide[side]
          const check = report.teams.find((entry) => entry.side === side)
          const linked = report.linkedPlayers.filter((player) => player.teamSide === side)
          const unlinked = report.unlinkedPlayers.filter((player) => player.teamSide === side)
          return (
            <section key={side} aria-labelledby={`preview-${side}-title`} className="space-y-4">
              <h3 id={`preview-${side}-title`} className="text-lg font-semibold text-foreground">
                {sideLabel(side)}: {team.name}
              </h3>
              {check ? (
                <dl className="grid gap-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
                  <dt className="text-muted-foreground">En el archivo</dt>
                  <dd className="text-foreground">«{check.excelName}»</dd>
                  <dt className="text-muted-foreground">Jugadores</dt>
                  <dd className="text-foreground">
                    {fileCountsSummary(check.playersInFile, check.playersWhoPlayed)}
                  </dd>
                  <dt className="text-muted-foreground">Equipo elegido</dt>
                  <dd className="text-foreground">
                    {check.matchesSelectedTeam === true
                      ? 'Coincide con el equipo elegido'
                      : check.matchesSelectedTeam === false
                        ? 'No coincide con el equipo elegido (lo aceptaste igual)'
                        : 'No se pudo comparar con el equipo elegido'}
                  </dd>
                </dl>
              ) : null}

              {linked.length > 0 ? (
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Jugadores vinculados a tu plantel</h4>
                  <ul className="mt-2 space-y-1 text-sm">
                    {linked.map((player) => (
                      <li key={player.playerId} className="flex items-center gap-2 text-foreground">
                        <Link2 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>
                          #{player.jerseyNumber ?? '?'} {player.name} → {player.rosterName}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {unlinked.length > 0 ? (
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Jugadores sin vincular</h4>
                  <p className="mt-1 text-xs text-muted-foreground">{UNLINKED_SAVE_NOTE}</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    {unlinked.map((player, index) => (
                      <li key={`${player.jerseyNumber}-${player.name}-${index}`} className="text-foreground">
                        <span className="font-medium">#{player.jerseyNumber ?? '?'} {player.name}</span>
                        <span className="text-muted-foreground">
                          {' '}— {unlinkedReasonLabel(player.reason, team.name, player.jerseyNumber)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {boxScore ? (
                <BoxScoreTable
                  side={side}
                  team={boxScore.teams[side]}
                  players={boxScore.players.filter((player) => player.teamSide === side)}
                  teamName={team.name}
                  rosterNames={rosterNames}
                />
              ) : null}
            </section>
          )
        })}

        <section aria-labelledby="preview-save-title" className="rounded-lg border border-border bg-surface p-4">
          <h3 id="preview-save-title" className="text-base font-semibold text-foreground">Qué se va a guardar</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
            <li>{playedSummary(playedCount)}</li>
            <li>{linkedSummary(report.linkedPlayers.length)}</li>
            <li>Resultado: {winnerText}.</li>
          </ul>
          {replacing ? (
            <p className="mt-3 text-sm text-amber-200">
              Reemplaza las estadísticas que ya tiene este partido.
            </p>
          ) : null}
        </section>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          {canGoBack ? (
            <Button type="button" variant="ghost" onClick={onBack} disabled={saving}>
              Volver
            </Button>
          ) : <span />}
          <Button type="button" onClick={onConfirm} disabled={saving || !boxScore}>
            {saving ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
            {saving ? 'Guardando…' : label}
          </Button>
        </div>
      </div>
    )
  },
)

interface ImportErrorAlertProps {
  copy: MatchErrorCopy
}

/** Error with Spanish copy and the backend message as secondary 'Detalle técnico'. */
export function ImportErrorAlert({ copy }: ImportErrorAlertProps) {
  return (
    <Alert className="border-destructive/40 bg-destructive/10 text-red-200">
      <p className="font-semibold">{copy.title}</p>
      <p className="mt-1">{copy.description}</p>
      {copy.detail ? (
        <p className="mt-2 text-xs text-red-200/80">
          <span className="font-medium">Detalle técnico:</span> {copy.detail}
        </p>
      ) : null}
    </Alert>
  )
}

interface TeamMismatchAlertsProps {
  details: TeamMismatchDetail[]
  onChangeTeams: () => void
  onImportAnyway: () => void
  busy: boolean
  changeLabel?: string
}

/** One alert per mismatching team plus the two ways out. */
export function TeamMismatchAlerts({ details, onChangeTeams, onImportAnyway, busy, changeLabel = 'Cambiar equipos' }: TeamMismatchAlertsProps) {
  return (
    <div className="space-y-3">
      {details.length > 0 ? details.map((detail) => (
        <Alert
          key={`${detail.side}-${detail.nameInFile}`}
          className="border-amber-400/30 bg-amber-400/[0.06] text-amber-200"
        >
          {mismatchMessage(detail)}
        </Alert>
      )) : (
        <Alert className="border-amber-400/30 bg-amber-400/[0.06] text-amber-200">
          Los nombres de la planilla no se parecen a los equipos que elegiste.
        </Alert>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={onChangeTeams} disabled={busy}>
          {changeLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onImportAnyway} disabled={busy}>
          {busy ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : null}
          Importar igual
        </Button>
      </div>
    </div>
  )
}
