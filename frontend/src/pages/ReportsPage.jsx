import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { BarChart3, Boxes, CalendarCheck, CalendarDays, CircleDollarSign, Download, History, Info, Lightbulb, Loader2, Minus, Printer, TrendingDown, TrendingUp, Users, Wallet } from 'lucide-react'
import { api } from '@/lib/api'
import { downloadMonthlyReportPdf } from '@/lib/reportPdf'
import { useLanguage } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const money = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0)
const bogotaDateParts = new Intl.DateTimeFormat('en', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
const currentPeriod = `${bogotaDateParts.find((part) => part.type === 'year').value}-${bogotaDateParts.find((part) => part.type === 'month').value}`
const periodName = (period, locale) => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${period}-01T12:00:00Z`))
const previousPeriod = (period) => {
  const [year, month] = period.split('-').map(Number)
  return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`
}

// Agregar o retirar indicadores del reporte solo requiere editar esta configuración.
const METRICS = [
  { key: 'patients', label: 'Pacientes atendidos', icon: Users, color: 'text-blue-400', format: (value) => value ?? 0, description: 'Pacientes únicos que tuvieron al menos una cita durante el mes seleccionado.' },
  { key: 'completed', label: 'Citas atendidas', icon: CalendarCheck, color: 'text-emerald-400', format: (value) => value ?? 0, description: 'Citas del mes que fueron marcadas con estado completado.' },
  { key: 'income', label: 'Ingresos', icon: CircleDollarSign, color: 'text-emerald-400', format: money, description: 'Suma de los movimientos registrados como ingresos durante el mes.' },
  { key: 'balance', label: 'Balance', icon: Wallet, color: 'text-primary', format: money, description: 'Resultado mensual de restar los egresos a los ingresos registrados.' },
  { key: 'receivables', label: 'Cuentas por cobrar', icon: BarChart3, color: 'text-amber-400', format: money, description: 'Saldo acumulado de tratamientos pendiente de pago al cierre del mes.' },
  { key: 'low_stock', label: 'Alertas de inventario', icon: Boxes, color: 'text-red-400', format: (value) => value == null ? 'Sin dato histórico' : value, description: 'Productos en stock mínimo. Por ahora esta fotografía solo está disponible para el mes actual.' },
]

const metricValue = (report, key) => key === 'completed' ? report?.appointments?.completed : report?.[key]
const percentageChange = (current, previous) => {
  if (!previous) return current ? null : 0
  return Math.round(((current - previous) / Math.abs(previous)) * 100)
}

const APPOINTMENT_STYLES = {
  completed: ['Atendidas', 'bg-emerald-500'], confirmed: ['Confirmadas', 'bg-blue-500'], pending: ['Pendientes', 'bg-amber-500'],
  in_room: ['En sala', 'bg-violet-500'], cancelled: ['Canceladas', 'bg-red-500'], no_show: ['No asistió', 'bg-zinc-500'],
}

export default function ReportsPage() {
  const { currentUser } = useOutletContext()
  const { language, locale, translate } = useLanguage()
  const [period, setPeriod] = useState(currentPeriod)
  const [report, setReport] = useState(null)
  const [previousReport, setPreviousReport] = useState(null)
  const [showPeriodFilter, setShowPeriodFilter] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const selectPeriod = (nextPeriod) => {
    if (nextPeriod === period) return
    setLoading(true)
    setError('')
    setPeriod(nextPeriod)
  }

  useEffect(() => {
    const [year, month] = period.split('-').map(Number)
    const [previousYear, previousMonth] = previousPeriod(period).split('-').map(Number)
    Promise.all([
      api.get('/reports/dashboard', { params: { year, month } }),
      api.get('/reports/dashboard', { params: { year: previousYear, month: previousMonth } }),
    ])
      .then(([response, previousResponse]) => { setReport(response.data); setPreviousReport(previousResponse.data) })
      .catch(() => setError('No fue posible cargar el reporte de este mes.'))
      .finally(() => setLoading(false))
  }, [period])

  const formattedMetrics = useMemo(() => METRICS.map((metric) => ({ ...metric, value: metric.format(metricValue(report, metric.key)) })), [report])
  const selectedPeriodName = periodName(period, locale)
  const previousPeriodName = periodName(previousPeriod(period), locale)
  const downloadPdf = () => downloadMonthlyReportPdf({ clinicName: currentUser?.clinic_name, periodLabel: selectedPeriodName, metrics: formattedMetrics.map((metric) => ({ ...metric, label: translate(metric.label) })), language })

  const financialItems = report ? [
    { label: 'Ingresos', value: report.income, color: 'bg-emerald-500' },
    { label: 'Egresos', value: report.expenses, color: 'bg-red-500' },
    { label: 'Balance', value: report.balance, color: report.balance < 0 ? 'bg-red-500' : 'bg-violet-500' },
  ] : []
  const financialMaximum = Math.max(...financialItems.map((item) => Math.abs(item.value)), 1)
  const appointmentItems = report ? Object.entries(report.appointments || {}).map(([key, value]) => ({ key, value, label: APPOINTMENT_STYLES[key]?.[0] || key, color: APPOINTMENT_STYLES[key]?.[1] || 'bg-slate-500' })).sort((a, b) => b.value - a.value) : []
  const appointmentTotal = appointmentItems.reduce((total, item) => total + item.value, 0)
  const comparisons = report && previousReport ? [
    { label: 'Ingresos', current: report.income, previous: previousReport.income, format: money },
    { label: 'Pacientes atendidos', current: report.patients, previous: previousReport.patients, format: (value) => value },
    { label: 'Citas atendidas', current: report.appointments?.completed || 0, previous: previousReport.appointments?.completed || 0, format: (value) => value },
  ].map((item) => ({ ...item, change: percentageChange(item.current, item.previous) })) : []

  return <div className="reports-page min-h-screen p-4 md:p-8"><div className="mx-auto max-w-7xl space-y-6">
    <header className="reports-toolbar flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div><h1 className="text-3xl font-bold text-white">Reportes mensuales</h1><p className="text-zinc-400">Consulta y conserva una visión mes a mes del desempeño de la clínica.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={() => { setShowPeriodFilter((visible) => !visible); if (showPeriodFilter) selectPeriod(currentPeriod) }} className="border-white/10"><History />{showPeriodFilter ? 'Ver mes actual' : 'Consultar otro mes'}</Button>
        {showPeriodFilter && <label className="relative flex h-9 cursor-pointer items-center gap-2 rounded-md border border-violet-300 bg-violet-50 px-3 text-sm text-violet-900 shadow-sm transition hover:bg-violet-100 focus-within:ring-2 focus-within:ring-primary dark:border-violet-500/30 dark:bg-violet-950/70 dark:text-violet-100 dark:hover:bg-violet-900/80"><CalendarDays className="h-4 w-4" /><span className="font-medium capitalize">{selectedPeriodName}</span><input type="month" aria-label="Seleccionar mes del reporte" max={currentPeriod} value={period} onChange={(event) => event.target.value && selectPeriod(event.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" /></label>}
        <Button type="button" variant="outline" onClick={downloadPdf} disabled={!report || loading} className="border-white/10"><Download />Descargar PDF</Button>
        <Button type="button" onClick={() => window.print()} disabled={!report || loading}><Printer />Imprimir</Button>
      </div>
    </header>

    <section className="print-report" aria-label={`Reporte de ${selectedPeriodName}`}>
      <div className="print-only mb-6 hidden"><h1 className="text-2xl font-bold">OdontoSpace · Reporte mensual</h1><p>{currentUser?.clinic_name} · {selectedPeriodName}</p></div>
      <div className="mb-4"><p className="text-sm font-semibold capitalize text-violet-600 dark:text-violet-300">{selectedPeriodName}</p>{report && <p className="text-xs text-zinc-500">Ingresos {money(report.income)} · Egresos {money(report.expenses)}</p>}</div>
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
      {loading && !report ? <div className="flex min-h-52 items-center justify-center text-zinc-400"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Calculando indicadores...</div> : <div className={`report-cards grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>{formattedMetrics.map(({ key, label, value, icon: Icon, color, description }, index) => {
        const tooltipId = `report-card-tooltip-${index}`
        return <Card key={key} className="report-card glass border-white/10"><CardContent className="p-5"><div className="mb-3 flex items-start justify-between"><Icon className={`h-5 w-5 ${color}`} /><span className="tooltip-control group relative"><button type="button" aria-label={`Más información sobre ${label}`} aria-describedby={tooltipId} className="rounded-full p-1 text-violet-500 transition hover:bg-violet-100 hover:text-violet-700 focus:outline-none focus:ring-2 focus:ring-primary dark:text-violet-300 dark:hover:bg-violet-500/15 dark:hover:text-violet-100"><Info className="h-4 w-4" /></button><span id={tooltipId} role="tooltip" className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 w-64 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-left text-xs leading-relaxed text-violet-950 opacity-0 shadow-xl shadow-violet-200/50 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:border-violet-500/30 dark:bg-violet-950 dark:text-violet-100 dark:shadow-black/30">{description}</span></span></div><p className="text-xs text-zinc-500">{label}</p><p className="mt-1 text-2xl font-bold text-white">{value}</p></CardContent></Card>
      })}</div>}

      {report && <div className="report-analysis mt-6 space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="glass border-white/10"><CardHeader><CardTitle className="text-base text-white">Resumen financiero</CardTitle><p className="text-xs text-zinc-500">Movimientos registrados durante {selectedPeriodName}.</p></CardHeader><CardContent className="space-y-5">{financialItems.map((item) => <div key={item.label}><div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="text-zinc-300">{item.label}</span><strong className="text-white">{money(item.value)}</strong></div><div className="h-2.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.max((Math.abs(item.value) / financialMaximum) * 100, item.value ? 4 : 0)}%` }} /></div></div>)}</CardContent></Card>

          <Card className="glass border-white/10"><CardHeader><CardTitle className="text-base text-white">Estado de las citas</CardTitle><p className="text-xs text-zinc-500">{appointmentTotal} citas registradas en el período.</p></CardHeader><CardContent className="space-y-3">{appointmentItems.length ? appointmentItems.map((item) => <div key={item.key}><div className="mb-1 flex justify-between text-sm"><span className="text-zinc-300">{item.label}</span><span className="font-semibold text-white">{item.value} · {Math.round((item.value / appointmentTotal) * 100)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${(item.value / appointmentTotal) * 100}%` }} /></div></div>) : <div className="flex min-h-32 items-center justify-center text-sm text-zinc-500">No se registraron citas durante este mes.</div>}</CardContent></Card>
        </div>

        <Card className="glass border-white/10"><CardHeader><CardTitle className="text-base text-white">Comparación con {previousPeriodName}</CardTitle><p className="text-xs text-zinc-500">Cambios frente al mes inmediatamente anterior.</p></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-3">{comparisons.map((item) => { const TrendIcon = item.change == null ? TrendingUp : item.change > 0 ? TrendingUp : item.change < 0 ? TrendingDown : Minus; const tone = item.change == null || item.change > 0 ? 'text-emerald-600 dark:text-emerald-300' : item.change < 0 ? 'text-red-600 dark:text-red-300' : 'text-zinc-500'; return <div key={item.label} className="rounded-xl border border-violet-200/70 bg-violet-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"><p className="text-xs text-zinc-500">{item.label}</p><div className={`mt-2 flex items-center gap-2 ${tone}`}><TrendIcon className="h-5 w-5" /><strong className="text-xl">{item.change == null ? 'Nuevo' : `${Math.abs(item.change)}%`}</strong></div><p className="mt-1 text-xs text-zinc-500">{item.format(item.current)} este mes · {item.format(item.previous)} anterior</p></div> })}</div><div className="mt-4 flex items-start gap-3 rounded-xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-100"><Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-violet-500" /><p>{comparisons.every((item) => item.current === 0 && item.previous === 0) ? 'Aún no hay actividad suficiente para construir conclusiones sobre este período.' : comparisons.filter((item) => item.change > 0).length >= 2 ? 'El mes presenta una evolución positiva: al menos dos indicadores principales crecieron frente al período anterior.' : comparisons.filter((item) => item.change < 0).length >= 2 ? 'Dos o más indicadores disminuyeron. Conviene revisar la agenda y los movimientos financieros del período.' : 'El desempeño se mantiene mixto frente al mes anterior; revisa cada indicador para identificar oportunidades puntuales.'}</p></div></CardContent></Card>
      </div>}
    </section>
  </div></div>
}
