import { useMemo, useState } from 'react'
import { AlertTriangle, Bot, Check, Clipboard, FileText, ListChecks, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

const present = (value) => Boolean(String(value || '').trim())
const joinValues = (items) => items.filter(Boolean).join(' · ')

export function ClinicalAssistant({ patient, histories, evolutions, treatments, onUseDraft, readOnly }) {
  const [copied, setCopied] = useState(false)
  const latestEvolution = evolutions[0]

  const assistant = useMemo(() => {
    const latestHistory = histories[0] || {}
    const alerts = [
      present(latestHistory.alergias) && `Alergias: ${latestHistory.alergias}`,
      present(latestHistory.enfermedades_sistemicas) && `Condiciones sistémicas: ${latestHistory.enfermedades_sistemicas}`,
      present(latestHistory.medicamentos_actuales) && `Medicamentos actuales: ${latestHistory.medicamentos_actuales}`,
      present(latestHistory.antecedentes_quirurgicos) && `Antecedentes quirúrgicos: ${latestHistory.antecedentes_quirurgicos}`,
    ].filter(Boolean)

    const activeTreatments = treatments.filter((item) => !['completed', 'rejected'].includes(item.status))
    const completedTreatments = treatments.filter((item) => item.status === 'completed')
    const questions = []

    if (!present(latestHistory.alergias)) questions.push('¿Presenta alergias a medicamentos, anestésicos, látex u otros materiales?')
    if (!present(latestHistory.medicamentos_actuales)) questions.push('¿Toma actualmente medicamentos, suplementos o anticoagulantes?')
    if (!present(latestHistory.enfermedades_sistemicas)) questions.push('¿Tiene enfermedades sistémicas o condiciones médicas bajo control?')
    if (!present(latestHistory.dental_history)) questions.push('¿Ha tenido complicaciones o experiencias relevantes en tratamientos odontológicos previos?')
    if (!present(latestHistory.habitos)) questions.push('¿Fuma, consume alcohol o presenta hábitos como bruxismo u onicofagia?')
    if (!present(latestHistory.motivo_consulta)) questions.push('¿Cuál es el motivo principal de consulta y desde cuándo presenta los síntomas?')
    if (present(latestHistory.alergias)) questions.push('¿Qué reacción produce cada alergia y cuándo ocurrió por última vez?')
    if (present(latestHistory.medicamentos_actuales)) questions.push('¿Cuál es la dosis, frecuencia y prescriptor de cada medicamento actual?')

    const summary = [
      `Paciente: ${patient?.name || 'Sin identificar'}.`,
      present(latestHistory.motivo_consulta) ? `Motivo de consulta: ${latestHistory.motivo_consulta}.` : 'Motivo de consulta pendiente de registrar.',
      alerts.length ? `Antecedentes relevantes: ${alerts.join(' | ')}.` : 'No hay alertas médicas consignadas; deben confirmarse durante la anamnesis.',
      present(latestHistory.diagnosis) ? `Diagnóstico registrado por el profesional: ${latestHistory.diagnosis}.` : null,
      latestEvolution ? `Última evolución: ${joinValues([latestEvolution.procedure, latestEvolution.teeth && `piezas ${latestEvolution.teeth}`, latestEvolution.recommendations])}.` : 'Sin evoluciones clínicas registradas.',
      activeTreatments.length ? `${activeTreatments.length} tratamiento(s) pendiente(s) o en curso.` : 'Sin tratamientos activos.',
      completedTreatments.length ? `${completedTreatments.length} tratamiento(s) marcado(s) como realizado(s).` : null,
    ].filter(Boolean)

    const noteDraft = [
      `Paciente ${patient?.name || ''} asiste a consulta odontológica.`,
      present(latestHistory.motivo_consulta) ? `Refiere como motivo de consulta: ${latestHistory.motivo_consulta}.` : '[Completar motivo de consulta].',
      alerts.length ? `Se revisan antecedentes relevantes: ${alerts.join('; ')}.` : 'Se interrogan antecedentes médicos, alergias y medicación actual [completar].',
      present(latestHistory.examen_intraoral) ? `Examen intraoral previamente registrado: ${latestHistory.examen_intraoral}.` : 'Hallazgos del examen clínico: [completar].',
      'Procedimiento realizado: [completar].',
      'Indicaciones y plan de seguimiento: [completar].',
    ].join('\n\n')

    return { alerts, questions: questions.slice(0, 6), summary, noteDraft }
  }, [histories, latestEvolution, patient?.name, treatments])

  const copySummary = async () => {
    await navigator.clipboard.writeText(assistant.summary.join('\n'))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-r from-violet-500/15 to-blue-500/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-3">
            <div className="rounded-xl bg-violet-500/20 p-2.5"><Bot className="h-6 w-6 text-violet-300" /></div>
            <div><h2 className="font-semibold text-white">Asistente clínico</h2><p className="mt-1 max-w-2xl text-sm text-zinc-400">Organiza la información registrada para apoyar la consulta. No diagnostica ni reemplaza el criterio del odontólogo.</p></div>
          </div>
          <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-medium text-violet-300">Vista preliminar</span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="glass border-white/10">
          <CardHeader className="flex-row items-center justify-between gap-3"><CardTitle className="flex items-center gap-2 text-white"><Sparkles className="h-5 w-5 text-violet-300" />Resumen del expediente</CardTitle><Button type="button" size="sm" variant="outline" onClick={copySummary} className="border-white/10">{copied ? <Check className="mr-2 h-4 w-4" /> : <Clipboard className="mr-2 h-4 w-4" />}{copied ? 'Copiado' : 'Copiar'}</Button></CardHeader>
          <CardContent className="space-y-3">{assistant.summary.map((line) => <p key={line} className="text-sm leading-6 text-zinc-300">{line}</p>)}</CardContent>
        </Card>

        <Card className="glass border-white/10">
          <CardHeader><CardTitle className="flex items-center gap-2 text-white"><AlertTriangle className="h-5 w-5 text-amber-300" />Información de atención</CardTitle></CardHeader>
          <CardContent>{assistant.alerts.length ? <div className="space-y-2">{assistant.alerts.map((alert) => <p key={alert} className="rounded-lg border border-amber-500/15 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">{alert}</p>)}</div> : <p className="rounded-lg border border-dashed border-white/10 p-5 text-sm text-zinc-500">No hay alertas consignadas. Confirma alergias, condiciones sistémicas y medicamentos con el paciente.</p>}</CardContent>
        </Card>

        <Card className="glass border-white/10">
          <CardHeader><CardTitle className="flex items-center gap-2 text-white"><ListChecks className="h-5 w-5 text-blue-300" />Preguntas sugeridas para anamnesis</CardTitle></CardHeader>
          <CardContent className="space-y-3">{assistant.questions.map((question, index) => <div key={question} className="flex gap-3 text-sm text-zinc-300"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-500/15 text-xs text-blue-300">{index + 1}</span><p className="leading-6">{question}</p></div>)}</CardContent>
        </Card>

        <Card className="glass border-white/10">
          <CardHeader><CardTitle className="flex items-center gap-2 text-white"><FileText className="h-5 w-5 text-emerald-300" />Borrador de nota clínica</CardTitle></CardHeader>
          <CardContent className="space-y-4"><div><Label htmlFor="assistant-note" className="sr-only">Borrador de nota</Label><textarea id="assistant-note" readOnly value={assistant.noteDraft} rows={11} className="w-full resize-none rounded-xl border border-white/10 bg-black/10 p-3 text-sm leading-6 text-zinc-300" /></div>{!readOnly && <Button type="button" onClick={() => onUseDraft(assistant.noteDraft)} className="w-full"><FileText className="mr-2 h-4 w-4" />Usar como borrador de evolución</Button>}</CardContent>
        </Card>
      </div>

      <p className="text-center text-xs text-zinc-500">Contenido generado a partir de datos registrados. El profesional debe verificar, completar y aprobar toda nota antes de incorporarla al expediente.</p>
    </div>
  )
}
