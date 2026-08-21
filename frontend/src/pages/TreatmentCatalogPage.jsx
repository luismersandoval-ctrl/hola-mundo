import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Loader2, Plus, Save } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const money = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0)

export default function TreatmentCatalogPage() {
  const navigate = useNavigate()
  const { currentUser } = useOutletContext()
  const [items, setItems] = useState([])
  const [draft, setDraft] = useState({ name: '', default_amount: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try { setItems((await api.get('/treatment-catalog/')).data) }
    catch (requestError) { setError(requestError.response?.data?.detail || 'No fue posible cargar el catálogo.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    // The request resolves asynchronously before updating the catalog state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const create = async (event) => {
    event.preventDefault(); setError('')
    try { await api.post('/treatment-catalog/', { name: draft.name, default_amount: Number(draft.default_amount || 0), active: true }); setDraft({ name: '', default_amount: '' }); load() }
    catch (requestError) { setError(requestError.response?.data?.detail || 'No fue posible crear el tratamiento.') }
  }

  const update = async (item, changes) => {
    setError('')
    try { await api.put(`/treatment-catalog/${item.id}`, changes); load() }
    catch (requestError) { setError(requestError.response?.data?.detail || 'No fue posible actualizar el tratamiento.') }
  }

  if (!currentUser?.is_clinic_owner) return <div className="p-8 text-center text-zinc-400">Esta sección es exclusiva del administrador de la clínica.</div>
  if (loading) return <div className="min-h-screen grid place-items-center text-zinc-400"><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Cargando catálogo...</div>

  return <div className="min-h-screen p-4 md:p-8"><div className="mx-auto max-w-5xl space-y-6"><header className="glass flex items-center gap-4 rounded-2xl border-white/10 p-5"><Button size="icon" variant="outline" onClick={()=>navigate('/')} className="border-white/10"><ArrowLeft className="h-4 w-4"/></Button><span className="rounded-xl bg-primary/15 p-3 text-primary"><ClipboardList/></span><div><h1 className="text-2xl font-bold text-white">Planes de tratamiento</h1><p className="text-sm text-zinc-400">Administra los tratamientos y precios que verá el equipo clínico.</p></div></header>{error&&<div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">{error}</div>}<Card className="glass border-white/10"><CardHeader><CardTitle className="text-white">Agregar tratamiento</CardTitle></CardHeader><CardContent><form onSubmit={create} className="grid gap-3 sm:grid-cols-[1fr_220px_auto]"><Input required placeholder="Nombre del tratamiento" value={draft.name} onChange={(e)=>setDraft({...draft,name:e.target.value})} className="bg-white/5 border-white/10"/><Input required type="number" min="0" step="1000" placeholder="Precio base" value={draft.default_amount} onChange={(e)=>setDraft({...draft,default_amount:e.target.value})} className="bg-white/5 border-white/10"/><Button><Plus className="mr-2 h-4 w-4"/>Agregar</Button></form></CardContent></Card><div className="space-y-3">{items.map((item)=><CatalogItem key={item.id} item={item} onSave={update}/>)}</div><p className="text-xs text-zinc-500">Los tratamientos inactivos permanecen guardados, pero no aparecen para odontólogos ni especialistas al crear planes nuevos.</p></div></div>
}

function CatalogItem({ item, onSave }) {
  const [name, setName] = useState(item.name)
  const [amount, setAmount] = useState(item.default_amount)
  return <Card className="glass border-white/10"><CardContent className="grid items-center gap-3 p-4 sm:grid-cols-[1fr_200px_auto_auto]"><Input value={name} onChange={(e)=>setName(e.target.value)} className="bg-white/5 border-white/10"/><Input type="number" min="0" step="1000" value={amount} onChange={(e)=>setAmount(e.target.value)} className="bg-white/5 border-white/10"/><button type="button" onClick={()=>onSave(item,{active:!item.active})} className={`rounded-full px-3 py-2 text-xs ${item.active?'bg-emerald-500/15 text-emerald-300':'bg-zinc-500/15 text-zinc-400'}`}>{item.active?'Visible':'Oculto'}</button><Button size="icon" variant="outline" onClick={()=>onSave(item,{name,default_amount:Number(amount||0)})} className="border-white/10" title={`Guardar ${money(amount)}`}><Save className="h-4 w-4"/></Button></CardContent></Card>
}
