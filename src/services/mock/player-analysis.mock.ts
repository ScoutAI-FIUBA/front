import { simulateNetwork } from '@/mocks/delays'
import type { IPlayerAnalysisService } from '../contracts/player-analysis.service'

const EMPTY_SHOOTING_LINE = { made: 0, attempted: 0, pct: null }

/** The mock returns the backend's empty state: no numbers are invented. */
export const mockPlayerAnalysisService: IPlayerAnalysisService = {
  async getStats(playerId) {
    await simulateNetwork()
    return {
      playerId,
      calcVersion: 2,
      games: 0,
      points: 0,
      fieldGoals: { ...EMPTY_SHOOTING_LINE },
      twoPoint: { ...EMPTY_SHOOTING_LINE },
      threePoint: { ...EMPTY_SHOOTING_LINE },
      unresolvedAttempts: 0,
      secondsOnScreen: null,
      distanceM: null,
      byZone: {},
      byShotType: {},
      videos: [],
      notMeasured: [
        'rebounds',
        'assists',
        'steals',
        'blocks',
        'turnovers',
        'free_throws',
        'minutes',
      ],
    }
  },

  async getShotChart(playerId) {
    await simulateNetwork()
    return {
      playerId,
      player: {
        id: playerId,
        firstName: '',
        lastName: '',
        jerseyNumber: null,
        teamId: null,
      },
      calcVersion: 2,
      court: {
        lengthM: 28,
        widthM: 15,
        hoopInsetM: 1.575,
        hoops: {
          home: { xM: 1.575, yM: 7.5 },
          away: { xM: 26.425, yM: 7.5 },
        },
        threePointRadiusM: 6.75,
        cornerThreeLateralM: 6.6,
      },
      shots: [],
      coverage: {
        shotsCharted: 0,
        made: 0,
        missed: 0,
        unresolved: 0,
        videos: 0,
      },
    }
  },
}
