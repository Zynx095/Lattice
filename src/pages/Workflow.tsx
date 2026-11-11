import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CircleCheck } from 'lucide-react'
import { appConfig, cap, modules } from '@/config'
import { emptyRecord, priorityMeta, recordFields, type FieldDef, type RecordDraft, type WorkRecord } from '@/data/models'
import { validateFields, type Errors } from '@/lib/validation'
import { DAY_MS, dayKey, formatDate } from '@/lib/utils'
import { createRecord, pushNotification } from '@/store'
import { SchemaForm } from '@/components/data/SchemaForm'
import { PageHeader } from '@/components/shell/PageHeader'
import { Button, ConfirmDialog, Panel, useToast } from '@/components/ui'
import { Stepper } from '@/components/workflow/Stepper'

const pick = (...keys: (keyof WorkRecord)[]): FieldDef<WorkRecord>[] => keys.map((k) => recordFields.find((f) => f.key === k)!).filter(Boolean)

/** The steps of the guided form. Each step validates only its own fields. */
const steps: { label: string; description: string; fields: FieldDef<WorkRecord>[] }[] = [
  { label: 'Describe', description: 'What is needed', fields: pick('title', 'category', 'notes') },
  { label: 'Assign', description: 'Who, how much, by when', fields: pick('owner', 'priority', 'amount', 'dueDate') },
  { label: 'Review', description: 'Check and submit', fields: [] },
]

const start = (): RecordDraft => ({ ...emptyRecord(), dueDate: dayKey(Date.now() + 7 * DAY_MS) })

export default function Workflow() {
  const navigate = useNavigate()
  const toast = useToast()
  const noun = appConfig.entity
  const [step, setStep] = useState(0)
  const [values, setValues] = useState<RecordDraft>(start)
  const [errors, setErrors] = useState<Errors<WorkRecord>>({})
  const [confirming, setConfirming] = useState(false)
  const [created, setCreated] = useState<WorkRecord | null>(null)

  const next = () => {
    const found = validateFields(steps[step].fields, values as unknown as Record<string, unknown>)
    setErrors(found)
    if (Object.keys(found).length === 0) setStep((s) => s + 1)
  }

  const submit = () => {
    const record = createRecord({ ...values, title: values.title.trim(), notes: values.notes.trim(), status: 'open' })
    pushNotification('Request submitted', `"${record.title}" was added and assigned to ${record.owner}.`, 'success', `${modules.records.path}/${record.id}`)
    toast.success('Request submitted')
    setConfirming(false)
    setCreated(record)
    setStep(steps.length)
  }

  const restart = () => {
    setValues(start())
    setErrors({})
    setCreated(null)
    setStep(0)
  }

  const review: [string, string][] = [
    ['Title', values.title],
    ['Category', values.category],
    ['Owner', values.owner],
    ['Priority', priorityMeta[values.priority].label],
    [recordFields.find((f) => f.key === 'amount')!.label, String(values.amount)],
    ['Due date', formatDate(values.dueDate)],
    ['Notes', values.notes || 'None'],
  ]

  return (
    <>
      <PageHeader title={modules.workflow.title} description={modules.workflow.description} />

      <div className="max-w-3xl">
        <div className="mb-5">
          <Stepper steps={steps} current={step} onStepClick={created ? undefined : setStep} />
        </div>

        {created ? (
          <Panel>
            <div className="flex flex-col items-start gap-3">
              <CircleCheck className="h-7 w-7 text-success" />
              <div>
                <h2 className="text-md">Request submitted</h2>
                <p className="mt-1 text-muted-foreground">
                  “{created.title}” is now an open {noun.singular} assigned to {created.owner}, due {formatDate(created.dueDate)}.
                </p>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button onClick={() => navigate(`${modules.records.path}/${created.id}`)}>Open the {noun.singular}</Button>
                <Button variant="secondary" onClick={restart}>Start another request</Button>
              </div>
            </div>
          </Panel>
        ) : (
          <Panel title={steps[step].label} description={step === 2 ? 'Nothing is saved until you submit.' : 'Fields marked * are required.'}>
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault()
                if (step < 2) next()
                else setConfirming(true)
              }}
            >
              {step < 2 ? (
                <SchemaForm
                  fields={steps[step].fields}
                  values={values as unknown as Record<string, unknown>}
                  errors={errors}
                  onChange={(key, value) => {
                    setValues((v) => ({ ...v, [key]: value }))
                    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
                  }}
                />
              ) : (
                <dl className="divide-y divide-border rounded-md border border-border">
                  {review.map(([label, value]) => (
                    <div key={label} className="grid grid-cols-3 gap-4 px-4 py-2.5">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="col-span-2 whitespace-pre-wrap break-words">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              <div className="mt-6 flex justify-between gap-2">
                <Button variant="ghost" leftIcon={<ArrowLeft />} disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
                {step < 2 ? (
                  <Button type="submit" rightIcon={<ArrowRight />}>Continue</Button>
                ) : (
                  <Button type="submit">Submit request</Button>
                )}
              </div>
            </form>
          </Panel>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={submit}
        title="Submit this request?"
        description={`A new ${noun.singular} will be created and ${values.owner} will see it in ${cap(noun.plural)}.`}
        confirmLabel="Submit request"
      />
    </>
  )
}
