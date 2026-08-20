import { useCallback, useState } from 'react'

// Anima o desenho da marca só na PRIMEIRA vez que ela aparece, e desliga em
// seguida.
//
// Existe por causa de uma armadilha do Recharts: `isAnimationActive` não vale
// só pra entrada — vale pra TODA troca de dados. Os gráficos de linha daqui
// recebem medição nova o tempo todo (ver useMedicoes, e o Modo TV que
// recarrega sozinho), então com a animação ligada o traço se redesenharia do
// zero a cada chegada. Isso não lê como "carregando", lê como falha.
//
// Era exatamente por isso que LineChart e MultiLineChart tinham
// `isAnimationActive={false}` fixo. O desligamento continua — só passou a
// acontecer DEPOIS da primeira animação, em vez de antes dela.
//
// Devolve as props prontas pra espalhar na marca (<Area>, <Line>, <Bar>...).
export function useAnimacaoDeEntrada(duracaoMs = 700) {
  const [jaAnimou, setJaAnimou] = useState(false)
  const encerrar = useCallback(() => setJaAnimou(true), [])

  return {
    isAnimationActive: !jaAnimou,
    animationDuration: duracaoMs,
    // Desaceleração no fim: o traço parte rápido e assenta, que é como se lê
    // "terminou de carregar". Linear pareceria uma barra de progresso.
    animationEasing: 'ease-out',
    onAnimationEnd: encerrar,
  }
}
