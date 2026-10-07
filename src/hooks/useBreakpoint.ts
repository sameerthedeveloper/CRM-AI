import { useEffect, useState } from 'react'

export type Breakpoint = 'mobile' | 'tablet' | 'desktop'
const get = (): Breakpoint => (matchMedia('(min-width: 1024px)').matches ? 'desktop' : matchMedia('(min-width: 768px)').matches ? 'tablet' : 'mobile')

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(get)
  useEffect(() => {
    const on = () => setBp(get())
    const qs = [matchMedia('(min-width: 1024px)'), matchMedia('(min-width: 768px)')]
    qs.forEach(q => q.addEventListener('change', on))
    return () => qs.forEach(q => q.removeEventListener('change', on))
  }, [])
  return bp
}
