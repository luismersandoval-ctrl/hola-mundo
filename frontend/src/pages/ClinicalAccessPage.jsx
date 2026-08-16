import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { FileText, Loader2, Search, Stethoscope, UserRound, Waves } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const API = '/api'

export default function ClinicalAccessPage({ mode }) {
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isHistory = mode === 'history'
  const isPeriodontogram = mode === 'periodontogram'
  const title = isHistory ? 'Historias Clínicas' : isPeriodontogram ? 'Periodontogramas' : 'Odontogramas'
  const description = isHistory
    ? 'Selecciona un paciente para consultar o actualizar su expediente.'
    : isPeriodontogram ? 'Selecciona un paciente para registrar su evaluación periodontal.' : 'Selecciona un paciente para consultar o actualizar su odontograma.'
  const Icon = isHistory ? FileText : isPeriodontogram ? Waves : Stethoscope

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get(`${API}/patients/`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setPatients(response.data)
      } catch (requestError) {
        if (requestError.response?.status === 401) {
          localStorage.removeItem('token')
          navigate('/login')
          return
        }
        setError('No fue posible cargar la lista de pacientes.')
      } finally {
        setLoading(false)
      }
    }

    loadPatients()
  }, [navigate])

  const normalizedSearch = search.trim().toLowerCase()
  const filteredPatients = patients.filter((patient) =>
    [patient.name, patient.phone, patient.email]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedSearch)),
  )

  const openPatient = (patientId) => {
    const destination = isHistory ? 'historia-clinica' : isPeriodontogram ? 'periodontograma' : 'odontograma'
    navigate(`/pacientes/${patientId}/${destination}`)
  }

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] pointer-events-none" />
      <div className="max-w-5xl mx-auto relative z-10">
        <header className="glass p-5 rounded-2xl border-white/10 shadow-lg mb-6">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-primary/20 rounded-xl ring-1 ring-primary/30">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{title}</h1>
              <p className="text-sm text-zinc-400">{description}</p>
            </div>
          </div>
        </header>

        <Card className="glass border-white/10 shadow-lg">
          <CardHeader>
            <CardTitle className="text-white">Pacientes</CardTitle>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, teléfono o correo"
                className="pl-9 bg-white/5 border-white/10 text-white"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-12 text-zinc-400">
                <Loader2 className="w-5 h-5 animate-spin" /> Cargando pacientes...
              </div>
            ) : error ? (
              <p className="py-10 text-center text-red-400">{error}</p>
            ) : filteredPatients.length === 0 ? (
              <p className="py-10 text-center text-zinc-500">
                {patients.length === 0 ? 'Aún no hay pacientes registrados.' : 'No hay resultados para la búsqueda.'}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => openPatient(patient.id)}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left hover:bg-white/[0.07] hover:border-primary/30 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-primary/10">
                      <UserRound className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white truncate">{patient.name}</p>
                      <p className="text-xs text-zinc-500 truncate">{patient.phone || patient.email || 'Sin datos de contacto'}</p>
                    </div>
                    <span className="h-8 inline-flex items-center rounded-md border border-primary/30 px-3 text-xs font-medium text-primary">
                      Abrir
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
