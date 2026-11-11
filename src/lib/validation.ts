import type { FieldDef } from '@/data/models'

export type Errors<T> = Partial<Record<keyof T & string, string>>

/** Validates values against a field list. Returns an empty object when valid. */
export function validateFields<T>(fields: FieldDef<T>[], values: Record<string, unknown>): Errors<T> {
  const errors: Errors<T> = {}
  for (const f of fields) {
    const raw = values[f.key]
    const text = raw === undefined || raw === null ? '' : String(raw).trim()

    if (f.required && text === '') {
      errors[f.key] = `${f.label} is required.`
      continue
    }
    if (text === '') continue

    if (f.type === 'number') {
      const n = Number(text)
      if (Number.isNaN(n)) errors[f.key] = `${f.label} must be a number.`
      else if (f.min !== undefined && n < f.min) errors[f.key] = `${f.label} must be at least ${f.min}.`
      else if (f.max !== undefined && n > f.max) errors[f.key] = `${f.label} must be at most ${f.max}.`
    }
    if (f.maxLength !== undefined && text.length > f.maxLength) {
      errors[f.key] = `${f.label} must be ${f.maxLength} characters or fewer.`
    }
    if (f.type === 'date' && Number.isNaN(new Date(text).getTime())) {
      errors[f.key] = `${f.label} is not a valid date.`
    }
  }
  return errors
}

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
