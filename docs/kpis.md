# Catálogo de KPIs

Este documento define os indicadores da camada `mart`, suas fórmulas, grãos, filtros e limitações. Os valores de referência usam todo o período disponível na DW, de janeiro a abril de 2021.

Os números abaixo são **baselines observados**, não metas. O projeto ainda não possui benchmark externo ou limite de SLA aprovado para estabelecer objetivos responsáveis.

---

## 1. KPIs primários

### 1.1. Valor transacionado de pedidos finalizados

Mede o valor dos produtos somado à taxa de entrega dos pedidos concluídos.

```text
SUM(valor_total_pedido)
WHERE order_status = 'FINISHED'
```

- Fonte: `mart.vw_pedidos_enriquecidos`.
- Grão de origem: pedido.
- Baseline: **R$ 37.481.358,97**.
- Uso: acompanhar volume financeiro confirmado.
- Cuidado: não somar esse valor depois de um join direto com pagamentos ou entregas.

### 1.2. Taxa de cancelamento

Mede a proporção de pedidos cancelados entre todos os pedidos criados.

```text
pedidos_cancelados / pedidos_criados * 100
```

- Numerador: pedidos com `order_status = 'CANCELED'`.
- Denominador: todos os pedidos.
- Fonte: `mart.vw_kpis_vendas_diarios`.
- Baseline: **4,60%** — 16.979 cancelados em 368.999 pedidos.
- Uso: monitorar perda operacional e comercial.
- Cuidado: ao reagrupar dados no Power BI, recalcular a taxa usando os contadores; não tirar média de percentuais.

### 1.3. Margem da entrega de pedidos finalizados

Mede o resultado entre a taxa cobrada do cliente e o custo logístico registrado.

```text
SUM(taxa_entrega - COALESCE(custo_entrega, 0))
WHERE order_status = 'FINISHED'
```

- Fonte: `mart.vw_kpis_vendas_diarios`.
- Baseline: **-R$ 434.905,63**.
- Uso: avaliar se a operação de frete gera margem ou subsídio.
- Interpretação: o baseline negativo indica que, no agregado, o custo de entrega supera a taxa cobrada.
- Guardrail: analisar juntamente com volume, distância e taxa de cancelamento para evitar otimização financeira que prejudique o serviço.

---

## 2. Métricas direcionadoras

### 2.1. Ticket médio finalizado

```text
valor transacionado finalizado / pedidos finalizados
```

- Baseline: **R$ 106,48**.
- Fonte: `mart.vw_kpis_vendas_diarios`.
- Uso: explicar variações do valor transacionado.

### 2.2. Tempo de ciclo do pedido

Tempo entre criação e finalização do pedido.

- P50 observado: **42,18 minutos**.
- P90 observado: **83,17 minutos**.
- Fonte: `mart.vw_performance_logistica` e `mart.vw_performance_lojas`.
- Inclusão: somente pedidos `FINISHED` com métrica maior ou igual a zero.
- Uso: P50 representa a experiência típica; P90 evidencia a cauda de pedidos lentos.
- Cuidado: não existe meta de SLA aprovada. As views publicam percentis, mas não classificam pedidos como “dentro” ou “fora” do SLA.

### 2.3. Taxa de entrega concluída

```text
últimas tentativas com delivery_status = 'DELIVERED'
/ pedidos com entrega
* 100
```

- Baseline: **97,95%**.
- Fonte: `mart.vw_performance_logistica`.
- Uso: medir o desfecho logístico dos pedidos que chegaram ao processo de entrega.
- Cuidado: utiliza apenas a última tentativa registrada para cada pedido.

### 2.4. Taxa de múltiplas tentativas

```text
pedidos cuja última tentativa tem numero_tentativa > 1
/ pedidos com entrega
* 100
```

- Baseline: **5,22%**.
- Fonte: `mart.vw_performance_logistica`.
- Uso: identificar retrabalho e possível impacto em custo e experiência.
- Limitação: a origem não possui timestamp por tentativa; a ordenação utiliza `delivery_id`.

---

## 3. Guardrails financeiros e de qualidade

### 3.1. Status de conciliação

A view `mart.vw_conciliacao_pagamentos` agrega os pagamentos antes de uni-los ao pedido e classifica cada pedido como:

- `CONCILIADO`: pagamentos `PAID` diferem no máximo R$ 0,01 do valor esperado.
- `PAGAMENTO_A_MENOR`: total pago menor que o valor esperado.
- `PAGAMENTO_A_MAIOR`: total pago maior que o valor esperado.
- `SEM_PAGAMENTO`: não existe transação de pagamento.
- `SEM_PAGAMENTO_PAGO`: existem pagamentos, mas nenhum está `PAID`.
- `PEDIDO_CANCELADO`: pedido cancelado, analisado separadamente.

O indicador recomendado é:

```text
pedidos finalizados conciliados / pedidos finalizados * 100
```

Não usar pagamentos `AWAITING` ou `CHARGEBACK` como pagamentos confirmados.

### 3.2. Chargebacks

- Transações observadas: **438**.
- Valor observado: **R$ 7.160,50**.
- Fonte: `mart.vw_pagamentos_enriquecidos`.
- Uso: guardrail de risco financeiro.

### 3.3. Métricas temporais negativas

A origem possui 416 pedidos com pelo menos uma métrica temporal negativa.

- As linhas permanecem na DW para rastreabilidade.
- Médias e percentis do `mart` excluem valores negativos de cada métrica.
- As contagens de amostra são publicadas junto aos indicadores para revelar a cobertura.

### 3.4. Entregador não informado

A origem possui 15.886 entregas sem `driver_id`.

- Elas são preservadas com `driver_id = -1`.
- No `mart`, aparecem como modal e tipo `NAO INFORMADO`.
- Não devem ser removidas silenciosamente das taxas operacionais.

---

## 4. Views e finalidade

| View | Grão | Finalidade |
|---|---|---|
| `mart.vw_pedidos_enriquecidos` | Pedido | Exploração comercial e operacional |
| `mart.vw_entregas_enriquecidas` | Entrega/tentativa | Análise detalhada de logística |
| `mart.vw_pagamentos_enriquecidos` | Pagamento | Análise detalhada financeira |
| `mart.vw_kpis_vendas_diarios` | Dia, loja e canal | Vendas, cancelamentos, ticket e margem |
| `mart.vw_performance_logistica` | Dia, hub e perfil do entregador | Distância, tentativas e tempos |
| `mart.vw_conciliacao_pagamentos` | Pedido | Reconciliação financeira sem fanout |
| `mart.vw_mix_pagamentos` | Dia, hub, canal e método | Participação dos métodos `PAID` |
| `mart.vw_performance_lojas` | Mês e loja | Ranking e acompanhamento de lojas |

---

## 5. Regras para consumo no Power BI

1. Relacionar a tabela calendário usando `sk_tempo` ou `data_completa`.
2. Somar apenas métricas aditivas, como valores e contagens.
3. Recalcular taxas a partir de numerador e denominador no nível exibido.
4. Não relacionar simultaneamente as três views detalhadas por `order_id` em relações bidirecionais.
5. Usar as views agregadas para os painéis executivos e as detalhadas apenas para drill-through.
6. Manter pedidos cancelados separados dos indicadores financeiros confirmados.

---

## 6. Definição futura de metas

Antes de estabelecer metas, recomenda-se:

1. Montar as séries semanais e mensais no Power BI.
2. Medir estabilidade, sazonalidade e diferenças entre hubs.
3. Investigar a margem de entrega negativa e as métricas temporais anômalas.
4. Definir responsáveis e ações associadas a cada KPI.
5. Usar o baseline histórico e a capacidade operacional para propor metas realistas.
