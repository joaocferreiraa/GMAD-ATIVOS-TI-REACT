import { useState } from 'react'
import Badge from '../../ui/Badge/Badge'
import Toolbar from '../../ui/Toolbar/Toolbar'
import SearchInput from '../../ui/SearchInput/SearchInput'
import Select from '../../ui/Select/Select'
import EmptyState from '../../ui/EmptyState/EmptyState'
import { filtrarCatalogo, contagemLicencas, resumoCatalogo } from '../../../utils/catalogoSoftware'
import styles from './CatalogoSoftware.module.css'

// O software do parque visto por PROGRAMA, não por máquina.
//
// Responde o que a ficha de uma máquina não responde: quantas instalações
// de cada coisa existem (para conferir licenças), o que entrou sem passar
// pelo TI, e quem ficou para trás numa atualização.
export default function CatalogoSoftware({ catalogo, onAbrirMaquina }) {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('')
  // Guarda o programa expandido: ver EM QUAIS máquinas cada versão está é
  // o que torna a informação acionável, mas mostrar isso para 92 programas
  // de uma vez seria ilegível.
  const [expandido, setExpandido] = useState(null)

  if (!catalogo.length) {
    return (
      <EmptyState title="Nenhum programa catalogado">
        Assim que as máquinas reportarem, o software instalado no parque aparece aqui.
      </EmptyState>
    )
  }

  const resumo = resumoCatalogo(catalogo)
  const licencas = contagemLicencas(catalogo)
  const linhas = filtrarCatalogo(catalogo, { busca, filtro })

  return (
    <div>
      <div className={styles.resumo}>
        <span>
          <strong>{resumo.programas}</strong> programas
        </span>
        {resumo.comAtencao > 0 && (
          <span>
            <Badge variant="danger">{resumo.comAtencao}</Badge> pedem atenção
          </span>
        )}
        {resumo.divergentes > 0 && (
          <span>
            <Badge variant="warn">{resumo.divergentes}</Badge> com versões diferentes
          </span>
        )}
      </div>

      {/* Contagem por produto pago: a lista que se compara com as licenças
          compradas — a auditoria que ninguém faz porque dá trabalho. */}
      {licencas.length > 0 && (
        <div className={styles.licencas}>
          <div className={styles.licencasTitulo}>
            Software pago — confira com as licenças compradas
          </div>
          <div className={styles.licencasGrade}>
            {licencas.map((l) => (
              <div key={l.rotulo} className={styles.licencaItem}>
                <span className={styles.licencaNum}>{l.instalacoes}</span>
                <span className={styles.licencaNome}>{l.rotulo}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Toolbar>
        <SearchInput
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar programa ou fabricante..."
        />
        <Select
          context="toolbar"
          value={filtro}
          onChange={setFiltro}
          options={[
            { value: '', label: 'Todos os programas' },
            { value: 'atencao', label: 'Pedem atenção' },
            { value: 'licenca', label: 'Software pago' },
            { value: 'divergente', label: 'Versões diferentes' },
          ]}
          aria-label="Filtrar programas"
        />
      </Toolbar>

      {!linhas.length ? (
        <EmptyState title="Nenhum programa corresponde ao filtro" />
      ) : (
        <ul className={styles.lista}>
          {linhas.map((item) => {
            const aberto = expandido === item.nome
            return (
              <li key={item.nome} className={styles.item}>
                <button
                  type="button"
                  className={styles.linha}
                  onClick={() => setExpandido(aberto ? null : item.nome)}
                  aria-expanded={aberto}
                >
                  <span className={styles.contagem}>{item.instalacoes}</span>
                  <span className={styles.nome}>
                    {item.nome}
                    {item.fabricante ? (
                      <span className={styles.fabricante}>{item.fabricante}</span>
                    ) : null}
                  </span>
                  <span className={styles.marcadores}>
                    {item.atencao ? <Badge variant="danger">Atenção</Badge> : null}
                    {item.licenca ? <Badge variant="muted">Pago</Badge> : null}
                    {item.versaoDivergente ? (
                      <Badge variant="warn">{item.versoes.length} versões</Badge>
                    ) : null}
                  </span>
                </button>

                {aberto ? (
                  <div className={styles.detalhe}>
                    {item.atencao ? (
                      <div className={styles.motivo}>{item.atencao.motivo}</div>
                    ) : null}
                    {item.versoes.length ? (
                      <table className={styles.tabela}>
                        <thead>
                          <tr>
                            <th>Versão</th>
                            <th>Máquinas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.versoes.map((v) => (
                            <tr key={v.versao}>
                              <td className={styles.mono}>{v.versao}</td>
                              <td>{v.hosts.join(', ')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className={styles.motivo}>
                        Instalado em: {item.maquinas.map((m) => m.hostname).join(', ')}
                      </div>
                    )}
                    <div className={styles.acoes}>
                      {item.maquinas.map((m) => (
                        <button
                          key={m.machineUid}
                          type="button"
                          className={styles.linkMaquina}
                          onClick={() => onAbrirMaquina(m.machineUid)}
                        >
                          {m.hostname}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
