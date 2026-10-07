import type { CollectionMap, CollectionName, NewDoc } from '@/types/crm'
import { uid } from '@/lib/utils'
import { clean, type DataStore } from './store'

type Row = { id: string; createdAt: number; updatedAt: number }

/** Browser-local store used in demo mode (no Firebase keys). Same contract as the Firestore store. */
export function createLocalStore(userId: string): DataStore {
  const key = (n: string) => `hearth:${userId}:${n}`
  const cache = new Map<string, Row[]>()
  const listeners = new Map<string, Set<(rows: Row[]) => void>>()

  const read = (n: string): Row[] => {
    const hit = cache.get(n)
    if (hit) return hit
    let rows: Row[] = []
    try { rows = JSON.parse(localStorage.getItem(key(n)) ?? '[]') } catch { rows = [] }
    cache.set(n, rows)
    return rows
  }
  const write = (n: string, rows: Row[]) => {
    cache.set(n, rows)
    try { localStorage.setItem(key(n), JSON.stringify(rows)) } catch { /* quota: keep in memory */ }
    listeners.get(n)?.forEach(cb => cb(sorted(rows)))
  }
  const sorted = (rows: Row[]) => [...rows].sort((a, b) => b.createdAt - a.createdAt)

  return {
    kind: 'local',
    subscribe(name, cb) {
      const set = listeners.get(name) ?? new Set()
      listeners.set(name, set)
      const fn = cb as (rows: Row[]) => void
      set.add(fn)
      queueMicrotask(() => fn(sorted(read(name))))
      return () => set.delete(fn)
    },
    async list(name) { return sorted(read(name)) as never },
    async get(name, id) { return (read(name).find(r => r.id === id) ?? null) as never },
    async create(name, data) {
      const now = Date.now()
      const row = { ...clean(data as object), id: uid(), createdAt: now, updatedAt: now } as Row
      write(name, [row, ...read(name)])
      return row as CollectionMap[typeof name]
    },
    async update(name, id, patch: Partial<NewDoc<CollectionMap[CollectionName]>>) {
      const rows = read(name)
      if (!rows.some(r => r.id === id)) throw Object.assign(new Error('not found'), { code: 'not-found' })
      write(name, rows.map(r => (r.id === id ? { ...r, ...clean(patch as object), updatedAt: Date.now() } : r)))
    },
    async remove(name, id) { write(name, read(name).filter(r => r.id !== id)) },
  }
}
