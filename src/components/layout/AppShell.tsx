import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  UserCheck,
  Users,
  Video,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/equipos', label: 'Mis equipos', icon: Users },
  { to: '/jugadores', label: 'Mis jugadores', icon: UserCheck },
  { to: '/partidos', label: 'Partidos', icon: Users },
  { to: '/videos', label: 'Videos', icon: Video },
  { to: '/analisis', label: 'Análisis', icon: BarChart3 },
]

export function AppShell() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-[#F9F9F9]">
      <aside className="flex w-64 flex-col border-r bg-white">
        <div className="border-b p-5">
          <p className="text-lg font-bold text-primary">ScoutAI</p>
          <p className="mt-3 text-sm font-medium">{user?.fullName ?? 'Analista'}</p>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {user?.role === 'analyst' ? 'SCOUT' : user?.role}
          </p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          <p className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Navegación</p>
          {navItems.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || pathname.startsWith(`${to}/`)
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'bg-primary text-white' : 'text-foreground hover:bg-accent',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="space-y-1 border-t p-3">
          <Button className="w-full" onClick={() => navigate('/analisis/nuevo')}>
            + Nuevo análisis
          </Button>
          <button type="button" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
            <Settings className="h-4 w-4" /> Configuración
          </button>
          <button type="button" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent">
            <HelpCircle className="h-4 w-4" /> Ayuda
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-white px-6 py-4">
          <h1 className="text-lg font-semibold capitalize">
            {navItems.find((n) => pathname.startsWith(n.to))?.label ?? 'ScoutAI'}
          </h1>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="w-64 pl-9" placeholder="Buscar jugador o equipo..." />
            </div>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
            >
              <LogOut className="h-4 w-4" /> Cerrar Sesión
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}



