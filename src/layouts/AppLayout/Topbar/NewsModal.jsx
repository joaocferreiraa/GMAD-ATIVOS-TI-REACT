import Modal from '../../../components/ui/Modal/Modal'
import Button from '../../../components/ui/Button/Button'
import { NOVIDADES } from '../../../constants/novidades'
import { fmtDate } from '../../../utils/formatters'
import styles from './NewsModal.module.css'

// O que mudou no painel, da entrada mais recente pra mais antiga.
//
// Lista estática vinda de constants/novidades.js, não do banco: o texto é
// escrito junto com a mudança e viaja com o deploy, então nunca fica
// descrevendo algo que ainda não subiu — que é o risco de um changelog
// editável em produção.
export default function NewsModal({ open, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novidades"
      subtitle="O que mudou no painel, da mudança mais recente para a mais antiga."
      maxWidth={520}
      footer={
        <div className={styles.acoes}>
          <Button variant="primary" onClick={onClose}>
            Entendi
          </Button>
        </div>
      }
    >
      <div className={styles.lista}>
        {NOVIDADES.map((entrada) => (
          <section key={entrada.id} className={styles.entrada}>
            <header className={styles.cabecalho}>
              <h3>{entrada.titulo}</h3>
              {/* <time> com dateTime legível por máquina: a data aparece
                  formatada em pt-BR, mas o valor ISO fica no atributo. */}
              <time dateTime={entrada.data}>{fmtDate(entrada.data)}</time>
            </header>
            <ul className={styles.itens}>
              {entrada.itens.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  )
}
