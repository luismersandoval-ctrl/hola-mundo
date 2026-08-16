import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Activity, ArrowLeft, Check, Eye, EyeOff, Loader2, Mail, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LanguageToggle } from '@/lib/i18n'

const passwordRules = [
  ['length', 'Mínimo 10 caracteres', (value) => value.length >= 10],
  ['upper', 'Una letra mayúscula', (value) => /[A-Z]/.test(value)],
  ['lower', 'Una letra minúscula', (value) => /[a-z]/.test(value)],
  ['number', 'Un número', (value) => /\d/.test(value)],
  ['special', 'Un carácter especial', (value) => /[^A-Za-z0-9]/.test(value)],
]

const backendMessage = (error) => {
  const detail = error.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((item) => item.msg).join(' ')
  return 'No fue posible completar la solicitud. Inténtalo nuevamente.'
}

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState('account')
  const [form, setForm] = useState({ clinicName: '', email: '', password: '', confirmPassword: '', code: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const validation = useMemo(() => Object.fromEntries(passwordRules.map(([key, , check]) => [key, check(form.password)])), [form.password])
  const securePassword = Object.values(validation).every(Boolean)

  const requestOtp = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (form.clinicName.trim().length < 3) return setError('El nombre de la clínica debe tener al menos 3 caracteres.')
    if (!securePassword) return setError('La contraseña no cumple todos los requisitos de seguridad.')
    if (form.password !== form.confirmPassword) return setError('Las contraseñas no coinciden.')
    setLoading(true)
    try {
      const response = await axios.post('/api/register/request-otp', { clinic_name: form.clinicName.trim(), email: form.email, password: form.password })
      setMessage(response.data.message)
      setStep('otp')
    } catch (requestError) {
      setError(backendMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const response = await axios.post('/api/register/verify', { clinic_name: form.clinicName.trim(), email: form.email, password: form.password, code: form.code })
      setMessage(response.data.message)
      setTimeout(() => navigate('/login', { replace: true }), 1500)
    } catch (requestError) {
      setError(backendMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute right-4 top-4 z-20"><LanguageToggle/></div>
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px]" />
      <Card className="w-full max-w-md glass border-white/10 shadow-2xl relative z-10">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto p-3 bg-primary/20 rounded-full ring-1 ring-primary/50 w-fit">
            {step === 'account' ? <Activity className="w-8 h-8 text-primary" /> : <ShieldCheck className="w-8 h-8 text-primary" />}
          </div>
          <CardTitle className="text-2xl font-bold text-white">{step === 'account' ? 'Crea tu cuenta' : 'Verifica tu correo'}</CardTitle>
          <CardDescription className="text-zinc-400">
            {step === 'account' ? 'Regístrate en OdontoSpace' : <>Escribe el código enviado a <strong className="text-zinc-200">{form.email}</strong></>}
          </CardDescription>
        </CardHeader>
        <form onSubmit={step === 'account' ? requestOtp : verifyOtp}>
          <CardContent className="space-y-4">
            {step === 'account' ? <>
              <div><Label htmlFor="clinic-name">Nombre de la clínica</Label><Input id="clinic-name" type="text" required minLength={3} maxLength={100} autoComplete="organization" placeholder="Ej. Sonrisas Dental" value={form.clinicName} onChange={(event) => setForm({...form, clinicName: event.target.value})} className="mt-1 bg-zinc-900/50 border-white/10" /></div>
              <div><Label htmlFor="register-email">Correo electrónico</Label><Input id="register-email" type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({...form, email: event.target.value})} className="mt-1 bg-zinc-900/50 border-white/10" /></div>
              <div><Label htmlFor="register-password">Contraseña</Label><div className="relative mt-1"><Input id="register-password" type={showPassword ? 'text' : 'password'} required autoComplete="new-password" value={form.password} onChange={(event) => setForm({...form, password: event.target.value})} className="pr-11 bg-zinc-900/50 border-white/10" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-400 hover:text-white">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{passwordRules.map(([key,label]) => <div key={key} className={`flex items-center gap-2 text-xs ${validation[key] ? 'text-emerald-400' : 'text-zinc-500'}`}><span className={`w-4 h-4 rounded-full flex items-center justify-center ${validation[key] ? 'bg-emerald-500/20' : 'bg-white/5'}`}>{validation[key] && <Check className="w-3 h-3" />}</span>{label}</div>)}</div>
              <div><Label htmlFor="confirm-password">Confirmar contraseña</Label><div className="relative mt-1"><Input id="confirm-password" type={showConfirmation ? 'text' : 'password'} required autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setForm({...form, confirmPassword: event.target.value})} className="pr-11 bg-zinc-900/50 border-white/10" /><button type="button" onClick={() => setShowConfirmation((visible) => !visible)} aria-label={showConfirmation ? 'Ocultar confirmación' : 'Mostrar confirmación'} aria-pressed={showConfirmation} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-400 hover:text-white">{showConfirmation ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></div>
            </> : <>
              <div><Label htmlFor="otp">Código de 6 dígitos</Label><Input id="otp" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoComplete="one-time-code" value={form.code} onChange={(event) => setForm({...form, code: event.target.value.replace(/\D/g, '')})} className="mt-1 bg-zinc-900/50 border-white/10 text-center text-2xl tracking-[0.5em] font-mono" /></div>
              <button type="button" onClick={() => { setStep('account'); setForm({...form, code: ''}); setError(''); setMessage('') }} className="text-sm text-zinc-400 hover:text-white flex items-center gap-1"><ArrowLeft className="w-4 h-4" />Cambiar correo o reenviar código</button>
            </>}
            {error && <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>}
            {message && <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 flex gap-2"><Mail className="w-4 h-4 shrink-0 mt-0.5" />{message}</div>}
          </CardContent>
          <CardFooter className="flex-col gap-3">
            <Button type="submit" disabled={loading} className="w-full font-semibold">{loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{step === 'account' ? 'Enviar código de verificación' : 'Verificar y crear cuenta'}</Button>
            <p className="text-sm text-zinc-500">¿Ya tienes una cuenta? <Link to="/login" className="text-primary hover:underline">Inicia sesión</Link></p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
