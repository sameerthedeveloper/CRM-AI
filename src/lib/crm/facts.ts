import { formatCurrency, formatDate, relativeTime } from '@/lib/utils'
import type { Activity, Company, Contact, Deal, EntityType, Lead, Note, Task } from '@/types/crm'

export interface CrmData {
  leads: Lead[]; contacts: Contact[]; companies: Company[]; deals: Deal[]
  tasks: Task[]; activities: Activity[]; notes: Note[]
}

type Rec = Lead | Contact | Company | Deal | Task

const COLL = { lead: 'leads', contact: 'contacts', company: 'companies', deal: 'deals', task: 'tasks' } as const

export const findEntity = (data: CrmData, type: EntityType, id: string): Rec | undefined =>
  (data[COLL[type]] as Rec[]).find(r => r.id === id)

export const entityTitle = (type: EntityType, r: Rec): string =>
  type === 'task' ? (r as Task).title : (r as Lead).name

export function related(data: CrmData, type: EntityType, id: string) {
  const tasks = data.tasks.filter(t =>
    type === 'lead' ? t.relatedLead === id : type === 'contact' ? t.relatedContact === id : type === 'company' ? t.relatedCompany === id : false)
  const activities = type === 'task' ? [] : data.activities.filter(a => a.relatedType === type && a.relatedId === id)
  const notes = type === 'task' ? [] : data.notes.filter(n => n.relatedType === type && n.relatedId === id)
  const deals = type === 'company' ? data.deals.filter(d => d.companyId === id) : type === 'contact' ? data.deals.filter(d => d.contactId === id) : []
  const contacts = type === 'company' ? data.contacts.filter(c => c.companyId === id) : []
  return { tasks, activities, notes, deals, contacts }
}

/** Plain-text fact sheet fed to the AI (and used for offline summaries). */
export function buildFacts(data: CrmData, type: EntityType, id: string): string {
  const rec = findEntity(data, type, id)
  if (!rec) return ''
  const rel = related(data, type, id)
  const lines: string[] = []
  const r = rec as unknown as Record<string, unknown>
  const dateKeys = ['lastContactedAt', 'nextFollowUpAt', 'expectedCloseDate', 'dueDate', 'createdAt']
  for (const [k, v] of Object.entries(r)) {
    if (k === 'id' || k === 'updatedAt' || v === '' || v === null || v === undefined) continue
    lines.push(`${k}: ${dateKeys.includes(k) ? `${formatDate(v as number)} (${relativeTime(v as number)})` : k === 'value' ? formatCurrency(v as number) : Array.isArray(v) ? v.join(', ') : v}`)
  }
  if (rel.deals.length) lines.push('Deals: ' + rel.deals.map(d => `${d.name} ${formatCurrency(d.value)} ${d.stage}`).join('; '))
  if (rel.contacts.length) lines.push('Contacts: ' + rel.contacts.map(c => `${c.name}${c.role ? ` (${c.role})` : ''}`).join('; '))
  if (rel.tasks.length) lines.push('Tasks: ' + rel.tasks.map(t => `${t.title} [${t.status}${t.dueDate ? `, due ${formatDate(t.dueDate)}` : ''}]`).join('; '))
  const acts = [...rel.activities].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8)
  if (acts.length) lines.push('Recent activity:\n' + acts.map(a => `- ${formatDate(a.createdAt)} ${a.type}: ${a.summary}`).join('\n'))
  const notes = [...rel.notes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)
  if (notes.length) lines.push('Notes:\n' + notes.map(n => `- ${n.body}`).join('\n'))
  return lines.join('\n')
}
