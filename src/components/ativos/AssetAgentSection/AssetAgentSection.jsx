import Badge from '../../ui/Badge/Badge'
import Button from '../../ui/Button/Button'
import ViewRow from '../../ui/ViewRow/ViewRow'
import { fmtBytes } from '../../../utils/hostFormatters'
import { fmtRelTime } from '../../../utils/formatters'
import { isDesatualizada } from '../../../utils/inventarioFilter'
import { linkRustDesk, statusAcessoRemoto } from '../../../utils/acessoRemoto'
import { camposParaPreencher } from '../../../utils/inventarioMatch'
import panelStyles from '../AssetPanel.module.css'
import styles from './AssetAgentSection.module.css'

// O que o AGENTE detectou nesta máquina, dentro da ficha do ativo — a
// metade técnica que ninguém digita (specs reais, acesso remoto, se a
// máquina ainda está viva), ao lado da metade administrativa que só uma
// pessoa sabe (unidade, departamento, responsável).
//
// Some inteiro quando não há máquina casada: um ativo que é impressora ou
// celular nunca terá agente, e uma seção vazia com "—" em tudo só ocuparia
// espaço. Quem precisa saber "por que este PC não reporta?" tem a lista de
// máquinas sem cadastro no topo da tela de Ativos.
export default function AssetAgentSection({ asset, maquina, onPreencher, preenchendo }) {
  if (!maquina) return null

  const acesso = statusAcessoRemoto(maquina)
  const desatualizada = isDesatualizada(maquina)

  // Só oferece preencher o que está VAZIO no cadastro: valor digitado por
  // uma pessoa pode ser correção deliberada do que o agente lê errado.
  const faltando = camposParaPreencher(asset, maquina)
  const qtdFaltando = Object.keys(faltando).length

  const tiposDisco = [...new Set((maquina.discos ?? []).map((d) => d.tipoMidia).filter(Boolean))]

  return (
    <div className={panelStyles.viewCard}>
      <div className={styles.cabecalho}>
        <div className={panelStyles.viewSectionTitle}>Detectado pelo agente</div>
        {acesso.estado === 'pronto' ? (
          <Button variant="primary" size="sm" as="a" href={linkRustDesk(maquina.rustdeskId)}>
            Acessar máquina
          </Button>
        ) : null}
      </div>

      <div className={panelStyles.viewRows}>
        <ViewRow label="Nome na rede" value={maquina.hostname} />
        <ViewRow label="Usuário logado" value={maquina.usuarioLogado} />
        <ViewRow label="Processador" value={maquina.cpuModelo} />
        <ViewRow
          label="Memória"
          raw
          value={
            <>
              {fmtBytes(maquina.ramTotalBytes)}
              {maquina.ramSlotsTotais ? (
                <span className={styles.detalhe}>
                  {' '}
                  ({maquina.ramSlotsUsados}/{maquina.ramSlotsTotais} slots)
                </span>
              ) : null}
            </>
          }
        />
        <ViewRow
          label="Armazenamento"
          raw
          value={
            <>
              {fmtBytes(maquina.discoTotalBytes)}
              {tiposDisco.length ? (
                <span className={styles.detalhe}> ({tiposDisco.join(' + ')})</span>
              ) : null}
            </>
          }
        />
        <ViewRow label="Sistema" value={maquina.soNome} />
        <ViewRow
          label="Endereço IP"
          value={(maquina.adaptadoresRede ?? []).flatMap((a) => a.ips ?? []).join(', ') || null}
        />
        <ViewRow
          label="Última coleta"
          raw
          value={
            desatualizada ? (
              <Badge variant="warn">{fmtRelTime(maquina.coletadoEm)}</Badge>
            ) : (
              fmtRelTime(maquina.coletadoEm)
            )
          }
        />
      </div>

      {/* Preencher o cadastro com o detectado: é o atalho que evita digitar
          à mão o que a máquina já informou. Só aparece quando há algo a
          preencher. */}
      {qtdFaltando > 0 && onPreencher ? (
        <div className={styles.sugestao}>
          <div className={styles.sugestaoTexto}>
            {qtdFaltando === 1
              ? 'Há 1 campo em branco na ficha que o agente já detectou.'
              : `Há ${qtdFaltando} campos em branco na ficha que o agente já detectou.`}
          </div>
          <Button size="sm" onClick={() => onPreencher(faltando)} disabled={preenchendo}>
            {preenchendo ? 'Preenchendo...' : 'Preencher com o detectado'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
