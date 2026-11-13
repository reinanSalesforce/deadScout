import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../App'

const setup = () => ({ user: userEvent.setup(), ...render(<App />) })
const dock = () => document.querySelector('.fixed')
const teamTab = (name) => within(document.querySelector('nav[aria-label="Times"]')).getByRole('button', { name: new RegExp(name, 'i') })
const miniOf = (nick) => within(dock()).getByRole('button', { name: new RegExp(nick, 'i') })

describe('modo cartinhas', () => {
  it('abre no primeiro time, com carta de jogador com tracker', () => {
    setup()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('FRITZ')
    expect(screen.getByText(/ABRIR TRACKER/)).toHaveAttribute('href', expect.stringContaining('deadchaps.gg/player/'))
    expect(screen.getAllByRole('button', { name: /argentina|brazil|canada|chile|mexico|peru|usa|venezuela/i }).length).toBeGreaterThanOrEqual(8)
  })

  it('dar nota atualiza carta, mini-carta, aba e média parcial', async () => {
    const { user } = setup()
    const input = screen.getByLabelText('SUA NOTA')
    await user.type(input, '85')
    expect(input).toHaveValue(85)
    expect(within(dock()).getByText('MÉDIA PARCIAL')).toBeInTheDocument()
    expect(within(dock()).getByText('85.0')).toBeInTheDocument()
    expect(within(dock()).getByText(/1\/7/)).toBeInTheDocument()
    expect(screen.getAllByText('Craque').length).toBeGreaterThan(0)
    expect(JSON.parse(localStorage.getItem('copa-america-notas-v1'))).toEqual({ 'Argentina:FRITZ': 85 })
  })

  it('média vira FINAL quando todos do time têm nota', async () => {
    const { user } = setup()
    const nicks = ['DAMAGE13', 'FRITZ', 'MAXI', 'NAVARS', 'NOZWER', 'SKYWALKER', 'LEO']
    for (const [i, n] of nicks.entries()) {
      await user.click(miniOf(n))
      await user.type(screen.getByLabelText('SUA NOTA'), String(60 + i * 5))
    }
    expect(within(dock()).getByText('MÉDIA FINAL')).toBeInTheDocument()
    expect(within(dock()).getByText('75.0')).toBeInTheDocument() // (60..90)/7
  })

  it('excluir reservas muda o denominador', async () => {
    const { user } = setup()
    await user.click(within(dock()).getByLabelText(/Incluir reservas/))
    expect(within(dock()).getByText(/0\/6/)).toBeInTheDocument()
  })

  it('trocar de time mostra outro jogador', async () => {
    const { user } = setup()
    await user.click(teamTab('Brazil'))
    expect(screen.getByRole('heading', { level: 2 })).not.toHaveTextContent('FRITZ')
    expect(within(dock()).getByText(/BRAZIL/)).toBeInTheDocument()
  })

  it('jogador sem tracker mostra o aviso', async () => {
    const { user } = setup()
    await user.click(miniOf('DAMAGE13'))
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('DAMAGE13')
    expect(screen.getByText('SEM TRACKER')).toBeInTheDocument()
    expect(screen.getByText(/não tem tracker no DeadChaps/i)).toBeInTheDocument()
    // ainda dá para dar nota
    await user.type(screen.getByLabelText('SUA NOTA'), '70')
    expect(screen.getByLabelText('SUA NOTA')).toHaveValue(70)
  })

  it('jogador com EDL mostra o painel; sem EDL mostra o aviso', async () => {
    const { user } = setup()
    expect(screen.getByText(/Sem registro competitivo no EDL/)).toBeInTheDocument()
    await user.click(teamTab('USA'))
    await user.click(miniOf('JONJON'))
    expect(screen.getByText(/CENÁRIO COMPETITIVO/)).toBeInTheDocument()
    expect(screen.getByText(/VER NO EDL/)).toHaveAttribute('href', 'https://edl.gg/players/jonjon')
  })

  it('setas do teclado navegam entre jogadores', async () => {
    const { user } = setup()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('MAXI')
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('DAMAGE13')
  })

  it('atalho de faixa define a nota', async () => {
    const { user } = setup()
    await user.click(screen.getByTitle('Atalho: nota 90+'))
    expect(screen.getByLabelText('SUA NOTA')).toHaveValue(95)
  })

  it('nota salva é recarregada ao reabrir o site', async () => {
    localStorage.setItem('copa-america-notas-v1', JSON.stringify({ 'Argentina:FRITZ': 66 }))
    setup()
    expect(screen.getByLabelText('SUA NOTA')).toHaveValue(66)
  })
})

describe('modo comparar', () => {
  const openCompare = async () => {
    const ctx = setup()
    await ctx.user.click(screen.getByRole('tab', { name: /Comparar/i }))
    return ctx
  }
  const cols = () => document.querySelectorAll('main section')

  it('mostra dois times lado a lado (Argentina x Brazil)', async () => {
    await openCompare()
    expect(screen.getByLabelText('Nota de FRITZ')).toBeInTheDocument()
    expect(screen.getByLabelText('Nota de 1WORST')).toBeInTheDocument()
    expect(screen.getAllByRole('combobox')).toHaveLength(2)
    expect(cols().length).toBeGreaterThan(0)
  })

  it('médias e diferença são calculadas', async () => {
    const { user } = await openCompare()
    await user.type(screen.getByLabelText('Nota de FRITZ'), '80')
    await user.type(screen.getByLabelText('Nota de MAXI'), '70')
    await user.type(screen.getByLabelText('Nota de 1WORST'), '90')
    expect(screen.getByText('-15.0')).toBeInTheDocument() // 75 - 90
    expect(screen.getByText(/à frente: Brazil/)).toBeInTheDocument()
  })

  it('não permite escolher o mesmo time nos dois lados', async () => {
    await openCompare()
    const [selA] = screen.getAllByRole('combobox')
    expect(within(selA).getByRole('option', { name: 'Brazil' })).toBeDisabled()
  })

  it('trocar lados inverte os times', async () => {
    const { user } = await openCompare()
    const before = screen.getAllByRole('combobox').map((s) => s.value)
    await user.click(screen.getByText(/Trocar lados/))
    expect(screen.getAllByRole('combobox').map((s) => s.value)).toEqual(before.reverse())
  })

  it('escolher outro time troca a coluna', async () => {
    const { user } = await openCompare()
    await user.selectOptions(screen.getAllByRole('combobox')[1], 'USA')
    expect(screen.getByLabelText('Nota de JONJON')).toBeInTheDocument()
    expect(screen.queryByLabelText('Nota de 1WORST')).not.toBeInTheDocument()
  })

  it('digitar a nota NÃO abre o pop-up; clicar na linha abre', async () => {
    const { user } = await openCompare()
    await user.type(screen.getByLabelText('Nota de MACHINE'), '88')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByText('MACHINE'))
    const dialog = screen.getByRole('dialog', { name: /MACHINE/ })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByLabelText('SUA NOTA')).toHaveValue(88)
    expect(within(dialog).getByText(/ABRIR TRACKER/)).toBeInTheDocument()
    expect(within(dialog).getByText(/ÚLTIMAS PARTIDAS/)).toBeInTheDocument()
  })

  it('pop-up: Esc fecha e continua no comparativo; nota do pop-up reflete na linha', async () => {
    const { user } = await openCompare()
    await user.click(screen.getByText('MACHINE'))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('SUA NOTA'), '77')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('COMPARATIVO')).toBeInTheDocument()
    expect(screen.getByLabelText('Nota de MACHINE')).toHaveValue(77)
  })

  it('pop-up fecha pelo botão Fechar e libera a rolagem', async () => {
    const { user } = await openCompare()
    await user.click(screen.getByText('MACHINE'))
    expect(document.body.style.overflow).toBe('hidden')
    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('pop-up de jogador sem tracker mostra o aviso', async () => {
    const { user } = await openCompare()
    await user.click(screen.getByText('LAROKASHI'))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('SEM TRACKER')).toBeInTheDocument()
  })

  it('voltar para Cartinhas mantém as notas', async () => {
    const { user } = await openCompare()
    await user.type(screen.getByLabelText('Nota de FRITZ'), '81')
    await user.click(screen.getByRole('tab', { name: /Cartinhas/i }))
    await user.click(miniOf('FRITZ'))
    expect(screen.getByLabelText('SUA NOTA')).toHaveValue(81)
  })
})

describe('grupos de times (EDL)', () => {
  const groupBtn = (name) => screen.getByRole('button', { name: new RegExp(name, 'i') })

  it('alterna para Times pro (EDL) e lista Cloud9, Leviathan e Buff Enjoyers', async () => {
    const { user } = setup()
    await user.click(groupBtn('Times pro'))
    const nav = document.querySelector('nav[aria-label="Times"]')
    for (const n of ['Cloud9', 'Leviathan', 'Buff Enjoyers']) {
      expect(within(nav).getByRole('button', { name: new RegExp(n, 'i') })).toBeInTheDocument()
    }
    expect(within(nav).queryByRole('button', { name: /argentina/i })).not.toBeInTheDocument()
  })

  it('abre carta de jogador de time pro, dá nota e calcula a média', async () => {
    const { user } = setup()
    await user.click(groupBtn('Times pro'))
    await user.click(teamTab('Cloud9'))
    const first = within(dock()).getAllByRole('button')[0]
    await user.click(first)
    await user.type(screen.getByLabelText('SUA NOTA'), '90')
    expect(within(dock()).getByText('90.0')).toBeInTheDocument()
    expect(within(dock()).getByText(/CLOUD9/i)).toBeInTheDocument()
  })

  it('link do time EDL abre em nova aba', async () => {
    const { user } = setup()
    await user.click(groupBtn('Times pro'))
    const link = screen.getByTitle('Abrir o time no EDL.gg')
    expect(link).toHaveAttribute('href', expect.stringContaining('edl.gg/teams/'))
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('comparativo aceita times de grupos diferentes (Brazil x Cloud9)', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('tab', { name: /Comparar/i }))
    await user.selectOptions(screen.getAllByRole('combobox')[1], 'Cloud9')
    expect(screen.queryByLabelText('Nota de 1WORST')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Nota de FRITZ')).toBeInTheDocument()
    expect(screen.getByLabelText('Nota de Lomein')).toBeInTheDocument()
  })
})

describe('links externos abrem em outra aba', () => {
  const externalLinks = (root = document) => [...root.querySelectorAll('a[href^="http"]')]

  it('cartinha: todos os links externos têm target=_blank e rel=noreferrer', () => {
    setup()
    const links = externalLinks()
    expect(links.length).toBeGreaterThan(0)
    for (const a of links) {
      expect(a, a.href).toHaveAttribute('target', '_blank')
      expect(a.getAttribute('rel')).toContain('noreferrer')
    }
  })

  it('pop-up do comparativo: tracker, EDL e partidas abrem em nova aba', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('tab', { name: /Comparar/i }))
    await user.selectOptions(screen.getAllByRole('combobox')[1], 'USA')
    await user.click(screen.getByText('JONJON'))
    const dialog = screen.getByRole('dialog')
    const links = externalLinks(dialog)
    expect(links.length).toBeGreaterThan(3) // tracker + EDL + partidas
    for (const a of links) {
      expect(a, a.href).toHaveAttribute('target', '_blank')
      expect(a.getAttribute('rel')).toContain('noreferrer')
    }
  })
})
