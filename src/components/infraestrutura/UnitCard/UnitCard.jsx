import Button from '../../ui/Button/Button'
import Card from '../../ui/Card/Card'
import { WifiIcon, ServerIcon, PlusIcon, EditIcon } from '../../ui/Icon/icons'
import { WIFI_FIELDS, CONSTRUSHOW_FIELDS } from '../../../constants/infra'
import InfraRow from '../InfraRow/InfraRow'
import styles from './UnitCard.module.css'

// Cartão de uma unidade: as redes Wi-Fi e o Construshow daquele local, um
// embaixo do outro e sempre visíveis. Substituiu o acordeão por sistema
// (WifiSection/ConstrushowSection), onde a tela em repouso era só duas
// barras fechadas e os dados de uma mesma unidade ficavam em seções que não
// podiam estar abertas ao mesmo tempo — ver buildInfraByUnit().
//
// `wifi`: [{w, idx}] da unidade; `construshow`: {c, idx} ou null. Os `idx`
// são as posições nos arrays originais, que as mutações usam pra localizar o
// registro — este componente só os repassa de volta nos callbacks.
//
// `aceitaWifi: false` (unidade guarda-chuva, ver buildInfraByUnit) tira o
// bloco de Wi-Fi inteiro do cartão, botão de adicionar incluído.
//
// Uma unidade pode ter mais de uma rede: as abas trocam qual está exibida
// (seleção só em memória, não persistida) e "Editar" edita a que está na
// tela no momento.
export default function UnitCard({
  unidade,
  aceitaWifi = true,
  wifi,
  construshow,
  selectedIdx,
  onSelectNet,
  onAddWifi,
  onEditWifi,
  onEditConstrushow,
}) {
  // A rede escolhida pode ter saído da lista (filtro da busca mudou, rede
  // recém-criada em outra unidade) — cai na primeira em vez de estourar.
  const current = wifi.find((it) => it.idx === selectedIdx) || wifi[0] || null

  return (
    <Card className={styles.card}>
      <div className={styles.head}>
        <h3 className={styles.unidade}>{unidade}</h3>
        {/* A contagem é de redes: numa unidade sem Wi-Fi ela só diria "0
            redes" sobre algo que a tela nem mostra. */}
        {aceitaWifi && (
          <span className={styles.counts}>
            {wifi.length === 1 ? '1 rede' : `${wifi.length} redes`}
          </span>
        )}
      </div>

      {aceitaWifi && (
        <section className={styles.block}>
          <div className={styles.blockHead}>
            <span className={styles.blockTitle}>
              <span className={styles.icon}>
                <WifiIcon />
              </span>
              Wi-Fi
            </span>
            <span className={styles.blockActions}>
              <Button variant="ghost" size="sm" onClick={() => onAddWifi(unidade)}>
                <PlusIcon /> Nova rede
              </Button>
              {current && (
                <Button variant="ghost" size="sm" onClick={() => onEditWifi(current.idx)}>
                  <EditIcon /> Editar
                </Button>
              )}
            </span>
          </div>

          {!current ? (
            <p className={styles.empty}>Nenhuma rede cadastrada nesta unidade.</p>
          ) : (
            <>
              {wifi.length > 1 && (
                <div className={styles.netTabs}>
                  {wifi.map((it, i) => (
                    <button
                      key={it.idx}
                      type="button"
                      className={`${styles.netTab} ${it.idx === current.idx ? styles.active : ''}`}
                      onClick={() => onSelectNet(unidade, it.idx)}
                      aria-pressed={it.idx === current.idx}
                    >
                      {it.w.redeNome || `Rede ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}
              <div className={styles.rows}>
                {WIFI_FIELDS.map((f) => (
                  <InfraRow
                    key={f.key}
                    label={f.label}
                    value={current.w[f.key]}
                    masked={f.masked}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Construshow só existe em algumas unidades, e isso é o esperado — não
          é cadastro faltando. A tela também não tem como criar um (só
          edição, como no sistema original), então um bloco "Sem Construshow
          cadastrado" seria um beco sem saída: apontaria uma ausência sem
          oferecer o que fazer a respeito, em três dos quatro cartões. Onde
          não há registro, o bloco simplesmente não aparece.
          O Wi-Fi acima segue o caminho oposto de propósito: lá o vazio vem
          acompanhado do botão "Nova rede", então avisar resolve. */}
      {construshow && (
        <section className={styles.block}>
          <div className={styles.blockHead}>
            <span className={styles.blockTitle}>
              <span className={styles.icon}>
                <ServerIcon />
              </span>
              Construshow
            </span>
            <span className={styles.blockActions}>
              <Button variant="ghost" size="sm" onClick={() => onEditConstrushow(construshow.idx)}>
                <EditIcon /> Editar
              </Button>
            </span>
          </div>

          <div className={styles.rows}>
            {CONSTRUSHOW_FIELDS.map((f) => (
              <InfraRow key={f.key} label={f.label} value={construshow.c[f.key]} />
            ))}
          </div>
        </section>
      )}
    </Card>
  )
}
