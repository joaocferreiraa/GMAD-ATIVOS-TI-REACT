import { useQueryClient } from '@tanstack/react-query'
import { useSyncStatus } from '../../../hooks/useSyncStatus'
import { useOnlineStatus } from '../../../hooks/pwa/useOnlineStatus'
import { RefreshIcon } from '../../../components/ui/Icon/icons'
import styles from './SyncStatusRow.module.css'

function horaDe(data) {
  if (!data) return null
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// Estado da sincronização com o banco, no menu da conta.
//
// Cruza DUAS fontes, e é isso que dá a leitura certa:
//  - useOnlineStatus: o aparelho tem rede?
//  - useSyncStatus:   a última conversa com o Supabase deu certo?
//
// Só a segunda não bastava. Toda falha do kvStore virava 'offline', então
// cabo desconectado e erro de permissão no banco apareciam iguais — dois
// problemas com soluções opostas. Com as duas, "sem internet" (o aparelho
// caiu) se separa de "falha ao sincronizar" (há rede, o banco recusou), e
// esta última mostra a razão devolvida pelo servidor.
//
// ALCANCE, pra ninguém ler mais do que o indicador sabe: ele reflete o que
// passa pelo kvStore — ativos, contatos, estoque, infraestrutura,
// instaladores, scripts, monitores e as fotos de perfil. As medições de rede,
// as métricas de host e o histórico de alterações falam direto com o Supabase
// e não movem este estado. (O log de atividade movia, enquanto morava no
// kv_store; desde a migration 0013 ele é tabela própria e saiu daqui.)
//
// Chave que ainda não existe (PGRST116) NÃO é falha: o banco respondeu, só não
// há registro gravado. Isso é decidido no kvStore — ver linhaInexistente lá.
export default function SyncStatusRow() {
  const { status, lastSync, lastError } = useSyncStatus()
  const online = useOnlineStatus()
  const queryClient = useQueryClient()

  const sincronizando = status === 'syncing'
  const falhou = status === 'offline'

  let titulo
  let detalhe
  let variante

  if (!online) {
    titulo = 'Sem internet'
    detalhe = lastSync ? `Última sincronização às ${horaDe(lastSync)}` : 'Nada sincronizado ainda'
    variante = styles.offline
  } else if (sincronizando) {
    titulo = 'Sincronizando…'
    detalhe = 'Conversando com o banco'
    variante = styles.syncing
  } else if (falhou) {
    titulo = 'Falha ao sincronizar'
    // A mensagem do servidor primeiro: ela diz se foi permissão, tabela
    // ausente ou indisponibilidade — coisas que exigem ações diferentes.
    detalhe = lastError || 'O banco não respondeu'
    variante = styles.erro
  } else {
    titulo = 'Sincronizado'
    detalhe = lastSync ? `Atualizado às ${horaDe(lastSync)}` : 'Aguardando primeira leitura'
    variante = styles.ok
  }

  return (
    <button
      type="button"
      role="menuitem"
      className={styles.row}
      // invalidateQueries e não refetchQueries: só o que está montado na tela
      // recarrega agora, o resto fica marcado como velho e busca quando for
      // usado. Forçar tudo faria uma tela pedir dados de outras cinco.
      onClick={() => queryClient.invalidateQueries()}
      disabled={sincronizando}
      title="Sincronizar agora"
    >
      <span className={`${styles.ponto} ${variante}`} aria-hidden="true" />
      <span className={styles.texto}>
        <b>{titulo}</b>
        <span>{detalhe}</span>
      </span>
      <RefreshIcon
        width={14}
        height={14}
        className={`${styles.refresh} ${sincronizando ? styles.girando : ''}`}
        aria-hidden="true"
      />
    </button>
  )
}
