import { z } from 'zod'
import { ACTIVITY_TYPES, DEAL_STAGES, LEAD_STATUSES, NOTE_TARGETS, PRIORITIES, TASK_STATUSES } from '@/types/crm'
import { parseDate } from '@/lib/utils'

// Strip control characters; React escapes HTML on render, so content is never injected as markup.
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
const text = (max: number) => z.string().max(max * 4).transform(s => clean(s).trim()).pipe(z.string().max(max))
const optText = (max: number) => text(max).default('')
const dateField = z.preprocess(parseDate, z.number().nullable().default(null))
const refField = z.preprocess(v => (v === '' || v === undefined ? null : v), z.string().max(100).nullable().default(null))
const money = z.coerce.number().min(0).max(1e12)

export const leadShape = {
  name: text(200).pipe(z.string().min(1, 'Name is required')),
  email: z.union([z.literal(''), text(200).pipe(z.string().email('Enter a valid email'))]).default(''),
  phone: optText(50),
  company: optText(200),
  source: optText(100),
  status: z.enum(LEAD_STATUSES).default('New'),
  priority: z.enum(PRIORITIES).default('Medium'),
  value: money.default(0),
  owner: optText(100),
  notes: optText(5000),
  lastContactedAt: dateField,
  nextFollowUpAt: dateField,
}

const tagsField = z.preprocess(
  v => (typeof v === 'string' ? v.split(',').map(s => s.trim()).filter(Boolean) : v),
  z.array(text(40)).max(20).default([]),
)

export const contactShape = {
  name: leadShape.name,
  email: leadShape.email,
  phone: optText(50),
  companyId: refField,
  role: optText(100),
  tags: tagsField,
  notes: optText(5000),
  lastContactedAt: dateField,
}

export const companyShape = {
  name: leadShape.name,
  industry: optText(100),
  website: optText(300),
  location: optText(200),
  size: optText(50),
  notes: optText(5000),
}

export const dealShape = {
  name: leadShape.name,
  companyId: refField,
  contactId: refField,
  value: money.default(0),
  stage: z.enum(DEAL_STAGES).default('Lead'),
  probability: z.coerce.number().min(0).max(100).default(10),
  expectedCloseDate: dateField,
  owner: optText(100),
  notes: optText(5000),
}

export const taskShape = {
  title: text(300).pipe(z.string().min(1, 'Title is required')),
  description: optText(5000),
  relatedLead: refField,
  relatedContact: refField,
  relatedCompany: refField,
  dueDate: dateField,
  priority: z.enum(PRIORITIES).default('Medium'),
  status: z.enum(TASK_STATUSES).default('Todo'),
}

export const activityShape = {
  type: z.enum(ACTIVITY_TYPES).default('note'),
  summary: text(2000).pipe(z.string().min(1, 'Summary is required')),
  relatedType: z.enum(NOTE_TARGETS),
  relatedId: z.string().min(1).max(100),
}

export const noteShape = {
  body: text(5000).pipe(z.string().min(1, 'Note is empty')),
  relatedType: z.enum(NOTE_TARGETS),
  relatedId: z.string().min(1).max(100),
}

export const schemas = {
  lead: { create: z.object(leadShape).strict(), update: z.object(leadShape).partial().strict() },
  contact: { create: z.object(contactShape).strict(), update: z.object(contactShape).partial().strict() },
  company: { create: z.object(companyShape).strict(), update: z.object(companyShape).partial().strict() },
  deal: { create: z.object(dealShape).strict(), update: z.object(dealShape).partial().strict() },
  task: { create: z.object(taskShape).strict(), update: z.object(taskShape).partial().strict() },
  activity: { create: z.object(activityShape).strict() },
  note: { create: z.object(noteShape).strict() },
}
