import { useRef } from 'react'
import FutCard from './FutCard'
import DownloadButton from './DownloadButton'
import { roleOf } from '../heroRoles'
import { ATTRS, attrValues, keyOf, ovrOf, rankOf, tierOf } from '../lib'
import { copaCareer } from '../matches'

const MATCH = {
  alta: { t: 'Perfil confirmado', c: 'text-pos border-pos/50' },
  media: { t: 'Perfil provável', c: 'text-gold2 border-gold/50' },
  baixa: { t: 'Verificar perfil', c: 'text-neg border-neg/50' },
}

// "O que é cada nota": explica as 6 siglas da carta, para quem não conhece.
export function Legend({ attrs = ATTRS, title = 'O QUE É CADA NOTA?', note = null }) {
  return (
    <details className="mt-2 rounded-sm border border-line bg-panel2 text-left text-[12px]">
      <summary className="cursor-pointer px-2 py-1 font-bold tracking-wider text-gold2">{title}</summary>
      <dl className="grid gap-1 px-2 pb-2 text-muted">
        {attrs.map((a) => (
          <div key={a.k}>
            <dt className="inline font-bold text-white/85">{a.k} </dt>
            <dd className="inline">{a.desc}.</dd>
          </div>
        ))}
        {note && <p className="mt-1">{note}</p>}
      </dl>
    </details>
  )
}

// Cartinha do jogador (média dos stats ranked, atributos editáveis) + identificação e botão do tracker.
export default function TradingCard({ player: p, team, grade, attrs, games }) {
  const root = useRef(null)
  // o fundo é a foto do jogador; os heróis (pool) e a função só aparecem depois dos jogos da Copa
  const career = copaCareer(games, p, keyOf)
  const key = keyOf(p)
  const overrides = attrs.overrides[key] ?? {}
  const values = attrValues(p, overrides)
  const ovr = ovrOf(values)
  const rank = rankOf(p.badge)
  const tier = tierOf(ovr)
  const myTier = tierOf(grade)
  const edited = Object.keys(overrides).length > 0

  return (
    <div className="mx-auto w-full max-w-[320px]" ref={root}>
      <FutCard
        nick={p.nick}
        ovr={ovr}
        tierColor={tier?.color}
        tierLabel={tier?.label}
        role={roleOf(career?.heroes[0]?.name)}
        team={team}
        rank={rank}
        hero={null}
        photo={p.avatar}
        avatar={p.avatar}
        pool={career?.heroes.map((h) => ({ name: h.name, img: h.icon }))}
        attrs={ATTRS.map((a) => ({ k: a.k, desc: a.desc, value: values[a.k], edited: overrides[a.k] != null }))}
        onAttr={(k, v) => attrs.setAttr(key, k, v)}
        onReset={edited ? () => attrs.resetAttrs(key) : undefined}
        tip={grade != null ? { text: `SUA NOTA ${grade}`, color: myTier?.color } : null}
      />

      {/* identificação e tracker */}
      <div className="mt-3 text-center">
        <div className="text-lg font-bold tracking-wide" style={{ color: rank.color }}>
          {rank.name}
        </div>
        {p.sub && (
          <span className="mt-1 inline-block rounded-sm border border-gold px-2 text-[11px] font-bold tracking-widest text-gold2">
            RESERVA / COACH
          </span>
        )}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {p.found ? (
            <>
              <span className={`rounded-sm border px-2 py-0.5 text-xs font-bold ${MATCH[p.match].c}`}>{MATCH[p.match].t}</span>
              <a
                href={p.profile}
                target="_blank"
                rel="noreferrer"
                className="rounded-sm bg-gradient-to-b from-[#d8b25a] to-[#a8822f] px-3 py-1 text-xs font-bold tracking-[0.15em] text-[#1a1305] hover:brightness-110"
              >
                ABRIR TRACKER ↗
              </a>
            </>
          ) : (
            <span className="rounded-sm border border-dashed border-neg px-3 py-1 text-xs font-bold tracking-[0.15em] text-neg">
              SEM TRACKER
            </span>
          )}
        </div>
        {p.found && p.username.toLowerCase() !== p.nick.toLowerCase() && (
          <div className="mt-1 text-xs text-muted">no tracker: {p.username}</div>
        )}
        <div className="mt-2">
          <DownloadButton getRoot={() => root.current} name={`carta-${p.nick}`} />
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Esta é a SUA carta: começa vazia e só muda com o que você digitar (de 1 a 99). Clique num número para preencher. Os dados do torneio nunca alteram ela.
        </p>
        <Legend title="O QUE É CADA NOTA?" note="Cada nota vai de 1 a 99. A carta do torneio usa estes mesmos 6 atributos, calculados dos jogos da Copa, para você comparar um a um." />
      </div>
    </div>
  )
}
