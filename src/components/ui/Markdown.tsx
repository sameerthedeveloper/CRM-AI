import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** react-markdown does not render raw HTML, so model/user text can't inject markup. Links are restricted to http(s)/mailto. */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        urlTransform={u => (/^(https?:|mailto:|tel:)/i.test(u) ? u : '')}
        components={{
          a: ({ node: _n, ...p }) => <a {...p} target="_blank" rel="noopener noreferrer nofollow" />,
          table: ({ node: _n, ...p }) => <div className="tbl"><table {...p} /></div>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
