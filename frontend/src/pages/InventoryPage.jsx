import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Boxes, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const empty={name:'',sku:'',quantity:'',min_stock:'',max_stock:'',expiry_date:'',supplier:'',unit_cost:''}
export default function InventoryPage(){
 const [items,setItems]=useState([]),[form,setForm]=useState(empty)
 const load=useCallback(async()=>setItems((await api.get('/inventory/')).data),[]);useEffect(()=>{
  // eslint-disable-next-line react-hooks/set-state-in-effect
  load()
 },[load])
 const create=async(e)=>{e.preventDefault();await api.post('/inventory/',{...form,quantity:Number(form.quantity||0),min_stock:Number(form.min_stock||0),max_stock:Number(form.max_stock||0),unit_cost:Number(form.unit_cost||0),expiry_date:form.expiry_date||null});setForm(empty);load()}
 const adjust=async(item,delta)=>{await api.put(`/inventory/${item.id}`,{quantity:Math.max(item.quantity+delta,0)});load()}
 return <div className="p-4 md:p-8 min-h-screen"><div className="max-w-7xl mx-auto space-y-6"><header><h1 className="text-3xl font-bold text-white">Inventario</h1><p className="text-zinc-400">Control de insumos, mínimos y vencimientos.</p></header><div className="grid lg:grid-cols-[360px_1fr] gap-6">
  <Card className="glass border-white/10"><CardHeader><CardTitle className="text-white">Nuevo producto</CardTitle></CardHeader><CardContent><form onSubmit={create} className="space-y-3">{[['name','Nombre','text'],['sku','Código / SKU','text'],['supplier','Proveedor','text'],['quantity','Existencia','number'],['min_stock','Stock mínimo','number'],['max_stock','Stock máximo','number'],['unit_cost','Costo unitario','number'],['expiry_date','Vencimiento','date']].map(([k,l,t])=><div key={k}><Label>{l}</Label><Input required={k==='name'} type={t} min={t==='number'?'0':undefined} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} className="mt-1 bg-white/5 border-white/10" /></div>)}<Button className="w-full"><Plus className="w-4 h-4 mr-2"/>Agregar producto</Button></form></CardContent></Card>
  <Card className="glass border-white/10"><CardHeader><CardTitle className="text-white">Existencias</CardTitle></CardHeader><CardContent className="space-y-3">{items.length===0?<p className="text-zinc-500 text-center py-10">No hay productos registrados.</p>:items.map(item=>{const low=item.quantity<=item.min_stock;return <div key={item.id} className={`rounded-xl border p-4 flex flex-wrap items-center gap-4 ${low?'border-amber-500/30 bg-amber-500/5':'border-white/10 bg-white/[0.03]'}`}><div className="p-2 rounded-lg bg-white/5">{low?<AlertTriangle className="w-5 h-5 text-amber-400"/>:<Boxes className="w-5 h-5 text-primary"/>}</div><div className="flex-1"><p className="text-white font-medium">{item.name}</p><p className="text-xs text-zinc-500">{item.sku||'Sin SKU'} · {item.supplier||'Sin proveedor'} {item.expiry_date&&`· Vence ${item.expiry_date}`}</p></div><div className="text-center"><p className={`text-xl font-bold ${low?'text-amber-400':'text-white'}`}>{item.quantity}</p><p className="text-[10px] text-zinc-500">mín. {item.min_stock}</p></div><div className="flex gap-1"><Button size="sm" variant="outline" onClick={()=>adjust(item,-1)} className="border-white/10">−</Button><Button size="sm" variant="outline" onClick={()=>adjust(item,1)} className="border-white/10">+</Button></div></div>})}</CardContent></Card>
 </div></div></div>
}
