# Páginas e experiência analítica

O canvas de todas as páginas é `1280 × 720`, em modo `FitToPage`, com tema escuro e contraste alto.

## 01 Executivo

Pergunta principal: qual é o resultado comercial e onde estão seus maiores direcionadores?

- Filtros: período, hub, loja e canal.
- HTML/CSS: valor transacionado, pedidos finalizados, ticket médio, cancelamento e margem de entrega.
- Linha: valor transacionado por mês.
- HTML/CSS: top 5 hubs por valor.
- Colunas: valor por canal.
- Tabela: desempenho de lojas, incluindo volume, ticket, cancelamento e margem.
- Drill-through: clique com o botão direito em um `Pedido ID` disponível nos detalhes e abra `04 Detalhe do Pedido`.

## 02 Logística

Pergunta principal: qual é o nível de serviço e onde existe retrabalho?

- Filtros: período, hub, modal e tipo de entregador.
- HTML/CSS: entrega concluída, múltiplas tentativas, ciclo P50/P90 e distância média.
- Linha: P50 e P90 do ciclo ao longo do tempo.
- HTML/CSS: hubs com maior taxa de retentativa.
- Barras: pedidos com entrega por modal.
- Tabela: volume, desfecho, retentativa, distância e percentis por hub.

Os percentis usam todos os pedidos finalizados por padrão. Quando `Entregadores` é filtrado, o DAX aplica `TREATAS` para restringir os pedidos às últimas tentativas selecionadas.

## 03 Financeiro

Pergunta principal: pagamentos e pedidos fecham, e onde há exposição financeira?

- Filtros: período, hub, canal e meio de pagamento.
- HTML/CSS: valor pago, taxa de conciliação, transações pagas, chargeback e diferença absoluta.
- Linha: valor pago por mês.
- HTML/CSS: distribuição por status de conciliação.
- Rosca: mix de valor pago por meio.
- Tabela: transações, valores, taxas e chargebacks por meio.

## 04 Detalhe do Pedido

Página de drill-through com filtro obrigatório em `Pedido[Pedido ID]` e manutenção dos demais filtros.

- HTML/CSS: cabeçalho do pedido selecionado.
- Botão nativo `Voltar`, com ação `Back`.
- Tabela do pedido: status, loja, canal, datas e valores.
- Tabela de entregas: tentativas, status, modal e distância.
- Tabela de pagamentos: transações, método, status, taxa e valor líquido.

## Interação e acessibilidade

- Os gráficos nativos fazem cross-filter e expõem dados para leitores de tela.
- Os blocos HTML resumem indicadores, mas não substituem as tabelas auditáveis.
- Títulos descrevem a métrica e a unidade.
- Cores semânticas são consistentes: verde para resultado favorável, âmbar para atenção e rosa para risco.
- Nenhuma interpretação depende exclusivamente de cor; valores e rótulos ficam visíveis.
