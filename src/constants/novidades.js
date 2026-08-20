// Registro de mudanças do painel, exibido em "Novidades" (menu da conta).
//
// COMO MANTER: acrescente uma entrada NOVA NO TOPO a cada conjunto de
// mudanças que chega aos usuários. O `id` é o que marca o que já foi lido
// (ver NewsModal) — precisa ser único e NUNCA mudar depois de publicado:
// alterar o id de uma entrada antiga faria o painel voltar a marcá-la como
// não lida pra todo mundo.
//
// Escreva do ponto de vista de quem usa, não do commit. "A logo leva ao
// Painel geral" e não "adiciona <Link> ao brandLogo" — quem lê aqui é a
// equipe de TI e a diretoria, não quem mexe no código.
//
// Só entra o que a pessoa CONSEGUE PERCEBER. Refatoração, ajuste de build e
// correção interna não viram linha aqui: enchem a lista e escondem o que
// importa.
export const NOVIDADES = [
  {
    id: '2026-08-20-barra-e-graficos',
    data: '2026-08-20',
    titulo: 'Barra do topo, menu da conta e gráficos',
    itens: [
      'A logo do GMAD agora leva ao Painel geral.',
      'O nome e o botão de sair viraram um menu no avatar, com o e-mail da conta à vista.',
      'Dá pra trocar a própria senha pelo menu, sem depender do TI.',
      'O menu mostra se o painel está sincronizado com o banco, com o horário da última atualização — e dá pra forçar a sincronização.',
      'A barra do topo mostra em que módulo você está.',
      'Sair agora pede confirmação.',
      'As sub-abas dos módulos abrem ao passar o mouse, sem precisar clicar.',
      'Os gráficos passaram a se desenhar ao abrir a tela e a destacar a barra ou fatia sob o cursor.',
      'Entrar e sair do painel deixou de ser um corte seco entre telas.',
      'Alertas de rede já resolvidos podem receber baixa manual, em vez de esperar o sistema normalizar sozinho.',
    ],
  },
  {
    id: '2026-08-20-identidade',
    data: '2026-08-20',
    titulo: 'Identidade visual',
    itens: [
      'Fonte nova em todo o site (DM Sans), mais próxima do padrão dos painéis que usamos como referência.',
      'Ícone da aba e ícones do aplicativo instalado refeitos com o G da marca — no celular ele deixa de aparecer minúsculo na tela inicial.',
      'A logo aparece em versão clara no modo escuro, em vez de sumir no fundo.',
      'Barras do topo e lateral mais estreitas, sobrando espaço para o conteúdo.',
      'Ícones do menu refeitos: cada item tem o seu, sem repetição.',
    ],
  },
  {
    id: '2026-08-20-correcoes',
    data: '2026-08-20',
    titulo: 'Correções',
    itens: [
      'No celular, tocar fora de um menu agora fecha ele — antes só funcionava com mouse.',
      'No celular, tocar num gráfico não deixa mais a barra presa em destaque.',
    ],
  },
]

// Entrada mais recente. Sai daqui, e não de uma constante à parte, pra não
// existir a chance de a lista crescer e o "último id" ficar apontando pra
// uma entrada antiga.
export const ULTIMA_NOVIDADE = NOVIDADES[0]
