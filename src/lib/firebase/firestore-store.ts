import {
  collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, setDoc, updateDoc,
} from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import type { CollectionMap, CollectionName } from '@/types/crm'
import { clean, PAGE_LIMIT, type DataStore } from '@/lib/crm/store'
import { firebaseApp } from './app'

/** All data lives under users/{uid}/… — enforced again server-side by firestore.rules. */
export function createFirestoreStore(userId: string): DataStore {
  const db = getFirestore(firebaseApp)
  const col = (n: CollectionName) => collection(db, 'users', userId, n)
  const recent = (n: CollectionName) => query(col(n), orderBy('createdAt', 'desc'), limit(PAGE_LIMIT))
  const map = <K extends CollectionName>(d: { id: string; data(): unknown }) =>
    ({ ...(d.data() as object), id: d.id }) as CollectionMap[K]

  return {
    kind: 'firestore',
    subscribe(name, cb, onError) {
      return onSnapshot(recent(name), snap => cb(snap.docs.map(d => map(d))), onError)
    },
    async list(name) {
      return (await getDocs(recent(name))).docs.map(d => map(d))
    },
    async get(name, id) {
      const s = await getDoc(doc(col(name), id))
      return s.exists() ? map(s) : null
    },
    async create(name, data) {
      const ref = doc(col(name))
      const now = Date.now()
      const row = { ...clean(data), createdAt: now, updatedAt: now }
      await setDoc(ref, row)
      return { ...row, id: ref.id } as CollectionMap[typeof name]
    },
    async update(name, id, patch) {
      await updateDoc(doc(col(name), id), { ...clean(patch), updatedAt: Date.now() })
    },
    async remove(name, id) {
      await deleteDoc(doc(col(name), id))
    },
  }
}
