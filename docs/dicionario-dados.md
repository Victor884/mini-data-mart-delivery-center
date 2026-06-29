# Dicionário de Dados - Camada Staging (`stg`)

Este documento serve como referência para entender o significado de cada coluna e tabela carregada na camada de Staging (`stg`) a partir dos arquivos CSV originais.

---

## 1. Tabela `stg.channels`
Contém as origens (canais de venda) de onde os pedidos são realizados.

| Coluna | Tipo de Dados | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `channel_id` | `INTEGER` | Identificador único do canal de vendas. | `5` |
| `channel_name` | `VARCHAR(100)` | Nome do canal de vendas (parceiro ou próprio). | `FOOD PLACE` |
| `channel_type` | `VARCHAR(100)` | Tipo de canal (`MARKETPLACE` ou `OWN CHANNEL`). | `MARKETPLACE` |

---

## 2. Tabela `stg.drivers`
Cadastro dos entregadores associados ao Delivery Center.

| Coluna | Tipo de Dados | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `driver_id` | `INTEGER` | Identificador único do entregador. | `133` |
| `driver_modal` | `VARCHAR(50)` | Veículo utilizado pelo entregador. | `MOTOBOY`, `BIKER` |
| `driver_type` | `VARCHAR(50)` | Tipo de contrato/vínculo do entregador. | `FREELANCE`, `LOGISTIC OPERATOR` |

---

## 3. Tabela `stg.hubs`
Lista dos Hubs de distribuição física onde as lojas operam.

| Coluna | Tipo de Dados | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `hub_id` | `INTEGER` | Identificador único do Hub. | `2` |
| `hub_name` | `VARCHAR(100)` | Nome do Hub físico (geralmente associado a shoppings). | `BLUE SHOPPING` |
| `hub_city` | `VARCHAR(100)` | Cidade onde o Hub está localizado. | `PORTO ALEGRE` |
| `hub_state` | `VARCHAR(2)` | Estado (UF) correspondente. | `RS`, `RJ` |
| `hub_latitude` | `DOUBLE PRECISION`| Latitude geográfica do Hub. | `-30.0474148` |
| `hub_longitude`| `DOUBLE PRECISION`| Longitude geográfica do Hub. | `-51.2135100` |

---

## 4. Tabela `stg.stores`
Cadastro de lojas parceiras integradas ao ecossistema do Delivery Center.

| Coluna | Tipo de Dados | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `store_id` | `INTEGER` | Identificador único da loja. | `3` |
| `hub_id` | `INTEGER` | Identificador do Hub ao qual a loja está vinculada. | `2` |
| `store_name` | `VARCHAR(150)` | Nome fantasia da loja. | `CUMIURI` |
| `store_segment` | `VARCHAR(100)` | Segmento comercial da loja. | `FOOD` |
| `store_plan_price`| `NUMERIC(15,2)` | Mensalidade cobrada pelo plano de uso do Delivery Center. | `0.00` |
| `store_latitude` | `DOUBLE PRECISION`| Latitude geográfica da loja. | `-30.0374149` |
| `store_longitude`| `DOUBLE PRECISION`| Longitude geográfica da loja. | `-51.2035200` |

---

## 5. Tabela `stg.deliveries`
Informações sobre as entregas físicas realizadas para os pedidos.

| Coluna | Tipo de Dados | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `delivery_id` | `INTEGER` | Identificador único da entrega. | `2174658` |
| `delivery_order_id`| `INTEGER` | Identificador do pedido associado a esta entrega. | `68413340` |
| `driver_id` | `INTEGER` | Identificador do entregador que realizou a entrega. | `8378` |
| `delivery_distance_meters`| `INTEGER` | Distância percorrida em metros desde o hub até o cliente. | `5199` |
| `delivery_status` | `VARCHAR(50)` | Status final da entrega. | `DELIVERED` |

---

## 6. Tabela `stg.payments`
Detalhamento das transações de pagamento de cada pedido. Um pedido pode ter múltiplos pagamentos.

| Coluna | Tipo de Dados | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `payment_id` | `INTEGER` | Identificador único do pagamento. | `4427917` |
| `payment_order_id`| `INTEGER` | Identificador do pedido ao qual pertence o pagamento. | `68410055` |
| `payment_amount` | `NUMERIC(15,2)` | Valor pago nesta transação. | `118.44` |
| `payment_fee` | `NUMERIC(15,2)` | Taxa cobrada pelo processador do pagamento. | `7.90` |
| `payment_method` | `VARCHAR(50)` | Método utilizado (VOUCHER, ONLINE, CREDIT, DEBIT). | `VOUCHER` |
| `payment_status` | `VARCHAR(50)` | Status do pagamento. | `PAID` |

---

## 7. Tabela `stg.orders`
Tabela principal contendo dados de todos os pedidos realizados, incluindo datas e tempos operacionais.

| Coluna | Tipo de Dados | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `order_id` | `INTEGER` | Identificador único do pedido. | `68405119` |
| `store_id` | `INTEGER` | Identificador da loja onde o pedido foi feito. | `3512` |
| `channel_id` | `INTEGER` | Identificador do canal de vendas utilizado. | `5` |
| `payment_order_id`| `INTEGER` | ID de agrupamento de pagamentos do pedido. | `68405119` |
| `delivery_order_id`| `INTEGER` | ID de agrupamento da entrega do pedido. | `68405119` |
| `order_status` | `VARCHAR(50)` | Status do pedido. | `CANCELED`, `FINISHED` |
| `order_amount` | `NUMERIC(15,2)` | Valor dos itens do pedido (líquido). | `62.70` |
| `order_delivery_fee`| `NUMERIC(15,2)`| Taxa cobrada do cliente pela entrega. | `0.00` |
| `order_delivery_cost`| `NUMERIC(15,2)`| Custo real repassado à logística para fazer a entrega. | `NULL` ou `5.50` |
| `order_created_hour`| `INTEGER` | Hora de criação do pedido (0-23). | `12` |
| `order_created_minute`| `INTEGER` | Minuto de criação do pedido (0-59). | `1` |
| `order_created_day`| `INTEGER` | Dia do mês de criação do pedido (1-31). | `1` |
| `order_created_month`| `INTEGER` | Mês de criação do pedido (1-12). | `1` |
| `order_created_year`| `INTEGER` | Ano de criação do pedido. | `2021` |
| `order_moment_created`| `VARCHAR(100)`| Timestamp completo da criação. | `1/1/2021 12:01:36 AM` |
| `order_moment_accepted`| `VARCHAR(100)`| Timestamp de quando a loja aceitou o pedido. | `1/1/2021 12:05:10 AM` |
| `order_moment_ready`| `VARCHAR(100)`| Timestamp de quando o pedido ficou pronto. | `1/1/2021 12:20:00 AM` |
| `order_moment_collected`| `VARCHAR(100)`| Timestamp de quando o entregador coletou o pedido. | `1/1/2021 12:25:00 AM` |
| `order_moment_in_expedition`| `VARCHAR(100)`| Timestamp do início do processo de expedição no Hub. | `1/1/2021 12:30:00 AM` |
| `order_moment_delivering`| `VARCHAR(100)`| Timestamp de quando o entregador iniciou o trajeto. | `1/1/2021 12:35:00 AM` |
| `order_moment_delivered`| `VARCHAR(100)`| Timestamp de quando foi entregue ao cliente. | `1/1/2021 12:45:00 AM` |
| `order_moment_finished`| `VARCHAR(100)`| Timestamp de quando o fluxo foi finalizado no sistema. | `1/1/2021 12:50:00 AM` |
| `order_metric_collected_time`| `DOUBLE PRECISION`| Tempo que levou para coletar o pedido (minutos). | `5.0` |
| `order_metric_paused_time`| `DOUBLE PRECISION`| Tempo em que o pedido ficou pausado/parado. | `0.0` |
| `order_metric_production_time`| `DOUBLE PRECISION`| Tempo total de fabricação pela loja (minutos). | `15.0` |
| `order_metric_walking_time`| `DOUBLE PRECISION`| Tempo gasto a pé na operação interna do Hub. | `1.2` |
| `order_metric_expediton_speed_time`| `DOUBLE PRECISION`| Tempo de triagem interna de expedição. | `5.0` |
| `order_metric_transit_time`| `DOUBLE PRECISION`| Tempo do trajeto de entrega até o cliente (minutos). | `10.0` |
| `order_metric_cycle_time`| `DOUBLE PRECISION`| Tempo de ciclo de vida completo do pedido. | `49.0` |
