import { DAY } from '@/lib/utils'
import type { EntityType } from '@/types/crm'

/** Prefilled task defaults for "Create follow-up" buttons. */
export const quickAction = {
  followUp(type: EntityType, id: string, rec: Record<string, any>): Record<string, unknown> {
    const name = rec.name ?? rec.title ?? ''
    return {
      title: `Follow up with ${name}`,
      dueDate: Date.now() + DAY,
      priority: rec.priority ?? 'Medium',
      relatedLead: type === 'lead' ? id : null,
      relatedContact: type === 'contact' ? id : null,
      relatedCompany: type === 'company' ? id : type === 'deal' ? rec.companyId ?? null : null,
    }
  },
}
