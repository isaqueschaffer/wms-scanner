import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

// items: [{ label, to? }]. O último é a página atual.
export function Breadcrumb({ items }) {
  return (
    <nav aria-label="Você está em" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-400">
        {items.map((item, i) => {
          const ultimo = i === items.length - 1
          return (
            <li key={i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <ChevronRight size={14} aria-hidden="true" className="shrink-0 text-slate-600" />}
              {item.to && !ultimo ? (
                <Link to={item.to} className="truncate max-w-[14rem] hover:text-white hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={ultimo ? 'page' : undefined} className={`truncate max-w-[18rem] ${ultimo ? 'text-slate-200 font-semibold' : ''}`}>
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
