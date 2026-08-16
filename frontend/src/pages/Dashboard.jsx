import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Calendar, CalendarClock, Users } from 'lucide-react'
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

export default function Dashboard() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [appointments, setAppointments] = useState([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [patientsResponse, appointmentsResponse] = await Promise.all([
        api.get('/patients/'),
        api.get('/appointments/'),
      ])
      setPatients(patientsResponse.data)
      setAppointments(appointmentsResponse.data)
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'No fue posible cargar el resumen de la clínica.')
    }
  }, [])

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

  const cards = [
    { label: 'Pacientes registrados', value: patients.length, icon: Users, color: 'text-blue-400', background: 'bg-blue-500/10' },
    { label: 'Citas para hoy', value: todayAppointments.length, icon: Calendar, color: 'text-emerald-400', background: 'bg-emerald-500/10' },
    { label: 'Citas pendientes', value: pendingAppointments.length, icon: CalendarClock, color: 'text-amber-400', background: 'bg-amber-500/10' },
  ]

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-primary"><Activity className="h-5 w-5" /><span className="text-sm font-semibold">Resumen administrativo</span></div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="mt-1 text-zinc-400">Indicadores generales de la clínica. La operación diaria se realiza desde la Agenda.</p>
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
