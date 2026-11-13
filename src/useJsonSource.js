import { useCallback, useEffect, useRef, useState } from 'react'

// Dados ao vivo das partidas: o GitHub Actions publica public/data/matches.json na branch `live-data` a cada
// 5 minutos (o navegador não pode chamar o deadlockpremier.com direto por CORS). raw.githubusercontent.com
// libera CORS, então o site rebusca esse arquivo sem precisar de novo deploy.
export const LIVE_REPO = 'reinanSalesforce/deadlock'
export const LIVE_BRANCH = 'live-data'
export const MATCH_POLL_MS = 60_000 // confere o arquivo a cada 1 minuto enquanto a aba Torneios está aberta

// fontes em ordem: branch live-data (só no GitHub Pages) e depois o arquivo publicado junto com o site
// chave oficial da Copa: o site do torneio libera CORS (Access-Control-Allow-Origin: *), então o navegador lê direto
export const BRACKET_URL = 'https://deadlockpremier.com/api/bracket?featured=1'
export const BRACKET_URLS = [BRACKET_URL] // estável (usada como dependência do hook)

export function sourcesFor(file) {
  const urls = []
  if (typeof location !== 'undefined' && location.hostname.endsWith('github.io')) {
    urls.push(`https://raw.githubusercontent.com/${LIVE_REPO}/${LIVE_BRANCH}/${file}`)
  }
  urls.push(new URL(`data/${file}`, document.baseURI).href)
  return urls
}

// Busca um JSON (tenta cada fonte em ordem), valida e guarda. Com pollMs, repete enquanto a aba está visível.
const hasGames = (d) => Array.isArray(d?.games) // estável: não recria o `refresh` a cada render
export function useJsonSource(file, { enabled = true, pollMs = 0, validate = hasGames, urls = null } = {}) {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('idle') // idle | loading | ok | same | erro
  const [checkedAt, setCheckedAt] = useState(null)
  const busy = useRef(false)
  const current = useRef(null)

  const refresh = useCallback(async () => {
    if (busy.current) return false
    busy.current = true
    setStatus('loading')
    let changed = false
    let ok = false
    try {
      for (const url of urls ?? sourcesFor(file)) {
        try {
          // "no-cache" revalida (ETag) a cada checagem: se nada mudou o servidor responde 304 e não baixa o arquivo de novo
          const res = await fetch(url, { cache: 'no-cache' })
          if (!res.ok) continue
          const json = await res.json()
          if (!validate(json)) continue
          ok = true
          changed = JSON.stringify(json) !== JSON.stringify(current.current)
          if (changed) {
            current.current = json
            setData(json)
          }
          break
        } catch {
          // tenta a próxima fonte
        }
      }
      setStatus(ok ? (changed ? 'ok' : 'same') : 'erro')
    } finally {
      setCheckedAt(Date.now())
      busy.current = false
    }
    return changed
  }, [file, validate, urls])

  useEffect(() => {
    if (!enabled) return undefined
    const first = setTimeout(refresh, 0)
    const id = pollMs
      ? setInterval(() => {
          if (document.visibilityState !== 'hidden') refresh()
        }, pollMs)
      : null
    return () => {
      clearTimeout(first)
      if (id) clearInterval(id)
    }
  }, [enabled, pollMs, refresh])

  return { data, status, checkedAt, refresh }
}
