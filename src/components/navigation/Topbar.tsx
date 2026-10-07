import { useState } from 'react'
import { Menu, Moon, Search, Sun, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Kbd } from '@/components/ui/misc'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useUI } from '@/hooks/useUI'
import { cn, initials } from '@/lib/utils'
import { Wordmark } from './Wordmark'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export function Topbar({ mobile }: { mobile: boolean }) {
  const ui = useUI()
  const { user, service } = useAuth()
  const { toggle } = useTheme()
  const [menu, setMenu] = useState(false)
  const dark = document.documentElement.classList.contains('dark')

  return (
    <header className="h-14 shrink-0 flex items-center gap-2 px-3 md:px-5 border-b border-line bg-bg/80 backdrop-blur">
      {mobile && (
        <>
          <Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => ui.setDrawerOpen(true)}><Menu size={19} /></Button>
          <Wordmark compact />
        </>
      )}
      <button onClick={ui.openPalette} aria-label="Search CRM" aria-keyshortcuts="Control+K Meta+K"
        className={cn('flex items-center gap-2.5 h-9 rounded-xl border border-line bg-surface text-sm text-muted hover:bg-surface-2', mobile ? 'ml-auto w-9 justify-center' : 'w-full max-w-sm px-3')}>
        <Search size={15} />
        {!mobile && <><span className="flex-1 text-left">Search CRM</span><span className="flex gap-1"><Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd><Kbd>K</Kbd></span></>}
      </button>
      <div className={cn('flex items-center gap-1', !mobile && 'ml-auto')}>
        <Button variant="ghost" size="icon" aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggle}>{dark ? <Sun size={18} /> : <Moon size={18} />}</Button>
        <div className="relative">
          <button aria-label="Account menu" aria-expanded={menu} onClick={() => setMenu(m => !m)}
            className="h-8 w-8 rounded-full bg-accent-soft text-accent text-xs font-semibold grid place-items-center hover:opacity-80">{initials(user?.name ?? user?.email)}</button>
          {menu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenu(false)} />
              <div role="menu" className="absolute right-0 top-10 z-40 w-60 rounded-xl border border-line bg-surface shadow-soft p-1 anim-fade">
                <div className="px-3 py-2"><p className="text-sm font-medium truncate">{user?.name ?? 'Account'}</p><p className="text-xs text-muted truncate">{user?.email}</p>{service.mode === 'demo' && <p className="text-xs text-muted mt-1">Demo mode · saved in this browser</p>}</div>
                <button role="menuitem" className="flex w-full items-center gap-2 rounded-lg px-3 h-9 text-sm hover:bg-surface-2" onClick={() => void service.signOut()}><LogOut size={15} /> Sign out</button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
