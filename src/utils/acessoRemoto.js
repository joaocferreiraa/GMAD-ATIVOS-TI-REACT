// Acesso remoto às máquinas do parque via RustDesk. O ID de cada máquina é
// coletado pelo agente de inventário (ver agent/inventory.js) e guardado em
// host_inventory.rustdesk_id.

// Servidor de sinalização/retransmissão. Vazio = servidor público do
// RustDesk (rs-*.rustdesk.com), que é o padrão de quem acabou de instalar.
//
// Definir VITE_RUSTDESK_SERVIDOR no .env aponta o link para um servidor
// PRÓPRIO, sem mexer em código — a migração para servidor auto-hospedado é
// o caminho natural quando o parque cresce (sem mensalidade, sem tráfego
// passando por terceiro), então vale já deixar o gancho pronto.
const SERVIDOR = import.meta.env.VITE_RUSTDESK_SERVIDOR || ''

// Link que abre o RustDesk já conectando na máquina.
//
// O esquema `rustdesk://` é registrado no Windows pelo próprio instalador
// do RustDesk. Ele abre o aplicativo LOCAL (o do técnico) apontado para o
// ID de destino — não é uma sessão no navegador, e por isso funciona sem
// nenhuma extensão ou plugin.
//
// Formato com `?password=` NÃO é usado de propósito: colocaria a senha de
// acesso na URL, que fica no histórico do navegador e em qualquer log de
// proxy pelo caminho. A autenticação acontece no próprio RustDesk.
export function linkRustDesk(id) {
  if (!id) return null
  const base = `rustdesk://connection/new/${encodeURIComponent(id)}`
  return SERVIDOR ? `${base}?server=${encodeURIComponent(SERVIDOR)}` : base
}

// Estado do acesso remoto de uma máquina, já resolvido para a tela: o que
// mostrar e se dá para conectar. Os três casos são operacionalmente
// diferentes (ver 0009_host_inventory_acesso_remoto.sql):
//
//   pronto        -> tem ID, botão "Acessar" funciona
//   sem_id        -> RustDesk instalado mas não respondeu (versão antiga
//                    sem --get-id, ou serviço parado) — é diagnóstico
//   nao_instalado -> falta instalar o RustDesk nessa máquina — é tarefa
//
// Máquinas que ainda não reportaram desde a atualização do agente caem em
// `desconhecido`: rustdesk_instalado vem null porque o agente daquela
// máquina é anterior à coleta, não porque falte alguma coisa lá.
export function statusAcessoRemoto(machine) {
  if (machine?.rustdeskId) {
    return { estado: 'pronto', rotulo: 'Pronto', tone: 'ok' }
  }
  if (machine?.rustdeskInstalado === true) {
    return {
      estado: 'sem_id',
      rotulo: 'Sem ID',
      tone: 'warn',
      detalhe:
        'O RustDesk está instalado, mas não informou o ID. Pode ser uma versão antiga (sem suporte a --get-id) ou o serviço estar parado.',
    }
  }
  if (machine?.rustdeskInstalado === false) {
    return {
      estado: 'nao_instalado',
      rotulo: 'Não instalado',
      tone: 'muted',
      detalhe: 'O RustDesk não foi encontrado nesta máquina.',
    }
  }
  return {
    estado: 'desconhecido',
    rotulo: 'Não verificado',
    tone: 'muted',
    detalhe:
      'Esta máquina ainda não reportou desde a atualização do agente. O acesso remoto aparece aqui após a próxima coleta.',
  }
}
