// Funções dos heróis, no estilo da posição da carta de FIFA (ST, MEI, MC...).
// O Deadlock NÃO tem funções oficiais (a API de heróis só traz "tags" de estilo). Esta é uma classificação própria, feita
// pelo kit de cada herói e conferida com o estilo de jogo medido nas partidas (Statlocker: dano, suporte, tank). Para
// mudar a função de um herói, basta editar HERO_ROLE abaixo.

export const ROLES = {
  carry: { label: 'CARRY', name: 'Carry', desc: 'Dano contínuo que escala (armas ou espírito): ganha o jogo no fim.' },
  suporte: { label: 'SUPORTE', name: 'Suporte', desc: 'Cura, proteção e utilidade para o time.' },
  anti: { label: 'ANTI-CARRY', name: 'Anti-carry', desc: 'Mergulha, controla e elimina o carry inimigo (assassinos e disruptores).' },
  tank: { label: 'TANK', name: 'Tank', desc: 'Linha de frente: absorve dano e inicia as lutas.' },
}

export const HERO_ROLE = {
  // Carry
  Infernus: 'carry',
  Seven: 'carry',
  Vindicta: 'carry',
  'Lady Geist': 'carry',
  Wraith: 'carry',
  Haze: 'carry',
  Holliday: 'carry',
  'Grey Talon': 'carry',
  Vyper: 'carry',
  Yamato: 'carry',
  Mina: 'carry',
  Venator: 'carry',
  Graves: 'carry',
  Mirage: 'carry',
  // Suporte
  McGinnis: 'suporte',
  Dynamo: 'suporte',
  Kelvin: 'suporte',
  Ivy: 'suporte',
  Paige: 'suporte',
  Rem: 'suporte',
  Celeste: 'suporte',
  'Nurse Harrow': 'suporte',
  'The Doorman': 'suporte',
  Sinclair: 'suporte',
  // Anti-carry
  Paradox: 'anti',
  Calico: 'anti',
  Pocket: 'anti',
  Drifter: 'anti',
  Lash: 'anti',
  Apollo: 'anti',
  Silver: 'anti',
  Shiv: 'anti',
  Solomon: 'anti',
  'Deadman Danny': 'anti',
  Viscous: 'anti',
  // Tank
  Abrams: 'tank',
  'Mo & Krill': 'tank',
  Bebop: 'tank',
  Billy: 'tank',
  Warden: 'tank',
  Victor: 'tank',
  'Rat King': 'tank',
  // heróis novos (em desenvolvimento no jogo): classificação provisória / sem função definida
  Baba: 'anti', // feitiços de controle (hex)
}

// função do herói ou null quando ainda não há classificação (ex.: Violet, herói novo)
export const roleOf = (heroName) => ROLES[HERO_ROLE[heroName]] ?? null
