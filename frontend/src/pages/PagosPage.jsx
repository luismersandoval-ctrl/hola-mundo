import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  CreditCard, DollarSign, TrendingUp, Receipt, 
  ArrowUpRight, ArrowDownRight, Wallet, PiggyBank 
} from 'lucide-react'

const mockTransactions = [
  { id: 1, patient: 'María García', concept: 'Limpieza dental', amount: 1500, type: 'income', date: '2024-01-15', method: 'Tarjeta' },
  { id: 2, patient: 'Carlos López', concept: 'Ortodoncia - Cuota 3', amount: 3500, type: 'income', date: '2024-01-15', method: 'Efectivo' },
  { id: 3, patient: null, concept: 'Material desechable', amount: -800, type: 'expense', date: '2024-01-14', method: 'Transferencia' },
  { id: 4, patient: 'Ana Martínez', concept: 'Extracción molar', amount: 2200, type: 'income', date: '2024-01-14', method: 'Tarjeta' },
  { id: 5, patient: null, concept: 'Guantes y mascarillas', amount: -450, type: 'expense', date: '2024-01-13', method: 'Efectivo' },
]

export default function PagosPage() {
  const totalIncome = mockTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = Math.abs(mockTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0))
  const balance = totalIncome - totalExpense

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Pagos y Caja</h1>
        <p className="text-zinc-400 text-sm mt-1">Control financiero de la clínica</p>
      </div>

      {/* Banner de Integración Pendiente */}
      <div className="glass border border-amber-500/20 rounded-2xl p-5 bg-amber-500/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <CreditCard className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-amber-300 font-semibold text-sm">Integración con Stripe/MercadoPago Pendiente</h3>
            <p className="text-amber-400/70 text-xs mt-0.5">
              Configura tu pasarela de pagos para cobrar online. Consulta la guía de configuración.
            </p>
          </div>
          <Button variant="outline" size="sm" className="ml-auto border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs">
            Ver Guía
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass border-white/10">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-zinc-400 text-xs font-medium">Ingresos del Día</p>
                <p className="text-2xl font-bold text-white mt-1">${totalIncome.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-white/10">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-zinc-400 text-xs font-medium">Egresos del Día</p>
                <p className="text-2xl font-bold text-white mt-1">${totalExpense.toLocaleString()}</p>
              </div>
              <div className="p-2 bg-red-500/20 rounded-lg">
                <ArrowDownRight className="w-4 h-4 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-white/10">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-zinc-400 text-xs font-medium">Balance</p>
                <p className={`text-2xl font-bold mt-1 ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${balance.toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Wallet className="w-4 h-4 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-white/10">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-zinc-400 text-xs font-medium">Cobros Pendientes</p>
                <p className="text-2xl font-bold text-amber-400 mt-1">$4,200</p>
              </div>
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <PiggyBank className="w-4 h-4 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="glass border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white text-lg">Movimientos Recientes</CardTitle>
          <Button variant="outline" size="sm" className="glass border-primary/30 text-primary text-xs">
            + Registrar Movimiento
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-white/10 overflow-hidden bg-black/20">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="text-left text-zinc-300 text-xs font-medium p-3">Concepto</th>
                  <th className="text-left text-zinc-300 text-xs font-medium p-3">Paciente</th>
                  <th className="text-left text-zinc-300 text-xs font-medium p-3">Método</th>
                  <th className="text-left text-zinc-300 text-xs font-medium p-3">Fecha</th>
                  <th className="text-right text-zinc-300 text-xs font-medium p-3">Monto</th>
                </tr>
              </thead>
              <tbody>
                {mockTransactions.map((t) => (
                  <tr key={t.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${t.type === 'income' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        <span className="text-white text-sm">{t.concept}</span>
                      </div>
                    </td>
                    <td className="p-3 text-zinc-400 text-sm">{t.patient || '—'}</td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-zinc-300 border border-white/10">
                        {t.method}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-400 text-sm">{t.date}</td>
                    <td className={`p-3 text-right text-sm font-semibold ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.type === 'income' ? '+' : '-'}${Math.abs(t.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
