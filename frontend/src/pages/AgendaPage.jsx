import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Plus, Search, UserPlus } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useLanguage } from '@/lib/i18n'
import { PhoneInput } from '@/components/PhoneInput'
import { DOCUMENT_TYPES } from '@/lib/patientOptions'
import { INPUT_LIMITS, apiErrorMessage, isValidEmail, normalizeDocument } from '@/lib/validation'

const statuses = { pending:'Pendiente', confirmed:'Confirmada', in_room:'En sala', completed:'Atendida', cancelled:'Cancelada', no_show:'No asistió' }
const statusStyles = {
  pending: { card:'bg-amber-500 border-amber-200', dot:'bg-amber-400', label:'Pendiente' },
  confirmed: { card:'bg-emerald-600 border-emerald-200', dot:'bg-emerald-500', label:'Confirmada' },
  in_room: { card:'bg-cyan-600 border-cyan-200', dot:'bg-cyan-500', label:'En sala' },
  completed: { card:'bg-violet-600 border-violet-200', dot:'bg-violet-500', label:'Atendida' },
  cancelled: { card:'bg-red-600 border-red-200', dot:'bg-red-500', label:'Cancelada' },
  no_show: { card:'bg-slate-600 border-slate-300', dot:'bg-slate-500', label:'No asistió' },
}
const pad = (n) => String(n).padStart(2,'0')
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
const addDays = (d,n) => { const copy=new Date(d); copy.setDate(copy.getDate()+n); return copy }
const startOfWeek = (d) => { const copy=new Date(d); copy.setDate(copy.getDate()-((copy.getDay()+6)%7)); copy.setHours(0,0,0,0); return copy }
const minutesOf = (d) => d.getHours()*60+d.getMinutes()
const appointmentDateKey = (appointment) => String(appointment?.date || '').slice(0,10)
const appointmentStartMinutes = (appointment) => {
  const match = String(appointment?.date || '').match(/[T ](\d{2}):(\d{2})/)
  if (match) return Number(match[1]) * 60 + Number(match[2])
  const parsed = new Date(appointment?.date)
  return Number.isNaN(parsed.getTime()) ? -1 : minutesOf(parsed)
}
const timeLabel = (d,mode,locale='es-CO') => d.toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit',hour12:mode==='12'})
const eventColor = (status) => statusStyles[status]?.card || statusStyles.pending.card

export default function AgendaPage(){
  const {t,locale}=useLanguage()
  const navigate=useNavigate()
  const [appointments,setAppointments]=useState([]), [patients,setPatients]=useState([]), [professionals,setProfessionals]=useState([]), [rooms,setRooms]=useState([])
  const [professionalFilter,setProfessionalFilter]=useState('')
  const [view,setView]=useState(()=>window.matchMedia('(max-width: 767px)').matches?'day':'week'), [anchor,setAnchor]=useState(new Date()), [hourMode,setHourMode]=useState('12')
  const [newMode,setNewMode]=useState(false), [patientSearch,setPatientSearch]=useState(''), [error,setError]=useState('')
  const [scheduleOpen,setScheduleOpen]=useState(false)
  const [submitting,setSubmitting]=useState(false)
  const [professionalBusy,setProfessionalBusy]=useState([])
  const [availabilityLoading,setAvailabilityLoading]=useState(false)
  const [appointmentOpen,setAppointmentOpen]=useState(false)
  const [selectedAppointment,setSelectedAppointment]=useState(null)
  const [detailProfessionalId,setDetailProfessionalId]=useState('')
  const [detailReason,setDetailReason]=useState('')
  const [detailDate,setDetailDate]=useState('')
  const [detailTime,setDetailTime]=useState('')
  const [detailDuration,setDetailDuration]=useState(15)
  const [detailStatus,setDetailStatus]=useState('pending')
  const [detailRoomId,setDetailRoomId]=useState('')
  const [detailPatientForm,setDetailPatientForm]=useState({first_name:'',first_surname:'',phone_country_code:'+57',phone:'',email:''})
  const [detailBusy,setDetailBusy]=useState([])
  const [detailLoading,setDetailLoading]=useState(false)
  const [detailSaving,setDetailSaving]=useState(false)
  const [detailError,setDetailError]=useState('')
  const [newPatient,setNewPatient]=useState({first_name:'',first_surname:'',document_type:'',document_number:'',birth_date:'',phone_country_code:'+57',phone:'',email:'',gender:'unspecified'})
  const [form,setForm]=useState({patient_id:'',date:dateKey(new Date()),time:'08:00',period:'AM',reason:'',professional_user_id:'',room_id:'',duration_minutes:15})
  const load=useCallback(async()=>{const [a,p,d,r]=await Promise.all([api.get('/appointments/'),api.get('/patients/'),api.get('/professionals/'),api.get('/rooms/')]);setAppointments(a.data);setPatients(p.data);setProfessionals(d.data);setRooms(r.data)},[])
  useEffect(()=>{
    // State updates after async requests resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  },[load])
  useEffect(()=>{
    const mobileQuery=window.matchMedia('(max-width: 767px)')
    const handleViewportChange=(event)=>{if(event.matches)setView('day')}
    mobileQuery.addEventListener('change',handleViewportChange)
    return()=>mobileQuery.removeEventListener('change',handleViewportChange)
  },[])
  const names=useMemo(()=>Object.fromEntries(patients.map(p=>[p.id,p.name])),[patients])
  const filtered=useMemo(()=>{const q=patientSearch.toLowerCase().trim();return patients.filter(p=>!q||[p.name,p.phone,p.email].some(v=>v?.toLowerCase().includes(q)))},[patients,patientSearch])
  const days=useMemo(()=>view==='day'?[anchor]:Array.from({length:7},(_,i)=>addDays(startOfWeek(anchor),i)),[anchor,view])
  const visibleAppointments=useMemo(()=>professionalFilter?appointments.filter(item=>item.professional_user_id===Number(professionalFilter)):appointments,[appointments,professionalFilter])
  const selectedDateLabel=anchor.toLocaleDateString(locale,{weekday:'long',day:'numeric',month:'long',year:'numeric'})
  const normalizedTime=()=>form.time
  const selectedProfessional=professionals.find(p=>p.id===Number(form.professional_user_id))
  useEffect(()=>{
    if(!selectedProfessional||!form.date)return
    let active=true
    // Availability is synchronized with the backend whenever its query changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAvailabilityLoading(true)
    api.get(`/professionals/${selectedProfessional.id}/availability`,{params:{day:form.date}})
      .then(({data})=>{if(active)setProfessionalBusy(data.busy||[])})
      .catch(()=>{if(active)setProfessionalBusy([])})
      .finally(()=>{if(active)setAvailabilityLoading(false)})
    return()=>{active=false}
  },[selectedProfessional,form.date,appointments])
  const availableSlots=useMemo(()=>{
    if(!selectedProfessional)return[]
    return Array.from({length:49},(_,i)=>{const start=420+i*15,end=start+Number(form.duration_minutes);const conflict=professionalBusy.find(a=>{const s=minutesOf(new Date(a.start));return start<s+a.duration_minutes&&end>s});const time=`${pad(Math.floor(start/60))}:${pad(start%60)}`;return {time,available:!conflict,label:timeLabel(new Date(`${form.date}T${time}`),hourMode,locale)}})
  },[form.date,form.duration_minutes,hourMode,locale,professionalBusy,selectedProfessional])
  const availabilityPending=Boolean(selectedProfessional&&availabilityLoading)
  const selectedSlotAvailable=!selectedProfessional||availableSlots.some(slot=>slot.time===normalizedTime()&&slot.available)
  const detailPatient=selectedAppointment?patients.find(patient=>patient.id===selectedAppointment.patient_id):null
  const detailProfessional=professionals.find(professional=>professional.id===Number(detailProfessionalId))
  const detailConflict=useMemo(()=>{
    if(!selectedAppointment||!detailProfessionalId)return null
    const start=new Date(`${detailDate}T${detailTime}:00`)
    const startMinute=minutesOf(start)
    const endMinute=startMinute+Number(detailDuration||15)
    return detailBusy.find(item=>{
      if(item.appointment_id===selectedAppointment.id)return false
      const busyStart=minutesOf(new Date(item.start))
      return startMinute<busyStart+item.duration_minutes&&endMinute>busyStart
    })||null
  },[detailBusy,detailDate,detailDuration,detailProfessionalId,detailTime,selectedAppointment])
  useEffect(()=>{
    if(!appointmentOpen||!selectedAppointment||!detailProfessionalId){return}
    let active=true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetailLoading(true)
    api.get(`/professionals/${detailProfessionalId}/availability`,{params:{day:detailDate}})
      .then(({data})=>{if(active)setDetailBusy(data.busy||[])})
      .catch(()=>{if(active){setDetailBusy([]);setDetailError('No fue posible verificar la disponibilidad del profesional.')}})
      .finally(()=>{if(active)setDetailLoading(false)})
    return()=>{active=false}
  },[appointmentOpen,detailDate,detailProfessionalId,selectedAppointment])
  const openAppointment=(appointment)=>{
    setSelectedAppointment(appointment)
    setDetailProfessionalId(appointment.professional_user_id||'')
    setDetailReason(appointment.reason||'')
    setDetailDate(appointment.date.slice(0,10))
    setDetailTime(appointment.date.slice(11,16))
    setDetailDuration(appointment.duration_minutes||15)
    setDetailStatus(appointment.status||'pending')
    setDetailRoomId(appointment.room_id||'')
    const patient=patients.find(item=>item.id===appointment.patient_id)
    setDetailPatientForm({first_name:patient?.first_name||patient?.name||'',first_surname:patient?.first_surname||'',phone_country_code:patient?.phone_country_code||'+57',phone:patient?.phone||'',email:patient?.email||''})
    setDetailBusy([])
    setDetailError('')
    setAppointmentOpen(true)
  }
  const saveAppointmentProfessional=async()=>{
    if(!selectedAppointment||detailSaving)return
    if(!detailPatient){setDetailError('No fue posible cargar los datos del paciente.');return}
    if(detailPatientForm.email&&!isValidEmail(detailPatientForm.email)){setDetailError('Ingresa un correo completo. Ejemplo: paciente@correo.com');return}
    if(detailLoading){setDetailError('Espera mientras verificamos la disponibilidad del profesional.');return}
    if(detailConflict){setDetailError(`${detailProfessional?.display_name||'El profesional'} ya tiene una cita que cruza este horario.`);return}
    setDetailSaving(true);setDetailError('')
    try{
      const {id:patientRecordId,history,appointments:patientAppointments,messages,...patientPayload}=detailPatient
      void patientRecordId; void history; void patientAppointments; void messages
      await api.put(`/patients/${selectedAppointment.patient_id}`,{...patientPayload,...detailPatientForm})
      const selectedRoom=rooms.find(room=>room.id===Number(detailRoomId))
      const {data}=await api.put(`/appointments/${selectedAppointment.id}`,{
        date:`${detailDate}T${detailTime}:00`,
        reason:detailReason.trim(),
        status:detailStatus,
        duration_minutes:Number(detailDuration),
        professional_user_id:detailProfessional?.id||null,
        professional:detailProfessional?.display_name||'',
        room_id:Number(detailRoomId),
        room_name:selectedRoom?.name||'',
      })
      setSelectedAppointment(data)
      setAppointmentOpen(false)
      load()
    }catch(error){setDetailError(apiErrorMessage(error, 'No fue posible actualizar la cita.'))}
    finally{setDetailSaving(false)}
  }
  const moveDay=(direction)=>{const next=new Date(anchor);next.setDate(next.getDate()+direction);setAnchor(next);setView('day')}
  const moveWeek=(direction)=>{const next=new Date(anchor);next.setDate(next.getDate()+7*direction);setAnchor(next)}
  const selectCell=(day,hour,minute=0,roomId='')=>{setForm({...form,date:dateKey(day),time:`${pad(hour)}:${pad(minute)}`,period:hour>=12?'PM':'AM',room_id:roomId||form.room_id||rooms[0]?.id||''});setError('');setScheduleOpen(true)}
  const create=async(e)=>{e.preventDefault();if(submitting)return;if(newMode&&newPatient.email&&!isValidEmail(newPatient.email)){setError('Ingresa un correo completo. Ejemplo: paciente@correo.com');return}if(availabilityPending){setError('Espera mientras verificamos la disponibilidad del profesional.');return}if(!selectedSlotAvailable){setError('El profesional ya tiene una cita que cruza este horario. Selecciona un bloque disponible.');return}setSubmitting(true);setError('');try{let patientId=form.patient_id;if(newMode){const r=await api.post('/patients/',newPatient);patientId=r.data.id}const professional=professionals.find(p=>p.id===Number(form.professional_user_id));if(!patientId)throw new Error('Selecciona un paciente registrado o crea un paciente nuevo.');const localDateTime=`${form.date}T${normalizedTime()}:00`;await api.post(`/patients/${patientId}/appointments`,{date:localDateTime,reason:form.reason,professional_user_id:professional?.id||null,professional:professional?.display_name||'',room_id:Number(form.room_id),duration_minutes:Number(form.duration_minutes),status:'pending'});setForm({...form,patient_id:'',reason:'',duration_minutes:15});setNewPatient({first_name:'',first_surname:'',document_type:'',document_number:'',birth_date:'',phone_country_code:'+57',phone:'',email:'',gender:'unspecified'});setNewMode(false);setPatientSearch('');setScheduleOpen(false);load()}catch(err){setError(apiErrorMessage(err, err.message||'Completa paciente, fecha y hora válidos.'));load()}finally{setSubmitting(false)}}
  const changeStatus=async(item,status)=>{await api.put(`/appointments/${item.id}`,{date:item.date,reason:item.reason,professional:item.professional,professional_user_id:item.professional_user_id,room_id:item.room_id,room_name:item.room_name,duration_minutes:item.duration_minutes,status});load()}
  return <div className="min-h-screen p-3 md:p-6"><div className="mx-auto max-w-[1600px] space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold text-white">Agenda</h1><p className="text-zinc-400">Disponibilidad por consultorio y profesional.</p></div><div className="flex flex-wrap gap-2"><select aria-label="Filtrar por profesional" value={professionalFilter} onChange={e=>setProfessionalFilter(e.target.value)} className="h-9 rounded-md border border-white/10 bg-zinc-900 px-3 text-sm"><option value="">Todos los profesionales</option>{professionals.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select><div className="flex"><Button size="sm" variant={hourMode==='12'?'default':'outline'} onClick={()=>setHourMode('12')} className="rounded-r-none">12 h</Button><Button size="sm" variant={hourMode==='24'?'default':'outline'} onClick={()=>setHourMode('24')} className="rounded-l-none">24 h</Button></div>{[['day','Día'],['week','Semana'],['month','Mes']].map(([key,label])=><Button key={key} variant={view===key?'default':'outline'} onClick={()=>setView(key)} className={view===key?'':'border-white/10'}>{label}</Button>)}</div></header>
    <Card className="glass border-white/10 overflow-hidden"><CardHeader className="flex-row flex-wrap items-center justify-between gap-3"><div className="flex items-start gap-3">{view==='day'&&<Button size="icon" variant="outline" onClick={()=>setView('week')} className="mt-0.5 shrink-0 border-white/10" aria-label="Volver a la vista semanal" title="Volver a la semana"><ArrowLeft className="h-4 w-4"/></Button>}<div><CardTitle className="text-white capitalize">{view==='day'?'Agenda por consultorios':view==='week'?'Agenda semanal':'Calendario mensual'}</CardTitle><p className={`mt-1 font-medium capitalize ${view==='day'?'text-sm text-blue-700 dark:text-blue-300':'text-sm text-zinc-500'}`}>{view==='day'?selectedDateLabel:anchor.toLocaleDateString(locale,{month:'long',year:'numeric'})}</p><p className="mt-0.5 text-xs text-zinc-500">Pulsa una casilla para agendar</p>{view==='day'&&<Button type="button" variant="link" onClick={()=>setView('week')} className="mt-1 h-auto p-0 text-xs">Volver a la semana</Button>}</div></div><div className="flex gap-1"><Button size="icon" variant="outline" onClick={()=>moveWeek(-1)} className="border-white/10" aria-label="Semana anterior" title="Semana anterior"><ChevronsLeft/></Button><Button size="icon" variant="outline" onClick={()=>moveDay(-1)} className="border-white/10" aria-label="Día anterior" title="Día anterior"><ChevronLeft/></Button><Button variant="outline" onClick={()=>setAnchor(new Date())} className="border-white/10">Hoy</Button><Button size="icon" variant="outline" onClick={()=>moveDay(1)} className="border-white/10" aria-label="Día siguiente" title="Día siguiente"><ChevronRight/></Button><Button size="icon" variant="outline" onClick={()=>moveWeek(1)} className="border-white/10" aria-label="Semana siguiente" title="Semana siguiente"><ChevronsRight/></Button></div></CardHeader><CardContent className="p-2 sm:p-4"><div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">{Object.entries(statusStyles).map(([key,item])=><span key={key} className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-300"><span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />{item.label}</span>)}</div>{view==='month'?<MonthGrid anchor={anchor} appointments={visibleAppointments} names={names} selected={form.date} onSelect={selectCell} onAppointmentClick={openAppointment}/>:view==='day'?<RoomTimeGrid day={anchor} rooms={rooms} appointments={visibleAppointments} names={names} hourMode={hourMode} locale={locale} onSelect={selectCell} onStatus={changeStatus} onAppointmentClick={openAppointment}/>:<TimeGrid days={days} appointments={visibleAppointments} names={names} hourMode={hourMode} locale={locale} onSelect={selectCell} onStatus={changeStatus} onAppointmentClick={openAppointment}/>}</CardContent></Card>
    <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}><DialogContent className="glass top-3 bottom-3 max-h-none translate-y-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden border-white/10 p-0 text-white sm:max-w-xl"><DialogHeader className="shrink-0 border-b border-white/10 bg-zinc-950/95 px-5 py-4 pr-12"><DialogTitle>Nueva cita · {form.date} · {form.time}</DialogTitle></DialogHeader><form onSubmit={create} className="min-h-0 space-y-3 overflow-y-auto overscroll-contain px-5 pb-6 pt-2 [scrollbar-gutter:stable]">
      <div className="grid grid-cols-2 gap-2"><Button type="button" variant={!newMode?'default':'outline'} onClick={()=>setNewMode(false)} className={!newMode?'':'border-white/10'}>Paciente registrado</Button><Button type="button" variant={newMode?'default':'outline'} onClick={()=>setNewMode(true)} className={newMode?'':'border-white/10'}><UserPlus className="mr-1 h-4 w-4"/>Paciente nuevo</Button></div>
      {!newMode ? <div className="space-y-2">
        <Label>Nombre del paciente</Label>
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-zinc-500"/><Input autoFocus value={patientSearch} onChange={e=>setPatientSearch(e.target.value)} placeholder="Escribe nombre, teléfono o correo" className="pl-9 bg-white/5 border-white/10"/></div>
        <div role="listbox" aria-label="Seleccionar paciente" className="patient-picker max-h-32 space-y-1 overflow-y-auto rounded-md border border-white/10 bg-zinc-950 p-1">{filtered.length===0?<p className="p-3 text-center text-xs text-zinc-500">No hay resultados para la búsqueda.</p>:filtered.map(p=>{const selected=Number(form.patient_id)===p.id;return <button key={p.id} type="button" role="option" aria-selected={selected} onClick={()=>{setForm({...form,patient_id:p.id});setError('')}} className={`patient-option w-full rounded px-3 py-2 text-left text-xs transition ${selected?'bg-primary text-primary-foreground ring-1 ring-primary':'bg-white/[0.03] text-zinc-300 hover:bg-white/10'}`}><span className="block font-medium">{p.name}</span>{(p.phone||p.email)&&<span className={`patient-option-detail block truncate text-[10px] ${selected?'opacity-80':'text-zinc-500'}`}>{p.phone?`${p.phone_country_code||''} ${p.phone}`:p.email}</span>}</button>})}</div>
        {form.patient_id&&<p className="text-[11px] text-emerald-400">Paciente seleccionado: {names[Number(form.patient_id)]}</p>}
      </div> : <div className="grid gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 sm:grid-cols-2">
        <div><Label>{t('firstName')}</Label><Input autoFocus required value={newPatient.first_name} onChange={e=>setNewPatient({...newPatient,first_name:e.target.value})} className="mt-1 bg-white/5 border-white/10"/></div>
        <div><Label>{t('firstSurname')} <span className="text-zinc-500">({t('optional')})</span></Label><Input value={newPatient.first_surname} onChange={e=>setNewPatient({...newPatient,first_surname:e.target.value})} className="mt-1 bg-white/5 border-white/10"/></div>
        <div><Label>Tipo de documento</Label><select required value={newPatient.document_type} onChange={e=>setNewPatient({...newPatient,document_type:e.target.value})} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-foreground"><option value="">Seleccionar...</option>{DOCUMENT_TYPES.map(([code,label])=><option key={code} value={code}>{code} · {label}</option>)}</select></div>
        <div><Label>Número de documento</Label><Input required maxLength={INPUT_LIMITS.document} value={newPatient.document_number} onChange={e=>setNewPatient({...newPatient,document_number:normalizeDocument(e.target.value)})} placeholder="Ej: 1234567890" className="mt-1 bg-white/5 border-white/10"/></div>
        <div className="sm:col-span-2"><Label>Fecha de nacimiento</Label><Input required type="date" max={dateKey(new Date())} value={newPatient.birth_date} onChange={e=>setNewPatient({...newPatient,birth_date:e.target.value})} className="mt-1 bg-white/5 border-white/10"/><p className="mt-1 text-[10px] text-zinc-500">Se utilizará para asignar automáticamente la dentición del odontograma.</p></div>
        <PhoneInput countryCode={newPatient.phone_country_code} phone={newPatient.phone} onCountryCodeChange={value=>setNewPatient({...newPatient,phone_country_code:value})} onPhoneChange={value=>setNewPatient({...newPatient,phone:value})} placeholder={t('phone')}/>
        <div><Input type="email" maxLength={INPUT_LIMITS.email} aria-invalid={Boolean(newPatient.email&&!isValidEmail(newPatient.email))} placeholder={`${t('email')} · paciente@correo.com`} value={newPatient.email} onChange={e=>{setNewPatient({...newPatient,email:e.target.value});setError('')}} className="bg-white/5 border-white/10 aria-invalid:border-red-500"/>{newPatient.email&&!isValidEmail(newPatient.email)&&<p className="mt-1 text-[10px] text-red-400">Debe incluir dominio y extensión, por ejemplo .com</p>}</div>
      </div>}
      <div><Label>Dr., Dra. o especialista asignado <span className="font-normal text-zinc-500">(opcional)</span></Label><select value={form.professional_user_id} onChange={e=>setForm({...form,professional_user_id:e.target.value})} className="mt-1 w-full rounded-md border border-white/10 bg-zinc-900 p-2 text-sm"><option value="">Sin profesional asignado</option>{professionals.map(p=><option key={p.id} value={p.id}>{p.display_name} · {p.role==='specialist'?'Especialista':'Odontología general'}</option>)}</select></div>
      <div><Label>Consultorio o unidad odontológica</Label><select required value={form.room_id} onChange={e=>setForm({...form,room_id:Number(e.target.value)})} className="mt-1 w-full rounded-md border border-white/10 bg-zinc-900 p-2 text-sm"><option value="">Seleccionar consultorio</option>{rooms.map(room=><option key={room.id} value={room.id}>{room.name}</option>)}</select></div>
      <div className="grid grid-cols-3 gap-2"><div><Label>Fecha</Label><Input required type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="mt-1 bg-white/5 border-white/10"/></div><div><Label>Hora</Label><Input required type="time" step="900" value={form.time} onChange={e=>setForm({...form,time:e.target.value})} className="mt-1 bg-white/5 border-white/10"/></div><div><Label>Tiempo bloqueado</Label><select value={form.duration_minutes} onChange={e=>setForm({...form,duration_minutes:Number(e.target.value)})} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-zinc-900 px-2 text-sm">{Array.from({length:16},(_,index)=>(index+1)*15).map(n=><option key={n} value={n}>{n} min</option>)}</select></div></div>
      {selectedProfessional&&<div><Label>Disponibilidad de {selectedProfessional.display_name}</Label><div className={`availability-panel mt-2 max-h-36 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2 ${availabilityPending?'opacity-50':''}`} style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:'4px'}}>{availableSlots.map(slot=><button key={slot.time} type="button" disabled={availabilityPending||!slot.available} onClick={()=>slot.available&&setForm({...form,time:slot.time,period:Number(slot.time.slice(0,2))>=12?'PM':'AM'})} className={`availability-slot rounded p-1.5 text-[10px] font-medium ${slot.available?'bg-emerald-500/15 text-emerald-300':'bg-red-500/10 text-red-400 line-through'}`}>{slot.label}</button>)}</div><p className="mt-1 text-[10px] text-zinc-500">{availabilityPending?'Verificando disponibilidad...':'Verde disponible · rojo ocupado'}</p></div>}
      <div><Label>Motivo o tratamiento</Label><Input required value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})} className="mt-1 bg-white/5 border-white/10"/></div>{error&&<p className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-sm text-red-300">{error}</p>}<Button disabled={submitting||availabilityPending||!selectedSlotAvailable} className="w-full"><Plus className="mr-2 h-4 w-4"/>{submitting?'Guardando...':newMode?'Registrar paciente y agendar':'Confirmar cita'}</Button>
    </form></DialogContent></Dialog>
    <Dialog open={appointmentOpen} onOpenChange={setAppointmentOpen}>
      <DialogContent className="glass top-3 bottom-3 max-h-none translate-y-0 overflow-y-auto border-white/10 text-white sm:max-w-xl">
        <DialogHeader><DialogTitle className="text-xl">Detalle de la cita</DialogTitle></DialogHeader>
        {selectedAppointment&&<div className="space-y-5">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-base font-semibold text-white">Datos del paciente</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div><Label>Primer nombre</Label><Input required value={detailPatientForm.first_name} onChange={event=>setDetailPatientForm({...detailPatientForm,first_name:event.target.value})} className="mt-1 h-11 border-white/10 bg-white/5 text-base"/></div>
              <div><Label>Primer apellido</Label><Input value={detailPatientForm.first_surname} onChange={event=>setDetailPatientForm({...detailPatientForm,first_surname:event.target.value})} className="mt-1 h-11 border-white/10 bg-white/5 text-base"/></div>
              <div><Label>Teléfono</Label><div className="mt-1"><PhoneInput countryCode={detailPatientForm.phone_country_code} phone={detailPatientForm.phone} onCountryCodeChange={value=>setDetailPatientForm({...detailPatientForm,phone_country_code:value})} onPhoneChange={value=>setDetailPatientForm({...detailPatientForm,phone:value})}/></div></div>
              <div><Label>Correo</Label><Input type="email" maxLength={INPUT_LIMITS.email} aria-invalid={Boolean(detailPatientForm.email&&!isValidEmail(detailPatientForm.email))} value={detailPatientForm.email} onChange={event=>setDetailPatientForm({...detailPatientForm,email:event.target.value})} placeholder="paciente@correo.com" className="mt-1 h-10 border-white/10 bg-white/5 aria-invalid:border-red-500"/></div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label className="text-sm">Mover al día</Label><Input required type="date" value={detailDate} onChange={event=>{setDetailDate(event.target.value);setDetailError('')}} className="mt-1 h-11 border-white/10 bg-white/5 text-base"/></div>
            <div><Label className="text-sm">Hora de la cita</Label><Input required type="time" step="900" value={detailTime} onChange={event=>{setDetailTime(event.target.value);setDetailError('')}} className="mt-1 h-11 border-white/10 bg-white/5 text-base"/></div>
          </div>
          <div><Label className="text-sm">Motivo o tratamiento</Label><Input required value={detailReason} onChange={event=>setDetailReason(event.target.value)} className="mt-1 h-11 border-white/10 bg-white/5 text-base"/></div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div><Label className="text-sm">Duración</Label><select value={detailDuration} onChange={event=>{setDetailDuration(Number(event.target.value));setDetailError('')}} className="mt-1 h-11 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-foreground">{Array.from({length:16},(_,index)=>(index+1)*15).map(minutes=><option key={minutes} value={minutes}>{minutes} min</option>)}</select></div>
            <div><Label className="text-sm">Estado</Label><select value={detailStatus} onChange={event=>setDetailStatus(event.target.value)} className="mt-1 h-11 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-foreground">{Object.entries(statuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
            <div><Label className="text-sm">Consultorio</Label><select required value={detailRoomId} onChange={event=>setDetailRoomId(event.target.value)} className="mt-1 h-11 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-foreground"><option value="">Seleccionar...</option>{rooms.map(room=><option key={room.id} value={room.id}>{room.name}</option>)}</select></div>
          </div>
          <div><Label className="text-sm">Dr., Dra. o especialista asignado</Label><select value={detailProfessionalId} onChange={event=>{setDetailProfessionalId(event.target.value);setDetailError('')}} className="mt-1 h-12 w-full rounded-md border border-white/10 bg-white/5 px-3 text-base font-medium text-foreground"><option value="">Sin profesional asignado</option>{professionals.map(professional=><option key={professional.id} value={professional.id}>{professional.display_name} · {professional.role==='specialist'?'Especialista':'Odontología general'}</option>)}</select>{detailProfessionalId&&<p className={`mt-2 rounded-lg border p-3 text-sm ${detailLoading?'border-white/10 text-zinc-400':detailConflict?'border-red-500/30 bg-red-500/10 text-red-300':'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>{detailLoading?'Verificando disponibilidad...':detailConflict?`${detailProfessional?.display_name} no está disponible en este horario.`:`${detailProfessional?.display_name} está disponible en este horario.`}</p>}</div>
          {detailError&&<p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{detailError}</p>}
          <div className="flex flex-wrap justify-between gap-2"><Button type="button" variant="outline" onClick={()=>{setAppointmentOpen(false);navigate(`/pacientes/${selectedAppointment.patient_id}`)}} className="border-white/10">Abrir expediente</Button><div className="flex gap-2"><Button type="button" variant="outline" onClick={()=>setAppointmentOpen(false)} className="border-white/10">Cerrar</Button><Button type="button" onClick={saveAppointmentProfessional} disabled={detailSaving||detailLoading||Boolean(detailConflict)||!detailPatientForm.first_name.trim()||!detailReason.trim()||!detailDate||!detailTime||!detailRoomId}>{detailSaving?'Guardando...':'Guardar cambios'}</Button></div></div>
        </div>}
      </DialogContent>
    </Dialog>
  </div></div>
}

function RoomTimeGrid({day,rooms,appointments,names,hourMode,locale,onSelect,onStatus,onAppointmentClick}){
  const key=dateKey(day)
  const slots=Array.from({length:49},(_,i)=>({hour:7+Math.floor(i/4),minute:(i%4)*15}))
  return <div className="overflow-x-auto rounded-xl border border-white/10"><div style={{minWidth:`${Math.max(720,80+rooms.length*260)}px`}}>
    <div className="grid border-b border-white/10 bg-white/[0.04]" style={{gridTemplateColumns:`80px repeat(${rooms.length},minmax(240px,1fr))`}}><div className="p-3 text-xs text-zinc-500">Hora</div>{rooms.map(room=><div key={room.id} className="border-l border-white/10 p-3 text-center"><p className="font-semibold text-white">{room.name}</p><p className="text-[10px] text-zinc-500">Unidad odontológica</p></div>)}</div>
    {slots.map(slot=>{const slotMinute=slot.hour*60+slot.minute;return <div key={`${slot.hour}:${slot.minute}`} className="grid min-h-[58px] border-b border-white/5" style={{gridTemplateColumns:`80px repeat(${rooms.length},minmax(240px,1fr))`}}><div className="p-2 text-xs text-zinc-500">{timeLabel(new Date(2026,0,1,slot.hour,slot.minute),hourMode,locale)}</div>{rooms.map(room=>{const events=appointments.filter(item=>{const start=minutesOf(new Date(item.date)),end=start+(item.duration_minutes||30);return item.date.slice(0,10)===key&&item.room_id===room.id&&slotMinute>=start&&slotMinute<end});const startingEvents=events.filter(item=>minutesOf(new Date(item.date))===slotMinute);return <div key={room.id} className="relative min-h-[58px] border-l border-white/10 p-1">
      <button type="button" onClick={()=>onSelect(day,slot.hour,slot.minute,room.id)} className="absolute inset-0 z-10 rounded text-[10px] text-primary hover:bg-primary/5" aria-label={`Nueva cita en ${room.name}`}>{startingEvents.length>0&&<span className="absolute left-1 right-1 top-1 rounded border border-dashed border-primary/30 py-0.5">+ Nueva cita</span>}</button>
      {startingEvents.map(item=><div key={item.id} role="button" tabIndex={0} onClick={()=>onAppointmentClick(item)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onAppointmentClick(item)}}} className={`appointment-card relative z-20 mt-6 cursor-pointer rounded-md border-l-4 p-1.5 text-[10px] text-white shadow ${eventColor(item.status)}`}><p className="truncate font-semibold">{timeLabel(new Date(item.date),hourMode,locale)} · {names[item.patient_id]}</p><p className="truncate opacity-90">{item.professional||'Sin profesional'}</p><p className="truncate opacity-80">{item.reason} · {item.duration_minutes} min</p><select aria-label="Estado de cita" value={item.status} onClick={event=>event.stopPropagation()} onChange={event=>onStatus(item,event.target.value)} className="appointment-status mt-1 w-full rounded bg-black/30 px-1 py-0.5 text-[9px] text-white">{Object.entries(statuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>)}
    </div>})}</div>})}
  </div></div>
}

// eslint-disable-next-line no-unused-vars
function LegacyRoomTimeGrid({day,rooms,appointments,names,hourMode,locale,onSelect,onStatus,onAppointmentClick}){
  const slots=Array.from({length:49},(_,i)=>({hour:7+Math.floor(i/4),minute:(i%4)*15}))
  const key=dateKey(day)
  return <div className="overflow-x-auto rounded-xl border border-white/10"><div style={{minWidth:`${Math.max(720,80+rooms.length*260)}px`}}><div className="grid border-b border-white/10 bg-white/[0.04]" style={{gridTemplateColumns:`80px repeat(${rooms.length},minmax(240px,1fr))`}}><div className="p-3 text-xs text-zinc-500">Hora</div>{rooms.map(room=><div key={room.id} className="border-l border-white/10 p-3 text-center"><p className="font-semibold text-white">{room.name}</p><p className="text-[10px] text-zinc-500">Unidad odontológica</p></div>)}</div>{slots.map(slot=>{const slotMinute=slot.hour*60+slot.minute;return <div key={`${slot.hour}:${slot.minute}`} className="grid min-h-[58px] border-b border-white/5" style={{gridTemplateColumns:`80px repeat(${rooms.length},minmax(240px,1fr))`}}><div className="p-2 text-xs text-zinc-500">{timeLabel(new Date(2026,0,1,slot.hour,slot.minute),hourMode,locale)}</div>{rooms.map(room=>{const events=appointments.filter(a=>{const start=minutesOf(new Date(a.date)),end=start+(a.duration_minutes||30);return a.date.slice(0,10)===key&&a.room_id===room.id&&slotMinute>=start&&slotMinute<end});return <div key={room.id} className="group relative min-h-[58px] border-l border-white/10 p-1">{events.length?<button type="button" onClick={()=>onSelect(day,slot.hour,slot.minute,room.id)} className="relative z-20 mb-1 flex h-5 w-full items-center justify-center rounded border border-dashed border-primary/30 text-[10px] text-primary hover:bg-primary/15"><Plus className="mr-1 h-3 w-3"/>Nueva cita</button>:<button type="button" onClick={()=>onSelect(day,slot.hour,slot.minute,room.id)} className="absolute inset-0 z-10 rounded hover:bg-primary/5" aria-label={`Nueva cita en ${room.name}`}/>} {events.map(item=>{const start=minutesOf(new Date(item.date)),continuation=slotMinute>start;return <div key={item.id} role="button" tabIndex={0} onClick={()=>onAppointmentClick(item)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onAppointmentClick(item)}}} className={`appointment-card relative z-10 mb-1 cursor-pointer rounded-md border-l-4 p-1.5 text-[10px] text-white shadow ${eventColor(item.status)}`}>{continuation?<p className="truncate font-semibold">Continúa · {names[item.patient_id]}</p>:<><p className="truncate font-semibold">{timeLabel(new Date(item.date),hourMode,locale)} · {names[item.patient_id]}</p><p className="truncate opacity-90">{item.professional||'Sin profesional'}</p><p className="truncate opacity-80">{item.reason} · {item.duration_minutes} min</p><select aria-label="Estado de cita" value={item.status} onClick={event=>event.stopPropagation()} onChange={e=>onStatus(item,e.target.value)} className="appointment-status mt-1 w-full rounded bg-black/30 px-1 py-0.5 text-[9px] text-white">{Object.entries(statuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></>}</div>})}</div>})}</div>})}</div></div>
}

function TimeGrid({days,appointments,names,hourMode,locale,onSelect,onStatus,onAppointmentClick}){
  const slots=Array.from({length:49},(_,i)=>({hour:7+Math.floor(i/4),minute:(i%4)*15}))
  const today=dateKey(new Date())
  const appointmentsByDay=appointments.reduce((grouped,item)=>{const key=appointmentDateKey(item);if(!grouped[key])grouped[key]=[];grouped[key].push(item);return grouped},{})
  return <div className="overflow-x-auto rounded-xl border border-white/10"><div className="min-w-[850px]">
    <div className="grid border-b border-white/10 bg-white/[0.04]" style={{gridTemplateColumns:`72px repeat(${days.length},minmax(110px,1fr))`}}><div className="p-3 text-xs text-zinc-500">Hora</div>{days.map(day=>{const current=dateKey(day)===today;return <div key={dateKey(day)} className={`border-l p-2 text-center ${current?'border-blue-400/60 bg-blue-500/25 ring-1 ring-inset ring-blue-400/50':'border-white/10'}`}><p className={`text-xs uppercase ${current?'font-bold text-blue-700 dark:text-blue-300':'text-zinc-500'}`}>{day.toLocaleDateString(locale,{weekday:'short'})}</p><p className={`text-lg font-bold ${current?'text-blue-800 dark:text-blue-200':'text-white'}`}>{day.getDate()}</p>{current&&<p className="text-[9px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">Hoy</p>}</div>})}</div>
    {slots.map(slot=><div key={`${slot.hour}:${slot.minute}`} className="grid min-h-[54px] border-b border-white/5" style={{gridTemplateColumns:`72px repeat(${days.length},minmax(110px,1fr))`}}><div className="p-2 text-xs text-zinc-500">{timeLabel(new Date(2026,0,1,slot.hour,slot.minute),hourMode,locale)}</div>{days.map(day=>{const key=dateKey(day),current=key===today,slotMinute=slot.hour*60+slot.minute;const startingEvents=(appointmentsByDay[key]||[]).filter(item=>Math.floor(appointmentStartMinutes(item)/15)*15===slotMinute);return <div key={key} className={`relative min-h-[54px] border-l p-1 text-left ${current?'border-blue-400/30 bg-blue-500/[0.08]':'border-white/10'}`}>
      <button type="button" onClick={()=>onSelect(day,slot.hour,slot.minute)} aria-label={`Nueva cita ${key} ${pad(slot.hour)}:${pad(slot.minute)}`} title="Nueva cita" className="absolute inset-0 z-10 rounded text-[10px] text-primary transition hover:bg-primary/5">{startingEvents.length>0&&<span className="absolute left-1 right-1 top-1 rounded border border-dashed border-primary/30 py-0.5 text-center">+ Nueva cita</span>}</button>
      {startingEvents.map(item=><div key={item.id} role="button" tabIndex={0} onClick={()=>onAppointmentClick(item)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onAppointmentClick(item)}}} className={`appointment-card relative z-20 mt-6 cursor-pointer rounded-md border-l-4 p-1.5 text-[10px] text-white shadow ring-white/60 transition hover:ring-1 focus:outline-none focus:ring-2 ${eventColor(item.status)}`}><p className="truncate font-semibold">{timeLabel(new Date(item.date),hourMode,locale)} · {names[item.patient_id]}</p><p className="truncate opacity-90">{item.professional}</p><p className="truncate opacity-80">{item.reason} · {item.duration_minutes} min</p><select aria-label="Estado de cita" value={item.status} onClick={event=>event.stopPropagation()} onKeyDown={event=>event.stopPropagation()} onChange={event=>onStatus(item,event.target.value)} className="appointment-status mt-1 w-full rounded bg-black/30 px-1 py-0.5 text-[9px] text-white">{Object.entries(statuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>)}
    </div>})}</div>)}
  </div></div>
}

// eslint-disable-next-line no-unused-vars
function LegacyTimeGrid({days,appointments,names,hourMode,locale,onSelect,onStatus,onAppointmentClick}){
  const slots=Array.from({length:49},(_,i)=>({hour:7+Math.floor(i/4),minute:(i%4)*15}))
  const today=dateKey(new Date())
  return <div className="overflow-x-auto rounded-xl border border-white/10"><div className="min-w-[850px]"><div className="grid border-b border-white/10 bg-white/[0.04]" style={{gridTemplateColumns:`72px repeat(${days.length},minmax(110px,1fr))`}}><div className="p-3 text-xs text-zinc-500">Hora</div>{days.map(day=>{const current=dateKey(day)===today;return <div key={dateKey(day)} className={`border-l p-2 text-center ${current?'border-blue-400/60 bg-blue-500/25 ring-1 ring-inset ring-blue-400/50':'border-white/10'}`}><p className={`text-xs uppercase ${current?'font-bold text-blue-700 dark:text-blue-300':'text-zinc-500'}`}>{day.toLocaleDateString(locale,{weekday:'short'})}</p><p className={`text-lg font-bold ${current?'text-blue-800 dark:text-blue-200':'text-white'}`}>{day.getDate()}</p>{current&&<p className="text-[9px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">Hoy</p>}</div>})}</div>{slots.map(slot=><div key={`${slot.hour}:${slot.minute}`} className="grid min-h-[54px] border-b border-white/5" style={{gridTemplateColumns:`72px repeat(${days.length},minmax(110px,1fr))`}}><div className="p-2 text-xs text-zinc-500">{timeLabel(new Date(2026,0,1,slot.hour,slot.minute),hourMode,locale)}</div>{days.map(day=>{const key=dateKey(day),current=key===today,slotMinute=slot.hour*60+slot.minute;const events=appointments.filter(a=>{const date=new Date(a.date),start=minutesOf(date),end=start+(a.duration_minutes||30);return a.date.slice(0,10)===key&&slotMinute>=start&&slotMinute<end});return <div key={key} className={`group relative min-h-[54px] border-l p-1 text-left ${current?'border-blue-400/30 bg-blue-500/[0.08]':'border-white/10'}`}>{events.length?<button type="button" onClick={()=>onSelect(day,slot.hour,slot.minute)} aria-label={`Nueva cita ${key} ${pad(slot.hour)}:${pad(slot.minute)}`} title="Nueva cita" className="relative z-20 mb-1 flex h-5 w-full items-center justify-center rounded border border-dashed border-primary/30 text-[10px] text-primary transition hover:border-primary hover:bg-primary/15"><Plus className="mr-1 h-3 w-3"/>Nueva cita</button>:<button type="button" onClick={()=>onSelect(day,slot.hour,slot.minute)} aria-label={`Nueva cita ${key} ${pad(slot.hour)}:${pad(slot.minute)}`} title="Nueva cita" className="absolute inset-0 z-10 rounded transition hover:bg-primary/5"/>}{events.map(item=>{const start=minutesOf(new Date(item.date)),continuation=slotMinute>start;return <div key={item.id} role="button" tabIndex={0} onClick={()=>onAppointmentClick(item)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onAppointmentClick(item)}}} className={`appointment-card relative z-10 mb-1 cursor-pointer rounded-md border-l-4 p-1.5 text-[10px] text-white shadow ring-white/60 transition hover:ring-1 focus:outline-none focus:ring-2 ${eventColor(item.status)}`}>{continuation?<p className="truncate font-semibold">Bloqueado · continúa {names[item.patient_id]}</p>:<><p className="truncate font-semibold">{timeLabel(new Date(item.date),hourMode,locale)} · {names[item.patient_id]}</p><p className="truncate opacity-90">{item.professional}</p><p className="truncate opacity-80">{item.reason} · {item.duration_minutes} min</p><select aria-label="Estado de cita" value={item.status} onClick={event=>event.stopPropagation()} onKeyDown={event=>event.stopPropagation()} onChange={e=>onStatus(item,e.target.value)} className="appointment-status mt-1 w-full rounded bg-black/30 px-1 py-0.5 text-[9px] text-white">{Object.entries(statuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></>}</div>})}</div>})}</div>)}</div></div>
}

function MonthGrid({anchor,appointments,names,selected,onSelect,onAppointmentClick}){
  const first=new Date(anchor.getFullYear(),anchor.getMonth(),1),start=startOfWeek(first),days=Array.from({length:42},(_,i)=>addDays(start,i))
  const today=dateKey(new Date())
  return <div className="grid grid-cols-7 gap-1">{days.map(day=>{const key=dateKey(day),current=key===today,events=appointments.filter(a=>a.date.slice(0,10)===key);return <div key={key} className={`relative min-h-24 rounded-lg border p-2 text-left ${current?'border-blue-400 bg-blue-500/20 ring-2 ring-inset ring-blue-400/40':selected===key?'border-primary/60 bg-primary/10':'border-white/10 bg-white/[0.02]'} ${day.getMonth()!==anchor.getMonth()?'opacity-40':''}`}><button type="button" onClick={()=>onSelect(day,8)} className="absolute inset-0 rounded-lg" aria-label={`Nueva cita ${key}`}/><p className={`relative text-right text-sm font-bold ${current?'text-blue-800 dark:text-blue-300':'text-white'}`}>{day.getDate()}</p>{current&&<p className="relative text-[9px] font-bold uppercase text-blue-700 dark:text-blue-300">Hoy</p>}{events.slice(0,3).map(item=><button type="button" key={item.id} onClick={()=>onAppointmentClick(item)} className={`appointment-card relative z-10 mt-1 block w-full truncate rounded px-1 py-0.5 text-left text-[9px] font-medium text-white ${eventColor(item.status)}`}>{names[item.patient_id]}</button>)}{events.length>3&&<p className="relative text-[9px] text-zinc-500">+{events.length-3}</p>}</div>})}</div>
}
