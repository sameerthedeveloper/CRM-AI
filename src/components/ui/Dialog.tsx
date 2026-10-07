import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './Button'

interface DialogProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  variant?: 'center' | 'sheet' | 'palette' | 'drawer'
  label?: string
  width?: string
  children: ReactNode
  footer?: ReactNode
}

/** Built on native <dialog>: focus trap, Esc to close, inert background and screen-reader semantics come from the browser. */
export function Dialog({ open, onClose, title, label, description, variant = 'center', width = 'max-w-lg', children, footer }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const openRef = useRef(open)
  openRef.current = open

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className={cn('dlg', variant === 'sheet' && 'sheet', variant === 'drawer' && 'drawer', variant === 'palette' && 'palette', (variant === 'center' || variant === 'palette') && width)}
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : label ?? 'Dialog'}
      onClose={() => { if (openRef.current) onClose() }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {open && (
        <>
          {title && (
            <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 shrink-0">
              <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-semibold tracking-tight truncate">{title}</h2>
                {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
              </div>
              <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose} className="-mr-2 -mt-1"><X size={18} /></Button>
            </header>
          )}
          <div className={cn('overflow-y-auto min-h-0 flex-1', variant === 'palette' || variant === 'drawer' ? '' : 'px-6 pb-5')}>{children}</div>
          {footer && <footer className="shrink-0 px-6 py-4 border-t border-line flex justify-end gap-2 bg-surface">{footer}</footer>}
        </>
      )}
    </dialog>
  )
}
