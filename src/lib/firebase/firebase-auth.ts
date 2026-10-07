import {
  createUserWithEmailAndPassword, getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword,
  signInWithPopup, signOut, updateProfile,
} from 'firebase/auth'
import { firebaseApp } from './app'
import type { AuthService } from './auth'

const auth = () => getAuth(firebaseApp)

export const firebaseAuthService: AuthService = {
  mode: 'firebase',
  onChange: cb =>
    onAuthStateChanged(auth(), u => cb(u ? { uid: u.uid, email: u.email, name: u.displayName } : null)),
  async signInEmail(email, password) { await signInWithEmailAndPassword(auth(), email, password) },
  async signUpEmail(email, password, name) {
    const cred = await createUserWithEmailAndPassword(auth(), email, password)
    if (name) await updateProfile(cred.user, { displayName: name })
  },
  async signInGoogle() { await signInWithPopup(auth(), new GoogleAuthProvider()) },
  signOut: () => signOut(auth()),
}
