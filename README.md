# Deadlock Scout — cartas, notas e confrontos

Projeto de fã (sem afiliação com a Valve nem com o Deadlock Premier). Site React (Vite + Tailwind) com os jogadores da Copa América de Deadlock e de times profissionais (EDL.gg), stats do DeadChaps, cartinhas com atributos editáveis, notas suas (salvas no navegador) e comparativo entre times.

## Rodar local

```bash
npm install
npm run dev
npm test
```

## Dados e atualização

Os dados (DeadChaps + EDL.gg) ficam em dois arquivos idênticos, gerados juntos:

- `src/data/players.json`: versão empacotada no build (carga inicial e testes).
- `public/data/players.json`: arquivo que o site rebusca ao vivo, sem novo build.

```bash
node scripts/fetch-data.mjs
```

- O script **não sobrescreve** os dados se as APIs estiverem fora do ar (menos de 60% dos perfis coletados).
- No site, o botão **Atualizar** (e uma checagem automática a cada **1 hora**) rebusca `data/players.json` e troca os dados na tela, sem recarregar a página.
- **Suas notas e atributos editados nunca são tocados**: ficam no `localStorage` do navegador (chaves `copa-america-notas-v1` e `copa-america-atributos-v1`).
- No GitHub, o workflow **Atualizar dados (a cada hora)** roda `fetch-data.mjs` e republica o site. Nada é commitado a cada hora; o arquivo do repositório é o plano B.
- O navegador não consegue chamar o DeadChaps/EDL direto (CORS), por isso a coleta roda no GitHub Actions.
- **A cartinha é sua**: os 6 atributos (KDA, DMG, SOU, OBJ, FRM, IMP, de 1 a 99) começam **vazios** e só mudam com o que você digitar; atualizações de dados nunca alteram a carta. Eles são os mesmos 6 da carta do torneio, que é calculada dos jogos da Copa, para a comparação ser um a um. A explicação de cada sigla aparece na tela ("O que é cada nota?").

## Aba Torneios (dados ao vivo do torneio)

A aba **Torneios** mostra os confrontos e jogos (Game 1, 2, 3…) da Copa América com as estatísticas oficiais do deadlockpremier.com e a **nota de cada jogador em cada jogo** (carta do jogo, 6 atributos de 1 a 99).

- Fonte: API JSON usada pelo próprio site do torneio (`/api/match?archive=1` e `/api/match?view=<id>`).
- O navegador não consegue chamá-la direto (CORS). O workflow **Partidas ao vivo (a cada 5 min)** roda `scripts/fetch-matches.mjs` e guarda `matches.json` na branch **`live-data`**; o site lê esse arquivo por `raw.githubusercontent.com` e confere a cada 1 minuto com a aba aberta. Só há commit quando as partidas mudam e **não há novo deploy**.
- Latência real: até ~5 a 10 min depois que o site oficial publica um jogo (limite do agendador do GitHub e do cache do raw).
- **Exemplo**: o botão "Exemplo: Showdown #2" usa `public/data/demo.json` (evento já encerrado, 67 jogos). Para regerar: `node scripts/fetch-demo.mjs`.
- **Chave da Copa América**: a aba mostra a chave inteira (Upper bracket: quartas, semis, final e Grand Final; Lower bracket: rodadas 1 a 3 e Lower Final) mesmo antes de existir qualquer jogo, com "Vencedor/Perdedor de ..." nos times ainda não definidos. A estrutura é a do motor do site oficial (`src/bracket.js`, eliminatória dupla por seeds) e os times/resultados vêm ao vivo de `https://deadlockpremier.com/api/bracket?featured=1` (o site libera CORS, então o navegador lê direto, a cada 1 min). Se essa chave não responder, usa a chave padrão das 8 seleções. As partidas publicadas entram no cartão do confronto pelos dois times.
- **Fluxo de telas**: chave de confrontos → (clicar no confronto) **tela dos games**, um abaixo do outro com vencedor, abates, net worth, duração e MVP → (clicar num game) **estatísticas do game**. Nas estatísticas, **← Games** volta para a tela dos games (de onde se abre o Game 2), **← Confrontos** volta à chave e **Próximo game ›** pula direto para o seguinte. O botão "Ver game N" do cartão continua sendo um atalho direto para as estatísticas.
- **Lista de confrontos (modelo do site oficial)**: cartões por fase (quartas, semifinais, final, fase de grupos...) com os dois times e o placar, e os jogos **Game 1, Game 2... um embaixo do outro**; "VER JOGO" abre a tela do jogo e "← Confrontos" volta. Filtro por time/fase e ordem (mais recentes / ordem do torneio).
- **Função do herói na carta**: sob a nota (como a posição na carta de FIFA) aparece **Carry, Suporte, Anti-carry ou Tank**, no lugar do nome da faixa (Craque/Bagre). O Deadlock não tem funções oficiais; a classificação é própria (`src/heroRoles.js`), feita pelo kit de cada herói e conferida com o estilo de jogo medido nas partidas (dano, suporte, tank do Statlocker). Para mudar um herói é só editar `HERO_ROLE`. Heróis novos sem classificação (ex.: Violet) mostram a faixa da nota como antes.
- **Imagens dos heróis**: o nome interno do herói no site do torneio nem sempre é o do arquivo da imagem (Lady Geist = `ghost`, imagem `spectre`). A coleta grava `heroKey` (do DeadChaps) e `src/matches.js` (`HERO_ASSET`) cobre dados antigos.
- **Tela do jogo (modelo do site oficial)**: faixa de cada time (vitória/derrota, net worth, abates) com a tabela de jogadores; um cartão em vidro fosco **"Novo confronto"** fica no meio das duas tabelas; o botão **Confrontar** abre uma janela (fundo desfocado) com **Equipe 1, Equipe 2** e **Comparar** (ou um atalho: lane Yellow/Blue/Green, melhor x melhor), e as duas cartas aparecem frente a frente abaixo das tabelas, com barras de duelo (**Inverter** e **Novo confronto** refazem); clicar num jogador da tabela é um atalho para o confronto dele contra o adversário da lane; mais abaixo ficam as estatísticas: curva de souls com os marcos de objetivos, fase de lane (8 min), nota de MVP do Statlocker e o detalhe do jogador (renda por fonte, itens, estilo de jogo, dano por fonte). A lane é a REAL (posição média no mapa entre 1:30 e 6:00), igual ao site; totais intermediários de souls são estimativas (≈).
- **Notas do jogo**: KDA, dano/min, souls/min, dano em objetivos/min e farm/min são a posição entre os 12 jogadores (1º = 99, último = 45); IMP é a nota de MVP do Statlocker. Pesos em `src/matches.js`.
- Quando as partidas da Copa existem, as contas Steam oficiais do cadastro do torneio corrigem o perfil de cada jogador no `fetch-data.mjs`.

## Publicar no GitHub Pages

1. Envie esta pasta (raiz do repositório, branch `main`) para o GitHub.
2. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. A cada push na `main`, o workflow `.github/workflows/deploy.yml` roda os testes, coleta dados novos, faz o build e publica.
4. O site fica em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.

O `vite.config.js` usa `base: './'`, então funciona com qualquer nome de repositório.

## Comparação e imagem da carta

- **Minha nota x Jogos** (aba Cartinhas): quando o jogador já tem jogos na Copa, aparece a **sua carta** ao lado da **carta do torneio** (média, ou o jogo que você escolher), com um corte de cada herói usado (até 3) e a pool de heróis, os 6 atributos lado a lado e o veredito (Bateu / Você achou pior / Você achou melhor). Para ver antes da Copa, abra o site com `?exemplo` no endereço (jogos de mentira).
- **Baixar carta (PNG)**: botão sob a cartinha e sob as duas cartas da comparação; gera a imagem da carta para usar na live (as imagens de herói, rank e bandeira liberam CORS e entram na foto).

## Perfil do jogador = só a Copa

Na aba Cartinhas, o perfil abaixo da nota mostra **apenas o que o jogador fez na Copa**: **Desempenho · Copa América** (jogos, win rate, nota média, KDA, souls, dano, MVPs e radar), **Frag · Copa** (média K/D/A, recordes), **Heróis na Copa** e **Últimos jogos da Copa**. Enquanto ele não jogou, aparece um aviso. A carreira inteira (ranked, histórico, heróis de sempre) ficou no botão **Ver carreira no tracker**, que abre o DeadChaps dele em outra aba.
