import { cloneElement, useId } from 'react'

const LABEL_PADRAO = 'block text-sm font-semibold text-slate-300 mb-2'

// Liga o label ao campo: clicar no texto foca o input e o leitor de tela anuncia o nome.
// O filho precisa ser o próprio input/select/textarea.
export function Field({ label, children, className, labelClassName = LABEL_PADRAO }) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClassName}>{label}</label>
      {cloneElement(children, { id })}
    </div>
  )
}
