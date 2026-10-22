import type { PlayerAnalysisStats, PlayerShotChart } from '@/types'

export interface IPlayerAnalysisService {
  getStats(playerId: string): Promise<PlayerAnalysisStats>
  getShotChart(playerId: string): Promise<PlayerShotChart>
}
