import { useEffect, useMemo, useState } from 'react'
import { analysisJobShotChartService, analysisJobStatsService } from '@/services/registry'
import type {
  AnalysisJobShotChart,
  AnalysisJobStatsCoverage,
  AnalysisJobTeamShootingStats,
  ProcessingJob,
} from '@/types'
import {
  analysisJobShotChartLoadKey,
  loadAnalysisJobShotChart,
  type AnalysisJobShotChartLoadContext,
} from './analysis-job-shot-chart'
import {
  analysisJobStatsLoadKey,
  loadAnalysisJobStats,
  type AnalysisJobStatsLoadContext,
} from './analysis-job-stats'

export type AnalysisJobShootingLoadState = 'blocked' | 'loading' | 'success' | 'error'

export interface AnalysisShootingSummary {
  team: AnalysisJobTeamShootingStats | null
  coverage: AnalysisJobStatsCoverage
}

export interface AnalysisJobShootingDataController {
  statsState: AnalysisJobShootingLoadState
  stats: Awaited<ReturnType<typeof loadAnalysisJobStats>>
  retryStats: () => void
  chartState: AnalysisJobShootingLoadState
  chart: AnalysisJobShotChart | null
  retryChart: () => void
}

export function useAnalysisJobShootingData(job: ProcessingJob): AnalysisJobShootingDataController {
  const statsContext = useMemo<AnalysisJobStatsLoadContext>(() => ({
    jobId: job.id,
    teamId: job.teamId,
    status: job.status,
    ourTeamSide: job.ourTeamSide,
  }), [job.id, job.ourTeamSide, job.status, job.teamId])
  const chartContext = useMemo<AnalysisJobShotChartLoadContext>(() => ({ ...statsContext }), [statsContext])
  const statsLoadKey = analysisJobStatsLoadKey(statsContext)
  const chartLoadKey = analysisJobShotChartLoadKey(chartContext)
  const [statsState, setStatsState] = useState<AnalysisJobShootingLoadState>(statsLoadKey ? 'loading' : 'blocked')
  const [chartState, setChartState] = useState<AnalysisJobShootingLoadState>(chartLoadKey ? 'loading' : 'blocked')
  const [stats, setStats] = useState<Awaited<ReturnType<typeof loadAnalysisJobStats>>>(null)
  const [chart, setChart] = useState<AnalysisJobShotChart | null>(null)
  const [statsRetry, setStatsRetry] = useState(0)
  const [chartRetry, setChartRetry] = useState(0)

  useEffect(() => {
    let active = true
    if (!statsLoadKey) {
      setStats(null)
      setStatsState('blocked')
      return () => { active = false }
    }

    setStatsState('loading')
    void loadAnalysisJobStats(statsContext, analysisJobStatsService).then(
      (loaded) => {
        if (!active || !loaded) return
        setStats(loaded)
        setStatsState('success')
      },
      () => {
        if (!active) return
        setStats(null)
        setStatsState('error')
      },
    )
    return () => { active = false }
  }, [statsContext, statsLoadKey, statsRetry])

  useEffect(() => {
    let active = true
    if (!chartLoadKey) {
      setChart(null)
      setChartState('blocked')
      return () => { active = false }
    }

    setChartState('loading')
    void loadAnalysisJobShotChart(chartContext, analysisJobShotChartService).then(
      (loaded) => {
        if (!active || !loaded) return
        setChart(loaded)
        setChartState('success')
      },
      () => {
        if (!active) return
        setChart(null)
        setChartState('error')
      },
    )
    return () => { active = false }
  }, [chartContext, chartLoadKey, chartRetry])

  return {
    statsState,
    stats,
    retryStats: () => setStatsRetry((value) => value + 1),
    chartState,
    chart,
    retryChart: () => setChartRetry((value) => value + 1),
  }
}
