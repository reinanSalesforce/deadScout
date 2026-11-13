import FutCard from './FutCard'
import { ATTRS, attrValues, baseAttrs, keyOf, ovrOf, rankOf, tierOf } from '../lib'

const MATCH = {
  alta: { t: 'Perfil confirmado', c: 'text-pos border-pos/50' },
  media: { t: 'Perfil provável', c: 'text-gold2 border-gold/50' },
  baixa: { t: 'Verificar perfil', c: 'text-neg border-neg/50' },
}

// Cartinha do jogador (média dos stats ranked, atributos editáveis) + identificação e botão do tracker.
export default function TradingCard({ player: p, team, grade, attrs }) {
  const key = keyOf(p)
  const overrides = attrs.overrides[key] ?? {}
  const base = baseAttrs(p)
  const values = attrValues(p, overrides)
  const ovr = ovrOf(values)
  const rank = rankOf(p.badge)
  const tier = tierOf(ovr)
  const myTier = tierOf(grade)
  const hero = p.heroes?.[0]
  const edited = Object.keys(overrides).length > 0

  return (
    <div className="mx-auto w-full max-w-[320px]">
      <FutCard
        nick={p.nick}
        ovr={ovr}
        tierColor={tier?.color}
        tierLabel={tier?.label}
        team={team}
        rank={rank}
        hero={hero ? { name: hero.name, art: hero.card ?? hero.art ?? p.recent?.[0]?.art, color: hero.color } : null}
        avatar={p.avatar}
        attrs={ATTRS.map((a) => ({ k: a.k, desc: a.desc, value: values[a.k], base: base[a.k], edited: overrides[a.k] != null }))}
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
        <p className="mt-2 text-[11px] text-muted">Atributos de 1 a 99 calculados dos stats reais. Clique num número para editar.</p>
      </div>
    </div>
  )
}
