import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CollectionMap, CollectionName } from '@/types/crm'
import type { DataStore } from '@/lib/crm/store'
import { createCrmService, type CrmService } from '@/lib/crm/service'
import type { ToolCtx } from '@/lib/crm-tools'
import { createLocalStore } from '@/lib/crm/local-store'
import { isFirebaseConfigured } from '@/lib/firebase/config'
import { humanError } from '@/lib/utils'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from './useAuth'
import { Spinner } from '@/components/ui/misc'

const NAMES: CollectionName[] = ['leads', 'contacts', 'companies', 'deals', 'tasks', 'activities', 'notes', 'conversations']
type Data = { [K in CollectionName]: CollectionMap[K][] }

interface DataCtx extends Data {
  store: DataStore
  crm: CrmService
  toolCtx: ToolCtx
  loaded: boolean
}
const Ctx = createContext<DataCtx | null>(null)
const empty = (): Data => ({ leads: [], contacts: [], companies: [], deals: [], tasks: [], activities: [], notes: [], conversations: [] })

/** Subscribes to all of the signed-in user's collections (real-time) and exposes the store + business service. */
export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const toast = useToast()
  const [store, setStore] = useState<DataStore | null>(null)
  const [data, setData] = useState<Data>(empty)
  const [loaded, setLoaded] = useState(false)
  const uid = user?.uid

  useEffect(() => {
    if (!uid) return
    let cancelled = false
    let offs: (() => void)[] = []
    setLoaded(false); setData(empty())
    ;(async () => {
      const s = isFirebaseConfigured
        ? (await import('@/lib/firebase/firestore-store')).createFirestoreStore(uid)
        : createLocalStore(uid)
      if (cancelled) return
      setStore(s)
      const pending = new Set(NAMES)
      offs = NAMES.map(name =>
        s.subscribe(name, items => {
          setData(d => ({ ...d, [name]: items }))
          if (pending.delete(name) && !pending.size) setLoaded(true)
        }, e => {
          toast.error(humanError(e, `I couldn’t load your ${name}. Please check your connection and try again.`))
          if (pending.delete(name) && !pending.size) setLoaded(true)
        }),
      )
    })()
    return () => { cancelled = true; offs.forEach(o => o()); setStore(null) }
  }, [uid, toast])

  const value = useMemo<DataCtx | null>(() => {
    if (!store) return null
    const crm = createCrmService(store)
    return { ...data, store, crm, loaded, toolCtx: { store, crm, now: Date.now } }
  }, [data, store, loaded])

  if (!value) return <div className="h-dvh grid place-items-center"><Spinner /></div>
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useData(): DataCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('DataProvider missing')
  return c
}
