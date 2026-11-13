import { useMemo } from 'react'
import { fmtDuration } from '../../matches'
import { Nation } from './TeamTable'

function Row({ row }) {
  const known = !!row.name
  return (
    <div className={`flex items-center justify-between gap-3 border-b border-line px-3 py-2 ${row.won ? 'text-white' : 'text-muted'}`}>
      <b className={`min-w-0 truncate ${known ? 'font-head text-[15px] tracking-wider uppercase' : 'text-[11px] font-medium italic opacity-70'}`}>
        {known ? <Nation name={row.name} /> : (row.label ?? 'A definir')}
      </b>
      <span className={`min-w-8 rounded-sm px-2 text-center font-head text-lg ${row.won ? 'bg-gold text-[#1a1305]' : 'bg-black/50'}`}>{row.score ?? '–'}</span>
    </div>
  )
}

// Um confronto como no site oficial: etapa, os dois times com o placar e "Match IDs" com um botão por game.
function Card({ c, onOpen, onOpenSeries }) {
  const names = c.rows.map((r) => r.name ?? r.label ?? 'A definir')
  // clicar no confronto abre a tela dos games (só quando há algum game com estatísticas)
  const openable = !!c.serieKey && c.slots.some((x) => x.game)
  const go = () => onOpenSeries(c.serieKey)
  return (
    <section aria-label={`Confronto: ${c.stage} · ${names[0]} x ${names[1]}`} className={`overflow-hidden border-2 bg-panel ${c.grand ? 'border-gold' : 'border-[#5c4a22]'}`}>
      <div
        role={openable ? 'button' : undefined}
        tabIndex={openable ? 0 : undefined}
        aria-label={openable ? `Abrir confronto: ${c.stage} · ${names[0]} x ${names[1]}` : undefined}
        onClick={openable ? go : undefined}
        onKeyDown={openable ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), go()) : undefined}
        className={openable ? 'cursor-pointer transition hover:bg-gold/10 focus-visible:bg-gold/10' : ''}
      >
        <div className={`flex items-center justify-between gap-2 px-3 py-1.5 text-[11px] font-bold tracking-[0.12em] uppercase ${c.grand ? 'bg-gold text-[#1a1305]' : 'bg-panel2 text-muted'}`}>
          <span className="truncate">{c.stage}</span>
          <span className="flex items-center gap-2">
            {c.status === 'live' && <span className="rounded-sm bg-neg px-1.5 text-[10px] text-white">AO VIVO</span>}
            {openable && <span className={c.grand ? 'text-[#1a1305]' : 'text-gold2'}>ver games ›</span>}
          </span>
        </div>
        {c.rows.map((r, i) => (
          <Row key={i} row={r} />
        ))}
      </div>
      {c.slots.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5 px-3 py-2 text-[11px] text-muted">
          <span>Match IDs:</span>
          <ul className="contents" aria-label="Jogos">
            {c.slots.map((x, i) => {
              const g = x.game
              return (
                <li key={x.id} className="contents">
                  {i > 0 && <span aria-hidden="true">·</span>}
                  <b className="text-white/90">{x.id}</b>
                  <button
                    onClick={() => g && onOpen(c.serieKey, x.id)}
                    aria-disabled={!g}
                    title={g ? `${g.winner || '—'} venceu · ${fmtDuration(g.duration)}` : 'Sem estatísticas publicadas para este jogo'}
                    className={`rounded-[2px] px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${g ? 'bg-gold text-[#1a1305] hover:brightness-110' : 'cursor-not-allowed border border-dashed border-line text-muted/50'}`}
                  >
                    Ver game {x.gameNo || i + 1}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="px-3 py-2 text-[11px] text-muted/70">Aguardando a partida</div>
      )}
    </section>
  )
}

// Colunas por rodada (quartas -> semis -> final...). Cada coluna é um flex com `justify-around`: com 4, 2, 1 cartões
// cada confronto fica centralizado entre os que o alimentam, como na chave do site.
function Bracket({ title, columns, onOpen, onOpenSeries }) {
  if (!columns.length) return null
  return (
    <div className="mb-6 last:mb-0">
      <h4 className="mb-2 text-base font-bold tracking-wide text-white uppercase">{title}</h4>
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-stretch gap-8">
          {columns.map((col) => (
            <div key={col.name} className="flex w-[290px] shrink-0 flex-col">
              <h5 className="mb-2 text-[13px] font-bold tracking-wider text-muted uppercase">{col.name}</h5>
              <div className="flex flex-1 flex-col justify-around gap-3">
                {col.items.map((c) => (
                  <Card key={c.key} c={c} onOpen={onOpen} onOpenSeries={onOpenSeries} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const text = (c) => `${c.stage} ${c.rows.map((r) => `${r.name ?? ''} ${r.label ?? ''}`).join(' ')}`.toLowerCase()

// Lista de confrontos no formato da chave do site oficial: Upper bracket, Lower bracket, outras fases e fase de grupos.
export default function SeriesList({ board, query, onQuery, onOpen, onOpenSeries, aboveBoard }) {
  const q = query.trim().toLowerCase()
  const view = useMemo(() => {
    const keep = (c) => !q || text(c).includes(q)
    const cols = (list) => list.map((col) => ({ ...col, items: col.items.filter(keep) })).filter((col) => col.items.length)
    const v = { upper: cols(board.upper), lower: cols(board.lower), other: board.other.filter(keep), groups: board.groups.filter(keep) }
    v.total = [...v.upper, ...v.lower].reduce((n, c) => n + c.items.length, 0) + v.other.length + v.groups.length
    return v
  }, [board, q])

  return (
    <section className="panel p-4" aria-label="Confrontos">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h3 className="panel-title !mb-0 flex-1">CONFRONTOS ({view.total})</h3>
        <input
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Filtrar por time ou fase"
          aria-label="Filtrar confrontos"
          className="w-56 rounded-sm border border-line bg-black px-2 py-1 text-sm"
        />
      </div>
      {aboveBoard}

      <Bracket title="Upper bracket" columns={view.upper} onOpen={onOpen} onOpenSeries={onOpenSeries} />
      <Bracket title="Lower bracket" columns={view.lower} onOpen={onOpen} onOpenSeries={onOpenSeries} />

      {view.other.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-2 text-base font-bold tracking-wide text-white uppercase">Outros confrontos</h4>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {view.other.map((c) => (
              <Card key={c.key} c={c} onOpen={onOpen} onOpenSeries={onOpenSeries} />
            ))}
          </div>
        </div>
      )}

      {view.groups.length > 0 && (
        <div>
          <h4 className="mb-2 text-base font-bold tracking-wide text-white uppercase">
            Fase de grupos <span className="text-sm font-normal text-muted">· {view.groups.length} confrontos</span>
          </h4>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {view.groups.map((c) => (
              <Card key={c.key} c={c} onOpen={onOpen} onOpenSeries={onOpenSeries} />
            ))}
          </div>
        </div>
      )}
      {view.total === 0 && <p className="p-2 text-sm text-muted">Nenhum confronto encontrado.</p>}
    </section>
  )
}
