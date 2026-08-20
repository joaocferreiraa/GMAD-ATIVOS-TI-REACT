// Lado do avatar depois da redução. 128px cobre com folga o maior lugar onde
// a foto aparece (26px na barra, em telas de densidade 2x = 52px reais) e
// mantém o data URL na casa dos 6-10KB.
const LADO = 128
// JPEG e não PNG: foto de pessoa é conteúdo fotográfico, e PNG guardaria isso
// sem perda nenhuma — arquivo várias vezes maior sem diferença visível num
// círculo de 26px. A qualidade 0.82 é o joelho da curva pra esse tamanho.
const QUALIDADE = 0.82

// Limite do ARQUIVO DE ENTRADA, antes de qualquer processamento. Não é sobre
// o resultado (que sai sempre pequeno), é sobre não travar o navegador
// decodificando uma foto de 40MP vinda direto da câmera.
export const MAX_ARQUIVO_BYTES = 8 * 1024 * 1024

// Reduz uma imagem escolhida pelo usuário a um quadrado de 128px e devolve
// data URL JPEG.
//
// RECORTE CENTRAL, não deformação: a foto vira quadrado pegando o maior
// quadrado central possível. Esticar pra caber achataria rostos, que é o
// conteúdo desta imagem em 100% dos casos.
export function reduzirImagemParaAvatar(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('O arquivo escolhido não é uma imagem.'))
      return
    }
    if (file.size > MAX_ARQUIVO_BYTES) {
      reject(new Error('Imagem muito grande. Escolha uma de até 8 MB.'))
      return
    }

    const url = URL.createObjectURL(file)
    const img = new Image()

    // revokeObjectURL nos dois desfechos: sem isso o blob fica preso na
    // memória da aba até recarregar, e trocar de foto várias vezes acumula.
    img.onload = () => {
      URL.revokeObjectURL(url)
      const lado = Math.min(img.width, img.height)
      const sx = (img.width - lado) / 2
      const sy = (img.height - lado) / 2

      const canvas = document.createElement('canvas')
      canvas.width = LADO
      canvas.height = LADO
      const ctx = canvas.getContext('2d')
      // Fundo branco antes de desenhar: PNG com transparência vira preto no
      // JPEG, que não tem canal alfa.
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, LADO, LADO)
      ctx.drawImage(img, sx, sy, lado, lado, 0, 0, LADO, LADO)
      resolve(canvas.toDataURL('image/jpeg', QUALIDADE))
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler a imagem.'))
    }

    img.src = url
  })
}
