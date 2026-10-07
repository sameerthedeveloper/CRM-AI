import { useMemo, useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { Col, RecordTable, Toolbar } from '@/components/crm/RecordTable'
import { Button } from '@/components/ui/Button'
import { EmptyState, Page, PageHeader } from '@/components/ui/misc'
import { useData } from '@/hooks/useData'
import { useDebounced } from '@/hooks/useDebounced'
import { useUI } from '@/hooks/useUI'
import { relativeTime } from '@/lib/utils'
import type { Contact } from '@/types/crm'

export default function ContactsPage() {
  const { contacts, companies, loaded } = useData()
  const ui = useUI()
  const [q, setQ] = useState('')
  const dq = useDebounced(q).trim().toLowerCase()
  const co = (id: string | null) => companies.find(c => c.id === id)?.name ?? '—'

  const rows = useMemo(() => contacts.filter(c => !dq || [c.name, c.email, c.role, c.phone, c.tags.join(' '), co(c.companyId)].some(f => f.toLowerCase().includes(dq))), [contacts, dq, companies]) // eslint-disable-line react-hooks/exhaustive-deps

  const cols: Col<Contact>[] = [
    { key: 'name', label: 'Name', primary: true, sort: (a, b) => a.name.localeCompare(b.name), render: c => <span className="font-medium">{c.name}</span> },
    { key: 'company', label: 'Company', sort: (a, b) => co(a.companyId).localeCompare(co(b.companyId)), render: c => co(c.companyId) },
    { key: 'role', label: 'Role', render: c => c.role || '—' },
    { key: 'email', label: 'Email', hideOnMobile: true, render: c => <span className="text-muted">{c.email || '—'}</span> },
    { key: 'last', label: 'Last contact', sort: (a, b) => (a.lastContactedAt ?? 0) - (b.lastContactedAt ?? 0), render: c => <span className="text-muted">{relativeTime(c.lastContactedAt)}</span> },
  ]

  return (
    <Page wide>
      <PageHeader title="Contacts" subtitle={`${contacts.length} people`} actions={<>
        <Button onClick={() => ui.ask('Which contacts haven’t I spoken to recently?')}><Sparkles size={15} /> Ask AI</Button>
        <Button variant="primary" onClick={() => ui.create('contact')}><Plus size={16} /> New contact</Button>
      </>} />
      <Toolbar search={q} onSearch={setQ} placeholder="Search contacts" />
      {!loaded ? null : rows.length === 0
        ? <EmptyState title={contacts.length ? 'No contacts match' : 'No contacts yet'} body={contacts.length ? 'Try a different search.' : 'Contacts are the people behind your companies and deals.'} action={!contacts.length && <Button variant="primary" onClick={() => ui.create('contact')}>New contact</Button>} />
        : <RecordTable label="Contacts" rows={rows} cols={cols} onOpen={c => ui.open('contact', c.id)} initialSort={{ key: 'name', dir: 1 }} />}
    </Page>
  )
}
