import fachadaLoja from '../../assets/unidades/fachada-loja.jpg'
import interiorLoja from '../../assets/unidades/interior-loja.jpg'
import centroDistribuicao from '../../assets/unidades/centro-distribuicao.jpg'
import solucoes from '../../assets/unidades/solucoes.jpg'
import fachadaCuritiba from '../../assets/unidades/fachada-curitiba.jpg'
import unidadeCuritiba from '../../assets/unidades/unidade-curitiba.jpg'

// Fotos das unidades (extraídas dos <img> em base64 do sistema original
// para arquivos estáticos reais — mesmas imagens, sem inflar o bundle JS
// com strings base64 de centenas de KB cada).
export const MADVILLE_IMAGES = [
  { src: fachadaLoja, alt: 'Frota GMAD', caption: 'Fachada Loja' },
  { src: interiorLoja, alt: 'Interior Madville', caption: 'Interior Loja' },
  { src: centroDistribuicao, alt: 'Showroom Madville', caption: 'Centro de Distribuição' },
  { src: solucoes, alt: 'Soluções Madville', caption: 'Soluções' },
]

export const CURITIBA_IMAGES = [
  { src: fachadaCuritiba, alt: 'Unidade GMAD Curitiba', caption: 'Fachada Curitiba' },
  { src: unidadeCuritiba, alt: 'Fachada GMAD Curitiba', caption: 'Unidade Curitiba' },
]
