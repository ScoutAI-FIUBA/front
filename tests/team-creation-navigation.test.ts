import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import type { CreateTeamDto } from '../src/services/contracts/teams.service.ts'
import type { Team } from '../src/types/index.ts'
import {
  createTeamWithNavigationContext,
  teamCreationReturnPath,
  teamsPathForVideoUpload,
} from '../src/pages/teams/team-creation-navigation.ts'

const values: CreateTeamDto = {
  name: 'Club Atlético Norte',
  shortName: 'CAN',
  city: 'Rosario',
  country: 'Argentina',
  isOwn: true,
}

const createdTeam: Team = {
  id: 'team/created',
  ...values,
  isOwn: true,
}

test('creating a team from Subir video returns with the new team selected', async () => {
  const teamsPath = teamsPathForVideoUpload()
  const requestedReturn = new URL(teamsPath, 'https://scoutai.local').searchParams.get('return_to')
  const result = await createTeamWithNavigationContext({
    values,
    requestedReturn,
    createTeam: async () => createdTeam,
  })

  assert.equal(teamsPath, '/equipos?return_to=%2Fvideos%2Fsubir')
  assert.equal(result.team, createdTeam)
  assert.equal(result.returnPath, '/videos/subir?team_id=team%2Fcreated')
})

test('normal team creation does not introduce a redirect', async () => {
  const result = await createTeamWithNavigationContext({
    values,
    requestedReturn: null,
    createTeam: async () => createdTeam,
  })

  assert.equal(result.returnPath, null)
})

test('team creation accepts only the exact video upload return target', () => {
  assert.equal(teamCreationReturnPath('/videos/subir', 'team-1'), '/videos/subir?team_id=team-1')
  assert.equal(teamCreationReturnPath('https://evil.example/steal', 'team-1'), null)
  assert.equal(teamCreationReturnPath('//evil.example/steal', 'team-1'), null)
  assert.equal(teamCreationReturnPath('/videos/subir?team_id=other', 'team-1'), null)
  assert.equal(teamCreationReturnPath('/equipos', 'team-1'), null)
})

test('a failed creation produces no navigation result', async () => {
  await assert.rejects(
    createTeamWithNavigationContext({
      values,
      requestedReturn: '/videos/subir',
      createTeam: async () => {
        throw new Error('creation failed')
      },
    }),
    /creation failed/,
  )
})

test('cancel only closes the team dialog and never navigates', () => {
  const dialogSource = readFileSync(
    new URL('../src/pages/teams/TeamFormDialog.tsx', import.meta.url),
    'utf8',
  )
  const teamsSource = readFileSync(
    new URL('../src/pages/teams/TeamsPage.tsx', import.meta.url),
    'utf8',
  )
  const uploadSource = readFileSync(
    new URL('../src/pages/videos/VideoUploadPage.tsx', import.meta.url),
    'utf8',
  )
  const submitFlow = teamsSource.slice(
    teamsSource.indexOf('const submitTeam'),
    teamsSource.indexOf('const deleteTeam'),
  )

  assert.match(dialogSource, />\s*Cancelar\s*<\/Button>/)
  assert.match(dialogSource, /onClick=\{\(\) => onOpenChange\(false\)\}/)
  assert.doesNotMatch(dialogSource, /navigate\(/)
  assert.match(submitFlow, /returnPath = created\.returnPath[\s\S]*if \(returnPath\)[\s\S]*navigate\(returnPath/)
  assert.doesNotMatch(submitFlow.match(/catch \(error\)[\s\S]*?finally/)?.[0] ?? '', /navigate\(|setFormOpen/)
  assert.match(uploadSource, /to=\{teamsPathForVideoUpload\(\)\}/)
})
