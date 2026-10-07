export const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'] as const
export const DEAL_STAGES = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'] as const
export const TASK_STATUSES = ['Todo', 'In Progress', 'Completed'] as const
export const PRIORITIES = ['Low', 'Medium', 'High'] as const
export const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'message', 'note', 'status', 'system'] as const
export const NOTE_TARGETS = ['lead', 'contact', 'company', 'deal'] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]
export type DealStage = (typeof DEAL_STAGES)[number]
export type TaskStatus = (typeof TASK_STATUSES)[number]
export type Priority = (typeof PRIORITIES)[number]
export type ActivityType = (typeof ACTIVITY_TYPES)[number]
export type NoteTarget = (typeof NOTE_TARGETS)[number]
export type EntityType = NoteTarget | 'task'

/** All timestamps are epoch milliseconds. */
export interface Base {
  id: string
  createdAt: number
  updatedAt: number
}

export interface Lead extends Base {
  name: string
  email: string
  phone: string
  company: string
  source: string
  status: LeadStatus
  priority: Priority
  value: number
  owner: string
  notes: string
  lastContactedAt: number | null
  nextFollowUpAt: number | null
}

export interface Contact extends Base {
  name: string
  email: string
  phone: string
  companyId: string | null
  role: string
  tags: string[]
  notes: string
  lastContactedAt: number | null
}

export interface Company extends Base {
  name: string
  industry: string
  website: string
  location: string
  size: string
  notes: string
}

export interface Deal extends Base {
  name: string
  companyId: string | null
  contactId: string | null
  value: number
  stage: DealStage
  probability: number
  expectedCloseDate: number | null
  owner: string
  notes: string
}

export interface Task extends Base {
  title: string
  description: string
  relatedLead: string | null
  relatedContact: string | null
  relatedCompany: string | null
  dueDate: number | null
  priority: Priority
  status: TaskStatus
}

export interface Activity extends Base {
  type: ActivityType
  summary: string
  relatedType: NoteTarget
  relatedId: string
}

export interface Note extends Base {
  body: string
  relatedType: NoteTarget
  relatedId: string
}

export interface RecordRef {
  entity: EntityType
  id: string
  note?: string
}

export interface PlannedCall {
  tool: string
  args: Record<string, unknown>
  preview: string
  danger?: boolean
}

export interface PendingAction {
  status: 'pending' | 'confirmed' | 'cancelled' | 'failed'
  calls: PlannedCall[]
  results?: { ok: boolean; message: string }[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  records?: RecordRef[]
  pending?: PendingAction
  error?: boolean
  /** Set when the offline assistant answered because the AI service was unreachable. */
  offline?: boolean
}

export interface Conversation extends Base {
  title: string
  messages: ChatMessage[]
}

export interface CollectionMap {
  leads: Lead
  contacts: Contact
  companies: Company
  deals: Deal
  tasks: Task
  activities: Activity
  notes: Note
  conversations: Conversation
}
export type CollectionName = keyof CollectionMap
export type NewDoc<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>
