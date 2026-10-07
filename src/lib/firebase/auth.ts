export interface AuthUser {
  uid: string
  email: string | null
  name: string | null
}

export interface AuthService {
  readonly mode: 'firebase' | 'demo'
  onChange(cb: (u: AuthUser | null) => void): () => void
  signInEmail(email: string, password: string): Promise<void>
  signUpEmail(email: string, password: string, name?: string): Promise<void>
  signInGoogle(): Promise<void>
  signOut(): Promise<void>
}
