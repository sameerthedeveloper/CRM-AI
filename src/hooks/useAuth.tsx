import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthService, AuthUser } from '@/lib/firebase/auth'
import { isFirebaseConfigured } from '@/lib/firebase/config'
import { Spinner } from '@/components/ui/misc'

interface AuthCtx {
  user: AuthUser | null
  service: AuthService
}
const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [service, setService] = useState<AuthService | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let off = () => {}
    let cancelled = false
    ;(async () => {
      const svc = isFirebaseConfigured
        ? (await import('@/lib/firebase/firebase-auth')).firebaseAuthService
        : (await import('@/lib/firebase/demo-auth')).demoAuthService
      if (cancelled) return
      setService(svc)
      off = svc.onChange(u => { setUser(u); setReady(true) })
    })()
    return () => { cancelled = true; off() }
  }, [])

  const value = useMemo(() => (service ? { user, service } : null), [user, service])
  if (!ready || !value) return <div className="h-dvh grid place-items-center"><Spinner /></div>
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx)
  if (!c) throw new Error('AuthProvider missing')
  return c
}
