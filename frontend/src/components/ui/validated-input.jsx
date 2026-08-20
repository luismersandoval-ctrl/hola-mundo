import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function FormFieldError({ id, message }) {
  if (!message) return null
  return <p id={id} role="alert" className="mt-1 text-xs font-medium text-red-400">{message}</p>
}

export function ValidatedInput({ id, label, error, hint, required, ...props }) {
  const errorId = error ? `${id}-error` : undefined
  const hintId = hint ? `${id}-hint` : undefined
  return <div><Label htmlFor={id}>{label}{required&&<span className="ml-1 text-red-400">*</span>}</Label><Input id={id} required={required} aria-invalid={Boolean(error)} aria-describedby={[errorId,hintId].filter(Boolean).join(' ')||undefined} {...props}/>{hint&&<p id={hintId} className="mt-1 text-xs text-zinc-500">{hint}</p>}<FormFieldError id={errorId} message={error}/></div>
}

export function ValidatedTextarea({ id, label, error, hint, required, maxLength=12000, value, className='', ...props }) {
  const errorId = error ? `${id}-error` : undefined
  const hintId = hint ? `${id}-hint` : undefined
  return <div><div className="flex items-center justify-between gap-2"><Label htmlFor={id}>{label}{required&&<span className="ml-1 text-red-400">*</span>}</Label><span className="text-[10px] text-zinc-500">{String(value||'').length}/{maxLength}</span></div><textarea id={id} required={required} maxLength={maxLength} value={value} aria-invalid={Boolean(error)} aria-describedby={[errorId,hintId].filter(Boolean).join(' ')||undefined} className={`mt-1 w-full rounded-md border border-white/10 bg-white/5 p-3 text-sm ${className}`} {...props}/>{hint&&<p id={hintId} className="mt-1 text-xs text-zinc-500">{hint}</p>}<FormFieldError id={errorId} message={error}/></div>
}
