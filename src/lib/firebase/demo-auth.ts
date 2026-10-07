import { uid } from '@/lib/utils'
import type { AuthService, AuthUser } from './auth'

const USERS = 'hearth:demo:users'
const SESSION = 'hearth:demo:session'

interface Stored { uid: string; email: string; name: string | null; hash: string }

const load = (): Stored[] => { try { return JSON.parse(localStorage.getItem(USERS) ?? '[]') } catch { return [] } }
const hash = async (s: string) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}
const fail = (code: string) => Object.assign(new Error(code), { code })

const listeners = new Set<(u: AuthUser | null) => void>()
const current = (): AuthUser | null => {
  const id = localStorage.getItem(SESSION)
  const u = load().find(x => x.uid === id)
  return u ? { uid: u.uid, email: u.email, name: u.name } : null
}
const emit = () => listeners.forEach(cb => cb(current()))

/** Local-only auth for running without Firebase. Not a security boundary. */
export const demoAuthService: AuthService = {
  mode: 'demo',
  onChange(cb) {
    listeners.add(cb)
    queueMicrotask(() => cb(current()))
    return () => listeners.delete(cb)
  },
  async signInEmail(email, password) {
    const u = load().find(x => x.email === email.trim().toLowerCase())
    if (!u || u.hash !== (await hash(password))) throw fail('auth/invalid-credential')
    localStorage.setItem(SESSION, u.uid)
    emit()
  },
  async signUpEmail(email, password, name) {
    const e = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(e)) throw fail('auth/invalid-email')
    if (password.length < 6) throw fail('auth/weak-password')
    const users = load()
    if (users.some(x => x.email === e)) throw fail('auth/email-already-in-use')
    const user: Stored = { uid: uid(), email: e, name: name?.trim() || null, hash: await hash(password) }
    localStorage.setItem(USERS, JSON.stringify([...users, user]))
    localStorage.setItem(SESSION, user.uid)
    emit()
  },
  async signInGoogle() { throw fail('auth/unsupported') },
  async signOut() { localStorage.removeItem(SESSION); emit() },
}
