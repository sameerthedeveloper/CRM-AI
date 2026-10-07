import { z, type ZodTypeAny } from 'zod'
import type { CrmService } from '@/lib/crm/service'
import type { DataStore } from '@/lib/crm/store'
import { dealRisk, isOpenLead, isOverdue, leadFollowUps, pipelineSummary, quietDays } from '@/lib/crm/insights'
import { formatCurrency, formatDate, humanError, ValidationError } from '@/lib/utils'
import {
  ACTIVITY_TYPES, DEAL_STAGES, LEAD_STATUSES, PRIORITIES, TASK_STATUSES,
  type Contact, type Deal, type Lead, type Task,
} from '@/types/crm'
import { schemas } from './schemas'

export interface ToolCtx { store: DataStore; crm: CrmService; now: () => number }

export interface ToolDef {
  name: string
  kind: 'read' | 'write'
  danger?: boolean
  description: string
  argsHelp: string
  args: ZodTypeAny
  run(args: any, ctx: ToolCtx): Promise<unknown>
  preview?(args: any, ctx: ToolCtx): Promise<string>
}

const MAX_ROWS = 25
const idArg = z.object({ id: z.string().min(1).max(100) }).strict()
const queryArg = z.object({ query: z.string().min(1).max(200) }).strict()
const limitArg = z.coerce.number().int().min(1).max(MAX_ROWS).optional()
const rows = <T>(all: T[], limit = MAX_ROWS) => ({ total: all.length, shown: Math.min(all.length, limit), items: all.slice(0, limit) })

const leadRow = (l: Lead, now: number) => ({
  id: l.id, name: l.name, company: l.company, status: l.status, priority: l.priority, value: l.value,
  lastContactedAt: l.lastContactedAt ? new Date(l.lastContactedAt).toISOString().slice(0, 10) : null,
  nextFollowUpAt: l.nextFollowUpAt ? new Date(l.nextFollowUpAt).toISOString().slice(0, 10) : null,
  daysSinceContact: quietDays(l, now),
})
const contactRow = (c: Contact) => ({ id: c.id, name: c.name, role: c.role, email: c.email, phone: c.phone, companyId: c.companyId, tags: c.tags })
const dealRow = (d: Deal) => ({
  id: d.id, name: d.name, value: d.value, stage: d.stage, probability: d.probability, companyId: d.companyId,
  expectedCloseDate: d.expectedCloseDate ? new Date(d.expectedCloseDate).toISOString().slice(0, 10) : null,
})
const taskRow = (t: Task) => ({
  id: t.id, title: t.title, status: t.status, priority: t.priority,
  dueDate: t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : null, relatedLead: t.relatedLead,
})

const DATE_KEYS = new Set(['lastContactedAt', 'nextFollowUpAt', 'expectedCloseDate', 'dueDate'])
const show = (k: string, v: unknown) => (DATE_KEYS.has(k) ? (v ? formatDate(Number(v)) : 'none') : String(v))
const changes = (d: Record<string, unknown>) => Object.entries(d).map(([k, v]) => `${k} → ${show(k, v)}`).join(', ')
const includes = (hay: string, q: string) => hay.toLowerCase().includes(q.toLowerCase())
const notFound = (what: string) => { throw new ValidationError(`${what} not found`) }
const nameOf = async (ctx: ToolCtx, coll: 'leads' | 'contacts' | 'deals' | 'tasks', id: string) => {
  const r = (await ctx.store.get(coll, id)) as unknown as { name?: string; title?: string } | null
  return r ? (r.name ?? r.title ?? id) : `unknown (${id})`
}

const defs: ToolDef[] = [
  // ---------- READ ----------
  {
    name: 'getLeads', kind: 'read', description: 'List leads with optional filters.',
    argsHelp: '{status?, priority?, minValue?, maxValue?, staleDays? (no contact for N+ days, open leads only), sortBy? "value"|"createdAt"|"lastContacted", limit?}',
    args: z.object({
      status: z.enum(LEAD_STATUSES).optional(), priority: z.enum(PRIORITIES).optional(),
      minValue: z.coerce.number().optional(), maxValue: z.coerce.number().optional(),
      staleDays: z.coerce.number().int().min(0).optional(),
      sortBy: z.enum(['value', 'createdAt', 'lastContacted']).optional(), limit: limitArg,
    }).strict(),
    async run(a, ctx) {
      const now = ctx.now()
      let ls = await ctx.store.list('leads')
      if (a.status) ls = ls.filter(l => l.status === a.status)
      if (a.priority) ls = ls.filter(l => l.priority === a.priority)
      if (a.minValue !== undefined) ls = ls.filter(l => l.value >= a.minValue)
      if (a.maxValue !== undefined) ls = ls.filter(l => l.value <= a.maxValue)
      if (a.staleDays !== undefined) ls = ls.filter(l => isOpenLead(l) && quietDays(l, now) >= a.staleDays)
      if (a.sortBy === 'value') ls.sort((x, y) => y.value - x.value)
      if (a.sortBy === 'lastContacted') ls.sort((x, y) => (x.lastContactedAt ?? x.createdAt) - (y.lastContactedAt ?? y.createdAt))
      const r = rows(ls, a.limit)
      return { ...r, items: r.items.map(l => leadRow(l, now)) }
    },
  },
  {
    name: 'searchLeads', kind: 'read', description: 'Find leads by name, company, email or notes.', argsHelp: '{query}',
    args: queryArg,
    async run(a, ctx) {
      const ls = (await ctx.store.list('leads')).filter(l => [l.name, l.company, l.email, l.notes].some(f => includes(f, a.query)))
      const r = rows(ls)
      return { ...r, items: r.items.map(l => leadRow(l, ctx.now())) }
    },
  },
  {
    name: 'getLead', kind: 'read', description: 'Full details of one lead.', argsHelp: '{id}', args: idArg,
    async run(a, ctx) {
      const l = (await ctx.store.get('leads', a.id)) ?? notFound('Lead')
      const acts = (await ctx.store.list('activities')).filter(x => x.relatedId === a.id).slice(0, 10)
      return { ...l, activities: acts.map(x => ({ at: new Date(x.createdAt).toISOString().slice(0, 10), type: x.type, summary: x.summary })) }
    },
  },
  {
    name: 'getContacts', kind: 'read', description: 'List contacts.', argsHelp: '{limit?}',
    args: z.object({ limit: limitArg }).strict(),
    async run(a, ctx) { const r = rows(await ctx.store.list('contacts'), a.limit); return { ...r, items: r.items.map(contactRow) } },
  },
  {
    name: 'searchContacts', kind: 'read', description: 'Find contacts by name, role, email or tag.', argsHelp: '{query}', args: queryArg,
    async run(a, ctx) {
      const cs = (await ctx.store.list('contacts')).filter(c => [c.name, c.role, c.email, c.tags.join(' ')].some(f => includes(f, a.query)))
      const r = rows(cs); return { ...r, items: r.items.map(contactRow) }
    },
  },
  { name: 'getContact', kind: 'read', description: 'Full details of one contact.', argsHelp: '{id}', args: idArg,
    async run(a, ctx) { return (await ctx.store.get('contacts', a.id)) ?? notFound('Contact') } },
  {
    name: 'getCompanies', kind: 'read', description: 'List companies.', argsHelp: '{limit?}', args: z.object({ limit: limitArg }).strict(),
    async run(a, ctx) { return rows(await ctx.store.list('companies'), a.limit) },
  },
  { name: 'getCompany', kind: 'read', description: 'One company with its contacts and deals.', argsHelp: '{id}', args: idArg,
    async run(a, ctx) {
      const c = (await ctx.store.get('companies', a.id)) ?? notFound('Company')
      const [cs, ds] = await Promise.all([ctx.store.list('contacts'), ctx.store.list('deals')])
      return { ...c, contacts: cs.filter(x => x.companyId === a.id).map(contactRow), deals: ds.filter(x => x.companyId === a.id).map(dealRow) }
    } },
  {
    name: 'getDeals', kind: 'read', description: 'List deals; atRisk=true returns open deals that look stuck.',
    argsHelp: '{stage?, minValue?, atRisk?, limit?}',
    args: z.object({ stage: z.enum(DEAL_STAGES).optional(), minValue: z.coerce.number().optional(), atRisk: z.boolean().optional(), limit: limitArg }).strict(),
    async run(a, ctx) {
      let ds = await ctx.store.list('deals')
      if (a.stage) ds = ds.filter(d => d.stage === a.stage)
      if (a.minValue !== undefined) ds = ds.filter(d => d.value >= a.minValue)
      let risk: Record<string, string> = {}
      if (a.atRisk) {
        const acts = await ctx.store.list('activities')
        for (const d of ds) { const r = dealRisk(d, acts, ctx.now()); if (r) risk[d.id] = r }
        ds = ds.filter(d => risk[d.id])
      }
      const r = rows(ds, a.limit)
      return { ...r, items: r.items.map(d => ({ ...dealRow(d), ...(risk[d.id] ? { risk: risk[d.id] } : {}) })) }
    },
  },
  {
    name: 'getTasks', kind: 'read', description: 'List tasks.', argsHelp: '{status?, limit?}',
    args: z.object({ status: z.enum(TASK_STATUSES).optional(), limit: limitArg }).strict(),
    async run(a, ctx) {
      const ts = (await ctx.store.list('tasks')).filter(t => !a.status || t.status === a.status)
      const r = rows(ts, a.limit); return { ...r, items: r.items.map(taskRow) }
    },
  },
  {
    name: 'getOverdueTasks', kind: 'read', description: 'Tasks past their due date and not completed.', argsHelp: '{}', args: z.object({}).strict(),
    async run(_a, ctx) { const r = rows((await ctx.store.list('tasks')).filter(t => isOverdue(t, ctx.now()))); return { ...r, items: r.items.map(taskRow) } },
  },
  {
    name: 'getActivities', kind: 'read', description: 'Recent activity across the CRM.', argsHelp: '{sinceHours?, relatedId?, limit?}',
    args: z.object({ sinceHours: z.coerce.number().min(1).max(24 * 365).optional(), relatedId: z.string().max(100).optional(), limit: limitArg }).strict(),
    async run(a, ctx) {
      const since = a.sinceHours ? ctx.now() - a.sinceHours * 3_600_000 : 0
      const acts = (await ctx.store.list('activities')).filter(x => x.createdAt >= since && (!a.relatedId || x.relatedId === a.relatedId))
      const r = rows(acts, a.limit)
      return { ...r, items: r.items.map(x => ({ at: new Date(x.createdAt).toISOString(), type: x.type, summary: x.summary, relatedType: x.relatedType, relatedId: x.relatedId })) }
    },
  },
  {
    name: 'getPipelineSummary', kind: 'read', description: 'Pipeline totals by stage, weighted value, this vs last month.', argsHelp: '{}', args: z.object({}).strict(),
    async run(_a, ctx) { return pipelineSummary(await ctx.store.list('deals'), ctx.now()) },
  },
  {
    name: 'getFollowUps', kind: 'read', description: 'Ranked leads that deserve follow-up today, with reasons and a recommended action.', argsHelp: '{limit?}',
    args: z.object({ limit: limitArg }).strict(),
    async run(a, ctx) {
      const f = leadFollowUps(await ctx.store.list('leads'), ctx.now())
      const r = rows(f, a.limit ?? 10)
      return { ...r, items: r.items.map(x => ({ ...leadRow(x.lead, ctx.now()), reasons: x.reasons, recommendedAction: x.action, score: x.score })) }
    },
  },

  // ---------- WRITE (always confirmed by the user) ----------
  {
    name: 'createLead', kind: 'write', description: 'Create a lead.', argsHelp: '{name, email?, phone?, company?, source?, status?, priority?, value?, owner?, notes?, lastContactedAt?, nextFollowUpAt? (ISO dates)}',
    args: schemas.lead.create, run: (a, c) => c.crm.create('lead', a),
    preview: async a => `Create lead “${a.name}”${a.value ? ` worth ${formatCurrency(Number(a.value))}` : ''}`,
  },
  {
    name: 'updateLead', kind: 'write', description: 'Update fields of a lead.', argsHelp: '{id, data:{…any createLead field}}',
    args: z.object({ id: z.string().min(1), data: schemas.lead.update }).strict(),
    run: (a, c) => c.crm.update('lead', a.id, a.data),
    preview: async (a, c) => `Update lead “${await nameOf(c, 'leads', a.id)}”: ${changes(a.data)}`,
  },
  {
    name: 'deleteLead', kind: 'write', danger: true, description: 'Permanently delete a lead.', argsHelp: '{id}', args: idArg,
    run: (a, c) => c.crm.remove('lead', a.id),
    preview: async (a, c) => `Delete lead “${await nameOf(c, 'leads', a.id)}” permanently`,
  },
  {
    name: 'createContact', kind: 'write', description: 'Create a contact.', argsHelp: '{name, email?, phone?, companyId?, role?, tags?: string[], notes?}',
    args: schemas.contact.create, run: (a, c) => c.crm.create('contact', a), preview: async a => `Create contact “${a.name}”`,
  },
  {
    name: 'updateContact', kind: 'write', description: 'Update a contact.', argsHelp: '{id, data:{…any createContact field}}',
    args: z.object({ id: z.string().min(1), data: schemas.contact.update }).strict(),
    run: (a, c) => c.crm.update('contact', a.id, a.data),
    preview: async (a, c) => `Update contact “${await nameOf(c, 'contacts', a.id)}”: ${Object.keys(a.data).join(', ')}`,
  },
  {
    name: 'deleteContact', kind: 'write', danger: true, description: 'Permanently delete a contact.', argsHelp: '{id}', args: idArg,
    run: (a, c) => c.crm.remove('contact', a.id),
    preview: async (a, c) => `Delete contact “${await nameOf(c, 'contacts', a.id)}” permanently`,
  },
  {
    name: 'createDeal', kind: 'write', description: 'Create a deal.', argsHelp: '{name, value?, stage?, probability?, companyId?, contactId?, expectedCloseDate?, owner?, notes?}',
    args: schemas.deal.create, run: (a, c) => c.crm.create('deal', a),
    preview: async a => `Create deal “${a.name}”${a.value ? ` worth ${formatCurrency(Number(a.value))}` : ''}`,
  },
  {
    name: 'updateDeal', kind: 'write', description: 'Update a deal.', argsHelp: '{id, data:{…any createDeal field}}',
    args: z.object({ id: z.string().min(1), data: schemas.deal.update }).strict(),
    run: (a, c) => c.crm.update('deal', a.id, a.data),
    preview: async (a, c) => `Update deal “${await nameOf(c, 'deals', a.id)}”: ${changes(a.data)}`,
  },
  {
    name: 'createTask', kind: 'write', description: 'Create a task / follow-up.', argsHelp: '{title, description?, relatedLead?, relatedContact?, relatedCompany?, dueDate? (ISO), priority?, status?}',
    args: schemas.task.create, run: (a, c) => c.crm.create('task', a),
    preview: async a => `Create task “${a.title}”${a.dueDate ? ` due ${formatDate(Number(a.dueDate))}` : ''}`,
  },
  {
    name: 'completeTask', kind: 'write', description: 'Mark a task completed.', argsHelp: '{id}', args: idArg,
    run: (a, c) => c.crm.completeTask(a.id),
    preview: async (a, c) => `Complete task “${await nameOf(c, 'tasks', a.id)}”`,
  },
  {
    name: 'createNote', kind: 'write', description: 'Attach a note to a lead, contact, company or deal.', argsHelp: '{relatedType:"lead"|"contact"|"company"|"deal", relatedId, body}',
    args: schemas.note.create.omit({}).strict(), run: (a, c) => c.crm.addNote(a.relatedType, a.relatedId, a.body),
    preview: async a => `Add note to ${a.relatedType}: “${String(a.body).slice(0, 80)}”`,
  },
]

// Whitelist: the model can only reach these functions. There is no raw query tool.
export const TOOLS: Readonly<Record<string, ToolDef>> = Object.freeze(Object.fromEntries(defs.map(d => [d.name, d])))
export const MAX_WRITES = 50
void ACTIVITY_TYPES

export interface ToolOutcome { ok: boolean; message: string; data?: unknown }

export function validateCall(tool: string, rawArgs: unknown): { ok: true; args: any } | { ok: false; error: string } {
  const def = TOOLS[tool]
  if (!def) return { ok: false, error: `Unknown tool “${tool}”. Available: ${Object.keys(TOOLS).join(', ')}` }
  const r = def.args.safeParse(rawArgs ?? {})
  if (!r.success) {
    const i = r.error.issues[0]
    return { ok: false, error: `Bad arguments for ${tool}: ${i.path.join('.') || 'args'} ${i.message}` }
  }
  return { ok: true, args: r.data }
}

export async function runTool(tool: string, rawArgs: unknown, ctx: ToolCtx): Promise<ToolOutcome> {
  const v = validateCall(tool, rawArgs)
  if (!v.ok) return { ok: false, message: v.error }
  try {
    const data = await TOOLS[tool].run(v.args, ctx)
    return { ok: true, message: TOOLS[tool].kind === 'write' ? 'Done' : 'OK', data }
  } catch (e) {
    return { ok: false, message: humanError(e, `I couldn’t complete ${tool}. Please try again.`) }
  }
}

export async function previewCall(tool: string, args: unknown, ctx: ToolCtx): Promise<string> {
  const def = TOOLS[tool]
  try { return (await def.preview?.(args, ctx)) ?? tool } catch { return tool }
}

export function toolCatalogue(): string {
  return defs.map(d => `- ${d.name} [${d.kind}${d.danger ? ', destructive' : ''}] ${d.description} args: ${d.argsHelp}`).join('\n')
}
