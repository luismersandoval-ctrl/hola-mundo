import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Bot, Calendar, CheckCircle2, ClipboardList, Download, Eraser, FileSignature, FileText, Loader2, Mail, Pencil, Pill, Plus, Printer, Save, Send, Stethoscope, Trash2, Upload, UserRound, Wallet, Waves } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ClinicalAssistant } from '@/components/ClinicalAssistant'
import { apiErrorMessage } from '@/lib/validation'

const tabs = [
  ['summary', 'Resumen', UserRound],
  ['assistant', 'Asistente IA', Bot],
  ['treatments', 'Tratamientos', ClipboardList],
  ['evolutions', 'Evoluciones', FileText],
  ['consents', 'Consentimientos', FileSignature],
  ['payments', 'Pagos', Wallet],
  ['prescriptions', 'Recetas', Pill],
]

const money = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0)

function SignaturePad({ onChange }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const point = (event) => { const rect=canvasRef.current.getBoundingClientRect(); return {x:(event.clientX-rect.left)*(canvasRef.current.width/rect.width),y:(event.clientY-rect.top)*(canvasRef.current.height/rect.height)} }
  const start = (event) => { drawing.current=true; const ctx=canvasRef.current.getContext('2d'); const p=point(event); ctx.beginPath();ctx.moveTo(p.x,p.y);event.currentTarget.setPointerCapture(event.pointerId) }
  const move = (event) => { if(!drawing.current)return;const ctx=canvasRef.current.getContext('2d');const p=point(event);ctx.lineWidth=event.pointerType==='pen'&&event.pressure?1.5+(event.pressure*2.5):2.2;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#18181b';ctx.lineTo(p.x,p.y);ctx.stroke();event.preventDefault() }
  const end = () => { if(!drawing.current)return;drawing.current=false;onChange(canvasRef.current.toDataURL('image/png')) }
  const clear = () => { const canvas=canvasRef.current;canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);onChange('') }
  return <div><canvas ref={canvasRef} width="900" height="240" onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} className="h-48 w-full touch-none rounded-xl border border-zinc-300 bg-white shadow-inner" aria-label="Área para firma manuscrita con dedo o lápiz digital"/><p className="mt-1 text-xs text-zinc-500">Firma con el dedo, mouse o lápiz digital.</p><Button type="button" variant="outline" size="sm" onClick={clear} className="mt-2 border-white/10"><Eraser className="mr-2 h-4 w-4"/>Limpiar firma</Button></div>
}

export default function PatientWorkspace() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { currentUser } = useOutletContext()
  const readOnlyClinical = currentUser?.role === 'administrative'
  const canRecordEvolution = ['dentist', 'specialist'].includes(currentUser?.role)
  const requestedTab = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(['assistant', 'treatments', 'evolutions', 'consents', 'prescriptions', 'payments'].includes(requestedTab) ? requestedTab : 'summary')
  const [patient, setPatient] = useState(null)
  const [evolutions, setEvolutions] = useState([])
  const [histories, setHistories] = useState([])
  const [treatments, setTreatments] = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [payments, setPayments] = useState([])
  const [consents, setConsents] = useState([])
  const [consentTemplates, setConsentTemplates] = useState([])
  const [readiness, setReadiness] = useState({complete:false,missing_fields:[]})
  const [catalog, setCatalog] = useState([])
  const [odontogramFindings, setOdontogramFindings] = useState('')
  const [odontogramOptions, setOdontogramOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [evolution, setEvolution] = useState({ diagnosis: '', procedure: '', technique: '', teeth: '', materials: '', instruments: '', anesthesia: '', complications: '', observations: '', recommendations: '', next_control: '', treatment_id: '' })
  const [treatment, setTreatment] = useState({ catalog_item_id: '', name: '', tooth: '', notes: '', odontogram_reference: '', odontogram_surfaces: '[]', status: 'proposed' })
  const emptyMedication = { name: '', presentation: '', dose: '', route: 'Oral', frequency: '', duration: '', quantity: '', instructions: '' }
  const [prescription, setPrescription] = useState({ professional: '', diagnosis: '', general_instructions: '', medications: [{ ...emptyMedication }] })
  const [editPatientOpen, setEditPatientOpen] = useState(false)
  const [editPatient, setEditPatient] = useState({ name: '', phone: '', email: '', gender: 'unspecified' })
  const [editPatientError, setEditPatientError] = useState('')
  const [savingPatient, setSavingPatient] = useState(false)
  const [consent, setConsent] = useState({template_id:'',treatment_id:'',title:'Consentimiento informado para tratamiento odontológico',content:'Declaro que he recibido información clara sobre el diagnóstico, el tratamiento propuesto, sus beneficios, riesgos, alternativas y posibles complicaciones. He podido realizar preguntas y autorizo voluntariamente la realización del procedimiento descrito.',signer_name:'',signer_document:'',signature_data:''})
  const [savingConsent, setSavingConsent] = useState(false)
  const [uploadingTemplate, setUploadingTemplate] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [patientRes, historiesRes, evolutionsRes, treatmentsRes, prescriptionsRes, paymentsRes, catalogRes, odontogramRes, readinessRes, consentsRes, templatesRes] = await Promise.all([
        api.get(`/patients/${id}`),
        api.get(`/patients/${id}/clinical-history`),
        api.get(`/patients/${id}/evolutions`),
        api.get(`/patients/${id}/treatments`),
        api.get(`/patients/${id}/prescriptions`),
        api.get(`/payments/?patient_id=${id}`).catch((error) => error.response?.status === 403 ? { data: [] } : Promise.reject(error)),
        api.get('/treatment-catalog/'),
        api.get(`/patients/${id}/odontograma`).catch((error) => error.response?.status === 404 ? { data: null } : Promise.reject(error)),
        api.get(`/patients/${id}/clinical-readiness`),
        api.get(`/patients/${id}/consents`),
        api.get('/consent-templates'),
      ])
      setPatient(patientRes.data)
      setHistories(historiesRes.data)
      setEvolutions(evolutionsRes.data)
      setTreatments(treatmentsRes.data)
      setPrescriptions(prescriptionsRes.data)
      setPayments(paymentsRes.data)
      setCatalog(catalogRes.data)
      setReadiness(readinessRes.data)
      setConsents(consentsRes.data)
      setConsentTemplates(templatesRes.data)
      if (odontogramRes.data?.data) {
        const data = JSON.parse(odontogramRes.data.data)
        const findings = Object.entries(data).flatMap(([tooth, detail]) => {
          const affectedSurfaces = Object.entries(detail.surfaces || {}).filter(([,state]) => state !== 'sano')
          const states = affectedSurfaces.map(([surface,state]) => `${surface}: ${state}`)
          if (detail.toothState && detail.toothState !== 'presente') states.push(detail.toothState)
          return states.length ? [{ tooth, label: `Diente ${tooth} (${states.join(', ')})`, surfaces: affectedSurfaces.map(([surface, state]) => ({ surface, state })) }] : []
        })
        setOdontogramOptions(findings)
        setOdontogramFindings(findings.map((item) => item.label).join('; '))
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
    await api.post(`/patients/${id}/evolutions`, { ...evolution, next_control: evolution.next_control || null, treatment_id: evolution.treatment_id ? Number(evolution.treatment_id) : null })
    setEvolution({ diagnosis: '', procedure: '', technique: '', teeth: '', materials: '', instruments: '', anesthesia: '', complications: '', observations: '', recommendations: '', next_control: '', treatment_id: '' })
    loadData()
  }

  const createTreatment = async (event) => {
    event.preventDefault()
    await api.post(`/patients/${id}/treatments`, treatment)
    setTreatment({ catalog_item_id: '', name: '', tooth: '', notes: '', odontogram_reference: '', odontogram_surfaces: '[]', status: 'proposed' })
    loadData()
  }

  const createConsent = async (event) => {
    event.preventDefault();setSavingConsent(true);setError('')
    try {
      await api.post(`/patients/${id}/consents`, {...consent,treatment_id:consent.treatment_id?Number(consent.treatment_id):null})
      setConsent({...consent,template_id:'',treatment_id:'',signer_name:'',signer_document:'',signature_data:''})
      await loadData()
    } catch (requestError) { setError(apiErrorMessage(requestError, 'No fue posible guardar el consentimiento informado.')) }
    finally { setSavingConsent(false) }
  }

  const fillConsentTemplate = (template, treatmentId = consent.treatment_id) => {
    const history = histories[0] || {}
    const linkedTreatment = treatments.find(item => item.id === Number(treatmentId))
    const values = {
      paciente: patient?.name || '', documento: [patient?.document_type, patient?.document_number].filter(Boolean).join(' '),
      fecha: new Date().toLocaleDateString('es-CO'), profesional: currentUser?.display_name || currentUser?.full_name || '',
      tratamiento: linkedTreatment?.name || '', telefono: patient?.phone ? `${patient.phone_country_code || ''} ${patient.phone}`.trim() : '',
      domicilio: patient?.address || history.address || '', alergias: history.alergias || '', habitos: history.habitos || '',
      motivo_consulta: history.motivo_consulta || '', diagnostico: history.diagnosis || '',
    }
    const content = (template.content || '').replace(/\{([a-z_]+)\}/gi, (match, key) => Object.hasOwn(values, key.toLowerCase()) ? values[key.toLowerCase()] : match)
    setConsent(current => ({...current,template_id:String(template.id),title:template.name,content:content || current.content,treatment_id:treatmentId}))
    if (!template.content) setError('El PDF quedó adjunto como original. Escribe o pega el texto editable antes de solicitar la firma.')
    else setError('')
  }

  const uploadConsentTemplate = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploadingTemplate(true);setError('')
    try {
      const payload = new FormData();payload.append('file',file);payload.append('name',file.name.replace(/\.[^.]+$/,''))
      const {data} = await api.post('/consent-templates',payload)
      setConsentTemplates(current => [data,...current])
      fillConsentTemplate(data)
    } catch (requestError) { setError(apiErrorMessage(requestError, 'No fue posible cargar la plantilla.')) }
    finally { setUploadingTemplate(false) }
  }

  const downloadConsentTemplate = async (template) => {
    try {
      const {data} = await api.get(`/consent-templates/${template.id}/file`,{responseType:'blob'})
      const url=URL.createObjectURL(data);const link=document.createElement('a');link.href=url;link.download=template.original_filename;link.click();URL.revokeObjectURL(url)
    } catch (requestError) { setError(apiErrorMessage(requestError, 'No fue posible descargar el archivo original.')) }
  }

  const downloadEditableConsentTemplate = async (template) => {
    try {
      const {data} = await api.get(`/consent-templates/${template.id}/editable-file`,{responseType:'blob'})
      const url=URL.createObjectURL(data);const link=document.createElement('a');link.href=url;link.download=template.editable_filename||`${template.name}-editable.docx`;link.click();URL.revokeObjectURL(url)
    } catch (requestError) { setError(apiErrorMessage(requestError, 'No fue posible descargar la versión DOCX editable.')) }
  }

  const updateTreatmentStatus = async (item, status) => {
    setError('')
    try { await api.put(`/treatments/${item.id}`, { status }); loadData() }
    catch (requestError) { setError(requestError.response?.data?.detail || 'No fue posible actualizar el tratamiento.') }
  }

  const updateTreatmentDiscount = async (item, discountPercent) => {
    await api.put(`/treatments/${item.id}`, { discount_percent: Number(discountPercent || 0) })
    loadData()
  }

  const chooseCatalogItem = (value) => {
    const item = catalog.find((entry) => entry.id === Number(value))
    setTreatment({...treatment, catalog_item_id: value, name: item?.name || '', odontogram_reference: odontogramFindings})
  }

  const chooseOdontogramTooth = (tooth) => {
    const finding = odontogramOptions.find((item) => item.tooth === tooth)
    setTreatment({ ...treatment, tooth, odontogram_reference: finding?.label || '', odontogram_surfaces: JSON.stringify(finding?.surfaces || []) })
  }

  const startTreatmentEvolution = (item) => {
    setEvolution({...evolution,treatment_id:String(item.id),teeth:item.tooth||'',diagnosis:item.odontogram_reference||'',procedure:item.name})
    setActiveTab('evolutions')
    window.scrollTo({top:0,behavior:'smooth'})
  }

  const createPrescription = async (event) => {
    event.preventDefault()
    await api.post(`/patients/${id}/prescriptions`, { ...prescription, medications: JSON.stringify(prescription.medications), status: 'draft' })
    setPrescription({ professional: '', diagnosis: '', general_instructions: '', medications: [{ ...emptyMedication }] })
    loadData()
  }

  const updateMedication = (index, key, value) => setPrescription({ ...prescription, medications: prescription.medications.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) })
  const removeMedication = (index) => setPrescription({ ...prescription, medications: prescription.medications.filter((_, itemIndex) => itemIndex !== index) })

  const prescriptionText = (item) => {
    const medications = JSON.parse(item.medications || '[]')
    return [`Fórmula médica - ${patient?.name}`, item.diagnosis && `Diagnóstico: ${item.diagnosis}`, ...medications.map((medication, index) => `${index + 1}. ${medication.name} ${medication.presentation || ''}\nDosis: ${medication.dose} · Vía: ${medication.route} · Frecuencia: ${medication.frequency} · Duración: ${medication.duration}${medication.instructions ? `\nIndicaciones: ${medication.instructions}` : ''}`), item.general_instructions && `Indicaciones generales: ${item.general_instructions}`, `Profesional: ${item.professional || 'No especificado'}`].filter(Boolean).join('\n\n')
  }

  const sendPrescription = async (item) => {
    const text = prescriptionText(item)
    if (navigator.share) await navigator.share({ title: `Fórmula médica - ${patient?.name}`, text })
    else window.open(`https://wa.me/${patient?.phone_country_code?.replace(/\D/g, '') || '57'}${patient?.phone || ''}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer')
    await api.post(`/prescriptions/${item.id}/mark-sent`)
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
  const treatmentPaid = treatments.reduce((sum, item) => sum + (item.paid_amount || 0), 0)
  const treatmentBalance = Math.max(treatmentTotal - treatmentPaid, 0)

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

        {!readiness.complete && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0"/><div><p className="font-semibold">Historia clínica pendiente</p><p className="mt-1">El odontograma y el periodontograma siguen disponibles para valoración. El plan de tratamiento y las evoluciones se habilitarán al completar: {readiness.missing_fields.join(', ')}.</p><Button type="button" size="sm" variant="outline" onClick={()=>navigate(`/pacientes/${id}/historia-clinica`)} className="mt-3 border-amber-400/30">Completar historia clínica</Button></div></div></div>}

        <div className="flex gap-2 overflow-x-auto">
          {tabs.map(([key, label, Icon]) => {const locked=!readiness.complete&&['treatments','evolutions'].includes(key);return <Button key={key} disabled={locked} title={locked?'Completa primero la historia clínica':undefined} variant={activeTab === key ? 'default' : 'outline'} onClick={() => !locked&&setActiveTab(key)} className={activeTab === key ? '' : 'border-white/10 text-zinc-300'}><Icon className="w-4 h-4 mr-2" />{label}{locked?' · Bloqueado':''}</Button>})}
        </div>

        {activeTab === 'summary' && <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[['Evoluciones', evolutions.length, FileText], ['Tratamientos', treatments.length, ClipboardList], ['Recetas', prescriptions.length, Pill], ['Valor del plan', money(treatmentTotal), Calendar]].map(([label, value, Icon]) => <Card key={label} className="glass border-white/10"><CardContent className="p-5"><Icon className="w-5 h-5 text-primary mb-3" /><p className="text-xs text-zinc-500">{label}</p><p className="text-2xl font-bold text-white mt-1">{value}</p></CardContent></Card>)}
        </div>}

        {activeTab === 'assistant' && <ClinicalAssistant patient={patient} histories={histories} evolutions={evolutions} treatments={treatments} readOnly={readOnlyClinical} onUseDraft={(draft) => { setEvolution({...evolution, recommendations: draft}); setActiveTab('evolutions') }} />}

        {activeTab === 'consents' && <div className="grid gap-6 lg:grid-cols-[430px_1fr]">
          <Card className="glass border-white/10"><CardHeader><CardTitle className="text-white">Nuevo consentimiento informado</CardTitle><p className="text-sm text-zinc-500">Debe firmarlo el paciente o su representante antes de iniciar el tratamiento.</p></CardHeader><CardContent><form onSubmit={createConsent} className="space-y-3">
            <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3"><Label>Plantilla editable</Label><div className="mt-2 flex gap-2"><select value={consent.template_id} onChange={event=>{const template=consentTemplates.find(item=>item.id===Number(event.target.value));if(template)fillConsentTemplate(template);else setConsent({...consent,template_id:''})}} className="h-10 min-w-0 flex-1 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-foreground"><option value="">Sin plantilla</option>{consentTemplates.map(template=><option key={template.id} value={template.id}>{template.name}</option>)}</select><label className="inline-flex h-10 cursor-pointer items-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"><input type="file" accept=".docx,.txt,.pdf" onChange={uploadConsentTemplate} className="sr-only" disabled={uploadingTemplate}/>{uploadingTemplate?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Upload className="mr-2 h-4 w-4"/>}Adjuntar</label></div><p className="mt-2 text-xs text-zinc-500">Los PDF con texto y los TXT se convierten automáticamente a DOCX editable; el archivo original siempre se conserva. Los PDF escaneados requieren OCR. Variables: {'{paciente}'}, {'{documento}'}, {'{fecha}'}, {'{profesional}'}, {'{tratamiento}'}, {'{telefono}'}, {'{domicilio}'}, {'{alergias}'}, {'{habitos}'}.</p></div>
            <div><Label>Tratamiento relacionado</Label><select required value={consent.treatment_id} onChange={event=>setConsent({...consent,treatment_id:event.target.value})} disabled={!readiness.complete} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-zinc-900 px-3 text-sm"><option value="">Seleccionar tratamiento</option>{treatments.map(item=><option key={item.id} value={item.id}>{item.name}{item.tooth?` · Pieza ${item.tooth}`:''}</option>)}</select></div>
            <div><Label>Título</Label><Input required value={consent.title} onChange={event=>setConsent({...consent,title:event.target.value})} className="mt-1 bg-white/5 border-white/10"/></div>
            <div><Label>Información, riesgos y autorización</Label><textarea required minLength={30} rows={7} value={consent.content} onChange={event=>setConsent({...consent,content:event.target.value})} className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-3 text-sm"/></div>
            <div className="grid gap-3 sm:grid-cols-2"><div><Label>Nombre del firmante</Label><Input required value={consent.signer_name} onChange={event=>setConsent({...consent,signer_name:event.target.value})} className="mt-1 bg-white/5 border-white/10"/></div><div><Label>Documento</Label><Input value={consent.signer_document} onChange={event=>setConsent({...consent,signer_document:event.target.value})} className="mt-1 bg-white/5 border-white/10"/></div></div>
            <div><Label>Firma manuscrita</Label><div className="mt-1"><SignaturePad key={consents.length} onChange={signature_data=>setConsent(current=>({...current,signature_data}))}/></div></div>
            <Button disabled={savingConsent||!readiness.complete||!consent.signature_data} className="w-full"><FileSignature className="mr-2 h-4 w-4"/>{savingConsent?'Guardando firma...':'Firmar y guardar consentimiento'}</Button>
          </form></CardContent></Card>
          <div className="space-y-3">{consents.length===0?<Empty text="No hay consentimientos firmados."/>:consents.map(item=>{const linked=treatments.find(t=>t.id===item.treatment_id);const template=consentTemplates.find(entry=>entry.id===item.template_id);return <Card key={item.id} className="glass border-white/10"><CardContent className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-white">{item.title}</p><p className="mt-1 text-xs text-emerald-300">Firmado por {item.signer_name}{item.signer_document?` · ${item.signer_document}`:''}</p></div><span className="text-xs text-zinc-500">{new Date(item.signed_at).toLocaleString()}</span></div><p className="mt-3 whitespace-pre-wrap text-sm text-zinc-400">{item.content}</p>{linked&&<p className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">Tratamiento: {linked.name}{linked.tooth?` · Pieza ${linked.tooth}`:''}</p>}{template&&<div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={()=>downloadConsentTemplate(template)} className="border-white/10"><Download className="mr-2 h-4 w-4"/>Original · {template.original_filename}</Button><Button type="button" variant="outline" size="sm" onClick={()=>downloadEditableConsentTemplate(template)} className="border-primary/30 text-primary"><FileText className="mr-2 h-4 w-4"/>DOCX editable</Button></div>}<img src={item.signature_data} alt={`Firma de ${item.signer_name}`} className="mt-4 h-24 max-w-full rounded-lg bg-white object-contain p-2"/></CardContent></Card>})}</div>
        </div>}

        {activeTab === 'evolutions' && readiness.complete && <div className={`grid gap-6 ${canRecordEvolution ? 'lg:grid-cols-[420px_1fr]' : ''}`}>
          {canRecordEvolution && <Card className="glass border-white/10"><CardHeader><CardTitle className="text-white">Nueva evolución</CardTitle><p className="text-sm text-zinc-500">El registro quedará firmado por {currentUser?.display_name || currentUser?.full_name}.</p></CardHeader><CardContent><form onSubmit={createEvolution} className="space-y-3">
            <div><Label>Tratamiento relacionado</Label><select value={evolution.treatment_id} onChange={(e) => { const linked = treatments.find((item) => item.id === Number(e.target.value)); setEvolution({...evolution,treatment_id:e.target.value,teeth:linked?.tooth || evolution.teeth}) }} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-zinc-900 px-3 text-sm text-white"><option value="">Evolución general</option>{treatments.map((item)=><option key={item.id} value={item.id}>{item.name}{item.tooth ? ` · Pieza ${item.tooth}` : ''}</option>)}</select></div>
            {[['diagnosis','Diagnóstico'],['procedure','Procedimiento realizado'],['technique','Técnica y cómo se realizó'],['teeth','Piezas dentales'],['materials','Materiales utilizados'],['instruments','Instrumental utilizado'],['anesthesia','Anestesia y dosis'],['complications','Complicaciones o eventos'],['observations','Observaciones clínicas'],['recommendations','Recomendaciones al paciente']].map(([key,label]) => <div key={key}><Label>{label}</Label><textarea required={key === 'procedure'||key === 'technique'} rows={['procedure','technique','instruments'].includes(key)?3:2} value={evolution[key]} onChange={(e) => setEvolution({...evolution,[key]:e.target.value})} className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-3 text-sm text-white" /></div>)}
            <div><Label>Próximo control</Label><Input type="datetime-local" value={evolution.next_control} onChange={(e) => setEvolution({...evolution,next_control:e.target.value})} className="mt-1 bg-white/5 border-white/10" /></div>
            <Button className="w-full"><Plus className="w-4 h-4 mr-2" />Registrar evolución</Button>
          </form></CardContent></Card>}
          <div className="space-y-3">{evolutions.length === 0 ? <Empty text="No hay evoluciones registradas." /> : evolutions.map((item) => <Card key={item.id} className="glass border-white/10"><CardContent className="space-y-3 p-5"><div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold text-white">{item.procedure || 'Evolución clínica'}</p><p className="text-xs font-medium text-primary">{item.professional || 'Profesional no identificado'}</p></div><span className="text-xs text-zinc-500">{new Date(item.created_at).toLocaleString()}</span></div>{item.diagnosis&&<p className="text-sm text-zinc-300"><strong>Diagnóstico:</strong> {item.diagnosis}</p>}{item.technique&&<p className="text-sm text-zinc-400"><strong>Técnica:</strong> {item.technique}</p>}<div className="grid gap-2 text-xs text-zinc-400 sm:grid-cols-2">{item.materials&&<p><strong>Materiales:</strong> {item.materials}</p>}{item.instruments&&<p><strong>Instrumental:</strong> {item.instruments}</p>}{item.anesthesia&&<p><strong>Anestesia:</strong> {item.anesthesia}</p>}{item.complications&&<p><strong>Complicaciones:</strong> {item.complications}</p>}</div>{item.observations&&<p className="text-sm text-zinc-400"><strong>Observaciones:</strong> {item.observations}</p>}{item.recommendations&&<p className="text-sm text-zinc-400"><strong>Recomendaciones:</strong> {item.recommendations}</p>}{item.teeth&&<span className="inline-block rounded bg-white/5 px-2 py-1 text-xs">Piezas: {item.teeth}</span>}</CardContent></Card>)}</div>
        </div>}

        {activeTab === 'treatments' && <div className={`grid gap-6 ${readOnlyClinical ? '' : 'lg:grid-cols-[380px_1fr]'}`}><Card className="glass col-span-full border-white/10"><CardHeader><CardTitle className="text-white">Estado financiero del plan</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-blue-500/10 p-4"><p className="text-xs text-zinc-500">Valor total</p><p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">{money(treatmentTotal)}</p></div><div className="rounded-xl bg-emerald-500/10 p-4"><p className="text-xs text-zinc-500">Pagado</p><p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">{money(treatmentPaid)}</p></div><div className="rounded-xl bg-amber-500/10 p-4"><p className="text-xs text-zinc-500">Saldo pendiente</p><p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">{money(treatmentBalance)}</p><p className="mt-1 text-xs text-zinc-500">{treatmentBalance===0&&treatmentTotal>0?'Tratamiento cancelado':'Pendiente de pago'}</p></div></CardContent></Card>
          {!readOnlyClinical && <Card className="glass border-white/10"><CardHeader><CardTitle className="text-white">Agregar tratamiento</CardTitle></CardHeader><CardContent><form onSubmit={createTreatment} className="space-y-3">
            <div><Label>Tratamiento</Label><select required value={treatment.catalog_item_id} onChange={(e) => chooseCatalogItem(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-zinc-900 px-3 text-sm text-white"><option value="">Seleccionar tratamiento</option>{catalog.filter((item)=>item.active).map((item)=><option key={item.id} value={item.id}>{item.name} · {money(item.default_amount)}</option>)}</select></div>
            <div><Label>Pieza del odontograma</Label><select value={treatment.tooth} onChange={(e) => chooseOdontogramTooth(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-zinc-900 px-3 text-sm text-white"><option value="">General / sin pieza</option>{odontogramOptions.map((item)=><option key={item.tooth} value={item.tooth}>{item.label}</option>)}</select></div>
            <div><Label>Notas</Label><Input value={treatment.notes} onChange={(e) => setTreatment({...treatment,notes:e.target.value})} className="mt-1 bg-white/5 border-white/10" /></div>
            <div><Label>Referencia del odontograma</Label><textarea rows={4} value={treatment.odontogram_reference} onChange={(e) => setTreatment({...treatment,odontogram_reference:e.target.value})} placeholder="Hallazgos relacionados con la pieza y el tratamiento" className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-3 text-sm text-white" /></div>
            <Button className="w-full"><Plus className="w-4 h-4 mr-2" />Agregar al plan</Button>
          </form></CardContent></Card>}
          <div className="space-y-3">{treatments.length === 0 ? <Empty text="No hay tratamientos propuestos." /> : treatments.map((item) => <Card key={item.id} className="glass border-white/10"><CardContent className="p-5"><div className="flex flex-wrap items-center gap-3"><div className="min-w-[220px] flex-1"><p className="font-semibold text-white">{item.name} {item.tooth && `· Pieza ${item.tooth}`}</p><p className="text-sm text-zinc-500">{item.notes}</p>{item.odontogram_reference && <p className="mt-2 text-xs text-amber-300">Odontograma: {item.odontogram_reference}</p>}</div><div className="min-w-[140px] text-right"><p className="font-bold text-white">{money(item.amount)}</p><p className="text-xs text-emerald-600 dark:text-emerald-300">Pagado: {money(item.paid_amount)}</p><p className="text-xs text-amber-600 dark:text-amber-300">Saldo: {money(item.balance_amount)}</p>{item.discount_percent>0&&<p className="text-xs text-emerald-300">{item.discount_percent}% de descuento</p>}{item.base_amount>item.amount&&<p className="text-xs text-zinc-500 line-through">{money(item.base_amount)}</p>}<span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.payment_status==='paid'?'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300':item.payment_status==='partial'?'bg-amber-500/15 text-amber-700 dark:text-amber-300':'bg-slate-500/15 text-zinc-500'}`}>{item.payment_status==='paid'?'Pagado':item.payment_status==='partial'?'Abono parcial':'Sin pagos'}</span></div>{currentUser?.role==='administrative'&&<DiscountEditor item={item} onSave={updateTreatmentDiscount}/>}<select disabled={readOnlyClinical} value={item.status} onChange={(e) => updateTreatmentStatus(item,e.target.value)} className="rounded-md bg-zinc-900 border border-white/10 p-2 text-sm text-zinc-200 disabled:opacity-60"><option value="proposed">Propuesto</option><option value="accepted">Aceptado</option><option value="in_progress">En proceso</option><option value="completed">Realizado</option><option value="rejected">Rechazado</option></select>{canRecordEvolution&&<Button type="button" variant="outline" onClick={()=>startTreatmentEvolution(item)} className="border-blue-500/30 text-blue-700 dark:text-blue-300"><FileText className="mr-2 h-4 w-4"/>Registrar evolución</Button>}</div></CardContent></Card>)}</div>
        </div>}

        {activeTab === 'prescriptions' && <div className={`grid gap-6 ${readOnlyClinical ? '' : 'lg:grid-cols-[420px_1fr]'}`}>
          {!readOnlyClinical && <Card className="glass border-white/10"><CardHeader><CardTitle className="text-white">Nueva receta</CardTitle><p className="text-sm text-zinc-500">Fórmula de medicamentos individual para el paciente.</p></CardHeader><CardContent><form onSubmit={createPrescription} className="space-y-4"><div><Label>Profesional</Label><Input required value={prescription.professional} onChange={(e)=>setPrescription({...prescription,professional:e.target.value})} className="mt-1 bg-white/5 border-white/10" /></div><div><Label>Diagnóstico / indicación</Label><Input value={prescription.diagnosis} onChange={(e)=>setPrescription({...prescription,diagnosis:e.target.value})} className="mt-1 bg-white/5 border-white/10" /></div>{prescription.medications.map((medication,index)=><div key={index} className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-white">Medicamento {index+1}</p>{prescription.medications.length>1&&<Button type="button" size="icon" variant="ghost" onClick={()=>removeMedication(index)}><Trash2 className="h-4 w-4 text-red-300"/></Button>}</div><Input required placeholder="Medicamento" value={medication.name} onChange={(e)=>updateMedication(index,'name',e.target.value)} className="bg-white/5 border-white/10"/><Input placeholder="Presentación (tabletas, suspensión...)" value={medication.presentation} onChange={(e)=>updateMedication(index,'presentation',e.target.value)} className="bg-white/5 border-white/10"/><div className="grid grid-cols-2 gap-2"><Input required placeholder="Dosis" value={medication.dose} onChange={(e)=>updateMedication(index,'dose',e.target.value)} className="bg-white/5 border-white/10"/><select value={medication.route} onChange={(e)=>updateMedication(index,'route',e.target.value)} className="h-10 rounded-md border border-white/10 bg-zinc-900 px-3 text-sm"><option>Oral</option><option>Tópica</option><option>Sublingual</option><option>Intramuscular</option></select><Input required placeholder="Frecuencia" value={medication.frequency} onChange={(e)=>updateMedication(index,'frequency',e.target.value)} className="bg-white/5 border-white/10"/><Input required placeholder="Duración" value={medication.duration} onChange={(e)=>updateMedication(index,'duration',e.target.value)} className="bg-white/5 border-white/10"/></div><Input placeholder="Indicaciones especiales" value={medication.instructions} onChange={(e)=>updateMedication(index,'instructions',e.target.value)} className="bg-white/5 border-white/10"/></div>)}<Button type="button" variant="outline" onClick={()=>setPrescription({...prescription,medications:[...prescription.medications,{...emptyMedication}]})} className="w-full border-white/10"><Plus className="mr-2 h-4 w-4"/>Agregar medicamento</Button><div><Label>Indicaciones generales</Label><textarea rows={3} value={prescription.general_instructions} onChange={(e)=>setPrescription({...prescription,general_instructions:e.target.value})} className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-3 text-sm"/></div><Button className="w-full"><Save className="mr-2 h-4 w-4"/>Guardar receta</Button></form></CardContent></Card>}
          <div className="space-y-4">{prescriptions.length===0?<Empty text="No hay recetas registradas."/>:prescriptions.map((item)=>{const medications=JSON.parse(item.medications||'[]');return <Card key={item.id} className="glass border-white/10"><CardHeader><div className="flex flex-wrap items-start justify-between gap-2"><div><CardTitle className="text-white">Fórmula médica</CardTitle><p className="text-xs text-zinc-500">{new Date(item.created_at).toLocaleString()} · {item.professional}</p></div><span className={`rounded-full px-2 py-1 text-xs ${item.status==='sent'?'bg-emerald-500/15 text-emerald-300':'bg-amber-500/15 text-amber-300'}`}>{item.status==='sent'?'Enviada':'Borrador'}</span></div></CardHeader><CardContent className="space-y-3">{item.diagnosis&&<p className="text-sm text-zinc-300"><strong>Diagnóstico:</strong> {item.diagnosis}</p>}{medications.map((medication,index)=><div key={index} className="rounded-xl border border-white/10 p-3"><p className="font-semibold text-white">{index+1}. {medication.name} {medication.presentation}</p><p className="mt-1 text-sm text-zinc-400">{medication.dose} · {medication.route} · {medication.frequency} · {medication.duration}</p>{medication.instructions&&<p className="mt-1 text-xs text-zinc-500">{medication.instructions}</p>}</div>)}{item.general_instructions&&<p className="text-sm text-zinc-400">{item.general_instructions}</p>}<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>window.print()} className="border-white/10"><Printer className="mr-2 h-4 w-4"/>Imprimir</Button>{!readOnlyClinical&&<Button onClick={()=>sendPrescription(item)}><Send className="mr-2 h-4 w-4"/>Enviar al paciente</Button>}{patient?.email&&<a href={`mailto:${patient.email}?subject=${encodeURIComponent('Fórmula médica')}&body=${encodeURIComponent(prescriptionText(item))}`}><Button variant="outline" type="button" className="border-white/10"><Mail className="mr-2 h-4 w-4"/>Correo</Button></a>}</div></CardContent></Card>})}</div>
        </div>}

        {activeTab === 'payments' && <Card className="glass border-white/10"><CardHeader><CardTitle className="text-white">Movimientos del paciente</CardTitle></CardHeader><CardContent><div className="space-y-2">{payments.length === 0 ? <Empty text="No hay pagos registrados." /> : payments.map((item) => <div key={item.id} className="flex justify-between border-b border-white/5 py-3"><div><p className="text-white">{item.concept}</p><p className="text-xs text-zinc-500">{item.method} · {new Date(item.created_at).toLocaleDateString()}</p></div><p className={item.type === 'income' ? 'text-emerald-400' : 'text-red-400'}>{money(item.amount)}</p></div>)}</div></CardContent></Card>}
      </div>
    </div>
  )
}

function Empty({ text }) { return <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-zinc-500">{text}</div> }

function DiscountEditor({ item, onSave }) {
  const [discount, setDiscount] = useState(item.discount_percent || '')
  return <div className="flex items-end gap-2"><div><Label className="text-xs">Descuento (%)</Label><Input type="number" inputMode="numeric" min="0" max="100" value={discount} onChange={(e)=>setDiscount(e.target.value.replace(/\D/g,''))} className="mt-1 w-24 bg-white/5 border-white/10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"/></div><Button size="icon" variant="outline" onClick={()=>onSave(item,discount)} className="border-white/10"><Save className="h-4 w-4"/></Button></div>
}
