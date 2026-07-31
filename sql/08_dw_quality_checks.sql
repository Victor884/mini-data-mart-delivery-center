-- Validacoes da camada DW.
-- O bloco inicial interrompe a execucao quando houver perda de linhas na carga.

SET TIME ZONE 'America/Sao_Paulo';

DO $$
DECLARE
    qtd_stg BIGINT;
    qtd_dw BIGINT;
    qtd_erros BIGINT;
BEGIN
    SELECT COUNT(*) INTO qtd_stg FROM stg.orders;
    SELECT COUNT(*) INTO qtd_dw FROM dw.fato_pedidos;
    IF qtd_stg <> qtd_dw THEN
        RAISE EXCEPTION
            'Quantidade de pedidos divergente: stg=%, dw=%',
            qtd_stg,
            qtd_dw;
    END IF;

    SELECT COUNT(*) INTO qtd_stg FROM stg.deliveries;
    SELECT COUNT(*) INTO qtd_dw FROM dw.fato_entregas;
    IF qtd_stg <> qtd_dw THEN
        RAISE EXCEPTION
            'Quantidade de entregas divergente: stg=%, dw=%',
            qtd_stg,
            qtd_dw;
    END IF;

    SELECT COUNT(*) INTO qtd_stg FROM stg.payments;
    SELECT COUNT(*) INTO qtd_dw FROM dw.fato_pagamentos;
    IF qtd_stg <> qtd_dw THEN
        RAISE EXCEPTION
            'Quantidade de pagamentos divergente: stg=%, dw=%',
            qtd_stg,
            qtd_dw;
    END IF;

    SELECT COUNT(*)
    INTO qtd_erros
    FROM dw.fato_pedidos AS p
    INNER JOIN dw.dim_tempo AS t
        ON t.sk_tempo = p.fk_tempo_criacao
    WHERE (
        p.pedido_criado_em AT TIME ZONE 'America/Sao_Paulo'
    )::DATE <> t.data_completa;

    IF qtd_erros > 0 THEN
        RAISE EXCEPTION
            'Existem % pedidos ligados a uma data divergente do timestamp',
            qtd_erros;
    END IF;

    SELECT COUNT(*)
    INTO qtd_erros
    FROM (
        SELECT order_id
        FROM dw.fato_entregas
        GROUP BY order_id
        HAVING COUNT(*) FILTER (WHERE eh_ultima_tentativa) <> 1
    ) AS flags_invalidas;

    IF qtd_erros > 0 THEN
        RAISE EXCEPTION
            'Existem % pedidos sem exatamente uma ultima tentativa',
            qtd_erros;
    END IF;
END $$;

-- Volumes por tabela.
SELECT
    tabela,
    quantidade
FROM (
    SELECT 'dim_lojas' AS tabela, COUNT(*) AS quantidade
    FROM dw.dim_lojas

    UNION ALL

    SELECT 'dim_entregadores', COUNT(*)
    FROM dw.dim_entregadores

    UNION ALL

    SELECT 'dim_canais', COUNT(*)
    FROM dw.dim_canais

    UNION ALL

    SELECT 'dim_status_pedido', COUNT(*)
    FROM dw.dim_status_pedido

    UNION ALL

    SELECT 'dim_status_entrega', COUNT(*)
    FROM dw.dim_status_entrega

    UNION ALL

    SELECT 'dim_metodos_pagamento', COUNT(*)
    FROM dw.dim_metodos_pagamento

    UNION ALL

    SELECT 'dim_status_pagamento', COUNT(*)
    FROM dw.dim_status_pagamento

    UNION ALL

    SELECT 'dim_tempo', COUNT(*)
    FROM dw.dim_tempo

    UNION ALL

    SELECT 'fato_pedidos', COUNT(*)
    FROM dw.fato_pedidos

    UNION ALL

    SELECT 'fato_entregas', COUNT(*)
    FROM dw.fato_entregas

    UNION ALL

    SELECT 'fato_pagamentos', COUNT(*)
    FROM dw.fato_pagamentos
) AS volumes
ORDER BY tabela;

-- Comparacao dos totais financeiros entre staging e DW.
SELECT
    'pedidos' AS origem,
    (SELECT SUM(order_amount) FROM stg.orders) AS total_staging,
    (SELECT SUM(valor_pedido) FROM dw.fato_pedidos) AS total_dw,
    (
        SELECT SUM(order_amount) FROM stg.orders
    ) - (
        SELECT SUM(valor_pedido) FROM dw.fato_pedidos
    ) AS diferenca

UNION ALL

SELECT
    'pagamentos',
    (SELECT SUM(payment_amount) FROM stg.payments),
    (SELECT SUM(valor_pagamento) FROM dw.fato_pagamentos),
    (
        SELECT SUM(payment_amount) FROM stg.payments
    ) - (
        SELECT SUM(valor_pagamento) FROM dw.fato_pagamentos
    );

-- Pedidos com multiplas entregas. Esse caso e preservado em fato_entregas.
SELECT
    COUNT(*) AS pedidos_com_multiplas_entregas,
    MAX(qtd_entregas) AS maior_quantidade_entregas_por_pedido
FROM (
    SELECT
        order_id,
        COUNT(*) AS qtd_entregas
    FROM dw.fato_entregas
    GROUP BY order_id
    HAVING COUNT(*) > 1
) AS pedidos_multiplas_entregas;

-- Entregas ligadas ao membro especial "NAO INFORMADO".
SELECT
    COUNT(*) AS entregas_sem_entregador_informado
FROM dw.fato_entregas AS e
INNER JOIN dw.dim_entregadores AS d
    ON d.sk_entregador = e.fk_entregador
WHERE d.driver_id = -1;

-- Anomalias ja existentes na origem: tempos negativos.
SELECT
    COUNT(*) AS pedidos_com_alguma_metrica_tempo_negativa
FROM dw.fato_pedidos
WHERE tempo_coleta_minutos < 0
   OR tempo_pausado_minutos < 0
   OR tempo_producao_minutos < 0
   OR tempo_caminhada_minutos < 0
   OR tempo_expedicao_minutos < 0
   OR tempo_transito_minutos < 0
   OR tempo_ciclo_total_minutos < 0;

-- Divergencias da origem entre a data fragmentada e o timestamp completo.
SELECT
    COUNT(*) AS pedidos_com_data_origem_divergente
FROM stg.orders
WHERE MAKE_DATE(
        order_created_year,
        order_created_month,
        order_created_day
    ) <> TO_TIMESTAMP(
        NULLIF(BTRIM(order_moment_created), ''),
        'MM/DD/YYYY HH12:MI:SS AM'
    )::DATE;

-- Conciliacao: pagamentos versus valor total esperado do pedido.
WITH pagamentos_por_pedido AS (
    SELECT
        fk_pedido,
        SUM(valor_pagamento) AS total_pago
    FROM dw.fato_pagamentos
    WHERE fk_status_pagamento = (
        SELECT sk_status_pagamento
        FROM dw.dim_status_pagamento
        WHERE payment_status = 'PAID'
    )
    GROUP BY fk_pedido
)
SELECT
    COUNT(*) FILTER (
        WHERE pg.fk_pedido IS NULL
    ) AS pedidos_sem_pagamento_pago,
    COUNT(*) FILTER (
        WHERE pg.fk_pedido IS NOT NULL
          AND ABS(pg.total_pago - p.valor_total_pedido) <= 0.01
    ) AS pedidos_conciliados,
    COUNT(*) FILTER (
        WHERE pg.fk_pedido IS NOT NULL
          AND ABS(pg.total_pago - p.valor_total_pedido) > 0.01
    ) AS pedidos_com_divergencia,
    SUM(
        pg.total_pago - p.valor_total_pedido
    ) FILTER (
        WHERE pg.fk_pedido IS NOT NULL
    ) AS diferenca_liquida
FROM dw.fato_pedidos AS p
LEFT JOIN pagamentos_por_pedido AS pg
    ON pg.fk_pedido = p.sk_pedido;

-- Confirma que todas as chaves de negocio continuam unicas.
SELECT
    'fato_pedidos.order_id' AS chave,
    COUNT(*) AS duplicidades
FROM (
    SELECT order_id
    FROM dw.fato_pedidos
    GROUP BY order_id
    HAVING COUNT(*) > 1
) AS duplicados

UNION ALL

SELECT
    'fato_entregas.delivery_id',
    COUNT(*)
FROM (
    SELECT delivery_id
    FROM dw.fato_entregas
    GROUP BY delivery_id
    HAVING COUNT(*) > 1
) AS duplicados

UNION ALL

SELECT
    'fato_pagamentos.payment_id',
    COUNT(*)
FROM (
    SELECT payment_id
    FROM dw.fato_pagamentos
    GROUP BY payment_id
    HAVING COUNT(*) > 1
) AS duplicados;
