import { cn } from '@/lib/utils'

const tone: Record<string, string> = {
  New: 'bg-surface-2 text-muted', Lead: 'bg-surface-2 text-muted', Todo: 'bg-surface-2 text-muted',
  Contacted: 'bg-accent-soft text-accent', Qualified: 'bg-accent-soft text-accent', 'In Progress': 'bg-accent-soft text-accent',
  Proposal: 'bg-[#efe8d2] text-[#7a5d12] dark:bg-[#3a3220] dark:text-[#e2b565]',
  Negotiation: 'bg-[#efe8d2] text-[#7a5d12] dark:bg-[#3a3220] dark:text-[#e2b565]',
  Won: 'bg-[#e1efe0] text-ok dark:bg-[#243428]', Completed: 'bg-[#e1efe0] text-ok dark:bg-[#243428]',
  Lost: 'bg-[#f4dedb] text-danger dark:bg-[#3b2523]', High: 'bg-[#f4dedb] text-danger dark:bg-[#3b2523]',
  Medium: 'bg-surface-2 text-muted', Low: 'bg-surface-2 text-muted',
}

export function Badge({ label, className }: { label: string; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', tone[label] ?? 'bg-surface-2 text-muted', className)}>{label}</span>
}
