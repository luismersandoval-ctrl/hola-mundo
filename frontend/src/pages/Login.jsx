import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Activity, Bot, CalendarDays, Eye, EyeOff, ShieldCheck, Sparkles, UsersRound } from 'lucide-react'
import { LanguageToggle, useLanguage } from '@/lib/i18n'
import odontoSpaceLogo from '@/assets/brand/odontospace-logo.png'

export default function Login() {
  const { t } = useLanguage()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleLogin = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const params = new URLSearchParams()
      params.append('username', username)
      params.append('password', password)

      const response = await axios.post('/api/token', params)
      localStorage.setItem('token', response.data.access_token)
      window.location.href = '/'
    } catch (requestError) {
      setError(requestError.response?.data?.detail || t('wrongCredentials'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fc] text-slate-950 lg:grid lg:grid-cols-[minmax(480px,0.95fr)_minmax(560px,1.05fr)]">
      <section className="relative flex min-h-screen items-center justify-center px-6 py-16 sm:px-12 lg:px-16">
        <div className="absolute right-5 top-5"><LanguageToggle /></div>

        <div className="w-full max-w-[430px]">
          <div className="mb-10"><img src={odontoSpaceLogo} alt="OdontoSpace" className="-ml-[18px] h-auto w-[300px] max-w-[calc(100%+18px)]"/><p className="-mt-8 ml-[76px] text-xs font-medium text-slate-500">Gestión clínica odontológica</p></div>

          <div className="mb-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-violet-600">Acceso seguro</p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Bienvenido de nuevo</h1>
            <p className="mt-3 text-base leading-7 text-slate-500">{t('loginSubtitle')}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-semibold text-slate-700">{t('userOrEmail')}</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="ej. maria.perez"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="h-12 border-slate-200 bg-white px-4 text-slate-950 shadow-sm placeholder:text-slate-400 focus-visible:ring-violet-500"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-slate-700">{t('password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 border-slate-200 bg-white px-4 pr-12 text-slate-950 shadow-sm placeholder:text-slate-400 focus-visible:ring-violet-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-violet-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-600">{error}</p>}

            <Button type="submit" disabled={submitting} className="h-12 w-full bg-violet-600 font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700">
              {submitting ? 'Ingresando…' : t('signIn')}
            </Button>

            <p className="text-center text-sm text-slate-500">
              {t('noAccount')} <Link to="/register" className="font-semibold text-violet-600 hover:text-violet-700 hover:underline">{t('register')}</Link>
            </p>
          </form>

          <p className="mt-12 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4" /> Tus datos clínicos viajan de forma segura
          </p>
        </div>
      </section>

      <section className="relative hidden min-h-screen overflow-hidden bg-[#17122b] px-16 py-14 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(139,92,246,0.52),transparent_32%),radial-gradient(circle_at_12%_85%,rgba(59,130,246,0.28),transparent_34%)]" />
        <div className="absolute -right-28 top-28 h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute -right-10 top-48 h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute bottom-[-8rem] left-[-5rem] h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative z-10 flex items-center gap-2 text-sm font-medium text-white/70">
          <Sparkles className="h-4 w-4 text-violet-300" /> El futuro de tu clínica, en un solo lugar
        </div>

        <div className="relative z-10 max-w-xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.22em] text-violet-300">Gestión inteligente</p>
          <h2 className="text-5xl font-bold leading-[1.08] tracking-tight xl:text-6xl">Tu clínica avanza. Nosotros también.</h2>
          <p className="mt-7 max-w-lg text-lg leading-8 text-white/65">Centraliza hoy tu operación y prepárate para una nueva generación de agentes de IA que ayudarán a responder mensajes, impulsar campañas y agendar citas, siempre bajo el control de tu equipo.</p>

          <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-violet-300/20 bg-violet-300/10 px-4 py-2 text-sm text-violet-100">
            <Bot className="h-4 w-4 text-violet-300" />
            Agentes de IA · Próximamente
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              [CalendarDays, 'Agenda', 'Citas organizadas'],
              [UsersRound, 'Pacientes', 'Información centralizada'],
              [Activity, 'Clínica', 'Seguimiento continuo'],
            ].map(([Icon, title, description]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
                <Icon className="mb-5 h-6 w-6 text-violet-300" />
                <p className="font-semibold">{title}</p>
                <p className="mt-1 text-xs leading-5 text-white/50">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/35">OdontoSpace · Tecnología al servicio de tu clínica</p>
      </section>
    </main>
  )
}
