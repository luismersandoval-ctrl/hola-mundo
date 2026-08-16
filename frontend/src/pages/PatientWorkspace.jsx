import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Calendar, CheckCircle2, ClipboardList, FileText, Loader2, Pencil, Plus, Save, Stethoscope, UserRound, Wallet, Waves } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const tabs = [
  ['summary', 'Resumen', UserRound],
  ['evolutions', 'Evoluciones', FileText],
  ['treatments', 'Tratamientos', ClipboardList],
  ['payments', 'Pagos', Wallet],
]

const money = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0)

export default function PatientWorkspace() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { currentUser } = useOutletContext()
  const readOnlyClinical = currentUser?.role === 'administrative'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'treatments' ? 'treatments' : 'summary')
  const [patient, setPatient] = useState(null)
  const [evolutions, setEvolutions] = useState([])
  const [treatments, setTreatments] = useState([])
  const [payments, setPayments] = useState([])
  const [catalog, setCatalog] = useState([])
  const [odontogramFindings, setOdontogramFindings] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [evolution, setEvolution] = useState({ professional: '', diagnosis: '', procedure: '', teeth: '', materials: '', recommendations: '', next_control: '' })
  const [treatment, setTreatment] = useState({ catalog_item_id: '', name: '', tooth: '', amount: '', notes: '', odontogram_reference: '', status: 'proposed' })
  const [newCatalogItem, setNewCatalogItem] = useState({ name: '', default_amount: '' })
  const [editPatientOpen, setEditPatientOpen] = useState(false)
  const [editPatient, setEditPatient] = useState({ name: '', phone: '', email: '', gender: 'unspecified' })
  const [editPatientError, setEditPatientError] = useState('')
  const [savingPatient, setSavingPatient] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [patientRes, evolutionsRes, treatmentsRes, paymentsRes, catalogRes, odontogramRes] = await Promise.all([
        api.get(`/patients/${id}`),
        api.get(`/patients/${id}/evolutions`),
        api.get(`/patients/${id}/treatments`),
        api.get(`/payments/?patient_id=${id}`),
        api.get('/treatment-catalog/'),
        api.get(`/patients/${id}/odontograma`).catch((error) => error.response?.status === 404 ? { data: null } : Promise.reject(error)),
      ])
      setPatient(patientRes.data)
      setEvolutions(evolutionsRes.data)
      setTreatments(treatmentsRes.data)
      setPayments(paymentsRes.data)
      setCatalog(catalogRes.data)
      if (odontogramRes.data?.data) {
        const data = JSON.parse(odontogramRes.data.data)
        const findings = Object.entries(data).flatMap(([tooth, detail]) => {
          const states = Object.entries(detail.surfaces || {}).filter(([,state]) => state !== 'sano').map(([surface,state]) => `${surface}: ${state}`)
          if (detail.toothState && detail.toothState !== 'presente') states.push(detail.toothState)
          return states.length ? [`Diente ${tooth} (${states.join(', ')})`] : []
        })
        setOdontogramFindings(findings.join('; '))
      }
    } catch {
      setError('No fue posible cargar el expediente del paciente.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    // The state update happens after the asynchronous API requests resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData()
  }, [loadData])

  const createEvolution = async (event) => {
    event.preventDefault()
    await api.post(`/patients/${id}/evolutions`, { ...evolution, next_control: evolution.next_control || null })
    setEvolution({ professional: '', diagnosis: '', procedure: '', teeth: '', materials: '', recommendations: '', next_control: '' })
    loadData()
  }

  const createTreatment = async (event) => {
    event.preventDefault()
    await api.post(`/patients/${id}/treatments`, { ...treatment, amount: Number(treatment.amount || 0) })
    setTreatment({ catalog_item_id: '', name: '', tooth: '', amount: '', notes: '', odontogram_reference: '', status: 'proposed' })
    loadData()
  }

  const updateTreatmentStatus = async (item, status) => {
    await api.put(`/treatments/${item.id}`, { status })
    loadData()
  }

  const chooseCatalogItem = (value) => {
    const item = catalog.find((entry) => entry.id === Number(value))
    setTreatment({...treatment, catalog_item_id: value, name: item?.name || '', amount: item?.default_amount || '', odontogram_reference: odontogramFindings})
  }

  const updateCatalogItem = async (item, changes) => {
    await api.put(`/treatment-catalog/${item.id}`, changes)
    loadData()
  }

  const createCatalogItem = async (event) => {
    event.preventDefault()
    await api.post('/treatment-catalog/', { name: newCatalogItem.name, default_amount: Number(newCatalogItem.default_amount || 0), active: true })
    setNewCatalogItem({ name: '', default_amount: '' })
    loadData()
  }

  const openPatientEditor = () => {
    setEditPatient({ name: patient?.name || '', phone: patient?.phone || '', email: patient?.email || '', gender: patient?.gender || 'unspecified' })
    setEditPatientError('')
    setEditPatientOpen(true)
  }

  const updatePatient = async (event) => {
    event.preventDefault()
    setSavingPatient(true)
    setEditPatientError('')
    try {
      const { data } = await api.put(`/patients/${id}`, editPatient)
      setPatient(data)
      setEditPatientOpen(false)
    } catch (requestError) {
      setEditPatientError(requestError.response?.data?.detail || 'No fue posible actualizar los datos del paciente.')
    } finally {
      setSavingPatient(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-zinc-400"><Loader2 className="w-5 h-5 mr-2 animate-spin" />Cargando expediente...</div>

  const treatmentTotal = treatments.reduce((sum, item) => sum + item.amount, 0)
  const paid = payments.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="glass rounded-2xl border-white/10 p-5 flex flex-wrap items-center gap-4">
          <Button size="icon" variant="outline" onClick={() => navigate('/')} className="border-white/10"><ArrowLeft className="w-4 h-4" /></Button>
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">{patient?.name?.[0]}</div>
          <div className="flex-1 min-w-[180px]">
            <h1 className="text-2xl font-bold text-white">{patient?.name}</h1>
            <p className="text-sm text-zinc-400">{patient?.phone || 'Sin teléfono'} · {patient?.email || 'Sin correo'}</p>
          </div>
          <Button variant="outline" onClick={openPatientEditor} className="border-emerald-500/30 text-emerald-300"><Pencil className="w-4 h-4 mr-2" />Editar datos</Button>
          <Button variant="outline" onClick={() => navigate(`/pacientes/${id}/historia-clinica`)} className="border-violet-500/30 text-violet-300"><FileText className="w-4 h-4 mr-2" />Historia</Button>
          <Button variant="outline" onClick={() => navigate(`/pacientes/${id}/odontograma`)} className="border-amber-500/30 text-amber-300"><Stethoscope className="w-4 h-4 mr-2" />Odontograma</Button>
          <Button variant="outline" onClick={() => navigate(`/pacientes/${id}/periodontograma`)} className="border-blue-500/30 text-blue-300"><Waves className="w-4 h-4 mr-2" />Periodontograma</Button>
        </header>

        <Dialog open={editPatientOpen} onOpenChange={setEditPatientOpen}><DialogContent className="glass border-white/10 text-white sm:max-w-lg"><DialogHeader><DialogTitle>Editar datos personales</DialogTitle></DialogHeader><form onSubmit={updatePatient} className="space-y-4 pt-2"><div><Label htmlFor="edit-patient-name">Nombre y apellido</Label><Input id="edit-patient-name" autoFocus required value={editPatient.name} onChange={event=>setEditPatient({...editPatient,name:event.target.value})} className="mt-1 bg-white/5 border-white/10" /></div><div><Label htmlFor="edit-patient-phone">Teléfono</Label><Input id="edit-patient-phone" type="tel" inputMode="numeric" pattern="[0-9]*" maxLength="15" value={editPatient.phone} onChange={event=>setEditPatient({...editPatient,phone:event.target.value.replace(/\D/g,'')})} className="mt-1 bg-white/5 border-white/10" /></div><div><Label htmlFor="edit-patient-email">Correo electrónico</Label><Input id="edit-patient-email" type="email" value={editPatient.email} onChange={event=>setEditPatient({...editPatient,email:event.target.value})} className="mt-1 bg-white/5 border-white/10" /></div><div><Label htmlFor="edit-patient-gender">Género</Label><select id="edit-patient-gender" value={editPatient.gender} onChange={event=>setEditPatient({...editPatient,gender:event.target.value})} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-zinc-900 px-3 text-sm"><option value="female">Femenino</option><option value="male">Masculino</option><option value="other">Otro</option><option value="unspecified">Prefiere no indicar</option></select></div>{editPatientError&&<p className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{editPatientError}</p>}<Button disabled={savingPatient} className="w-full">{savingPatient?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<CheckCircle2 className="mr-2 h-4 w-4"/>}{savingPatient?'Actualizando...':'Guardar cambios'}</Button></form></DialogContent></Dialog>

        {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300">{error}</div>}

        <div className="flex gap-2 overflow-x-auto">
          {tabs.map(([key, label, Icon]) => <Button key={key} variant={activeTab === key ? 'default' : 'outline'} onClick={() => setActiveTab(key)} className={activeTab === key ? '' : 'border-white/10 text-zinc-300'}><Icon className="w-4 h-4 mr-2" />{label}</Button>)}
        </div>

        {activeTab === 'summary' && <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[['Evoluciones', evolutions.length, FileText], ['Tratamientos', treatments.length, ClipboardList], ['Valor del plan', money(treatmentTotal), Calendar], ['Saldo pendiente', money(Math.max(treatmentTotal - paid, 0)), Wallet]].map(([label, value, Icon]) => <Card key={label} className="glass border-white/10"><CardContent className="p-5"><Icon className="w-5 h-5 text-primary mb-3" /><p className="text-xs text-zinc-500">{label}</p><p className="text-2xl font-bold text-white mt-1">{value}</p></CardContent></Card>)}
        </div>}

        {activeTab === 'evolutions' && <div className={`grid gap-6 ${readOnlyClinical ? '' : 'lg:grid-cols-[380px_1fr]'}`}>
          {!readOnlyClinical && <Card className="glass border-white/10"><CardHeader><CardTitle className="text-white">Nueva evolución</CardTitle></CardHeader><CardContent><form onSubmit={createEvolution} className="space-y-3">
            {[['professional','Profesional'],['diagnosis','Diagnóstico'],['procedure','Procedimiento realizado'],['teeth','Piezas dentales'],['materials','Materiales'],['recommendations','Recomendaciones']].map(([key,label]) => <div key={key}><Label>{label}</Label><Input required={key === 'procedure'} value={evolution[key]} onChange={(e) => setEvolution({...evolution,[key]:e.target.value})} className="mt-1 bg-white/5 border-white/10" /></div>)}
            <div><Label>Próximo control</Label><Input type="datetime-local" value={evolution.next_control} onChange={(e) => setEvolution({...evolution,next_control:e.target.value})} className="mt-1 bg-white/5 border-white/10" /></div>
            <Button className="w-full"><Plus className="w-4 h-4 mr-2" />Registrar evolución</Button>
          </form></CardContent></Card>}
          <div className="space-y-3">{evolutions.length === 0 ? <Empty text="No hay evoluciones registradas." /> : evolutions.map((item) => <Card key={item.id} className="glass border-white/10"><CardContent className="p-5"><div className="flex justify-between"><p className="font-semibold text-white">{item.procedure || 'Evolución clínica'}</p><span className="text-xs text-zinc-500">{new Date(item.created_at).toLocaleString()}</span></div><p className="text-sm text-primary mt-2">{item.diagnosis}</p><p className="text-sm text-zinc-400 mt-2">{item.recommendations}</p>{item.teeth && <span className="inline-block mt-3 text-xs px-2 py-1 bg-white/5 rounded">Piezas: {item.teeth}</span>}</CardContent></Card>)}</div>
        </div>}

        {activeTab === 'treatments' && <div className={`grid gap-6 ${readOnlyClinical ? '' : 'lg:grid-cols-[380px_1fr]'}`}>
          {!readOnlyClinical && <Card className="glass border-white/10"><CardHeader><CardTitle className="text-white">Agregar tratamiento</CardTitle></CardHeader><CardContent><form onSubmit={createTreatment} className="space-y-3">
            <div><Label>Tratamiento del catálogo</Label><select required value={treatment.catalog_item_id} onChange={(e) => chooseCatalogItem(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-zinc-900 px-3 text-sm text-white"><option value="">Seleccionar tratamiento</option>{catalog.filter((item)=>item.active).map((item)=><option key={item.id} value={item.id}>{item.name} · {money(item.default_amount)}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Pieza</Label><Input value={treatment.tooth} onChange={(e) => setTreatment({...treatment,tooth:e.target.value})} className="mt-1 bg-white/5 border-white/10" /></div><div><Label>Valor</Label><Input type="number" min="0" value={treatment.amount} onChange={(e) => setTreatment({...treatment,amount:e.target.value})} className="mt-1 bg-white/5 border-white/10" /></div></div>
            <div><Label>Notas</Label><Input value={treatment.notes} onChange={(e) => setTreatment({...treatment,notes:e.target.value})} className="mt-1 bg-white/5 border-white/10" /></div>
            <div><Label>Referencia del odontograma</Label><textarea rows={4} value={treatment.odontogram_reference} onChange={(e) => setTreatment({...treatment,odontogram_reference:e.target.value})} placeholder="Hallazgos relacionados con la pieza y el tratamiento" className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-3 text-sm text-white" /></div>
            <Button className="w-full"><Plus className="w-4 h-4 mr-2" />Agregar al plan</Button>
          </form></CardContent></Card>}
          <div className="space-y-3">{treatments.length === 0 ? <Empty text="No hay tratamientos propuestos." /> : treatments.map((item) => <Card key={item.id} className="glass border-white/10"><CardContent className="p-5 flex flex-wrap items-center gap-3"><div className="flex-1"><p className="font-semibold text-white">{item.name} {item.tooth && `· Pieza ${item.tooth}`}</p><p className="text-sm text-zinc-500">{item.notes}</p></div><p className="font-bold text-white">{money(item.amount)}</p><select disabled={readOnlyClinical} value={item.status} onChange={(e) => updateTreatmentStatus(item,e.target.value)} className="rounded-md bg-zinc-900 border border-white/10 p-2 text-sm text-zinc-200 disabled:opacity-60"><option value="proposed">Propuesto</option><option value="accepted">Aceptado</option><option value="in_progress">En proceso</option><option value="completed">Realizado</option><option value="rejected">Rechazado</option></select></CardContent></Card>)}</div>
        </div>}

        {activeTab === 'treatments' && currentUser?.is_clinic_owner && <Card className="glass border-white/10"><CardHeader><CardTitle className="text-white">Catálogo y valores de tratamientos</CardTitle><p className="text-sm text-zinc-500">Modifica nombres y valores base. Los cambios se aplicarán a los nuevos planes.</p></CardHeader><CardContent className="space-y-4"><form onSubmit={createCatalogItem} className="grid sm:grid-cols-[1fr_180px_auto] gap-2"><Input required placeholder="Nuevo tratamiento" value={newCatalogItem.name} onChange={(e)=>setNewCatalogItem({...newCatalogItem,name:e.target.value})} className="bg-white/5 border-white/10" /><Input type="number" min="0" placeholder="Valor" value={newCatalogItem.default_amount} onChange={(e)=>setNewCatalogItem({...newCatalogItem,default_amount:e.target.value})} className="bg-white/5 border-white/10" /><Button><Plus className="w-4 h-4 mr-1" />Agregar</Button></form><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b border-white/10 text-left text-zinc-500"><th className="p-2">Tratamiento</th><th className="p-2">Valor base</th><th className="p-2">Estado</th><th className="p-2"></th></tr></thead><tbody>{catalog.map((item)=><CatalogRow key={item.id} item={item} onSave={updateCatalogItem} />)}</tbody></table></div></CardContent></Card>}

        {activeTab === 'payments' && <Card className="glass border-white/10"><CardHeader><CardTitle className="text-white">Movimientos del paciente</CardTitle></CardHeader><CardContent><div className="space-y-2">{payments.length === 0 ? <Empty text="No hay pagos registrados." /> : payments.map((item) => <div key={item.id} className="flex justify-between border-b border-white/5 py-3"><div><p className="text-white">{item.concept}</p><p className="text-xs text-zinc-500">{item.method} · {new Date(item.created_at).toLocaleDateString()}</p></div><p className={item.type === 'income' ? 'text-emerald-400' : 'text-red-400'}>{money(item.amount)}</p></div>)}</div></CardContent></Card>}
      </div>
    </div>
  )
}

function Empty({ text }) { return <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-zinc-500">{text}</div> }

function CatalogRow({ item, onSave }) {
  const [name,setName] = useState(item.name)
  const [amount,setAmount] = useState(item.default_amount)
  return <tr className="border-b border-white/5"><td className="p-2"><Input value={name} onChange={(e)=>setName(e.target.value)} className="bg-white/5 border-white/10" /></td><td className="p-2"><Input type="number" min="0" value={amount} onChange={(e)=>setAmount(e.target.value)} className="bg-white/5 border-white/10" /></td><td className="p-2"><button type="button" onClick={()=>onSave(item,{active:!item.active})} className={`rounded-full px-2 py-1 text-xs ${item.active?'bg-emerald-500/15 text-emerald-300':'bg-zinc-500/15 text-zinc-400'}`}>{item.active?'Activo':'Inactivo'}</button></td><td className="p-2"><Button size="sm" variant="outline" onClick={()=>onSave(item,{name,default_amount:Number(amount||0)})} className="border-white/10"><Save className="w-4 h-4" /></Button></td></tr>
}
