import { fmtDuration, rateGame } from '../../matches'
import { fmtK } from '../../lib'
import { Nation } from './TeamTable'

const when = (s) => new Date(s * 1000).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

// Tela do confronto: os games um abaixo do outro, como uma tabela. Clicar num game abre as estatísticas dele.
export default function SeriesScreen({ series, onBack, onOpenGame }) {
  const s = series
  return (
    <section className="panel p-4" aria-label="Games do confronto">
      <button onClick={onBack} className="mb-3 rounded-sm border border-line px-3 py-1 text-xs font-bold tracking-wider text-muted hover:border-gold hover:text-gold2">
        ← CONFRONTOS
      </button>
      <div className="font-head text-xs tracking-[0.25em] text-gold">
        {(s.title || '').toUpperCase()} · {s.stage}
      </div>
      <h2 className="mt-1 flex flex-wrap items-center gap-3 font-head text-3xl tracking-wider">
        <Nation name={s.natA} big />
        <span className="rounded-sm bg-gold px-3 text-[#1a1305]">
          {s.winsA}–{s.winsB}
        </span>
        <Nation name={s.natB} big />
      </h2>
      <p className="mt-1 text-sm text-muted">
        {s.bo > 1 ? `Melhor de ${s.bo} · ` : ''}
        {s.slots.length} {s.slots.length === 1 ? 'game' : 'games'}. Clique num game para ver as cartinhas e as estatísticas.
      </p>

      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-[90px_1.2fr_1.2fr_1fr_1.2fr_auto] gap-3 px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] text-muted">
            <span>GAME</span>
            <span>VENCEDOR</span>
            <span>ABATES · NET WORTH</span>
            <span>DURAÇÃO</span>
            <span>MVP DO GAME</span>
            <span className="w-32" />
          </div>
          <ul aria-label="Games" className="grid gap-2">
            {s.slots.map((x, i) => {
              const g = x.game
              const mvp = g ? rateGame(g).find((p) => p.isMvp) : null
              const [t0, t1] = g?.teams ?? []
              return (
                <li key={x.id}>
                  <button
                    onClick={() => g && onOpenGame(x.id)}
                    aria-disabled={!g}
                    title={g ? undefined : 'Sem estatísticas publicadas para este game'}
                    className={`grid w-full grid-cols-[90px_1.2fr_1.2fr_1fr_1.2fr_auto] items-center gap-3 rounded-sm border px-3 py-3 text-left transition ${
                      g ? 'border-line bg-panel2 hover:border-gold hover:bg-gold/10' : 'cursor-not-allowed border-dashed border-line bg-panel/40 opacity-50'
                    }`}
                  >
                    <span>
                      <b className="font-head text-xl tracking-wide">Game {x.gameNo || i + 1}</b>
                      <small className="block text-[11px] text-muted">ID {x.id}</small>
                    </span>
                    {g ? (
                      <>
                        <span className="min-w-0 truncate font-bold text-pos">{g.winner || '—'}</span>
                        <span className="text-sm">
                          <b>
                            {t0.kills} – {t1.kills}
                          </b>
                          <small className="block text-[11px] text-muted">
                            {fmtK(t0.souls)} – {fmtK(t1.souls)}
                          </small>
                        </span>
                        <span className="text-sm">
                          {fmtDuration(g.duration)}
                          <small className="block text-[11px] text-muted">{when(g.start)}</small>
                        </span>
                        <span className="min-w-0 truncate text-sm">
                          {mvp ? (
                            <>
                              <span className="text-gold2">★</span> <b>{mvp.name}</b> <small className="text-muted">({mvp.ovr})</small>
                            </>
                          ) : (
                            '—'
                          )}
                        </span>
                        <span className="w-32 rounded-sm bg-gradient-to-b from-[#d8b25a] to-[#a8822f] px-3 py-1.5 text-center text-[11px] font-bold tracking-wider text-[#1a1305]">VER ESTATÍSTICAS ›</span>
                      </>
                    ) : (
                      <span className="col-span-5 text-sm text-muted">Sem estatísticas publicadas para este game.</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
