import { useNavigate, useLocation } from 'react-router-dom'
import {
  Activity, FileText, CreditCard, Calendar, Boxes, BarChart3, BellRing, Settings2,
  ChevronLeft, ChevronRight, LogOut, Stethoscope, X, UsersRound, Moon, Sun, Waves,
} from 'lucide-react'
import { LanguageToggle, useLanguage } from '@/lib/i18n'

const menuItems = [
  { 
    section: 'Principal', sectionKey:'main',
    items: [
      { icon: Calendar, label: 'Agenda', labelKey:'agenda', path: '/agenda', badge: null },
    ]
  },
  {
    section: 'Comunicación', sectionKey:'communication',
    items: [
      { icon: BellRing, label: 'Recordatorios', labelKey:'reminders', path: '/recordatorios', badge: null },
    ]
  },
  {
    section: 'Clínico', sectionKey:'clinical',
    items: [
      { icon: FileText, label: 'Historia Clínica', labelKey:'history', path: '/historia-clinica', match: 'historia-clinica', badge: null },
      { icon: Stethoscope, label: 'Odontograma', labelKey:'odontogram', path: '/odontograma', match: 'odontograma', badge: null },
      { icon: Waves, label: 'Periodontograma', labelKey:'periodontogram', path: '/periodontograma', match: 'periodontograma', badge: null },
    ]
  },
  {
    section: 'Finanzas', sectionKey:'finance',
    items: [
      { icon: CreditCard, label: 'Pagos y Caja', labelKey:'payments', path: '/pagos', badge: 'Demo' },
      { icon: Boxes, label: 'Inventario', labelKey:'inventory', path: '/inventario', badge: null },
      { icon: BarChart3, label: 'Reportes', labelKey:'reports', path: '/reportes', badge: null, allowedRoles: ['admin', 'administrative'] },
    ]
  },
  {
    section: 'Resumen', sectionKey:'summary',
    items: [
      { icon: Activity, label: 'Dashboard', labelKey:'dashboard', path: '/dashboard', badge: null },
    ]
  },
  {
    section: 'Configuración', sectionKey:'settings',
    items: [
      { icon: Settings2, label: 'Integraciones', labelKey:'integrations', path: '/integraciones', badge: null, adminOnly: true },
      { icon: UsersRound, label: 'Equipo', labelKey:'team', path: '/personal', badge: null, ownerOnly: true },
    ]
  },
]

export function Sidebar({ collapsed, mobileOpen, onMobileClose, onCollapsedChange, onLogout, currentUser, theme, onThemeChange }) {
  const {t}=useLanguage()
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen z-50 flex flex-col transition-all duration-300 ease-in-out w-[280px]
        ${collapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        glass border-r border-white/10 bg-black/40`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 p-4 border-b border-white/10 min-h-[68px]`}>
        <div className="p-2 bg-primary/20 rounded-xl ring-1 ring-primary/30 shrink-0">
          <Activity className="w-6 h-6 text-primary" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden transition-all duration-300">
            <h2 className="text-lg font-bold text-white tracking-tight whitespace-nowrap">OdontoSpace</h2>
            <p className="max-w-[170px] truncate text-[11px] font-medium text-primary">{currentUser?.clinic_name || t('clinicManagement')}</p>
          </div>
        )}
        <button type="button" onClick={onMobileClose} aria-label="Cerrar menú" className="ml-auto p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 lg:hidden">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {menuItems.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold px-3 mb-2">
                {t(`sections.${group.sectionKey}`)}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.filter((item) => (!item.adminOnly || currentUser?.role === 'admin') && (!item.ownerOnly || currentUser?.is_clinic_owner) && (!item.allowedRoles || item.allowedRoles.includes(currentUser?.role))).map((item) => {
                const isActive = location.pathname === item.path ||
                  (item.match && location.pathname.includes(item.match)) ||
                  (item.path !== '/' && location.pathname.startsWith(item.path))
                const Icon = item.icon
                
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); onMobileClose() }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                      ${isActive 
                        ? 'bg-primary/15 text-primary shadow-sm shadow-primary/5 ring-1 ring-primary/20' 
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'}
                      ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? t(`menu.${item.labelKey}`) : undefined}
                  >
                    <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${isActive ? 'text-primary' : ''}`} />
                    {!collapsed && (
                      <>
                        <span className="whitespace-nowrap">{t(`menu.${item.labelKey}`)}</span>
                        {item.badge && (
                          <span className={`ml-auto text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full whitespace-nowrap
                            ${item.badge === 'Nuevo' 
                              ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' 
                              : 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30'}`}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-3 space-y-2">
        <div className={`flex ${collapsed?'justify-center':'justify-between'} items-center`}>{!collapsed&&<span className="px-2 text-xs text-zinc-500">{t('language')}</span>}<LanguageToggle compact={collapsed}/></div>
        {!collapsed && currentUser && <div className="px-3 py-2 rounded-xl bg-white/[0.03]"><p className="truncate text-xs font-medium text-zinc-200">{currentUser.display_name || currentUser.full_name || currentUser.email || currentUser.username}</p><p className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-500">{{ admin: 'Administrador', dentist: 'Odontólogo general', specialist: 'Especialista', administrative: 'Personal administrativo' }[currentUser.role] || currentUser.role}</p></div>}
        <button
          type="button"
          onClick={onThemeChange}
          className={`theme-switch w-full flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/5 transition-all ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? (theme === 'dark' ? 'Activar tema claro' : 'Activar tema oscuro') : undefined}
        >
          {theme === 'dark' ? <Sun className="h-[18px] w-[18px] shrink-0 text-amber-400" /> : <Moon className="h-[18px] w-[18px] shrink-0 text-blue-600" />}
          {!collapsed && <span>{theme === 'dark' ? t('lightTheme') : t('darkTheme')}</span>}
        </button>
        <button
          onClick={() => { onMobileClose(); onLogout() }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all
            ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Cerrar Sesión' : undefined}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>{t('logout')}</span>}
        </button>
        
        <button
          onClick={() => onCollapsedChange(!collapsed)}
          className="hidden lg:flex w-full items-center justify-center p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  )
}
