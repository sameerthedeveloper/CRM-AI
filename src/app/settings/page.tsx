import { useEffect, useState } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { Kbd, Page, PageHeader } from '@/components/ui/misc'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/hooks/useAuth'
import { useData } from '@/hooks/useData'
import { useTheme, type ThemePref } from '@/hooks/useTheme'
import { ai, type AiPref } from '@/lib/ai'
import { seedDemoData } from '@/lib/crm/seed'
import { humanError } from '@/lib/utils'
import type { CollectionName } from '@/types/crm'
import { ALL_NAV } from '@/components/navigation/nav'

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="py-7 border-t border-line first:border-0 first:pt-0"><h2 className="text-base font-semibold mb-4">{title}</h2><div className="space-y-4">{children}</div></section>
)

export default function SettingsPage() {
  const { pref, setPref } = useTheme()
  const { user, service } = useAuth()
  const data = useData()
  const toast = useToast()
  const [aiPref, setAiPref] = useState<AiPref>(ai.getPref())
  const [model, setModel] = useState(ai.getModel())
  const [remote, setRemote] = useState<'checking' | 'up' | 'down'>('checking')
  const [busy, setBusy] = useState(false)
  const [wipe, setWipe] = useState(false)

  useEffect(() => { let on = true; ai.remoteAvailable().then(ok => on && setRemote(ok ? 'up' : 'down')); return () => { on = false } }, [])

  const seed = async () => {
    setBusy(true)
    try { await seedDemoData(data.store, data.crm); toast.show('Sample data added') } catch (e) { toast.error(humanError(e, 'I couldn’t add the sample data.')) } finally { setBusy(false) }
  }
  const clear = async () => {
    setBusy(true)
    try {
      const names: CollectionName[] = ['leads', 'contacts', 'companies', 'deals', 'tasks', 'activities', 'notes']
      for (const n of names) for (const r of await data.store.list(n)) await data.store.remove(n, r.id)
      toast.show('CRM data deleted'); setWipe(false)
    } catch (e) { toast.error(humanError(e, 'I couldn’t delete everything. Some records may remain.')) } finally { setBusy(false) }
  }

  return (
    <Page>
      <PageHeader title="Settings" />
      <Section title="Appearance">
        <Field label="Theme">{id => <Select id={id} value={pref} onChange={e => setPref(e.target.value as ThemePref)}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></Select>}</Field>
      </Section>

      <Section title="AI">
        <Field label="Provider" hint={aiPref === 'local' ? 'Runs on simple built-in rules. Works offline.' : remote === 'checking' ? 'Checking Puter…' : remote === 'up' ? 'Puter.js is reachable.' : 'Puter.js is not reachable — the offline assistant will answer.'}>
          {id => <Select id={id} value={aiPref} onChange={e => { const v = e.target.value as AiPref; setAiPref(v); ai.setPref(v) }}>
            <option value="auto">Automatic (Puter, offline fallback)</option><option value="puter">Puter only</option><option value="local">Offline assistant only</option></Select>}
        </Field>
        <Field label="Model (optional)" hint="Leave blank for Puter’s default model.">
          {id => <Input id={id} value={model} placeholder="e.g. claude-sonnet-4-5" onChange={e => setModel(e.target.value)} onBlur={() => ai.setModel(model)} />}
        </Field>
        <p className="text-sm text-muted">The AI can only use whitelisted CRM tools, and every change it proposes needs your confirmation.</p>
      </Section>

      <Section title="Data">
        <p className="text-sm text-muted">Storage: {data.store.kind === 'firestore' ? 'Firebase Firestore (synced, private to your account)' : 'this browser only (demo mode — add Firebase keys in .env to sync)'}.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={seed} disabled={busy}>Add sample data</Button>
          <Button variant="ghost" className="text-danger" onClick={() => setWipe(true)} disabled={busy}>Delete all CRM data</Button>
        </div>
      </Section>

      <Section title="Account">
        <p className="text-sm">{user?.name ? `${user.name} · ` : ''}{user?.email}</p>
        <Button onClick={() => void service.signOut()}>Sign out</Button>
      </Section>

      <Section title="Keyboard shortcuts">
        <ul className="text-sm space-y-2">
          <li className="flex justify-between"><span>Search / command palette</span><span className="flex gap-1"><Kbd>Ctrl/⌘</Kbd><Kbd>K</Kbd></span></li>
          {ALL_NAV.map(n => <li key={n.to} className="flex justify-between"><span>Go to {n.label}</span><span className="flex gap-1"><Kbd>G</Kbd><Kbd>{n.key.toUpperCase()}</Kbd></span></li>)}
        </ul>
      </Section>

      <ConfirmDialog open={wipe} danger busy={busy} title="Delete all CRM data?" confirmLabel="Delete everything" onClose={() => setWipe(false)} onConfirm={clear}
        body="Leads, contacts, companies, deals, tasks, notes and activity will be removed permanently. Conversations are kept." />
    </Page>
  )
}
