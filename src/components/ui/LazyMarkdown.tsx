import { Suspense, lazy } from 'react'

const Markdown = lazy(() => import('./Markdown'))

/** Markdown is lazy-loaded so the first paint stays small. */
export default function LazyMarkdown({ children }: { children: string }) {
  return <Suspense fallback={<p className="whitespace-pre-wrap">{children}</p>}><Markdown>{children}</Markdown></Suspense>
}
