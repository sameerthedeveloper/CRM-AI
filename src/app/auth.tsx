import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Wordmark } from '@/components/navigation/Wordmark'
import { useAuth } from '@/hooks/useAuth'
import { humanError } from '@/lib/utils'

export default function AuthPage() {
  const { service } = useAuth()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const demo = service.mode === 'demo'

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError('')
    try { await fn() } catch (e) { setError(humanError(e, 'I couldn’t sign you in. Please try again.')) } finally { setBusy(false) }
  }

  return (
    <main className="min-h-dvh grid place-items-center px-5 py-10 bg-bg anim-fade">
      <div className="w-full max-w-sm">
        <Wordmark className="mb-10" />
        <h1 className="text-[32px] font-semibold tracking-tight leading-tight">{mode === 'in' ? 'Welcome back.' : 'Create your account.'}</h1>
        <p className="text-muted mt-1.5 mb-8">Don’t manage your CRM. Talk to it.</p>

        <form className="space-y-4" noValidate onSubmit={e => { e.preventDefault(); void run(() => mode === 'in' ? service.signInEmail(email, password) : service.signUpEmail(email, password, name)) }}>
          {mode === 'up' && <Field label="Name">{id => <Input id={id} autoComplete="name" value={name} onChange={e => setName(e.target.value)} />}</Field>}
          <Field label="Email">{id => <Input id={id} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />}</Field>
          <Field label="Password">{id => <Input id={id} type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />}</Field>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button type="submit" variant="primary" className="w-full" disabled={busy || !email || !password}>{busy ? 'One moment…' : mode === 'in' ? 'Sign in' : 'Create account'}</Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
        <Button className="w-full" disabled={busy || demo} onClick={() => void run(() => service.signInGoogle())} title={demo ? 'Needs Firebase configuration' : undefined}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.5c2.1-1.9 3.3-4.7 3.3-8.1z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.5-2.7c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2.1v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.7 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.1-3.1A11 11 0 0 0 2.1 7.1l3.6 2.8C6.6 7.4 9.1 5.4 12 5.4z"/></svg>
          Continue with Google
        </Button>

        <p className="text-sm text-muted mt-6 text-center">
          {mode === 'in' ? 'New here?' : 'Already have an account?'}{' '}
          <button className="text-accent font-medium hover:underline" onClick={() => { setMode(m => (m === 'in' ? 'up' : 'in')); setError('') }}>{mode === 'in' ? 'Create an account' : 'Sign in'}</button>
        </p>
        {demo && <p className="mt-8 rounded-xl bg-surface-2 p-3.5 text-xs text-muted leading-relaxed">Demo mode: Firebase isn’t configured, so accounts and data stay in this browser. Add your keys to <code>.env</code> to enable cloud sync and Google sign-in.</p>}
      </div>
    </main>
  )
}
