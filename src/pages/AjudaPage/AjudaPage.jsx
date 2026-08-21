import { useState } from 'react'
import Card from '../../components/ui/Card/Card'
import Input from '../../components/ui/Input/Input'
import { SearchIcon } from '../../components/ui/Icon/icons'
import { SECOES_AJUDA } from './conteudoAjuda'
import styles from './AjudaPage.module.css'

// Junta todo o texto de uma seção numa string só, pra busca. Percorre os
// tipos de bloco em vez de assumir formato: bloco novo em conteudoAjuda.js
// passa a ser encontrado sem mexer aqui.
function textoDaSecao(secao) {
  const partes = [secao.titulo]
  for (const bloco of secao.blocos) {
    if (bloco.texto) partes.push(bloco.texto)
    if (bloco.itens) {
      for (const item of bloco.itens) {
        partes.push(typeof item === 'string' ? item : `${item.termo} ${item.texto}`)
      }
    }
  }
  return partes.join(' ').toLowerCase()
}

function Bloco({ bloco }) {
  if (bloco.tipo === 'lista') {
    return (
      <ul className={styles.lista}>
        {bloco.itens.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    )
  }
  if (bloco.tipo === 'definicoes') {
    return (
      <dl className={styles.definicoes}>
        {bloco.itens.map((item) => (
          <div key={item.termo} className={styles.definicao}>
            <dt>{item.termo}</dt>
            <dd>{item.texto}</dd>
          </div>
        ))}
      </dl>
    )
  }
  if (bloco.tipo === 'aviso') {
    return <p className={styles.aviso}>{bloco.texto}</p>
  }
  return <p className={styles.paragrafo}>{bloco.texto}</p>
}

// Manual do painel. O texto mora em conteudoAjuda.js — aqui só a montagem.
//
// Índice lateral fixo + busca por palavra: um manual longo lido de cima a
// baixo não serve pra quem tem uma dúvida específica, que é o caso de quase
// toda visita a uma tela de ajuda.
export default function AjudaPage() {
  const [busca, setBusca] = useState('')

  const termo = busca.trim().toLowerCase()
  const secoes = termo
    ? SECOES_AJUDA.filter((secao) => textoDaSecao(secao).includes(termo))
    : SECOES_AJUDA

  return (
    <div>
      <div className={styles.heading}>
        <h2>Ajuda</h2>
        <p>Como o painel funciona, módulo por módulo.</p>
      </div>

      <div className={styles.buscaWrap}>
        <SearchIcon width={15} height={15} />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar na ajuda (ex.: garantia, chamado, senha)"
          aria-label="Buscar na ajuda"
        />
      </div>

      <div className={styles.layout}>
        {/* O índice some quando há busca: com a lista já reduzida a uma ou
            duas seções, ele passaria a apontar pra coisas que não estão mais
            na tela. */}
        {!termo && (
          <nav className={styles.indice} aria-label="Seções da ajuda">
            {SECOES_AJUDA.map((secao) => (
              <a key={secao.id} href={`#${secao.id}`}>
                {secao.titulo}
              </a>
            ))}
          </nav>
        )}

        <div className={styles.conteudo}>
          {secoes.length === 0 ? (
            <Card>
              <p className={styles.vazio}>
                Nada encontrado para “{busca.trim()}”. Tente outra palavra, ou fale com a equipe de
                TI.
              </p>
            </Card>
          ) : (
            secoes.map((secao) => (
              // scroll-margin-top no CSS: a barra do topo é fixa e cobriria o
              // título ao pular pela âncora.
              <Card key={secao.id} id={secao.id} className={styles.secao}>
                <h3>{secao.titulo}</h3>
                {secao.blocos.map((bloco, i) => (
                  <Bloco key={i} bloco={bloco} />
                ))}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
