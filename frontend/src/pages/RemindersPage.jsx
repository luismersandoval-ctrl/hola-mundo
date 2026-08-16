import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { CalendarClock, Check, Copy, MessageCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { useLanguage } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function RemindersPage(){
 const {currentUser}=useOutletContext()
 const {language,locale}=useLanguage()
 const [appointments,setAppointments]=useState([]),[patients,setPatients]=useState([]),[copied,setCopied]=useState(null)
 useEffect(()=>{Promise.all([api.get('/appointments/'),api.get('/patients/')]).then(([a,p])=>{setAppointments(a.data);setPatients(p.data)})},[])
 const names=useMemo(()=>Object.fromEntries(patients.map(p=>[p.id,p])),[patients])
 const upcoming=appointments.filter(a=>new Date(a.date)>=new Date()&&!['completed','cancelled'].includes(a.status)).sort((a,b)=>new Date(a.date)-new Date(b.date))
 const message=(a)=>{
   const patientName=names[a.patient_id]?.name||''
   const clinicName=currentUser?.clinic_name||''
   const appointmentDate=new Date(a.date).toLocaleString(locale,{dateStyle:'long',timeStyle:'short'})
   return language==='en'
     ? `Hello ${patientName}, this is a reminder of your dental appointment at ${clinicName} on ${appointmentDate}. Reason: ${a.reason}. Please confirm your attendance.`
     : `Hola ${patientName}, te recordamos tu cita odontológica en ${clinicName} para el ${appointmentDate}. Motivo: ${a.reason}. Por favor confirma tu asistencia.`
 }
 const copy=async(a)=>{await navigator.clipboard.writeText(message(a));setCopied(a.id);setTimeout(()=>setCopied(null),2000)}
 return <div className="p-4 md:p-8 min-h-screen"><div className="max-w-5xl mx-auto space-y-6"><header><h1 className="text-3xl font-bold text-white">Recordatorios</h1><p className="text-zinc-400">Prepara confirmaciones para las próximas citas.</p></header><Card className="glass border-white/10"><CardHeader><CardTitle className="text-white flex items-center gap-2"><CalendarClock className="text-primary"/>Próximas citas</CardTitle></CardHeader><CardContent className="space-y-3">{upcoming.length===0?<p className="text-zinc-500 text-center py-10">No hay citas pendientes.</p>:upcoming.map(a=>{const p=names[a.patient_id];return <div key={a.id} className="rounded-xl border border-white/10 p-4 flex flex-wrap items-center gap-4"><div className="flex-1"><p className="text-white font-medium">{p?.name||`Paciente #${a.patient_id}`}</p><p className="text-sm text-zinc-400">{new Date(a.date).toLocaleString()} · {a.reason}</p><p className="text-xs text-zinc-600 mt-1">{p?.phone||'Sin teléfono registrado'}</p></div><Button variant="outline" onClick={()=>copy(a)} className="border-white/10">{copied===a.id?<Check className="w-4 h-4 mr-2 text-emerald-400"/>:<Copy className="w-4 h-4 mr-2"/>}{copied===a.id?'Copiado':'Copiar mensaje'}</Button>{p?.phone&&<Button asChild className="bg-green-600 hover:bg-green-700"><a href={`https://wa.me/${p.phone.replace(/\D/g,'')}?text=${encodeURIComponent(message(a))}`} target="_blank" rel="noreferrer"><MessageCircle className="w-4 h-4 mr-2"/>Abrir WhatsApp</a></Button>}</div>})}</CardContent></Card></div></div>
}
