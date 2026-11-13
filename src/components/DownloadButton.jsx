import { useState } from 'react'
import { cardToPng } from '../share'

// Botão "Baixar carta (PNG)": pega a carta (<article>) dentro do elemento devolvido por `getRoot`.
export default function DownloadButton({ getRoot, name, label = 'BAIXAR CARTA (PNG)' }) {
  const [state, setState] = useState('idle') // idle | busy | ok | erro
  const run = async () => {
    const card = getRoot()?.querySelector('article')
    if (!card) return
    setState('busy')
    try {
      await cardToPng(card, `${name}.png`)
      setState('ok')
    } catch {
      setState('erro')
    }
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button onClick={run} disabled={state === 'busy'} className="rounded-sm border border-gold/50 px-2.5 py-1 text-[11px] font-bold tracking-[0.12em] text-gold2 hover:bg-gold/10 disabled:opacity-60">
        {state === 'busy' ? 'GERANDO…' : label}
      </button>
      {(state === 'ok' || state === 'erro') && (
        <span role="status" className={`text-[11px] ${state === 'erro' ? 'text-neg' : 'text-muted'}`}>
          {state === 'ok' ? 'Imagem baixada ✓' : 'Não foi possível gerar a imagem'}
        </span>
      )}
    </span>
  )
}
