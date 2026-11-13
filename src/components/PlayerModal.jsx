import { useEffect } from 'react'
import TradingCard from './TradingCard'
import GradeInput from './GradeInput'
import Details from './Details'
import { keyOf, teams } from '../lib'

// Pop-up com o perfil completo: aparece por cima da tela atual (ex.: comparativo) sem sair dela.
export default function PlayerModal({ player: p, grade, onGrade, savedAt, attrs, onClose }) {
  const team = teams.find((t) => t.name === p.team)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={`Perfil de ${p.nick}`}
    >
      <div className="relative w-full max-w-6xl rounded-md border border-gold bg-bg p-4 shadow-2xl sm:p-6" key={keyOf(p)}>
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute top-3 right-3 z-10 rounded-sm border border-line bg-panel px-3 py-1 text-muted hover:border-neg hover:text-neg"
        >
          ✕ Fechar
        </button>
        <div className="grid gap-5 pt-10 lg:grid-cols-[360px_1fr]">
          <div className="grid content-start gap-4">
            <TradingCard player={p} team={team} grade={grade} attrs={attrs} />
          </div>
          <div className="grid min-w-0 content-start gap-4">
            <GradeInput value={grade} onChange={onGrade} savedAt={savedAt} />
            <Details player={p} grade={grade} />
          </div>
        </div>
      </div>
    </div>
  )
}
