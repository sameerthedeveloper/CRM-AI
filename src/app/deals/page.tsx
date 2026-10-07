import { useMemo, useState } from 'react'
import { LayoutGrid, List, Plus, Sparkles } from 'lucide-react'
import { Col, RecordTable } from '@/components/crm/RecordTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Field'
import { EmptyState, Page, PageHeader } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { useData } from '@/hooks/useData'
import { useUI } from '@/hooks/useUI'
import { pipelineSummary } from '@/lib/crm/insights'
import { cn, formatCompact, formatCurrency, formatDate, humanError } from '@/lib/utils'
import { DEAL_STAGES, type Deal } from '@/types/crm'

export default function DealsPage() {
  const { deals, companies, crm, loaded } = useData()
  const ui = useUI()
  const toast = useToast()
  const [view, setView] = useState<'pipeline' | 'list'>('pipeline')
  const sum = useMemo(() => pipelineSummary(deals), [deals])
  const co = (id: string | null) => companies.find(c => c.id === id)?.name ?? ''

  const move = (d: Deal, stage: string) =>
    crm.update('deal', d.id, { stage }).then(() => toast.show(`${d.name} → ${stage}`)).catch(e => toast.error(humanError(e, 'I couldn’t move that deal.')))

  const cols: Col<Deal>[] = [
    { key: 'name', label: 'Deal', primary: true, sort: (a, b) => a.name.localeCompare(b.name), render: d => <span className="font-medium">{d.name}</span> },
    { key: 'company', label: 'Company', render: d => co(d.companyId) || '—' },
    { key: 'stage', label: 'Stage', sort: (a, b) => DEAL_STAGES.indexOf(a.stage) - DEAL_STAGES.indexOf(b.stage), render: d => <Badge label={d.stage} /> },
    { key: 'value', label: 'Value', className: 'text-right tabular-nums', sort: (a, b) => a.value - b.value, render: d => formatCurrency(d.value) },
    { key: 'prob', label: 'Prob.', className: 'tabular-nums', sort: (a, b) => a.probability - b.probability, render: d => `${d.probability}%` },
    { key: 'close', label: 'Expected close', hideOnMobile: true, sort: (a, b) => (a.expectedCloseDate ?? Infinity) - (b.expectedCloseDate ?? Infinity), render: d => <span className="text-muted">{formatDate(d.expectedCloseDate)}</span> },
  ]

  return (
    <Page wide>
      <PageHeader title="Deals" subtitle="Your pipeline at a glance" actions={<>
        <Button onClick={() => ui.ask('Summarize my pipeline and tell me which deals are at risk.')}><Sparkles size={15} /> Analyze with AI</Button>
        <Button variant="primary" onClick={() => ui.create('deal')}><Plus size={16} /> New deal</Button>
      </>} />

      <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 mb-8">
        {[['Active pipeline', formatCompact(sum.activeValue)], ['Weighted', formatCompact(sum.weightedValue)], ['Open deals', String(sum.activeCount)], ['Won', formatCompact(sum.wonValue)]].map(([k, v]) => (
          <div key={k}><dt className="text-[13px] text-muted">{k}</dt><dd className="text-[26px] font-semibold tracking-tight tabular-nums">{v}</dd></div>
        ))}
      </dl>

      <div className="flex items-center gap-1 mb-4" role="group" aria-label="View">
        {([['pipeline', LayoutGrid, 'Pipeline'], ['list', List, 'List']] as const).map(([v, Icon, label]) => (
          <button key={v} aria-pressed={view === v} onClick={() => setView(v)}
            className={cn('inline-flex items-center gap-2 h-8 px-3 rounded-lg text-sm', view === v ? 'bg-surface-2 font-medium' : 'text-muted hover:text-fg')}><Icon size={15} />{label}</button>
        ))}
      </div>

      {!loaded ? null : deals.length === 0 ? (
        <EmptyState title="No deals yet" body="Track revenue opportunities from first conversation to close." action={<Button variant="primary" onClick={() => ui.create('deal')}>New deal</Button>} />
      ) : view === 'list' ? (
        <RecordTable label="Deals" rows={deals} cols={cols} onOpen={d => ui.open('deal', d.id)} initialSort={{ key: 'value', dir: -1 }} />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0 snap-x">
          {DEAL_STAGES.map(stage => {
            const ds = deals.filter(d => d.stage === stage)
            const total = ds.reduce((s, d) => s + d.value, 0)
            return (
              <section key={stage} aria-label={stage} className="w-64 shrink-0 snap-start">
                <header className="flex items-baseline justify-between px-1 mb-2.5">
                  <h2 className="text-sm font-medium">{stage} <span className="text-muted font-normal">{ds.length}</span></h2>
                  <span className="text-xs text-muted tabular-nums">{formatCompact(total)}</span>
                </header>
                <ul className="space-y-2.5">
                  {ds.map(d => (
                    <li key={d.id} className="rounded-xl border border-line bg-surface p-3.5 hover:border-muted/40">
                      <button className="text-left w-full" onClick={() => ui.open('deal', d.id)}>
                        <p className="text-sm font-medium leading-snug">{d.name}</p>
                        <p className="text-xs text-muted mt-0.5">{co(d.companyId) || 'No company'}</p>
                        <p className="text-sm mt-2 tabular-nums">{formatCompact(d.value)} <span className="text-muted text-xs">· {d.probability}%</span></p>
                      </button>
                      <Select aria-label={`Stage for ${d.name}`} className="h-8 mt-2.5 text-xs" value={d.stage} onChange={e => move(d, e.target.value)}>{DEAL_STAGES.map(s => <option key={s}>{s}</option>)}</Select>
                    </li>
                  ))}
                  {ds.length === 0 && <li className="rounded-xl border border-dashed border-line p-4 text-xs text-muted text-center">Empty</li>}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </Page>
  )
}
