import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const money = (v) => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(v||0)
export default function PagosPage() {
  const [payments,setPayments]=useState([]); const [patients,setPatients]=useState([])
  const [form,setForm]=useState({patient_id:'',type:'income',concept:'',amount:'',method:'cash'})
  const load=useCallback(async()=>{const [a,b]=await Promise.all([api.get('/payments/'),api.get('/patients/')]);setPayments(a.data);setPatients(b.data)},[])
  useEffect(()=>{
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  },[load])
  const names=useMemo(()=>Object.fromEntries(patients.map(p=>[p.id,p.name])),[patients])
  const income=payments.filter(p=>p.type==='income').reduce((s,p)=>s+p.amount,0), expenses=payments.filter(p=>p.type==='expense').reduce((s,p)=>s+p.amount,0)
  const create=async(e)=>{e.preventDefault();await api.post('/payments/',{...form,patient_id:form.patient_id?Number(form.patient_id):null,amount:Number(form.amount)});setForm({patient_id:'',type:'income',concept:'',amount:'',method:'cash'});load()}
  return <div className="space-y-6"><header><h1 className="text-3xl font-bold text-white">Pagos y Caja</h1><p className="text-zinc-400">Ingresos, egresos y movimientos por paciente.</p></header>
    <div className="grid sm:grid-cols-3 gap-4">{[['Ingresos',income,'text-emerald-400'],['Egresos',expenses,'text-red-400'],['Balance',income-expenses,'text-primary']].map(([l,v,c])=><Card key={l} className="glass border-white/10"><CardContent className="p-5"><p className="text-xs text-zinc-500">{l}</p><p className={`text-2xl font-bold mt-1 ${c}`}>{money(v)}</p></CardContent></Card>)}</div>
    <div className="grid lg:grid-cols-[360px_1fr] gap-6"><Card className="glass border-white/10"><CardHeader><CardTitle className="text-white">Nuevo movimiento</CardTitle></CardHeader><CardContent><form onSubmit={create} className="space-y-3">
      <div><Label>Tipo</Label><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-md p-2"><option value="income">Ingreso</option><option value="expense">Egreso</option></select></div>
      <div><Label>Paciente (opcional)</Label><select value={form.patient_id} onChange={e=>setForm({...form,patient_id:e.target.value})} className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-md p-2"><option value="">General</option>{patients.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div><Label>Concepto</Label><Input required value={form.concept} onChange={e=>setForm({...form,concept:e.target.value})} className="mt-1 bg-white/5 border-white/10" /></div><div><Label>Valor</Label><Input required type="number" min="0" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} className="mt-1 bg-white/5 border-white/10" /></div>
      <div><Label>Método</Label><select value={form.method} onChange={e=>setForm({...form,method:e.target.value})} className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-md p-2"><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option></select></div><Button className="w-full"><Plus className="w-4 h-4 mr-2" />Registrar</Button>
    </form></CardContent></Card><Card className="glass border-white/10"><CardHeader><CardTitle className="text-white">Movimientos recientes</CardTitle></CardHeader><CardContent className="space-y-2">{payments.length===0?<p className="text-zinc-500 text-center py-10">No hay movimientos.</p>:payments.map(p=><div key={p.id} className="flex items-center gap-3 border-b border-white/5 py-3">{p.type==='income'?<ArrowUpRight className="text-emerald-400"/>:<ArrowDownRight className="text-red-400"/>}<div className="flex-1"><p className="text-white">{p.concept}</p><p className="text-xs text-zinc-500">{names[p.patient_id]||'Movimiento general'} · {p.method}</p></div><p className={p.type==='income'?'text-emerald-400':'text-red-400'}>{money(p.amount)}</p></div>)}</CardContent></Card></div>
  </div>
}
