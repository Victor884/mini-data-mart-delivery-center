-- Baselines independentes para conferir as medidas do Power BI.
-- Execute depois de sql/10_mart_quality_checks.sql.
-- Taxas são armazenadas como frações, assim como no DAX.

SET TIME ZONE 'America/Sao_Paulo';
SET max_parallel_workers_per_gather = 0;
SET work_mem = '4MB';

CREATE TEMP TABLE powerbi_validation_results AS
WITH
pedidos AS (
    SELECT
        COUNT(*)::numeric AS pedidos_criados,
        COUNT(*) FILTER (WHERE order_status = 'FINISHED')::numeric AS pedidos_finalizados,
        COUNT(*) FILTER (WHERE order_status = 'CANCELED')::numeric AS pedidos_cancelados,
        SUM(valor_total_pedido) FILTER (WHERE order_status = 'FINISHED') AS valor_transacionado,
        SUM(taxa_entrega) FILTER (WHERE order_status = 'FINISHED') AS taxas_entrega,
        SUM(custo_entrega) FILTER (WHERE order_status = 'FINISHED') AS custo_entrega,
        SUM(margem_entrega) FILTER (WHERE order_status = 'FINISHED') AS margem_entrega
    FROM mart.vw_pedidos_enriquecidos
),
tempos AS (
    SELECT tempo_ciclo_total_minutos AS ciclo
    FROM mart.vw_pedidos_enriquecidos
    WHERE order_status = 'FINISHED'
      AND tempo_ciclo_total_minutos >= 0
),
etapas AS (
    SELECT
        AVG(tempo_producao_minutos)
            FILTER (WHERE order_status = 'FINISHED' AND tempo_producao_minutos >= 0) AS producao_media,
        AVG(tempo_transito_minutos)
            FILTER (WHERE order_status = 'FINISHED' AND tempo_transito_minutos >= 0) AS transito_medio
    FROM mart.vw_pedidos_enriquecidos
),
periodo_anterior AS (
    SELECT
        COUNT(*)::numeric AS pedidos,
        SUM(valor_total_pedido) FILTER (WHERE order_status = 'FINISHED') AS valor_transacionado
    FROM mart.vw_pedidos_enriquecidos
    WHERE data_completa BETWEEN DATE '2021-01-01' AND DATE '2021-03-31'
),
pagamento_anterior AS (
    SELECT SUM(valor_pagamento) FILTER (WHERE payment_status = 'PAID') AS valor_pago
    FROM mart.vw_pagamentos_enriquecidos
    WHERE data_completa BETWEEN DATE '2021-01-01' AND DATE '2021-03-31'
),
participacoes AS (
    SELECT
        (
            SELECT SUM(valor_total_pedido) FILTER (WHERE order_status = 'FINISHED')
            FROM mart.vw_pedidos_enriquecidos
            WHERE hub_name = 'GOLDEN SHOPPING'
        ) / NULLIF((SELECT valor_transacionado FROM pedidos), 0) AS participacao_valor_hub,
        (
            SELECT COUNT(*)::numeric
            FROM mart.vw_pedidos_enriquecidos
            WHERE hub_name = 'GOLDEN SHOPPING'
        ) / NULLIF((SELECT pedidos_criados FROM pedidos), 0) AS participacao_pedidos_hub,
        (
            SELECT COUNT(DISTINCT sk_pedido)::numeric
            FROM mart.vw_entregas_enriquecidas
            WHERE eh_ultima_tentativa AND hub_name = 'GOLDEN SHOPPING'
        ) / NULLIF((
            SELECT COUNT(DISTINCT sk_pedido)::numeric
            FROM mart.vw_entregas_enriquecidas
            WHERE eh_ultima_tentativa
        ), 0) AS participacao_entregas_hub,
        (
            SELECT SUM(valor_pagamento) FILTER (WHERE payment_status = 'PAID')
            FROM mart.vw_pagamentos_enriquecidos
            WHERE payment_method = 'ONLINE'
        ) / NULLIF((
            SELECT SUM(valor_pagamento) FILTER (WHERE payment_status = 'PAID')
            FROM mart.vw_pagamentos_enriquecidos
        ), 0) AS participacao_pago_online
),
entregas AS (
    SELECT
        COUNT(DISTINCT sk_pedido)::numeric AS pedidos_com_entrega,
        COUNT(DISTINCT sk_pedido)
            FILTER (WHERE delivery_status = 'DELIVERED')::numeric AS entregas_concluidas,
        COUNT(DISTINCT sk_pedido)
            FILTER (WHERE numero_tentativa > 1)::numeric AS multiplas_tentativas,
        AVG(distancia_entrega_metros)
            FILTER (WHERE delivery_status = 'DELIVERED') / 1000.0 AS distancia_media_km
    FROM mart.vw_entregas_enriquecidas
    WHERE eh_ultima_tentativa
),
pagamentos AS (
    SELECT
        COUNT(*) FILTER (WHERE payment_status = 'PAID')::numeric AS transacoes_pagas,
        SUM(valor_pagamento) FILTER (WHERE payment_status = 'PAID') AS valor_pago,
        SUM(taxa_pagamento) FILTER (WHERE payment_status = 'PAID') AS taxas_pagamento,
        SUM(valor_liquido_pagamento) FILTER (WHERE payment_status = 'PAID') AS valor_liquido_pago,
        COUNT(*) FILTER (WHERE payment_status = 'CHARGEBACK')::numeric AS chargebacks,
        SUM(valor_pagamento) FILTER (WHERE payment_status = 'CHARGEBACK') AS valor_chargeback
    FROM mart.vw_pagamentos_enriquecidos
),
conciliacao AS (
    SELECT
        COUNT(DISTINCT sk_pedido)
            FILTER (WHERE order_status = 'FINISHED')::numeric AS pedidos_finalizados,
        COUNT(DISTINCT sk_pedido)
            FILTER (
                WHERE order_status = 'FINISHED'
                  AND status_conciliacao = 'CONCILIADO'
            )::numeric AS pedidos_conciliados,
        SUM(ABS(diferenca_conciliacao))
            FILTER (WHERE order_status = 'FINISHED') AS diferenca_absoluta,
        COUNT(DISTINCT sk_pedido)
            FILTER (
                WHERE order_status = 'FINISHED'
                  AND status_conciliacao IN ('SEM_PAGAMENTO', 'SEM_PAGAMENTO_PAGO')
            )::numeric AS pedidos_sem_pagamento_pago
    FROM mart.vw_conciliacao_pagamentos
),
observado AS (
    SELECT *
    FROM (
        VALUES
            ('Pedidos Criados', (SELECT pedidos_criados FROM pedidos)),
            ('Pedidos Finalizados', (SELECT pedidos_finalizados FROM pedidos)),
            ('Pedidos Cancelados', (SELECT pedidos_cancelados FROM pedidos)),
            ('Taxa Cancelamento', (SELECT pedidos_cancelados / NULLIF(pedidos_criados, 0) FROM pedidos)),
            ('Valor Transacionado', (SELECT valor_transacionado FROM pedidos)),
            ('Ticket Médio', (SELECT valor_transacionado / NULLIF(pedidos_finalizados, 0) FROM pedidos)),
            ('Taxas de Entrega', (SELECT taxas_entrega FROM pedidos)),
            ('Custo de Entrega', (SELECT custo_entrega FROM pedidos)),
            ('Margem Entrega', (SELECT margem_entrega FROM pedidos)),
            ('Tempo Ciclo P50', (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ciclo) FROM tempos)),
            ('Tempo Ciclo P90', (SELECT PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY ciclo) FROM tempos)),
            ('Tempo Produção Médio', (SELECT producao_media FROM etapas)),
            ('Tempo Trânsito Médio', (SELECT transito_medio FROM etapas)),
            ('Valor Transacionado Mês Anterior', (SELECT valor_transacionado FROM periodo_anterior)),
            ('Variação Absoluta Valor Mensal', (SELECT valor_transacionado FROM pedidos) - (SELECT valor_transacionado FROM periodo_anterior)),
            ('Variação Valor Mensal', ((SELECT valor_transacionado FROM pedidos) - (SELECT valor_transacionado FROM periodo_anterior)) / NULLIF((SELECT valor_transacionado FROM periodo_anterior), 0)),
            ('Pedidos Mês Anterior', (SELECT pedidos FROM periodo_anterior)),
            ('Variação Absoluta Pedidos Mensal', (SELECT pedidos_criados FROM pedidos) - (SELECT pedidos FROM periodo_anterior)),
            ('Variação Pedidos Mensal', ((SELECT pedidos_criados FROM pedidos) - (SELECT pedidos FROM periodo_anterior)) / NULLIF((SELECT pedidos FROM periodo_anterior), 0)),
            ('Pedidos com Entrega', (SELECT pedidos_com_entrega FROM entregas)),
            ('Entregas Concluídas', (SELECT entregas_concluidas FROM entregas)),
            ('Taxa Entrega Concluída', (SELECT entregas_concluidas / NULLIF(pedidos_com_entrega, 0) FROM entregas)),
            ('Pedidos Múltiplas Tentativas', (SELECT multiplas_tentativas FROM entregas)),
            ('Taxa Múltiplas Tentativas', (SELECT multiplas_tentativas / NULLIF(pedidos_com_entrega, 0) FROM entregas)),
            ('Distância Média Entrega (km)', (SELECT distancia_media_km FROM entregas)),
            ('Transações Pagas', (SELECT transacoes_pagas FROM pagamentos)),
            ('Valor Pago', (SELECT valor_pago FROM pagamentos)),
            ('Taxas Pagamento', (SELECT taxas_pagamento FROM pagamentos)),
            ('Valor Líquido Pago', (SELECT valor_liquido_pago FROM pagamentos)),
            ('Chargebacks', (SELECT chargebacks FROM pagamentos)),
            ('Valor Chargeback', (SELECT valor_chargeback FROM pagamentos)),
            ('Valor Pago Mês Anterior', (SELECT valor_pago FROM pagamento_anterior)),
            ('Variação Absoluta Valor Pago Mensal', (SELECT valor_pago FROM pagamentos) - (SELECT valor_pago FROM pagamento_anterior)),
            ('Variação Valor Pago Mensal', ((SELECT valor_pago FROM pagamentos) - (SELECT valor_pago FROM pagamento_anterior)) / NULLIF((SELECT valor_pago FROM pagamento_anterior), 0)),
            ('Pedidos Finalizados Conciliação', (SELECT pedidos_finalizados FROM conciliacao)),
            ('Pedidos Conciliados', (SELECT pedidos_conciliados FROM conciliacao)),
            ('Taxa Conciliação', (SELECT pedidos_conciliados / NULLIF(pedidos_finalizados, 0) FROM conciliacao)),
            ('Diferença Absoluta Conciliação', (SELECT diferenca_absoluta FROM conciliacao)),
            ('Pedidos sem Pagamento Pago', (SELECT pedidos_sem_pagamento_pago FROM conciliacao)),
            ('Participação Valor Transacionado', (SELECT participacao_valor_hub FROM participacoes)),
            ('Participação Pedidos', (SELECT participacao_pedidos_hub FROM participacoes)),
            ('Participação Pedidos com Entrega', (SELECT participacao_entregas_hub FROM participacoes)),
            ('Participação Valor Pago', (SELECT participacao_pago_online FROM participacoes))
    ) AS v(medida, valor)
),
referencia AS (
    SELECT *
    FROM (
        VALUES
            ('Pedidos Criados', 368999.0, 0.0),
            ('Pedidos Finalizados', 352020.0, 0.0),
            ('Pedidos Cancelados', 16979.0, 0.0),
            ('Taxa Cancelamento', 0.0460136748, 0.0000001),
            ('Valor Transacionado', 37481358.97, 0.01),
            ('Ticket Médio', 106.4750837, 0.0001),
            ('Taxas de Entrega', 2188128.69, 0.01),
            ('Custo de Entrega', 2623034.32, 0.01),
            ('Margem Entrega', -434905.63, 0.01),
            ('Tempo Ciclo P50', 42.18, 0.001),
            ('Tempo Ciclo P90', 83.17, 0.001),
            ('Tempo Produção Médio', 61.7122888708, 0.000001),
            ('Tempo Trânsito Médio', 46.5463322280, 0.000001),
            ('Valor Transacionado Mês Anterior', 26007185.14, 0.01),
            ('Variação Absoluta Valor Mensal', 11474173.83, 0.01),
            ('Variação Valor Mensal', 0.4411924539, 0.0000001),
            ('Pedidos Mês Anterior', 260165.0, 0.0),
            ('Variação Absoluta Pedidos Mensal', 108834.0, 0.0),
            ('Variação Pedidos Mensal', 0.4183268310, 0.0000001),
            ('Pedidos com Entrega', 358654.0, 0.0),
            ('Entregas Concluídas', 351310.0, 0.0),
            ('Taxa Entrega Concluída', 0.979523, 0.000001),
            ('Pedidos Múltiplas Tentativas', 18724.0, 0.0),
            ('Taxa Múltiplas Tentativas', 0.052206, 0.000001),
            ('Distância Média Entrega (km)', 10.1125, 0.0001),
            ('Transações Pagas', 400381.0, 0.0),
            ('Valor Pago', 37304232.78, 0.01),
            ('Taxas Pagamento', 753363.85, 0.01),
            ('Valor Líquido Pago', 36550868.93, 0.01),
            ('Chargebacks', 438.0, 0.0),
            ('Valor Chargeback', 7160.50, 0.01),
            ('Valor Pago Mês Anterior', 25891039.08, 0.01),
            ('Variação Absoluta Valor Pago Mensal', 11413193.70, 0.01),
            ('Variação Valor Pago Mensal', 0.4408163637, 0.0000001),
            ('Pedidos Finalizados Conciliação', 352020.0, 0.0),
            ('Pedidos Conciliados', 340056.0, 0.0),
            ('Taxa Conciliação', 0.9660132947, 0.0000001),
            ('Diferença Absoluta Conciliação', 465576.41, 0.01),
            ('Pedidos sem Pagamento Pago', 2133.0, 0.0),
            ('Participação Valor Transacionado', 0.1058636378, 0.0000001),
            ('Participação Pedidos', 0.1215938255, 0.0000001),
            ('Participação Pedidos com Entrega', 0.1217635939, 0.0000001),
            ('Participação Valor Pago', 0.8539071399, 0.0000001)
    ) AS v(medida, esperado, tolerancia)
)
SELECT
    o.medida,
    ROUND(o.valor::numeric, 6) AS observado,
    r.esperado,
    ROUND(ABS(o.valor - r.esperado)::numeric, 6) AS desvio,
    r.tolerancia,
    CASE
        WHEN ABS(o.valor - r.esperado) <= r.tolerancia THEN 'OK'
        ELSE 'DIVERGENTE'
    END AS resultado
FROM observado AS o
INNER JOIN referencia AS r USING (medida)
ORDER BY o.medida;

TABLE powerbi_validation_results ORDER BY medida;

-- Toda medida deve retornar OK. Este bloco interrompe a execução se houver desvio.
DO $$
DECLARE
    qtd_pedidos BIGINT;
    qtd_conciliacao BIGINT;
BEGIN
    SELECT COUNT(*) INTO qtd_pedidos FROM mart.vw_pedidos_enriquecidos;
    SELECT COUNT(*) INTO qtd_conciliacao FROM mart.vw_conciliacao_pagamentos;

    IF qtd_pedidos <> 368999 OR qtd_conciliacao <> qtd_pedidos THEN
        RAISE EXCEPTION
            'Baseline inválido: pedidos=%, conciliação=%',
            qtd_pedidos,
            qtd_conciliacao;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM powerbi_validation_results
        WHERE resultado <> 'OK'
    ) THEN
        RAISE EXCEPTION 'Há baselines Power BI divergentes';
    END IF;
END $$;
