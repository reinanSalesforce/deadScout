import { useEffect, useState } from 'react'
import GameCard from './GameCard'
import { OvrBadge } from './TeamTable'
import { GAME_ATTRS, LANES, findDatasetPlayer, heroImg, laneMates } from '../../matches'
import { fmtK } from '../../lib'

const teamName = (t) => t.nation || `Time ${t.team + 1}`

// barra de duelo: os dois valores e quem leva vantagem
function Duel({ label, a, b, fmt = (x) => x, title }) {
  const lead = a === b ? 0 : a > b ? 1 : -1
  const tot = Math.max(1, (a ?? 0) + (b ?? 0))
  return (
    <div title={title} className="grid grid-cols-[44px_1fr_44px] items-center gap-2 text-sm">
      <b className={`text-right ${lead > 0 ? 'text-pos' : 'text-muted'}`}>{a == null ? '–' : fmt(a)}</b>
      <div className="relative">
        <div className="text-center text-[10px] font-bold tracking-[0.2em] text-muted">{label}</div>
        <div className="mt-0.5 flex h-1.5 overflow-hidden rounded-full bg-black">
          <i className={`block h-full ${lead > 0 ? 'bg-pos' : 'bg-white/25'}`} style={{ width: `${((a ?? 0) / tot) * 100}%` }} />
          <i className={`block h-full ${lead < 0 ? 'bg-pos' : 'bg-white/25'}`} style={{ width: `${((b ?? 0) / tot) * 100}%` }} />
        </div>
      </div>
      <b className={lead < 0 ? 'text-pos' : 'text-muted'}>{b == null ? '–' : fmt(b)}</b>
    </div>
  )
}

function Under({ p, onOpenProfile }) {
  const linked = findDatasetPlayer(p)
  return (
    <div className="mt-3 text-center">
      <div className="text-sm text-muted">
        {p.hero} · {p.k}/{p.d}/{p.a} · {fmtK(p.souls)} souls
      </div>
      {linked && (
        <button onClick={() => onOpenProfile(linked)} className="mt-1 rounded-sm border border-gold/60 px-2.5 py-1 text-[11px] font-bold tracking-[0.15em] text-gold2 hover:bg-gold/10">
          ABRIR CARTINHA E PERFIL
        </button>
      )}
    </div>
  )
}

// passo numerado do "Novo confronto" (fica dourado quando concluído)
function Step({ n, done, text }) {
  return (
    <li className={`flex items-center gap-2 ${done ? 'text-white' : 'text-muted'}`}>
      <span className={`grid size-5 place-items-center rounded-full text-[11px] font-bold ${done ? 'bg-gold text-[#1a1305]' : 'border border-line'}`}>{done ? '✓' : n}</span>
      {text}
    </li>
  )
}

// Passo 1: escolher um jogador de cada time (ou um atalho) e comparar, sem sair daqui.
function Picker({ game, rated, onDuel }) {
  const [a, setA] = useState(null)
  const [b, setB] = useState(null)
  const best = (teamIdx, lane) =>
    rated
      .filter((p) => p.teamIdx === teamIdx && (!lane || p.laneC === lane))
      .sort((x, y) => y.ovr - x.ovr)[0]
  const lanes = Object.entries(LANES).filter(([L]) => rated.some((p) => p.laneC === L))

  return (
    <div className="p-4 sm:p-5">
      <h3 className="panel-title">⚔ NOVO CONFRONTO</h3>
      <ol className="mb-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm" aria-label="Passos do confronto">
        <Step n={1} done={a != null} text="Escolha um jogador da equipe 1" />
        <Step n={2} done={b != null} text="Escolha um jogador da equipe 2" />
        <Step n={3} done={a != null && b != null} text="Clique em Comparar" />
      </ol>
      <p className="mb-3 text-sm text-muted">Ou use um atalho para comparar na hora:</p>
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Atalhos de confronto">
        {lanes.map(([L, lane]) => (
          <button
            key={L}
            onClick={() => onDuel(best(0, L).account, best(1, L).account)}
            className="rounded-sm border px-3 py-1 text-xs font-bold tracking-wider uppercase hover:bg-white/5"
            style={{ borderColor: lane.color, color: lane.color }}
          >
            Lane {lane.name}
          </button>
        ))}
        <button onClick={() => onDuel(best(0).account, best(1).account)} className="rounded-sm border border-gold/60 px-3 py-1 text-xs font-bold tracking-wider text-gold2 uppercase hover:bg-gold/10">
          Melhor x melhor
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {game.teams.map((t, side) => {
          const sel = side === 0 ? a : b
          const set = side === 0 ? setA : setB
          const rows = rated.filter((p) => p.teamIdx === t.team).sort((x, y) => y.ovr - x.ovr)
          return (
            <div key={t.team}>
              <h4 className="mb-1.5 text-sm font-bold" style={{ color: t.team === 0 ? '#D9922B' : '#5B7FB5' }}>
                {side === 0 ? 'Equipe 1' : 'Equipe 2'} · {teamName(t)}
              </h4>
              <div className="grid gap-1" role="group" aria-label={`Jogadores da equipe ${side + 1}`}>
                {rows.map((p) => (
                  <button
                    key={p.account}
                    onClick={() => set(sel === p.account ? null : p.account)}
                    aria-pressed={sel === p.account}
                    className={`grid grid-cols-[28px_1fr_auto_auto] items-center gap-2 rounded-sm border px-2 py-1 text-left text-sm transition ${
                      sel === p.account ? 'border-gold bg-gold/15' : 'border-line bg-panel2 hover:border-gold/50'
                    }`}
                  >
                    {p.avatar ? <img src={p.avatar} alt="" referrerPolicy="no-referrer" className="size-7 rounded-sm object-cover" /> : <span className="size-7 rounded-sm bg-panel" />}
                    <span className="flex min-w-0 items-center gap-2">
                      <b className="truncate">{p.name}</b>
                      {p.laneC && <i title={`Lane ${LANES[p.laneC].name}`} className="size-2 shrink-0 rounded-full" style={{ background: LANES[p.laneC].color }} />}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <img src={heroImg(p)} alt="" referrerPolicy="no-referrer" className="size-5 rounded-full border border-gold/50" />
                      {p.hero}
                    </span>
                    <OvrBadge ovr={p.ovr} />
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => a != null && b != null && onDuel(a, b)}
          disabled={a == null || b == null}
          className="rounded-sm bg-gradient-to-b from-[#d8b25a] to-[#a8822f] px-5 py-2 text-sm font-bold tracking-[0.2em] text-[#1a1305] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100"
        >
          COMPARAR
        </button>
        <span className="text-xs text-muted">{a == null || b == null ? 'Escolha um jogador em cada equipe.' : 'Pronto! Clique em comparar.'}</span>
      </div>
    </div>
  )
}

// Janela do "Novo confronto": o seletor (equipe 1, equipe 2, Comparar) sobre a tela, com o fundo desfocado.
export function DuelPicker({ game, rated, onDuel, onClose }) {
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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-md sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Novo confronto"
    >
      <div className="relative w-full max-w-4xl rounded-md border border-gold bg-bg shadow-2xl">
        <button onClick={onClose} aria-label="Fechar" className="absolute top-3 right-3 z-10 rounded-sm border border-line bg-panel px-3 py-1 text-sm text-muted hover:border-neg hover:text-neg">
          ✕ Fechar
        </button>
        <Picker game={game} rated={rated} onDuel={onDuel} />
      </div>
    </div>
  )
}

// Cartão em vidro fosco no meio das duas tabelas: a porta de entrada do confronto.
export function DuelCta({ onOpen }) {
  return (
    <div className="relative z-10 -my-2 flex justify-center px-2" role="group" aria-label="Novo confronto">
      <div className="flex w-full max-w-xl flex-wrap items-center justify-between gap-x-5 gap-y-2 rounded-md border border-gold/70 bg-black/40 px-5 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.6)] backdrop-blur-md">
        <div>
          <div className="font-head text-base tracking-[0.18em] text-gold2">⚔ NOVO CONFRONTO</div>
          <div className="text-xs text-white/70">Escolha um jogador de cada equipe e compare as cartinhas</div>
        </div>
        <button
          onClick={onOpen}
          className="rounded-sm bg-gradient-to-b from-[#d8b25a] to-[#a8822f] px-5 py-2 text-sm font-bold tracking-[0.2em] text-[#1a1305] hover:brightness-110"
        >
          CONFRONTAR
        </button>
      </div>
    </div>
  )
}

// Passo 2: as duas cartas frente a frente + comparação; "Novo confronto" volta para a escolha.
function Result({ game, rated, a, b, onSwap, onReset, onOpenProfile }) {
  const pa = rated.find((p) => p.account === a)
  const pb = rated.find((p) => p.account === b)
  if (!pa || !pb) return null
  const sameLane = pa.laneC && pa.laneC === pb.laneC
  const lane = sameLane ? LANES[pa.laneC] : null
  const mates = laneMates(game, pa)
  const minutes = Math.max(1, game.duration / 60)

  return (
    <section className="panel p-4" aria-label="Confronto">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="panel-title !mb-0 flex-1">
          CONFRONTO
          <span className="font-body tracking-normal" style={{ color: lane?.color }}>
            {' '}
            · {lane ? `lane ${lane.name}` : 'confronto livre'}
          </span>
        </h3>
        <div className="flex gap-2">
          <button onClick={onSwap} className="rounded-sm border border-line px-3 py-1 text-xs font-bold tracking-wider text-muted hover:border-gold hover:text-gold2">
            ⇄ INVERTER
          </button>
          <button onClick={onReset} className="rounded-sm bg-gradient-to-b from-[#d8b25a] to-[#a8822f] px-4 py-1.5 text-xs font-bold tracking-wider text-[#1a1305] hover:brightness-110">
            ⚔ NOVO CONFRONTO
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-start justify-center gap-4">
        <div>
          <GameCard player={pa} />
          <Under p={pa} onOpenProfile={onOpenProfile} />
          {sameLane && mates.length > 0 && <p className="mt-1 text-center text-[11px] text-muted">dupla de lane: {mates.map((m) => m.name).join(', ')}</p>}
        </div>

        <div className="w-[210px] self-center py-2">
          <div className="mb-3 text-center font-head text-3xl tracking-widest text-gold2">VS</div>
          <div className="grid gap-2">
            {GAME_ATTRS.map((x) => (
              <Duel key={x.k} label={x.k} a={pa.values[x.k]} b={pb.values[x.k]} title={x.desc} />
            ))}
            <div className="my-1 h-px bg-line" />
            <Duel label="ABATES" a={pa.k} b={pb.k} />
            <Duel label="MORTES" a={pb.d} b={pa.d} title="Menos mortes é melhor" />
            <Duel label="SOULS" a={pa.souls} b={pb.souls} fmt={fmtK} />
            <Duel label="DANO/MIN" a={Math.round(pa.dmg / minutes)} b={Math.round(pb.dmg / minutes)} />
            <Duel label="OBJ. DANO" a={pa.bossDmg} b={pb.bossDmg} fmt={fmtK} />
            <div className="mt-2 flex items-center justify-between rounded-sm border border-line bg-panel2 px-3 py-1.5 text-sm">
              <b className={pa.ovr >= pb.ovr ? 'text-pos' : 'text-muted'}>{pa.ovr}</b>
              <span className="text-[10px] font-bold tracking-[0.2em] text-muted">NOTA DO JOGO</span>
              <b className={pb.ovr >= pa.ovr ? 'text-pos' : 'text-muted'}>{pb.ovr}</b>
            </div>
          </div>
        </div>

        <div>
          <GameCard player={pb} />
          <Under p={pb} onOpenProfile={onOpenProfile} />
        </div>
      </div>
    </section>
  )
}

// Resultado do confronto (abaixo das tabelas): as duas cartas frente a frente + comparação. Sem confronto, não mostra nada.
export default function FaceOff({ game, rated, duel, onSwap, onReset, onOpenProfile }) {
  if (!duel) return null
  return <Result game={game} rated={rated} a={duel.a} b={duel.b} onSwap={onSwap} onReset={onReset} onOpenProfile={onOpenProfile} />
}
