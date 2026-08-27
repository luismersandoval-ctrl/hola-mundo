import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Activity, AlertTriangle, Boxes, Calendar, CalendarClock, ChevronLeft, ChevronRight, Clock3, PackageX, Users } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const isToday = (value) => {
  const date = new Date(value)
  const today = new Date()
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate()
}

const dateKey = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const startOfWeek = (offset = 0) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  const distanceFromMonday = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - distanceFromMonday + (offset * 7))
  return date
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { currentUser } = useOutletContext()
  const canViewInventory = ['admin', 'administrative'].includes(currentUser?.role)
  const isClinicalProfessional = ['dentist', 'specialist'].includes(currentUser?.role)
  const [patients, setPatients] = useState([])
  const [appointments, setAppointments] = useState([])
  const [inventory, setInventory] = useState([])
  const [error, setError] = useState('')
  const [weekOffset, setWeekOffset] = useState(0)

  const load = useCallback(async () => {
    try {
      const [patientsResponse, appointmentsResponse, inventoryResponse] = await Promise.all([
        api.get('/patients/'),
        api.get('/appointments/'),
        canViewInventory ? api.get('/inventory/') : Promise.resolve({ data: [] }),
      ])
      setPatients(patientsResponse.data)
      setAppointments(appointmentsResponse.data)
      setInventory(inventoryResponse.data)
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'No fue posible cargar el resumen de la clínica.')
    }
  }, [canViewInventory])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const todayAppointments = useMemo(
    () => appointments.filter((appointment) => isToday(appointment.date)),
    [appointments],
  )
  const pendingAppointments = useMemo(
    () => appointments.filter((appointment) => ['pending', 'confirmed', 'in_room'].includes(appointment.status)),
    [appointments],
  )
  const upcomingAppointments = useMemo(() => appointments
    .filter((appointment) => new Date(appointment.date) >= new Date() && !['completed', 'cancelled', 'no_show'].includes(appointment.status))
    .sort((left, right) => new Date(left.date) - new Date(right.date))
    .slice(0, 6), [appointments])
  const patientNames = useMemo(() => Object.fromEntries(patients.map((patient) => [patient.id, patient.name])), [patients])
  const inventoryAlerts = useMemo(() => inventory
    .filter((item) => Number(item.quantity) <= Number(item.min_stock))
    .sort((left, right) => Number(left.quantity) - Number(right.quantity)), [inventory])
  const exhaustedItems = inventoryAlerts.filter((item) => Number(item.quantity) <= 0)
  const weeklyAppointments = useMemo(() => {
    const monday = startOfWeek(weekOffset)
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday)
      date.setDate(monday.getDate() + index)
      const key = dateKey(date)
      const value = appointments.filter((appointment) => appointment.date.slice(0, 10) === key && appointment.status !== 'cancelled').length
      return { key, date, value }
    })
  }, [appointments, weekOffset])
  const weeklyTotal = weeklyAppointments.reduce((total, day) => total + day.value, 0)
  const weeklyMaximum = Math.max(...weeklyAppointments.map((day) => day.value), 1)
  const weekStart = weeklyAppointments[0].date
  const weekEnd = weeklyAppointments[6].date
  const weekLabel = `${weekStart.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} – ${weekEnd.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}`

  const cards = [
    { label: isClinicalProfessional ? 'Mis pacientes' : 'Pacientes registrados', value: patients.length, icon: Users, color: 'text-blue-400', background: 'bg-blue-500/10' },
    { label: 'Citas para hoy', value: todayAppointments.length, icon: Calendar, color: 'text-emerald-400', background: 'bg-emerald-500/10' },
    { label: 'Citas pendientes', value: pendingAppointments.length, icon: CalendarClock, color: 'text-amber-400', background: 'bg-amber-500/10' },
  ]

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-primary"><Activity className="h-5 w-5" /><span className="text-sm font-semibold">{isClinicalProfessional ? 'Mi jornada clínica' : 'Resumen administrativo'}</span></div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="mt-1 text-zinc-400">{isClinicalProfessional ? 'Tus próximas citas y actividad semanal, sin mostrar la agenda de otros profesionales.' : 'Prioridades, próximas citas e indicadores generales de la clínica.'}</p>
          </div>
          <Button onClick={() => navigate('/agenda')}><Calendar className="mr-2 h-4 w-4" />Abrir agenda</Button>
        </header>

        {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ label, value, icon: Icon, color, background }) => (
            <Card key={label} className="glass border-white/10">
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">{label}</CardTitle>
                <span className={`rounded-xl p-2 ${background}`}><Icon className={`h-5 w-5 ${color}`} /></span>
              </CardHeader>
              <CardContent><p className="text-4xl font-bold text-white">{value}</p></CardContent>
            </Card>
          ))}
        </div>

        <div className={`grid gap-6 ${canViewInventory ? 'lg:grid-cols-[1.15fr_0.85fr]' : ''}`}>
          <Card className="glass overflow-hidden border-white/10">
            <CardHeader className="flex-row items-center justify-between gap-3 border-b border-white/10">
              <div><CardTitle className="flex items-center gap-2 text-white"><CalendarClock className="h-5 w-5 text-primary"/>Próximas citas</CardTitle><p className="mt-1 text-sm text-zinc-400">{isClinicalProfessional ? 'Solo se muestran las citas asignadas a ti.' : 'Siguientes pacientes programados en la clínica.'}</p></div>
              <Button size="sm" variant="outline" onClick={()=>navigate('/agenda')} className="shrink-0 border-white/10">Ver agenda</Button>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingAppointments.length===0?<p className="p-8 text-center text-sm text-zinc-500">No hay citas próximas pendientes.</p>:<div className="divide-y divide-white/5">{upcomingAppointments.map((appointment,index)=><button type="button" key={appointment.id} onClick={()=>navigate('/agenda')} className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-white/[0.04]"><div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${index===0?'bg-primary text-primary-foreground':'bg-white/[0.05] text-zinc-300'}`}><div className="text-center"><p className="text-[9px] font-semibold uppercase">{new Date(appointment.date).toLocaleDateString('es-CO',{weekday:'short'}).replace('.','')}</p><p className="text-lg font-bold leading-none">{new Date(appointment.date).getDate()}</p></div></div><div className="min-w-0 flex-1"><p className="truncate font-semibold text-white">{patientNames[appointment.patient_id]||`Paciente #${appointment.patient_id}`}</p><p className="mt-0.5 truncate text-xs text-zinc-400">{appointment.reason||'Consulta odontológica'}</p></div><div className="shrink-0 text-right"><p className="flex items-center gap-1 text-sm font-semibold text-primary"><Clock3 className="h-3.5 w-3.5"/>{new Date(appointment.date).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})}</p><p className="mt-1 text-[10px] text-zinc-500">{appointment.duration_minutes||15} min</p></div></button>)}</div>}
            </CardContent>
          </Card>

          {canViewInventory&&<Card className="glass overflow-hidden border-white/10">
            <CardHeader className="flex-row items-center justify-between gap-3 border-b border-white/10"><div><CardTitle className="flex items-center gap-2 text-white"><Boxes className="h-5 w-5 text-amber-400"/>Alertas de inventario</CardTitle><p className="mt-1 text-sm text-zinc-400">Insumos agotados o en su cantidad mínima.</p></div><Button size="sm" variant="outline" onClick={()=>navigate('/inventario')} className="shrink-0 border-white/10">Ver inventario</Button></CardHeader>
            <CardContent className="p-4"><div className="mb-4 grid grid-cols-2 gap-3"><div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3"><PackageX className="mb-2 h-5 w-5 text-red-400"/><p className="text-2xl font-bold text-red-300">{exhaustedItems.length}</p><p className="text-xs text-zinc-400">Agotados</p></div><div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3"><AlertTriangle className="mb-2 h-5 w-5 text-amber-400"/><p className="text-2xl font-bold text-amber-300">{inventoryAlerts.length-exhaustedItems.length}</p><p className="text-xs text-zinc-400">En mínimo</p></div></div>{inventoryAlerts.length===0?<p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center text-sm text-emerald-300">Todo el inventario está sobre el nivel mínimo.</p>:<div className="max-h-64 space-y-2 overflow-y-auto">{inventoryAlerts.map(item=><div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{item.name}</p><p className="text-[10px] text-zinc-500">Mínimo requerido: {item.min_stock}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${Number(item.quantity)<=0?'bg-red-500/15 text-red-300':'bg-amber-500/15 text-amber-300'}`}>{Number(item.quantity)<=0?'Agotado':`${item.quantity} disponibles`}</span></div>)}</div>}</CardContent>
          </Card>}
        </div>

        <Card className="glass border-white/10">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-white">Pacientes agendados por día</CardTitle>
              <p className="mt-1 text-sm text-zinc-400">Comparación semanal de citas programadas. No incluye citas canceladas.</p>
            </div>
            <div className="rounded-xl bg-blue-500/10 px-4 py-2 text-right">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{weeklyTotal}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Esta semana</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-5 flex items-center justify-between gap-3">
              <Button size="icon" variant="outline" onClick={() => setWeekOffset((value) => value - 1)} className="border-white/10" aria-label="Semana anterior"><ChevronLeft className="h-4 w-4" /></Button>
              <div className="text-center"><p className="text-sm font-semibold capitalize text-white">{weekLabel}</p>{weekOffset !== 0 && <button type="button" onClick={() => setWeekOffset(0)} className="mt-1 text-xs font-medium text-primary hover:underline">Volver a esta semana</button>}</div>
              <Button size="icon" variant="outline" onClick={() => setWeekOffset((value) => value + 1)} className="border-white/10" aria-label="Semana siguiente"><ChevronRight className="h-4 w-4" /></Button>
            </div>
            <div className="grid h-64 grid-cols-7 items-end gap-2 border-b border-white/10 px-1 sm:gap-4" role="img" aria-label={`${weeklyTotal} citas agendadas durante la semana ${weekLabel}`}>
              {weeklyAppointments.map((day) => {
                const today = dateKey(new Date()) === day.key
                const isPeak = day.value > 0 && day.value === weeklyMaximum
                return <div key={day.key} className="flex h-full min-w-0 flex-col justify-end text-center">
                  <span className={`mb-2 text-sm font-bold ${isPeak ? 'text-primary' : 'text-white'}`}>{day.value}</span>
                  <div className="flex h-44 items-end justify-center rounded-t-lg bg-white/[0.03] px-1">
                    <div className={`w-full max-w-14 rounded-t-lg transition-[height] duration-500 ${isPeak ? 'bg-primary' : 'bg-blue-500/65'}`} style={{ height: day.value ? `${Math.max((day.value / weeklyMaximum) * 100, 8)}%` : '3px' }} />
                  </div>
                  <p className={`mt-2 truncate text-[10px] font-semibold uppercase sm:text-xs ${today ? 'text-primary' : 'text-zinc-500'}`}>{day.date.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '')}</p>
                  <p className={`text-xs font-bold ${today ? 'text-primary' : 'text-zinc-400'}`}>{day.date.getDate()}</p>
                </div>
              })}
            </div>
            {weeklyTotal === 0 && (
              <p className="mt-4 text-center text-sm text-zinc-500">No hay pacientes agendados durante esta semana.</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass border-white/10">
          <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-semibold text-white">Agenda centralizada</h2>
              <p className="mt-1 text-sm text-zinc-400">Desde la agenda puedes seleccionar un horario, registrar un paciente nuevo y asignar el profesional y la duración.</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/agenda')} className="shrink-0 border-white/10">Ir a la agenda</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
