// Conteúdo do manual do painel, exibido em Configurações > Ajuda.
//
// Separado do componente de propósito: escrever/corrigir um texto não deveria
// exigir mexer em JSX. Quem for atualizar mexe só aqui.
//
// COMO MANTER: cada seção tem `id` (usado pelo índice lateral e pela âncora
// da URL — NÃO mude depois de publicado, links compartilhados quebram),
// `titulo` e `blocos`. Cada bloco é de um tipo:
//
//   { tipo: 'texto', texto }                     parágrafo
//   { tipo: 'lista', itens: [] }                 lista com marcador
//   { tipo: 'definicoes', itens: [{ termo, texto }] }   termo + explicação
//   { tipo: 'aviso', texto }                     destaque
//
// Escreva do ponto de vista de quem usa. Nada de nome de arquivo, rota ou
// componente: quem lê aqui é a equipe e a diretoria.
//
// TODA FUNCIONALIDADE NOVA DO PAINEL PASSA POR AQUI. Manual desatualizado é
// pior que manual nenhum — quem lê passa a desconfiar de tudo. Só não entra o
// que a pessoa não percebe: refatoração, ajuste de build, correção interna.
// Módulo novo ganha seção própria; aba nova dentro de um módulo existente
// entra como bloco `definicoes` na seção daquele módulo.
//
// A outra superfície voltada ao usuário é o changelog em
// constants/novidades.js — as duas costumam mudar juntas.
export const SECOES_AJUDA = [
  {
    id: 'visao-geral',
    titulo: 'Visão geral',
    blocos: [
      {
        tipo: 'texto',
        texto:
          'O Painel de TI reúne num lugar só o que o setor precisa acompanhar: os equipamentos da empresa, os chamados abertos pelas pessoas, a saúde da rede e os arquivos que a equipe distribui. Tudo que você cadastra fica salvo no servidor e aparece para os outros usuários automaticamente, sem precisar recarregar a página.',
      },
      {
        tipo: 'texto',
        texto:
          'A tela se divide em três partes: a barra do topo (marca, busca e sua conta), a barra lateral esquerda (os módulos) e o conteúdo da página no centro.',
      },
      {
        tipo: 'aviso',
        texto:
          'O painel funciona também no celular e pode ser instalado como aplicativo. Veja "Usar no celular" no fim desta página.',
      },
    ],
  },
  {
    id: 'navegacao',
    titulo: 'Como navegar',
    blocos: [
      {
        tipo: 'texto',
        texto:
          'A barra lateral lista os módulos. Passe o mouse sobre um deles e as abas daquele módulo aparecem num painel ao lado — não precisa clicar. Clicar também funciona.',
      },
      {
        tipo: 'definicoes',
        itens: [
          {
            termo: 'Três formas de usar a barra lateral',
            texto:
              'No controle do rodapé da barra você escolhe entre Expandida (sempre com os nomes), Recolhida (só ícones, sobrando mais espaço para o conteúdo) e Expandir ao passar o mouse (fica estreita e cresce só quando você chega perto).',
          },
          {
            termo: 'Onde estou',
            texto:
              'A barra do topo mostra o módulo aberto logo depois do nome da unidade. Clicar na logo do GMAD volta para o Início.',
          },
          {
            termo: 'Busca rápida',
            texto:
              'O campo "Buscar" no topo — ou o atalho Ctrl+K — abre uma busca que encontra ativos, colaboradores e telas do painel. É o caminho mais rápido quando você já sabe o que procura.',
          },
          {
            termo: 'Notificações',
            texto:
              'O sino avisa sobre garantias vencendo e equipamentos em manutenção. Clicar num aviso leva direto ao item.',
          },
        ],
      },
    ],
  },
  {
    id: 'painel-geral',
    titulo: 'Início (Painel geral)',
    blocos: [
      {
        tipo: 'texto',
        texto:
          'É a tela de abertura. Resume o parque de equipamentos em números e aponta o que precisa de atenção agora.',
      },
      {
        tipo: 'lista',
        itens: [
          'Contadores por tipo de equipamento (desktops, notebooks, monitores, celulares, impressoras, televisões) e o valor total investido.',
          'Status geral: quantos equipamentos estão ativos, em manutenção ou fora de uso.',
          'Requer atenção: garantias perto do vencimento e equipamentos parados em manutenção.',
          'Distribuição por unidade: quantos colaboradores há em cada departamento, unidade por unidade.',
        ],
      },
      {
        tipo: 'texto',
        texto:
          'Os cartões de contagem são clicáveis: clicar em "Notebooks", por exemplo, abre a lista de ativos já filtrada por notebooks.',
      },
    ],
  },
  {
    id: 'chamados',
    titulo: 'Chamados',
    blocos: [
      {
        tipo: 'texto',
        texto:
          'O módulo de suporte. É onde os pedidos de ajuda chegam, são atendidos e ficam registrados.',
      },
      {
        tipo: 'definicoes',
        itens: [
          {
            termo: 'Central de Chamados',
            texto:
              'A lista de todos os chamados. Dá para filtrar por status, prioridade e categoria, buscar por número, título ou solicitante, e marcar "Somente meus" para ver apenas os seus. Clicar num chamado abre a ficha com a conversa, o histórico e as ações de atendimento.',
          },
          {
            termo: 'Indicadores',
            texto:
              'Os números do suporte: quantos chamados foram abertos e resolvidos por dia, distribuição por categoria, solicitante, setor e unidade, e quantos cada técnico resolveu no período.',
          },
        ],
      },
      {
        tipo: 'definicoes',
        itens: [
          {
            termo: 'Prioridade define o prazo',
            texto:
              'Urgente responde em 2 horas (trabalho totalmente parado), Alta em 8 horas (impede parte do trabalho), Média em 24 horas e Baixa em 48 horas. O painel calcula o prazo sozinho quando o chamado é aberto e avisa quando está perto de vencer.',
          },
          {
            termo: 'Status',
            texto:
              'Um chamado passa por Aberto, Em atendimento e Aguardando usuário, e termina em Resolvido, Fechado ou Cancelado.',
          },
          {
            termo: 'Origem',
            texto:
              'O chamado pode ter nascido aqui no painel ou ter chegado pelo WhatsApp. A etiqueta ao lado do título mostra de onde veio.',
          },
        ],
      },
    ],
  },
  {
    id: 'inventario',
    titulo: 'Inventário',
    blocos: [
      {
        tipo: 'definicoes',
        itens: [
          {
            termo: 'Ativos cadastrados',
            texto:
              'O cadastro oficial dos equipamentos: quem usa, em que unidade e departamento está, número de série, data de compra, valor e garantia. É preenchido pela equipe. Dá para filtrar por unidade, categoria, departamento e usuário, e exportar a lista.',
          },
          {
            termo: 'Estoque',
            texto:
              'O que está guardado e ainda não foi entregue a ninguém — peças, periféricos e equipamentos de reserva, com quantidade.',
          },
          {
            termo: 'Máquinas detectadas',
            texto:
              'Diferente do cadastro acima: é o que o agente instalado nas máquinas descobre sozinho — processador, memória, disco, sistema e programas instalados. Chega-se a ela pelo botão "Máquinas detectadas" dentro de Ativos cadastrados.',
          },
        ],
      },
      {
        tipo: 'aviso',
        texto:
          'A ficha de cada máquina detectada mostra também o que MUDOU desde a última coleta — pente de memória retirado, disco trocado, programa instalado. É como se percebe alteração que ninguém comunicou.',
      },
    ],
  },
  {
    id: 'rede',
    titulo: 'Rede',
    blocos: [
      {
        tipo: 'definicoes',
        itens: [
          {
            termo: 'Infraestrutura',
            texto:
              'O cadastro dos equipamentos de rede por unidade — servidores, roteadores, switches — com endereços e dados de acesso. Também lista os aparelhos que a varredura encontrou na rede.',
          },
          {
            termo: 'Monitoramento',
            texto:
              'Acompanha em tempo real os pontos monitorados (servidores e o link de internet). Mostra latência, jitter, perda de pacotes e disponibilidade, com gráficos que se atualizam sozinhos conforme chegam novas medições. Também é onde se roda o teste de velocidade.',
          },
          {
            termo: 'Painel de Infra',
            texto:
              'A mesma informação organizada como painel de operação, comparando todos os pontos lado a lado no mesmo gráfico e trazendo o uso de CPU, memória e disco das máquinas com agente.',
          },
        ],
      },
      {
        tipo: 'definicoes',
        itens: [
          {
            termo: 'Alertas',
            texto:
              'Quando um ponto passa do limite configurado, o painel registra um alerta. Ele se encerra sozinho quando a medição normaliza, mas você pode dar baixa manual no botão "Resolver" — útil quando o problema já foi tratado na mão.',
          },
          {
            termo: 'Modo TV',
            texto:
              'O botão de tela cheia abre o painel sem menus, para deixar num monitor de parede. Ele se atualiza sozinho e avisa se o agente parar de enviar medições.',
          },
        ],
      },
    ],
  },
  {
    id: 'ferramentas',
    titulo: 'Ferramentas',
    blocos: [
      {
        tipo: 'definicoes',
        itens: [
          {
            termo: 'Instaladores',
            texto:
              'Os programas que a equipe distribui, com link de download, versão e para que servem. Evita procurar instalador em pasta de rede.',
          },
          {
            termo: 'Scripts',
            texto:
              'Comandos e rotinas que a equipe usa no dia a dia, com explicação do que fazem. Dá para copiar o conteúdo com um clique.',
          },
        ],
      },
    ],
  },
  {
    id: 'pessoas',
    titulo: 'Pessoas',
    blocos: [
      {
        tipo: 'texto',
        texto:
          'Em Contatos ficam os colaboradores da empresa: nome, departamento, unidade, ramal e telefone. É a lista que alimenta o campo "usuário" dos equipamentos — cadastrar a pessoa aqui faz ela aparecer como opção ao registrar um ativo.',
      },
    ],
  },
  {
    id: 'dados',
    titulo: 'Dados',
    blocos: [
      {
        tipo: 'definicoes',
        itens: [
          {
            termo: 'Relatórios',
            texto:
              'Monta relatórios prontos a partir do que está cadastrado — ativos, estoque, contatos, chamados, infraestrutura. Você escolhe as colunas, a ordem e o formato, e baixa em Excel, CSV ou PDF.',
          },
          {
            termo: 'Atividade recente',
            texto:
              'O histórico do que a equipe fez no painel: cadastros, edições e exclusões, com autor e horário. Serve para saber quem mexeu em quê. O registro é permanente e ninguém consegue apagá-lo pelo painel — antes só ficavam as 40 ações mais recentes. Como o conteúdo do que foi excluído fica guardado junto, dá para recadastrar à mão o que sumiu por engano. Senhas não entram nesse registro.',
          },
        ],
      },
    ],
  },
  {
    id: 'configuracoes',
    titulo: 'Configurações',
    blocos: [
      {
        tipo: 'texto',
        texto:
          'O único módulo que trata do próprio painel, e não do parque de equipamentos ou do trabalho do dia. Fica por último na barra lateral.',
      },
      {
        tipo: 'definicoes',
        itens: [
          {
            termo: 'Ajuda',
            texto:
              'Esta página. Explica o painel módulo por módulo. O campo de busca no topo procura em todo o texto — digite uma palavra como "garantia", "senha" ou "alerta" e só as seções que falam disso continuam na tela.',
          },
        ],
      },
    ],
  },
  {
    id: 'conta',
    titulo: 'Sua conta',
    blocos: [
      {
        tipo: 'texto',
        texto:
          'O círculo com sua foto ou silhueta, no canto direito da barra do topo, abre o menu da conta.',
      },
      {
        tipo: 'definicoes',
        itens: [
          {
            termo: 'Meu perfil',
            texto:
              'Foto, setor e cargo. A foto é reduzida automaticamente e recortada em círculo — pode escolher qualquer imagem, o painel se encarrega do resto.',
          },
          {
            termo: 'Trocar senha',
            texto:
              'Você mesmo troca a sua senha, sem depender do TI. Pede a senha atual antes por segurança: assim ninguém troca a senha de quem esqueceu a tela destravada.',
          },
          {
            termo: 'Novidades',
            texto:
              'O que mudou no painel a cada atualização. Um ponto laranja aparece quando há novidade que você ainda não leu.',
          },
          {
            termo: 'Estado da sincronização',
            texto:
              'A linha no topo do menu mostra se o painel está conversando com o banco de dados e a hora da última atualização. Clicando nela, você força uma nova sincronização — útil se desconfiar que está vendo dado velho.',
          },
        ],
      },
      {
        tipo: 'texto',
        texto:
          'O botão de sol/lua ao lado do sino alterna entre tema claro e escuro. A escolha fica gravada no seu navegador.',
      },
    ],
  },
  {
    id: 'celular',
    titulo: 'Usar no celular',
    blocos: [
      {
        tipo: 'texto',
        texto:
          'O painel se adapta à tela do celular: a barra lateral vira uma faixa horizontal no topo e as tabelas viram cartões, um por linha.',
      },
      {
        tipo: 'texto',
        texto:
          'Dá para instalar como aplicativo. No Android, o navegador oferece "Instalar aplicativo"; no iPhone, use Compartilhar e depois "Adicionar à Tela de Início". Instalado, ele abre em tela cheia, sem a barra do navegador, e ganha ícone próprio.',
      },
    ],
  },
  {
    id: 'duvidas',
    titulo: 'Dúvidas frequentes',
    blocos: [
      {
        tipo: 'definicoes',
        itens: [
          {
            termo: 'Cadastrei algo e outra pessoa não está vendo',
            texto:
              'O painel atualiza sozinho, mas se houver dúvida abra o menu da sua conta e clique na linha de sincronização para forçar a atualização. Se aparecer "Falha ao sincronizar", a mensagem ao lado diz o motivo.',
          },
          {
            termo: 'Qual a diferença entre Ativos cadastrados e Máquinas detectadas',
            texto:
              'Ativos é o cadastro administrativo, preenchido por pessoas — inclui valor, garantia e responsável. Máquinas detectadas é o que o agente lê de dentro do computador. Um equipamento pode estar num e não no outro: um monitor aparece só em Ativos, e um computador sem cadastro aparece só em Máquinas detectadas.',
          },
          {
            termo: 'Esqueci minha senha',
            texto:
              'A troca pelo painel exige saber a senha atual. Sem ela, é preciso pedir a redefinição para a equipe de TI.',
          },
          {
            termo: 'O gráfico não mostra nada',
            texto:
              'Gráficos só desenham o que foi medido ou cadastrado. Se o período escolhido não tem dado, a área fica vazia com um aviso — não é erro.',
          },
        ],
      },
      {
        tipo: 'aviso',
        texto:
          'Não achou o que procurava? Fale com a equipe de TI pelo e-mail no rodapé de qualquer página, ou abra um chamado na Central de Chamados.',
      },
    ],
  },
]
