import { useCallback, useEffect, useRef, useState } from 'react'
import { setData, updatedAt } from './lib'

export const REFRESH_MS = 60 * 60 * 1000 // atualização automática a cada 1 hora

// URL do arquivo de dados publicado junto com o site (relativa, funciona no GitHub Pages)
const dataUrl = () => new URL('data/players.json', document.baseURI).href

// Busca o players.json mais recente publicado e troca os dados em memória.
// NÃO mexe nas notas nem nos atributos editados: eles vivem no localStorage, em hooks separados.
export function useLiveData() {
  const [version, setVersion] = useState(0) // muda a cada troca de dados -> re-renderiza quem usa lib
  const [status, setStatus] = useState('idle') // idle | loading | ok | same | erro
  const [checkedAt, setCheckedAt] = useState(null)
  const busy = useRef(false)

  const refresh = useCallback(async () => {
    if (busy.current) return false
    busy.current = true
    setStatus('loading')
    try {
      const res = await fetch(`${dataUrl()}?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const changed = json?.updatedAt !== updatedAt
      if (changed && !setData(json)) throw new Error('arquivo de dados inválido')
      if (changed) setVersion((v) => v + 1)
      setStatus(changed ? 'ok' : 'same')
      return changed
    } catch {
      setStatus('erro')
      return false
    } finally {
      setCheckedAt(Date.now())
      busy.current = false
    }
  }, [])

  // confere ao abrir o site e depois a cada 1 hora
  useEffect(() => {
    const first = setTimeout(refresh, 0)
    const id = setInterval(refresh, REFRESH_MS)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [refresh])

  return { version, status, checkedAt, refresh }
}
