import { useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { Check, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { useData } from '@/hooks/useData'
import { cn, humanError } from '@/lib/utils'
import type { Conversation } from '@/types/crm'
import { Wordmark } from './Wordmark'
import { CRM_NAV, SETTINGS_NAV } from './nav'

const link = ({ isActive }: { isActive: boolean }) =>
  cn('flex items-center gap-3 rounded-lg px-2.5 h-9 text-sm transition-colors', isActive ? 'bg-surface-2 text-fg font-medium' : 'text-muted hover:text-fg hover:bg-surface-2/70')

function ConversationRow({ c, active, onNavigate }: { c: Conversation; active: boolean; onNavigate: () => void }) {
  const { store } = useData()
  const toast = useToast()
  const nav = useNavigate()
  const [menu, setMenu] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [title, setTitle] = useState(c.title)
  const [del, setDel] = useState(false)

  const save = async () => {
    const t = title.trim().slice(0, 120)
    setRenaming(false)
    if (!t || t === c.title) return setTitle(c.title)
    try { await store.update('conversations', c.id, { title: t }) } catch (e) { toast.error(humanError(e, 'I couldn’t rename that chat.')) }
  }

  if (renaming) return (
    <form className="flex items-center gap-1 px-1" onSubmit={e => { e.preventDefault(); void save() }}>
      <input autoFocus aria-label="Conversation title" value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Escape' && setRenaming(false)}
        className="min-w-0 flex-1 h-8 rounded-lg border border-line bg-surface px-2 text-sm focus:border-accent focus:outline-none" />
      <Button size="icon" variant="ghost" type="submit" aria-label="Save title" className="h-8 w-8"><Check size={15} /></Button>
    </form>
  )

  return (
    <div className="group relative anim-slide">
      <button onClick={() => { nav(`/chat/${c.id}`); onNavigate() }} aria-current={active ? 'page' : undefined}
        className={cn('w-full text-left truncate rounded-lg pl-2.5 pr-8 h-8 text-[13px]', active ? 'bg-surface-2 text-fg font-medium' : 'text-muted hover:text-fg hover:bg-surface-2/70')}>
        {c.title}
      </button>
      <button aria-label={`Options for ${c.title}`} aria-expanded={menu} onClick={() => setMenu(m => !m)}
        className={cn('absolute right-1 top-1 h-6 w-6 grid place-items-center rounded-md text-muted hover:text-fg hover:bg-line/60', menu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}>
        <MoreHorizontal size={15} />
      </button>
      {menu && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
          <div role="menu" className="absolute right-0 top-8 z-40 w-36 rounded-xl border border-line bg-surface shadow-soft p-1 anim-fade">
            <button role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-2.5 h-8 text-sm hover:bg-surface-2" onClick={() => { setMenu(false); setRenaming(true) }}><Pencil size={14} /> Rename</button>
            <button role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-2.5 h-8 text-sm text-danger hover:bg-surface-2" onClick={() => { setMenu(false); setDel(true) }}><Trash2 size={14} /> Delete</button>
          </div>
        </>
      )}
      <ConfirmDialog open={del} danger title="Delete this conversation?" body={`“${c.title}” will be removed permanently.`} confirmLabel="Delete" onClose={() => setDel(false)}
        onConfirm={async () => { try { await store.remove('conversations', c.id); setDel(false); if (active) nav('/chat') } catch (e) { toast.error(humanError(e, 'I couldn’t delete that chat.')) } }} />
    </div>
  )
}

/** `compact` = icon-only rail (tablet). */
export function Sidebar({ compact, onNavigate = () => {} }: { compact?: boolean; onNavigate?: () => void }) {
  const { conversations } = useData()
  const { id } = useParams()
  const nav = useNavigate()
  const recent = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 12)

  return (
    <nav aria-label="Primary" className={cn('h-full flex flex-col bg-bg border-r border-line', compact ? 'w-16 items-center px-2' : 'w-64 px-3')}>
      <div className={cn('h-14 flex items-center shrink-0', compact ? 'justify-center' : 'px-1.5')}><Wordmark compact={compact} /></div>

      <button onClick={() => { nav('/chat'); onNavigate() }} aria-label="New chat" title="New chat"
        className={cn('flex items-center gap-2.5 rounded-xl border border-line bg-surface hover:bg-surface-2 text-sm font-medium h-10 shadow-soft', compact ? 'w-10 justify-center' : 'px-3 w-full')}>
        <Plus size={16} />{!compact && 'New chat'}
      </button>

      {!compact && (
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto -mx-1 px-1">
          {recent.length > 0 && <p className="px-2.5 mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">Recent</p>}
          <div className="space-y-0.5">{recent.map(c => <ConversationRow key={c.id} c={c} active={c.id === id} onNavigate={onNavigate} />)}</div>
        </div>
      )}
      {compact && <div className="flex-1" />}

      <div className={cn('pt-3 pb-3 border-t border-line mt-3 space-y-0.5', compact && 'w-full')}>
        {!compact && <p className="px-2.5 mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">CRM</p>}
        {[...CRM_NAV, SETTINGS_NAV].map(n => (
          <NavLink key={n.to} to={n.to} className={a => cn(link(a), compact && 'justify-center px-0')} title={n.label} aria-label={compact ? n.label : undefined} onClick={onNavigate}>
            <n.icon size={17} strokeWidth={1.8} />{!compact && n.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
