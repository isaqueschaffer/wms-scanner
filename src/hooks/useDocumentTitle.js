import { useEffect } from 'react'

const BASE = 'WMS Scanner'

// Título da aba por tela. Sem título, não mexe: assim a página filha (que roda
// o efeito primeiro) pode definir o seu e o layout pai não sobrescreve.
export function useDocumentTitle(title) {
  useEffect(() => {
    if (title) document.title = `${title} · ${BASE}`
  }, [title])
}
