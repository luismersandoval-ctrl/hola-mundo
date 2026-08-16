import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Eye, EyeOff } from 'lucide-react'
import { LanguageToggle, useLanguage } from '@/lib/i18n'

export default function Login() {
  const {t}=useLanguage()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const params = new URLSearchParams()
      params.append('username', username)
      params.append('password', password)
      
      const response = await axios.post('/api/token', params)
      localStorage.setItem('token', response.data.access_token)
      window.location.href = '/'
    } catch (requestError) {
      setError(requestError.response?.data?.detail || t('wrongCredentials'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute right-4 top-4 z-20"><LanguageToggle/></div>
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-[120px]" />

      <Card className="w-full max-w-md glass border-white/10 shadow-2xl relative z-10">
        <CardHeader className="space-y-3">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-primary/20 rounded-full ring-1 ring-primary/50">
              <Activity className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center text-white">
            OdontoSpace
          </CardTitle>
          <CardDescription className="text-center text-zinc-400">
            {t('loginSubtitle')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-zinc-300">{t('userOrEmail')}</Label>
              <Input 
                id="username" 
                type="text" 
                placeholder="ej. maria.perez"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-zinc-900/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">{t('password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-11 bg-zinc-900/50 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-primary"
                />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? t('hidePassword') : t('showPassword')} aria-pressed={showPassword} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-400 hover:text-white">
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-400 text-center font-medium bg-red-400/10 py-2 rounded-md">{error}</p>}
          </CardContent>
          <CardFooter>
            <div className="w-full space-y-3">
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all">{t('signIn')}</Button>
              <p className="text-sm text-zinc-500 text-center">{t('noAccount')} <Link to="/register" className="text-primary hover:underline">{t('register')}</Link></p>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
