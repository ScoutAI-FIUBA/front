import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { TeamsPage } from '@/pages/teams/TeamsPage'
import { PlayersPage } from '@/pages/players/PlayersPage'
import { PlayerNewPage } from '@/pages/players/PlayerNewPage'
import { MatchesPage } from '@/pages/matches/MatchesPage'
import { VideosPage } from '@/pages/videos/VideosPage'
import { VideoUploadPage } from '@/pages/videos/VideoUploadPage'
import { VideoCollectionsPage } from '@/pages/videos/VideoCollectionsPage'
import { VideoCollectionDetailPage } from '@/pages/videos/VideoCollectionDetailPage'
import { AnalysisPage } from '@/pages/analysis/AnalysisPage'
import { AnalysisNewPage } from '@/pages/analysis/AnalysisNewPage'
import { AnalysisDetailPage } from '@/pages/analysis/AnalysisDetailPage'
import { AnalysisJobDetailPage } from '@/pages/analysis/AnalysisJobDetailPage'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/equipos" element={<TeamsPage />} />
            <Route path="/jugadores" element={<PlayersPage />} />
            <Route path="/jugadores/nuevo" element={<PlayerNewPage />} />
            <Route path="/partidos" element={<MatchesPage />} />
            <Route path="/videos" element={<VideosPage />} />
            <Route path="/videos/subir" element={<VideoUploadPage />} />
            <Route path="/videos/:videoId/colecciones" element={<VideoCollectionsPage />} />
            <Route path="/videos/:videoId/colecciones/:collectionId" element={<VideoCollectionDetailPage />} />
            <Route path="/analisis" element={<AnalysisPage />} />
            <Route path="/analisis/nuevo" element={<AnalysisNewPage />} />
            <Route path="/analisis/jobs/:jobId" element={<AnalysisJobDetailPage />} />
            <Route path="/analisis/:id" element={<AnalysisDetailPage />} />
          </Route>
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toaster position="top-right" richColors />
    </AuthProvider>
  )
}

