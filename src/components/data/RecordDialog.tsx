import { useEffect, useState } from 'react'
import { appConfig, cap } from '@/config'
import { emptyRecord, recordFields, type RecordDraft, type WorkRecord } from '@/data/models'
import { validateFields, type Errors } from '@/lib/validation'
import { dayKey, DAY_MS } from '@/lib/utils'
import { createRecord, updateRecord } from '@/store'
import { Button, Modal, useToast } from '@/components/ui'
import { SchemaForm } from './SchemaForm'

export interface RecordDialogProps {
  isOpen: boolean
  onClose: () => void
  /** Pass a record to edit it; leave undefined to create one. */
  record?: WorkRecord
  onSaved?: (record: WorkRecord) => void
}

/** Create / edit dialog for the main dataset. Validates before saving. */
export function RecordDialog({ isOpen, onClose, record, onSaved }: RecordDialogProps) {
  const toast = useToast()
  const [values, setValues] = useState<RecordDraft>(emptyRecord)
  const [errors, setErrors] = useState<Errors<WorkRecord>>({})
  const noun = appConfig.entity.singular

  useEffect(() => {
    if (!isOpen) return
    setErrors({})
    if (record) {
      const { id: _id, createdAt: _c, completedAt: _d, ...draft } = record
      setValues(draft)
    } else {
      setValues({ ...emptyRecord(), dueDate: dayKey(Date.now() + 7 * DAY_MS) })
    }
  }, [isOpen, record])

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    const found = validateFields(recordFields, values as unknown as Record<string, unknown>)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const clean = { ...values, title: values.title.trim(), notes: values.notes.trim() }
    const saved = record ? updateRecord(record.id, clean) : createRecord(clean)
    if (!saved) {
      toast.error(`This ${noun} no longer exists.`)
      onClose()
      return
    }
    toast.success(record ? `${cap(noun)} saved` : `${cap(noun)} added`)
    onSaved?.(saved)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={record ? `Edit ${noun}` : `New ${noun}`}
      description={record ? undefined : 'Fields marked * are required.'}
      maxWidth="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="record-form">{record ? 'Save changes' : `Add ${noun}`}</Button>
        </>
      }
    >
      <form id="record-form" onSubmit={save} noValidate>
        <SchemaForm
          fields={recordFields}
          values={values as unknown as Record<string, unknown>}
          errors={errors}
          onChange={(key, value) => {
            setValues((v) => ({ ...v, [key]: value }))
            if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }))
          }}
        />
      </form>
    </Modal>
  )
}
