import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Bot, CheckCircle2, ExternalLink, FileCheck2, Mail, MessageCircle, Settings2, ScanLine, ShieldCheck, XCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const integrations = [
  { key:'exocad', name:'exocad / dentalshare', description:'Diseños dentales digitales relacionados con el expediente de cada paciente.', icon:ScanLine, roles:['admin','dentist','specialist','administrative'], operational:true },
  { key:'whatsapp', name:'WhatsApp Cloud API', description:'Mensajes y confirmaciones automáticas.', icon:MessageCircle, roles:['admin','administrative'], operational:true },
  { key:'email', name:'Correo SMTP', description:'Recordatorios y comunicaciones de la clínica.', icon:Mail, roles:['admin','administrative'], operational:true },
  { key:'ai', name:'Asistencia clínica', description:'Dictado y borradores sujetos a revisión profesional.', icon:Bot, roles:['admin','dentist','specialist'], operational:true },
  { key:'dian', name:'Facturación DIAN', description:'Documentos electrónicos mediante proveedor autorizado.', icon:FileCheck2, roles:['admin'], adminOnly:true },
  { key:'rips', name:'FEV-RIPS', description:'Validación y envío mediante proveedor habilitado.', icon:FileCheck2, roles:['admin'], adminOnly:true },
]

export default function IntegrationsPage(){
  const { currentUser }=useOutletContext()
  const [status,setStatus]=useState({})
  const [notice,setNotice]=useState('')
  const visible=useMemo(()=>integrations.filter(item=>item.roles.includes(currentUser?.role)),[currentUser?.role])

  useEffect(()=>{
    api.get('/integrations/status').then(response=>setStatus(response.data)).catch(()=>setNotice('No fue posible consultar el estado de las integraciones.'))
  },[])

  const exocadAction=()=>{
    if(status.exocad){
      setNotice('La conexión exocad está habilitada. El gestor de casos por paciente se incorporará cuando exocad entregue las especificaciones y credenciales del conector.')
      return
    }
    setNotice(currentUser?.role==='admin'
      ? 'Para conectar exocad debes solicitar a exocad o a tu reseller la habilitación y las especificaciones técnicas de DentalDB/dentalshare.'
      : 'exocad todavía no ha sido configurado por el administrador de la clínica. Puedes seguir registrando imágenes y archivos exportados en la historia del paciente.')
  }

  return <div className="min-h-screen p-4 md:p-8"><div className="mx-auto max-w-5xl space-y-6">
    <header><h1 className="text-3xl font-bold text-white">Integraciones</h1><p className="text-zinc-400">Servicios externos disponibles según tu función dentro de la clínica.</p></header>
    {notice&&<div role="status" className="flex gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200"><ShieldCheck className="h-5 w-5 shrink-0"/><p>{notice}</p></div>}
    <div className="grid gap-4 md:grid-cols-2">{visible.map(({key,name,description,icon:Icon,adminOnly})=><Card key={key} className="glass border-white/10">
      <CardHeader className="flex-row items-center gap-3"><div className="rounded-lg bg-primary/10 p-2"><Icon className="h-5 w-5 text-primary"/></div><CardTitle className="flex-1 text-base text-white">{name}</CardTitle>{status[key]?<CheckCircle2 className="text-emerald-400"/>:<XCircle className="text-zinc-600"/>}</CardHeader>
      <CardContent><p className="text-sm text-zinc-400">{description}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className={`text-xs ${status[key]?'text-emerald-400':'text-amber-400'}`}>{status[key]?'Configurada':'Pendiente de credenciales y validación'}</p>{adminOnly&&<span className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-300">Sólo administrador</span>}</div>{key==='exocad'&&<Button type="button" variant="outline" onClick={exocadAction} className="mt-4 w-full border-primary/30 text-primary"><ExternalLink className="mr-2 h-4 w-4"/>{currentUser?.role==='admin'?'Conectar API de exocad':'Acceder a exocad'}</Button>}</CardContent>
    </Card>)}</div>
    {currentUser?.role==='admin'&&<div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200"><Settings2 className="h-5 w-5 shrink-0"/><p>Las credenciales, certificados y proveedores se configuran únicamente desde la cuenta administradora. DIAN y FEV-RIPS deben probarse en certificación antes de utilizar información real.</p></div>}
  </div></div>
}
