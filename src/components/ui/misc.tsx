import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="inline-flex items-center rounded-md border border-line bg-surface-2 px-1.5 h-5 text-[11px] font-medium text-muted font-sans">{children}</kbd>
)

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="py-16 text-center anim-fade">
      <p className="text-base font-medium">{title}</p>
      {body && <p className="text-sm text-muted mt-1 max-w-sm mx-auto">{body}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function Thinking({ label = 'Thinking…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-muted anim-fade" role="status" aria-live="polite">
      <span className="flex gap-1" aria-hidden><i className="dot" /><i className="dot" /><i className="dot" /></span>
      <span>{label}</span>
    </div>
  )
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export const Page = ({ children, wide }: { children: ReactNode; wide?: boolean }) => (
  <div className={cn('mx-auto w-full px-4 md:px-8 py-6 md:py-10 anim-fade', wide ? 'max-w-6xl' : 'max-w-4xl')}>{children}</div>
)

export const Spinner = () => <div role="status" aria-label="Loading" className="h-5 w-5 rounded-full border-2 border-line border-t-accent animate-spin" />
