# Catálogo de medidas DAX

Todas as 58 medidas são explícitas e ficam na tabela `Métricas`. Medidas implícitas estão desabilitadas para evitar agregações acidentais.

## Comercial e pedidos

| Medida | Definição resumida |
|---|---|
| `Pedidos Criados` | linhas da fato `Pedidos` |
| `Pedidos Finalizados` | pedidos com status `FINISHED` |
| `Pedidos Cancelados` | pedidos com status `CANCELED` |
| `Taxa Cancelamento` | cancelados / criados |
| `Valor Transacionado` | valor total de pedidos finalizados |
| `Ticket Médio` | valor transacionado / finalizados |
| `Taxas de Entrega` | taxas cobradas em finalizados |
| `Custo de Entrega` | custo logístico de finalizados |
| `Margem Entrega` | taxa de entrega menos custo |
| `Margem sobre Taxa Entrega` | margem / taxas de entrega |
| `Valor Transacionado Mês Anterior` | valor deslocado um mês |
| `Variação Valor Mensal` | variação percentual do valor |
| `Variação Absoluta Valor Mensal` | diferença absoluta do valor |
| `Participação Valor Transacionado` | parcela no total selecionado |
| `Pedidos Mês Anterior` | pedidos deslocados um mês |
| `Variação Absoluta Pedidos Mensal` | diferença absoluta de pedidos |
| `Variação Pedidos Mensal` | variação percentual de pedidos |
| `Participação Pedidos` | parcela no total selecionado |

As medidas de participação usam `ALLSELECTED`: removem o ponto/categoria do visual e preservam os filtros externos escolhidos pelo usuário.

## Logística

| Medida | Definição resumida |
|---|---|
| `Pedidos com Entrega` | pedidos distintos nas últimas tentativas |
| `Entregas Concluídas` | últimas tentativas `DELIVERED` |
| `Taxa Entrega Concluída` | concluídas / pedidos com entrega |
| `Pedidos Múltiplas Tentativas` | últimas tentativas com número maior que 1 |
| `Taxa Múltiplas Tentativas` | múltiplas / pedidos com entrega |
| `Distância Média Entrega (km)` | média entregue convertida para km |
| `Tempo Ciclo Médio` | média do ciclo válido |
| `Tempo Ciclo P50` | percentil 50 dos ciclos válidos |
| `Tempo Ciclo P90` | percentil 90 dos ciclos válidos |
| `Tempo Produção Médio` | criação até pronto |
| `Tempo Trânsito Médio` | saída até entrega |
| `Participação Pedidos com Entrega` | parcela no total selecionado |

As medidas de ciclo reagem ao filtro de entregador por `TREATAS`. P90 não é rotulado como SLA sem um alvo aprovado.

## Financeiro

| Medida | Definição resumida |
|---|---|
| `Transações Pagas` | transações com status `PAID` |
| `Valor Pago` | valor bruto das transações pagas |
| `Taxas Pagamento` | taxas das transações pagas |
| `Valor Líquido Pago` | valor líquido das transações pagas |
| `Chargebacks` | transações `CHARGEBACK` |
| `Valor Chargeback` | valor bruto em chargeback |
| `Pedidos na Conciliação` | pedidos distintos da conciliação |
| `Pedidos Conciliados` | finalizados com status `CONCILIADO` |
| `Pedidos Finalizados Conciliação` | denominador finalizado |
| `Taxa Conciliação` | conciliados / finalizados |
| `Diferença Absoluta Conciliação` | soma absoluta das diferenças |
| `Pedidos sem Pagamento Pago` | finalizados sem transação paga |
| `Valor Pago Mês Anterior` | valor pago deslocado um mês |
| `Variação Absoluta Valor Pago Mensal` | diferença absoluta do valor pago |
| `Variação Valor Pago Mensal` | variação percentual do valor pago |
| `Participação Valor Pago` | parcela no total selecionado |

## Contexto e HTML/CSS

| Medida | Uso |
|---|---|
| `Contexto Tooltip` | período/categoria visível no tooltip |
| `HTML | KPIs Executivos` | KPIs da visão executiva |
| `HTML | Saúde Executiva` | síntese de sinais executivos |
| `HTML | KPIs Pedidos` | KPIs de pedidos e operação |
| `HTML | Etapas Operacionais` | tempos das etapas |
| `HTML | KPIs Financeiros` | KPIs financeiros |
| `HTML | KPIs Logística` | KPIs de entregas |
| `HTML | Detalhe Pedido` | cabeçalho do drill-through |
| `HTML | Tooltip Comercial` | contexto e comparação comercial |
| `HTML | Tooltip Pedidos` | contexto e comparação de pedidos |
| `HTML | Tooltip Financeiro` | contexto e comparação financeira |
| `HTML | Tooltip Entregas` | contexto, qualidade e ciclo logístico |

O HTML é estático e contém CSS inline, sem scripts ou recursos externos. As expressões completas e os formatos estão em `DeliveryCenterAnalytics.SemanticModel/definition/tables/Métricas.tmdl`.
