import { formatCurrency, relativeTime } from '@/lib/utils'
import type { Company, Contact, Deal, EntityType, Lead, Task } from '@/types/crm'
import { findEntity, type CrmData } from './facts'
import { recommendedAction } from './insights'

export interface RecordView {
  title: string
  company?: string
  value?: string
  lastActivity: string
  status: string
  action: string
}

/** Uniform summary used by chat record cards. */
export function describeRecord(data: CrmData, type: EntityType, id: string): RecordView | null {
  const rec = findEntity(data, type, id)
  if (!rec) return null
  const companyName = (cid: string | null) => data.companies.find(c => c.id === cid)?.name
  const lastAct = (rid: string, fallback: number | null) => {
    const ts = Math.max(fallback ?? 0, ...data.activities.filter(a => a.relatedId === rid && a.type !== 'system').map(a => a.createdAt))
    return ts ? relativeTime(ts) : 'none yet'
  }
  switch (type) {
    case 'lead': { const l = rec as Lead; return { title: l.name, company: l.company, value: formatCurrency(l.value), lastActivity: lastAct(l.id, l.lastContactedAt), status: l.status, action: recommendedAction(l) } }
    case 'contact': { const c = rec as Contact; return { title: c.name, company: companyName(c.companyId), lastActivity: lastAct(c.id, c.lastContactedAt), status: c.role || 'Contact', action: 'Send a quick check-in.' } }
    case 'company': return { title: (rec as Company).name, company: (rec as Company).industry, lastActivity: lastAct(rec.id, null), status: 'Company', action: 'Review open deals and contacts.' }
    case 'deal': { const d = rec as Deal; return { title: d.name, company: companyName(d.companyId), value: formatCurrency(d.value), lastActivity: lastAct(d.id, d.updatedAt), status: d.stage, action: d.stage === 'Won' || d.stage === 'Lost' ? 'No action needed.' : 'Move the next step forward.' } }
    case 'task': { const t = rec as Task; return { title: t.title, lastActivity: t.dueDate ? `due ${relativeTime(t.dueDate)}` : 'no due date', status: t.status, action: t.status === 'Completed' ? 'Done.' : 'Complete or reschedule.' } }
  }
}
