import type { FieldDef } from '@/data/models'
import type { Errors } from '@/lib/validation'
import { cn } from '@/lib/utils'
import { Input, Select, Textarea } from '@/components/ui/Field'

export interface SchemaFormProps<T> {
  /** Field definitions, usually from src/data/models.ts. Pass a subset to show part of a model. */
  fields: FieldDef<T>[]
  values: Record<string, unknown>
  errors: Errors<T>
  onChange: (key: keyof T & string, value: string | number) => void
  /** Two columns from the sm breakpoint. Fields marked `wide` span both. */
  columns?: 1 | 2
}

/**
 * Renders inputs from a field list. Controlled: the parent owns values and
 * errors, and validates with validateFields() from src/lib/validation.ts.
 */
export function SchemaForm<T>({ fields, values, errors, onChange, columns = 2 }: SchemaFormProps<T>) {
  return (
    <div className={cn('grid gap-4', columns === 2 && 'sm:grid-cols-2')}>
      {fields.map((f) => {
        const value = values[f.key]
        const common = {
          label: f.label,
          required: f.required,
          error: errors[f.key],
          helperText: f.help,
          name: f.key,
        }
        const wrap = cn(f.wide && columns === 2 && 'sm:col-span-2')

        if (f.type === 'select') {
          return (
            <div key={f.key} className={wrap}>
              <Select {...common} options={f.options ?? []} value={String(value ?? '')} onChange={(e) => onChange(f.key, e.target.value)} />
            </div>
          )
        }
        if (f.type === 'textarea') {
          return (
            <div key={f.key} className={wrap}>
              <Textarea {...common} placeholder={f.placeholder} value={String(value ?? '')} onChange={(e) => onChange(f.key, e.target.value)} />
            </div>
          )
        }
        return (
          <div key={f.key} className={wrap}>
            <Input
              {...common}
              type={f.type}
              placeholder={f.placeholder}
              min={f.min}
              max={f.max}
              value={value === undefined || value === null ? '' : String(value)}
              onChange={(e) => onChange(f.key, f.type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value)}
            />
          </div>
        )
      })}
    </div>
  )
}
