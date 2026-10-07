import { NavLink } from 'react-router-dom'
import { Handshake, MessageCircle, Menu, CheckSquare, Users } from 'lucide-react'
import { useUI } from '@/hooks/useUI'
import { cn } from '@/lib/utils'

const items = [
  { to: '/chat', label: 'Chat', icon: MessageCircle },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/deals', label: 'Deals', icon: Handshake },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
]

export function MobileNav() {
  const ui = useUI()
  const cls = (a: boolean) => cn('flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] h-full', a ? 'text-accent font-medium' : 'text-muted')
  return (
    <nav aria-label="Sections" className="shrink-0 h-14 flex border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] box-content">
      {items.map(i => <NavLink key={i.to} to={i.to} className={({ isActive }) => cls(isActive)}><i.icon size={19} strokeWidth={1.8} />{i.label}</NavLink>)}
      <button className={cls(false)} onClick={() => ui.setDrawerOpen(true)} aria-label="More"><Menu size={19} strokeWidth={1.8} />More</button>
    </nav>
  )
}
