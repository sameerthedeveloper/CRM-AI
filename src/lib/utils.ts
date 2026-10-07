import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const DAY = 86_400_000

export function uid(): string {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
export const formatCurrency = (n: number) => inr.format(Number.isFinite(n) ? n : 0)

export function formatCompact(n: number): string {
  const v = Number.isFinite(n) ? n : 0
  const trim = (x: number) => x.toFixed(1).replace(/\.0$/, '')
  if (v >= 1e7) return `₹${trim(v / 1e7)}Cr`
  if (v >= 1e5) return `₹${trim(v / 1e5)}L`
  if (v >= 1e3) return `₹${trim(v / 1e3)}K`
  return `₹${Math.round(v)}`
}

export function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function daysSince(ts: number | null | undefined, now = Date.now()): number | null {
  if (!ts) return null
  return Math.floor((startOfDay(now) - startOfDay(ts)) / DAY)
}

export function relativeTime(ts: number | null | undefined, now = Date.now()): string {
  if (!ts) return 'never'
  const d = Math.round((startOfDay(ts) - startOfDay(now)) / DAY)
  if (d === 0) return 'today'
  if (d === -1) return 'yesterday'
  if (d === 1) return 'tomorrow'
  if (d < 0) return d > -60 ? `${-d}d ago` : `${Math.round(-d / 30)}mo ago`
  return d < 60 ? `in ${d}d` : `in ${Math.round(d / 30)}mo`
}

export function formatDate(ts: number | null | undefined): string {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export function toDateInput(ts: number | null | undefined): string {
  if (!ts) return ''
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** number → number, ''/null → null, undefined → undefined, date string → epoch ms (date-only = local midnight). */
export function parseDate(v: unknown): number | null | undefined {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  if (typeof v === 'number') return v
  if (typeof v !== 'string') return Number.NaN
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim())
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime()
  const t = Date.parse(v)
  return Number.isNaN(t) ? Number.NaN : t
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export class ValidationError extends Error {
  constructor(message: string, readonly field?: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function humanError(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (e instanceof ValidationError) return e.message
  const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : ''
  const map: Record<string, string> = {
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/user-not-found': 'Email or password is incorrect.',
    'auth/invalid-email': 'That email address doesn’t look right.',
    'auth/email-already-in-use': 'An account with this email already exists. Try signing in.',
    'auth/weak-password': 'Please choose a password with at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'I couldn’t reach the network. Check your connection and try again.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.',
    'auth/cancelled-popup-request': 'Sign-in was cancelled.',
    'auth/popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups and try again.',
    'permission-denied': 'I couldn’t access that data. Please check your permissions and try again.',
    'unavailable': 'I can’t reach the database right now. Please try again shortly.',
    'unauthenticated': 'Your session expired. Please sign in again.',
  }
  if (map[code]) return map[code]
  if (e instanceof Error && e.name === 'AiUnavailableError') return 'The AI service is unavailable right now. Your CRM still works.'
  return fallback
}
