import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import test from 'node:test'
import {
  formatMatchDate,
  formatPct,
  formatPlusMinus,
  formatSplit,
  matchScoreline,
  splitPlayed,
  winnerLabel,
} from '../src/pages/partidos/box-score-format.ts'
import type { BoxScorePlayerLine, MatchBoxScore, MatchRecord } from '../src/types/index.ts'

const readSource = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

function player(name: string, teamSide: 'HOME' | 'AWAY', played: boolean, jerseyNumber: string | null): BoxScorePlayerLine {
  const split = { made: 0, attempted: 0, pct: null }
  return {
    teamSide, jerseyNumber, name, played, playerId: null,
    minutes: '00:00', secondsPlayed: 0, points: 0,
    twoPoint: split, threePoint: split, freeThrows: split,
    rebounds: { defensive: 0, offensive: 0, total: 0 },
    assists: 0, steals: 0, turnovers: 0, blocks: 0, blocksReceived: 0,
    fouls: 0, foulsDrawn: 0, valuation: 0, plusMinus: 0,
  }
}

function record(winnerTeamId: string | null, withStats = true): MatchRecord {
  const boxScore: MatchBoxScore | null = withStats
    ? {
        title: null,
        competition: null,
        teams: {
          HOME: { name: 'A', points: 71, totals: null },
          AWAY: { name: 'B', points: 73, totals: null },
        },
        players: [],
      }
    : null
  return {
    id: 'm1', homeTeamId: 'ta', awayTeamId: 'tb', winnerTeamId, matchDate: '2026-03-01',
    description: null, statsFormat: withStats ? 'cabb_excel_v1' : 'none', boxScore,
    createdAt: '', updatedAt: '',
  }
}

test('percentages use the Argentine decimal comma with one decimal and a dash for null', () => {
  assert.equal(formatPct(44.4), '44,4%')
  assert.equal(formatPct(50), '50,0%')
  assert.equal(formatPct(100), '100,0%')
  assert.equal(formatPct(null), '—')
})

test('splits and plus/minus are formatted for reading', () => {
  assert.equal(formatSplit({ made: 4, attempted: 9, pct: 44.4 }), '4/9')
  assert.equal(formatPlusMinus(5), '+5')
  assert.equal(formatPlusMinus(-3), '-3')
  assert.equal(formatPlusMinus(0), '0')
})

test('the match date is read from the string without a timezone shift', () => {
  assert.equal(formatMatchDate('2026-03-01'), '01/03/2026')
  assert.equal(formatMatchDate('2026-01-01'), '01/01/2026')
  assert.equal(formatMatchDate('2026-12-31'), '31/12/2026')
})

test('splitPlayed keeps file order per side and separates who did not play', () => {
  const players = [
    player('UNO', 'HOME', true, '4'),
    player('DOS', 'HOME', false, '12'),
    player('TRES', 'AWAY', true, '5'),
    player('CUATRO', 'HOME', true, '7'),
    player('CINCO', 'HOME', false, null),
  ]
  const home = splitPlayed(players, 'HOME')
  assert.deepEqual(home.played.map((p) => p.name), ['UNO', 'CUATRO'])
  assert.deepEqual(home.didNotPlay.map((p) => p.name), ['DOS', 'CINCO'])
  const away = splitPlayed(players, 'AWAY')
  assert.deepEqual(away.played.map((p) => p.name), ['TRES'])
  assert.deepEqual(away.didNotPlay, [])
})

test('scoreline and winner label cover winner, tie, unknown team and no stats', () => {
  const teams = { ta: { name: 'Moreno' }, tb: { name: 'Juventud Unida' } }
  assert.equal(matchScoreline(record('tb')), '71 – 73')
  assert.equal(winnerLabel(record('tb'), teams), 'Ganó Juventud Unida')
  assert.equal(winnerLabel(record(null), teams), 'Empate')
  assert.equal(winnerLabel(record('zz'), teams), 'Ganó Equipo no disponible')
  assert.equal(matchScoreline(record(null, false)), null)
  assert.equal(winnerLabel(record(null, false), teams), null)
})

test('the detail page redirects legacy ?tab= links to the video detail', () => {
  const detail = readSource('../src/pages/partidos/MatchRecordDetailPage.tsx')
  assert.match(detail, /isLegacyVideoDetailSearch\(location\.search\)/)
  assert.match(detail, /legacyVideoRedirectPath\(\{\s*destination: 'detail'/)
  assert.match(detail, /<Navigate/)
  assert.match(detail, /¿Era un enlace viejo a un video\? Abrilo en Videos/)
  assert.match(detail, /Fuente: planilla de estadísticas de la federación/)
})

test('the box score table is accessible and keeps its copy honest', () => {
  const table = readSource('../src/pages/partidos/BoxScoreTable.tsx')
  assert.match(table, /<caption/)
  assert.match(table, /scope="col"/)
  assert.match(table, /scope="row"/)
  assert.match(table, /<abbr title=/)
  assert.match(table, /<tfoot/)
  assert.match(table, /El archivo no trae totales del equipo/)
  assert.match(table, /vinculado a tu plantel/)
  assert.match(table, /No jugaron:/)
  assert.match(table, /overflow-x-auto/)
  assert.match(table, /tabIndex=\{0\}/)
  assert.match(table, /aria-label=/)
})

test('Matches pages never present estimates or video-analysis wording', () => {
  const dir = new URL('../src/pages/partidos/', import.meta.url)
  const files = readdirSync(dir).filter((name) => /\.(ts|tsx)$/.test(name))
  assert.ok(files.length >= 4)
  for (const name of files) {
    const source = readFileSync(new URL(name, dir), 'utf8')
    assert.doesNotMatch(source, /estimad|Análisis IA/i, name)
  }
})
