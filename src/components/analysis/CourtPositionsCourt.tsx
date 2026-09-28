import type {
  AnalysisJobCourtPositions,
  AnalysisJobCourtPositionsPlayer,
  AnalysisJobTeamSide,
} from '@/types'
import { courtPositionPlayerLabel } from '@/pages/analysis/analysis-job-court-positions'
import { validCourtPositions } from './court-positions-court'
import { BasketballCourtLines } from './BasketballCourtLines'

interface CourtPositionsCourtProps {
  court: AnalysisJobCourtPositions['court']
  players: AnalysisJobCourtPositionsPlayer[]
  ourTeamSide: AnalysisJobTeamSide | null
}

function trackColor(trackId: number): string {
  const hue = ((trackId * 137.508) % 360 + 360) % 360
  return `hsl(${hue.toFixed(1)} 72% 38%)`
}

export function CourtPositionsCourt({
  court,
  players,
  ourTeamSide,
}: CourtPositionsCourtProps) {
  return (
    <div className="w-full max-w-full">
      <div
        className="relative w-full max-w-full overflow-hidden rounded-lg border border-border-strong bg-[#d7b985]"
        style={{ aspectRatio: `${court.lengthM} / ${court.widthM}` }}
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

            const color = trackColor(player.trackId)
            const isOurTeam = ourTeamSide != null && player.teamSide === ourTeamSide
            const points = positions.map((position) => `${position.xM},${position.yM}`).join(' ')
            const first = positions[0]
            const last = positions[positions.length - 1]

            return (
              <g key={player.trackId}>
                <title>{courtPositionPlayerLabel(player)}</title>
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
          <span key={player.trackId} className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: trackColor(player.trackId) }}
              aria-hidden="true"
            />
            {courtPositionPlayerLabel(player)}
          </span>
        ))}
      </div>
    </div>
  )
}
