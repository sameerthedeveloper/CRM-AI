import { useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Markdown from '@/components/ui/LazyMarkdown'
import { Thinking } from '@/components/ui/misc'
import { ai } from '@/lib/ai'
import { SUMMARY_SYSTEM } from '@/lib/ai/prompts'
import { buildFacts, entityTitle, findEntity } from '@/lib/crm/facts'
import { recommendedAction } from '@/lib/crm/insights'
import { useData } from '@/hooks/useData'
import { formatCurrency } from '@/lib/utils'
import type { EntityType, Lead } from '@/types/crm'

export function AiSummary({ type, id }: { type: EntityType; id: string }) {
  const data = useData()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = useRef(0)

  async function generate() {
    const rec = findEntity(data, type, id)
    if (!rec) return
    const my = ++run.current
    setBusy(true); setText(''); setError('')
    const facts = buildFacts(data, type, id)
    const fallback = () => {
      const l = rec as Lead
      return `**${entityTitle(type, rec)}**\n\n${facts.split('\n').slice(0, 10).map(x => `- ${x}`).join('\n')}${type === 'lead' ? `\n\n**Recommended action:** ${recommendedAction(l)}\n\nOpportunity: ${formatCurrency(l.value)}` : ''}`
    }
    try {
      let acc = ''
      for await (const chunk of ai.generate(`Summarize this ${type}.\n\n${facts}`, { system: SUMMARY_SYSTEM, fallback })) {
        if (my !== run.current) return
        acc += chunk; setText(acc)
      }
    } catch {
      setError('I couldn’t generate a summary right now. The CRM data above is still up to date.')
    } finally { if (my === run.current) setBusy(false) }
  }

  return (
    <section aria-label="AI summary" className="rounded-2xl border border-line bg-surface-2/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium flex items-center gap-2"><Sparkles size={15} className="text-accent" /> AI summary</h3>
        <Button size="sm" onClick={generate} disabled={busy}>{text ? 'Refresh' : 'Summarize'}</Button>
      </div>
      {busy && !text && <div className="mt-3"><Thinking label="Reading the history…" /></div>}
      {text && <div className="mt-3 text-[15px]"><Markdown>{text}</Markdown></div>}
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      {!text && !busy && !error && <p className="mt-2 text-sm text-muted">Get a summary and a suggested next step.</p>}
    </section>
  )
}
