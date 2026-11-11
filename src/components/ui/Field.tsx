import React, { forwardRef, useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Form controls. Each accepts `label`, `error` and `helperText` and wires the
 * label and messages to the control for screen readers.
 */
interface FieldChrome {
  label?: string
  error?: string
  helperText?: string
  /** Marks the label; does not add native validation. */
  required?: boolean
}

function Chrome({ id, label, error, helperText, required, children }: FieldChrome & { id: string; children: React.ReactNode }) {
  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label htmlFor={id} className="label block">
          {label}
          {required && <span className="ml-0.5 text-subtle" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-msg`} role="alert" className="text-sm text-danger">{error}</p>
      ) : helperText ? (
        <p id={`${id}-msg`} className="text-sm text-subtle">{helperText}</p>
      ) : null}
    </div>
  )
}

const describe = (id: string, error?: string, helperText?: string) => ({
  'aria-invalid': error ? true : undefined,
  'aria-describedby': error || helperText ? `${id}-msg` : undefined,
})

const errorClass = 'border-danger/70 focus-visible:border-danger focus-visible:ring-danger/25'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'required'>, FieldChrome {
  leftIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, required, leftIcon, id, ...props }, ref) => {
    const auto = useId()
    const fieldId = id ?? auto
    return (
      <Chrome id={fieldId} label={label} error={error} helperText={helperText} required={required}>
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle [&_svg]:h-4 [&_svg]:w-4">
              {leftIcon}
            </span>
          )}
          <input
            id={fieldId}
            ref={ref}
            aria-required={required || undefined}
            className={cn('control', leftIcon && 'pl-8', error && errorClass, className)}
            {...describe(fieldId, error, helperText)}
            {...props}
          />
        </div>
      </Chrome>
    )
  },
)
Input.displayName = 'Input'

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'required'>, FieldChrome {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, required, id, rows = 3, ...props }, ref) => {
    const auto = useId()
    const fieldId = id ?? auto
    return (
      <Chrome id={fieldId} label={label} error={error} helperText={helperText} required={required}>
        <textarea
          id={fieldId}
          ref={ref}
          rows={rows}
          aria-required={required || undefined}
          className={cn('control h-auto resize-y py-2 leading-relaxed', error && errorClass, className)}
          {...describe(fieldId, error, helperText)}
          {...props}
        />
      </Chrome>
    )
  },
)
Textarea.displayName = 'Textarea'

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'required'>, FieldChrome {
  options: { value: string; label: string }[]
  /** Adds a first option with an empty value, e.g. "All statuses". */
  placeholderOption?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, required, id, options, placeholderOption, ...props }, ref) => {
    const auto = useId()
    const fieldId = id ?? auto
    return (
      <Chrome id={fieldId} label={label} error={error} helperText={helperText} required={required}>
        <div className="relative">
          <select
            id={fieldId}
            ref={ref}
            aria-required={required || undefined}
            className={cn('control cursor-pointer appearance-none pr-8', error && errorClass, className)}
            {...describe(fieldId, error, helperText)}
            {...props}
          >
            {placeholderOption !== undefined && <option value="">{placeholderOption}</option>}
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        </div>
      </Chrome>
    )
  },
)
Select.displayName = 'Select'

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer font-medium text-foreground">{label}</label>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition-colors duration-150 disabled:opacity-45',
          checked ? 'border-primary bg-primary' : 'border-border-strong bg-raised',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-transform duration-150',
            checked ? 'translate-x-4 bg-primary-foreground' : 'bg-muted-foreground',
          )}
        />
      </button>
    </div>
  )
}

export interface SliderProps {
  label: string
  description?: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  /** How the current value is written next to the label, e.g. (v) => `${Math.round(v * 100)}%`. */
  format?: (value: number) => string
  disabled?: boolean
}

export function Slider({ label, description, value, min, max, step = 0.05, onChange, format = (v) => String(v), disabled }: SliderProps) {
  const id = useId()
  const fill = ((value - min) / (max - min)) * 100
  return (
    <div className={cn(disabled && 'opacity-55')}>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="font-medium text-foreground">{label}</label>
        <output htmlFor={id} className="num text-sm text-muted-foreground">{format(value)}</output>
      </div>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      <input
        id={id}
        type="range"
        className="range mt-2"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={format(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ['--fill' as string]: `${fill}%` }}
      />
    </div>
  )
}
