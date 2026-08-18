import { useState } from 'react'
import Modal from '../../ui/Modal/Modal'
import Badge from '../../ui/Badge/Badge'
import Button from '../../ui/Button/Button'
import SearchInput from '../../ui/SearchInput/SearchInput'
import ViewRow from '../../ui/ViewRow/ViewRow'
import { useMachineSoftware } from '../../../hooks/data/useInventario'
import { fmtBytes } from '../../../utils/hostFormatters'
import { fmtRelTime } from '../../../utils/formatters'
import { diasDesdeColeta, isDesatualizada } from '../../../utils/inventarioFilter'
import { linkRustDesk, statusAcessoRemoto } from '../../../utils/acessoRemoto'
import styles from '../InventarioPanel.module.css'

function fmtClock(mhz) {
  if (!mhz) return null
  return mhz >= 1000 ? `${(mhz / 1000).toFixed(2)} GHz` : `${mhz} MHz`
}

function fmtDataHora(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString('pt-BR')
}

// Seção com tabela interna (pentes de RAM, discos, adaptadores) — listas de
// tamanho variável, que não cabem no formato label/valor do ViewRow.
function SubTable({ titulo, colunas, linhas, vazio }) {
  return (
    <div className={styles.viewSection}>
      <div className={styles.viewSectionTitle}>{titulo}</div>
      {linhas.length ? (
        <table className={styles.subTable}>
          <thead>
            <tr>
              {colunas.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>{linhas}</tbody>
        </table>
      ) : (
        <div className={styles.emptyNote}>{vazio}</div>
      )}
    </div>
  )
}

// Ficha completa de uma máquina inventariada. Somente leitura: o conteúdo
// vem do agente, e editar aqui seria sobrescrito na próxima coleta — a
// única ação é remover a máquina do inventário (saiu do parque).
export default function InventarioViewModal({ open, machine, onClose, onRemove }) {
  const [buscaSoftware, setBuscaSoftware] = useState('')

  // Softwares são buscados à parte, só com a ficha aberta — a lista é
  // grande demais pra vir junto na tabela (ver getInventory).
  const { data: softwares, isLoading: carregandoSoftwares } = useMachineSoftware(
    open ? machine?.machineUid : null,
  )

  if (!machine) return null

  const meta = [machine.tipoChassi, machine.dominio].filter(Boolean).join(' · ')
  const dias = diasDesdeColeta(machine.coletadoEm)
  const desatualizada = isDesatualizada(machine)
  const acesso = statusAcessoRemoto(machine)

  const softwaresFiltrados = (softwares ?? []).filter((s) =>
    buscaSoftware ? (s.nome || '').toLowerCase().includes(buscaSoftware.toLowerCase()) : true,
  )

  return (
    <Modal open={open} onClose={onClose} showCloseButton={false} maxWidth="820px">
      <div className={styles.viewHeaderRow}>
        <div>
          <h2 className={styles.viewHeadTitle}>{machine.hostname}</h2>
          <div className={styles.viewHeadSub}>
            {[machine.fabricante, machine.modelo].filter(Boolean).join(' ') ||
              'Modelo não informado'}
          </div>
          <div className={styles.viewHeadBadge}>
            {desatualizada ? (
              <Badge variant="warn">Sem reportar há {dias} dias</Badge>
            ) : (
              <Badge variant="ok">Reportando</Badge>
            )}
          </div>
          <div className={styles.viewHeadMeta}>{meta || '—'}</div>
        </div>

        {/* Acesso remoto no cabeçalho, não numa seção lá embaixo: quando se
            abre a ficha de uma máquina durante um atendimento, conectar é a
            ação mais provável — não deve exigir rolagem. */}
        {acesso.estado === 'pronto' ? (
          <Button variant="primary" size="sm" as="a" href={linkRustDesk(machine.rustdeskId)}>
            Acessar máquina
          </Button>
        ) : null}
      </div>

      {desatualizada ? (
        <div className={styles.staleNote}>
          Última coleta {fmtRelTime(machine.coletadoEm)}. A máquina pode estar desligada, fora do
          parque ou com o agente de inventário parado.
        </div>
      ) : null}

      <div className={styles.viewSection}>
        <div className={styles.viewSectionTitle}>Identificação</div>
        <div className={styles.viewRows}>
          <ViewRow label="Nome da máquina" value={machine.hostname} />
          <ViewRow label="Usuário" value={machine.usuarioLogado} />
          <ViewRow label="Domínio / Grupo" value={machine.dominio} />
          <ViewRow label="Fabricante" value={machine.fabricante} />
          <ViewRow label="Modelo" value={machine.modelo} />
          <ViewRow label="Número de série" value={machine.numeroSerie} />
          <ViewRow label="Tipo" value={machine.tipoChassi} />
          {/* Identificador usado como chave no banco — é o que liga esta
              máquina ao ativo cadastrado e o que se usa pra removê-la. */}
          <ViewRow label="ID de hardware" value={machine.machineUid} />
        </div>
      </div>

      <div className={styles.viewSection}>
        <div className={styles.viewSectionTitle}>Sistema operacional</div>
        <div className={styles.viewRows}>
          <ViewRow label="Sistema" value={machine.soNome} />
          <ViewRow label="Versão" value={machine.soVersao} />
          <ViewRow label="Build" value={machine.soBuild} />
          <ViewRow label="Arquitetura" value={machine.soArquitetura} />
          <ViewRow label="Instalado em" value={fmtDataHora(machine.soInstaladoEm)} />
        </div>
      </div>

      <div className={styles.viewSection}>
        <div className={styles.viewSectionTitle}>Processador</div>
        <div className={styles.viewRows}>
          <ViewRow label="Modelo" value={machine.cpuModelo} />
          <ViewRow label="Fabricante" value={machine.cpuFabricante} />
          <ViewRow
            label="Núcleos / Threads"
            value={
              machine.cpuNucleos
                ? `${machine.cpuNucleos} núcleos${machine.cpuThreads ? ` / ${machine.cpuThreads} threads` : ''}`
                : null
            }
          />
          <ViewRow label="Clock" value={fmtClock(machine.cpuClockMhz)} />
        </div>
      </div>

      <div className={styles.viewSection}>
        <div className={styles.viewSectionTitle}>Memória</div>
        <div className={styles.viewRows}>
          <ViewRow label="Total" value={fmtBytes(machine.ramTotalBytes)} raw />
          <ViewRow
            label="Slots"
            value={
              machine.ramSlotsTotais
                ? `${machine.ramSlotsUsados ?? '—'} de ${machine.ramSlotsTotais} ocupados`
                : null
            }
          />
        </div>
      </div>

      <SubTable
        titulo="Pentes de memória instalados"
        colunas={['Slot', 'Capacidade', 'Tipo', 'Velocidade', 'Fabricante']}
        vazio="Nenhum pente detectado nesta coleta."
        linhas={(machine.ramPentes ?? []).map((p, i) => (
          // Índice como key: os pentes não têm identificador próprio e a
          // lista é substituída inteira a cada coleta (nunca reordenada).
          <tr key={i}>
            <td>{p.slot || '—'}</td>
            <td className={styles.mono}>{fmtBytes(p.capacidadeBytes)}</td>
            <td>{p.tipo || '—'}</td>
            <td>{p.velocidadeMhz ? `${p.velocidadeMhz} MHz` : '—'}</td>
            <td>{p.fabricante || '—'}</td>
          </tr>
        ))}
      />

      <SubTable
        titulo="Discos"
        colunas={['Modelo', 'Tipo', 'Capacidade', 'Interface', 'Saúde']}
        vazio="Nenhum disco físico detectado nesta coleta."
        linhas={(machine.discos ?? []).map((d, i) => (
          <tr key={i}>
            <td>{d.modelo || '—'}</td>
            <td>{d.tipoMidia || '—'}</td>
            <td className={styles.mono}>{fmtBytes(d.tamanhoBytes)}</td>
            <td>{d.interface || '—'}</td>
            <td>
              {d.saude ? (
                <Badge variant={d.saude === 'Healthy' ? 'ok' : 'warn'}>{d.saude}</Badge>
              ) : (
                '—'
              )}
            </td>
          </tr>
        ))}
      />

      <div className={styles.viewSection}>
        <div className={styles.viewSectionTitle}>Espaço em disco</div>
        <div className={styles.viewRows}>
          <ViewRow label="Capacidade total" value={fmtBytes(machine.discoTotalBytes)} raw />
          <ViewRow label="Espaço livre" value={fmtBytes(machine.discoLivreBytes)} raw />
        </div>
      </div>

      <SubTable
        titulo="Vídeo"
        colunas={['Modelo', 'Memória', 'Driver']}
        vazio="Nenhuma placa de vídeo detectada nesta coleta."
        linhas={(machine.gpus ?? []).map((g, i) => (
          <tr key={i}>
            <td>{g.modelo || '—'}</td>
            <td className={styles.mono}>{fmtBytes(g.memoriaBytes)}</td>
            <td>{g.driver || '—'}</td>
          </tr>
        ))}
      />

      <SubTable
        titulo="Rede"
        colunas={['Adaptador', 'Endereço MAC', 'IP', 'Velocidade']}
        vazio="Nenhum adaptador ativo nesta coleta."
        linhas={(machine.adaptadoresRede ?? []).map((a, i) => (
          <tr key={i}>
            <td>{a.nome || '—'}</td>
            <td className={styles.mono}>{a.mac || '—'}</td>
            <td className={styles.mono}>{(a.ips ?? []).join(', ') || '—'}</td>
            <td>{a.velocidadeMbps ? `${a.velocidadeMbps} Mbps` : '—'}</td>
          </tr>
        ))}
      />

      <div className={styles.viewSection}>
        <div className={styles.viewSectionTitle}>
          Programas instalados{softwares?.length ? ` (${softwares.length})` : ''}
        </div>
        {carregandoSoftwares ? (
          <div className={styles.emptyNote}>Carregando...</div>
        ) : softwares?.length ? (
          <>
            <div className={styles.softwareSearch}>
              <SearchInput
                value={buscaSoftware}
                onChange={(e) => setBuscaSoftware(e.target.value)}
                placeholder="Buscar programa..."
              />
            </div>
            <div className={styles.softwareList}>
              <table className={styles.subTable}>
                <thead>
                  <tr>
                    <th>Programa</th>
                    <th>Versão</th>
                    <th>Fabricante</th>
                  </tr>
                </thead>
                <tbody>
                  {softwaresFiltrados.map((s, i) => (
                    <tr key={i}>
                      <td>{s.nome}</td>
                      <td className={styles.mono}>{s.versao || '—'}</td>
                      <td>{s.fabricante || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!softwaresFiltrados.length ? (
                <div className={styles.emptyNote}>Nenhum programa corresponde à busca.</div>
              ) : null}
            </div>
          </>
        ) : (
          <div className={styles.emptyNote}>Nenhum programa registrado nesta coleta.</div>
        )}
      </div>

      <div className={styles.viewSection}>
        <div className={styles.viewSectionTitle}>Acesso remoto</div>
        <div className={styles.viewRows}>
          <ViewRow
            label="Situação"
            raw
            value={<Badge variant={acesso.tone}>{acesso.rotulo}</Badge>}
          />
          {machine.rustdeskId ? (
            <ViewRow label="ID do RustDesk" value={machine.rustdeskId} />
          ) : null}
        </div>
        {acesso.detalhe ? <div className={styles.emptyNote}>{acesso.detalhe}</div> : null}
      </div>

      <div className={styles.viewSection}>
        <div className={styles.viewSectionTitle}>Coleta</div>
        <div className={styles.viewRows}>
          <ViewRow label="Última coleta" value={fmtDataHora(machine.coletadoEm)} />
          <ViewRow label="No inventário desde" value={fmtDataHora(machine.criadoEm)} />
          <ViewRow label="Versão do agente" value={machine.agenteVersao} />
        </div>
      </div>

      <div className={styles.footerActions}>
        <Button variant="ghost" size="sm" onClick={() => onRemove(machine)}>
          Remover do inventário
        </Button>
        <Button variant="primary" size="sm" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </Modal>
  )
}
