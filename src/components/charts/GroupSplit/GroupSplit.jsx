import styles from './GroupSplit.module.css'

// Divisão Madville / Curitiba (.group-split): duas colunas, cada uma com o
// número do grupo e, opcionalmente, o que vier em `madvilleBelow` /
// `outrasBelow` logo abaixo — hoje o radar de colaboradores daquele grupo.
//
// O gráfico fica DENTRO da coluna, e não solto embaixo das duas, pra não
// haver dúvida sobre a qual grupo ele pertence: o número, a barra colorida à
// esquerda e a teia passam a ser um bloco só.
export default function GroupSplit({ madville, outras, madvilleBelow = null, outrasBelow = null }) {
  return (
    <div className={styles.split}>
      <div className={styles.col}>
        <div className={`${styles.item} ${styles.madville}`}>
          <div className={styles.value}>{madville.value}</div>
          <div className={styles.label}>{madville.label}</div>
        </div>
        {madvilleBelow}
      </div>
      <div className={styles.col}>
        <div className={`${styles.item} ${styles.outras}`}>
          <div className={styles.value}>{outras.value}</div>
          <div className={styles.label}>{outras.label}</div>
        </div>
        {outrasBelow}
      </div>
    </div>
  )
}
