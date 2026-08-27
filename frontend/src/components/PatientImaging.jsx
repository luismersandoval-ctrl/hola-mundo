import { useCallback, useEffect, useRef, useState } from 'react'
import { Download, FileImage, Loader2, Plus, ScanLine, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const studyTypes = {
  panoramic:'Panorámica', periapical:'Periapical', occlusal:'Oclusal', coronal:'Coronal',
  cephalometric:'Cefálica / cefalométrica', tomography:'Tomografía', bitewing:'Aleta de mordida', other:'Otra',
}

export function PatientImaging({ patientId, readOnly=false }) {
  const [items,setItems]=useState([])
  const [previews,setPreviews]=useState({})
  const [form,setForm]=useState({study_type:'panoramic',study_date:'',title:'',notes:'',file:null})
  const [loading,setLoading]=useState(true)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState('')
  const previewUrls=useRef([])

  const load=useCallback(async()=>{
    setLoading(true);setError('')
    try{
      const {data}=await api.get(`/patients/${patientId}/diagnostic-images`)
      setItems(data)
      const imageItems=data.filter(item=>item.content_type.startsWith('image/'))
      const loaded=await Promise.all(imageItems.map(async item=>{const response=await api.get(`/diagnostic-images/${item.id}/file`,{responseType:'blob'});return [item.id,URL.createObjectURL(response.data)]}))
      previewUrls.current.forEach(url=>URL.revokeObjectURL(url))
      previewUrls.current=loaded.map(([,url])=>url)
      setPreviews(Object.fromEntries(loaded))
    }catch(requestError){setError(requestError.response?.data?.detail||'No fue posible cargar las imágenes diagnósticas.')}
    finally{setLoading(false)}
  },[patientId])

  useEffect(()=>{
    // La carga remota debe repetirse cuando cambia el paciente mostrado.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    return()=>previewUrls.current.forEach(url=>URL.revokeObjectURL(url))
  },[load])

  const upload=async(event)=>{
    event.preventDefault();if(!form.file)return
    setSaving(true);setError('')
    try{
      const payload=new FormData()
      Object.entries(form).forEach(([key,value])=>{if(value!==null)payload.append(key,value)})
      await api.post(`/patients/${patientId}/diagnostic-images`,payload)
      setForm({study_type:'panoramic',study_date:'',title:'',notes:'',file:null})
      event.currentTarget.reset()
      await load()
    }catch(requestError){setError(requestError.response?.data?.detail||'No fue posible guardar la imagen diagnóstica.')}
    finally{setSaving(false)}
  }

  const download=async(item)=>{const response=await api.get(`/diagnostic-images/${item.id}/file`,{responseType:'blob'});const url=URL.createObjectURL(response.data);const anchor=document.createElement('a');anchor.href=url;anchor.download=item.original_filename;anchor.click();URL.revokeObjectURL(url)}
  const remove=async(item)=>{if(!window.confirm(`¿Eliminar ${item.title||item.original_filename}? Esta acción no se puede deshacer.`))return;await api.delete(`/diagnostic-images/${item.id}`);load()}

  return <div className={`grid gap-6 ${readOnly?'':'lg:grid-cols-[360px_1fr]'}`}>
    {!readOnly&&<Card className="glass h-fit border-white/10"><CardHeader><CardTitle className="flex items-center gap-2 text-white"><ScanLine className="h-5 w-5 text-primary"/>Agregar imagen diagnóstica</CardTitle><p className="text-sm text-zinc-500">JPG, PNG, WebP, PDF o DICOM. Máximo 25 MB por archivo.</p></CardHeader><CardContent><form onSubmit={upload} className="space-y-3"><div><Label>Tipo de estudio</Label><select required value={form.study_type} onChange={event=>setForm({...form,study_type:event.target.value})} className="mt-1 h-10 w-full rounded-md border border-white/10 bg-zinc-900 px-3 text-sm">{Object.entries(studyTypes).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div><div><Label>Fecha del estudio</Label><Input type="date" value={form.study_date} onChange={event=>setForm({...form,study_date:event.target.value})} className="mt-1 bg-white/5 border-white/10"/></div><div><Label>Título</Label><Input value={form.title} onChange={event=>setForm({...form,title:event.target.value})} placeholder="Ej. Panorámica inicial" className="mt-1 bg-white/5 border-white/10"/></div><div><Label>Notas clínicas</Label><textarea rows={3} value={form.notes} onChange={event=>setForm({...form,notes:event.target.value})} className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-3 text-sm"/></div><div><Label>Archivo</Label><Input required type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.dcm,image/jpeg,image/png,image/webp,application/pdf,application/dicom" onChange={event=>setForm({...form,file:event.target.files?.[0]||null})} className="mt-1 bg-white/5 border-white/10 file:text-foreground"/></div>{error&&<p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}<Button disabled={saving||!form.file} className="w-full">{saving?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Plus className="mr-2 h-4 w-4"/>}{saving?'Cargando...':'Agregar al expediente'}</Button></form></CardContent></Card>}
    <div className="space-y-3">{loading?<div className="flex justify-center py-12 text-zinc-500"><Loader2 className="mr-2 h-5 w-5 animate-spin"/>Cargando estudios...</div>:items.length===0?<div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-zinc-500"><FileImage className="mx-auto mb-3 h-8 w-8"/>No hay imágenes diagnósticas registradas.</div>:<div className="grid gap-4 sm:grid-cols-2">{items.map(item=><Card key={item.id} className="glass overflow-hidden border-white/10">{previews[item.id]?<img src={previews[item.id]} alt={item.title||studyTypes[item.study_type]} className="h-48 w-full bg-black/10 object-contain"/>:<div className="grid h-48 place-items-center bg-white/[0.03]"><FileImage className="h-12 w-12 text-primary"/></div>}<CardContent className="space-y-2 p-4"><div><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">{studyTypes[item.study_type]||item.study_type}</span><h3 className="mt-2 font-semibold text-white">{item.title||item.original_filename}</h3><p className="text-xs text-zinc-500">{item.study_date||new Date(item.created_at).toLocaleDateString()} · {Math.max(item.size_bytes/1024/1024,.01).toFixed(2)} MB</p></div>{item.notes&&<p className="text-sm text-zinc-400">{item.notes}</p>}<p className="text-[10px] text-zinc-500">Cargado por {item.uploaded_by||'Profesional'}</p><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={()=>download(item)} className="border-white/10"><Download className="mr-2 h-4 w-4"/>Descargar</Button>{!readOnly&&<Button type="button" size="sm" variant="outline" onClick={()=>remove(item)} className="border-red-500/20 text-red-400"><Trash2 className="mr-2 h-4 w-4"/>Eliminar</Button>}</div></CardContent></Card>)}</div>}</div>
  </div>
}
