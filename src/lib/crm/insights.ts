import { DAY, daysSince, formatCompact, relativeTime, startOfDay } from '@/lib/utils'
import type { Activity, Deal, Lead, Task } from '@/types/crm'

export const isOpenLead = (l: Lead) => l.status !== 'Won' && l.status !== 'Lost'
export const isOpenDeal = (d: Deal) => d.stage !== 'Won' && d.stage !== 'Lost'

/** Days since we last touched a lead (falls back to creation date). */
export function quietDays(l: Lead, now = Date.now()): number {
  return daysSince(l.lastContactedAt ?? l.createdAt, now) ?? 0
}

export interface FollowUp {
  lead: Lead
  score: number
  reasons: string[]
  action: string
}

export function recommendedAction(l: Lead, now = Date.now()): string {
  const quiet = quietDays(l, now)
  const overdue = !!l.nextFollowUpAt && startOfDay(l.nextFollowUpAt) < startOfDay(now)
  switch (l.status) {
    case 'New': return 'Send a short intro message today.'
    case 'Contacted': return quiet >= 7 ? 'Re-engage with a helpful nudge.' : 'Wait for a reply, then qualify.'
    case 'Qualified': return 'Share a proposal or book a call.'
    case 'Proposal': return overdue || quiet >= 5 ? 'Follow up on the proposal within 24 hours.' : 'Check if they have questions.'
    case 'Negotiation': return 'Resolve open objections and ask for a close date.'
    default: return 'No action needed.'
  }
}

export function leadFollowUps(leads: Lead[], now = Date.now()): FollowUp[] {
  const out: FollowUp[] = []
  for (const lead of leads.filter(isOpenLead)) {
    let score = 0
    const reasons: string[] = []
    const quiet = quietDays(lead, now)
    if (lead.nextFollowUpAt && startOfDay(lead.nextFollowUpAt) <= startOfDay(now)) {
      score += 3
      reasons.push(startOfDay(lead.nextFollowUpAt) < startOfDay(now) ? 'follow-up overdue' : 'follow-up due today')
    }
    if (quiet >= 7) { score += 2; reasons.push(`no contact in ${quiet}d`) }
    else if (quiet >= 4) { score += 1; reasons.push(`quiet for ${quiet}d`) }
    if (lead.priority === 'High') { score += 2; reasons.push('high priority') }
    if (lead.value >= 50_000) { score += 1; reasons.push(`worth ${formatCompact(lead.value)}`) }
    if (['Qualified', 'Proposal', 'Negotiation'].includes(lead.status)) { score += 1; reasons.push(`in ${lead.status.toLowerCase()}`) }
    if (score >= 3) out.push({ lead, score, reasons, action: recommendedAction(lead, now) })
  }
  return out.sort((a, b) => b.score - a.score || b.lead.value - a.lead.value)
}

export interface PipelineSummary {
  activeCount: number
  activeValue: number
  weightedValue: number
  wonValue: number
  lostValue: number
  byStage: { stage: string; count: number; value: number }[]
  thisMonth: { created: number; value: number }
  lastMonth: { created: number; value: number }
}

export function pipelineSummary(deals: Deal[], now = Date.now()): PipelineSummary {
  const open = deals.filter(isOpenDeal)
  const stages = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']
  const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const prevStart = new Date(monthStart); prevStart.setMonth(prevStart.getMonth() - 1)
  const inRange = (d: Deal, a: number, b: number) => d.createdAt >= a && d.createdAt < b
  const sum = (ds: Deal[]) => ({ created: ds.length, value: ds.reduce((s, d) => s + d.value, 0) })
  return {
    activeCount: open.length,
    activeValue: open.reduce((s, d) => s + d.value, 0),
    weightedValue: Math.round(open.reduce((s, d) => s + (d.value * d.probability) / 100, 0)),
    wonValue: deals.filter(d => d.stage === 'Won').reduce((s, d) => s + d.value, 0),
    lostValue: deals.filter(d => d.stage === 'Lost').reduce((s, d) => s + d.value, 0),
    byStage: stages.map(stage => {
      const ds = deals.filter(d => d.stage === stage)
      return { stage, count: ds.length, value: ds.reduce((s, d) => s + d.value, 0) }
    }),
    thisMonth: sum(deals.filter(d => inRange(d, monthStart.getTime(), Infinity))),
    lastMonth: sum(deals.filter(d => inRange(d, prevStart.getTime(), monthStart.getTime()))),
  }
}

export function dealRisk(d: Deal, activities: Activity[], now = Date.now()): string | null {
  if (!isOpenDeal(d)) return null
  if (d.expectedCloseDate && startOfDay(d.expectedCloseDate) < startOfDay(now)) return 'expected close date passed'
  const last = Math.max(d.updatedAt, ...activities.filter(a => a.relatedType === 'deal' && a.relatedId === d.id).map(a => a.createdAt))
  const quiet = Math.floor((now - last) / DAY)
  if (quiet >= 7) return `no activity in ${quiet}d`
  return null
}

export const isOverdue = (t: Task, now = Date.now()) =>
  t.status !== 'Completed' && !!t.dueDate && startOfDay(t.dueDate) < startOfDay(now)

export const isDueToday = (t: Task, now = Date.now()) =>
  t.status !== 'Completed' && !!t.dueDate && startOfDay(t.dueDate) === startOfDay(now)

/** One-line deterministic insight used by the dashboard and as an offline fallback. */
export function quickInsight(leads: Lead[], deals: Deal[], activities: Activity[], now = Date.now()): string {
  const quietHigh = leads.filter(l => isOpenLead(l) && l.value >= 50_000 && quietDays(l, now) >= 5)
  const risky = deals.filter(d => dealRisk(d, activities, now))
  if (quietHigh.length)
    return `${quietHigh.length} high-value ${quietHigh.length === 1 ? 'opportunity has' : 'opportunities have'} gone quiet: ${quietHigh.slice(0, 2).map(l => l.name).join(', ')}.`
  if (risky.length) return `${risky.length} open ${risky.length === 1 ? 'deal looks' : 'deals look'} at risk. Start with ${risky[0].name} (${dealRisk(risky[0], activities, now)}).`
  if (!leads.length && !deals.length) return 'Your CRM is empty. Tell me about a lead and I’ll add it.'
  return 'Nothing is slipping. Keep your follow-ups on schedule.'
}

export const lastTouch = (l: Lead) => relativeTime(l.lastContactedAt)
