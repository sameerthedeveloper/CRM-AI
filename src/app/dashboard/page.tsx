import { useMemo, useRef, useState } from 'react'
import { ArrowRight, MessageSquareText, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Markdown from '@/components/ui/LazyMarkdown'
import { Page, Thinking } from '@/components/ui/misc'
import { useAuth } from '@/hooks/useAuth'
import { useData } from '@/hooks/useData'
import { useUI } from '@/hooks/useUI'
import { ai } from '@/lib/ai'
import { dealRisk, isDueToday, isOverdue, leadFollowUps, pipelineSummary, quickInsight } from '@/lib/crm/insights'
import { formatCompact, relativeTime } from '@/lib/utils'

const Label = ({ children }: { children: string }) => <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted mb-2">{children}</h2>
const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' }

export default function DashboardPage() {
  const data = useData()
  const { user } = useAuth()
  const ui = useUI()
  const [insight, setInsight] = useState('')
  const [busy, setBusy] = useState(false)
  const run = useRef(0)

  const follow = useMemo(() => leadFollowUps(data.leads), [data.leads])
  const sum = useMemo(() => pipelineSummary(data.deals), [data.deals])
  const todayTasks = data.tasks.filter(t => isDueToday(t) || isOverdue(t)).sort((a, b) => (a.dueDate ?? 0) - (b.dueDate ?? 0))
  const overdue = todayTasks.filter(t => isOverdue(t)).length
  const risky = data.deals.filter(d => dealRisk(d, data.activities)).length
  const line = quickInsight(data.leads, data.deals, data.activities)
  const first = user?.name?.split(' ')[0]

  async function deeper() {
    const my = ++run.current
    setBusy(true); setInsight('')
    const facts = [
      `Follow-ups needed: ${follow.map(f => `${f.lead.name} (${f.reasons.join(', ')})`).join('; ') || 'none'}`,
      `Pipeline: ${formatCompact(sum.activeValue)} active across ${sum.activeCount} deals; weighted ${formatCompact(sum.weightedValue)}; ${risky} at risk`,
      `Tasks today/overdue: ${todayTasks.length} (${overdue} overdue)`,
    ].join('\n')
    try {
      let acc = ''
      for await (const c of ai.analyze(facts, 'What should I do first today, and why? Max 4 bullets.', { fallback: () => `- ${line}\n- ${follow[0] ? `Start with **${follow[0].lead.name}**: ${follow[0].action}` : 'No urgent follow-ups.'}\n- ${overdue ? `Clear ${overdue} overdue task${overdue === 1 ? '' : 's'}.` : 'No overdue tasks.'}` })) {
        if (my !== run.current) return
        acc += c; setInsight(acc)
      }
    } catch { setInsight('I couldn’t reach the AI service. Your numbers above are still accurate.') }
    finally { if (my === run.current) setBusy(false) }
  }

  return (
    <Page>
      <header className="mb-10">
        <h1 className="text-[34px] md:text-[40px] font-semibold tracking-tight leading-tight">{greet()}{first ? `, ${first}` : ''}.</h1>
        <p className="text-lg text-muted mt-1">Here’s what needs your attention.</p>
      </header>

      <div className="space-y-10">
        <section aria-labelledby="hp">
          <Label>High priority</Label>
          <p id="hp" className="text-2xl font-medium tracking-tight">{follow.length ? `${follow.length} lead${follow.length === 1 ? '' : 's'} need follow-up.` : 'No leads need follow-up.'}</p>
          {follow.length > 0 && (
            <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
              {follow.slice(0, 3).map(f => (
                <li key={f.lead.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <button className="min-w-0 flex-1 text-left" onClick={() => ui.open('lead', f.lead.id)}>
                    <p className="font-medium truncate">{f.lead.name} <span className="text-muted font-normal">· {formatCompact(f.lead.value)}</span></p>
                    <p className="text-sm text-muted truncate">{f.reasons.join(' · ')}</p>
                  </button>
                  <Button size="sm" onClick={() => ui.draft('lead', f.lead.id)}><MessageSquareText size={14} /> Draft</Button>
                </li>
              ))}
            </ul>
          )}
          {follow.length > 3 && <button className="mt-2 text-sm text-accent hover:underline" onClick={() => ui.ask('Who should I follow up with today?')}>See all {follow.length} in chat</button>}
        </section>

        <section aria-labelledby="pl">
          <Label>Pipeline</Label>
          <p id="pl" className="text-2xl font-medium tracking-tight tabular-nums">{formatCompact(sum.activeValue)} <span className="text-muted text-lg font-normal">active pipeline</span></p>
          <p className="text-sm text-muted mt-1">{sum.activeCount} open deal{sum.activeCount === 1 ? '' : 's'} · {formatCompact(sum.weightedValue)} weighted{risky ? ` · ${risky} at risk` : ''}</p>
          {sum.activeValue > 0 && (
            <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`Pipeline by stage: ${sum.byStage.filter(s => s.stage !== 'Won' && s.stage !== 'Lost' && s.count).map(s => `${s.stage} ${formatCompact(s.value)}`).join(', ')}`}>
              {sum.byStage.filter(s => s.stage !== 'Won' && s.stage !== 'Lost' && s.value > 0).map((s, i) => <div key={s.stage} title={`${s.stage}: ${formatCompact(s.value)}`} style={{ width: `${(s.value / sum.activeValue) * 100}%`, opacity: 0.35 + i * 0.2 }} className="bg-accent" />)}
            </div>
          )}
        </section>

        <section aria-labelledby="td">
          <Label>Today</Label>
          <p id="td" className="text-2xl font-medium tracking-tight">{todayTasks.length} task{todayTasks.length === 1 ? '' : 's'}{overdue ? <span className="text-danger text-lg font-normal"> · {overdue} overdue</span> : null}</p>
          {todayTasks.length > 0 && (
            <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
              {todayTasks.slice(0, 5).map(t => (
                <li key={t.id}><button className="flex w-full justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-surface-2/60" onClick={() => ui.open('task', t.id)}><span className="truncate">{t.title}</span><span className={isOverdue(t) ? 'text-danger shrink-0' : 'text-muted shrink-0'}>{relativeTime(t.dueDate)}</span></button></li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="ai" className="rounded-2xl bg-accent-soft/60 border border-line p-5">
          <Label>AI insight</Label>
          <p id="ai" className="text-lg leading-snug">“{line}”</p>
          {busy && !insight && <div className="mt-3"><Thinking label="Analyzing your pipeline…" /></div>}
          {insight && <div className="mt-3"><Markdown>{insight}</Markdown></div>}
          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={deeper} disabled={busy}><Sparkles size={14} /> {insight ? 'Refresh' : 'Go deeper'}</Button>
            <Button size="sm" variant="ghost" onClick={() => ui.ask('What should I focus on today?')}>Talk it through <ArrowRight size={14} /></Button>
          </div>
        </section>
      </div>
    </Page>
  )
}
