import { AlertTriangle, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { PendingAction } from '@/types/crm'

/** Every AI write is shown here first. Nothing runs until the user confirms. */
export function ActionPreview({ pending, busy, onConfirm, onCancel }: { pending: PendingAction; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  const { calls, status, results } = pending
  const danger = calls.some(c => c.danger)
  const label = calls.length === 1 ? 'Confirm' : `Confirm ${calls.length} changes`
  const okCount = results?.filter(r => r.ok).length ?? 0

  return (
    <section aria-label="Proposed changes" className={cn('mt-4 rounded-2xl border bg-surface overflow-hidden anim-up', danger && status === 'pending' ? 'border-danger/50' : 'border-line')}>
      <ol className="divide-y divide-line max-h-72 overflow-y-auto">
        {calls.map((c, i) => (
          <li key={i} className="flex items-start gap-3 px-4 py-2.5 text-sm">
            <span className="mt-0.5 shrink-0 w-4">
              {results ? (results[i]?.ok ? <Check size={15} className="text-ok" /> : <X size={15} className="text-danger" />) : c.danger ? <AlertTriangle size={15} className="text-danger" /> : <span className="text-muted text-xs">{i + 1}</span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn(status === 'cancelled' && 'line-through text-muted')}>{c.preview}</span>
              {results && !results[i]?.ok && <span className="block text-xs text-danger mt-0.5">{results[i]?.message}</span>}
            </span>
          </li>
        ))}
      </ol>
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-surface-2/50 border-t border-line">
        {status === 'pending' ? (
          <>
            <p className="text-xs text-muted">{danger ? 'This can’t be undone.' : 'Nothing changes until you confirm.'}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" disabled={busy} onClick={onCancel}>Cancel</Button>
              <Button size="sm" variant={danger ? 'danger' : 'primary'} disabled={busy} onClick={onConfirm}>{busy ? 'Working…' : label}</Button>
            </div>
          </>
        ) : (
          <p role="status" className={cn('text-sm', status === 'failed' && 'text-danger')}>
            {status === 'confirmed' && (okCount === calls.length ? `Done — ${okCount} change${okCount === 1 ? '' : 's'} applied.` : `${okCount} of ${calls.length} applied. Some couldn’t be completed.`)}
            {status === 'cancelled' && 'Cancelled. Nothing was changed.'}
            {status === 'failed' && 'I couldn’t apply those changes. Nothing was changed.'}
          </p>
        )}
      </div>
    </section>
  )
}
