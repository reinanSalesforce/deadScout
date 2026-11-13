import SoulChart from './SoulChart'
import { CATS, fmtDuration, fmtLeadK, incomeShares, laneReport } from '../../matches'
import { fmt, fmtK, rankOf, tierOf } from '../../lib'

const A = '#D9922B'
const B = '#5B7FB5'
const teamName = (t) => t.nation || `Time ${t.team + 1}`
const pct = (v) => (v == null ? '–' : `${Math.round(v * 100)}%`)

function Section({ title, hint, children }) {
  return (
    <section className="panel p-4">
      <h3 className="panel-title">
        {title}
        {hint && <small className="font-body tracking-normal text-muted"> {hint}</small>}
      </h3>
      {children}
    </section>
  )
}

function Lanes({ game }) {
  const report = laneReport(game)
  const showAny = report.some((l) => l.sides.some((s) => s.length))
  if (!showAny || game.duration < 540) return null
  return (
    <Section title="FASE DE LANE" hint="primeiros 8 minutos · lanes pela posição real de cada jogador · souls ≈ estimativa">
      <div className="grid gap-3 md:grid-cols-3">
        {report.map((l) => {
          const total = l.souls[0] + l.souls[1]
          const leadTeam = l.lead == null ? null : game.teams[l.lead]
          return (
            <div key={l.lane} className="rounded-sm border border-line bg-panel2 p-3" style={{ borderTopColor: l.color, borderTopWidth: 3 }}>
              <div className="flex items-baseline justify-between gap-2">
                <b style={{ color: l.color }}>Lane {l.name}</b>
                <span className="text-xs font-bold" style={{ color: leadTeam ? (l.lead === 0 ? A : B) : undefined }}>
                  {leadTeam ? `${teamName(leadTeam)} +${fmtLeadK(l.diff)}` : 'Equilibrada'}
                </span>
              </div>
              <div className="my-2 flex items-center justify-between gap-2 text-xs text-muted">
                <span className="truncate">{l.sides[0].map((p) => p.name).join(' + ') || '—'}</span>
                <span className="truncate text-right">{l.sides[1].map((p) => p.name).join(' + ') || '—'}</span>
              </div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-black" role="img" aria-label={`Souls da lane ${fmtK(l.souls[0])} a ${fmtK(l.souls[1])}`}>
                <i className="block h-full" style={{ width: `${total ? (l.souls[0] / total) * 100 : 50}%`, background: A }} />
                <i className="block h-full flex-1" style={{ background: B }} />
              </div>
              <dl className="mt-2 grid grid-cols-[1fr_auto] gap-y-1 text-sm">
                <dt className="text-muted">Souls aos 8:00</dt>
                <dd className="font-bold">
                  {fmtLeadK(l.souls[0]).replace('-', '')} – {fmtLeadK(l.souls[1]).replace('-', '')}
                </dd>
                <dt className="text-muted">Abates</dt>
                <dd className="font-bold">
                  {l.kills[0]} – {l.kills[1]}
                </dd>
                {l.firstGuardian && (
                  <>
                    <dt className="text-muted">1º Guardian perdido</dt>
                    <dd className="font-bold">
                      {teamName(game.teams[l.firstGuardian.team])} · {fmtDuration(l.firstGuardian.t)}
                    </dd>
                  </>
                )}
              </dl>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

function MvpLists({ game, rated, focusAcc, onFocus }) {
  return (
    <Section title="NOTA DE MVP" hint="0-100 do Statlocker (impacto de cada jogador)">
      <div className="grid gap-4 md:grid-cols-2">
        {game.teams.map((t) => {
          const rows = rated.filter((p) => p.teamIdx === t.team && p.mvp != null).sort((a, b) => b.mvp - a.mvp)
          const avg = game.teamRank?.[t.team]
          return (
            <div key={t.team}>
              <h4 className="mb-1.5 text-sm font-bold" style={{ color: t.team === 0 ? A : B }}>
                {teamName(t)} {avg ? <small className="font-normal text-muted">rank médio {rankOf(avg).name}</small> : null}
              </h4>
              <div className="grid gap-1">
                {rows.map((p, i) => (
                  <button
                    key={p.account}
                    onClick={() => onFocus(p.account)}
                    aria-pressed={focusAcc === p.account}
                    className={`grid grid-cols-[18px_1fr_44px] items-center gap-2 rounded-sm border px-2 py-1 text-left text-sm ${focusAcc === p.account ? 'border-gold bg-gold/10' : 'border-line bg-panel2 hover:border-gold/50'}`}
                  >
                    <span className="text-xs text-muted">{i + 1}</span>
                    <span className="relative min-w-0">
                      <i className="absolute inset-y-0 left-0 rounded-sm opacity-30" style={{ width: `${Math.max(2, Math.min(100, p.mvp))}%`, background: t.team === 0 ? A : B }} />
                      <b className="relative truncate">{p.name}</b>
                    </span>
                    <b className="text-right">{fmt(p.mvp, 1)}</b>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

const Metric = ({ l, v }) => (
  <div className="rounded-sm border border-line bg-panel2 px-3 py-1.5">
    <dt className="text-[10px] tracking-[0.15em] text-muted uppercase">{l}</dt>
    <dd className="text-lg leading-tight font-bold">{v}</dd>
  </div>
)

function DeepDive({ game, p, items }) {
  const s = p.sl
  const x = s?.x ?? {}
  const minutes = Math.max(1, game.duration / 60)
  const rank = rankOf(p.rank)
  const tier = tierOf(p.ovr)
  const income = incomeShares(p)
  const tot = (x.bullet ?? 0) + (x.ability ?? 0) + (x.melee ?? 0)
  const maxDmg = Math.max(1, ...(s?.dmg ?? []).map((d) => d[1]))

  return (
    <Section title="JOGADOR" hint="escolha na tabela, na nota de MVP ou no confronto">
      <div className="flex flex-wrap items-center gap-3">
        {p.avatar && <img src={p.avatar} alt="" referrerPolicy="no-referrer" className="size-12 rounded-sm object-cover" />}
        <div className="min-w-0 flex-1">
          <div className="font-head text-xl tracking-wide">{p.name}</div>
          <div className="text-sm text-muted">
            {p.hero} · {p.teamNation || `Time ${p.teamIdx + 1}`} · <span style={{ color: rank.color }}>{rank.name}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-head text-3xl" style={{ color: tier?.color }}>
            {p.ovr}
          </div>
          <div className="text-[10px] tracking-[0.2em] text-muted">NOTA DO JOGO</div>
        </div>
        {p.mvp != null && (
          <div className="text-right">
            <div className="font-head text-3xl text-gold2">{fmt(p.mvp, 1)}</div>
            <div className="text-[10px] tracking-[0.2em] text-muted">MVP SCORE · #{p.place} de 12</div>
          </div>
        )}
      </div>

      {income.length > 0 && (
        <div className="mt-4">
          <div className="mb-1 text-[10px] font-bold tracking-[0.2em] text-muted">RENDA POR FONTE</div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-black" role="img" aria-label="Renda por fonte">
            {income.map((i) => (
              <i key={i.k} title={`${i.label} ${Math.round(i.pct)}%`} className="block h-full" style={{ width: `${i.pct}%`, background: i.color }} />
            ))}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
            {income.map((i) => (
              <span key={i.k}>
                <i className="mr-1 inline-block size-2 rounded-sm align-middle" style={{ background: i.color }} />
                {i.label} <b className="text-white/85">{Math.round(i.pct)}%</b>
              </span>
            ))}
          </div>
        </div>
      )}

      {p.items?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-[3px]">
          {p.items.map((id, i) => {
            const it = items?.[id]
            return it ? <img key={i} src={it.img} alt={it.n} title={it.n} referrerPolicy="no-referrer" className="size-8 rounded-[4px] border border-[#333] bg-[#222] object-contain" /> : null
          })}
        </div>
      )}

      {s ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-1 text-[10px] font-bold tracking-[0.2em] text-muted">ESTILO DE JOGO</div>
            <div className="grid gap-1">
              {CATS.map(([name, desc], i) => {
                const v = s.cat?.[i]
                return (
                  <div key={name} title={desc} className="grid grid-cols-[60px_1fr_34px] items-center gap-2 text-xs">
                    <span className="text-muted">{name}</span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-black">
                      <i className="block h-full rounded-full bg-gold" style={{ width: `${Math.min(100, Math.max(0, (v ?? 0) * 100))}%` }} />
                    </span>
                    <b className="text-right">{v == null ? '–' : Math.round(v * 100)}</b>
                  </div>
                )
              })}
            </div>
            {s.aw?.length > 0 && (
              <div className="mt-3 grid gap-1">
                <div className="text-[10px] font-bold tracking-[0.2em] text-muted">DESTAQUES</div>
                {s.aw.map((a) => (
                  <div key={a.n} className="rounded-sm bg-panel2 px-2 py-1 text-xs">
                    <b>{a.n}</b> <span className="text-gold2">{a.l?.toLowerCase()}</span>
                    <div className="text-muted">{a.d}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-baseline justify-between text-[10px] font-bold tracking-[0.2em] text-muted">
              <span>DANO POR FONTE</span>
              <span>{fmtK(s.dmgTot)} total</span>
            </div>
            <div className="grid gap-1">
              {(s.dmg ?? []).map(([n, v]) => (
                <div key={n} className="grid grid-cols-[1fr_44px] items-center gap-2 text-xs">
                  <span className="relative truncate">
                    <i className="absolute inset-y-0 left-0 rounded-sm bg-gold/25" style={{ width: `${(v / maxDmg) * 100}%` }} />
                    <span className="relative px-1">{n}</span>
                  </span>
                  <b className="text-right">{fmtK(v)}</b>
                </div>
              ))}
            </div>
            {tot > 0 && (
              <p className="mt-1 text-xs text-muted">
                Armas {pct(x.bullet / tot)} · Habilidades {pct(x.ability / tot)} · Corpo a corpo {pct(x.melee / tot)}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">Sem estatísticas detalhadas do Statlocker para este jogador.</p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {x.kp != null && <Metric l="Participação em abates" v={pct(x.kp)} />}
        {x.acc != null && <Metric l="Precisão" v={pct(x.acc)} />}
        {x.hs != null && <Metric l="Headshots" v={pct(x.hs)} />}
        <Metric l="Dano / min" v={fmtK(p.dmg / minutes)} />
        <Metric l="Souls / min" v={fmtK(p.souls / minutes)} />
        {x.farm != null && <Metric l="Souls de farm" v={fmtK(x.farm)} />}
        {x.closeup != null && <Metric l="Dano curta distância" v={fmtK(x.closeup)} />}
        {x.longd != null && <Metric l="Dano longa distância" v={fmtK(x.longd)} />}
        <Metric l="Dano em objetivos" v={fmtK(p.bossDmg)} />
        {x.absorbed != null && <Metric l="Dano absorvido" v={fmtK(x.absorbed)} />}
        {x.cc != null && <Metric l="Controle (CC)" v={fmtK(x.cc)} />}
        {x.earlyK != null && <Metric l="Início K / D" v={`${x.earlyK} / ${x.earlyD}`} />}
        {x.lateK != null && <Metric l="Final K / D" v={`${x.lateK} / ${x.lateD}`} />}
        <Metric l="Last hits / denies" v={`${p.lastHits} / ${p.denies}`} />
        <Metric l="Cura" v={fmtK(p.heal)} />
        <Metric l="Dano recebido" v={fmtK(p.taken)} />
      </dl>
    </Section>
  )
}

// "Estatísticas do jogo" no modelo do site oficial: info + curva de souls, fase de lane, nota de MVP e detalhes do jogador.
export default function GameStats({ game, rated, focus, onFocus, items }) {
  return (
    <div className="grid gap-4">
      <Section title="CURVA DE SOULS">
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
          <span>
            {game.title} · <b className="text-white/85">{game.stage}</b>
          </span>
          {game.score && (
            <span>
              Série{' '}
              <b className="text-white/85">
                {game.natA} {game.score[0]} – {game.score[1]} {game.natB}
              </b>
            </span>
          )}
          <span>
            Tempo de jogo <b className="text-white/85">{fmtDuration(game.duration)}</b>
          </span>
          <span>ID {game.id}</span>
        </div>
        <SoulChart game={game} />
      </Section>
      <Lanes game={game} />
      <MvpLists game={game} rated={rated} focusAcc={focus?.account} onFocus={onFocus} />
      {focus && <DeepDive game={game} p={focus} items={items} />}
    </div>
  )
}
