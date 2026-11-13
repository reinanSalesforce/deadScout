import { useCallback, useRef, useState } from 'react'

const STORAGE_KEY = 'copa-america-atributos-v1'

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

// Atributos da carta editados pelo usuário (por jogador), salvos automaticamente no navegador.
export function useAttrs() {
  const [overrides, setOverrides] = useState(load)
  const ref = useRef(overrides)

  const commit = useCallback((next) => {
    ref.current = next
    setOverrides(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {}
  }, [])

  const setAttr = useCallback(
    (playerKey, attr, value) => {
      const next = { ...ref.current, [playerKey]: { ...ref.current[playerKey] } }
      if (value === '' || value == null || Number.isNaN(Number(value))) delete next[playerKey][attr]
      else next[playerKey][attr] = Math.min(99, Math.max(1, Math.round(Number(value))))
      if (!Object.keys(next[playerKey]).length) delete next[playerKey]
      commit(next)
    },
    [commit],
  )

  const resetAttrs = useCallback(
    (playerKey) => {
      const next = { ...ref.current }
      delete next[playerKey]
      commit(next)
    },
    [commit],
  )

  return { overrides, setAttr, resetAttrs }
}
