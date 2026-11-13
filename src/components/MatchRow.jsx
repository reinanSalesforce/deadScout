import { ago, fmt, fmtK, rankOf } from '../lib'

const H = ({ children }) => <span className="text-[11px] font-bold tracking-[0.25em] text-muted">{children}</span>

// Linha de partida no estilo do tracker: resultado + herói | K/D/A | MMR | build
export default function MatchRow({ m }) {
  const rank = rankOf(m.badge)
  const kda = (m.k + m.a) / Math.max(1, m.d)
  const items = m.items ?? []
  const c = m.win ? 'var(--color-pos)' : 'var(--color-neg)'

  return (
    <a
      href={`https://www.deadchaps.gg/match/${m.id}`}
      target="_blank"
      rel="noreferrer"
      title="Abrir partida no DeadChaps"
      style={{ '--c': c }}
      className="relative grid grid-cols-2 overflow-hidden rounded-sm border border-[#262626] bg-[#141414] transition hover:border-(--c) md:grid-cols-[minmax(240px,1.3fr)_minmax(115px,1fr)_minmax(85px,0.7fr)_minmax(170px,1.4fr)]"
    >
      {/* herói + resultado */}
      <div
        className="relative col-span-2 flex min-h-[84px] flex-col justify-center overflow-hidden py-2 pr-3 pl-24 md:col-span-1"
        style={{ background: `linear-gradient(90deg, color-mix(in srgb, ${c} 28%, transparent), transparent 85%)` }}
      >
        <div
          className="absolute inset-y-0 left-0 w-20 bg-cover bg-[position:50%_8%] [mask-image:linear-gradient(90deg,#000_55%,transparent)]"
          style={m.art ? { backgroundImage: `url(${m.art})` } : undefined}
        />
        <b className="relative text-xl leading-none font-bold tracking-wide text-(--c)">{m.win ? 'VITÓRIA' : 'DERROTA'}</b>
        <strong className="relative mt-0.5 text-sm tracking-wide uppercase">{m.hero}</strong>
        <small className="relative text-[13px] text-muted">
          Ranked · {m.mins}min · {ago(m.date)}
        </small>
      </div>

      {/* K/D/A */}
      <div className="flex flex-col justify-center gap-1 border-[#262626] px-4 py-3 md:border-l">
        <H>K / D / A</H>
        <div className="flex items-baseline gap-1.5 text-[26px] leading-none font-bold">
          <span>{m.k}</span>
          <i className="text-xl text-neg not-italic">/</i>
          <span className="text-neg">{m.d}</span>
          <i className="text-xl text-neg not-italic">/</i>
          <span>{m.a}</span>
        </div>
        <small className="text-[13px] text-muted">
          <b className="text-white">{fmt(kda, 2)}</b> KDA · <span className="font-bold text-souls">◆ {fmtK(m.souls)}</span>
        </small>
      </div>

      {/* MMR */}
      <div className="flex flex-col justify-center gap-1 border-[#262626] px-4 py-3 md:border-l">
        <H>MMR</H>
        {m.delta ? (
          <strong className={`text-[26px] leading-none ${m.delta > 0 ? 'text-pos' : 'text-neg'}`} title={`${Math.abs(m.delta)} pontos de ranked ${m.delta > 0 ? 'ganhos' : 'perdidos'}`}>
            {m.delta > 0 ? '+' : ''}
            {m.delta}
          </strong>
        ) : (
          <strong className="text-[26px] leading-none text-muted" title="O tracker não registrou variação de pontos nesta partida">
            –
          </strong>
        )}
        <small className="text-[13px]" style={{ color: rank.color }}>
          {rank.name}
        </small>
      </div>

      {/* build */}
      <div className="col-span-2 flex flex-col justify-center gap-1.5 border-t border-[#262626] px-4 py-3 md:col-span-1 md:border-t-0 md:border-l">
        <H>BUILD</H>
        <div className="flex flex-wrap gap-[3px]">
          {items.length ? (
            items.map((it, i) => (
              <img key={i} src={it.img} alt={it.n} title={it.n} referrerPolicy="no-referrer" className="size-[30px] rounded-[4px] border border-[#333] bg-[#222] object-contain" />
            ))
          ) : (
            <small className="text-muted">–</small>
          )}
        </div>
      </div>

      <span className="absolute bottom-0 left-0 h-[3px] w-1/4 bg-(--c)" />
    </a>
  )
}
