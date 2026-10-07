import { toDateInput } from '@/lib/utils'
import type { FieldDef } from './entities'

export type FormValues = Record<string, string>

export function itemToForm(fields: FieldDef[], item?: Record<string, unknown> | null, defaults: Record<string, unknown> = {}): FormValues {
  const src = { ...defaults, ...(item ?? {}) }
  const out: FormValues = {}
  for (const f of fields) {
    const v = src[f.key]
    out[f.key] =
      f.type === 'date' ? toDateInput(v as number | null) :
      f.type === 'tags' ? (Array.isArray(v) ? v.join(', ') : '') :
      v === null || v === undefined ? (f.type === 'select' ? f.options?.[0] ?? '' : '') : String(v)
  }
  return out
}

/** Form strings → raw input; the zod schema (shared with AI tools) does the real validation. */
export function formToInput(fields: FieldDef[], v: FormValues): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    const raw = v[f.key] ?? ''
    if (f.type === 'number') out[f.key] = raw === '' ? undefined : Number(raw)
    else if (f.type === 'date') out[f.key] = raw === '' ? null : raw
    else if (f.type === 'ref') out[f.key] = raw === '' ? null : raw
    else out[f.key] = raw
  }
  return out
}
