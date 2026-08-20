import { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PhoneInput } from '@/components/PhoneInput'
import { PatientImaging } from '@/components/PatientImaging'
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Stethoscope,
  Pill,
  HeartPulse,
  ClipboardList,
  Search,
  FileText,
  MessageSquareText,
  Cigarette,
  Scissors,
  Phone,
  Mail,
  Pencil,
  Images,
  BookOpenCheck,
} from 'lucide-react'

const API = '/api'
const ClinicalReadOnlyContext = createContext(false)

// Tab definitions with color schemes
const TABS = [
  {
    id: 'anamnesis', label: 'Anamnesis', icon: BookOpenCheck, color: 'violet',
    gradient: 'from-violet-500/20 to-violet-600/5', ring: 'ring-violet-500/30',
    text: 'text-violet-500 dark:text-violet-300', bg: 'bg-violet-500/10', bgHover: 'hover:bg-violet-500/15', border: 'border-violet-500/30',
  },
  {
    id: 'motivo',
    label: 'Motivo de Consulta',
    icon: MessageSquareText,
    color: 'blue',
    gradient: 'from-blue-500/20 to-blue-600/5',
    ring: 'ring-blue-500/30',
    text: 'text-blue-400',
    bg: 'bg-blue-500/10',
    bgHover: 'hover:bg-blue-500/15',
    border: 'border-blue-500/20',
  },
  {
    id: 'antecedentes',
    label: 'Antecedentes Médicos',
    icon: HeartPulse,
    color: 'rose',
    gradient: 'from-rose-500/20 to-rose-600/5',
    ring: 'ring-rose-500/30',
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    bgHover: 'hover:bg-rose-500/15',
    border: 'border-rose-500/20',
  },
  {
    id: 'examen',
    label: 'Examen Clínico',
    icon: Search,
    color: 'amber',
    gradient: 'from-amber-500/20 to-amber-600/5',
    ring: 'ring-amber-500/30',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    bgHover: 'hover:bg-amber-500/15',
    border: 'border-amber-500/20',
  },
  {
    id: 'plan',
    label: 'Plan de Tratamiento',
    icon: ClipboardList,
    color: 'emerald',
    gradient: 'from-emerald-500/20 to-emerald-600/5',
    ring: 'ring-emerald-500/30',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    bgHover: 'hover:bg-emerald-500/15',
    border: 'border-emerald-500/20',
  },
  {
    id: 'imagenes',
    label: 'Imágenes diagnósticas',
    icon: Images,
    color: 'cyan',
    gradient: 'from-cyan-500/20 to-cyan-600/5',
    ring: 'ring-cyan-500/30',
    text: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    bgHover: 'hover:bg-cyan-500/15',
    border: 'border-cyan-500/20',
  },
]

const emptyForm = {
  alergias: '',
  enfermedades_sistemicas: '',
  medicamentos_actuales: '',
  antecedentes_quirurgicos: '',
  habitos: '',
  motivo_consulta: '',
  examen_intraoral: '',
  plan_tratamiento: '',
  observaciones: '',
  document_id: '', birth_date: '', address: '', occupation: '', emergency_contact: '', emergency_relationship: '', emergency_phone: '',
  blood_type: '', insurance: '', family_history: '', dental_history: '', oral_hygiene: '', vital_signs: '', diagnosis: '',
  current_illness: '', personal_history: '', pathological_history: '', pharmacological_history: '', systems_review: '',
  physical_exam: '', risk_factors: '', cups_code: '', cups_name: '', consultation_purpose: '', external_cause: '',
  diagnosis_type: '', related_diagnoses: '', diagnostic_impression: '',
}

const CONSULTATION_PURPOSES = ['Detección de alteraciones de crecimiento y desarrollo', 'Detección de alteraciones del joven', 'Detección de alteraciones del adulto', 'Detección de enfermedad profesional', 'No aplica']
const EXTERNAL_CAUSES = ['Enfermedad general', 'Enfermedad profesional', 'Accidente de trabajo', 'Accidente de tránsito', 'Accidente rábico', 'Accidente ofídico', 'Otro tipo de accidente', 'Evento catastrófico', 'Lesión por agresión', 'Lesión autoinfligida', 'Sospecha de maltrato físico', 'Sospecha de abuso sexual', 'Sospecha de violencia sexual', 'Sospecha de maltrato emocional']
const DIAGNOSIS_TYPES = ['Impresión diagnóstica', 'Confirmado nuevo', 'Confirmado repetido']

function TextArea({ label, icon: Icon, value, onChange, placeholder, rows = 4, colorClass = 'text-zinc-400' }) {
  const readOnly = useContext(ClinicalReadOnlyContext)
  return (
    <div className="space-y-2 group">
      <Label className="flex items-center gap-2 text-sm font-medium text-zinc-300 group-focus-within:text-white transition-colors">
        {Icon && <Icon className={`w-4 h-4 ${colorClass}`} />}
        {label}
      </Label>
      <textarea
        maxLength={12000}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        readOnly={readOnly}
        className="flex w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/30 focus:bg-white/[0.05] transition-all duration-300 resize-none leading-relaxed"
      />
    </div>
  )
}

export default function HistoriaClinica() {
  const { id: patientId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useOutletContext()
  const readOnly = currentUser?.role === 'administrative'

  const [patient, setPatient] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [historyId, setHistoryId] = useState(null)
  const [activeTab, setActiveTab] = useState('motivo')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editPatientOpen, setEditPatientOpen] = useState(false)
  const [savingPatient, setSavingPatient] = useState(false)
  const [patientEditError, setPatientEditError] = useState('')
  const [patientForm, setPatientForm] = useState({ first_name:'', first_surname:'', phone_country_code:'+57', phone:'', email:'', gender:'unspecified' })
  const [cupsOpen, setCupsOpen] = useState(false)
  const [cupsCategory, setCupsCategory] = useState('odontology')
  const [cupsSearch, setCupsSearch] = useState('')
  const [cupsResults, setCupsResults] = useState([])
  const [cupsTotal, setCupsTotal] = useState(0)
  const [cupsLoading, setCupsLoading] = useState(false)

  const token = localStorage.getItem('token')
  const config = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [patientRes, historyRes] = await Promise.all([
        axios.get(`${API}/patients/${patientId}`, config),
        axios.get(`${API}/patients/${patientId}/clinical-history`, config),
      ])
      setPatient(patientRes.data)
      setForm((current) => ({...current, birth_date: patientRes.data.birth_date || current.birth_date}))
      if (historyRes.data.length > 0) {
        const h = historyRes.data[0]
        setHistoryId(h.id)
        setForm({
          ...emptyForm,
          alergias: h.alergias || '',
          enfermedades_sistemicas: h.enfermedades_sistemicas || '',
          medicamentos_actuales: h.medicamentos_actuales || '',
          antecedentes_quirurgicos: h.antecedentes_quirurgicos || '',
          habitos: h.habitos || '',
          motivo_consulta: h.motivo_consulta || '',
          examen_intraoral: h.examen_intraoral || '',
          plan_tratamiento: h.plan_tratamiento || '',
          observaciones: h.observaciones || '',
          document_id: h.document_id || '', birth_date: h.birth_date || patientRes.data.birth_date || '', address: h.address || '', occupation: h.occupation || '',
          emergency_contact: h.emergency_contact || '', emergency_relationship: h.emergency_relationship || '', emergency_phone: h.emergency_phone || '', blood_type: h.blood_type || '', insurance: h.insurance || '',
          family_history: h.family_history || '', dental_history: h.dental_history || '', oral_hygiene: h.oral_hygiene || '', vital_signs: h.vital_signs || '', diagnosis: h.diagnosis || '',
          current_illness: h.current_illness || '', personal_history: h.personal_history || '', pathological_history: h.pathological_history || '', pharmacological_history: h.pharmacological_history || '',
          systems_review: h.systems_review || '', physical_exam: h.physical_exam || '', risk_factors: h.risk_factors || '', cups_code: h.cups_code || '', cups_name: h.cups_name || '',
          consultation_purpose: h.consultation_purpose || '', external_cause: h.external_cause || '', diagnosis_type: h.diagnosis_type || '', related_diagnoses: h.related_diagnoses || '', diagnostic_impression: h.diagnostic_impression || '',
        })
      }
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem('token')
        navigate('/login')
      } else {
        setError('Error al cargar datos del paciente')
      }
    } finally {
      setLoading(false)
    }
  }, [config, patientId, navigate])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!cupsOpen) return undefined
    const requestTimer = window.setTimeout(async () => {
      setCupsLoading(true)
      try {
        const { data } = await axios.get(`${API}/catalogs/cups`, { ...config, params: { search: cupsSearch, category: cupsCategory, limit: 60 } })
        setCupsResults(data.items)
        setCupsTotal(data.total)
      } catch {
        setCupsResults([])
      } finally {
        setCupsLoading(false)
      }
    }, 200)
    return () => window.clearTimeout(requestTimer)
  }, [cupsOpen, cupsSearch, cupsCategory, config])

  const selectCups = (item) => {
    setForm((current) => ({ ...current, cups_code: item.code, cups_name: item.name }))
    setSaved(false)
    setCupsOpen(false)
  }

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    setSaved(false)
  }

  const openPatientEditor = () => {
    setPatientForm({
      first_name: patient?.first_name || patient?.name || '',
      first_surname: patient?.first_surname || '',
      phone_country_code: patient?.phone_country_code || '+57',
      phone: patient?.phone || '',
      email: patient?.email || '',
      gender: patient?.gender || 'unspecified',
    })
    setPatientEditError('')
    setEditPatientOpen(true)
  }

  const savePatientData = async (event) => {
    event.preventDefault()
    setSavingPatient(true)
    setPatientEditError('')
    try {
      const { data } = await axios.put(`${API}/patients/${patientId}`, patientForm, config)
      setPatient(data)
      setEditPatientOpen(false)
    } catch (requestError) {
      setPatientEditError(requestError.response?.data?.detail || 'No fue posible actualizar los datos personales.')
    } finally {
      setSavingPatient(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      if (historyId) {
        await axios.put(`${API}/patients/${patientId}/clinical-history/${historyId}`, form, config)
      } else {
        const res = await axios.post(`${API}/patients/${patientId}/clinical-history`, form, config)
        setHistoryId(res.data.id)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Error al guardar la historia clínica')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-primary/20 animate-ping absolute inset-0" />
            <div className="w-16 h-16 rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          </div>
          <p className="text-zinc-400 text-sm animate-pulse">Cargando historia clínica...</p>
        </div>
      </div>
    )
  }

  const currentTab = TABS.find((t) => t.id === activeTab)

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[50%] left-[50%] w-[30%] h-[30%] rounded-full bg-purple-500/5 blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 glass p-5 rounded-2xl border-white/10 shadow-lg">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/historia-clinica')}
              className="h-10 w-10 rounded-xl glass border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/20 rounded-xl ring-1 ring-primary/30">
                <Stethoscope className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Historia Clínica
                </h1>
                <p className="text-zinc-400 text-sm">
                  Expediente completo del paciente
                </p>
              </div>
            </div>
          </div>

          {!readOnly && <Button
            onClick={handleSave}
            disabled={saving}
            className={`rounded-xl font-semibold px-6 transition-all duration-300 ${
              saved
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20'
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Guardado
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {historyId ? 'Actualizar' : 'Guardar'}
              </>
            )}
          </Button>}
        </header>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-xl glass border-red-500/30 bg-red-500/10 flex items-center gap-3 animate-in slide-in-from-top-2">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300 hover:bg-red-500/20 text-xs"
            >
              Cerrar
            </Button>
          </div>
        )}

        {/* Patient Info Card */}
        {patient && (
          <Card className="glass border-white/10 shadow-lg mb-6 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-blue-500/5 pointer-events-none" />
            <CardContent className="pt-5 pb-5 relative">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-blue-500/30 flex items-center justify-center ring-2 ring-white/10">
                    <span className="text-lg font-bold text-white">
                      {patient.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-lg">{patient.name}</p>
                    <p className="text-zinc-500 text-xs">ID: {patient.id}</p>
                  </div>
                </div>
                {patient.phone && (
                  <div className="flex items-center gap-2 text-zinc-400 text-sm">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{patient.phone_country_code || ''} {patient.phone}</span>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center gap-2 text-zinc-400 text-sm">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{patient.email}</span>
                  </div>
                )}
                <Button type="button" variant="outline" size="sm" onClick={openPatientEditor} className="border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10">
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Editar datos personales
                </Button>
                {historyId && (
                  <div className="ml-auto flex items-center gap-2 text-emerald-400/70 text-xs bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                    <FileText className="w-3.5 h-3.5" />
                    Expediente existente
                  </div>
                )}
                {!historyId && (
                  <div className="ml-auto flex items-center gap-2 rounded-full border border-blue-300 bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-800 dark:border-blue-400/30 dark:bg-blue-500/15 dark:text-blue-200">
                    <FileText className="w-3.5 h-3.5" />
                    Nuevo expediente
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={editPatientOpen} onOpenChange={setEditPatientOpen}>
          <DialogContent className="glass border-white/10 text-white sm:max-w-lg">
            <DialogHeader><DialogTitle>Editar datos personales</DialogTitle></DialogHeader>
            <form onSubmit={savePatientData} className="space-y-4 pt-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label htmlFor="patient-first-name">Primer nombre</Label><Input id="patient-first-name" autoFocus required value={patientForm.first_name} onChange={event=>setPatientForm({...patientForm,first_name:event.target.value})} className="mt-1 bg-white/5 border-white/10" /></div>
                <div><Label htmlFor="patient-first-surname">Primer apellido</Label><Input id="patient-first-surname" value={patientForm.first_surname} onChange={event=>setPatientForm({...patientForm,first_surname:event.target.value})} className="mt-1 bg-white/5 border-white/10" /></div>
              </div>
              <div><Label>Celular</Label><div className="mt-1"><PhoneInput id="patient-phone" countryCode={patientForm.phone_country_code} phone={patientForm.phone} onCountryCodeChange={value=>setPatientForm({...patientForm,phone_country_code:value})} onPhoneChange={value=>setPatientForm({...patientForm,phone:value})} /></div></div>
              <div><Label htmlFor="patient-email">Correo electrónico</Label><Input id="patient-email" type="email" value={patientForm.email} onChange={event=>setPatientForm({...patientForm,email:event.target.value})} className="mt-1 bg-white/5 border-white/10" /></div>
              {patientEditError&&<p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{patientEditError}</p>}
              <Button disabled={savingPatient} className="w-full">{savingPatient?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Save className="mr-2 h-4 w-4"/>}{savingPatient?'Guardando...':'Guardar datos personales'}</Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={cupsOpen} onOpenChange={setCupsOpen}>
          <DialogContent className="glass max-h-[82vh] overflow-hidden border-white/10 text-white sm:max-w-4xl">
            <DialogHeader><DialogTitle>Tipos de consulta y procedimientos CUPS 2026</DialogTitle></DialogHeader>
            <div className="space-y-4 overflow-hidden">
              <Input value={cupsSearch} onChange={(event) => setCupsSearch(event.target.value)} placeholder="Buscar por código o descripción..." className="border-white/10 bg-white/5" autoFocus />
              <div className="flex gap-2 border-b border-white/10">
                <button type="button" onClick={() => setCupsCategory('odontology')} className={`px-3 py-2 text-sm font-semibold ${cupsCategory === 'odontology' ? 'border-b-2 border-primary text-primary' : 'text-zinc-400'}`}>Usados en odontología</button>
                <button type="button" onClick={() => setCupsCategory('all')} className={`px-3 py-2 text-sm font-semibold ${cupsCategory === 'all' ? 'border-b-2 border-primary text-primary' : 'text-zinc-400'}`}>Todos los CUPS</button>
              </div>
              <p className="text-xs text-zinc-400">{cupsLoading ? 'Buscando...' : `${cupsTotal.toLocaleString('es-CO')} resultados · se muestran hasta 60`}</p>
              <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-white/10">
                {cupsResults.map((item) => <button key={item.code} type="button" onClick={() => selectCups(item)} className="grid w-full grid-cols-[90px_1fr_auto] items-center gap-3 border-b border-white/10 px-4 py-3 text-left hover:bg-primary/10">
                  <span className="font-mono text-sm font-semibold text-primary">{item.code}</span>
                  <span className="text-sm text-zinc-800 dark:text-zinc-100">{item.name}</span>
                  {item.priority && <span className="rounded-full bg-violet-500/15 px-2 py-1 text-[10px] font-bold text-violet-700 dark:text-violet-300">FRECUENTE</span>}
                </button>)}
                {!cupsLoading && cupsResults.length === 0 && <p className="p-8 text-center text-sm text-zinc-400">No se encontraron códigos con ese criterio.</p>}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Card className="glass border-white/10 shadow-lg mb-6"><CardContent className="space-y-5 pt-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{[
            ['document_id','Documento','text'],['birth_date','Fecha de nacimiento','date'],['blood_type','Grupo sanguíneo','text'],['occupation','Ocupación','text'],
            ['address','Dirección','text'],['insurance','EPS / aseguradora','text'],['emergency_contact','Contacto de emergencia','text'],['emergency_relationship','Parentesco','text'],['emergency_phone','Teléfono de emergencia','tel'],
          ].map(([key,label,type])=><div key={key}><Label>{label}</Label><input type={type} readOnly={readOnly} value={form[key]} onChange={handleChange(key)} className="mt-1 flex h-10 w-full rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm text-white read-only:opacity-70" /></div>)}</div>
          <ClinicalReadOnlyContext.Provider value={readOnly}><div className="grid md:grid-cols-2 gap-4"><TextArea label="Antecedentes familiares" value={form.family_history} onChange={handleChange('family_history')} placeholder="Diabetes, hipertensión, cardiopatías, enfermedades hereditarias..." rows={3} /><TextArea label="Antecedentes odontológicos" value={form.dental_history} onChange={handleChange('dental_history')} placeholder="Experiencias previas, tratamientos, anestesia, sangrado..." rows={3} /><TextArea label="Hábitos de higiene oral" value={form.oral_hygiene} onChange={handleChange('oral_hygiene')} placeholder="Frecuencia de cepillado, seda dental, enjuague..." rows={3} /><TextArea label="Signos vitales" value={form.vital_signs} onChange={handleChange('vital_signs')} placeholder="Presión arterial, frecuencia cardíaca, temperatura..." rows={3} /><div className="md:col-span-2"><TextArea label="Diagnóstico integral" value={form.diagnosis} onChange={handleChange('diagnosis')} placeholder="Diagnóstico clínico sustentado en examen e información del odontograma..." rows={4} /></div></div></ClinicalReadOnlyContext.Provider>
        </CardContent></Card>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 border ${
                  isActive
                    ? `glass ${tab.border} ${tab.text} shadow-lg`
                    : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? tab.bg : ''}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>

        {readOnly && <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">Modo de consulta: el personal administrativo puede visualizar este expediente, pero no modificarlo.</div>}
        {/* Tab Content */}
        <ClinicalReadOnlyContext.Provider value={readOnly}><div className="space-y-6">
          {activeTab === 'anamnesis' && (
            <div className="space-y-6">
              <Card className="glass overflow-hidden border-white/10 shadow-lg">
                <div className={`absolute inset-0 bg-gradient-to-br ${currentTab.gradient} pointer-events-none`} />
                <CardHeader className="relative"><CardTitle className="flex items-center gap-3 text-lg text-white"><div className={`rounded-lg p-2 ${currentTab.bg}`}><BookOpenCheck className={`h-5 w-5 ${currentTab.text}`} /></div>Anamnesis</CardTitle><p className="ml-12 text-sm text-zinc-500">Interrogatorio clínico y antecedentes relevantes del paciente</p></CardHeader>
                <CardContent className="relative grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2"><TextArea label="Enfermedad actual" value={form.current_illness} onChange={handleChange('current_illness')} placeholder="Evolución, inicio, intensidad, síntomas asociados y tratamientos previos..." rows={4} /></div>
                  <TextArea label="Antecedentes personales" value={form.personal_history} onChange={handleChange('personal_history')} placeholder="Antecedentes personales relevantes..." rows={4} />
                  <TextArea label="Antecedentes familiares" value={form.family_history} onChange={handleChange('family_history')} placeholder="Antecedentes familiares relevantes..." rows={4} />
                  <TextArea label="Antecedentes patológicos" value={form.pathological_history} onChange={handleChange('pathological_history')} placeholder="Enfermedades previas y condiciones crónicas..." rows={4} />
                  <TextArea label="Antecedentes farmacológicos" value={form.pharmacological_history} onChange={handleChange('pharmacological_history')} placeholder="Medicamentos actuales o anteriores..." rows={4} />
                  <TextArea label="Revisión por sistemas" value={form.systems_review} onChange={handleChange('systems_review')} placeholder="Hallazgos organizados por sistemas..." rows={4} />
                  <TextArea label="Factores de riesgo" value={form.risk_factors} onChange={handleChange('risk_factors')} placeholder="Tipo de riesgo y descripción: químicos, físicos, biomecánicos, psicosociales o biológicos..." rows={4} />
                  <div className="md:col-span-2"><TextArea label="Examen físico" value={form.physical_exam} onChange={handleChange('physical_exam')} placeholder="Hallazgos del examen físico..." rows={5} /></div>
                </CardContent>
              </Card>

              <Card className="glass border-white/10 shadow-lg">
                <CardHeader><CardTitle className="text-lg text-white">Información RIPS</CardTitle><p className="text-sm text-zinc-500">Código CUPS oficial y datos asociados a la consulta</p></CardHeader>
                <CardContent className="space-y-5">
                  <div><Label>Tipo de consulta o procedimiento CUPS</Label><div className="mt-1 flex gap-2"><Input readOnly value={form.cups_code ? `${form.cups_code} · ${form.cups_name}` : ''} placeholder="Selecciona un código CUPS..." className="border-white/10 bg-white/5" /><Button type="button" variant="outline" disabled={readOnly} onClick={() => setCupsOpen(true)} className="shrink-0 border-violet-500/30 text-violet-700 dark:text-violet-200"><Search className="mr-2 h-4 w-4" />Buscar CUPS</Button></div></div>
                  <div className="grid gap-4 md:grid-cols-3">
                    {[['consultation_purpose','Finalidad de consulta',CONSULTATION_PURPOSES],['external_cause','Causa externa',EXTERNAL_CAUSES],['diagnosis_type','Tipo de diagnóstico',DIAGNOSIS_TYPES]].map(([field,label,options]) => <div key={field}><Label>{label}</Label><select disabled={readOnly} value={form[field]} onChange={handleChange(field)} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-background px-3 text-sm text-foreground"><option value="">Seleccione...</option>{options.map(option => <option key={option} value={option}>{option}</option>)}</select></div>)}
                  </div>
                  <div className="grid gap-5 md:grid-cols-2"><TextArea label="Diagnósticos relacionados" value={form.related_diagnoses} onChange={handleChange('related_diagnoses')} placeholder="Códigos y descripciones de diagnósticos relacionados..." rows={4} /><TextArea label="Impresión diagnóstica" value={form.diagnostic_impression} onChange={handleChange('diagnostic_impression')} placeholder="Impresión clínica sustentada en la valoración..." rows={4} /></div>
                  <p className="text-xs text-zinc-500">Catálogo CUPS 2026: 13.640 registros, Resolución 2706 de 2025. Los diagnósticos CIE-10 se integrarán desde su catálogo oficial correspondiente.</p>
                </CardContent>
              </Card>
            </div>
          )}
          {/* Motivo de Consulta */}
          {activeTab === 'motivo' && (
            <Card className={`glass border-white/10 shadow-lg overflow-hidden`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${currentTab.gradient} pointer-events-none`} />
              <CardHeader className="relative">
                <CardTitle className="text-white text-lg flex items-center gap-3">
                  <div className={`p-2 ${currentTab.bg} rounded-lg`}>
                    <MessageSquareText className={`w-5 h-5 ${currentTab.text}`} />
                  </div>
                  Motivo de Consulta
                </CardTitle>
                <p className="text-zinc-500 text-sm mt-1 ml-12">
                  Razón principal por la que el paciente acude a consulta
                </p>
              </CardHeader>
              <CardContent className="relative space-y-6">
                <TextArea
                  label="Motivo de la Consulta"
                  icon={MessageSquareText}
                  colorClass="text-blue-400"
                  value={form.motivo_consulta}
                  onChange={handleChange('motivo_consulta')}
                  placeholder="Ej: Dolor en molar inferior derecho desde hace 3 días, sensibilidad al frío..."
                  rows={5}
                />
                <TextArea
                  label="Observaciones Generales"
                  icon={FileText}
                  colorClass="text-blue-400"
                  value={form.observaciones}
                  onChange={handleChange('observaciones')}
                  placeholder="Notas adicionales relevantes sobre la consulta actual..."
                  rows={4}
                />
              </CardContent>
            </Card>
          )}

          {/* Antecedentes Médicos */}
          {activeTab === 'antecedentes' && (
            <div className="space-y-6">
              <Card className="glass border-white/10 shadow-lg overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${currentTab.gradient} pointer-events-none`} />
                <CardHeader className="relative">
                  <CardTitle className="text-white text-lg flex items-center gap-3">
                    <div className={`p-2 ${currentTab.bg} rounded-lg`}>
                      <HeartPulse className={`w-5 h-5 ${currentTab.text}`} />
                    </div>
                    Antecedentes Médicos
                  </CardTitle>
                  <p className="text-zinc-500 text-sm mt-1 ml-12">
                    Historial médico, alergias y condiciones preexistentes
                  </p>
                </CardHeader>
                <CardContent className="relative space-y-6">
                  <TextArea
                    label="Alergias"
                    icon={AlertTriangle}
                    colorClass="text-rose-400"
                    value={form.alergias}
                    onChange={handleChange('alergias')}
                    placeholder="Ej: Penicilina, Látex, Lidocaína, Ninguna conocida..."
                    rows={3}
                  />
                  <TextArea
                    label="Enfermedades Sistémicas"
                    icon={HeartPulse}
                    colorClass="text-rose-400"
                    value={form.enfermedades_sistemicas}
                    onChange={handleChange('enfermedades_sistemicas')}
                    placeholder="Ej: Diabetes Tipo II, Hipertensión arterial, Asma, Cardiopatías..."
                    rows={3}
                  />
                  <TextArea
                    label="Medicamentos Actuales"
                    icon={Pill}
                    colorClass="text-rose-400"
                    value={form.medicamentos_actuales}
                    onChange={handleChange('medicamentos_actuales')}
                    placeholder="Ej: Metformina 850mg c/12h, Losartán 50mg c/24h, Aspirina 100mg..."
                    rows={3}
                  />
                </CardContent>
              </Card>

              <Card className="glass border-white/10 shadow-lg overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${currentTab.gradient} pointer-events-none`} />
                <CardHeader className="relative">
                  <CardTitle className="text-white text-lg flex items-center gap-3">
                    <div className={`p-2 ${currentTab.bg} rounded-lg`}>
                      <Scissors className={`w-5 h-5 ${currentTab.text}`} />
                    </div>
                    Antecedentes Quirúrgicos y Hábitos
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative space-y-6">
                  <TextArea
                    label="Antecedentes Quirúrgicos"
                    icon={Scissors}
                    colorClass="text-rose-400"
                    value={form.antecedentes_quirurgicos}
                    onChange={handleChange('antecedentes_quirurgicos')}
                    placeholder="Ej: Extracción de terceros molares (2020), Amigdalectomía (2015)..."
                    rows={3}
                  />
                  <TextArea
                    label="Hábitos"
                    icon={Cigarette}
                    colorClass="text-rose-400"
                    value={form.habitos}
                    onChange={handleChange('habitos')}
                    placeholder="Ej: Fumador (10 cigarrillos/día), Bruxismo nocturno, Onicofagia, Consumo de alcohol ocasional..."
                    rows={3}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Examen Clínico */}
          {activeTab === 'examen' && (
            <Card className="glass border-white/10 shadow-lg overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${currentTab.gradient} pointer-events-none`} />
              <CardHeader className="relative">
                <CardTitle className="text-white text-lg flex items-center gap-3">
                  <div className={`p-2 ${currentTab.bg} rounded-lg`}>
                    <Search className={`w-5 h-5 ${currentTab.text}`} />
                  </div>
                  Examen Clínico Intraoral
                </CardTitle>
                <p className="text-zinc-500 text-sm mt-1 ml-12">
                  Hallazgos del examen físico de la cavidad oral
                </p>
              </CardHeader>
              <CardContent className="relative space-y-6">
                <TextArea
                  label="Examen Intraoral"
                  icon={Search}
                  colorClass="text-amber-400"
                  value={form.examen_intraoral}
                  onChange={handleChange('examen_intraoral')}
                  placeholder="Describa hallazgos del examen: estado de tejidos blandos, mucosas, encías, lengua, piso de boca, paladar, estado de piezas dentales, caries, restauraciones, ausencias, movilidad dental, oclusión, ATM..."
                  rows={10}
                />
              </CardContent>
            </Card>
          )}

          {/* Plan de Tratamiento */}
          {activeTab === 'plan' && (
            <Card className="glass border-white/10 shadow-lg overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br ${currentTab.gradient} pointer-events-none`} />
              <CardHeader className="relative">
                <CardTitle className="text-white text-lg flex items-center gap-3">
                  <div className={`p-2 ${currentTab.bg} rounded-lg`}>
                    <ClipboardList className={`w-5 h-5 ${currentTab.text}`} />
                  </div>
                  Plan de Tratamiento
                </CardTitle>
                <p className="text-zinc-500 text-sm mt-1 ml-12">
                  Tratamientos propuestos y seguimiento del paciente
                </p>
              </CardHeader>
              <CardContent className="relative space-y-6">
                <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => navigate(`/pacientes/${patientId}?tab=treatments`)} className="border-emerald-500/30 text-emerald-300"><ClipboardList className="w-4 h-4 mr-2" />Abrir plan estructurado, costos y odontograma</Button>{['dentist','specialist'].includes(currentUser?.role)&&<Button type="button" variant="outline" onClick={() => navigate(`/pacientes/${patientId}?tab=evolutions`)} className="border-blue-500/30 text-blue-300"><FileText className="mr-2 h-4 w-4"/>Registrar evolución clínica</Button>}</div>
                <TextArea
                  label="Plan de Tratamiento"
                  icon={ClipboardList}
                  colorClass="text-emerald-400"
                  value={form.plan_tratamiento}
                  onChange={handleChange('plan_tratamiento')}
                  placeholder="Detalle el plan de tratamiento propuesto:&#10;&#10;1. Fase de urgencia: ...&#10;2. Fase higiénica: Profilaxis, raspado y alisado radicular...&#10;3. Fase correctiva: Restauraciones, endodoncias, prótesis...&#10;4. Fase de mantenimiento: Citas de control cada 6 meses..."
                  rows={12}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'imagenes' && (
            <PatientImaging patientId={patientId} readOnly={readOnly} />
          )}
        </div></ClinicalReadOnlyContext.Provider>

        {/* Bottom Save Bar (mobile-friendly) */}
        <div className="mt-8 glass rounded-2xl border-white/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {historyId ? (
              <span>Expediente guardado — los cambios se guardarán al presionar el botón</span>
            ) : (
              <span>Nuevo expediente — complete los campos y guarde cuando esté listo</span>
            )}
          </div>
          {!readOnly && <Button
            onClick={handleSave}
            disabled={saving}
            className={`rounded-xl font-semibold px-8 transition-all duration-300 w-full sm:w-auto ${
              saved
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20'
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Cambios guardados
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {historyId ? 'Actualizar Historia Clínica' : 'Guardar Historia Clínica'}
              </>
            )}
          </Button>}
        </div>
      </div>
    </div>
  )
}
