export const INPUT_LIMITS = Object.freeze({
  name: 100,
  email: 254,
  phone: 18,
  document: 40,
  shortText: 500,
  clinicalText: 12000,
  password: 128,
})

export const normalizeName = (value) => value.normalize('NFC').replace(/\p{Cc}/gu, '').slice(0, INPUT_LIMITS.name)
export const normalizePhone = (value) => value.replace(/\D/g, '').slice(0, INPUT_LIMITS.phone)
export const normalizeDocument = (value) => value.normalize('NFC').replace(/[^A-Za-z0-9._ -]/g, '').slice(0, INPUT_LIMITS.document)
export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())

export function apiErrorMessage(error, fallback = 'No fue posible completar la solicitud.') {
  const detail = error?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((item) => `${item.loc?.at(-1) || 'campo'}: ${item.msg}`).join(' · ')
  return fallback
}
