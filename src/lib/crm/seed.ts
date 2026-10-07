import type { CrmService } from './service'
import type { DataStore } from './store'
import { DAY } from '@/lib/utils'

const iso = (offset: number) => new Date(Date.now() + offset * DAY).toISOString().slice(0, 10)

/** Sample records so a fresh account has something to talk to. Written through the same service as real data. */
export async function seedDemoData(store: DataStore, crm: CrmService) {
  const co = async (name: string, industry: string, location: string, size: string) =>
    (await crm.create('company', { name, industry, location, size, website: `${name.toLowerCase().replace(/[^a-z]+/g, '')}.in` })).id
  const [crystal, nova, greenleaf, urban] = [
    await co('Crystal Integrated Service', 'Facility management', 'Chennai', '51–200'),
    await co('Nova Textiles', 'Manufacturing', 'Tiruppur', '201–500'),
    await co('Greenleaf Organics', 'Retail', 'Bengaluru', '11–50'),
    await co('Urban Nest Realty', 'Real estate', 'Mumbai', '11–50'),
  ]
  const contact = async (name: string, role: string, companyId: string, tags: string[], last: number) =>
    (await crm.create('contact', { name, role, companyId, tags, email: `${name.split(' ')[0].toLowerCase()}@example.com`, phone: '+91 98400 12345', lastContactedAt: iso(last) })).id
  const [anita, rahul] = [
    await contact('Anita Raman', 'Operations Head', crystal, ['decision-maker'], -2),
    await contact('Rahul Mehta', 'Procurement Lead', nova, ['procurement'], -9),
  ]
  await contact('Divya Nair', 'Founder', greenleaf, ['founder', 'warm'], -4)

  const lead = async (name: string, company: string, status: string, priority: string, value: number, lastDays: number | null, follow: number | null, source: string, notes = '') =>
    crm.create('lead', { name, company, status, priority, value, source, notes, email: `${name.split(' ')[0].toLowerCase()}@example.com`, phone: '+91 90000 0000' + String(Math.abs(value) % 10),
      lastContactedAt: lastDays === null ? null : iso(-lastDays), nextFollowUpAt: follow === null ? null : iso(follow) })
  const crystalLead = await lead('Crystal Integrated Service', 'Crystal Integrated Service', 'Proposal', 'High', 120000, 3, -1, 'Referral', 'Requested quotation. Viewed proposal twice.')
  await lead('Nova Textiles — uniforms', 'Nova Textiles', 'Negotiation', 'High', 340000, 9, -3, 'Website', 'Wants volume discount.')
  await lead('Greenleaf Organics', 'Greenleaf Organics', 'Qualified', 'Medium', 65000, 4, 1, 'WhatsApp')
  await lead('Urban Nest Realty', 'Urban Nest Realty', 'Contacted', 'Medium', 85000, 11, null, 'Cold outreach')
  await lead('Priya Sharma', 'Sharma Boutique', 'New', 'Low', 18000, null, 0, 'Instagram')
  await lead('Karthik Iyer', 'Iyer & Sons', 'Contacted', 'High', 52000, 8, -2, 'Referral')
  await lead('Meera Joshi', 'Joshi Foods', 'Won', 'Medium', 45000, 20, null, 'Website')

  const deal = async (name: string, companyId: string, contactId: string | null, value: number, stage: string, prob: number, close: number) =>
    crm.create('deal', { name, companyId, contactId, value, stage, probability: prob, expectedCloseDate: iso(close) })
  await deal('Housekeeping contract — Crystal', crystal, anita, 120000, 'Proposal', 60, 10)
  await deal('Uniform supply — Nova Textiles', nova, rahul, 340000, 'Negotiation', 70, 5)
  await deal('Quarterly packaging — Greenleaf', greenleaf, null, 65000, 'Qualified', 40, 21)
  await deal('Brochure printing — Urban Nest', urban, null, 85000, 'Lead', 15, -4)
  await deal('Annual maintenance — Joshi Foods', crystal, null, 45000, 'Won', 100, -10)

  const task = (title: string, due: number, priority: string, relatedLead: string | null = null) =>
    crm.create('task', { title, dueDate: iso(due), priority, relatedLead })
  await task('Send revised quotation to Crystal', 0, 'High', crystalLead.id)
  await task('Call Nova Textiles about discount', -1, 'High')
  await task('Prepare WhatsApp catalogue', 2, 'Low')
  await crm.addNote('lead', crystalLead.id, 'Prefers WhatsApp over email. Budget approved up to ₹1.5L.')
  await crm.logActivity('call', 'Discussed scope and timeline', 'lead', crystalLead.id)
  await store.update('leads', crystalLead.id, { lastContactedAt: Date.now() - 3 * DAY })
}
