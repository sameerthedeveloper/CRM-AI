import { Button } from './Button'
import { Dialog } from './Dialog'

export function ConfirmDialog({ open, title, body, confirmLabel = 'Confirm', danger, busy, onConfirm, onClose }: {
  open: boolean; title: string; body: string; confirmLabel?: string; danger?: boolean; busy?: boolean
  onConfirm: () => void; onClose: () => void
}) {
  return (
    <Dialog open={open} onClose={onClose} title={title} width="max-w-md"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</Button>
      </>}>
      <p className="text-sm text-muted">{body}</p>
    </Dialog>
  )
}
