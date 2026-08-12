import { useMemo } from 'react'
import { useAssets } from './data/useAssets'
import { useContatos } from './data/useContatos'
import { createSearchMatcher } from '../utils/textFilter'
import { unitDisplayName } from '../utils/formatters'
import { ROUTES } from '../constants/routes'

const RESULTS_PER_GROUP = 5

// Busca real (não navegação) usada pela paleta de comandos: procura o texto
// digitado nos mesmos campos que os filtros de Ativos/Contatos já buscam
// (assetsFilter.js/contatosFilter.js), agrupado por tipo de registro.
export function useGlobalSearch(query) {
  const { data: assets } = useAssets()
  const { data: contatos } = useContatos()

  return useMemo(() => {
    const q = query.trim()
    if (!q) return []

    const matches = createSearchMatcher(q)

    const ativos = (assets ?? [])
      .filter((a) =>
        matches([
          a.id,
          a.usuario,
          a.modelo,
          a.ad,
          a.serial,
          a.imei1,
          a.imei2,
          a.departamento,
          a.pcVinculado,
          a.codModelo,
        ]),
      )
      .slice(0, RESULTS_PER_GROUP)
      .map((a) => ({
        id: `ativo-${a.uid}`,
        title: a.id,
        subtitle: [a.modelo, a.usuario].filter(Boolean).join(' · ') || unitDisplayName(a.unidade),
        route: ROUTES.ativos,
        uid: a.uid,
      }))

    const contatosResults = (contatos ?? [])
      .filter((c) =>
        matches([c.nome, c.departamento, unitDisplayName(c.unidade), c.telefone, c.email]),
      )
      .slice(0, RESULTS_PER_GROUP)
      .map((c) => ({
        id: `contato-${c.uid}`,
        title: c.nome,
        subtitle: [c.departamento, unitDisplayName(c.unidade)].filter(Boolean).join(' · '),
        route: ROUTES.contatos,
        uid: c.uid,
      }))

    const groups = []
    if (ativos.length) groups.push({ label: 'Ativos', items: ativos })
    if (contatosResults.length) groups.push({ label: 'Contatos', items: contatosResults })
    return groups
  }, [assets, contatos, query])
}
