import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CheckSquare, CornerDownLeft, Handshake, MessageCircle, Moon, Plus, Search, Settings, Sparkles, UserRound, Users, type LucideIcon } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { useData } from '@/hooks/useData'
import { useDebounced } from '@/hooks/useDebounced'
import { useTheme } from '@/hooks/useTheme'
import { useUI } from '@/hooks/useUI'
import { cn, formatCompact } from '@/lib/utils'
import { ALL_NAV } from './nav'

interface Item { id: string; label: string; hint?: string; group: string; icon: LucideIcon; run: () => void }

export default function CommandPalette({ onClose }: { onClose: () => void }) {
  const data = useData()
  const ui = useUI()
  const nav = useNavigate()
  const { toggle } = useTheme()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const dq = useDebounced(q, 80).trim().toLowerCase()
  const listRef = useRef<HTMLUListElement>(null)

  const go = (fn: () => void) => () => { onClose(); fn() }

  const commands = useMemo<Item[]>(() => [
    { id: 'ask', label: 'Ask AI', hint: 'Open chat', group: 'Actions', icon: Sparkles, run: go(() => nav('/chat')) },
    { id: 'new-lead', label: 'Create lead', group: 'Actions', icon: Plus, run: go(() => ui.create('lead')) },
    { id: 'new-contact', label: 'Create contact', group: 'Actions', icon: Plus, run: go(() => ui.create('contact')) },
    { id: 'new-company', label: 'Create company', group: 'Actions', icon: Plus, run: go(() => ui.create('company')) },
    { id: 'new-deal', label: 'Create deal', group: 'Actions', icon: Plus, run: go(() => ui.create('deal')) },
    { id: 'new-task', label: 'Create task', group: 'Actions', icon: Plus, run: go(() => ui.create('task')) },
    { id: 'pipeline', label: 'Open pipeline', group: 'Actions', icon: Handshake, run: go(() => nav('/deals')) },
    { id: 'theme', label: 'Toggle dark mode', group: 'Actions', icon: Moon, run: go(toggle) },
    ...ALL_NAV.map(n => ({ id: `nav-${n.to}`, label: `Go to ${n.label}`, hint: `G ${n.key.toUpperCase()}`, group: 'Navigate', icon: n.to === '/settings' ? Settings : n.icon, run: go(() => nav(n.to)) })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [])

  const items = useMemo<Item[]>(() => {
    if (!dq) return commands
    const m = (...s: (string | undefined)[]) => s.some(x => x?.toLowerCase().includes(dq))
    const cmd = commands.filter(c => m(c.label))
    const rec: Item[] = [
      ...data.leads.filter(l => m(l.name, l.company, l.email)).slice(0, 5).map(l => ({ id: `l${l.id}`, label: l.name, hint: `${l.status} · ${formatCompact(l.value)}`, group: 'Leads', icon: Users, run: go(() => ui.open('lead', l.id)) })),
      ...data.contacts.filter(c => m(c.name, c.email, c.role)).slice(0, 5).map(c => ({ id: `c${c.id}`, label: c.name, hint: c.role, group: 'Contacts', icon: UserRound, run: go(() => ui.open('contact', c.id)) })),
      ...data.companies.filter(c => m(c.name, c.industry)).slice(0, 4).map(c => ({ id: `co${c.id}`, label: c.name, hint: c.industry, group: 'Companies', icon: Building2, run: go(() => ui.open('company', c.id)) })),
      ...data.deals.filter(d => m(d.name)).slice(0, 4).map(d => ({ id: `d${d.id}`, label: d.name, hint: `${d.stage} · ${formatCompact(d.value)}`, group: 'Deals', icon: Handshake, run: go(() => ui.open('deal', d.id)) })),
      ...data.tasks.filter(t => m(t.title)).slice(0, 4).map(t => ({ id: `t${t.id}`, label: t.title, hint: t.status, group: 'Tasks', icon: CheckSquare, run: go(() => ui.open('task', t.id)) })),
      ...data.conversations.filter(c => m(c.title)).slice(0, 4).map(c => ({ id: `cv${c.id}`, label: c.title, group: 'Conversations', icon: MessageCircle, run: go(() => nav(`/chat/${c.id}`)) })),
    ]
    return [...rec, ...cmd]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq, commands, data.leads, data.contacts, data.companies, data.deals, data.tasks, data.conversations])

  useEffect(() => setIdx(0), [dq])
  useEffect(() => { listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }) }, [idx])

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); items[idx]?.run() }
  }

  let last = ''
  return (
    <Dialog open onClose={onClose} variant="palette" width="max-w-xl" title={undefined}>
      <div onKeyDown={onKey}>
        <div className="flex items-center gap-3 px-4 h-14 border-b border-line">
          <Search size={18} className="text-muted shrink-0" aria-hidden />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search leads, contacts, deals… or run a command"
            role="combobox" aria-expanded aria-controls="palette-list" aria-activedescendant={items[idx] ? `pi-${items[idx].id}` : undefined} aria-label="Search CRM"
            className="flex-1 bg-transparent outline-none text-base placeholder:text-muted" />
        </div>
        <ul id="palette-list" role="listbox" ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">Nothing matches “{q}”. Try asking the AI instead.</li>}
          {items.map((it, i) => {
            const header = it.group !== last ? it.group : null
            last = it.group
            return (
              <li key={it.id} role="presentation">
                {header && <p className="px-3 pt-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted">{header}</p>}
                <button id={`pi-${it.id}`} role="option" aria-selected={i === idx} onMouseMove={() => setIdx(i)} onClick={it.run}
                  className={cn('flex w-full items-center gap-3 rounded-lg px-3 h-10 text-sm text-left', i === idx ? 'bg-surface-2' : '')}>
                  <it.icon size={16} className="text-muted shrink-0" />
                  <span className="truncate flex-1">{it.label}</span>
                  {it.hint && <span className="text-xs text-muted truncate max-w-[40%]">{it.hint}</span>}
                  {i === idx && <CornerDownLeft size={13} className="text-muted shrink-0" />}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </Dialog>
  )
}
