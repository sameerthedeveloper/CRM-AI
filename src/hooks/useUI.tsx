import { createContext, lazy, Suspense, useContext, useMemo, useState, type ReactNode } from 'react'
import { EntityForm } from '@/components/crm/EntityForm'
import { EntityDetail } from '@/components/crm/EntityDetail'
import { DraftDialog } from '@/components/ai/DraftDialog'
import { useNavigate } from 'react-router-dom'
import type { EntityType } from '@/types/crm'

const CommandPalette = lazy(() => import('@/components/navigation/CommandPalette'))

interface UIApi {
  open(type: EntityType, id: string): void
  create(type: EntityType, defaults?: Record<string, unknown>): void
  edit(type: EntityType, item: { id: string }): void
  draft(type: EntityType, id: string): void
  openPalette(): void
  /** Hand a question to the AI workspace. */
  ask(prompt: string): void
  drawerOpen: boolean
  setDrawerOpen(v: boolean): void
}
const Ctx = createContext<UIApi | null>(null)

type Form = { type: EntityType; item?: { id: string } | null; defaults?: Record<string, unknown> }

/** Hosts the app-wide dialogs so any screen (chat card, palette, table row) can open any record. */
export function UIProvider({ children }: { children: ReactNode }) {
  const [detail, setDetail] = useState<{ type: EntityType; id: string } | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [draft, setDraft] = useState<{ type: EntityType; id: string } | null>(null)
  const [palette, setPalette] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const nav = useNavigate()

  const api = useMemo<UIApi>(() => ({
    open: (type, id) => (type === 'task' ? setForm({ type, item: { id } }) : setDetail({ type, id })),
    create: (type, defaults) => setForm({ type, defaults }),
    edit: (type, item) => setForm({ type, item }),
    draft: (type, id) => setDraft({ type, id }),
    openPalette: () => setPalette(true),
    ask: prompt => nav('/chat', { state: { prompt, at: Date.now() } }),
    drawerOpen, setDrawerOpen,
  }), [drawerOpen, nav])

  return (
    <Ctx.Provider value={api}>
      {children}
      {detail && <EntityDetail key={`${detail.type}:${detail.id}`} {...detail} onClose={() => setDetail(null)} />}
      {form && <EntityForm key={`${form.type}:${form.item?.id ?? 'new'}`} entity={form.type} item={form.item} defaults={form.defaults} onClose={() => setForm(null)} />}
      {draft && <DraftDialog {...draft} onClose={() => setDraft(null)} />}
      {palette && <Suspense fallback={null}><CommandPalette onClose={() => setPalette(false)} /></Suspense>}
    </Ctx.Provider>
  )
}

export function useUI(): UIApi {
  const c = useContext(Ctx)
  if (!c) throw new Error('UIProvider missing')
  return c
}
