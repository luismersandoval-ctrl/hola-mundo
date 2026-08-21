import { useCallback, useEffect, useState } from 'react'
import { Navigate, useOutletContext } from 'react-router-dom'
import { Building2, CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck, UserPlus, UsersRound } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const roles = {
  admin: 'Administrador',
  dentist: 'Odontólogo general',
  specialist: 'Especialista',
  administrative: 'Personal administrativo',
}

const errorMessage = (error) => error.response?.data?.detail || 'No fue posible completar la operación.'

export default function StaffPage() {
  const { currentUser } = useOutletContext()
  const [staff, setStaff] = useState([])
  const [patients, setPatients] = useState([])
  const [rooms, setRooms] = useState([])
  const [roomCount, setRoomCount] = useState(1)
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', role: 'dentist', gender: 'male' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingRooms, setSavingRooms] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [staffResponse, patientsResponse, roomsResponse] = await Promise.all([api.get('/staff/'), api.get('/patients/'), api.get('/rooms/')])
      setStaff(staffResponse.data)
      setPatients(patientsResponse.data)
      setRooms(roomsResponse.data)
      setRoomCount(Math.max(roomsResponse.data.length, 1))
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Data is loaded asynchronously and state updates after the requests resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  if (currentUser && !currentUser.is_clinic_owner) return <Navigate to="/" replace />

  const createWorker = async (event) => {
    event.preventDefault()
    setSaving(true); setError(''); setMessage('')
    try {
      await api.post('/staff/', form)
      setForm({ name: '', username: '', email: '', password: '', role: 'dentist', gender: 'male' })
      setMessage('Trabajador creado. Ya puede iniciar sesión con el usuario y contraseña asignados.')
      await load()
    } catch (requestError) { setError(errorMessage(requestError)) } finally { setSaving(false) }
  }

  const toggleWorker = async (worker) => {
    setError(''); setMessage('')
    try {
      await api.put(`/staff/${worker.id}`, { active: !worker.active })
      setMessage(worker.active ? 'Acceso desactivado.' : 'Acceso activado.')
      await load()
    } catch (requestError) { setError(errorMessage(requestError)) }
  }

  const assignPatient = async (patientId, value) => {
    setError(''); setMessage('')
    try {
      const assigned = value === 'none' ? '' : value
      await api.put(`/patients/${patientId}/assignment${assigned ? `?assigned_user_id=${assigned}` : ''}`)
      setMessage('Profesional responsable actualizado.')
      await load()
    } catch (requestError) { setError(errorMessage(requestError)) }
  }

  const configureRooms = async (event) => {
    event.preventDefault()
    const count = Math.min(20, Math.max(1, Number(roomCount) || 1))
    setRoomCount(count); setSavingRooms(true); setError(''); setMessage('')
    try {
      const { data } = await api.put('/rooms/count', { count })
      setRooms(data)
      setRoomCount(data.length)
      setMessage(`Consultorios configurados: ${data.length}.`)
    } catch (requestError) { setError(errorMessage(requestError)) } finally { setSavingRooms(false) }
  }

  if (loading || !currentUser) return <div className="min-h-screen flex items-center justify-center text-zinc-400"><Loader2 className="w-5 h-5 mr-2 animate-spin" />Cargando equipo...</div>
  const professionals = staff.filter((worker) => worker.active && ['dentist', 'specialist'].includes(worker.role))

  return <div className="min-h-screen p-4 md:p-8"><div className="mx-auto max-w-6xl space-y-6">
    <header><p className="text-sm font-medium text-primary">{currentUser.clinic_name}</p><h1 className="mt-1 text-3xl font-bold text-white">Equipo</h1><p className="mt-2 text-zinc-400">Administra el acceso del personal y asigna cada paciente a su profesional responsable.</p></header>
    {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-300">{error}</div>}
    {message && <div role="status" className="flex gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300"><CheckCircle2 className="w-5 h-5" />{message}</div>}
    <Card className="glass border-white/10"><CardHeader><CardTitle className="flex items-center gap-2 text-white"><Building2 className="h-5 w-5 text-primary" />Consultorios</CardTitle><CardDescription>Define cuántos consultorios o unidades odontológicas utiliza la clínica. El valor predeterminado es 1.</CardDescription></CardHeader><CardContent><form onSubmit={configureRooms} className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="w-full sm:max-w-xs"><Label htmlFor="room-count">Cantidad de consultorios</Label><Input id="room-count" type="number" min="1" max="20" required value={roomCount} onChange={(event) => setRoomCount(event.target.value)} className="mt-1 bg-white/5 border-white/10" /></div><Button disabled={savingRooms}>{savingRooms ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Building2 className="mr-2 h-4 w-4" />}Guardar configuración</Button><p className="text-xs text-zinc-500 sm:pb-2">Activos actualmente: {rooms.length}</p></form></CardContent></Card>
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card className="glass border-white/10 h-fit"><CardHeader><CardTitle className="flex items-center gap-2 text-white"><UserPlus className="w-5 h-5 text-primary" />Agregar trabajador</CardTitle><CardDescription>La contraseña inicial debe cumplir las reglas de seguridad.</CardDescription></CardHeader><CardContent><form onSubmit={createWorker} className="space-y-4">
        <div><Label>Nombre completo</Label><Input required minLength={3} value={form.name} onChange={(e) => setForm({...form,name:e.target.value})} className="mt-1 bg-white/5 border-white/10" /></div>
        <div><Label>Género</Label><select value={form.gender} onChange={(e) => setForm({...form,gender:e.target.value})} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-zinc-900 px-3 text-sm text-white"><option value="male">Masculino</option><option value="female">Femenino</option><option value="other">Otro</option><option value="unspecified">Prefiere no indicar</option></select>{['dentist','specialist'].includes(form.role) && <p className="mt-1 text-[11px] text-zinc-500">Se mostrará automáticamente como {form.gender === 'male' ? 'Dr.' : form.gender === 'female' ? 'Dra.' : 'nombre sin tratamiento'}.</p>}</div>
        <div><Label>Nombre de usuario</Label><Input required minLength={4} maxLength={40} pattern="[a-zA-Z0-9._-]+" autoComplete="username" placeholder="ej. maria.perez" value={form.username} onChange={(e) => setForm({...form,username:e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g,'')})} className="mt-1 bg-white/5 border-white/10" /><p className="mt-1 text-[11px] text-zinc-500">Será utilizado para iniciar sesión.</p></div>
        <div><Label>Correo</Label><Input required type="email" value={form.email} onChange={(e) => setForm({...form,email:e.target.value})} className="mt-1 bg-white/5 border-white/10" /></div>
        <div><Label>Rol</Label><select value={form.role} onChange={(e) => setForm({...form,role:e.target.value})} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-zinc-900 px-3 text-sm text-white"><option value="dentist">Odontólogo general</option><option value="specialist">Especialista</option><option value="administrative">Personal administrativo</option></select></div>
        <div><Label>Contraseña inicial</Label><div className="relative mt-1"><Input required minLength={10} type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({...form,password:e.target.value})} className="pr-11 bg-white/5 border-white/10" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-zinc-400">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button></div><p className="mt-1 text-[11px] text-zinc-500">10 caracteres, mayúscula, minúscula, número y símbolo.</p></div>
        <Button disabled={saving} className="w-full">{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}Crear acceso</Button>
      </form></CardContent></Card>
      <Card className="glass border-white/10"><CardHeader><CardTitle className="flex items-center gap-2 text-white"><UsersRound className="w-5 h-5 text-primary" />Personal registrado</CardTitle></CardHeader><CardContent className="space-y-3">{staff.map((worker) => <div key={worker.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4"><div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold">{(worker.full_name || worker.username)[0]?.toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate font-medium text-white">{worker.display_name || worker.full_name || worker.username}</p><p className="truncate text-xs text-zinc-500">Usuario: {worker.username} · {roles[worker.role]}</p><p className="truncate text-[11px] text-zinc-600">{worker.email}</p></div><span className={`text-xs px-2 py-1 rounded-full ${worker.active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>{worker.active ? 'Activo' : 'Inactivo'}</span>{worker.role !== 'admin' && <Button size="sm" variant="outline" onClick={() => toggleWorker(worker)} className="border-white/10">{worker.active ? 'Desactivar' : 'Activar'}</Button>}</div>)}</CardContent></Card>
    </div>
    <Card className="glass border-white/10"><CardHeader><CardTitle className="flex items-center gap-2 text-white"><ShieldCheck className="w-5 h-5 text-primary" />Asignación de pacientes</CardTitle><CardDescription>Odontólogos y especialistas solo podrán abrir los pacientes que tengan asignados.</CardDescription></CardHeader><CardContent className="grid gap-3 md:grid-cols-2">{patients.map((patient) => <div key={patient.id} className="flex items-center gap-3 rounded-xl border border-white/10 p-3"><div className="min-w-0 flex-1"><p className="truncate font-medium text-white">{patient.name}</p><p className="text-xs text-zinc-500">{patient.phone || 'Sin teléfono'}</p></div><select aria-label={`Profesional de ${patient.name}`} value={patient.assigned_user_id || 'none'} onChange={(e) => assignPatient(patient.id,e.target.value)} className="max-w-[190px] rounded-md border border-white/10 bg-zinc-900 p-2 text-xs text-zinc-200"><option value="none">Sin asignar</option>{professionals.map((worker) => <option key={worker.id} value={worker.id}>{worker.display_name || worker.full_name || worker.email}</option>)}</select></div>)}</CardContent></Card>
  </div></div>
}
