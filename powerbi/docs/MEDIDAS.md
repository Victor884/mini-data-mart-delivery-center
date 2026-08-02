# Catálogo de medidas DAX

Todas as medidas são explícitas e ficam na tabela `Métricas`. O modelo desabilita medidas implícitas para evitar somas acidentais.

## Comercial

| Medida | Definição resumida |
|---|---|
| `Pedidos Criados` | linhas da fato `Pedidos` |
| `Pedidos Finalizados` | pedidos com status `FINISHED` |
| `Pedidos Cancelados` | pedidos com status `CANCELED` |
| `Taxa Cancelamento` | cancelados / criados |
| `Valor Transacionado` | soma do valor total dos pedidos finalizados |
| `Ticket Médio` | valor transacionado / pedidos finalizados |
| `Taxas de Entrega` | taxas cobradas em pedidos finalizados |
| `Custo de Entrega` | custo logístico dos pedidos finalizados |
| `Margem Entrega` | taxa de entrega menos custo dos pedidos finalizados |
| `Margem sobre Taxa Entrega` | margem / taxas de entrega |
| `Valor Transacionado Mês Anterior` | valor deslocado por `DATEADD(..., -1, MONTH)` |
| `Variação Valor Mensal` | variação contra o mês anterior |

## Logística

| Medida | Definição resumida |
|---|---|
| `Pedidos com Entrega` | pedidos distintos nas últimas tentativas |
| `Entregas Concluídas` | últimas tentativas com status `DELIVERED` |
| `Taxa Entrega Concluída` | concluídas / pedidos com entrega |
| `Pedidos Múltiplas Tentativas` | últimas tentativas com número maior que 1 |
| `Taxa Múltiplas Tentativas` | múltiplas / pedidos com entrega |
| `Distância Média Entrega (km)` | média das últimas tentativas entregues, convertida para km |
| `Tempo Ciclo Médio` | média do ciclo válido de pedidos finalizados |
| `Tempo Ciclo P50` | `PERCENTILEX.INC` de 50% sobre ciclos válidos |
| `Tempo Ciclo P90` | `PERCENTILEX.INC` de 90% sobre ciclos válidos |

As três medidas de ciclo reagem a filtros de entregador por meio de `TREATAS`; sem esse filtro, preservam a definição global do catálogo de KPIs.

## Financeiro

| Medida | Definição resumida |
|---|---|
| `Transações Pagas` | transações com status `PAID` |
| `Valor Pago` | valor bruto das transações `PAID` |
| `Taxas Pagamento` | taxas das transações `PAID` |
| `Valor Líquido Pago` | valor líquido das transações `PAID` |
| `Chargebacks` | transações com status `CHARGEBACK` |
| `Valor Chargeback` | valor bruto em chargeback |
| `Pedidos na Conciliação` | pedidos distintos na view de conciliação |
| `Pedidos Conciliados` | finalizados com status `CONCILIADO` |
| `Pedidos Finalizados Conciliação` | denominador dos pedidos finalizados |
| `Taxa Conciliação` | conciliados / finalizados |
| `Diferença Absoluta Conciliação` | soma do valor absoluto das diferenças em finalizados |
| `Pedidos sem Pagamento Pago` | finalizados sem transação confirmada como `PAID` |

## Medidas HTML/CSS

| Medida | Página/componente |
|---|---|
| `HTML \| KPIs Executivos` | faixa de KPIs comerciais |
| `HTML \| Ranking Hubs` | ranking executivo |
| `HTML \| KPIs Logística` | faixa de KPIs logísticos |
| `HTML \| Ranking Tentativas` | ranking de retentativa |
| `HTML \| KPIs Financeiros` | faixa de KPIs financeiros |
| `HTML \| Status Conciliação` | distribuição da conciliação |
| `HTML \| Detalhe Pedido` | cabeçalho do drill-through |

O HTML é construído por DAX e contém CSS inline. Hyperlinks, scripts e carregamento de recursos externos estão desabilitados.

As expressões completas e os formatos estão em `DeliveryCenterAnalytics.SemanticModel/definition/tables/Métricas.tmdl`.
