import type { CollectionMap, CollectionName, NewDoc } from '@/types/crm'

/** Persistence boundary. Firestore and local-demo implementations share this interface. */
export interface DataStore {
  readonly kind: 'firestore' | 'local'
  subscribe<K extends CollectionName>(
    name: K,
    cb: (items: CollectionMap[K][]) => void,
    onError: (e: unknown) => void,
  ): () => void
  list<K extends CollectionName>(name: K): Promise<CollectionMap[K][]>
  get<K extends CollectionName>(name: K, id: string): Promise<CollectionMap[K] | null>
  create<K extends CollectionName>(name: K, data: NewDoc<CollectionMap[K]>): Promise<CollectionMap[K]>
  update<K extends CollectionName>(name: K, id: string, patch: Partial<NewDoc<CollectionMap[K]>>): Promise<void>
  remove(name: CollectionName, id: string): Promise<void>
}

export const PAGE_LIMIT = 500

export const clean = <T extends object>(o: T): T =>
  JSON.parse(JSON.stringify(o)) as T // drops undefined; Firestore rejects it
