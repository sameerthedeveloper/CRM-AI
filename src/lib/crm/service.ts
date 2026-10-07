import type { ZodTypeAny } from 'zod'
import type { ActivityType, CollectionMap, EntityType, NoteTarget } from '@/types/crm'
import { ValidationError } from '@/lib/utils'
import { schemas } from '@/lib/crm-tools/schemas'
import { ENTITIES } from './entities'
import type { DataStore } from './store'

export function parse<T = Record<string, unknown>>(schema: ZodTypeAny, raw: unknown): T {
  const r = schema.safeParse(raw)
  if (r.success) return r.data as T
  const i = r.error.issues[0]
  const field = i.path.join('.')
  throw new ValidationError(field ? `${field}: ${i.message}` : i.message, field || undefined)
}

const CONTACT_TYPES: ActivityType[] = ['call', 'email', 'meeting', 'message']

/** Business logic layer. UI and AI tools both write through here, so validation and side-effects live once. */
export function createCrmService(store: DataStore) {
  async function logActivity(type: ActivityType, summary: string, relatedType: NoteTarget, relatedId: string) {
    const data = parse<CollectionMap['activities']>(schemas.activity.create, { type, summary, relatedType, relatedId })
    const rec = await store.create('activities', data)
    if (CONTACT_TYPES.includes(type) && (relatedType === 'lead' || relatedType === 'contact')) {
      await store.update(relatedType === 'lead' ? 'leads' : 'contacts', relatedId, { lastContactedAt: Date.now() })
    }
    return rec
  }

  async function create(entity: EntityType, raw: unknown) {
    const def = ENTITIES[entity]
    const data = parse(def.create, raw)
    const rec = await store.create(def.collection, data as never)
    if (entity !== 'task') await store.create('activities', { type: 'system', summary: `${def.label} created`, relatedType: entity, relatedId: rec.id })
    return rec
  }

  async function update(entity: EntityType, id: string, raw: unknown) {
    const def = ENTITIES[entity]
    const patch = parse<Record<string, unknown>>(def.update, raw)
    const before = (await store.get(def.collection, id)) as unknown as Record<string, unknown> | null
    if (!before) throw new ValidationError(`${def.label} not found`)
    await store.update(def.collection, id, patch as never)
    const field = entity === 'lead' ? 'status' : entity === 'deal' ? 'stage' : null
    if (field && patch[field] && patch[field] !== before[field]) {
      await store.create('activities', {
        type: 'status', summary: `${field === 'stage' ? 'Stage' : 'Status'} changed ${before[field]} → ${patch[field]}`,
        relatedType: entity as NoteTarget, relatedId: id,
      })
    }
    return { ...before, ...patch, id }
  }

  async function remove(entity: EntityType, id: string) {
    const def = ENTITIES[entity]
    await store.remove(def.collection, id)
    if (entity === 'task') return
    const [acts, notes] = await Promise.all([store.list('activities'), store.list('notes')])
    await Promise.all([
      ...acts.filter(a => a.relatedType === entity && a.relatedId === id).map(a => store.remove('activities', a.id)),
      ...notes.filter(n => n.relatedType === entity && n.relatedId === id).map(n => store.remove('notes', n.id)),
    ])
  }

  async function addNote(relatedType: NoteTarget, relatedId: string, body: string) {
    const data = parse<CollectionMap['notes']>(schemas.note.create, { body, relatedType, relatedId })
    const rec = await store.create('notes', data)
    await store.create('activities', { type: 'note', summary: `Note: ${data.body.slice(0, 120)}`, relatedType, relatedId })
    return rec
  }

  const completeTask = (id: string) => update('task', id, { status: 'Completed' })

  return { create, update, remove, addNote, logActivity, completeTask }
}

export type CrmService = ReturnType<typeof createCrmService>
