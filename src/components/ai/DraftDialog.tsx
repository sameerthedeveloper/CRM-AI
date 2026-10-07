import { useEffect, useRef, useState } from 'react'
import { Copy } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Select } from '@/components/ui/Field'
import { Thinking } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { ai } from '@/lib/ai'
import { draftText } from '@/lib/ai/local-provider'
import { DRAFT_SYSTEM } from '@/lib/ai/prompts'
import { buildFacts, entityTitle, findEntity } from '@/lib/crm/facts'
import { useData } from '@/hooks/useData'
import type { EntityType } from '@/types/crm'

const CHANNELS = ['WhatsApp', 'Email', 'SMS'] as const

export function DraftDialog({ type, id, onClose }: { type: EntityType; id: string; onClose: () => void }) {
  const data = useData()
  const toast = useToast()
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>('WhatsApp')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const run = useRef(0)
  const rec = findEntity(data, type, id)

  async function generate(ch = channel) {
    if (!rec) return
    const my = ++run.current
    setBusy(true); setText('')
    const fallback = () => draftText(ch.toLowerCase(), { name: entityTitle(type, rec), company: (rec as { company?: string }).company ?? '' })
    try {
      let acc = ''
      const prompt = `Write a ${ch} message to follow up with ${entityTitle(type, rec)}. Mention their situation briefly and propose one clear next step.\n\n${buildFacts(data, type, id)}`
      for await (const c of ai.generate(prompt, { system: DRAFT_SYSTEM, fallback })) { if (my !== run.current) return; acc += c; setText(acc) }
    } catch { toast.error('I couldn’t draft that right now. Please try again.') }
    finally { if (my === run.current) setBusy(false) }
  }

  useEffect(() => { void generate() /* eslint-disable-next-line */ }, [])

  return (
    <Dialog open onClose={onClose} title={`Draft message${rec ? ` · ${entityTitle(type, rec)}` : ''}`} width="max-w-xl"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Close</Button>
        <Button disabled={!text || busy} onClick={async () => { try { await navigator.clipboard.writeText(text); toast.show('Copied') } catch { toast.error('Copy failed — select the text and copy manually.') } }}><Copy size={15} /> Copy</Button>
      </>}>
      <div className="flex items-center gap-2 mb-3">
        <Select aria-label="Channel" className="w-36" value={channel} onChange={e => { const c = e.target.value as typeof channel; setChannel(c); void generate(c) }}>
          {CHANNELS.map(c => <option key={c}>{c}</option>)}
        </Select>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => generate()}>Regenerate</Button>
      </div>
      {busy && !text && <Thinking label="Drafting…" />}
      <textarea aria-label="Message draft" value={text} onChange={e => setText(e.target.value)} rows={9}
        className="w-full rounded-xl border border-line bg-surface p-3.5 text-[15px] leading-relaxed focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20" />
    </Dialog>
  )
}
