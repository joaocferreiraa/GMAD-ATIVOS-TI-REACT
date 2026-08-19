import { useEffect } from 'react'
import { useRouteError } from 'react-router-dom'
import Alert from '../components/ui/Alert/Alert'
import Button from '../components/ui/Button/Button'
import styles from '../components/ErrorBoundary/ErrorBoundary.module.css'

// Aba aberta desde antes do deploy mais recente: o HTML/bundle já carregado
// nela ainda referencia os arquivos com hash da versão anterior (ex:
// ContatosPage-DldUYTtQ.js), que o Vercel não serve mais depois que o novo
// deploy substitui os assets. Ao navegar pra uma página lazy() (ver
// router/routes.jsx) nessa aba, o import() dinâmico tenta buscar um arquivo
// que já não existe e rejeita — sem `errorElement`, o react-router mostra a
// tela genérica "Unexpected Application Error!" em vez de se recuperar
// sozinho. Recarregar a página resolve, porque busca o index.html atual
// (que aponta pros hashes certos) — só não repete em loop infinito se o
// reload não resolver (aí é outro problema, mostra o Alert normal).
const CHUNK_ERROR_PATTERN =
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i
const RELOAD_FLAG_KEY = 'gmad_chunk_reload_attempted'

function isChunkLoadError(error) {
  return !!error && typeof error.message === 'string' && CHUNK_ERROR_PATTERN.test(error.message)
}

export default function RouteErrorBoundary() {
  const error = useRouteError()
  // Leitura síncrona (não é estado do React) — decide já no primeiro render
  // se essa aba já tentou se recuperar sozinha desse mesmo tipo de erro,
  // pra não mostrar o Alert por uma fração de segundo antes do reload.
  const alreadyAttempted = sessionStorage.getItem(RELOAD_FLAG_KEY)
  const willAutoReload = isChunkLoadError(error) && !alreadyAttempted

  useEffect(() => {
    console.error('Erro não tratado na navegação:', error)
    if (!willAutoReload) return
    // Já tentou recarregar uma vez pra esse mesmo problema nessa aba e caiu
    // aqui de novo — não insiste, mostra o Alert normal em vez de recarregar
    // pra sempre.
    sessionStorage.setItem(RELOAD_FLAG_KEY, '1')
    window.location.reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (willAutoReload) return null

  return (
    <div className={styles.wrap}>
      <div className={styles.box}>
        <h1 className={styles.title}>Algo deu errado</h1>
        <Alert variant="danger">
          {isChunkLoadError(error)
            ? 'Uma nova versão do site foi publicada. Recarregue a página pra continuar.'
            : 'Ocorreu um erro inesperado. Tente recarregar a página — se o problema continuar, fale com a equipe de TI.'}
        </Alert>
        <div className={styles.actions}>
          <Button variant="primary" onClick={() => window.location.reload()}>
            Recarregar página
          </Button>
        </div>
      </div>
    </div>
  )
}
