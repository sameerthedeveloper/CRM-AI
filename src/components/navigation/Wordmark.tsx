import { cn } from '@/lib/utils'

export function Wordmark({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-accent-fg" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 12V4m8 8V4M4 8h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </span>
      {!compact && <span className="text-[17px] font-semibold tracking-tight">Hearth</span>}
    </div>
  )
}
