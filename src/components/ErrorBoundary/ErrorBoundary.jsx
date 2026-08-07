import { Component } from 'react'
import Alert from '../ui/Alert/Alert'
import Button from '../ui/Button/Button'
import styles from './ErrorBoundary.module.css'

// Rede de segurança para erros de render não tratados — sem ela, qualquer
// exceção numa página derruba a árvore inteira do React (tela branca). Só
// existe como classe porque Error Boundaries exigem componentDidCatch/
// getDerivedStateFromError, que não têm equivalente em hooks.
export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Erro não tratado na aplicação:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className={styles.wrap}>
        <div className={styles.box}>
          <h1 className={styles.title}>Algo deu errado</h1>
          <Alert variant="danger">
            Ocorreu um erro inesperado. Tente recarregar a página — se o problema continuar, fale
            com a equipe de TI.
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
}
