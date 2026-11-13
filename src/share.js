// Baixar a carta como imagem.
// Baixa a carta (um elemento <article>) como imagem PNG, para usar em live/redes. As imagens dos heróis, ranks e
// bandeiras liberam CORS, então entram na foto.
// As fontes do Google ficam em outro domínio (o navegador não deixa ler as regras), então baixamos o CSS delas e
// embutimos os arquivos como dados para a imagem sair com as mesmas letras da tela.
let fontCache
async function fontCss() {
  if (fontCache !== undefined) return fontCache
  try {
    const link = document.querySelector('link[rel="stylesheet"][href*="fonts.googleapis.com/css"]')
    if (!link) return (fontCache = '')
    let css = await (await fetch(link.href)).text()
    const urls = [...new Set([...css.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]))]
    for (const u of urls) {
      const blob = await (await fetch(u)).blob()
      const data = await new Promise((ok) => {
        const r = new FileReader()
        r.onload = () => ok(r.result)
        r.readAsDataURL(blob)
      })
      css = css.split(u).join(data)
    }
    return (fontCache = css)
  } catch {
    return (fontCache = '')
  }
}

export async function cardToPng(el, filename) {
  const { toPng } = await import('html-to-image')
  const fonts = await fontCss()
  const url = await toPng(el, {
    ...(fonts ? { fontEmbedCSS: fonts } : { skipFonts: true }),
    pixelRatio: 2,
    cacheBust: true,
    style: { transform: 'none', margin: '0' }, // sem a inclinação do mouse e sem a margem automática (que deslocava a carta)
    filter: (n) => !n.classList?.contains('fut-shine') && n.tagName !== 'BUTTON', // sem o brilho do mouse nem o "restaurar calculados"
  })
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}
