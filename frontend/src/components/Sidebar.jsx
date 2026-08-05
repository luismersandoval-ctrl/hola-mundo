import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Activity, Users, Calendar, MessageCircle, FileText, 
  CreditCard, Video, Mail, ClipboardList, Settings,
  ChevronLeft, ChevronRight, LogOut, Stethoscope,
  BarChart3, Building2, FlaskConical, PenTool
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const menuItems = [
  { 
    section: 'Principal',
    items: [
      { icon: Activity, label: 'Dashboard', path: '/', badge: null },
      { icon: Users, label: 'Pacientes', path: '/pacientes', badge: null },
      { icon: Calendar, label: 'Agenda', path: '/agenda', badge: null },
    ]
  },
  {
    section: 'Clínico',
    items: [
      { icon: FileText, label: 'Historia Clínica', path: '/historia-clinica', badge: null },
      { icon: Stethoscope, label: 'Odontograma', path: '/odontograma', badge: 'Nuevo' },
      { icon: ClipboardList, label: 'Tratamientos', path: '/tratamientos', badge: null },
    ]
  },
  {
    section: 'Comunicación',
    items: [
      { icon: MessageCircle, label: 'Chat WhatsApp', path: '/chat', badge: null },
      { icon: Mail, label: 'Email Marketing', path: '/email-marketing', badge: 'Próx.' },
      { icon: Video, label: 'Telemedicina', path: '/telemedicina', badge: 'Próx.' },
    ]
  },
  {
    section: 'Finanzas',
    items: [
      { icon: CreditCard, label: 'Pagos y Caja', path: '/pagos', badge: 'Próx.' },
      { icon: BarChart3, label: 'Reportes', path: '/reportes', badge: 'Próx.' },
    ]
  },
  {
    section: 'Administración',
    items: [
      { icon: Building2, label: 'Laboratorios', path: '/laboratorios', badge: 'Próx.' },
      { icon: PenTool, label: 'Firma Digital', path: '/firma-digital', badge: 'Próx.' },
      { icon: Settings, label: 'Configuración', path: '/configuracion', badge: null },
    ]
  },
]

export function Sidebar({ onLogout }) {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen z-50 flex flex-col transition-all duration-300 ease-in-out
        ${collapsed ? 'w-[72px]' : 'w-[260px]'}
        glass border-r border-white/10 bg-black/40`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 p-4 border-b border-white/10 min-h-[68px]`}>
        <div className="p-2 bg-primary/20 rounded-xl ring-1 ring-primary/30 shrink-0">
          <Activity className="w-6 h-6 text-primary" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden transition-all duration-300">
            <h2 className="text-lg font-bold text-white tracking-tight whitespace-nowrap">DentalPro</h2>
            <p className="text-[10px] text-zinc-500 whitespace-nowrap">Panel Clínico</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {menuItems.map((group) => (
          <div key={group.section}>
            {!collapsed && (
              <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold px-3 mb-2">
                {group.section}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path || 
                  (item.path !== '/' && location.pathname.startsWith(item.path))
                const Icon = item.icon
                
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                      ${isActive 
                        ? 'bg-primary/15 text-primary shadow-sm shadow-primary/5 ring-1 ring-primary/20' 
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'}
                      ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className={`w-[18px] h-[18px] shrink-0 transition-colors ${isActive ? 'text-primary' : ''}`} />
                    {!collapsed && (
                      <>
                        <span className="whitespace-nowrap">{item.label}</span>
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
        <button
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all
            ${collapsed ? 'justify-center' : ''}`}
          title={collapsed ? 'Cerrar Sesión' : undefined}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!collapsed && <span>Cerrar Sesión</span>}
        </button>
        
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-all"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  )
}
