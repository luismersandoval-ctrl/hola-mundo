import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Calendar, Clock, LogOut, Activity, Trash2, Pencil, MessageCircle } from 'lucide-react'
import { ChatPanel } from '@/components/ChatPanel'

export default function Dashboard() {
  const [patients, setPatients] = useState([])
  const [appointments, setAppointments] = useState([])
  const navigate = useNavigate()

  // Creation Modals
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false)
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false)
  const [newPatient, setNewPatient] = useState({ name: '', phone: '', email: '' })
  const [newAppointment, setNewAppointment] = useState({ patient_id: '', date: '', reason: '' })

  // Edit Modals
  const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false)
  const [isEditAppointmentModalOpen, setIsEditAppointmentModalOpen] = useState(false)
  const [editingPatientId, setEditingPatientId] = useState(null)
  const [editingAppointmentId, setEditingAppointmentId] = useState(null)
  const [editPatientData, setEditPatientData] = useState({ name: '', phone: '', email: '' })
  const [editAppointmentData, setEditAppointmentData] = useState({ patient_id: '', date: '', reason: '' })

  // Chat State
  const [chatPatient, setChatPatient] = useState(null)

  const fetchData = async () => {
    const token = localStorage.getItem('token')
    const config = { headers: { Authorization: `Bearer ${token}` } }
    try {
      const [patientsRes, apptRes] = await Promise.all([
        axios.get('http://localhost:8000/patients/', config),
        axios.get('http://localhost:8000/appointments/', config)
      ])
      setPatients(patientsRes.data)
      setAppointments(apptRes.data)
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem('token')
        navigate('/login')
      }
    }
  }

  useEffect(() => {
    fetchData()
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  // --- Create Handlers ---
  const handleCreatePatient = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('token')
    try {
      await axios.post('http://localhost:8000/patients/', newPatient, { headers: { Authorization: `Bearer ${token}` } })
      setIsPatientModalOpen(false)
      setNewPatient({ name: '', phone: '', email: '' })
      fetchData()
    } catch (error) { console.error(error) }
  }

  const handleCreateAppointment = async (e) => {
    e.preventDefault()
    if (!newAppointment.patient_id) return
    const token = localStorage.getItem('token')
    try {
      const payload = { date: new Date(newAppointment.date).toISOString(), reason: newAppointment.reason }
      await axios.post(`http://localhost:8000/patients/${newAppointment.patient_id}/appointments`, payload, { headers: { Authorization: `Bearer ${token}` } })
      setIsAppointmentModalOpen(false)
      setNewAppointment({ patient_id: '', date: '', reason: '' })
      fetchData()
    } catch (error) { console.error(error) }
  }

  // --- Delete Handlers ---
  const handleDeletePatient = async (id, e) => {
    e.stopPropagation()
    const token = localStorage.getItem('token')
    if (window.confirm("¿Estás seguro que deseas eliminar este paciente? Esta acción borrará su historial y sus citas médicas.")) {
      try {
        await axios.delete(`http://localhost:8000/patients/${id}`, { headers: { Authorization: `Bearer ${token}` } })
        fetchData()
      } catch (error) { console.error(error) }
    }
  }

  const handleDeleteAppointment = async (id, e) => {
    e.stopPropagation()
    const token = localStorage.getItem('token')
    if (window.confirm("¿Seguro que deseas cancelar esta cita?")) {
      try {
        await axios.delete(`http://localhost:8000/appointments/${id}`, { headers: { Authorization: `Bearer ${token}` } })
        fetchData()
      } catch (error) { console.error(error) }
    }
  }

  // --- Edit Handlers ---
  const openEditPatient = (p, e) => {
    e.stopPropagation()
    setEditingPatientId(p.id)
    setEditPatientData({ name: p.name, phone: p.phone || '', email: p.email || '' })
    setIsEditPatientModalOpen(true)
  }

  const handleUpdatePatient = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('token')
    try {
      await axios.put(`http://localhost:8000/patients/${editingPatientId}`, editPatientData, { headers: { Authorization: `Bearer ${token}` } })
      setIsEditPatientModalOpen(false)
      fetchData()
    } catch (error) { console.error(error) }
  }

  const openEditAppointment = (a, e) => {
    e.stopPropagation()
    setEditingAppointmentId(a.id)
    const localDate = new Date(a.date)
    const formattedDate = new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000).toISOString().slice(0,16)
    
    setEditAppointmentData({ patient_id: a.patient_id.toString(), date: formattedDate, reason: a.reason || '' })
    setIsEditAppointmentModalOpen(true)
  }

  const handleUpdateAppointment = async (e) => {
    e.preventDefault()
    const token = localStorage.getItem('token')
    try {
      const payload = { date: new Date(editAppointmentData.date).toISOString(), reason: editAppointmentData.reason }
      await axios.put(`http://localhost:8000/appointments/${editingAppointmentId}`, payload, { headers: { Authorization: `Bearer ${token}` } })
      setIsEditAppointmentModalOpen(false)
      fetchData()
    } catch (error) { console.error(error) }
  }

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <header className="flex justify-between items-center mb-8 glass p-5 rounded-2xl border-white/10 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-primary/20 rounded-xl ring-1 ring-primary/30">
              <Activity className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Panel Odontológico</h1>
              <p className="text-zinc-400 text-sm">Bienvenido, Dr. Administrador</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="glass border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all">
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="glass border-white/10 shadow-lg hover:bg-white/[0.02] transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Total Pacientes</CardTitle>
              <div className="p-2 bg-blue-500/20 rounded-lg"><Users className="w-4 h-4 text-blue-400" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white">{patients.length}</div>
            </CardContent>
          </Card>
          
          <Card className="glass border-white/10 shadow-lg hover:bg-white/[0.02] transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Citas Pendientes</CardTitle>
              <div className="p-2 bg-emerald-500/20 rounded-lg"><Calendar className="w-4 h-4 text-emerald-400" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white">{appointments.length}</div>
            </CardContent>
          </Card>

          <Card className="glass border-primary/20 shadow-lg bg-primary/5 hover:bg-primary/10 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-primary">Próxima Cita</CardTitle>
              <div className="p-2 bg-primary/20 rounded-lg"><Clock className="w-4 h-4 text-primary" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {appointments.length > 0 ? new Date(Math.min(...appointments.map(a => new Date(a.date)))).toLocaleDateString() : 'Sin citas'}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* PACIENTES */}
          <Card className="glass border-white/10 shadow-lg col-span-1 flex flex-col">
            <CardHeader>
              <CardTitle className="text-white text-xl">Pacientes Recientes</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {patients.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-8 border border-dashed border-white/10 rounded-xl bg-white/5">
                  <p className="text-zinc-500 text-sm text-center">No hay pacientes registrados aún.</p>
                </div>
              ) : (
                <div className="rounded-md border border-white/10 overflow-hidden bg-black/20">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent bg-white/5">
                        <TableHead className="text-zinc-300">Nombre</TableHead>
                        <TableHead className="text-zinc-300">Teléfono</TableHead>
                        <TableHead className="text-zinc-300 w-[100px] text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patients.map((p) => (
                         <TableRow key={p.id} className="border-white/10 hover:bg-white/5 transition-colors">
                          <TableCell className="font-medium text-white">{p.name}</TableCell>
                          <TableCell className="text-zinc-400">{p.phone}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setChatPatient(p); }} className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-500/20">
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={(e) => openEditPatient(p, e)} className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={(e) => handleDeletePatient(p.id, e)} className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              
              <Dialog open={isPatientModalOpen} onOpenChange={setIsPatientModalOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full mt-6 glass border-primary/30 hover:bg-primary/20 text-primary" variant="outline">
                    + Nuevo Paciente
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass border-white/10 text-white sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Registrar Paciente</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreatePatient} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre Completo</Label>
                      <Input id="name" required value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Teléfono</Label>
                      <Input id="phone" value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo Electrónico</Label>
                      <Input id="email" type="email" value={newPatient.email} onChange={e => setNewPatient({...newPatient, email: e.target.value})} className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90 mt-4 text-primary-foreground font-semibold">Guardar Paciente</Button>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Edit Patient Modal */}
              <Dialog open={isEditPatientModalOpen} onOpenChange={setIsEditPatientModalOpen}>
                <DialogContent className="glass border-white/10 text-white sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Editar Paciente</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleUpdatePatient} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Nombre Completo</Label>
                      <Input id="edit-name" required value={editPatientData.name} onChange={e => setEditPatientData({...editPatientData, name: e.target.value})} className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-phone">Teléfono</Label>
                      <Input id="edit-phone" value={editPatientData.phone} onChange={e => setEditPatientData({...editPatientData, phone: e.target.value})} className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-email">Correo Electrónico</Label>
                      <Input id="edit-email" type="email" value={editPatientData.email} onChange={e => setEditPatientData({...editPatientData, email: e.target.value})} className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 mt-4 text-white font-semibold">Actualizar Paciente</Button>
                  </form>
                </DialogContent>
              </Dialog>

            </CardContent>
          </Card>

          {/* CITAS */}
          <Card className="glass border-white/10 shadow-lg col-span-1 flex flex-col">
            <CardHeader>
              <CardTitle className="text-white text-xl">Agenda de Hoy</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
               {appointments.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-8 border border-dashed border-white/10 rounded-xl bg-white/5">
                  <p className="text-zinc-500 text-sm text-center">No hay citas agendadas.</p>
                </div>
              ) : (
                <div className="rounded-md border border-white/10 overflow-hidden bg-black/20">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent bg-white/5">
                        <TableHead className="text-zinc-300">Fecha</TableHead>
                        <TableHead className="text-zinc-300">Motivo</TableHead>
                        <TableHead className="text-zinc-300 w-[100px] text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.map((a) => (
                        <TableRow key={a.id} className="border-white/10 hover:bg-white/5 transition-colors">
                          <TableCell className="font-medium text-white">{new Date(a.date).toLocaleDateString()} {new Date(a.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</TableCell>
                          <TableCell className="text-zinc-400">{a.reason}</TableCell>
                          <TableCell className="text-right">
                             <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={(e) => openEditAppointment(a, e)} className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={(e) => handleDeleteAppointment(a.id, e)} className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/20">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <Dialog open={isAppointmentModalOpen} onOpenChange={setIsAppointmentModalOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full mt-6 glass border-primary/30 hover:bg-primary/20 text-primary" variant="outline">
                    + Agendar Cita
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass border-white/10 text-white sm:max-w-[425px] overflow-visible">
                  <DialogHeader>
                    <DialogTitle>Agendar Nueva Cita</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateAppointment} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Paciente</Label>
                      <Select value={newAppointment.patient_id} onValueChange={(val) => setNewAppointment({...newAppointment, patient_id: val})}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Selecciona un paciente" />
                        </SelectTrigger>
                        <SelectContent className="glass text-white border-white/10">
                          {patients.map(p => (
                            <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Fecha y Hora</Label>
                      <Input id="date" type="datetime-local" required value={newAppointment.date} onChange={e => setNewAppointment({...newAppointment, date: e.target.value})} className="bg-white/5 border-white/10 [color-scheme:dark] text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reason">Motivo de la cita</Label>
                      <Input id="reason" required value={newAppointment.reason} onChange={e => setNewAppointment({...newAppointment, reason: e.target.value})} className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90 mt-4 text-primary-foreground font-semibold" disabled={!newAppointment.patient_id}>Confirmar Cita</Button>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Edit Appointment Modal */}
              <Dialog open={isEditAppointmentModalOpen} onOpenChange={setIsEditAppointmentModalOpen}>
                <DialogContent className="glass border-white/10 text-white sm:max-w-[425px] overflow-visible">
                  <DialogHeader>
                    <DialogTitle>Editar Cita</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleUpdateAppointment} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-appt-date">Fecha y Hora</Label>
                      <Input id="edit-appt-date" type="datetime-local" required value={editAppointmentData.date} onChange={e => setEditAppointmentData({...editAppointmentData, date: e.target.value})} className="bg-white/5 border-white/10 [color-scheme:dark] text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-appt-reason">Motivo de la cita</Label>
                      <Input id="edit-appt-reason" required value={editAppointmentData.reason} onChange={e => setEditAppointmentData({...editAppointmentData, reason: e.target.value})} className="bg-white/5 border-white/10 text-white" />
                    </div>
                    <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 mt-4 text-white font-semibold">Actualizar Cita</Button>
                  </form>
                </DialogContent>
              </Dialog>

            </CardContent>
          </Card>
        </div>
      </div>
      
      <ChatPanel open={!!chatPatient} onOpenChange={(val) => !val && setChatPatient(null)} patient={chatPatient} />
    </div>
  )
}
