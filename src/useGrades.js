import { useCallback, useRef, useState } from 'react'

const STORAGE_KEY = 'copa-america-notas-v1'

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

// Notas dadas pelo usuário, salvas automaticamente no navegador a cada alteração.
export function useGrades() {
  const [grades, setGrades] = useState(load)
  const [savedAt, setSavedAt] = useState(null)
  const ref = useRef(grades)

  const commit = useCallback((next) => {
    ref.current = next
    setGrades(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setSavedAt(Date.now())
    } catch {}
  }, [])

  const setGrade = useCallback(
    (key, value) => {
      const next = { ...ref.current }
      if (value === '' || value == null || Number.isNaN(Number(value))) delete next[key]
      else next[key] = Math.min(100, Math.max(0, Math.round(Number(value) * 10) / 10))
      commit(next)
    },
    [commit],
  )

  const clearAll = useCallback(() => commit({}), [commit])

  return { grades, setGrade, clearAll, savedAt }
}
