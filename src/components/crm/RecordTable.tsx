import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { cn } from '@/lib/utils'

export interface Col<T> {
  key: string
  label: string
  render: (r: T) => ReactNode
  sort?: (a: T, b: T) => number
  className?: string
  /** Shown as the card title on mobile. */
  primary?: boolean
  hideOnMobile?: boolean
}

const PAGE = 25

export function RecordTable<T extends { id: string }>({ rows, cols, onOpen, initialSort, label }: {
  rows: T[]; cols: Col<T>[]; onOpen: (r: T) => void; initialSort?: { key: string; dir: 1 | -1 }; label: string
}) {
  const [sort, setSort] = useState(initialSort)
  const [shown, setShown] = useState(PAGE)

  const sorted = useMemo(() => {
    const c = cols.find(x => x.key === sort?.key)
    if (!c?.sort || !sort) return rows
    return [...rows].sort((a, b) => c.sort!(a, b) * sort.dir)
  }, [rows, cols, sort])

  const toggle = (k: string) => setSort(s => (s?.key === k ? { key: k, dir: (s.dir * -1) as 1 | -1 } : { key: k, dir: 1 }))
  const visible = sorted.slice(0, shown)
  const primary = cols.find(c => c.primary) ?? cols[0]

  return (
    <div>
      <div className="hidden md:block rounded-2xl border border-line bg-surface overflow-x-auto">
        <table className="w-full text-sm" aria-label={label}>
          <thead>
            <tr className="text-left text-xs text-muted border-b border-line">
              {cols.map(c => (
                <th key={c.key} scope="col" className={cn('font-medium px-4 h-10 whitespace-nowrap', c.className)} aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}>
                  {c.sort ? (
                    <button onClick={() => toggle(c.key)} className="inline-flex items-center gap-1 hover:text-fg">
                      {c.label}{sort?.key === c.key && (sort.dir === 1 ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                    </button>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(r => (
              <tr key={r.id} tabIndex={0} onClick={e => { if (!(e.target as HTMLElement).closest('select,button,a,input')) onOpen(r) }}
                onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(r) }}
                className="border-b border-line last:border-0 hover:bg-surface-2/60 cursor-pointer focus-visible:bg-surface-2/60">
                {cols.map(c => <td key={c.key} className={cn('px-4 py-3 align-middle', c.className)}>{c.render(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden space-y-2.5" aria-label={label}>
        {visible.map(r => (
          <li key={r.id}>
            <div role="button" tabIndex={0} onClick={e => { if (!(e.target as HTMLElement).closest('select,button,a,input')) onOpen(r) }}
              onKeyDown={e => { if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(r) }}
              className="rounded-2xl border border-line bg-surface p-4 active:bg-surface-2">
              <div className="font-medium mb-1.5">{primary.render(r)}</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                {cols.filter(c => c !== primary && !c.hideOnMobile).map(c => (
                  <div key={c.key} className="min-w-0"><span className="text-muted">{c.label}: </span>{c.render(r)}</div>
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {sorted.length > shown && (
        <div className="flex justify-center mt-4"><Button onClick={() => setShown(s => s + PAGE)}>Show more ({sorted.length - shown} left)</Button></div>
      )}
    </div>
  )
}

export function Toolbar({ search, onSearch, children, placeholder = 'Search…' }: { search: string; onSearch: (s: string) => void; children?: ReactNode; placeholder?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <Input aria-label={placeholder} type="search" value={search} onChange={e => onSearch(e.target.value)} placeholder={placeholder} className="w-full sm:w-72" />
      {children}
    </div>
  )
}
