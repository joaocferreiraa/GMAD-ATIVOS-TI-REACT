import { useCallback, useState } from 'react'
import { ULTIMA_NOVIDADE } from '../constants/novidades'

const CHAVE = 'gmad_novidades_lidas'

function lerUltimaLida() {
  try {
    return localStorage.getItem(CHAVE)
  } catch {
    // Modo privado do Safari e políticas corporativas podem bloquear o
    // localStorage. Sem ele o pontinho volta a aparecer a cada visita — chato,
    // mas melhor do que a tela quebrar por causa de um aviso.
    return null
  }
}

// Controla o "tem novidade" do menu da conta. Guarda no navegador o id da
// última entrada lida (ver constants/novidades.js) e compara com a mais
// recente.
//
// Por id e não por contagem: uma lista de "quantas eu já vi" quebraria no dia
// em que uma entrada antiga fosse corrigida ou removida. O id da mais recente
// é suficiente — quem leu a última, leu as anteriores, que estão logo abaixo
// na mesma tela.
//
// Guardado no NAVEGADOR e não na conta: é preferência de leitura, não dado do
// usuário, e uma tabela no banco pra isso custaria mais do que resolve. O
// efeito colateral é que quem usa dois computadores vê o aviso nos dois.
export function useNovidades() {
  const [ultimaLida, setUltimaLida] = useState(lerUltimaLida)

  const marcarComoLidas = useCallback(() => {
    setUltimaLida(ULTIMA_NOVIDADE.id)
    try {
      localStorage.setItem(CHAVE, ULTIMA_NOVIDADE.id)
    } catch {
      // Ver lerUltimaLida: sem armazenamento o aviso reaparece, e só.
    }
  }, [])

  return { temNovidade: ultimaLida !== ULTIMA_NOVIDADE.id, marcarComoLidas }
}
