import { useQuery } from '@tanstack/react-query'
import {
  getInventory,
  getMachineSoftware,
  getInventoryChanges,
} from '../../services/inventario/inventarioService'
import { useRealtimeInvalidate } from './useRealtimeInvalidate'
import { queryKeys } from '../../constants/queryKeys'

// Inventário de todas as máquinas do parque. Atualiza sozinho via Realtime
// quando um agente reporta — sem F5 e sem polling.
//
// event: '*' (não o padrão 'INSERT') porque a coleta de uma máquina JÁ
// cadastrada é um UPDATE do upsert (ver upsert_host_inventory). Assinando
// só INSERT, apareceria ao vivo apenas a PRIMEIRA coleta de cada máquina e
// todas as seguintes ficariam invisíveis até alguém recarregar a página —
// justamente o oposto do que o painel promete. A tabela está publicada com
// replica identity full pra isso funcionar (ver 0008_host_inventory.sql).
export function useInventario() {
  useRealtimeInvalidate('host_inventory', queryKeys.inventario, { event: '*' })

  return useQuery({
    queryKey: queryKeys.inventario,
    queryFn: getInventory,
    // A tabela pode não existir ainda (migration 0008 não rodada). Sem
    // retry, o aviso aparece na hora em vez de o painel tentar em silêncio
    // — mesma escolha de useHostMetrics.js.
    retry: false,
  })
}

// Softwares de uma máquina, buscados só quando a ficha abre (a lista é
// grande demais pra vir junto com a tabela — ver getInventory).
export function useMachineSoftware(machineUid) {
  return useQuery({
    queryKey: [...queryKeys.inventario, 'softwares', machineUid],
    queryFn: () => getMachineSoftware(machineUid),
    enabled: !!machineUid,
    retry: false,
  })
}

// Histórico de mudanças detectadas pelo agente. Atualiza sozinho via
// Realtime — uma máquina que perde um pente de RAM aparece na tela sem
// ninguém recarregar.
export function useInventarioMudancas({ machineUid = null, limite = 200 } = {}) {
  const queryKey = [...queryKeys.inventarioMudancas, machineUid, limite]

  useRealtimeInvalidate('host_inventory_changes', queryKey)

  return useQuery({
    queryKey,
    queryFn: () => getInventoryChanges({ machineUid, limite }),
    retry: false,
  })
}
