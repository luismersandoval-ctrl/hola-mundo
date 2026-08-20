import { Input } from '@/components/ui/input'
import { INPUT_LIMITS, normalizePhone } from '@/lib/validation'

const countryCodes=[
  ['🇨🇴','+57','Colombia'],['🇺🇸','+1','Estados Unidos / Canadá'],['🇲🇽','+52','México'],
  ['🇪🇸','+34','España'],['🇬🇧','+44','Reino Unido'],['🇦🇷','+54','Argentina'],
  ['🇨🇱','+56','Chile'],['🇵🇪','+51','Perú'],['🇪🇨','+593','Ecuador'],['🇻🇪','+58','Venezuela'],
  ['🇧🇷','+55','Brasil'],['🇵🇦','+507','Panamá'],['🇨🇷','+506','Costa Rica'],['🇩🇴','+1-809','República Dominicana'],
]

export function PhoneInput({countryCode='+57',phone='',onCountryCodeChange,onPhoneChange,placeholder='Celular',id}){
  return <div className="flex min-w-0 gap-2">
    <select aria-label="Prefijo telefónico internacional" value={countryCode} onChange={e=>onCountryCodeChange(e.target.value)} className="h-10 w-[92px] shrink-0 rounded-md border border-white/10 bg-zinc-900 px-1.5 text-sm">
      {countryCodes.map(([flag,code,country])=><option key={`${country}-${code}`} value={code}>{flag} {code}</option>)}
    </select>
    <Input id={id} type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={INPUT_LIMITS.phone} placeholder={placeholder} value={phone} onChange={e=>onPhoneChange(normalizePhone(e.target.value))} className="min-w-0 bg-white/5 border-white/10"/>
  </div>
}
