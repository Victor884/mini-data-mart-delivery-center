# Páginas e experiência analítica

As cinco páginas visíveis usam canvas `1280 × 720`, modo `FitToPage`, tema claro e uma grade comum: marca e navegação no topo, título e contexto, faixa de filtros, KPIs e análise detalhada. As quatro páginas de tooltip usam `320 × 240` em tamanho real.

## Elementos comuns

- navegador de páginas com estado ativo e páginas de tooltip ocultas;
- botão `Limpar filtros` com ação nativa `ClearAllSlicers`;
- filtros com fonte e altura padronizadas e busca visual configurada;
- títulos, unidades, moeda, percentual e casas decimais consistentes;
- descrições alternativas em todos os visuais;
- gráficos nativos para interação; HTML apenas para síntese;
- bordas discretas, sombras leves e cores semânticas constantes.

## 01 Visão Executiva

Pergunta: qual é a saúde comercial e onde estão os maiores direcionadores?

- filtros: período, hub, loja e canal;
- KPIs: valor transacionado, pedidos finalizados, ticket, cancelamento e margem;
- tendência mensal do valor;
- ranking horizontal de hubs;
- painel de saúde executiva;
- tabela de desempenho de lojas.

## 02 Pedidos & Operação

Pergunta: como o volume flui pelas etapas operacionais e onde ocorre perda?

- filtros: período, hub, canal e status do pedido;
- KPIs de criação, conclusão, cancelamento, produção e trânsito;
- tendência mensal de pedidos;
- distribuição horizontal por status;
- painel das etapas de produção, trânsito e ciclo;
- tabela de volume e tempos por hub.

## 03 Financeiro

Pergunta: pagamentos e pedidos conciliam, e quais segmentos concentram valor ou risco?

- filtros: período, hub, canal e método de pagamento;
- KPIs de valor pago, conciliação, transações, chargeback e diferença absoluta;
- tendência de valor transacionado e pago;
- ranking horizontal por meio de pagamento;
- distribuição horizontal dos status de conciliação;
- tabela financeira por segmento.

## 04 Entregas & Qualidade

Pergunta: qual é a qualidade operacional e onde existem retentativas ou ciclos longos?

- filtros: período, hub, modal e tipo de entregador;
- KPIs de conclusão, múltiplas tentativas, P50/P90 e distância;
- tendência de P50 e P90;
- pedidos por modal;
- ranking de hubs por retentativa;
- tabela de qualidade por hub.

P50 e P90 descrevem a distribuição do ciclo. O relatório não os apresenta como SLA porque não existe meta formal aprovada no modelo.

## 05 Detalhamento

Página de drill-through filtrada por `Pedido[Pedido ID]`, com manutenção dos filtros anteriores.

- cabeçalho HTML do pedido selecionado;
- botão nativo `Voltar`;
- filtro pesquisável de pedido;
- tabela do pedido;
- tabela de tentativas de entrega;
- tabela de transações de pagamento.

## Tooltips

Quatro páginas ocultas complementam os principais gráficos:

- `Tooltip | Comercial`;
- `Tooltip | Pedidos`;
- `Tooltip | Financeiro`;
- `Tooltip | Entregas`.

Cada tooltip mostra o contexto selecionado e, conforme a métrica, valor atual, período anterior, variação absoluta, variação percentual e participação no total. Assim, o tooltip acrescenta interpretação sem repetir apenas o rótulo do gráfico.

## Interações e navegação

- slicers e gráficos usam o comportamento nativo de filtro cruzado;
- rankings foram convertidos em barras horizontais para acomodar nomes longos;
- não há pizza ou rosca com muitas categorias;
- não foram adicionados bookmarks sem uma visão alternativa concreta, evitando estados invisíveis e manutenção desnecessária;
- o drill-through permanece concentrado no pedido, o único grão com detalhamento completo entre fatos.

## Layout mobile

O conceito mobile aprovado está em `assets/redesign-mobile-approved.png`. A [documentação de projetos Power BI](https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report) informa que `mobileState.json` não oferece edição externa suportada; por isso, a etapa final deve usar [Auto-create mobile layout](https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-create-mobile-optimized-report-mobile-layout-view) no Power BI Desktop ou no serviço e então ajustar a ordem conforme o conceito. Essa decisão evita gravar metadados não suportados no repositório.
