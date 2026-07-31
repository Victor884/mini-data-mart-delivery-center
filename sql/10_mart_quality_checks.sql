-- Validacoes da camada mart.
-- Interrompe a execucao se alguma view perder ou multiplicar registros.

SET TIME ZONE 'America/Sao_Paulo';
SET max_parallel_workers_per_gather = 0;

DO $$
DECLARE
    qtd_dw BIGINT;
    qtd_mart BIGINT;
    qtd_erros BIGINT;
    valor_dw NUMERIC;
    valor_mart NUMERIC;
BEGIN
    SELECT COUNT(*) INTO qtd_dw FROM dw.fato_pedidos;
    SELECT COUNT(*) INTO qtd_mart FROM mart.vw_pedidos_enriquecidos;
    IF qtd_dw <> qtd_mart THEN
        RAISE EXCEPTION
            'Pedidos multiplicados ou perdidos no mart: dw=%, mart=%',
            qtd_dw,
            qtd_mart;
    END IF;

    SELECT COUNT(*) INTO qtd_dw FROM dw.fato_entregas;
    SELECT COUNT(*) INTO qtd_mart FROM mart.vw_entregas_enriquecidas;
    IF qtd_dw <> qtd_mart THEN
        RAISE EXCEPTION
            'Entregas multiplicadas ou perdidas no mart: dw=%, mart=%',
            qtd_dw,
            qtd_mart;
    END IF;

    SELECT COUNT(*) INTO qtd_dw FROM dw.fato_pagamentos;
    SELECT COUNT(*) INTO qtd_mart FROM mart.vw_pagamentos_enriquecidos;
    IF qtd_dw <> qtd_mart THEN
        RAISE EXCEPTION
            'Pagamentos multiplicados ou perdidos no mart: dw=%, mart=%',
            qtd_dw,
            qtd_mart;
    END IF;

    SELECT COUNT(*) INTO qtd_dw FROM dw.fato_pedidos;
    SELECT COUNT(*) INTO qtd_mart
    FROM mart.vw_conciliacao_pagamentos;
    IF qtd_dw <> qtd_mart THEN
        RAISE EXCEPTION
            'Conciliacao nao possui uma linha por pedido: dw=%, mart=%',
            qtd_dw,
            qtd_mart;
    END IF;

    SELECT COALESCE(SUM(p.valor_total_pedido), 0)
    INTO valor_dw
    FROM dw.fato_pedidos AS p
    INNER JOIN dw.dim_status_pedido AS s
        ON s.sk_status_pedido = p.fk_status_pedido
    WHERE s.order_status = 'FINISHED';

    SELECT COALESCE(SUM(valor_transacionado_finalizado), 0)
    INTO valor_mart
    FROM mart.vw_kpis_vendas_diarios;

    IF ABS(valor_dw - valor_mart) > 0.01 THEN
        RAISE EXCEPTION
            'Valor finalizado divergente: dw=%, mart=%',
            valor_dw,
            valor_mart;
    END IF;

    SELECT COALESCE(SUM(pg.valor_pagamento), 0)
    INTO valor_dw
    FROM dw.fato_pagamentos AS pg
    INNER JOIN dw.dim_status_pagamento AS s
        ON s.sk_status_pagamento = pg.fk_status_pagamento
    WHERE s.payment_status = 'PAID';

    SELECT COALESCE(SUM(valor_pago), 0)
    INTO valor_mart
    FROM mart.vw_mix_pagamentos;

    IF ABS(valor_dw - valor_mart) > 0.01 THEN
        RAISE EXCEPTION
            'Valor de pagamentos PAID divergente: dw=%, mart=%',
            valor_dw,
            valor_mart;
    END IF;

    SELECT COUNT(*)
    INTO qtd_dw
    FROM dw.fato_entregas
    WHERE eh_ultima_tentativa;

    SELECT COALESCE(SUM(pedidos_com_entrega), 0)
    INTO qtd_mart
    FROM mart.vw_performance_logistica;

    IF qtd_dw <> qtd_mart THEN
        RAISE EXCEPTION
            'Performance logistica multiplicou pedidos: dw=%, mart=%',
            qtd_dw,
            qtd_mart;
    END IF;

    SELECT COUNT(*) INTO qtd_dw FROM dw.fato_pedidos;
    SELECT COALESCE(SUM(pedidos_criados), 0)
    INTO qtd_mart
    FROM mart.vw_performance_lojas;

    IF qtd_dw <> qtd_mart THEN
        RAISE EXCEPTION
            'Performance de lojas multiplicou pedidos: dw=%, mart=%',
            qtd_dw,
            qtd_mart;
    END IF;

    SELECT COUNT(*)
    INTO qtd_erros
    FROM mart.vw_kpis_vendas_diarios
    WHERE taxa_cancelamento_pct NOT BETWEEN 0 AND 100;

    IF qtd_erros > 0 THEN
        RAISE EXCEPTION
            'Existem % linhas com taxa de cancelamento invalida',
            qtd_erros;
    END IF;

    SELECT COUNT(*)
    INTO qtd_erros
    FROM mart.vw_performance_logistica
    WHERE taxa_entrega_concluida_pct NOT BETWEEN 0 AND 100
       OR taxa_multiplas_tentativas_pct NOT BETWEEN 0 AND 100;

    IF qtd_erros > 0 THEN
        RAISE EXCEPTION
            'Existem % linhas com taxa logistica invalida',
            qtd_erros;
    END IF;

    SELECT COUNT(*)
    INTO qtd_erros
    FROM mart.vw_mix_pagamentos
    WHERE participacao_valor_pct NOT BETWEEN 0 AND 100;

    IF qtd_erros > 0 THEN
        RAISE EXCEPTION
            'Existem % linhas com participacao de pagamento invalida',
            qtd_erros;
    END IF;
END $$;

-- Cardinalidade das views.
SELECT
    'vw_pedidos_enriquecidos' AS view_name,
    COUNT(*) AS quantidade
FROM mart.vw_pedidos_enriquecidos

UNION ALL

SELECT
    'vw_entregas_enriquecidas',
    COUNT(*)
FROM mart.vw_entregas_enriquecidas

UNION ALL

SELECT
    'vw_pagamentos_enriquecidos',
    COUNT(*)
FROM mart.vw_pagamentos_enriquecidos

UNION ALL

SELECT
    'vw_conciliacao_pagamentos',
    COUNT(*)
FROM mart.vw_conciliacao_pagamentos

UNION ALL

SELECT
    'vw_kpis_vendas_diarios',
    COUNT(*)
FROM mart.vw_kpis_vendas_diarios

UNION ALL

SELECT
    'vw_performance_logistica',
    COUNT(*)
FROM mart.vw_performance_logistica

UNION ALL

SELECT
    'vw_mix_pagamentos',
    COUNT(*)
FROM mart.vw_mix_pagamentos

UNION ALL

SELECT
    'vw_performance_lojas',
    COUNT(*)
FROM mart.vw_performance_lojas
ORDER BY view_name;

-- Baseline dos KPIs primarios para todo o periodo.
SELECT
    SUM(pedidos_criados) AS pedidos_criados,
    SUM(pedidos_finalizados) AS pedidos_finalizados,
    SUM(pedidos_cancelados) AS pedidos_cancelados,
    ROUND(
        100.0 * SUM(pedidos_cancelados)
        / NULLIF(SUM(pedidos_criados), 0),
        2
    ) AS taxa_cancelamento_pct,
    SUM(
        valor_transacionado_finalizado
    ) AS valor_transacionado_finalizado,
    ROUND(
        SUM(valor_transacionado_finalizado)
        / NULLIF(SUM(pedidos_finalizados), 0),
        2
    ) AS ticket_medio_finalizado,
    SUM(
        margem_entrega_finalizada
    ) AS margem_entrega_finalizada
FROM mart.vw_kpis_vendas_diarios;

-- Distribuicao da conciliacao financeira.
SELECT
    status_conciliacao,
    COUNT(*) AS pedidos,
    SUM(valor_esperado_pedido) AS valor_esperado,
    SUM(total_pago_confirmado) AS valor_pago,
    SUM(diferenca_conciliacao) AS diferenca
FROM mart.vw_conciliacao_pagamentos
GROUP BY status_conciliacao
ORDER BY pedidos DESC;

-- Mix de pagamentos consolidado.
SELECT
    payment_method,
    SUM(transacoes_pagas) AS transacoes_pagas,
    SUM(pedidos_pagos) AS pedidos_pagos_nos_grupos,
    SUM(valor_pago) AS valor_pago,
    SUM(taxas_pagamento) AS taxas_pagamento
FROM mart.vw_mix_pagamentos
GROUP BY payment_method
ORDER BY valor_pago DESC;

-- Confirma unicidade nas views detalhadas.
SELECT
    'vw_pedidos_enriquecidos.order_id' AS chave,
    COUNT(*) AS duplicidades
FROM (
    SELECT order_id
    FROM mart.vw_pedidos_enriquecidos
    GROUP BY order_id
    HAVING COUNT(*) > 1
) AS duplicados

UNION ALL

SELECT
    'vw_entregas_enriquecidas.delivery_id',
    COUNT(*)
FROM (
    SELECT delivery_id
    FROM mart.vw_entregas_enriquecidas
    GROUP BY delivery_id
    HAVING COUNT(*) > 1
) AS duplicados

UNION ALL

SELECT
    'vw_pagamentos_enriquecidos.payment_id',
    COUNT(*)
FROM (
    SELECT payment_id
    FROM mart.vw_pagamentos_enriquecidos
    GROUP BY payment_id
    HAVING COUNT(*) > 1
) AS duplicados;
