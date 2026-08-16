import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import axios from 'axios'
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Save, Stethoscope } from 'lucide-react'
import Odontograma from '@/components/Odontograma'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const API = '/api'

export default function OdontogramaPage() {
  const { id: patientId } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useOutletContext()
  const readOnly = currentUser?.role === 'administrative'
  const [patient, setPatient] = useState(null)
  const [initialState, setInitialState] = useState(null)
  const [odontogramState, setOdontogramState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const getConfig = useCallback(() => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  }), [])

  useEffect(() => {
    const loadData = async () => {
      try {
        const patientResponse = await axios.get(`${API}/patients/${patientId}`, getConfig())
        setPatient(patientResponse.data)

        try {
          const odontogramResponse = await axios.get(`${API}/patients/${patientId}/odontograma`, getConfig())
          setInitialState(JSON.parse(odontogramResponse.data.data))
        } catch (odontogramError) {
          if (odontogramError.response?.status !== 404) throw odontogramError
          setInitialState({})
        }
      } catch (requestError) {
        if (requestError.response?.status === 401) {
          localStorage.removeItem('token')
          navigate('/login')
          return
        }
        setError(requestError.response?.status === 404
          ? 'El paciente solicitado no existe.'
          : 'No fue posible cargar el odontograma.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [getConfig, navigate, patientId])

  const handleChange = useCallback((nextState) => {
    setOdontogramState(nextState)
    setSaved(false)
  }, [])

  const handleSave = async () => {
    if (!odontogramState) return
    setSaving(true)
    setError('')
    try {
      await axios.post(
        `${API}/patients/${patientId}/odontograma`,
        { data: JSON.stringify(odontogramState) },
        getConfig(),
      )
      setSaved(true)
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        localStorage.removeItem('token')
        navigate('/login')
        return
      }
      setError('No fue posible guardar el odontograma.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="w-6 h-6 animate-spin text-primary" /> Cargando odontograma...
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[150px] pointer-events-none" />
      <div className="max-w-7xl mx-auto relative z-10">
        <header className="glass p-4 sm:p-5 rounded-2xl border-white/10 shadow-lg mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="outline" size="icon" onClick={() => navigate('/odontograma')} className="glass border-white/10 text-zinc-400">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="p-2.5 bg-primary/20 rounded-xl ring-1 ring-primary/30">
              <Stethoscope className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-white">Odontograma</h1>
              <p className="text-sm text-zinc-400 truncate">{patient?.name || 'Paciente'}</p>
            </div>
          </div>
          {!readOnly && <Button onClick={handleSave} disabled={saving || !odontogramState} className="bg-primary hover:bg-primary/90 w-full sm:w-auto">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar'}
          </Button>}
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-3 text-red-300">
            <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
          </div>
        )}

        {initialState !== null && patient && (
          <Card className="glass border-white/10 shadow-lg overflow-hidden">
            <CardHeader>
              <CardTitle className="text-white">Registro dental permanente</CardTitle>
              <p className="text-sm text-zinc-500">
                Haz clic en una superficie para cambiar su estado. Usa clic derecho sobre una pieza para definir su estado general.
              </p>
              {readOnly && <p className="text-sm text-amber-300">Modo de consulta: tu rol no permite modificar el odontograma.</p>}
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="w-full overflow-x-auto overscroll-x-contain rounded-2xl bg-white border border-zinc-200 shadow-inner">
                <div className={`min-w-[920px] px-6 py-6 ${readOnly ? 'pointer-events-none' : ''}`}>
                  <Odontograma initialState={initialState} onChange={handleChange} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
