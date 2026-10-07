import { useCallback, useEffect, useState } from 'react'

export type ThemePref = 'light' | 'dark' | 'system'
const KEY = 'hearth:theme'

const read = (): ThemePref => {
  try { return (localStorage.getItem(KEY) as ThemePref) || 'system' } catch { return 'system' }
}
const isDark = (p: ThemePref) => p === 'dark' || (p === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
const apply = (p: ThemePref) => document.documentElement.classList.toggle('dark', isDark(p))

export function useTheme() {
  const [pref, setPrefState] = useState<ThemePref>(read)

  useEffect(() => {
    apply(pref)
    if (pref !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const on = () => apply('system')
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [pref])

  const setPref = useCallback((p: ThemePref) => {
    try { localStorage.setItem(KEY, p) } catch { /* private mode */ }
    setPrefState(p)
  }, [])
  const toggle = useCallback(() => setPref(isDark(read()) ? 'light' : 'dark'), [setPref])
  return { pref, setPref, toggle }
}
