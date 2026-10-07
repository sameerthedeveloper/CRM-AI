import type { ZodTypeAny } from 'zod'
import {
  DEAL_STAGES, LEAD_STATUSES, PRIORITIES, TASK_STATUSES,
  type CollectionName, type EntityType,
} from '@/types/crm'
import { schemas } from '@/lib/crm-tools/schemas'

export interface FieldDef {
  key: string
  label: string
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'textarea' | 'date' | 'tags' | 'ref'
  options?: readonly string[]
  ref?: 'companies' | 'contacts' | 'leads'
  wide?: boolean
  placeholder?: string
  required?: boolean
}

export interface EntityDef {
  type: EntityType
  label: string
  plural: string
  collection: Extract<CollectionName, 'leads' | 'contacts' | 'companies' | 'deals' | 'tasks'>
  path: string
  fields: FieldDef[]
  create: ZodTypeAny
  update: ZodTypeAny
}

export const ENTITIES: Record<EntityType, EntityDef> = {
  lead: {
    type: 'lead', label: 'Lead', plural: 'Leads', collection: 'leads', path: '/leads',
    create: schemas.lead.create, update: schemas.lead.update,
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'company', label: 'Company', type: 'text' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'tel' },
      { key: 'status', label: 'Status', type: 'select', options: LEAD_STATUSES },
      { key: 'priority', label: 'Priority', type: 'select', options: PRIORITIES },
      { key: 'value', label: 'Value (₹)', type: 'number' },
      { key: 'source', label: 'Source', type: 'text', placeholder: 'Referral, website, WhatsApp…' },
      { key: 'owner', label: 'Owner', type: 'text' },
      { key: 'lastContactedAt', label: 'Last contacted', type: 'date' },
      { key: 'nextFollowUpAt', label: 'Next follow-up', type: 'date' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
  },
  contact: {
    type: 'contact', label: 'Contact', plural: 'Contacts', collection: 'contacts', path: '/contacts',
    create: schemas.contact.create, update: schemas.contact.update,
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'role', label: 'Role', type: 'text' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone', type: 'tel' },
      { key: 'companyId', label: 'Company', type: 'ref', ref: 'companies' },
      { key: 'lastContactedAt', label: 'Last contacted', type: 'date' },
      { key: 'tags', label: 'Tags', type: 'tags', wide: true, placeholder: 'Comma separated' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
  },
  company: {
    type: 'company', label: 'Company', plural: 'Companies', collection: 'companies', path: '/companies',
    create: schemas.company.create, update: schemas.company.update,
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'industry', label: 'Industry', type: 'text' },
      { key: 'website', label: 'Website', type: 'text' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'size', label: 'Size', type: 'text', placeholder: '11–50' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
  },
  deal: {
    type: 'deal', label: 'Deal', plural: 'Deals', collection: 'deals', path: '/deals',
    create: schemas.deal.create, update: schemas.deal.update,
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'value', label: 'Value (₹)', type: 'number' },
      { key: 'stage', label: 'Stage', type: 'select', options: DEAL_STAGES },
      { key: 'probability', label: 'Probability (%)', type: 'number' },
      { key: 'companyId', label: 'Company', type: 'ref', ref: 'companies' },
      { key: 'contactId', label: 'Contact', type: 'ref', ref: 'contacts' },
      { key: 'expectedCloseDate', label: 'Expected close', type: 'date' },
      { key: 'owner', label: 'Owner', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea', wide: true },
    ],
  },
  task: {
    type: 'task', label: 'Task', plural: 'Tasks', collection: 'tasks', path: '/tasks',
    create: schemas.task.create, update: schemas.task.update,
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true, wide: true },
      { key: 'dueDate', label: 'Due', type: 'date' },
      { key: 'priority', label: 'Priority', type: 'select', options: PRIORITIES },
      { key: 'status', label: 'Status', type: 'select', options: TASK_STATUSES },
      { key: 'relatedLead', label: 'Lead', type: 'ref', ref: 'leads' },
      { key: 'relatedContact', label: 'Contact', type: 'ref', ref: 'contacts' },
      { key: 'relatedCompany', label: 'Company', type: 'ref', ref: 'companies' },
      { key: 'description', label: 'Description', type: 'textarea', wide: true },
    ],
  },
}

export const ENTITY_TYPES = Object.keys(ENTITIES) as EntityType[]
