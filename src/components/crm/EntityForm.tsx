import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { useData } from '@/hooks/useData'
import { ENTITIES, type FieldDef } from '@/lib/crm/entities'
import { findEntity } from '@/lib/crm/facts'
import { formToInput, itemToForm, type FormValues } from '@/lib/crm/forms'
import { ValidationError, humanError } from '@/lib/utils'
import type { EntityType } from '@/types/crm'

interface Props {
  entity: EntityType
  item?: { id: string } | null
  defaults?: Record<string, unknown>
  onClose: () => void
  onSaved?: (id: string) => void
}

export function EntityForm({ entity, item, defaults, onClose, onSaved }: Props) {
  const def = ENTITIES[entity]
  const data = useData()
  const toast = useToast()
  const [values, setValues] = useState<FormValues>(() => itemToForm(def.fields, (item ? findEntity(data, entity, item.id) : null) as Record<string, unknown> | null, defaults))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const refOptions = useMemo(() => ({
    companies: data.companies.map(c => ({ id: c.id, label: c.name })),
    contacts: data.contacts.map(c => ({ id: c.id, label: c.name })),
    leads: data.leads.map(l => ({ id: l.id, label: l.name })),
  }), [data.companies, data.contacts, data.leads])

  const set = (k: string, v: string) => { setValues(s => ({ ...s, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const input = formToInput(def.fields, values)
      if (item) { await data.crm.update(entity, item.id, input); onSaved?.(item.id) }
      else { const rec = await data.crm.create(entity, input); onSaved?.(rec.id) }
      toast.show(`${def.label} ${item ? 'updated' : 'created'}`)
      onClose()
    } catch (err) {
      if (err instanceof ValidationError && err.field) setErrors({ [err.field.split('.')[0]]: err.message.replace(/^[^:]+: /, '') })
      else toast.error(humanError(err, `I couldn’t save that ${def.label.toLowerCase()}. Please try again.`))
    } finally { setBusy(false) }
  }

  const render = (f: FieldDef) => (
    <div key={f.key} className={f.wide ? 'sm:col-span-2' : ''}>
      <Field label={f.label + (f.required ? ' *' : '')} error={errors[f.key] || undefined}>
        {(id, d) => {
          const common = { id, 'aria-describedby': d, 'aria-invalid': !!errors[f.key] || undefined, value: values[f.key] ?? '' }
          if (f.type === 'textarea') return <Textarea {...common} onChange={e => set(f.key, e.target.value)} />
          if (f.type === 'select') return <Select {...common} onChange={e => set(f.key, e.target.value)}>{f.options!.map(o => <option key={o}>{o}</option>)}</Select>
          if (f.type === 'ref') return (
            <Select {...common} onChange={e => set(f.key, e.target.value)}>
              <option value="">— None —</option>
              {refOptions[f.ref!].map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </Select>
          )
          const type = f.type === 'tags' ? 'text' : f.type
          return <Input {...common} type={type} step={type === 'number' ? 'any' : undefined} min={type === 'number' ? 0 : undefined}
            placeholder={f.placeholder} autoComplete="off" onChange={e => set(f.key, e.target.value)} />
        }}
      </Field>
    </div>
  )

  return (
    <Dialog open onClose={onClose} width="max-w-2xl" title={`${item ? 'Edit' : 'New'} ${def.label.toLowerCase()}`}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" type="submit" form="entity-form" disabled={busy}>{busy ? 'Saving…' : item ? 'Save changes' : `Create ${def.label.toLowerCase()}`}</Button>
      </>}>
      <form id="entity-form" onSubmit={submit} noValidate className="grid sm:grid-cols-2 gap-x-4 gap-y-4 pt-1">
        {def.fields.map(render)}
      </form>
    </Dialog>
  )
}
