import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn, uid } from '@/lib/utils'

interface Toast { id: string; text: string; tone: 'info' | 'error' }
interface ToastApi { show(text: string): void; error(text: string): void }
const Ctx = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const last = useRef('')
  const push = useCallback((text: string, tone: Toast['tone']) => {
    if (last.current === text && tone === 'error') return // de-dupe error bursts
    last.current = text
    const id = uid()
    setToasts(t => [...t.slice(-2), { id, text, tone }])
    setTimeout(() => { setToasts(t => t.filter(x => x.id !== id)); if (last.current === text) last.current = '' }, 4500)
  }, [])
  const api = useMemo<ToastApi>(() => ({ show: t => push(t, 'info'), error: t => push(t, 'error') }), [push])
  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite" className="fixed z-[100] bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 items-center pointer-events-none px-4 w-full max-w-md">
        {toasts.map(t => (
          <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'}
            className={cn('anim-up pointer-events-auto rounded-xl px-4 py-2.5 text-sm shadow-soft border bg-surface', t.tone === 'error' ? 'border-danger/40 text-danger' : 'border-line text-fg')}>
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast(): ToastApi {
  const c = useContext(Ctx)
  if (!c) throw new Error('ToastProvider missing')
  return c
}
