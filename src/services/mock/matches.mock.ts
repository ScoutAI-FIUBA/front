import { simulateNetwork } from '@/mocks/delays'
import { getStore, updateStore, generateId } from '@/mocks/store'
import type { IMatchService } from '../contracts/matches.service'

export const mockMatchService: IMatchService = {
  async list() {
    await simulateNetwork()
    return getStore().matches
  },

  async getById(id) {
    await simulateNetwork()
    return getStore().matches.find((m) => m.id === id) ?? null
  },

  async create(dto) {
    await simulateNetwork()
    const match = {
      id: generateId('match'),
      ...dto,
      status: 'scheduled' as const,
    }
    updateStore((s) => {
      s.matches.push(match)
    })
    return match
  },

  async getRoster(matchId) {
    await simulateNetwork()
    return getStore().rosters.filter((r) => r.matchId === matchId)
  },

  async setRoster(matchId, entries) {
    await simulateNetwork()
    updateStore((s) => {
      s.rosters = s.rosters.filter((r) => r.matchId !== matchId)
      for (const e of entries) {
        s.rosters.push({
          id: generateId('rost'),
          matchId,
          playerId: e.playerId,
          teamId: e.teamId,
          isStarter: e.isStarter,
        })
      }
    })
    return getStore().rosters.filter((r) => r.matchId === matchId)
  },
}
