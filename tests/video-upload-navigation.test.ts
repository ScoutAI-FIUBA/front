import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  newMatchPath,
  safeVideoUploadReturnPath,
  videoUploadPath,
  videoUploadReturnPath,
  videoUploadSuccessPath,
} from '../src/pages/videos/video-upload-navigation.ts'

test('Nuevo partido is the canonical product upload route', () => {
  assert.equal(newMatchPath(), '/partidos/nuevo')
  assert.equal(newMatchPath({ teamId: 'team/1' }), '/partidos/nuevo?team_id=team%2F1')
})

test('upload carries team and allow-listed return context', () => {
  const path = videoUploadPath({ teamId: 'team/1', returnTo: '/videos?team_id=team%2F1' })
  const query = new URL(path, 'https://scoutai.local').searchParams
  assert.equal(query.get('team_id'), 'team/1')
  assert.equal(query.get('return_to'), '/videos?team_id=team%2F1')
  assert.equal(videoUploadReturnPath(query, 'team/1'), '/videos?team_id=team%2F1')
})

test('upload rejects external return targets and falls back to team Videos', () => {
  assert.equal(safeVideoUploadReturnPath('https://evil.example/steal'), null)
  assert.equal(safeVideoUploadReturnPath('//evil.example/steal'), null)
  assert.equal(safeVideoUploadReturnPath('/cuenta'), null)
  assert.equal(videoUploadReturnPath(new URLSearchParams('return_to=https://evil.example'), 'team-1'), '/videos?team_id=team-1')
})

test('upload success enters the exact Partido report regardless of legacy return context', () => {
  const params = new URLSearchParams('return_to=%2Fanalisis%2Fnuevo%3Fteam_id%3Dteam-1')
  assert.equal(videoUploadSuccessPath(params, { id: 'video/1', teamId: 'team-1' }), '/partidos/video%2F1?tab=reporte')
  assert.equal(videoUploadSuccessPath(new URLSearchParams(), { id: 'video/1', teamId: 'team-1' }), '/partidos/video%2F1?tab=reporte')
})

test('upload accepts Partidos as a product return destination', () => {
  assert.equal(safeVideoUploadReturnPath('/partidos'), '/partidos')
  const path = videoUploadPath({ returnTo: '/partidos' })
  assert.equal(new URL(path, 'https://scoutai.local').searchParams.get('return_to'), '/partidos')
})

test('upload drop affordance has real handlers and a pending guard', () => {
  const source = readFileSync(new URL('../src/pages/videos/VideoUploadPage.tsx', import.meta.url), 'utf8')
  assert.match(source, /onDragEnter=/)
  assert.match(source, /onDragOver=/)
  assert.match(source, /onDrop=\{handleDrop\}/)
  assert.match(source, /isUploading/)
  assert.match(source, /upsertVideoInAnalysisCatalog\(uploaded\)/)
  assert.match(source, /videoUploadSuccessPath/)
})

test('R4-B presents one shared three-step Nuevo partido flow with an honest report preview', () => {
  const source = readFileSync(new URL('../src/pages/videos/VideoUploadPage.tsx', import.meta.url), 'utf8')

  assert.match(source, /Nuevo partido/)
  assert.match(source, /location\.pathname === NEW_MATCH_PATH/)
  assert.match(source, /01.*Equipo/s)
  assert.match(source, /02.*Archivo/s)
  assert.match(source, /03.*Confirmar/s)
  assert.match(source, /teamService\.list\(\)/)
  assert.match(source, /onClick=\{\(\) => void loadTeams\(\)\}/)
  assert.match(source, /Archivo del partido/)
  assert.match(source, /Elegir archivo/)
  assert.match(source, /Título del partido/)
  assert.match(source, /Descripción/)
  assert.match(source, /fecha de carga del archivo, no la fecha deportiva/)
  assert.match(source, /Qué vas a poder ver en el Reporte/)
  assert.match(source, /Tiros y ubicación en cancha, cuando se detecten/)
  assert.match(source, /tiros que tengan un momento registrado/)
  assert.match(source, /Recorridos y mapas de calor por jugador/)
  assert.match(source, /si existen otros análisis compatibles/)
  assert.match(source, /Depende de lo que se detecte en el video/)
  assert.match(source, /Subir partido/)
  assert.doesNotMatch(source, /iniciar análisis automáticamente|cantidad de tiros|marcador|rival/i)
})
