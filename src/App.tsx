import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage'
import { AccountPage } from '@/pages/auth/AccountPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { TeamsPage } from '@/pages/teams/TeamsPage'
import { TeamDetailPage } from '@/pages/teams/TeamDetailPage'
import { PlayersPage } from '@/pages/players/PlayersPage'
import { PlayerNewPage } from '@/pages/players/PlayerNewPage'
import { MatchesPage } from '@/pages/matches/MatchesPage'
import { MatchDetailPage } from '@/pages/matches/MatchDetailPage'
import { MatchListPage } from '@/pages/partidos/MatchListPage'
import { MatchCreatePage } from '@/pages/partidos/MatchCreatePage'
import { MatchRecordDetailPage } from '@/pages/partidos/MatchRecordDetailPage'
import { MatchStatsImportPage } from '@/pages/partidos/MatchStatsImportPage'
import { VideoUploadPage } from '@/pages/videos/VideoUploadPage'
import { VideoCollectionsPage } from '@/pages/videos/VideoCollectionsPage'
import { VideoCollectionDetailPage } from '@/pages/videos/VideoCollectionDetailPage'
import { AnalysisPage } from '@/pages/analysis/AnalysisPage'
import { AnalysisJobNewPage } from '@/pages/analysis/AnalysisJobNewPage'
import { AnalysisNewPage } from '@/pages/analysis/AnalysisNewPage'
import { AnalysisDetailPage } from '@/pages/analysis/AnalysisDetailPage'
import { AnalysisJobDetailPage } from '@/pages/analysis/AnalysisJobDetailPage'
import { ManualAnalysisPage } from '@/pages/analysis/ManualAnalysisPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/recuperar-password" element={<ForgotPasswordPage />} />
        <Route path="/restablecer-password" element={<ResetPasswordPage />} />
        <Route path="/verificar-email" element={<VerifyEmailPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/cuenta" element={<AccountPage />} />
            <Route path="/equipos" element={<TeamsPage />} />
            <Route path="/equipos/:teamId" element={<TeamDetailPage />} />
            <Route path="/jugadores" element={<PlayersPage />} />
            <Route path="/jugadores/nuevo" element={<PlayerNewPage />} />
            <Route path="/videos" element={<MatchesPage />} />
            <Route path="/videos/subir" element={<VideoUploadPage />} />
            <Route path="/videos/:videoId" element={<MatchDetailPage />} />
            <Route path="/videos/:videoId/colecciones" element={<VideoCollectionsPage />} />
            <Route path="/videos/:videoId/colecciones/:collectionId" element={<VideoCollectionDetailPage />} />
            <Route path="/partidos" element={<MatchListPage />} />
            <Route path="/partidos/nuevo" element={<MatchCreatePage />} />
            <Route path="/partidos/:matchId" element={<MatchRecordDetailPage />} />
            <Route path="/partidos/:matchId/estadisticas" element={<MatchStatsImportPage />} />
            <Route path="/analisis" element={<AnalysisPage />} />
            <Route path="/analisis/nuevo" element={<AnalysisJobNewPage />} />
            <Route path="/analisis/jobs/:jobId" element={<AnalysisJobDetailPage />} />
            <Route path="/revision-manual" element={<ManualAnalysisPage />} />
            <Route path="/revision-manual/nuevo" element={<AnalysisNewPage />} />
            <Route path="/analisis/manual/nuevo" element={<Navigate to="/revision-manual/nuevo" replace />} />
            <Route path="/analisis/:id" element={<AnalysisDetailPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  )
}

