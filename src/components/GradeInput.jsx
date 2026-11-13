import { TIERS, tierOf } from '../lib'

// Campo de nota (0-100). Salva sozinho: cada mudança vai direto para o estado e para o localStorage.
export default function GradeInput({ value, onChange, savedAt }) {
  const tier = tierOf(value)
  return (
    <section style={{ '--tier': tier?.color ?? '#c9a24b' }} className="panel mx-auto w-full max-w-[360px] border-(--tier) p-4">
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor="nota" className="font-head text-xs tracking-[0.25em] text-gold">
          SUA NOTA
        </label>
        <span className="text-xs text-muted">{savedAt ? '✓ salvo automaticamente' : 'salva automático'}</span>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="nota"
          type="number"
          min="0"
          max="100"
          step="0.5"
          inputMode="decimal"
          placeholder="--"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-sm border border-line bg-black px-3 py-1 font-head text-4xl text-(--tier) placeholder:text-muted/40 focus:border-(--tier)"
        />
        {value != null && (
          <button
            onClick={() => onChange('')}
            title="Limpar nota"
            className="rounded-sm border border-line px-3 py-3 text-muted hover:border-neg hover:text-neg"
          >
            ✕
          </button>
        )}
      </div>

      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={value ?? 0}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Nota"
        className="mt-3 w-full accent-(--tier)"
      />

      <div className="mt-2 grid grid-cols-5 gap-1 text-center text-[11px]">
        {TIERS.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.min === 0 ? 55 : t.min + 5 > 100 ? 95 : t.min + 5)}
            title={`Atalho: nota ${t.range}`}
            style={{ '--c': t.color }}
            className={`rounded-sm border-b-2 border-(--c) px-1 py-1 transition ${
              tier?.id === t.id ? 'bg-(--c)/20 text-(--c)' : 'bg-panel2 text-muted hover:text-(--c)'
            }`}
          >
            <b className="block text-xs">{t.label}</b>
            {t.range}
          </button>
        ))}
      </div>
    </section>
  )
}
