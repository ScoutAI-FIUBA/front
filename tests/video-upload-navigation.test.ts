import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  safeVideoUploadReturnPath,
  videoUploadPath,
  videoUploadReturnPath,
  videoUploadSuccessPath,
} from '../src/pages/videos/video-upload-navigation.ts'

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

test('upload returning to new analysis selects the created video', () => {
  const params = new URLSearchParams('return_to=%2Fanalisis%2Fnuevo%3Fteam_id%3Dteam-1')
  assert.equal(videoUploadSuccessPath(params, { id: 'video/1', teamId: 'team-1' }), '/analisis/nuevo?team_id=team-1&video_id=video%2F1')
})

test('upload drop affordance has real handlers and a pending guard', () => {
  const source = readFileSync(new URL('../src/pages/videos/VideoUploadPage.tsx', import.meta.url), 'utf8')
  assert.match(source, /onDragEnter=/)
  assert.match(source, /onDragOver=/)
  assert.match(source, /onDrop=\{handleDrop\}/)
  assert.match(source, /isUploading/)
  assert.match(source, /videoUploadSuccessPath/)
})
