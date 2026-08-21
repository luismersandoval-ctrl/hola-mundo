import { useState } from 'react'
import { Building2, HeartPulse, Loader2, MapPin, Save, UserRound, UsersRound } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/PhoneInput'
import { INPUT_LIMITS, normalizeDocument, normalizeName } from '@/lib/validation'
import { DOCUMENT_TYPES } from '@/lib/patientOptions'

const initialForm = {
  first_name:'', second_name:'', first_surname:'', second_surname:'', document_type:'CC', document_number:'',
  birth_date:'', gender:'unspecified', blood_type:'', marital_status:'', birth_place:'', origin_country:'Colombia',
  ethnicity:'', education_level:'', phone_country_code:'+57', phone:'', landline:'', email:'', residence_country:'Colombia',
  state:'', city:'', residential_zone:'', address:'', neighborhood:'', occupation:'', occupation_code:'',
  insurer_type:'', insurer_name:'', affiliation_type:'', coverage:'', companion_name:'', companion_phone:'',
  companion_email:'', responsible_name:'', responsible_phone:'', responsible_relationship:'',
}

const genders = [['female','Femenino'],['male','Masculino'],['other','Otro'],['unspecified','Prefiere no indicar']]
const bloodTypes = ['O+','O-','A+','A-','B+','B-','AB+','AB-']

function Field({ label, required=false, children }) {
  return <div><Label>{label}{required&&<span className="ml-1 text-red-400">*</span>}</Label>{children}</div>
}

function SelectField({ label, value, onChange, options, required=false, placeholder='Seleccionar...' }) {
  return <Field label={label} required={required}><select required={required} value={value} onChange={onChange} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-zinc-900 px-3 text-sm"><option value="">{placeholder}</option>{options.map(option=>{const [key,text]=Array.isArray(option)?option:[option,option];return <option key={key} value={key}>{text}</option>})}</select></Field>
}

function Section({ icon:Icon, title, children }) {
  return <section className="rounded-xl border border-white/10 bg-white/[0.02]"><div className="flex items-center gap-2 border-b border-white/10 px-4 py-3"><span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="h-4 w-4"/></span><h3 className="font-semibold text-white">{title}</h3></div><div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div></section>
}

export function CompletePatientDialog({ open, onOpenChange, onCreated }) {
  const [form,setForm]=useState(initialForm)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const change=(field)=>(event)=>setForm({...form,[field]:event.target.value})
  const input=(field,label,required=false,type='text')=>{const isName=field.includes('name')||field.includes('surname');const isDocument=field==='document_number';return <Field label={label} required={required}><Input type={type} required={required} max={type==='date'?new Date().toISOString().slice(0,10):undefined} maxLength={isName?INPUT_LIMITS.name:isDocument?INPUT_LIMITS.document:type==='email'?INPUT_LIMITS.email:INPUT_LIMITS.shortText} value={form[field]} onChange={event=>{const value=isName?normalizeName(event.target.value):isDocument?normalizeDocument(event.target.value):event.target.value;setForm({...form,[field]:value})}} className="mt-1 bg-white/5 border-white/10"/></Field>}

  const submit=async(event)=>{
    event.preventDefault();setSaving(true);setError('')
    try{const {data}=await api.post('/patients/',form);setForm(initialForm);onOpenChange(false);onCreated(data)}
    catch(requestError){setError(requestError.response?.data?.detail||'No fue posible registrar el paciente.')}
    finally{setSaving(false)}
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="glass top-3 bottom-3 max-h-none translate-y-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden border-white/10 p-0 text-white sm:max-w-5xl"><DialogHeader className="border-b border-white/10 bg-zinc-950/95 px-5 py-4 pr-12"><DialogTitle>Registro completo de paciente</DialogTitle><p className="text-sm text-zinc-400">Información administrativa y demográfica para abrir la historia clínica.</p></DialogHeader><form onSubmit={submit} className="min-h-0 space-y-4 overflow-y-auto px-5 pb-6 pt-4">
    <Section icon={UserRound} title="Identificación">
      {input('first_name','Primer nombre',true)}{input('second_name','Segundo nombre')}{input('first_surname','Primer apellido',true)}{input('second_surname','Segundo apellido')}
      <SelectField label="Tipo de documento" required value={form.document_type} onChange={change('document_type')} options={DOCUMENT_TYPES}/>{input('document_number','Número de documento',true)}
    </Section>
    <Section icon={HeartPulse} title="Datos personales">
      {input('birth_date','Fecha de nacimiento',true,'date')}<SelectField label="Género" required value={form.gender} onChange={change('gender')} options={genders}/><SelectField label="Grupo sanguíneo" value={form.blood_type} onChange={change('blood_type')} options={bloodTypes}/>
      <SelectField label="Estado civil" value={form.marital_status} onChange={change('marital_status')} options={['Soltero(a)','Casado(a)','Unión libre','Separado(a)','Divorciado(a)','Viudo(a)']}/>{input('birth_place','Lugar de nacimiento')}{input('origin_country','País de origen')}
      <SelectField label="Pertenencia étnica" value={form.ethnicity} onChange={change('ethnicity')} options={['Indígena','Negro(a), Mulato(a), Afrocolombiano(a)','Raizal','Palenquero','ROM (gitano)','Ninguna de las anteriores']}/><SelectField label="Nivel de escolaridad" value={form.education_level} onChange={change('education_level')} options={['Ninguno','Preescolar','Primaria','Secundaria','Técnica profesional','Tecnológica','Profesional','Posgrado']}/>
    </Section>
    <Section icon={MapPin} title="Contacto y ubicación">
      <Field label="Celular / WhatsApp" required><div className="mt-1"><PhoneInput countryCode={form.phone_country_code} phone={form.phone} onCountryCodeChange={value=>setForm({...form,phone_country_code:value})} onPhoneChange={value=>setForm({...form,phone:value})}/></div></Field>{input('landline','Teléfono fijo','', 'tel')}{input('email','Correo electrónico',false,'email')}
      {input('residence_country','País de residencia',true)}{input('state','Departamento / Provincia')}{input('city','Ciudad / Municipio')}
      <SelectField label="Zona residencial" value={form.residential_zone} onChange={change('residential_zone')} options={['Urbana','Rural']}/>{input('address','Dirección',true)}{input('neighborhood','Barrio / Localidad')}
    </Section>
    <Section icon={Building2} title="Ocupación y aseguramiento">
      {input('occupation','Ocupación')}{input('occupation_code','Código de ocupación')}<SelectField label="Tipo de aseguradora" value={form.insurer_type} onChange={change('insurer_type')} options={['EPS','Sisbén','Prepagada','Particular','Otra','Ninguna']}/>
      {input('insurer_name','Nombre de la aseguradora')}<SelectField label="Tipo de vínculo" value={form.affiliation_type} onChange={change('affiliation_type')} options={['Contributivo cotizante','Contributivo beneficiario','Subsidiado','Particular','Sin régimen','Especial o excepción']}/>{input('coverage','Cobertura')}
    </Section>
    <Section icon={UsersRound} title="Acompañante y responsable">
      {input('companion_name','Nombre del acompañante')}{input('companion_phone','Teléfono del acompañante','', 'tel')}{input('companion_email','Correo del acompañante',false,'email')}
      {input('responsible_name','Nombre del responsable')}{input('responsible_phone','Teléfono del responsable','', 'tel')}{input('responsible_relationship','Parentesco')}
    </Section>
    {error&&<p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
    <div className="sticky bottom-0 flex justify-end gap-2 border-t border-white/10 bg-background/95 py-4"><Button type="button" variant="outline" onClick={()=>onOpenChange(false)} className="border-white/10">Cancelar</Button><Button disabled={saving}>{saving?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Save className="mr-2 h-4 w-4"/>}{saving?'Registrando...':'Registrar y abrir historia'}</Button></div>
  </form></DialogContent></Dialog>
}
