-- Views analiticas da camada mart.
-- Cada view respeita o grao da fato de origem para evitar dupla contagem.

CREATE SCHEMA IF NOT EXISTS mart;

-- =========================================================
-- Views detalhadas: uma linha por evento de negocio
-- =========================================================

CREATE OR REPLACE VIEW mart.vw_pedidos_enriquecidos AS
SELECT
    p.sk_pedido,
    p.order_id,
    p.fk_tempo_criacao AS sk_tempo,
    t.data_completa,
    t.ano,
    t.semestre,
    t.trimestre,
    t.mes,
    t.nome_mes,
    t.dia,
    t.numero_dia_semana,
    t.nome_dia_semana,
    t.eh_fim_semana,
    EXTRACT(HOUR FROM (
        p.pedido_criado_em AT TIME ZONE 'America/Sao_Paulo'
    ))::SMALLINT AS hora_criacao,

    l.store_id,
    l.store_name,
    l.store_segment,
    l.store_plan_price,
    l.store_latitude,
    l.store_longitude,
    l.hub_id,
    l.hub_name,
    l.hub_city,
    l.hub_state,

    c.channel_id,
    c.channel_name,
    c.channel_type,
    sp.order_status,

    p.valor_pedido,
    p.taxa_entrega,
    p.custo_entrega,
    p.valor_total_pedido,
    p.margem_entrega,

    p.pedido_criado_em,
    p.pedido_aceito_em,
    p.pedido_pronto_em,
    p.pedido_coletado_em,
    p.pedido_em_expedicao_em,
    p.pedido_em_entrega_em,
    p.pedido_entregue_em,
    p.pedido_finalizado_em,

    p.tempo_coleta_minutos,
    p.tempo_pausado_minutos,
    p.tempo_producao_minutos,
    p.tempo_caminhada_minutos,
    p.tempo_expedicao_minutos,
    p.tempo_transito_minutos,
    p.tempo_ciclo_total_minutos
FROM dw.fato_pedidos AS p
INNER JOIN dw.dim_tempo AS t
    ON t.sk_tempo = p.fk_tempo_criacao
INNER JOIN dw.dim_lojas AS l
    ON l.sk_loja = p.fk_loja
INNER JOIN dw.dim_canais AS c
    ON c.sk_canal = p.fk_canal
INNER JOIN dw.dim_status_pedido AS sp
    ON sp.sk_status_pedido = p.fk_status_pedido;

COMMENT ON VIEW mart.vw_pedidos_enriquecidos IS
    'Uma linha por pedido. Fonte segura para analises comerciais e operacionais.';

CREATE OR REPLACE VIEW mart.vw_entregas_enriquecidas AS
SELECT
    e.sk_entrega,
    e.delivery_id,
    e.order_id,
    e.fk_pedido AS sk_pedido,
    e.fk_tempo_pedido AS sk_tempo,
    t.data_completa,
    t.ano,
    t.trimestre,
    t.mes,
    t.nome_mes,

    l.store_id,
    l.store_name,
    l.store_segment,
    l.hub_id,
    l.hub_name,
    l.hub_city,
    l.hub_state,

    d.driver_id,
    d.driver_modal,
    d.driver_type,
    se.delivery_status,
    sp.order_status,

    e.numero_tentativa,
    e.eh_ultima_tentativa,
    e.distancia_entrega_metros,
    p.pedido_criado_em
FROM dw.fato_entregas AS e
INNER JOIN dw.fato_pedidos AS p
    ON p.sk_pedido = e.fk_pedido
INNER JOIN dw.dim_tempo AS t
    ON t.sk_tempo = e.fk_tempo_pedido
INNER JOIN dw.dim_lojas AS l
    ON l.sk_loja = e.fk_loja
INNER JOIN dw.dim_entregadores AS d
    ON d.sk_entregador = e.fk_entregador
INNER JOIN dw.dim_status_entrega AS se
    ON se.sk_status_entrega = e.fk_status_entrega
INNER JOIN dw.dim_status_pedido AS sp
    ON sp.sk_status_pedido = p.fk_status_pedido;

COMMENT ON VIEW mart.vw_entregas_enriquecidas IS
    'Uma linha por entrega/tentativa. Nao contem valores financeiros do pedido.';

CREATE OR REPLACE VIEW mart.vw_pagamentos_enriquecidos AS
SELECT
    pg.sk_pagamento,
    pg.payment_id,
    pg.order_id,
    pg.fk_pedido AS sk_pedido,
    pg.fk_tempo_pedido AS sk_tempo,
    t.data_completa,
    t.ano,
    t.trimestre,
    t.mes,
    t.nome_mes,

    l.store_id,
    l.store_name,
    l.store_segment,
    l.hub_id,
    l.hub_name,
    l.hub_city,
    l.hub_state,

    c.channel_id,
    c.channel_name,
    c.channel_type,
    mp.payment_method,
    spg.payment_status,
    spo.order_status,

    pg.valor_pagamento,
    pg.taxa_pagamento,
    pg.valor_liquido_pagamento
FROM dw.fato_pagamentos AS pg
INNER JOIN dw.fato_pedidos AS p
    ON p.sk_pedido = pg.fk_pedido
INNER JOIN dw.dim_tempo AS t
    ON t.sk_tempo = pg.fk_tempo_pedido
INNER JOIN dw.dim_lojas AS l
    ON l.sk_loja = pg.fk_loja
INNER JOIN dw.dim_canais AS c
    ON c.sk_canal = pg.fk_canal
INNER JOIN dw.dim_metodos_pagamento AS mp
    ON mp.sk_metodo_pagamento = pg.fk_metodo_pagamento
INNER JOIN dw.dim_status_pagamento AS spg
    ON spg.sk_status_pagamento = pg.fk_status_pagamento
INNER JOIN dw.dim_status_pedido AS spo
    ON spo.sk_status_pedido = p.fk_status_pedido;

COMMENT ON VIEW mart.vw_pagamentos_enriquecidos IS
    'Uma linha por transacao de pagamento. A data representa a data do pedido.';

-- =========================================================
-- Views agregadas para consumo analitico
-- =========================================================

CREATE OR REPLACE VIEW mart.vw_kpis_vendas_diarios AS
SELECT
    p.sk_tempo,
    p.data_completa,
    p.ano,
    p.trimestre,
    p.mes,
    p.nome_mes,
    p.hub_id,
    p.hub_name,
    p.hub_city,
    p.hub_state,
    p.store_id,
    p.store_name,
    p.store_segment,
    p.channel_id,
    p.channel_name,
    p.channel_type,

    COUNT(*) AS pedidos_criados,
    COUNT(*) FILTER (
        WHERE p.order_status = 'FINISHED'
    ) AS pedidos_finalizados,
    COUNT(*) FILTER (
        WHERE p.order_status = 'CANCELED'
    ) AS pedidos_cancelados,
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE p.order_status = 'CANCELED'
        ) / NULLIF(COUNT(*), 0),
        2
    ) AS taxa_cancelamento_pct,

    SUM(p.valor_total_pedido) AS valor_pedidos_criados,
    COALESCE(
        SUM(p.valor_pedido) FILTER (
            WHERE p.order_status = 'FINISHED'
        ),
        0
    ) AS valor_produtos_finalizados,
    COALESCE(
        SUM(p.taxa_entrega) FILTER (
            WHERE p.order_status = 'FINISHED'
        ),
        0
    ) AS taxas_entrega_finalizadas,
    COALESCE(
        SUM(p.custo_entrega) FILTER (
            WHERE p.order_status = 'FINISHED'
        ),
        0
    ) AS custo_entrega_finalizado,
    COALESCE(
        SUM(p.valor_total_pedido) FILTER (
            WHERE p.order_status = 'FINISHED'
        ),
        0
    ) AS valor_transacionado_finalizado,
    COALESCE(
        SUM(p.margem_entrega) FILTER (
            WHERE p.order_status = 'FINISHED'
        ),
        0
    ) AS margem_entrega_finalizada,
    ROUND(
        AVG(p.valor_total_pedido) FILTER (
            WHERE p.order_status = 'FINISHED'
        ),
        2
    ) AS ticket_medio_finalizado,
    ROUND(
        100.0 * SUM(p.margem_entrega) FILTER (
            WHERE p.order_status = 'FINISHED'
        ) / NULLIF(
            SUM(p.taxa_entrega) FILTER (
                WHERE p.order_status = 'FINISHED'
            ),
            0
        ),
        2
    ) AS margem_sobre_taxa_entrega_pct
FROM mart.vw_pedidos_enriquecidos AS p
GROUP BY
    p.sk_tempo,
    p.data_completa,
    p.ano,
    p.trimestre,
    p.mes,
    p.nome_mes,
    p.hub_id,
    p.hub_name,
    p.hub_city,
    p.hub_state,
    p.store_id,
    p.store_name,
    p.store_segment,
    p.channel_id,
    p.channel_name,
    p.channel_type;

COMMENT ON VIEW mart.vw_kpis_vendas_diarios IS
    'KPIs comerciais por dia, loja e canal. Taxas devem ser recalculadas ao reagrupar.';

CREATE OR REPLACE VIEW mart.vw_performance_logistica AS
WITH ultimas_tentativas AS (
    SELECT *
    FROM mart.vw_entregas_enriquecidas
    WHERE eh_ultima_tentativa
)
SELECT
    e.sk_tempo,
    e.data_completa,
    e.ano,
    e.trimestre,
    e.mes,
    e.nome_mes,
    e.hub_id,
    e.hub_name,
    e.hub_city,
    e.hub_state,
    e.driver_modal,
    e.driver_type,

    COUNT(*) AS pedidos_com_entrega,
    COUNT(*) FILTER (
        WHERE e.delivery_status = 'DELIVERED'
    ) AS entregas_concluidas,
    COUNT(*) FILTER (
        WHERE e.delivery_status <> 'DELIVERED'
    ) AS entregas_nao_concluidas,
    COUNT(*) FILTER (
        WHERE e.numero_tentativa > 1
    ) AS pedidos_com_multiplas_tentativas,
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE e.delivery_status = 'DELIVERED'
        ) / NULLIF(COUNT(*), 0),
        2
    ) AS taxa_entrega_concluida_pct,
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE e.numero_tentativa > 1
        ) / NULLIF(COUNT(*), 0),
        2
    ) AS taxa_multiplas_tentativas_pct,

    COUNT(e.distancia_entrega_metros) FILTER (
        WHERE e.delivery_status = 'DELIVERED'
    ) AS amostras_distancia,
    ROUND(
        AVG(e.distancia_entrega_metros) FILTER (
            WHERE e.delivery_status = 'DELIVERED'
        ),
        2
    ) AS distancia_media_metros,
    ROUND(
        PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY e.distancia_entrega_metros
        ) FILTER (
            WHERE e.delivery_status = 'DELIVERED'
              AND e.distancia_entrega_metros IS NOT NULL
        )::NUMERIC,
        2
    ) AS distancia_p50_metros,
    ROUND(
        PERCENTILE_CONT(0.9) WITHIN GROUP (
            ORDER BY e.distancia_entrega_metros
        ) FILTER (
            WHERE e.delivery_status = 'DELIVERED'
              AND e.distancia_entrega_metros IS NOT NULL
        )::NUMERIC,
        2
    ) AS distancia_p90_metros,

    COUNT(p.tempo_ciclo_total_minutos) FILTER (
        WHERE e.order_status = 'FINISHED'
          AND p.tempo_ciclo_total_minutos >= 0
    ) AS amostras_tempo_ciclo,
    ROUND(
        AVG(p.tempo_producao_minutos) FILTER (
            WHERE e.order_status = 'FINISHED'
              AND p.tempo_producao_minutos >= 0
        )::NUMERIC,
        2
    ) AS tempo_producao_medio_minutos,
    ROUND(
        AVG(p.tempo_transito_minutos) FILTER (
            WHERE e.order_status = 'FINISHED'
              AND p.tempo_transito_minutos >= 0
        )::NUMERIC,
        2
    ) AS tempo_transito_medio_minutos,
    ROUND(
        AVG(p.tempo_ciclo_total_minutos) FILTER (
            WHERE e.order_status = 'FINISHED'
              AND p.tempo_ciclo_total_minutos >= 0
        )::NUMERIC,
        2
    ) AS tempo_ciclo_medio_minutos,
    ROUND(
        PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY p.tempo_ciclo_total_minutos
        ) FILTER (
            WHERE e.order_status = 'FINISHED'
              AND p.tempo_ciclo_total_minutos >= 0
        )::NUMERIC,
        2
    ) AS tempo_ciclo_p50_minutos,
    ROUND(
        PERCENTILE_CONT(0.9) WITHIN GROUP (
            ORDER BY p.tempo_ciclo_total_minutos
        ) FILTER (
            WHERE e.order_status = 'FINISHED'
              AND p.tempo_ciclo_total_minutos >= 0
        )::NUMERIC,
        2
    ) AS tempo_ciclo_p90_minutos
FROM ultimas_tentativas AS e
INNER JOIN dw.fato_pedidos AS p
    ON p.sk_pedido = e.sk_pedido
GROUP BY
    e.sk_tempo,
    e.data_completa,
    e.ano,
    e.trimestre,
    e.mes,
    e.nome_mes,
    e.hub_id,
    e.hub_name,
    e.hub_city,
    e.hub_state,
    e.driver_modal,
    e.driver_type;

COMMENT ON VIEW mart.vw_performance_logistica IS
    'Performance por dia, hub e perfil do entregador, usando a ultima tentativa do pedido.';

CREATE OR REPLACE VIEW mart.vw_conciliacao_pagamentos AS
WITH pagamentos_por_pedido AS (
    SELECT
        pg.fk_pedido,
        COUNT(*) AS qtd_pagamentos,
        COUNT(*) FILTER (
            WHERE sp.payment_status = 'PAID'
        ) AS qtd_pagamentos_pagos,
        COUNT(*) FILTER (
            WHERE sp.payment_status = 'CHARGEBACK'
        ) AS qtd_chargebacks,
        COUNT(*) FILTER (
            WHERE sp.payment_status = 'AWAITING'
        ) AS qtd_pagamentos_aguardando,
        COALESCE(
            SUM(pg.valor_pagamento) FILTER (
                WHERE sp.payment_status = 'PAID'
            ),
            0
        ) AS total_pago_confirmado,
        COALESCE(
            SUM(pg.valor_pagamento) FILTER (
                WHERE sp.payment_status = 'CHARGEBACK'
            ),
            0
        ) AS total_chargeback,
        COALESCE(
            SUM(pg.valor_pagamento) FILTER (
                WHERE sp.payment_status = 'AWAITING'
            ),
            0
        ) AS total_aguardando,
        COALESCE(
            SUM(pg.taxa_pagamento) FILTER (
                WHERE sp.payment_status = 'PAID'
            ),
            0
        ) AS taxas_pagamentos_pagos
    FROM dw.fato_pagamentos AS pg
    INNER JOIN dw.dim_status_pagamento AS sp
        ON sp.sk_status_pagamento = pg.fk_status_pagamento
    GROUP BY pg.fk_pedido
)
SELECT
    p.sk_pedido,
    p.order_id,
    p.sk_tempo,
    p.data_completa,
    p.ano,
    p.trimestre,
    p.mes,
    p.nome_mes,
    p.hub_id,
    p.hub_name,
    p.hub_city,
    p.hub_state,
    p.store_id,
    p.store_name,
    p.store_segment,
    p.channel_id,
    p.channel_name,
    p.channel_type,
    p.order_status,

    p.valor_total_pedido AS valor_esperado_pedido,
    COALESCE(pg.qtd_pagamentos, 0) AS qtd_pagamentos,
    COALESCE(pg.qtd_pagamentos_pagos, 0) AS qtd_pagamentos_pagos,
    COALESCE(pg.qtd_chargebacks, 0) AS qtd_chargebacks,
    COALESCE(
        pg.qtd_pagamentos_aguardando,
        0
    ) AS qtd_pagamentos_aguardando,
    COALESCE(pg.total_pago_confirmado, 0) AS total_pago_confirmado,
    COALESCE(pg.total_chargeback, 0) AS total_chargeback,
    COALESCE(pg.total_aguardando, 0) AS total_aguardando,
    COALESCE(
        pg.taxas_pagamentos_pagos,
        0
    ) AS taxas_pagamentos_pagos,
    COALESCE(pg.total_pago_confirmado, 0)
        - COALESCE(pg.taxas_pagamentos_pagos, 0)
        AS valor_pago_apos_taxas,
    COALESCE(pg.total_pago_confirmado, 0)
        - p.valor_total_pedido
        AS diferenca_conciliacao,
    CASE
        WHEN p.order_status = 'CANCELED'
            THEN 'PEDIDO_CANCELADO'
        WHEN pg.fk_pedido IS NULL
            THEN 'SEM_PAGAMENTO'
        WHEN COALESCE(pg.qtd_pagamentos_pagos, 0) = 0
            THEN 'SEM_PAGAMENTO_PAGO'
        WHEN ABS(
            pg.total_pago_confirmado - p.valor_total_pedido
        ) <= 0.01
            THEN 'CONCILIADO'
        WHEN pg.total_pago_confirmado < p.valor_total_pedido
            THEN 'PAGAMENTO_A_MENOR'
        ELSE 'PAGAMENTO_A_MAIOR'
    END AS status_conciliacao
FROM mart.vw_pedidos_enriquecidos AS p
LEFT JOIN pagamentos_por_pedido AS pg
    ON pg.fk_pedido = p.sk_pedido;

COMMENT ON VIEW mart.vw_conciliacao_pagamentos IS
    'Uma linha por pedido com pagamentos agregados antes do join, evitando fanout.';

CREATE OR REPLACE VIEW mart.vw_mix_pagamentos AS
WITH mix AS (
    SELECT
        pg.sk_tempo,
        pg.data_completa,
        pg.ano,
        pg.trimestre,
        pg.mes,
        pg.nome_mes,
        pg.hub_id,
        pg.hub_name,
        pg.hub_city,
        pg.hub_state,
        pg.channel_id,
        pg.channel_name,
        pg.channel_type,
        pg.payment_method,
        COUNT(*) AS transacoes_pagas,
        COUNT(DISTINCT pg.order_id) AS pedidos_pagos,
        SUM(pg.valor_pagamento) AS valor_pago,
        SUM(COALESCE(pg.taxa_pagamento, 0)) AS taxas_pagamento,
        SUM(pg.valor_liquido_pagamento) AS valor_liquido,
        ROUND(AVG(pg.valor_pagamento), 2) AS valor_medio_transacao
    FROM mart.vw_pagamentos_enriquecidos AS pg
    WHERE pg.payment_status = 'PAID'
    GROUP BY
        pg.sk_tempo,
        pg.data_completa,
        pg.ano,
        pg.trimestre,
        pg.mes,
        pg.nome_mes,
        pg.hub_id,
        pg.hub_name,
        pg.hub_city,
        pg.hub_state,
        pg.channel_id,
        pg.channel_name,
        pg.channel_type,
        pg.payment_method
)
SELECT
    mix.*,
    ROUND(
        100.0 * mix.valor_pago
        / NULLIF(
            SUM(mix.valor_pago) OVER (
                PARTITION BY
                    mix.sk_tempo,
                    mix.hub_id,
                    mix.channel_id
            ),
            0
        ),
        2
    ) AS participacao_valor_pct
FROM mix;

COMMENT ON VIEW mart.vw_mix_pagamentos IS
    'Mix de pagamentos PAID por dia, hub, canal e metodo.';

CREATE OR REPLACE VIEW mart.vw_performance_lojas AS
SELECT
    MAKE_DATE(p.ano, p.mes, 1) AS mes_referencia,
    p.ano,
    p.mes,
    p.nome_mes,
    p.hub_id,
    p.hub_name,
    p.hub_city,
    p.hub_state,
    p.store_id,
    p.store_name,
    p.store_segment,

    COUNT(DISTINCT p.data_completa) AS dias_com_pedidos,
    COUNT(*) AS pedidos_criados,
    COUNT(*) FILTER (
        WHERE p.order_status = 'FINISHED'
    ) AS pedidos_finalizados,
    COUNT(*) FILTER (
        WHERE p.order_status = 'CANCELED'
    ) AS pedidos_cancelados,
    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE p.order_status = 'CANCELED'
        ) / NULLIF(COUNT(*), 0),
        2
    ) AS taxa_cancelamento_pct,

    COALESCE(
        SUM(p.valor_total_pedido) FILTER (
            WHERE p.order_status = 'FINISHED'
        ),
        0
    ) AS valor_transacionado_finalizado,
    ROUND(
        AVG(p.valor_total_pedido) FILTER (
            WHERE p.order_status = 'FINISHED'
        ),
        2
    ) AS ticket_medio_finalizado,
    COALESCE(
        SUM(p.margem_entrega) FILTER (
            WHERE p.order_status = 'FINISHED'
        ),
        0
    ) AS margem_entrega_finalizada,

    COUNT(p.tempo_ciclo_total_minutos) FILTER (
        WHERE p.order_status = 'FINISHED'
          AND p.tempo_ciclo_total_minutos >= 0
    ) AS amostras_tempo_ciclo,
    ROUND(
        AVG(p.tempo_ciclo_total_minutos) FILTER (
            WHERE p.order_status = 'FINISHED'
              AND p.tempo_ciclo_total_minutos >= 0
        )::NUMERIC,
        2
    ) AS tempo_ciclo_medio_minutos,
    ROUND(
        PERCENTILE_CONT(0.5) WITHIN GROUP (
            ORDER BY p.tempo_ciclo_total_minutos
        ) FILTER (
            WHERE p.order_status = 'FINISHED'
              AND p.tempo_ciclo_total_minutos >= 0
        )::NUMERIC,
        2
    ) AS tempo_ciclo_p50_minutos,
    ROUND(
        PERCENTILE_CONT(0.9) WITHIN GROUP (
            ORDER BY p.tempo_ciclo_total_minutos
        ) FILTER (
            WHERE p.order_status = 'FINISHED'
              AND p.tempo_ciclo_total_minutos >= 0
        )::NUMERIC,
        2
    ) AS tempo_ciclo_p90_minutos
FROM mart.vw_pedidos_enriquecidos AS p
GROUP BY
    MAKE_DATE(p.ano, p.mes, 1),
    p.ano,
    p.mes,
    p.nome_mes,
    p.hub_id,
    p.hub_name,
    p.hub_city,
    p.hub_state,
    p.store_id,
    p.store_name,
    p.store_segment;

COMMENT ON VIEW mart.vw_performance_lojas IS
    'Desempenho mensal por loja, com volume, valor, margem e tempo de ciclo.';
