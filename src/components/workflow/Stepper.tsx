import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Step {
  label: string
  description?: string
}

export interface StepperProps {
  steps: Step[]
  /** Index of the step being worked on. Pass steps.length when everything is finished. */
  current: number
  /** When given, completed steps become buttons that jump back. */
  onStepClick?: (index: number) => void
}

/** Workflow progress. Each step is complete, current or upcoming; the state is also announced in text. */
export function Stepper({ steps, current, onStepClick }: StepperProps) {
  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-0">
      {steps.map((step, i) => {
        const state = i < current ? 'complete' : i === current ? 'current' : 'upcoming'
        const clickable = state === 'complete' && onStepClick
        const body = (
          <>
            <span
              className={cn(
                'num flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                state === 'complete' && 'border-primary bg-primary text-primary-foreground',
                state === 'current' && 'border-primary text-primary',
                state === 'upcoming' && 'border-border-strong text-subtle',
              )}
            >
              {state === 'complete' ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className="min-w-0 text-left">
              <span className={cn('block font-medium leading-6', state === 'upcoming' && 'text-muted-foreground')}>{step.label}</span>
              {step.description && <span className="block text-sm text-subtle">{step.description}</span>}
              <span className="sr-only"> ({state})</span>
            </span>
          </>
        )
        return (
          <li key={step.label} aria-current={state === 'current' ? 'step' : undefined} className="flex flex-1 items-start gap-3 sm:pr-4">
            {clickable ? (
              <button type="button" onClick={() => onStepClick(i)} className="flex items-start gap-2.5 rounded-md hover:opacity-80">{body}</button>
            ) : (
              <div className="flex items-start gap-2.5">{body}</div>
            )}
            {i < steps.length - 1 && (
              <span className={cn('mt-3 hidden h-px min-w-6 flex-1 sm:block', i < current ? 'bg-primary/60' : 'bg-border-strong')} aria-hidden="true" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
