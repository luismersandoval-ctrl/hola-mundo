import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useOutletContext } from 'react-router-dom'
import { Menu, Moon, Sun } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import ClinicalAccessPage from './pages/ClinicalAccessPage'
import Dashboard from './pages/Dashboard'
import HistoriaClinica from './pages/HistoriaClinica'
import Login from './pages/Login'
import OdontogramaPage from './pages/OdontogramaPage'
import PeriodontogramaPage from './pages/PeriodontogramaPage'
import TreatmentCatalogPage from './pages/TreatmentCatalogPage'
import PagosPage from './pages/PagosPage'
import PatientWorkspace from './pages/PatientWorkspace'
import AgendaPage from './pages/AgendaPage'
import InventoryPage from './pages/InventoryPage'
import ReportsPage from './pages/ReportsPage'
import Register from './pages/Register'
import RemindersPage from './pages/RemindersPage'
import IntegrationsPage from './pages/IntegrationsPage'
import StaffPage from './pages/StaffPage'
import { api } from './lib/api'
import { LanguageProvider, LanguageToggle } from './lib/i18n'
import odontoSpaceLogo from '@/assets/brand/odontospace-logo.png'

function AuthenticatedLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('odontospace-theme') || 'dark')

  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light')
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('odontospace-theme', theme)
  }, [theme])

  useEffect(() => {
    api.get('/users/me').then(({ data }) => setCurrentUser(data))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen">
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
        onCollapsedChange={setSidebarCollapsed}
        onLogout={handleLogout}
        currentUser={currentUser}
        theme={theme}
        onThemeChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}
      <header className="fixed top-0 inset-x-0 z-30 h-16 px-4 flex items-center justify-between border-b border-white/10 bg-zinc-950/90 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Abrir menú" className="p-2 rounded-lg text-zinc-300 hover:bg-white/10">
          <Menu className="w-6 h-6" />
        </button>
        <div className="rounded-lg bg-white/95 px-2 pb-1"><img src={odontoSpaceLogo} alt="OdontoSpace" className="h-auto w-[155px]"/><span className="-mt-5 ml-[39px] block max-w-[116px] truncate text-[10px] font-semibold text-violet-800">{currentUser?.clinic_name}</span></div>
        <div className="flex items-center gap-1"><LanguageToggle compact/><button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro'} className="p-2 rounded-lg text-zinc-300 hover:bg-white/10">{theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button></div>
      </header>
      <main className={`min-h-screen pt-16 lg:pt-0 transition-[margin] duration-300 ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'}`}>
        <Outlet context={{ currentUser }} />
      </main>
    </div>
  )
}

function AdministrativeOnly({ children }) {
  const { currentUser } = useOutletContext()
  if (!currentUser) return null
  return ['admin', 'administrative'].includes(currentUser.role) ? children : <Navigate to="/dashboard" replace />
}

function App() {
  const isAuthenticated = Boolean(localStorage.getItem('token'))

  return (
    <LanguageProvider><BrowserRouter>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" replace />} />
        <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" replace />} />
        <Route element={isAuthenticated ? <AuthenticatedLayout /> : <Navigate to="/login" replace />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="pacientes/:id" element={<PatientWorkspace />} />
          <Route path="historia-clinica" element={<ClinicalAccessPage mode="history" />} />
          <Route path="pacientes/:id/historia-clinica" element={<HistoriaClinica />} />
          <Route path="odontograma" element={<ClinicalAccessPage mode="odontogram" />} />
          <Route path="pacientes/:id/odontograma" element={<OdontogramaPage />} />
          <Route path="periodontograma" element={<ClinicalAccessPage mode="periodontogram" />} />
          <Route path="pacientes/:id/periodontograma" element={<PeriodontogramaPage />} />
          <Route path="pagos" element={<AdministrativeOnly><div className="p-4 md:p-8"><PagosPage /></div></AdministrativeOnly>} />
          <Route path="inventario" element={<AdministrativeOnly><InventoryPage /></AdministrativeOnly>} />
          <Route path="reportes" element={<ReportsPage />} />
          <Route path="recordatorios" element={<RemindersPage />} />
          <Route path="integraciones" element={<IntegrationsPage />} />
          <Route path="personal" element={<StaffPage />} />
          <Route path="planes-tratamiento" element={<TreatmentCatalogPage />} />
        </Route>
        <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
      </Routes>
    </BrowserRouter></LanguageProvider>
  )
}

export default App
