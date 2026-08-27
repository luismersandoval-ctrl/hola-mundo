import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, LockKeyhole, Plus, WalletCards } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiErrorMessage } from '@/lib/validation'

const money = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0)
const todayInBogota = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' })
const shiftDate = (value, amount) => {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + amount)
  return date.toISOString().slice(0, 10)
}
const longDate = (value) => new Intl.DateTimeFormat('es-CO', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
const methodNames = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', other: 'Otro' }

export default function PagosPage() {
  const [selectedDate, setSelectedDate] = useState(todayInBogota)
  const [payments, setPayments] = useState([])
  const [patients, setPatients] = useState([])
  const [treatments, setTreatments] = useState([])
  const [closing, setClosing] = useState(null)
  const [closingNotes, setClosingNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [closingCash, setClosingCash] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ patient_id: '', treatment_id: '', type: 'income', concept: '', amount: '', method: 'cash' })

  const loadDay = useCallback(async () => {
    const [paymentsResponse, closingResponse] = await Promise.all([
      api.get(`/payments/?business_date=${selectedDate}`),
      api.get(`/cash-closings/${selectedDate}`),
    ])
    setPayments(paymentsResponse.data)
    setClosing(closingResponse.data)
  }, [selectedDate])

  useEffect(() => {
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    Promise.all([api.get('/patients/'), loadDay()])
      .then(async ([patientsResponse]) => {
        if (!active) return
        setPatients(patientsResponse.data)
        const lists = await Promise.all(patientsResponse.data.map((patient) => api.get(`/patients/${patient.id}/treatments`)))
        if (active) setTreatments(lists.flatMap((response) => response.data))
      })
      .catch((requestError) => active && setError(apiErrorMessage(requestError, 'No fue posible cargar la caja diaria.')))
    return () => { active = false }
  }, [loadDay])

  const names = useMemo(() => Object.fromEntries(patients.map((patient) => [patient.id, patient.name])), [patients])
  const totals = useMemo(() => {
    const income = payments.filter((payment) => payment.type === 'income').reduce((sum, payment) => sum + payment.amount, 0)
    const expenses = payments.filter((payment) => payment.type === 'expense').reduce((sum, payment) => sum + payment.amount, 0)
    const cashIncome = payments.filter((payment) => payment.type === 'income' && payment.method === 'cash').reduce((sum, payment) => sum + payment.amount, 0)
    const cashExpenses = payments.filter((payment) => payment.type === 'expense' && payment.method === 'cash').reduce((sum, payment) => sum + payment.amount, 0)
    return { income, expenses, balance: income - expenses, cash: cashIncome - cashExpenses }
  }, [payments])
  const patientTreatments = treatments.filter((item) => item.patient_id === Number(form.patient_id) && item.balance_amount > 0)

  const create = async (event) => {
    event.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/payments/', {
        ...form,
        business_date: selectedDate,
        patient_id: form.patient_id ? Number(form.patient_id) : null,
        treatment_id: form.treatment_id ? Number(form.treatment_id) : null,
        amount: Number(form.amount),
      })
      setForm({ patient_id: '', treatment_id: '', type: 'income', concept: '', amount: '', method: 'cash' })
      await loadDay()
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'No fue posible registrar el movimiento.'))
    } finally {
      setSaving(false)
    }
  }

  const closeCash = async () => {
    if (!window.confirm(`¿Confirmas el cierre de caja del ${longDate(selectedDate)}? Después no se podrán agregar movimientos a este día.`)) return
    setError('')
    setClosingCash(true)
    try {
      const response = await api.post('/cash-closings', { business_date: selectedDate, notes: closingNotes })
      setClosing(response.data)
      setClosingNotes('')
    } catch (requestError) {
      setError(apiErrorMessage(requestError, 'No fue posible cerrar la caja.'))
    } finally {
      setClosingCash(false)
    }
  }

  return <div className="space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-bold text-white">Pagos y Caja</h1><p className="text-zinc-400">Ingresos, egresos y cierre diario de caja.</p></div>
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-1.5">
        <Button type="button" size="icon" variant="ghost" onClick={() => setSelectedDate(shiftDate(selectedDate, -1))} aria-label="Día anterior"><ChevronLeft className="h-4 w-4" /></Button>
        <div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-primary"/><Input type="date" value={selectedDate} max={todayInBogota()} onChange={(event) => setSelectedDate(event.target.value)} className="w-44 border-white/10 bg-transparent pl-9"/></div>
        <Button type="button" size="icon" variant="ghost" disabled={selectedDate >= todayInBogota()} onClick={() => setSelectedDate(shiftDate(selectedDate, 1))} aria-label="Día siguiente"><ChevronRight className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" onClick={() => setSelectedDate(todayInBogota())}>Hoy</Button>
      </div>
    </header>

    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
      <div><p className="font-semibold text-blue-800 dark:text-blue-200">{longDate(selectedDate)}</p><p className="text-xs text-zinc-600 dark:text-zinc-400">{payments.length} movimiento{payments.length === 1 ? '' : 's'} registrado{payments.length === 1 ? '' : 's'}</p></div>
      {closing ? <span className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200"><CheckCircle2 className="h-4 w-4"/>Caja cerrada</span> : <span className="flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-semibold text-blue-800 dark:bg-blue-500/15 dark:text-blue-200"><WalletCards className="h-4 w-4"/>Caja abierta</span>}
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[['Ingresos del día', totals.income, 'text-emerald-700 dark:text-emerald-300'], ['Egresos del día', totals.expenses, 'text-red-700 dark:text-red-300'], ['Balance del día', totals.balance, 'text-blue-700 dark:text-blue-300'], ['Efectivo disponible', totals.cash, 'text-violet-700 dark:text-violet-300']].map(([label, value, color]) => <Card key={label} className="glass border-white/10"><CardContent className="p-5"><p className="text-xs text-zinc-500">{label}</p><p className={`mt-1 text-2xl font-bold ${color}`}>{money(value)}</p></CardContent></Card>)}
    </div>

    {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}

    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="space-y-6">
        <Card className="glass border-white/10"><CardHeader><CardTitle className="text-white">Nuevo movimiento</CardTitle></CardHeader><CardContent>
          {closing ? <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center"><LockKeyhole className="mx-auto mb-2 h-7 w-7 text-emerald-600 dark:text-emerald-300"/><p className="font-semibold text-zinc-900 dark:text-white">Esta caja está cerrada</p><p className="mt-1 text-xs text-zinc-500">Consulta sus movimientos o selecciona otro día.</p></div> : <form onSubmit={create} className="space-y-3">
            <div><Label>Tipo</Label><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value, treatment_id: '' })} className="mt-1 w-full rounded-md border border-white/10 bg-zinc-900 p-2"><option value="income">Ingreso</option><option value="expense">Egreso</option></select></div>
            <div><Label>Paciente (opcional)</Label><select value={form.patient_id} onChange={(event) => setForm({ ...form, patient_id: event.target.value, treatment_id: '' })} className="mt-1 w-full rounded-md border border-white/10 bg-zinc-900 p-2"><option value="">General</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}</select></div>
            {form.patient_id && form.type === 'income' && <div><Label>Tratamiento al que se aplica</Label><select value={form.treatment_id} onChange={(event) => { const item = treatments.find((treatment) => treatment.id === Number(event.target.value)); setForm({ ...form, treatment_id: event.target.value, concept: item ? `Abono · ${item.name}` : form.concept }) }} className="mt-1 w-full rounded-md border border-white/10 bg-zinc-900 p-2"><option value="">Pago general del paciente</option>{patientTreatments.map((item) => <option key={item.id} value={item.id}>{item.name} · saldo {money(item.balance_amount)}</option>)}</select></div>}
            <div><Label>Concepto</Label><Input required value={form.concept} onChange={(event) => setForm({ ...form, concept: event.target.value })} className="mt-1 border-white/10 bg-white/5"/></div>
            <div><Label>Valor</Label><Input required type="number" min="1" max="1000000000" step="1" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="mt-1 border-white/10 bg-white/5"/></div>
            <div><Label>Método</Label><select value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })} className="mt-1 w-full rounded-md border border-white/10 bg-zinc-900 p-2"><option value="cash">Efectivo</option><option value="card">Tarjeta</option><option value="transfer">Transferencia</option><option value="other">Otro</option></select></div>
            <Button disabled={saving} className="w-full"><Plus className="mr-2 h-4 w-4"/>{saving ? 'Registrando…' : 'Registrar'}</Button>
          </form>}
        </CardContent></Card>

        <Card className="glass border-white/10"><CardHeader><CardTitle className="text-white">Cierre de caja</CardTitle></CardHeader><CardContent className="space-y-3">
          {closing ? <div className="space-y-2 text-sm"><p className="font-semibold text-emerald-700 dark:text-emerald-300">Cerrada por {closing.closed_by}</p><p className="text-zinc-500">{new Date(closing.closed_at).toLocaleString('es-CO')}</p><p className="text-zinc-700 dark:text-zinc-300">Efectivo declarado: <strong>{money(closing.cash_available)}</strong></p>{closing.notes && <p className="rounded-lg bg-white/5 p-3 text-zinc-500">{closing.notes}</p>}</div> : <><p className="text-sm text-zinc-500">Al cerrar se congelan los totales y no se permitirán más movimientos para este día.</p><div><Label>Observaciones (opcional)</Label><textarea maxLength={500} rows={3} value={closingNotes} onChange={(event) => setClosingNotes(event.target.value)} className="mt-1 w-full rounded-md border border-white/10 bg-white/5 p-3 text-sm"/></div><Button type="button" variant="outline" disabled={closingCash || selectedDate > todayInBogota()} onClick={closeCash} className="w-full border-violet-500/30 text-violet-700 dark:text-violet-300"><LockKeyhole className="mr-2 h-4 w-4"/>{closingCash ? 'Cerrando…' : 'Realizar cierre de caja'}</Button></>}
        </CardContent></Card>
      </div>

      <Card className="glass border-white/10"><CardHeader><CardTitle className="text-white">Movimientos del día</CardTitle></CardHeader><CardContent className="space-y-2">{payments.length === 0 ? <p className="py-10 text-center text-zinc-500">No hay movimientos para esta fecha.</p> : payments.map((payment) => <div key={payment.id} className="flex items-center gap-3 border-b border-white/5 py-3">{payment.type === 'income' ? <ArrowUpRight className="text-emerald-600 dark:text-emerald-300"/> : <ArrowDownRight className="text-red-600 dark:text-red-300"/>}<div className="flex-1"><p className="text-zinc-900 dark:text-white">{payment.concept}</p><p className="text-xs text-zinc-500">{names[payment.patient_id] || 'Movimiento general'} · {methodNames[payment.method] || payment.method} · {new Date(payment.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p></div><p className={payment.type === 'income' ? 'font-semibold text-emerald-700 dark:text-emerald-300' : 'font-semibold text-red-700 dark:text-red-300'}>{payment.type === 'income' ? '+' : '-'} {money(payment.amount)}</p></div>)}</CardContent></Card>
    </div>
  </div>
}
