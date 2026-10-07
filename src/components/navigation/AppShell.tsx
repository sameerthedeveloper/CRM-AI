import { Suspense, useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Dialog } from '@/components/ui/Dialog'
import { Spinner } from '@/components/ui/misc'
import { useBreakpoint } from '@/hooks/useBreakpoint'
import { useUI } from '@/hooks/useUI'
import { MobileNav } from './MobileNav'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ALL_NAV } from './nav'

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

export function AppShell() {
  const bp = useBreakpoint()
  const ui = useUI()
  const nav = useNavigate()
  const loc = useLocation()
  const chord = useRef<number | null>(null)

  // Close drawer on navigation.
  useEffect(() => ui.setDrawerOpen(false), [loc.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard: Ctrl/Cmd+K palette; "g" then a letter navigates (Linear-style).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ui.openPalette(); return }
      if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('dialog[open]')) return
      if (chord.current && Date.now() - chord.current < 1200) {
        const hit = ALL_NAV.find(n => n.key === e.key.toLowerCase())
        chord.current = null
        if (hit) { e.preventDefault(); nav(hit.to) }
        return
      }
      if (e.key.toLowerCase() === 'g') chord.current = Date.now()
      else if (e.key === '/') { e.preventDefault(); ui.openPalette() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav, ui])

  return (
    <div className="h-dvh flex bg-bg text-fg">
      {bp !== 'mobile' && <aside className="shrink-0"><Sidebar compact={bp === 'tablet'} /></aside>}
      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar mobile={bp === 'mobile'} />
        <main id="main" className="flex-1 min-h-0 overflow-y-auto">
          <Suspense fallback={<div className="grid place-items-center h-64"><Spinner /></div>}><Outlet /></Suspense>
        </main>
        {bp === 'mobile' && <MobileNav />}
      </div>
      {bp === 'mobile' && (
        <Dialog open={ui.drawerOpen} onClose={() => ui.setDrawerOpen(false)} variant="drawer" label="Menu">
          <Sidebar fluid onNavigate={() => ui.setDrawerOpen(false)} />
        </Dialog>
      )}
    </div>
  )
}
