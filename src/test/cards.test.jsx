import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { useAttrs } from '../useAttrs'
import { GAME_ATTRS } from '../matches'
import { ATTRS, attrValues, ovrOf, players } from '../lib'

const KEY = 'copa-america-atributos-v1'

describe('atributos da carta (lib)', () => {
  it('são os mesmos 6 atributos da carta do torneio e os pesos somam 100%', () => {
    expect(ATTRS.map((a) => a.k)).toEqual(['KDA', 'DMG', 'SOU', 'OBJ', 'FRM', 'IMP'])
    expect(ATTRS.map((a) => a.k)).toEqual(GAME_ATTRS.map((a) => a.k))
    expect(ATTRS.map((a) => a.w)).toEqual(GAME_ATTRS.map((a) => a.w)) // mesmo peso: a nota geral é comparável
    expect(ATTRS.reduce((s, a) => s + a.w, 0)).toBeCloseTo(1)
  })

  it('a carta começa ZERADA para todo jogador: nenhum valor vem dos dados', () => {
    for (const p of players) {
      const v = attrValues(p)
      expect(Object.values(v).every((x) => x === null), `${p.team}:${p.nick}`).toBe(true)
      expect(ovrOf(v)).toBeNull()
    }
  })

  it('só o que a pessoa digitou aparece, e os dados do site nunca mudam a carta', () => {
    const p = players.find((x) => x.found)
    expect(attrValues(p, { DMG: 12 })).toEqual({ KDA: null, DMG: 12, SOU: null, OBJ: null, FRM: null, IMP: null })
    expect(attrValues({ ...p, stats: { games: 999 }, mvp: { score: 99 } }, { DMG: 12 })).toEqual(attrValues(p, { DMG: 12 }))
  })

  it('nota geral é a média ponderada e renormaliza quando faltam atributos', () => {
    const all = { KDA: 100, DMG: 100, SOU: 100, OBJ: 100, FRM: 100, IMP: 100 }
    expect(ovrOf(all)).toBe(100)
    expect(ovrOf({ ...all, KDA: 50 })).toBe(90) // 100 - 0.2*50
    expect(ovrOf({ KDA: 80, DMG: 60, SOU: null, OBJ: null, FRM: null, IMP: null })).toBe(70)
  })
})

describe('useAttrs (autosave)', () => {
  it('salva, limita 1..99, remove vazio e restaura', () => {
    const { result } = renderHook(() => useAttrs())
    act(() => result.current.setAttr('T:A', 'KDA', '150'))
    act(() => result.current.setAttr('T:A', 'AIM', '0'))
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual({ 'T:A': { KDA: 99, AIM: 1 } })
    act(() => result.current.setAttr('T:A', 'KDA', ''))
    expect(result.current.overrides['T:A']).toEqual({ AIM: 1 })
    act(() => result.current.resetAttrs('T:A'))
    expect(result.current.overrides).toEqual({})
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual({})
  })

  it('recarrega o que estava salvo e ignora JSON quebrado', () => {
    localStorage.setItem(KEY, JSON.stringify({ 'X:Y': { OBJ: 77 } }))
    expect(renderHook(() => useAttrs()).result.current.overrides['X:Y']).toEqual({ OBJ: 77 })
    localStorage.setItem(KEY, '{oops')
    expect(renderHook(() => useAttrs()).result.current.overrides).toEqual({})
  })
})

describe('carta na tela', () => {
  const card = () => screen.getByRole('article', { name: /Carta de/ })

  it('a cartinha começa vazia e sem herói: atributos sem valor, nota geral em branco, foto do jogador no fundo e nenhuma pool', () => {
    render(<App />)
    const c = within(card())
    for (const a of ATTRS) expect(c.getByLabelText('Atributo ' + a.k)).toHaveValue(null)
    expect(c.getByRole('heading', { level: 2 })).toHaveTextContent('FRITZ')
    expect(c.queryByText(/^shiv$/i)).not.toBeInTheDocument() // sem nome de herói antes dos jogos
    expect(c.queryByRole('list', { name: 'Pool de heróis' })).not.toBeInTheDocument()
    expect(card().querySelector('[data-role]')).toBeNull() // a função vem do herói jogado na Copa
    expect(c.getByText('–')).toBeInTheDocument() // nota geral em branco
    const fritz = players.find((p) => p.team === 'Argentina' && p.nick === 'FRITZ')
    expect(card().querySelector('img[data-photo]')).toHaveAttribute('src', fritz.avatar) // foto do jogador atrás
    expect(c.queryByRole('img', { name: 'FRITZ' })).not.toBeInTheDocument() // sem a bolinha pequena
  })

  it('o que a pessoa digita vira a carta, gera a nota geral, persiste e pode ser limpo', async () => {
    const user = userEvent.setup()
    render(<App />)
    const c = within(card())
    await user.type(c.getByLabelText('Atributo KDA'), '80')
    await user.type(c.getByLabelText('Atributo DMG'), '60')
    expect(c.getByLabelText('Atributo KDA')).toHaveValue(80)
    expect(JSON.parse(localStorage.getItem(KEY))['Argentina:FRITZ']).toEqual({ KDA: 80, DMG: 60 })
    expect(c.getByText('70')).toBeInTheDocument() // (80*0,2 + 60*0,2) / 0,4
    await user.click(c.getByText('limpar atributos'))
    expect(c.getByLabelText('Atributo KDA')).toHaveValue(null)
    expect(localStorage.getItem(KEY)).toBe('{}')
  })

  it('jogador sem tracker também começa vazio e aceita edição', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(within(document.querySelector('.fixed')).getByRole('button', { name: /DAMAGE13/i }))
    const c = within(card())
    expect(c.getByLabelText('Atributo KDA')).toHaveValue(null)
    await user.type(c.getByLabelText('Atributo KDA'), '70')
    expect(c.getByLabelText('Atributo KDA')).toHaveValue(70)
  })

  it('a cor do brilho vem da faixa da nota, não de um herói', () => {
    render(<App />)
    expect(card().style.getPropertyValue('--hero')).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('inclina com o mouse e volta ao sair (sem inclinar no toque)', () => {
    render(<App />)
    const c = card()
    c.getBoundingClientRect = () => ({ left: 0, top: 0, width: 300, height: 400, right: 300, bottom: 400 })
    fireEvent.pointerMove(c, { clientX: 270, clientY: 80, pointerType: 'mouse' })
    expect(c.style.getPropertyValue('--ry')).toBe('5.6000000000000005deg')
    fireEvent.pointerLeave(c, { pointerType: 'mouse' })
    expect(c.style.getPropertyValue('--ry')).toBe('')
    fireEvent.pointerMove(c, { clientX: 270, clientY: 80, pointerType: 'touch' })
    expect(c.style.getPropertyValue('--ry')).toBe('')
  })

  it('sua nota aparece na ponta da carta', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('SUA NOTA'), '88')
    expect(within(card()).getByText('SUA NOTA 88')).toBeInTheDocument()
  })

  it('pop-up do comparativo também tem a carta editável', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: /Comparar/i }))
    await user.click(screen.getByText('MACHINE'))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText('Atributo KDA')).toBeInTheDocument()
  })
})
