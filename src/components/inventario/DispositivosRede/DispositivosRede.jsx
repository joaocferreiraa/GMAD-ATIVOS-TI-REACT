import { useState } from 'react'
import Badge from '../../ui/Badge/Badge'
import Toolbar from '../../ui/Toolbar/Toolbar'
import SearchInput from '../../ui/SearchInput/SearchInput'
import Select from '../../ui/Select/Select'
import EmptyState from '../../ui/EmptyState/EmptyState'
import { fmtRelTime } from '../../../utils/formatters'
import styles from './DispositivosRede.module.css'

// Equipamentos que NÃO rodam o agente — impressoras, câmeras, switches,
// nobreaks. Vistos de fora, pela varredura de rede.
//
// Grau de conhecimento menor que o das máquinas Windows, de propósito: aqui
// só dá para saber que responde, que portas tem e (com sorte) o modelo.
// A tela deixa isso explícito em vez de fingir que sabe mais.
export default function DispositivosRede({ dispositivos, ativosPorIp }) {
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('')

  if (!dispositivos?.length) {
    return (
      <EmptyState title="Nenhum equipamento descoberto">
        Rode a varredura no servidor onde o agente de rede está instalado:{' '}
        <code>node descobrir.js 172.25.251.0/24</code>. Impressoras, câmeras e switches encontrados
        aparecem aqui.
      </EmptyState>
    )
  }

  const tipos = [...new Set(dispositivos.map((d) => d.tipo).filter(Boolean))].sort()
  const q = busca.trim().toLowerCase()
  const linhas = dispositivos.filter((d) => {
    if (tipo && d.tipo !== tipo) return false
    if (q && !`${d.ip} ${d.modelo ?? ''} ${d.nomeDns ?? ''}`.toLowerCase().includes(q)) return false
    return true
  })

  // Equipamento descoberto que não tem ficha em Ativos: mesma ideia da
  // faixa de máquinas sem cadastro, aplicada ao que não é Windows.
  const semCadastro = dispositivos.filter((d) => !ativosPorIp?.has(d.ip)).length

  return (
    <div>
      <div className={styles.resumo}>
        <span>
          <strong>{dispositivos.length}</strong> equipamentos na rede
        </span>
        {semCadastro > 0 && (
          <span>
            <Badge variant="warn">{semCadastro}</Badge> sem ficha cadastrada
          </span>
        )}
      </div>

      <Toolbar>
        <SearchInput
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por IP, modelo ou nome..."
        />
        <Select
          context="toolbar"
          value={tipo}
          onChange={setTipo}
          options={[
            { value: '', label: 'Todos os tipos' },
            ...tipos.map((t) => ({ value: t, label: t })),
          ]}
          aria-label="Tipo de equipamento"
        />
      </Toolbar>

      {!linhas.length ? (
        <EmptyState title="Nenhum equipamento corresponde ao filtro" />
      ) : (
        <ul className={styles.lista}>
          {linhas.map((d) => {
            const ativo = ativosPorIp?.get(d.ip)
            // Porta web define se dá para abrir o painel do equipamento —
            // que é a ação mais provável de quem está olhando esta lista.
            const portaWeb = d.portas.find((p) => p.porta === 80)
              ? 80
              : d.portas.find((p) => p.porta === 443)
                ? 443
                : null
            return (
              <li key={d.ip} className={styles.item}>
                <div className={styles.identificacao}>
                  <span className={styles.ip}>{d.ip}</span>
                  <span className={styles.tipo}>{d.tipo ?? 'Desconhecido'}</span>
                </div>

                <div className={styles.detalhe}>
                  <div className={styles.modelo}>
                    {d.modelo ?? <span className={styles.semDado}>Modelo não identificado</span>}
                  </div>
                  <div className={styles.meta}>
                    {d.nomeDns ? <span>{d.nomeDns}</span> : null}
                    <span>{d.portas.map((p) => p.porta).join(', ')}</span>
                    <span>visto {fmtRelTime(d.vistoEm)}</span>
                  </div>
                </div>

                <div className={styles.acoes}>
                  {ativo ? (
                    <Badge variant="muted">{ativo.id}</Badge>
                  ) : (
                    <Badge variant="warn">sem ficha</Badge>
                  )}
                  {portaWeb ? (
                    <a
                      className={styles.link}
                      href={`${portaWeb === 443 ? 'https' : 'http'}://${d.ip}/`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir painel
                    </a>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
