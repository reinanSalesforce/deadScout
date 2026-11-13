import { keyOf, teamStats, tierOf } from '../lib'

// Média das notas do time: parcial enquanto faltam notas; "final" quando todos foram avaliados.
export default function TeamAverage({ roster, grades, includeSubs, onToggleSubs, compact = false }) {
  const { counted, rated, avg, complete } = teamStats(roster, grades, includeSubs)
  const tier = tierOf(avg)
  const missing = counted.filter((p) => grades[keyOf(p)] == null).map((p) => p.nick)

  return (
    <section
      style={{ '--tier': tier?.color ?? '#6b5a2e' }}
      className={`rounded-sm border border-line border-t-[3px] border-t-(--tier) bg-panel px-4 py-2 ${
        complete ? 'shadow-[0_0_28px_-6px_var(--tier)]' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <strong className="font-head text-4xl leading-none text-(--tier)">{avg != null ? avg.toFixed(1) : '–'}</strong>
        <div className="min-w-0 flex-1">
          <div className="font-head text-[11px] tracking-[0.2em] text-gold">{complete ? 'MÉDIA FINAL' : 'MÉDIA PARCIAL'}</div>
          <div className="text-xs font-bold tracking-widest text-(--tier) uppercase">{tier?.label ?? 'sem notas'}</div>
        </div>
        <div className="text-right text-xs text-muted">
          {rated.length}/{counted.length}
          <br />
          avaliados
        </div>
      </div>
      <div className="my-2 h-1.5 overflow-hidden rounded-full bg-black">
        <i className="block h-full bg-(--tier) transition-all" style={{ width: `${counted.length ? (rated.length / counted.length) * 100 : 0}%` }} />
      </div>
      {!compact && !complete && missing.length > 0 && <p className="mb-1 truncate text-xs text-muted">faltam: {missing.join(', ')}</p>}
      {onToggleSubs && (
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={includeSubs} onChange={(e) => onToggleSubs(e.target.checked)} className="accent-gold" />
          Incluir reservas/coaches
        </label>
      )}
    </section>
  )
}
