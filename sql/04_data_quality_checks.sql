SELECT 'orders' AS tabela,
    COUNT(*) AS total
FROM stg.orders
UNION ALL
SELECT 'payments',
    COUNT(*)
FROM stg.payments
UNION ALL
SELECT 'deliveries',
    COUNT(*)
FROM stg.deliveries
UNION ALL
SELECT 'drivers',
    COUNT(*)
FROM stg.drivers
UNION ALL
SELECT 'channels',
    COUNT(*)
FROM stg.channels
UNION ALL
SELECT 'hubs',
    COUNT(*)
FROM stg.hubs
UNION ALL
SELECT 'stores',
    COUNT(*)
FROM stg.stores;
-- Pedidos duplicados
SELECT order_id,
    COUNT(*) AS qtd
FROM stg.orders
GROUP BY order_id
HAVING COUNT(*) > 1;
-- Pagamentos por pedido
SELECT payment_order_id,
    COUNT(*) AS qtd_pagamentos
FROM stg.payments
GROUP BY payment_order_id
HAVING COUNT(*) > 1
ORDER BY qtd_pagamentos DESC;
-- Entregas por pedido
SELECT delivery_order_id,
    COUNT(*) AS qtd_entregas
FROM stg.deliveries
GROUP BY delivery_order_id
HAVING COUNT(*) > 1
ORDER BY qtd_entregas DESC;
-- Pedidos sem loja
SELECT COUNT(*) AS pedidos_sem_loja
FROM stg.orders o
    LEFT JOIN stg.stores s ON o.store_id = s.store_id
WHERE s.store_id IS NULL;
-- Pedidos sem canal
SELECT COUNT(*) AS pedidos_sem_canal
FROM stg.orders o
    LEFT JOIN stg.channels c ON o.channel_id = c.channel_id
WHERE c.channel_id IS NULL;