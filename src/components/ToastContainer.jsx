import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'

const CONFIG = {
  success: { icon: CheckCircle, bg: 'bg-green-900/80 border-green-500', text: 'text-green-300', icon_color: 'text-green-400' },
  error:   { icon: XCircle,      bg: 'bg-red-900/80 border-red-500',   text: 'text-red-300',   icon_color: 'text-red-400'   },
  warning: { icon: AlertTriangle, bg: 'bg-yellow-900/80 border-yellow-500', text: 'text-yellow-300', icon_color: 'text-yellow-400' },
  info:    { icon: Info,          bg: 'bg-blue-900/80 border-blue-500',  text: 'text-blue-300',  icon_color: 'text-blue-400'  },
}

function Toast({ toast }) {
  const cfg = CONFIG[toast.type] || CONFIG.info
  const Icon = cfg.icon
  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md
        shadow-2xl min-w-[280px] max-w-[420px]
        ${cfg.bg} ${cfg.text}
        ${toast.exiting ? 'toast-exit' : 'toast-enter'}
      `}
    >
      <Icon size={20} className={`mt-0.5 shrink-0 ${cfg.icon_color}`} />
      <p className="text-sm font-semibold leading-snug">{toast.message}</p>
    </div>
  )
}

export function ToastContainer({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => <Toast key={t.id} toast={t} />)}
    </div>
  )
}
