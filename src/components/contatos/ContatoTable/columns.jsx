import Badge from '../../ui/Badge/Badge'
import tableStyles from '../../ui/Table/Table.module.css'
import { unitDisplayName } from '../../../utils/formatters'
import { contatoCelularInfo } from '../../../utils/contatosFilter'

// Definições de coluna da tabela de Contatos, portadas 1:1 do CONTATO_COLS +
// renderContatos() do sistema original. Ao contrário de Ativos, as colunas
// não variam — mas "Gestor" e "Celular corporativo" são derivadas (gestorMap
// e o vínculo com Ativos), por isso são geradas por função em vez de um
// objeto estático.
export function buildColumns(gestorMap, assets) {
  return [
    {
      key: 'nome',
      label: 'Nome',
      sortable: true,
      render: (c) => (
        <>
          {c.nome} {c.isGestor && <Badge variant="ok">Gestor</Badge>}
        </>
      ),
    },
    {
      key: 'unidade',
      label: 'Unidade',
      sortable: true,
      render: (c) => unitDisplayName(c.unidade) || '—',
    },
    {
      key: 'departamento',
      label: 'Departamento',
      sortable: true,
      render: (c) => <span className={tableStyles.muted}>{c.departamento}</span>,
    },
    {
      key: 'gestor',
      label: 'Gestor',
      sortable: true,
      render: (c) => gestorMap[c.departamento] || '—',
    },
    {
      key: 'telefone',
      label: 'Telefone',
      sortable: true,
      render: (c) => c.telefone || '—',
    },
    {
      key: 'celular',
      label: 'Celular corporativo',
      sortable: true,
      render: (c) => {
        const info = contatoCelularInfo(assets, c)
        if (!info) return <span className={tableStyles.muted}>Não informado</span>
        return (
          <div className={tableStyles.cellStack}>
            <b>{info.texto}</b>
            {info.patrimonio && <span>Patrimônio: {info.patrimonio}</span>}
          </div>
        )
      },
    },
    {
      key: 'email',
      label: 'E-mail',
      sortable: true,
      render: (c) => c.email || '—',
    },
  ]
}
