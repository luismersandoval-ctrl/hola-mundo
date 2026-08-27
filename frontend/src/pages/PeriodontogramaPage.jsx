import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Save, Waves } from 'lucide-react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import incisorImage from '@/assets/dental/incisor.png'
import canineImage from '@/assets/dental/canine.png'
import premolarOneImage from '@/assets/dental/premolar-one-root.png'
import premolarTwoImage from '@/assets/dental/premolar-two-roots.png'
import molarTwoImage from '@/assets/dental/molar-two-roots.png'
import molarThreeImage from '@/assets/dental/molar-three-roots.png'

const UPPER=[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28]
const LOWER=[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38]
const SIDES=['vestibular']
const TOOTH_WIDTH=104
const rootCount=(tooth)=>[18,17,16,26,27,28].includes(tooth)?3:[48,47,46,36,37,38,14,24].includes(tooth)?2:1
const emptySide=()=>({bone:[0,0,0],gingiva:[0,0,0],gingival_width:[0,0,0],bleeding:[false,false,false],suppuration:[false,false,false],plaque:[false,false,false]})
const normalizeSide=(saved={})=>{const side={...emptySide(),...saved};delete side.probing;side.gingiva=[0,1,2].map(i=>Math.max(0,Number(side.gingiva?.[i])||0));side.bone=[0,1,2].map(i=>Math.max(side.gingiva[i],Number(side.bone?.[i])||0));return side}
const initialData=()=>Object.fromEntries([...UPPER,...LOWER].map(tooth=>[tooth,{absent:false,implant:false,mobility:0,furcation:0,prognosis:'good',vestibular:emptySide()}]))

function Measurement({value,onChange,color}){return <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength="2" value={value} onChange={e=>onChange(Math.max(0,Math.min(15,Number(e.target.value.replace(/\D/g,''))||0)))} className={`h-6 w-full min-w-0 rounded-sm border bg-white p-0 text-center text-[9px] font-semibold leading-6 text-zinc-900 outline-none focus:ring-1 ${color}`} />}

function ToothAnatomy({tooth,isUpper,chart=false}){
  const unit=tooth%10,roots=rootCount(tooth),source=unit<=2?incisorImage:unit===3?canineImage:unit<=5?(roots===2?premolarTwoImage:premolarOneImage):(roots===3?molarThreeImage:molarTwoImage)
  return <img src={source} alt={`Pieza ${tooth}`} className={`mx-auto w-full object-contain ${chart?'h-28 max-w-[72px]':'h-16 max-w-[54px]'} ${isUpper?'rotate-180':''}`} />
}

function PeriodontalChart({teeth,data,side,isUpper}){
  const width=teeth.length*TOOTH_WIDTH,height=160,baseline=isUpper?103:72,millimeter=7,direction=isUpper?-1:1
  const points=(field)=>teeth.flatMap((tooth,toothIndex)=>data[tooth][side][field].map((value,index)=>`${toothIndex*TOOTH_WIDTH+26+index*26},${baseline+direction*value*millimeter}`)).join(' ')
  return <div className="relative h-[160px] bg-white"><div className="pointer-events-none absolute inset-x-0 top-5 bottom-1 flex opacity-40">{teeth.map(tooth=><div key={tooth} className="flex min-w-0 flex-1 items-center justify-center"><ToothAnatomy tooth={tooth} isUpper={isUpper} chart/></div>)}</div><svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="relative z-[1] block w-full">
    {Array.from({length:31},(_,i)=>{const mm=i-15,y=baseline+mm*millimeter;return <line key={mm} x1="0" x2={width} y1={y} y2={y} stroke="#cbd5e1" strokeWidth="1" />})}
    {Array.from({length:11},(_,mm)=>{const y=baseline+direction*mm*millimeter;return <text key={`mm-${mm}`} x="3" y={y-1} fontSize="6" fill="#475569">{mm} mm</text>})}
    {teeth.map((tooth,index)=><g key={tooth}><line x1={index*TOOTH_WIDTH} x2={index*TOOTH_WIDTH} y1="0" y2={height} stroke="#d1d5db"/><text x={index*TOOTH_WIDTH+TOOTH_WIDTH/2} y="16" textAnchor="middle" fontSize="10" fontWeight="700" fill="#2563eb">{tooth}</text></g>)}
    <polyline points={points('bone')} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round" />
    <polyline points={points('gingiva')} fill="none" stroke="#ef4444" strokeWidth="3" strokeLinejoin="round" />
    {teeth.flatMap((tooth,toothIndex)=>data[tooth][side].bleeding.map((bleeding,index)=>bleeding?<circle key={`${tooth}-${index}`} cx={toothIndex*TOOTH_WIDTH+26+index*26} cy={baseline-9} r="4" fill="#dc2626"/>:null))}
  </svg></div>
}

function Arch({title,teeth,data,setValue,readOnly}){
  const isUpper=title==='Superior'
  return <section className="rounded-xl border border-zinc-200 bg-white text-zinc-900 overflow-hidden">
    <div className="border-b border-blue-200 bg-blue-50 px-4 py-2 text-center text-xs font-bold uppercase tracking-wider text-blue-700">{title}</div>
    {SIDES.map(side=><div key={side} className="border-b border-zinc-200 last:border-0">
      <div className="sticky left-0 z-10 border-b border-zinc-200 bg-zinc-50 px-3 py-1 text-[10px] font-bold uppercase text-blue-600">Vestibular</div>
      <div className="overflow-x-auto pb-3 [scrollbar-color:#64748b_#e2e8f0]"><div className="w-full min-w-[1050px] md:min-w-0">
        <div className="flex">{teeth.map(tooth=><div key={tooth} className={`min-w-0 flex-1 border-r border-zinc-200 px-0.5 py-1 text-center ${data[tooth].absent?'bg-zinc-100 opacity-50':''}`}>
          <p className="truncate text-[9px] font-bold text-blue-600">{tooth}</p><ToothAnatomy tooth={tooth} isUpper={isUpper}/><p className="mb-1 truncate text-[7px] text-zinc-500">{rootCount(tooth)}R</p>
          <div className="mb-1 grid grid-cols-2 gap-x-1 text-[7px] text-zinc-600"><label className="flex items-center gap-0.5"><input type="checkbox" checked={data[tooth].absent} onChange={e=>setValue(tooth,null,'absent',null,e.target.checked)} className="h-2.5 w-2.5"/>Aus.</label><label className="flex items-center gap-0.5"><input type="checkbox" checked={data[tooth].implant} onChange={e=>setValue(tooth,null,'implant',null,e.target.checked)} className="h-2.5 w-2.5"/>Impl.</label></div>
          <div className="mb-1 grid grid-cols-2 gap-0.5"><label className="text-[7px] text-zinc-500">Mov.<input type="text" inputMode="numeric" pattern="[0-3]" maxLength="1" value={data[tooth].mobility} onChange={e=>setValue(tooth,null,'mobility',null,Math.max(0,Math.min(3,Number(e.target.value.replace(/\D/g,''))||0)))} className="h-5 w-full border p-0 text-center text-[8px] leading-5"/></label><label className="text-[7px] text-zinc-500">Furca<input type="text" inputMode="numeric" pattern="[0-3]" maxLength="1" value={data[tooth].furcation} onChange={e=>setValue(tooth,null,'furcation',null,Math.max(0,Math.min(3,Number(e.target.value.replace(/\D/g,''))||0)))} className="h-5 w-full border p-0 text-center text-[8px] leading-5"/></label></div>
          <select value={data[tooth].prognosis} onChange={e=>setValue(tooth,null,'prognosis',null,e.target.value)} title="Pronóstico" className="mb-1 h-5 w-full border bg-white px-0 text-[7px] text-zinc-700"><option value="good">Bueno</option><option value="guarded">Reservado</option><option value="poor">Malo</option></select>
          <p className="text-[7px] font-semibold uppercase text-blue-600">Hueso</p><div className="mb-1 grid grid-cols-3 gap-0.5 px-0.5">{data[tooth][side].bone.map((v,i)=><Measurement key={i} value={v} color="border-blue-300 focus:ring-blue-200" onChange={value=>setValue(tooth,side,'bone',i,value)} />)}</div>
          <p className="text-[7px] font-semibold uppercase text-red-600">Encía</p><div className="mb-1 grid grid-cols-3 gap-0.5 px-0.5">{data[tooth][side].gingiva.map((v,i)=><Measurement key={i} value={v} color="border-red-300 focus:ring-red-200" onChange={value=>setValue(tooth,side,'gingiva',i,value)} />)}</div>
          <p className="text-[7px] font-semibold uppercase text-emerald-700">Encía adherida</p><div className="mb-1 grid grid-cols-3 gap-0.5 px-0.5">{data[tooth][side].gingival_width.map((v,i)=><Measurement key={i} value={v} color="border-emerald-300 focus:ring-emerald-200" onChange={value=>setValue(tooth,side,'gingival_width',i,value)} />)}</div>
          <p className="text-[8px] font-semibold uppercase text-red-600">Sangrado</p><div className="flex justify-center gap-1">{data[tooth][side].bleeding.map((v,i)=><input key={i} type="checkbox" checked={v} onChange={e=>setValue(tooth,side,'bleeding',i,e.target.checked)} className="h-3 w-3 accent-red-600" />)}</div>
          <p className="mt-1 text-[7px] font-semibold uppercase text-amber-700">Supuración</p><div className="flex justify-center gap-1">{data[tooth][side].suppuration.map((v,i)=><input key={i} type="checkbox" checked={v} onChange={e=>setValue(tooth,side,'suppuration',i,e.target.checked)} className="h-3 w-3 accent-amber-600" />)}</div>
          <p className="mt-1 text-[7px] font-semibold uppercase text-blue-700">Placa</p><div className="flex justify-center gap-1">{data[tooth][side].plaque.map((v,i)=><input key={i} type="checkbox" checked={v} onChange={e=>setValue(tooth,side,'plaque',i,e.target.checked)} className="h-3 w-3 accent-blue-600" />)}</div>
        </div>)}</div>
        <div className="grid grid-cols-4 border-y border-zinc-200 bg-zinc-50 px-3 py-1 text-[9px] font-semibold"><span className="text-blue-600">Azul: nivel óseo</span><span className="text-red-600">Rojo: margen gingival</span><span>R: cantidad de raíces</span><span className="text-red-600">● Sangrado</span></div>
        <PeriodontalChart teeth={teeth} data={data} side={side} isUpper={isUpper}/>
      </div></div>
      {readOnly&&<div className="absolute inset-0" />}
    </div>)}
  </section>
}

export default function PeriodontogramaPage(){
  const {id}=useParams(),navigate=useNavigate(),{currentUser}=useOutletContext(),readOnly=currentUser?.role==='administrative'
  const [patient,setPatient]=useState(null),[data,setData]=useState(initialData),[notes,setNotes]=useState(''),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState('')
  useEffect(()=>{Promise.all([api.get(`/patients/${id}`),api.get(`/patients/${id}/periodontograma`).catch(e=>e.response?.status===404?{data:null}:Promise.reject(e))]).then(([p,r])=>{setPatient(p.data);if(r.data){const stored=JSON.parse(r.data.data),base=initialData();Object.keys(base).forEach(tooth=>{const previous=stored[tooth]||{};base[tooth]={...base[tooth],absent:Boolean(previous.absent),implant:Boolean(previous.implant),mobility:Number(previous.mobility)||0,furcation:Number(previous.furcation)||0,prognosis:previous.prognosis||'good',vestibular:normalizeSide(previous.vestibular)}});setData(base);setNotes(r.data.notes||'')}}).catch(e=>setError(e.response?.data?.detail||'No fue posible cargar el periodontograma.')).finally(()=>setLoading(false))},[id])
  const setValue=useCallback((tooth,side,field,index,value)=>{if(readOnly)return;setSaved(false);setData(previous=>{const next=structuredClone(previous);if(side){if(field==='bone')next[tooth][side].bone[index]=Math.max(value,next[tooth][side].gingiva[index]);else if(field==='gingiva'){next[tooth][side].gingiva[index]=value;next[tooth][side].bone[index]=Math.max(next[tooth][side].bone[index],value)}else next[tooth][side][field][index]=value}else next[tooth][field]=value;return next})},[readOnly])
  const save=async()=>{setSaving(true);setError('');try{await api.post(`/patients/${id}/periodontograma`,{data:JSON.stringify(data),notes});setSaved(true)}catch(e){setError(e.response?.data?.detail||'No fue posible guardar el periodontograma.')}finally{setSaving(false)}}
  const bleedingCount=useMemo(()=>Object.values(data).reduce((sum,tooth)=>sum+SIDES.reduce((subtotal,side)=>subtotal+tooth[side].bleeding.filter(Boolean).length,0),0),[data])
  if(loading)return <div className="min-h-screen grid place-items-center text-zinc-400"><span className="flex gap-2"><Loader2 className="animate-spin"/>Cargando periodontograma...</span></div>
  return <div className="min-h-screen p-3 md:p-6"><div className="mx-auto max-w-[1500px] space-y-5">
    <header className="glass flex flex-wrap items-center gap-3 rounded-2xl border-white/10 p-4"><Button size="icon" variant="outline" onClick={()=>navigate('/periodontograma')} className="border-white/10"><ArrowLeft/></Button><span className="rounded-xl bg-blue-500/15 p-2 text-blue-400"><Waves/></span><div className="flex-1"><h1 className="text-2xl font-bold text-white">Periodontograma</h1><p className="text-sm text-zinc-400">{patient?.name} · {bleedingCount} sitios con sangrado</p></div>{!readOnly&&<Button onClick={save} disabled={saving}>{saving?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:saved?<CheckCircle2 className="mr-2 h-4 w-4"/>:<Save className="mr-2 h-4 w-4"/>}{saving?'Guardando...':saved?'Guardado':'Guardar'}</Button>}</header>
    {error&&<p className="flex gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-300"><AlertTriangle/>{error}</p>}
    <Card className="glass border-white/10"><CardHeader><CardTitle className="text-white">Registro periodontal</CardTitle><p className="text-sm text-zinc-400">Cada pieza contiene tres puntos de medición para hueso, encía y encía adherida, además de los indicadores clínicos.</p></CardHeader><CardContent className={`space-y-5 ${readOnly?'pointer-events-none':''}`}><Arch title="Superior" teeth={UPPER} data={data} setValue={setValue} readOnly={readOnly}/><Arch title="Inferior" teeth={LOWER} data={data} setValue={setValue} readOnly={readOnly}/><div><label className="text-sm font-semibold text-white">Observaciones y leyenda clínica</label><textarea maxLength={12000} rows="4" value={notes} onChange={e=>{setNotes(e.target.value);setSaved(false)}} disabled={readOnly} placeholder="Registra sangrado, supuración, movilidad, hallazgos y observaciones..." className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white"/></div></CardContent></Card>
  </div></div>
}
