import type {
  AnalysisJobCourtPositions,
  AnalysisJobCourtPositionsPlayer,
  AnalysisJobTeamSide,
} from '@/types'
import { cn } from '@/lib/utils'
import {
  analysisJobPlayerKey,
  analysisJobPlayerLabelFromMap,
  buildAnalysisJobPlayerLabels,
} from '@/pages/analysis/analysis-job-player-identity'
import { validCourtPositions } from './court-positions-court'
import { BasketballCourtLines } from './BasketballCourtLines'
import { courtColumnStyle, courtFrameStyle } from './court-size'

interface CourtPositionsCourtProps {
  court: AnalysisJobCourtPositions['court']
  players: AnalysisJobCourtPositionsPlayer[]
  ourTeamSide: AnalysisJobTeamSide | null
  presentation?: 'legacy' | 'match-report'
}

function playerColor(player: AnalysisJobCourtPositionsPlayer): string {
  if (!player.stablePlayerId) {
    const hue = ((player.trackId * 137.508) % 360 + 360) % 360
    return `hsl(${hue.toFixed(1)} 72% 38%)`
  }
  const hash = [...player.stablePlayerId].reduce(
    (value, character) => ((value * 31) + character.charCodeAt(0)) | 0,
    0,
  )
  const hue = ((hash * 137.508) % 360 + 360) % 360
  return `hsl(${hue.toFixed(1)} 72% 38%)`
}

export function CourtPositionsCourt({
  court,
  players,
  ourTeamSide,
  presentation = 'legacy',
}: CourtPositionsCourtProps) {
  const playerLabels = buildAnalysisJobPlayerLabels(players)

  return (
    <div className="w-full max-w-full" style={courtColumnStyle(court)}>
      <div
        className={cn(
          'relative w-full max-w-full overflow-hidden rounded-lg border',
          presentation === 'match-report'
            ? 'border-[#3A4254] bg-[#11151D]'
            : 'border-border-strong bg-[#d7b985]',
        )}
        style={courtFrameStyle(court)}
      >
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${court.lengthM} ${court.widthM}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Cancha con trayectorias detectadas de jugadores"
        >
          <BasketballCourtLines lengthM={court.lengthM} widthM={court.widthM} />

          {players.map((player) => {
            const positions = validCourtPositions(court, player.positions)
            if (positions.length === 0) return null

            const color = playerColor(player)
            const isOurTeam = ourTeamSide != null && player.teamSide === ourTeamSide
            const points = positions.map((position) => `${position.xM},${position.yM}`).join(' ')
            const first = positions[0]
            const last = positions[positions.length - 1]

            return (
              <g key={analysisJobPlayerKey(player)}>
                <title>{analysisJobPlayerLabelFromMap(player, playerLabels)}</title>
                {positions.length > 1 && (
                  <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth={isOurTeam ? 0.24 : 0.16}
                    strokeOpacity={isOurTeam ? 1 : 0.82}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                <circle
                  cx={first.xM}
                  cy={first.yM}
                  r="0.14"
                  fill="white"
                  stroke={color}
                  strokeWidth="0.08"
                />
                <circle
                  cx={last.xM}
                  cy={last.yM}
                  r={isOurTeam ? 0.24 : 0.2}
                  fill={color}
                  stroke="white"
                  strokeWidth="0.08"
                />
              </g>
            )
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground" aria-label="Seguimientos visibles">
        {players.map((player) => (
          <span key={analysisJobPlayerKey(player)} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: playerColor(player) }}
              aria-hidden="true"
            />
            {analysisJobPlayerLabelFromMap(player, playerLabels)}
          </span>
        ))}
      </div>
    </div>
  )
}
