import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'
import { useAttrs } from '../useAttrs'
import { ATTRS, attrValues, baseAttrs, ovrOf, players } from '../lib'

const KEY = 'copa-america-atributos-v1'
const withStats = players.filter((p) => p.stats && p.wins != null)

describe('atributos da carta (lib)', () => {
  it('são 6 atributos e os pesos somam 100%', () => {
    expect(ATTRS.map((a) => a.k)).toEqual(['KDA', 'DMG', 'SOU', 'AIM', 'OBJ', 'WIN'])
    expect(ATTRS.reduce((s, a) => s + a.w, 0)).toBeCloseTo(1)
  })

  it('notas calculadas ficam entre 45 e 99 para todo jogador com stats', () => {
    for (const p of withStats) {
      const b = baseAttrs(p)
      for (const a of ATTRS) {
        expect(b[a.k], `${p.team}:${p.nick} ${a.k}`).toBeGreaterThanOrEqual(45)
        expect(b[a.k], `${p.team}:${p.nick} ${a.k}`).toBeLessThanOrEqual(99)
      }
    }
  })

  it('jogador sem stats não tem atributos calculados e nota geral nula', () => {
    const p = players.find((x) => !x.stats)
    expect(baseAttrs(p)).toEqual({})
    expect(ovrOf(attrValues(p))).toBeNull()
  })

  it('edição do usuário tem prioridade sobre o calculado', () => {
    const p = withStats[0]
    expect(attrValues(p, { KDA: 12 }).KDA).toBe(12)
    expect(attrValues(p, {}).KDA).toBe(baseAttrs(p).KDA)
  })

  it('nota geral é a média ponderada e renormaliza quando faltam atributos', () => {
    const all = { KDA: 100, DMG: 100, SOU: 100, AIM: 100, OBJ: 100, WIN: 100 }
    expect(ovrOf(all)).toBe(100)
    expect(ovrOf({ ...all, KDA: 50 })).toBe(90) // 100 - 0.2*50
    expect(ovrOf({ KDA: 80, DMG: null, SOU: null, AIM: null, OBJ: null, WIN: 60 })).toBe(70)
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

  it('mostra nota geral, 6 atributos e herói principal', () => {
    render(<App />)
    const c = within(card())
    for (const a of ATTRS) expect(c.getByLabelText(`Atributo ${a.k}`)).toBeInTheDocument()
    expect(c.getByRole('heading', { level: 2 })).toHaveTextContent('FRITZ')
    expect(c.getByText(/^shiv$/i)).toBeInTheDocument()
  })

  it('editar um atributo muda a nota geral, persiste e permite restaurar', async () => {
    const user = userEvent.setup()
    render(<App />)
    const c = within(card())
    const field = c.getByLabelText('Atributo KDA')
    const before = Number(field.value)
    await user.clear(field)
    await user.type(field, '99')
    expect(field).toHaveValue(99)
    expect(JSON.parse(localStorage.getItem(KEY))['Argentina:FRITZ']).toEqual({ KDA: 99 })
    await user.click(c.getByText('restaurar calculados'))
    expect(c.getByLabelText('Atributo KDA')).toHaveValue(before)
    expect(localStorage.getItem(KEY)).toBe('{}')
  })

  it('jogador sem stats mostra campos vazios e aceita edição', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(within(document.querySelector('.fixed')).getByRole('button', { name: /DAMAGE13/i }))
    const c = within(card())
    expect(c.getByLabelText('Atributo KDA')).toHaveValue(null)
    await user.type(c.getByLabelText('Atributo KDA'), '70')
    expect(c.getByLabelText('Atributo KDA')).toHaveValue(70)
  })

  it('usa a arte oficial do herói e a cor dele no brilho', () => {
    render(<App />)
    const art = card().querySelector('img[aria-hidden="true"]')
    expect(art).toHaveAttribute('src', expect.stringContaining('deadlock-api.com'))
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
    expect(within(dialog).getByLabelText('Atributo AIM')).toBeInTheDocument()
  })
})
