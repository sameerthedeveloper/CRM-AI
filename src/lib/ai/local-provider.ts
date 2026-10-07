import { formatCompact, formatCurrency, relativeTime } from '@/lib/utils'
import type { AiMessage, AiProvider } from './types'

/**
 * Offline assistant. Speaks the same tool-call protocol as the remote model, but plans with simple
 * language rules. It keeps the AI workspace useful when Puter is unreachable — and makes the
 * tool/confirmation pipeline testable without a network.
 */

type Row = Record<string, any>
interface Result { tool: string; ok: boolean; result?: any; error?: string }

const call = (say: string, calls: { tool: string; args: object }[]) => JSON.stringify({ say, calls })
const done = (text: string, records: { entity: string; id: string; note?: string }[] = []) =>
  records.length ? `${text}\n<records>${JSON.stringify(records.slice(0, 8))}</records>` : text

const iso = (offset: number) => {
  const d = new Date(); d.setDate(d.getDate() + offset)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function parseMoney(s: string): number | null {
  const m = /(?:₹|rs\.?\s*|inr\s*)?(\d[\d,]*(?:\.\d+)?)\s*(k|l|lac|lakh|lakhs|cr|crore)?\b/i.exec(s)
  if (!m) return null
  const n = parseFloat(m[1].replace(/,/g, ''))
  const u = (m[2] ?? '').toLowerCase()
  const mult = u === 'k' ? 1e3 : ['l', 'lac', 'lakh', 'lakhs'].includes(u) ? 1e5 : ['cr', 'crore'].includes(u) ? 1e7 : 1
  return Math.round(n * mult)
}

function parseWhen(s: string): string | undefined {
  const l = s.toLowerCase()
  const iso8601 = /\b(\d{4}-\d{2}-\d{2})\b/.exec(l)
  if (iso8601) return iso8601[1]
  if (/day after tomorrow/.test(l)) return iso(2)
  if (/tomorrow/.test(l)) return iso(1)
  if (/today/.test(l)) return iso(0)
  if (/next week/.test(l)) return iso(7)
  const n = /in (\d+) days?/.exec(l)
  return n ? iso(Number(n[1])) : undefined
}

const clean = (s: string) =>
  s.replace(/\b(the|my|this|a|an)\s+/gi, ' ').replace(/\b(lead|customer|contact|deal|company)\s+/i, '').replace(/['’]s\b.*$/, '').replace(/[?.!]+$/, '').trim()

const STATUS = 'new|contacted|qualified|proposal|negotiation|won|lost'
const cap = (s: string) => s[0].toUpperCase() + s.slice(1).toLowerCase()

function table(headers: string[], rows: string[][]) {
  return [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`, ...rows.map(r => `| ${r.join(' | ')} |`)].join('\n')
}
const leadTable = (items: Row[]) =>
  table(['Name', 'Company', 'Status', 'Value', 'Last contact'], items.map(l => [l.name, l.company || '—', l.status, formatCurrency(l.value), l.lastContactedAt ? relativeTime(Date.parse(l.lastContactedAt)) : 'never']))
const recs = (items: Row[], note?: (r: Row) => string | undefined) => items.slice(0, 8).map(r => ({ entity: 'lead', id: r.id, note: note?.(r) }))

type Intent =
  | { k: 'createLead'; name: string; value?: number }
  | { k: 'createTask'; title: string; due?: string }
  | { k: 'followUpTasks' }
  | { k: 'setStatus'; name: string; status: string }
  | { k: 'delete'; what: 'lead' | 'contact'; name: string }
  | { k: 'followUps' }
  | { k: 'pipeline' }
  | { k: 'atRisk' }
  | { k: 'valueAbove'; min: number }
  | { k: 'stale'; days: number }
  | { k: 'best' }
  | { k: 'overdueTasks' }
  | { k: 'changes' }
  | { k: 'draft'; channel: string; name?: string }
  | { k: 'summary'; name: string }
  | { k: 'list'; what: 'leads' | 'contacts' | 'companies' | 'deals' | 'tasks' }
  | { k: 'help' }

function classify(q: string): Intent {
  const t = q.trim()
  const l = t.toLowerCase()
  let m: RegExpExecArray | null

  if ((m = /^(?:please\s+)?(?:create|add|new)\s+(?:a\s+|an\s+)?lead\s+(?:called|named|for)?\s*(.+)$/i.exec(t))) {
    const v = /\b(?:worth|value of|valued at|of)\s+(.+)$/i.exec(m[1])
    const name = m[1].replace(/\b(?:worth|value of|valued at)\s+.+$/i, '').trim()
    return { k: 'createLead', name, value: v ? parseMoney(v[1]) ?? undefined : undefined }
  }
  if (/(create|add|make).*follow.?up tasks?/.test(l)) return { k: 'followUpTasks' }
  if ((m = /^(?:please\s+)?(?:create|add|make)\s+(?:a\s+)?task\s+(?:to\s+|for\s+)?(.+)$/i.exec(t))) {
    const due = parseWhen(m[1])
    const title = m[1].replace(/\b(tomorrow|today|next week|day after tomorrow|in \d+ days?|on\s+\d{4}-\d{2}-\d{2}|\d{4}-\d{2}-\d{2})\b/gi, '').replace(/\s+/g, ' ').trim()
    return { k: 'createTask', title: title.charAt(0).toUpperCase() + title.slice(1), due }
  }
  if ((m = new RegExp(`(?:change|move|mark|set|update)\\s+(.+?)\\s+(?:to|as|→)\\s+(${STATUS})\\b`, 'i').exec(t)))
    return { k: 'setStatus', name: clean(m[1]), status: cap(m[2]) }
  if ((m = /^(?:please\s+)?(?:delete|remove)\s+(?:the\s+)?(lead|contact)\s+(.+)$/i.exec(t)))
    return { k: 'delete', what: m[1].toLowerCase() as 'lead' | 'contact', name: clean(m[2]) }
  if (/draft|write.*(message|email|whatsapp)|compose/.test(l)) {
    const channel = /whatsapp/.test(l) ? 'whatsapp' : /sms/.test(l) ? 'sms' : 'email'
    const who = /(?:for|to)\s+(?!my latest|the latest|this|latest)(.+?)[?.!]*$/i.exec(t)
    return { k: 'draft', channel, name: who ? clean(who[1]) : undefined }
  }
  if (/(at.risk|risky|stuck|slipping)/.test(l) && /deal/.test(l)) return { k: 'atRisk' }
  if (/pipeline|compare.*(month|pipeline)/.test(l)) return { k: 'pipeline' }
  if ((m = /(?:above|over|more than|greater than|worth more than|>)\s*(.+)$/i.exec(t)) && /lead|deal|customer|show|find|list/.test(l)) {
    const min = parseMoney(m[1]); if (min !== null) return { k: 'valueAbove', min }
  }
  if (/haven'?t (been )?contacted|not contacted|inactive|gone quiet|haven'?t (heard|replied)|(didn'?t|not) repl|stale|neglected/.test(l)) {
    const d = /(\d+)\s*days?/.exec(l); return { k: 'stale', days: d ? Number(d[1]) : 7 }
  }
  if (/follow.?up|focus|who should|prioriti[sz]e|what.*today|needs? attention/.test(l)) return { k: 'followUps' }
  if (/(best|highest|top|biggest|most valuable).*(lead|opportunit|customer)/.test(l)) return { k: 'best' }
  if (/overdue.*task|task.*overdue/.test(l)) return { k: 'overdueTasks' }
  if (/changed|what'?s new|since yesterday|recent activity|happened/.test(l)) return { k: 'changes' }
  if ((m = /^(?:please\s+)?(?:summari[sz]e|summary of|tell me about|brief me on)\s+(.+)$/i.exec(t))) return { k: 'summary', name: clean(m[1]) }
  if (/^(?:show|list|open|see|get)?\s*(?:me\s+)?(?:all\s+)?(?:my\s+)?(leads|contacts|companies|deals|tasks)\b/.test(l)) {
    return { k: 'list', what: /^(?:show|list|open|see|get)?\s*(?:me\s+)?(?:all\s+)?(?:my\s+)?(\w+)/.exec(l)![1] as 'leads' }
  }
  return { k: 'help' }
}

function step1(i: Intent): string | null {
  switch (i.k) {
    case 'createLead': return call('Here’s the lead I’ll add.', [{ tool: 'createLead', args: { name: i.name, ...(i.value ? { value: i.value } : {}) } }])
    case 'createTask': return call('Here’s the task I’ll create.', [{ tool: 'createTask', args: { title: i.title, ...(i.due ? { dueDate: i.due } : {}) } }])
    case 'followUpTasks': return call('', [{ tool: 'getFollowUps', args: { limit: 10 } }])
    case 'setStatus': case 'summary': return call('', [{ tool: 'searchLeads', args: { query: i.name } }, ...(i.k === 'summary' ? [{ tool: 'getCompanies', args: {} }] : [])])
    case 'delete': return call('', [{ tool: i.what === 'lead' ? 'searchLeads' : 'searchContacts', args: { query: i.name } }])
    case 'followUps': return call('', [{ tool: 'getFollowUps', args: { limit: 8 } }])
    case 'pipeline': return call('', [{ tool: 'getPipelineSummary', args: {} }])
    case 'atRisk': return call('', [{ tool: 'getDeals', args: { atRisk: true } }])
    case 'valueAbove': return call('', [{ tool: 'getLeads', args: { minValue: i.min, sortBy: 'value' } }])
    case 'stale': return call('', [{ tool: 'getLeads', args: { staleDays: i.days, sortBy: 'lastContacted' } }])
    case 'best': return call('', [{ tool: 'getLeads', args: { sortBy: 'value', limit: 5 } }])
    case 'overdueTasks': return call('', [{ tool: 'getOverdueTasks', args: {} }])
    case 'changes': return call('', [{ tool: 'getActivities', args: { sinceHours: 24, limit: 20 } }])
    case 'draft': return call('', [i.name ? { tool: 'searchLeads', args: { query: i.name } } : { tool: 'getLeads', args: { sortBy: 'createdAt', limit: 1 } }])
    case 'list': return call('', [{ tool: ({ leads: 'getLeads', contacts: 'getContacts', companies: 'getCompanies', deals: 'getDeals', tasks: 'getTasks' } as const)[i.what], args: { limit: 15 } }])
    default: return null
  }
}

export function draftText(channel: string, lead: Row): string {
  const first = String(lead.name).split(' ')[0]
  if (channel === 'whatsapp' || channel === 'sms')
    return `Hi ${first}, hope you're doing well. Just checking in on ${lead.company ? `${lead.company}'s` : 'your'} requirement — happy to answer any questions or share an updated quote. When is a good time to talk?`
  return `Subject: Following up${lead.company ? ` — ${lead.company}` : ''}\n\nHi ${first},\n\nI wanted to follow up on our recent conversation. Happy to answer questions, share a revised quotation, or set up a quick call this week.\n\nWould tomorrow work for you?\n\nBest regards`
}

function step2(i: Intent, rs: Result[]): string {
  const by = (t: string) => rs.find(r => r.tool === t)
  const first = rs[0]
  const err = rs.find(r => !r.ok)
  if (err) return done(`I couldn’t read that: ${err.error}`)
  const items: Row[] = first?.result?.items ?? []
  const total: number = first?.result?.total ?? items.length

  switch (i.k) {
    case 'followUps': {
      if (!items.length) return done('Nothing urgent. Every open lead is on track.')
      const hi = items.filter(x => x.priority === 'High').length
      return done(`You have **${total} follow-up${total === 1 ? '' : 's'}** that deserve attention${hi ? `. ${hi} ${hi === 1 ? 'is' : 'are'} high priority` : ''}.\n\n${items.slice(0, 5).map(x => `- **${x.name}** — ${(x.reasons as string[]).join(', ')}`).join('\n')}`,
        recs(items, x => x.recommendedAction))
    }
    case 'followUpTasks': {
      if (!items.length) return done('No leads need follow-up tasks right now.')
      return call(`I found ${items.length} lead${items.length === 1 ? '' : 's'} that need follow-up. I’ll create one task each for tomorrow.`,
        items.map(x => ({ tool: 'createTask', args: { title: `Follow up with ${x.name}`, description: (x.reasons as string[]).join(', '), relatedLead: x.id, dueDate: iso(1), priority: x.priority === 'High' ? 'High' : 'Medium' } })))
    }
    case 'pipeline': {
      const p = first.result
      const stages = (p.byStage as Row[]).filter(s => s.count)
      const delta = p.thisMonth.value - p.lastMonth.value
      return done(`**Active pipeline: ${formatCompact(p.activeValue)}** across ${p.activeCount} open deal${p.activeCount === 1 ? '' : 's'}. Weighted by probability: ${formatCompact(p.weightedValue)}.\n\n${stages.length ? table(['Stage', 'Deals', 'Value'], stages.map(s => [s.stage, String(s.count), formatCompact(s.value)])) : ''}\n\n**This month vs last:** ${p.thisMonth.created} deals (${formatCompact(p.thisMonth.value)}) vs ${p.lastMonth.created} (${formatCompact(p.lastMonth.value)}) — ${delta >= 0 ? 'up' : 'down'} ${formatCompact(Math.abs(delta))}.\nWon: ${formatCompact(p.wonValue)} · Lost: ${formatCompact(p.lostValue)}`)
    }
    case 'atRisk':
      return done(items.length ? `**${total} deal${total === 1 ? ' is' : 's are'} at risk:**\n\n${items.map(d => `- **${d.name}** (${formatCompact(d.value)}, ${d.stage}) — ${d.risk}`).join('\n')}` : 'No open deals look at risk right now.',
        items.map(d => ({ entity: 'deal', id: d.id, note: `Reach out — ${d.risk}.` })))
    case 'valueAbove':
      return done(items.length ? `${total} lead${total === 1 ? '' : 's'} above ${formatCompact(i.min)}:\n\n${leadTable(items)}` : `No leads above ${formatCompact(i.min)}.`, recs(items))
    case 'stale':
      return done(items.length ? `**${total} open lead${total === 1 ? '' : 's'}** not contacted in ${i.days}+ days:\n\n${leadTable(items)}` : `Everyone has been contacted within ${i.days} days. Nice.`,
        recs(items, x => `Quiet for ${x.daysSinceContact}d — send a nudge.`))
    case 'best':
      return done(items.length ? `Your highest-value leads:\n\n${leadTable(items)}` : 'No leads yet.', recs(items))
    case 'overdueTasks':
      return done(items.length ? `**${total} overdue task${total === 1 ? '' : 's'}:**\n\n${items.map(t => `- ${t.title} — due ${t.dueDate}`).join('\n')}` : 'No overdue tasks.', items.map(t => ({ entity: 'task', id: t.id })))
    case 'changes':
      return done(items.length ? `**${total} update${total === 1 ? '' : 's'} in the last 24 hours:**\n\n${items.map(a => `- ${a.summary}`).join('\n')}` : 'Nothing has changed in the last 24 hours.')
    case 'list': {
      const entity = ({ leads: 'lead', contacts: 'contact', companies: 'company', deals: 'deal', tasks: 'task' } as const)[i.what]
      const label = (r: Row) => r.name ?? r.title
      return done(items.length ? `You have **${total}** ${i.what}.\n\n${items.map(r => `- ${label(r)}`).join('\n')}` : `No ${i.what} yet. Ask me to create one.`, items.map(r => ({ entity, id: r.id })))
    }
    case 'setStatus': {
      const lead = items[0]
      if (!lead) return done(`I couldn’t find a lead matching “${i.name}”.`)
      return call(`I’ll move **${lead.name}** from ${lead.status} → ${i.status}.`, [{ tool: 'updateLead', args: { id: lead.id, data: { status: i.status } } }])
    }
    case 'delete': {
      const row = items[0]
      if (!row) return done(`I couldn’t find a ${i.what} matching “${i.name}”.`)
      return call(`This will permanently delete **${row.name}**.`, [{ tool: i.what === 'lead' ? 'deleteLead' : 'deleteContact', args: { id: row.id } }])
    }
    case 'draft': {
      const lead = items[0]
      if (!lead) return done('I couldn’t find that lead. Add one first, or tell me their name.')
      return done(`Here’s a ${i.channel} draft for **${lead.name}**:\n\n> ${draftText(i.channel, lead).replace(/\n/g, '\n> ')}`, recs([lead]))
    }
    case 'summary': {
      const lead = by('searchLeads')?.result?.items?.[0]
      const company = (by('getCompanies')?.result?.items as Row[] | undefined)?.find(c => String(c.name).toLowerCase().includes(i.name.toLowerCase()))
      if (lead && !by('getLead')) return '__NEED_LEAD__' + lead.id
      if (by('getLead')?.ok) {
        const l = by('getLead')!.result as Row
        const acts = (l.activities as Row[]).slice(0, 4)
        return done(`**${l.name}**${l.company ? ` · ${l.company}` : ''}\n\nStatus: ${l.status} · Priority: ${l.priority}\nOpportunity: ${formatCurrency(l.value)}\n\n${acts.length ? `Recent activity:\n${acts.map(a => `- ${a.summary}`).join('\n')}\n\n` : ''}**Recommended action:** ${l.status === 'Proposal' || l.status === 'Negotiation' ? 'Send a revised quotation and follow up within 24 hours.' : l.status === 'New' ? 'Send a short intro message today.' : 'Book a call this week.'}`,
          [{ entity: 'lead', id: l.id }])
      }
      if (company) return done(`**${company.name}** — ${company.industry || 'industry unknown'}${company.location ? `, ${company.location}` : ''}.`, [{ entity: 'company', id: company.id }])
      return done(`I couldn’t find anything matching “${i.name}”.`)
    }
    default: return done('Done.')
  }
}

const HELP = `I'm running in **offline mode**, so I understand a focused set of requests. Try:

- Who should I follow up with today?
- Show leads above ₹50,000
- Find leads I haven't contacted in 7 days
- Summarize my pipeline
- Which deals are at risk?
- Create a task to call Priya tomorrow
- Create follow-up tasks for overdue leads
- Change Crystal Integrated Service to Qualified
- Draft a WhatsApp message for my latest lead`

export const localProvider: AiProvider = {
  id: 'local',
  label: 'Offline assistant',
  async available() { return true },
  async *stream(messages: AiMessage[]) {
    const last = messages[messages.length - 1]?.content ?? ''
    const isAgent = messages[0]?.content.includes('CRM_AGENT')
    if (!isAgent) { yield 'The AI service is offline, so I can’t generate that right now.'; return }

    const isResults = last.startsWith('TOOL_RESULTS\n')
    const isError = last.startsWith('TOOL_ERROR')
    const question = [...messages].reverse().find(m => m.role === 'user' && !m.content.startsWith('TOOL_'))?.content ?? ''
    const intent = classify(question)

    if (isError) { yield done('I couldn’t complete that request. Try rephrasing it.'); return }
    if (!isResults) { yield step1(intent) ?? HELP; return }

    let results: Result[] = []
    try { results = JSON.parse(last.slice('TOOL_RESULTS\n'.length).split('\nNOTE:')[0]) } catch { /* ignore */ }
    const out = step2(intent, results)
    yield out.startsWith('__NEED_LEAD__') ? call('', [{ tool: 'getLead', args: { id: out.slice(13) } }]) : out
  },
}
