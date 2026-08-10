# Delivery Center — especificação da versão portátil

## Objetivo

- Formato: projeto PBIP/PBIR paralelo, com modelo semântico Import.
- Fonte: `powerbi/data/fato_dashboard.csv`, gerado deterministicamente dos CSVs completos em `data/raw`.
- Grão: uma linha por pedido, com última tentativa de entrega e pagamentos previamente agregados por pedido.
- Uso: demonstração e validação local quando PostgreSQL ou Docker não estiverem disponíveis.
- Restrição: não substitui o projeto principal `DeliveryCenterAnalytics.pbip` nem o schema `mart` como fonte canônica.

## Páginas previstas

1. **Visão Executiva**: resultado comercial, tendência, hubs e alertas.
2. **Pedidos & Operação**: volume, status, produção, trânsito e ciclo.
3. **Financeiro & Conciliação**: valor pago, taxas, chargeback, conciliação e segmentos.
4. **Entregas & Qualidade**: conclusão, retentativas, P50/P90, modal e distância.
5. **Detalhamento**: consulta por pedido, loja, hub, status, pagamentos e entrega.

## Regras preservadas

- Percentis são calculados dinamicamente em DAX no detalhe válido, nunca pela média de percentis agregados.
- Taxas usam numerador e denominador no contexto do filtro.
- Pagamentos são agregados antes da união com pedidos para impedir fanout.
- Apenas pagamentos `PAID` compõem valor pago; `CHARGEBACK` e `AWAITING` são guardrails separados.
- A conciliação segue a tolerância de R$ 0,01 definida no `mart`.
- A última tentativa é determinada por `delivery_id`, pois a origem não possui timestamp por tentativa.
