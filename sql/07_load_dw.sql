-- Carga full-refresh da camada DW.
-- As dimensoes usam SCD tipo 1 (UPSERT) e preservam suas surrogate keys.
-- As fatos sao recarregadas integralmente para refletir o snapshot da staging.

BEGIN;

SET LOCAL TIME ZONE 'America/Sao_Paulo';
SET LOCAL statement_timeout = '15min';

-- =========================================================
-- Dimensoes
-- =========================================================

INSERT INTO dw.dim_lojas (
    store_id,
    store_name,
    store_segment,
    store_plan_price,
    store_latitude,
    store_longitude,
    hub_id,
    hub_name,
    hub_city,
    hub_state
)
SELECT
    s.store_id,
    NULLIF(BTRIM(s.store_name), ''),
    NULLIF(BTRIM(s.store_segment), ''),
    s.store_plan_price,
    s.store_latitude,
    s.store_longitude,
    h.hub_id,
    NULLIF(BTRIM(h.hub_name), ''),
    NULLIF(BTRIM(h.hub_city), ''),
    NULLIF(BTRIM(h.hub_state), '')
FROM stg.stores AS s
INNER JOIN stg.hubs AS h
    ON h.hub_id = s.hub_id
WHERE s.store_id IS NOT NULL
ON CONFLICT (store_id) DO UPDATE
SET
    store_name = EXCLUDED.store_name,
    store_segment = EXCLUDED.store_segment,
    store_plan_price = EXCLUDED.store_plan_price,
    store_latitude = EXCLUDED.store_latitude,
    store_longitude = EXCLUDED.store_longitude,
    hub_id = EXCLUDED.hub_id,
    hub_name = EXCLUDED.hub_name,
    hub_city = EXCLUDED.hub_city,
    hub_state = EXCLUDED.hub_state,
    carregado_em = CURRENT_TIMESTAMP;

-- Membro especial para entregas sem driver_id no arquivo de origem.
INSERT INTO dw.dim_entregadores (
    driver_id,
    driver_modal,
    driver_type
)
VALUES (-1, 'NAO INFORMADO', 'NAO INFORMADO')
ON CONFLICT (driver_id) DO UPDATE
SET
    driver_modal = EXCLUDED.driver_modal,
    driver_type = EXCLUDED.driver_type,
    carregado_em = CURRENT_TIMESTAMP;

INSERT INTO dw.dim_entregadores (
    driver_id,
    driver_modal,
    driver_type
)
SELECT
    driver_id,
    NULLIF(BTRIM(driver_modal), ''),
    NULLIF(BTRIM(driver_type), '')
FROM stg.drivers
WHERE driver_id IS NOT NULL
ON CONFLICT (driver_id) DO UPDATE
SET
    driver_modal = EXCLUDED.driver_modal,
    driver_type = EXCLUDED.driver_type,
    carregado_em = CURRENT_TIMESTAMP;

INSERT INTO dw.dim_canais (
    channel_id,
    channel_name,
    channel_type
)
SELECT
    channel_id,
    NULLIF(BTRIM(channel_name), ''),
    NULLIF(BTRIM(channel_type), '')
FROM stg.channels
WHERE channel_id IS NOT NULL
ON CONFLICT (channel_id) DO UPDATE
SET
    channel_name = EXCLUDED.channel_name,
    channel_type = EXCLUDED.channel_type,
    carregado_em = CURRENT_TIMESTAMP;

INSERT INTO dw.dim_status_pedido (order_status)
SELECT DISTINCT BTRIM(order_status)
FROM stg.orders
WHERE NULLIF(BTRIM(order_status), '') IS NOT NULL
ON CONFLICT (order_status) DO UPDATE
SET carregado_em = CURRENT_TIMESTAMP;

INSERT INTO dw.dim_status_entrega (delivery_status)
SELECT DISTINCT BTRIM(delivery_status)
FROM stg.deliveries
WHERE NULLIF(BTRIM(delivery_status), '') IS NOT NULL
ON CONFLICT (delivery_status) DO UPDATE
SET carregado_em = CURRENT_TIMESTAMP;

INSERT INTO dw.dim_metodos_pagamento (payment_method)
SELECT DISTINCT BTRIM(payment_method)
FROM stg.payments
WHERE NULLIF(BTRIM(payment_method), '') IS NOT NULL
ON CONFLICT (payment_method) DO UPDATE
SET carregado_em = CURRENT_TIMESTAMP;

INSERT INTO dw.dim_status_pagamento (payment_status)
SELECT DISTINCT BTRIM(payment_status)
FROM stg.payments
WHERE NULLIF(BTRIM(payment_status), '') IS NOT NULL
ON CONFLICT (payment_status) DO UPDATE
SET carregado_em = CURRENT_TIMESTAMP;

WITH limites AS (
    SELECT
        MIN(
            TO_TIMESTAMP(
                NULLIF(BTRIM(order_moment_created), ''),
                'MM/DD/YYYY HH12:MI:SS AM'
            )::DATE
        ) AS data_inicial,
        MAX(
            TO_TIMESTAMP(
                NULLIF(BTRIM(order_moment_created), ''),
                'MM/DD/YYYY HH12:MI:SS AM'
            )::DATE
        ) AS data_final
    FROM stg.orders
),
datas AS (
    SELECT
        GENERATE_SERIES(
            data_inicial,
            data_final,
            INTERVAL '1 day'
        )::DATE AS data_completa
    FROM limites
)
INSERT INTO dw.dim_tempo (
    sk_tempo,
    data_completa,
    ano,
    semestre,
    trimestre,
    mes,
    nome_mes,
    dia,
    numero_dia_semana,
    nome_dia_semana,
    eh_fim_semana
)
SELECT
    TO_CHAR(data_completa, 'YYYYMMDD')::INTEGER,
    data_completa,
    EXTRACT(YEAR FROM data_completa)::SMALLINT,
    CASE
        WHEN EXTRACT(MONTH FROM data_completa) <= 6 THEN 1
        ELSE 2
    END::SMALLINT,
    EXTRACT(QUARTER FROM data_completa)::SMALLINT,
    EXTRACT(MONTH FROM data_completa)::SMALLINT,
    CASE EXTRACT(MONTH FROM data_completa)::INTEGER
        WHEN 1 THEN 'Janeiro'
        WHEN 2 THEN 'Fevereiro'
        WHEN 3 THEN 'Marco'
        WHEN 4 THEN 'Abril'
        WHEN 5 THEN 'Maio'
        WHEN 6 THEN 'Junho'
        WHEN 7 THEN 'Julho'
        WHEN 8 THEN 'Agosto'
        WHEN 9 THEN 'Setembro'
        WHEN 10 THEN 'Outubro'
        WHEN 11 THEN 'Novembro'
        WHEN 12 THEN 'Dezembro'
    END,
    EXTRACT(DAY FROM data_completa)::SMALLINT,
    EXTRACT(ISODOW FROM data_completa)::SMALLINT,
    CASE EXTRACT(ISODOW FROM data_completa)::INTEGER
        WHEN 1 THEN 'Segunda-feira'
        WHEN 2 THEN 'Terca-feira'
        WHEN 3 THEN 'Quarta-feira'
        WHEN 4 THEN 'Quinta-feira'
        WHEN 5 THEN 'Sexta-feira'
        WHEN 6 THEN 'Sabado'
        WHEN 7 THEN 'Domingo'
    END,
    EXTRACT(ISODOW FROM data_completa) IN (6, 7)
FROM datas
ON CONFLICT (sk_tempo) DO UPDATE
SET
    data_completa = EXCLUDED.data_completa,
    ano = EXCLUDED.ano,
    semestre = EXCLUDED.semestre,
    trimestre = EXCLUDED.trimestre,
    mes = EXCLUDED.mes,
    nome_mes = EXCLUDED.nome_mes,
    dia = EXCLUDED.dia,
    numero_dia_semana = EXCLUDED.numero_dia_semana,
    nome_dia_semana = EXCLUDED.nome_dia_semana,
    eh_fim_semana = EXCLUDED.eh_fim_semana,
    carregado_em = CURRENT_TIMESTAMP;

-- =========================================================
-- Fatos
-- =========================================================

TRUNCATE TABLE
    dw.fato_pagamentos,
    dw.fato_entregas,
    dw.fato_pedidos
RESTART IDENTITY;

WITH pedidos_parseados AS (
    SELECT
        o.*,
        TO_TIMESTAMP(
            NULLIF(BTRIM(o.order_moment_created), ''),
            'MM/DD/YYYY HH12:MI:SS AM'
        ) AS pedido_criado_em,
        TO_TIMESTAMP(
            NULLIF(BTRIM(o.order_moment_accepted), ''),
            'MM/DD/YYYY HH12:MI:SS AM'
        ) AS pedido_aceito_em,
        TO_TIMESTAMP(
            NULLIF(BTRIM(o.order_moment_ready), ''),
            'MM/DD/YYYY HH12:MI:SS AM'
        ) AS pedido_pronto_em,
        TO_TIMESTAMP(
            NULLIF(BTRIM(o.order_moment_collected), ''),
            'MM/DD/YYYY HH12:MI:SS AM'
        ) AS pedido_coletado_em,
        TO_TIMESTAMP(
            NULLIF(BTRIM(o.order_moment_in_expedition), ''),
            'MM/DD/YYYY HH12:MI:SS AM'
        ) AS pedido_em_expedicao_em,
        TO_TIMESTAMP(
            NULLIF(BTRIM(o.order_moment_delivering), ''),
            'MM/DD/YYYY HH12:MI:SS AM'
        ) AS pedido_em_entrega_em,
        TO_TIMESTAMP(
            NULLIF(BTRIM(o.order_moment_delivered), ''),
            'MM/DD/YYYY HH12:MI:SS AM'
        ) AS pedido_entregue_em,
        TO_TIMESTAMP(
            NULLIF(BTRIM(o.order_moment_finished), ''),
            'MM/DD/YYYY HH12:MI:SS AM'
        ) AS pedido_finalizado_em
    FROM stg.orders AS o
),
pedidos_normalizados AS (
    SELECT
        p.*,
        p.pedido_criado_em::DATE AS data_pedido
    FROM pedidos_parseados AS p
)
INSERT INTO dw.fato_pedidos (
    order_id,
    fk_loja,
    fk_canal,
    fk_status_pedido,
    fk_tempo_criacao,
    valor_pedido,
    taxa_entrega,
    custo_entrega,
    pedido_criado_em,
    pedido_aceito_em,
    pedido_pronto_em,
    pedido_coletado_em,
    pedido_em_expedicao_em,
    pedido_em_entrega_em,
    pedido_entregue_em,
    pedido_finalizado_em,
    tempo_coleta_minutos,
    tempo_pausado_minutos,
    tempo_producao_minutos,
    tempo_caminhada_minutos,
    tempo_expedicao_minutos,
    tempo_transito_minutos,
    tempo_ciclo_total_minutos
)
SELECT
    o.order_id,
    l.sk_loja,
    c.sk_canal,
    sp.sk_status_pedido,
    t.sk_tempo,
    o.order_amount,
    o.order_delivery_fee,
    o.order_delivery_cost,
    o.pedido_criado_em,
    o.pedido_aceito_em,
    o.pedido_pronto_em,
    o.pedido_coletado_em,
    o.pedido_em_expedicao_em,
    o.pedido_em_entrega_em,
    o.pedido_entregue_em,
    o.pedido_finalizado_em,
    o.order_metric_collected_time,
    o.order_metric_paused_time,
    o.order_metric_production_time,
    o.order_metric_walking_time,
    o.order_metric_expediton_speed_time,
    o.order_metric_transit_time,
    o.order_metric_cycle_time
FROM pedidos_normalizados AS o
INNER JOIN dw.dim_lojas AS l
    ON l.store_id = o.store_id
INNER JOIN dw.dim_canais AS c
    ON c.channel_id = o.channel_id
INNER JOIN dw.dim_status_pedido AS sp
    ON sp.order_status = BTRIM(o.order_status)
INNER JOIN dw.dim_tempo AS t
    ON t.data_completa = o.data_pedido;

WITH entregas_ordenadas AS (
    SELECT
        d.*,
        -- A origem nao possui timestamp da tentativa. delivery_id e usado
        -- como criterio deterministico para ordenar as entregas do pedido.
        ROW_NUMBER() OVER (
            PARTITION BY d.delivery_order_id
            ORDER BY d.delivery_id
        )::INTEGER AS numero_tentativa,
        ROW_NUMBER() OVER (
            PARTITION BY d.delivery_order_id
            ORDER BY d.delivery_id DESC
        ) = 1 AS eh_ultima_tentativa
    FROM stg.deliveries AS d
)
INSERT INTO dw.fato_entregas (
    delivery_id,
    order_id,
    fk_pedido,
    fk_tempo_pedido,
    fk_loja,
    fk_entregador,
    fk_status_entrega,
    numero_tentativa,
    eh_ultima_tentativa,
    distancia_entrega_metros
)
SELECT
    d.delivery_id,
    d.delivery_order_id,
    p.sk_pedido,
    p.fk_tempo_criacao,
    p.fk_loja,
    e.sk_entregador,
    se.sk_status_entrega,
    d.numero_tentativa,
    d.eh_ultima_tentativa,
    d.delivery_distance_meters
FROM entregas_ordenadas AS d
INNER JOIN dw.fato_pedidos AS p
    ON p.order_id = d.delivery_order_id
INNER JOIN dw.dim_entregadores AS e
    ON e.driver_id = COALESCE(d.driver_id, -1)
INNER JOIN dw.dim_status_entrega AS se
    ON se.delivery_status = BTRIM(d.delivery_status);

INSERT INTO dw.fato_pagamentos (
    payment_id,
    order_id,
    fk_pedido,
    fk_tempo_pedido,
    fk_loja,
    fk_canal,
    fk_metodo_pagamento,
    fk_status_pagamento,
    valor_pagamento,
    taxa_pagamento
)
SELECT
    pg.payment_id,
    pg.payment_order_id,
    p.sk_pedido,
    p.fk_tempo_criacao,
    p.fk_loja,
    p.fk_canal,
    mp.sk_metodo_pagamento,
    sp.sk_status_pagamento,
    pg.payment_amount,
    pg.payment_fee
FROM stg.payments AS pg
INNER JOIN dw.fato_pedidos AS p
    ON p.order_id = pg.payment_order_id
INNER JOIN dw.dim_metodos_pagamento AS mp
    ON mp.payment_method = BTRIM(pg.payment_method)
INNER JOIN dw.dim_status_pagamento AS sp
    ON sp.payment_status = BTRIM(pg.payment_status);

ANALYZE dw.dim_lojas;
ANALYZE dw.dim_entregadores;
ANALYZE dw.dim_canais;
ANALYZE dw.dim_status_pedido;
ANALYZE dw.dim_status_entrega;
ANALYZE dw.dim_metodos_pagamento;
ANALYZE dw.dim_status_pagamento;
ANALYZE dw.dim_tempo;
ANALYZE dw.fato_pedidos;
ANALYZE dw.fato_entregas;
ANALYZE dw.fato_pagamentos;

COMMIT;
