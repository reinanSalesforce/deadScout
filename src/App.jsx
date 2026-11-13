import { useCallback, useEffect, useMemo, useState } from 'react'
import { teams, players, keyOf, updatedAt, tierOf, rosterOf, teamStats, GROUPS, teamsOf, groupOfTeam } from './lib'
import { useGrades } from './useGrades'
import TradingCard from './components/TradingCard'
import GradeInput from './components/GradeInput'
import Details from './components/Details'
import MiniCard from './components/MiniCard'
import TeamAverage from './components/TeamAverage'
import CompareView from './components/CompareView'
import PlayerModal from './components/PlayerModal'

const firstOf = (name) => {
  const r = rosterOf(name)
  return (r.find((p) => p.found && p.recent?.length) ?? r[0]).nick
}

export default function App() {
  const { grades, setGrade, clearAll, savedAt } = useGrades()
  const [mode, setMode] = useState('time') // 'time' | 'comparar'
  const [teamName, setTeamName] = useState(teams[0].name)
  const [selected, setSelected] = useState(() => firstOf(teams[0].name))
  const [includeSubs, setIncludeSubs] = useState(true)
  const [modalKey, setModalKey] = useState(null)

  const team = teams.find((t) => t.name === teamName)
  const roster = useMemo(() => rosterOf(teamName), [teamName])
  const current = roster.find((p) => p.nick === selected) ?? roster[0]
  const modalPlayer = modalKey ? players.find((p) => keyOf(p) === modalKey) : null
  const closeModal = useCallback(() => setModalKey(null), [])

  const group = groupOfTeam(teamName)
  const groupTeams = teamsOf(group)

  const pickTeam = (name) => {
    setTeamName(name)
    setSelected(firstOf(name))
  }
  const pickGroup = (g) => pickTeam(teamsOf(g)[0].name)

  // setas do teclado navegam entre os jogadores (sem atrapalhar campos nem o pop-up)
  useEffect(() => {
    if (mode !== 'time' || modalKey) return
    const onKey = (e) => {
      const el = document.activeElement
      if (['INPUT', 'SELECT'].includes(el?.tagName) && el.type !== 'range') return
      const i = roster.indexOf(current)
      if (e.key === 'ArrowRight') setSelected(roster[(i + 1) % roster.length].nick)
      if (e.key === 'ArrowLeft') setSelected(roster[(i - 1 + roster.length) % roster.length].nick)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, modalKey, roster, current])

  return (
    <div className={`mx-auto max-w-[1240px] px-4 pt-4 ${mode === 'time' ? 'pb-40' : 'pb-10'}`}>
      {/* topo */}
      <header className="relative flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
        <span className="absolute bottom-[-1px] left-0 h-0.5 w-36 bg-gold" />
        <div>
          <h1 className="font-head text-[clamp(24px,4vw,38px)] leading-none tracking-wider text-gold2">
            COPA AMÉRICA
            <span className="mt-1 block text-[0.42em] tracking-[0.4em] text-gold">DEADLOCK PREMIER</span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            14 e 15 de novembro · 8 nações · stats ranked via DeadChaps · coletado em {new Date(updatedAt).toLocaleDateString('pt-BR')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex overflow-hidden rounded-sm border border-gold/60" role="tablist" aria-label="Modo">
            {[
              ['time', 'Cartinhas'],
              ['comparar', 'Comparar times'],
            ].map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={mode === id}
                onClick={() => setMode(id)}
                className={`px-4 py-1.5 font-head text-xs tracking-[0.15em] uppercase transition ${
                  mode === id ? 'bg-gold text-[#1a1305]' : 'bg-panel text-muted hover:text-gold2'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => confirm('Apagar todas as notas salvas?') && clearAll()}
            className="rounded-sm border border-line px-3 py-1.5 text-sm text-muted hover:border-neg hover:text-neg"
          >
            Limpar notas
          </button>
        </div>
      </header>

      {mode === 'comparar' ? (
        <main className="mt-5">
          <CompareView
            grades={grades}
            setGrade={setGrade}
            includeSubs={includeSubs}
            onToggleSubs={setIncludeSubs}
            onOpen={(p) => setModalKey(keyOf(p))}
          />
        </main>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Grupo de times">
            {GROUPS.map((g) => (
              <button
                key={g.id}
                onClick={() => pickGroup(g.id)}
                aria-pressed={group === g.id}
                className={`rounded-sm border px-3 py-1 font-head text-[11px] tracking-[0.15em] uppercase transition ${
                  group === g.id ? 'border-gold bg-gold/15 text-gold2' : 'border-line text-muted hover:text-gold2'
                }`}
              >
                {g.label} <span className="text-muted">({teamsOf(g.id).length})</span>
              </button>
            ))}
            {team.group === 'EDL' && (
              <a
                href={team.url}
                target="_blank"
                rel="noreferrer"
                className="ml-auto text-xs font-bold tracking-widest text-gold2 hover:underline"
                title="Abrir o time no EDL.gg"
              >
                {team.name} · {team.region} · #{team.globalRank ?? '–'} global · {team.titles} títulos · ${Math.round(team.earnings).toLocaleString('en-US')} ↗
              </a>
            )}
          </div>

          <nav className="mt-2 flex gap-2 overflow-x-auto pb-1" aria-label="Times">
            {groupTeams.map((t) => {
              const { avg } = teamStats(rosterOf(t.name), grades, includeSubs)
              const active = t.name === teamName
              return (
                <button
                  key={t.name}
                  onClick={() => pickTeam(t.name)}
                  style={{ '--tier': tierOf(avg)?.color ?? '#6b5a2e' }}
                  className={`flex min-w-[132px] flex-1 items-center gap-2 rounded-sm border border-b-2 border-b-(--tier) px-3 py-2 text-left font-bold tracking-wide uppercase transition ${
                    active ? 'border-gold bg-gradient-to-b from-[#2a2417] to-panel' : 'border-line bg-panel hover:border-gold/60'
                  }`}
                >
                  <img src={t.flag} alt="" className={`h-[18px] w-[26px] rounded-sm ${t.group === 'EDL' ? 'object-contain' : 'object-cover'}`} />
                  <span className="flex-1 text-sm">{t.name}</span>
                  <em className="text-(--tier) not-italic">{avg != null ? avg.toFixed(1) : '–'}</em>
                </button>
              )
            })}
          </nav>

          <main className="mt-3 grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className="grid gap-4 lg:sticky lg:top-4">
              <TradingCard key={keyOf(current)} player={current} team={team} grade={grades[keyOf(current)]} />
              <GradeInput value={grades[keyOf(current)]} onChange={(v) => setGrade(keyOf(current), v)} savedAt={savedAt} />
            </div>
            <Details key={keyOf(current)} player={current} grade={grades[keyOf(current)]} />
          </main>

          {/* barra fixa: companheiros + média do time */}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gold/60 bg-bg/95 backdrop-blur">
            <div className="mx-auto flex max-w-[1240px] flex-col gap-2 px-4 py-1.5 md:flex-row md:items-center md:gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 font-head text-[10px] tracking-[0.2em] text-gold">
                  {team.name.toUpperCase()} <span className="font-body tracking-normal text-muted">· ← → para navegar</span>
                </div>
                <div className="flex gap-2 overflow-x-auto pt-1 pb-1">
                  {roster.map((p) => (
                    <MiniCard key={keyOf(p)} player={p} grade={grades[keyOf(p)]} active={p === current} onClick={() => setSelected(p.nick)} />
                  ))}
                </div>
              </div>
              <div className="md:w-72 md:shrink-0">
                <TeamAverage roster={roster} grades={grades} includeSubs={includeSubs} onToggleSubs={setIncludeSubs} compact />
              </div>
            </div>
          </div>
        </>
      )}

      <footer className="mt-8 border-t border-line pt-3 text-xs text-muted">
        Lista de jogadores: deadlockpremier.com/copa-america · Stats: deadchaps.gg · Cenário competitivo: edl.gg. Perfis são associados pelo nick e podem estar errados
        (veja a etiqueta de confiança e use “Abrir tracker” para conferir). Notas ficam salvas só neste navegador. Projeto de fã, sem
        afiliação com a Valve.
      </footer>

      {modalPlayer && (
        <PlayerModal
          player={modalPlayer}
          grade={grades[keyOf(modalPlayer)]}
          onGrade={(v) => setGrade(keyOf(modalPlayer), v)}
          savedAt={savedAt}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
