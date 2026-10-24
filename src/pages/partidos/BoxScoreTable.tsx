import { Link2 } from 'lucide-react'
import type { BoxScoreLine, BoxScorePlayerLine, BoxScoreTeamTotals, MatchSide } from '@/types'
import { formatPct, formatPlusMinus, formatSplit, splitPlayed } from './box-score-format'

interface BoxScoreTableProps {
  side: MatchSide
  team: BoxScoreTeamTotals
  players: BoxScorePlayerLine[]
  teamName: string
  /** playerId -> roster name, used as the tooltip of linked players. */
  rosterNames?: Record<string, string>
}

const COLUMNS: Array<{ label: string; title: string; align?: 'left' }> = [
  { label: '#', title: 'Número de camiseta' },
  { label: 'Jugador', title: 'Jugador', align: 'left' },
  { label: 'Min', title: 'Minutos' },
  { label: 'Pts', title: 'Puntos' },
  { label: '2P', title: 'Tiros de 2 convertidos/intentados' },
  { label: '%2P', title: 'Porcentaje de tiros de 2' },
  { label: '3P', title: 'Triples convertidos/intentados' },
  { label: '%3P', title: 'Porcentaje de triples' },
  { label: 'TL', title: 'Tiros libres convertidos/intentados' },
  { label: '%TL', title: 'Porcentaje de tiros libres' },
  { label: 'RO', title: 'Rebotes ofensivos' },
  { label: 'RD', title: 'Rebotes defensivos' },
  { label: 'RT', title: 'Rebotes totales' },
  { label: 'Ast', title: 'Asistencias' },
  { label: 'Rec', title: 'Recuperos' },
  { label: 'Pér', title: 'Pérdidas' },
  { label: 'Tap', title: 'Tapones' },
  { label: 'Fal', title: 'Faltas cometidas' },
  { label: 'Val', title: 'Valoración' },
  { label: '+/-', title: 'Diferencia de puntos con el jugador en cancha' },
]

function statCells(line: BoxScoreLine): string[] {
  return [
    line.minutes,
    String(line.points),
    formatSplit(line.twoPoint),
    formatPct(line.twoPoint.pct),
    formatSplit(line.threePoint),
    formatPct(line.threePoint.pct),
    formatSplit(line.freeThrows),
    formatPct(line.freeThrows.pct),
    String(line.rebounds.offensive),
    String(line.rebounds.defensive),
    String(line.rebounds.total),
    String(line.assists),
    String(line.steals),
    String(line.turnovers),
    String(line.blocks),
    String(line.fouls),
    String(line.valuation),
    formatPlusMinus(line.plusMinus),
  ]
}

function jerseyLabel(player: BoxScorePlayerLine): string {
  return player.jerseyNumber ? `#${player.jerseyNumber}` : 'sin número'
}

const CELL = 'whitespace-nowrap px-2 py-2 text-right tabular-nums'

export function BoxScoreTable({ side, team, players, teamName, rosterNames }: BoxScoreTableProps) {
  const { played, didNotPlay } = splitPlayed(players, side)
  const sideLabel = side === 'HOME' ? 'Local' : 'Visitante'

  return (
    <section className="min-w-0">
      <div
        tabIndex={0}
        role="region"
        aria-label={`Estadísticas de ${teamName}, desplazables horizontalmente`}
        className="overflow-x-auto rounded-lg border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <caption className="px-3 py-3 text-left text-base font-semibold text-foreground">
            {teamName} · {sideLabel} · {team.points} puntos
          </caption>
          <thead className="bg-surface-subtle text-xs text-muted-foreground">
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column.label}
                  scope="col"
                  className={`whitespace-nowrap px-2 py-2 font-semibold ${column.align === 'left' ? 'text-left' : 'text-right'}`}
                >
                  <abbr title={column.title} className="no-underline">{column.label}</abbr>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {played.map((player, index) => {
              const rosterName = player.playerId ? rosterNames?.[player.playerId] : undefined
              return (
                <tr key={`${player.jerseyNumber ?? 'x'}-${player.name}-${index}`} className="border-t border-border">
                  <td className={CELL}>{player.jerseyNumber ?? '—'}</td>
                  <th scope="row" className="whitespace-nowrap px-2 py-2 text-left font-medium text-foreground">
                    {player.name}
                    {player.playerId ? (
                      <span className="ml-1.5 inline-flex align-middle text-primary" title={rosterName}>
                        <Link2 aria-hidden="true" className="h-3.5 w-3.5" />
                        <span className="sr-only">vinculado a tu plantel</span>
                      </span>
                    ) : null}
                  </th>
                  {statCells(player).map((value, cellIndex) => (
                    <td key={COLUMNS[cellIndex + 2].label} className={CELL}>{value}</td>
                  ))}
                </tr>
              )
            })}
          </tbody>
          <tfoot className="border-t-2 border-border-strong bg-surface-subtle font-semibold">
            {team.totals ? (
              <tr>
                <th scope="row" colSpan={2} className="px-2 py-2 text-left">Totales</th>
                {statCells(team.totals).map((value, cellIndex) => (
                  <td key={COLUMNS[cellIndex + 2].label} className={CELL}>{value}</td>
                ))}
              </tr>
            ) : (
              <tr>
                <th scope="row" colSpan={2} className="px-2 py-2 text-left">Totales</th>
                <td colSpan={COLUMNS.length - 2} className="px-2 py-2 text-left font-normal text-muted-foreground">
                  El archivo no trae totales del equipo. Puntos: <span className="font-semibold text-foreground">{team.points}</span>
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
      {didNotPlay.length > 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No jugaron: {didNotPlay.map((player) => `${jerseyLabel(player)} ${player.name}`).join(', ')}
        </p>
      ) : null}
    </section>
  )
}
