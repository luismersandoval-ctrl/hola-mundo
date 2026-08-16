import { useEffect, useState } from 'react'
import { BarChart3, Boxes, CalendarCheck, CircleDollarSign, Loader2, Users, Wallet } from 'lucide-react'
import { api } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const money=(v)=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(v||0)
export default function ReportsPage(){
 const [report,setReport]=useState(null);useEffect(()=>{api.get('/reports/dashboard').then(r=>setReport(r.data))},[])
 if(!report)return <div className="min-h-screen flex items-center justify-center text-zinc-400"><Loader2 className="w-5 h-5 mr-2 animate-spin"/>Calculando indicadores...</div>
 const cards=[['Pacientes',report.patients,Users,'text-blue-400'],['Citas atendidas',report.appointments.completed||0,CalendarCheck,'text-emerald-400'],['Ingresos',money(report.income),CircleDollarSign,'text-emerald-400'],['Balance',money(report.balance),Wallet,'text-primary'],['Cuentas por cobrar',money(report.receivables),BarChart3,'text-amber-400'],['Alertas de inventario',report.low_stock,Boxes,'text-red-400']]
 const max=Math.max(...Object.values(report.appointments),1)
 return <div className="p-4 md:p-8 min-h-screen"><div className="max-w-7xl mx-auto space-y-6"><header><h1 className="text-3xl font-bold text-white">Reportes</h1><p className="text-zinc-400">Indicadores clínicos y administrativos en tiempo real.</p></header><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{cards.map(([l,v,I,c])=><Card key={l} className="glass border-white/10"><CardContent className="p-5"><I className={`w-5 h-5 mb-3 ${c}`}/><p className="text-xs text-zinc-500">{l}</p><p className="text-2xl font-bold text-white mt-1">{v}</p></CardContent></Card>)}</div><Card className="glass border-white/10"><CardHeader><CardTitle className="text-white">Estado de la agenda</CardTitle></CardHeader><CardContent className="space-y-4">{Object.entries(report.appointments).map(([status,count])=><div key={status}><div className="flex justify-between text-sm mb-1"><span className="text-zinc-400">{status.replace('_',' ')}</span><span className="text-white">{count}</span></div><div className="h-2 bg-white/5 rounded-full"><div className="h-2 bg-primary rounded-full" style={{width:`${count/max*100}%`}}/></div></div>)}</CardContent></Card></div></div>
}
