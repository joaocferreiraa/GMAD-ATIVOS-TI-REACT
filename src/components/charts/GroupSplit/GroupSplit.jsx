import styles from './GroupSplit.module.css'

// Divisão Madville / Curitiba (.group-split): dois blocos EMPILHADOS, cada um
// com o número do grupo e, opcionalmente, o que vier em `madvilleBelow` /
// `outrasBelow` logo abaixo — hoje as barras de colaboradores daquele grupo.
//
// O gráfico fica DENTRO do bloco, e não solto no fim dos dois, pra não haver
// dúvida sobre a qual grupo ele pertence: o número, a barra colorida à
// esquerda e o gráfico são um bloco só.
//
// Empilhado e não lado a lado — ver a justificativa no .split do CSS.
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
