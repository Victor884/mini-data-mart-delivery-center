-- Limpar e carregar a tabela stg.channels
TRUNCATE TABLE stg.channels;
COPY stg.channels
FROM '/data/raw/channels.csv'
WITH (
    FORMAT csv,
    HEADER true,
    DELIMITER ',',
    ENCODING 'UTF8',
    NULL ''
);

-- Limpar e carregar a tabela stg.drivers
TRUNCATE TABLE stg.drivers;
COPY stg.drivers
FROM '/data/raw/drivers.csv'
WITH (
    FORMAT csv,
    HEADER true,
    DELIMITER ',',
    ENCODING 'UTF8',
    NULL ''
);

-- Limpar e carregar a tabela stg.hubs
TRUNCATE TABLE stg.hubs;
COPY stg.hubs
FROM '/data/raw/hubs.csv'
WITH (
    FORMAT csv,
    HEADER true,
    DELIMITER ',',
    ENCODING 'LATIN1',
    NULL ''
);

-- Limpar e carregar a tabela stg.stores
TRUNCATE TABLE stg.stores;
COPY stg.stores
FROM '/data/raw/stores.csv'
WITH (
    FORMAT csv,
    HEADER true,
    DELIMITER ',',
    ENCODING 'LATIN1',
    NULL ''
);

-- Limpar e carregar a tabela stg.payments
TRUNCATE TABLE stg.payments;
COPY stg.payments
FROM '/data/raw/payments.csv'
WITH (
    FORMAT csv,
    HEADER true,
    DELIMITER ',',
    ENCODING 'UTF8',
    NULL ''
);

-- Limpar e carregar a tabela stg.deliveries
TRUNCATE TABLE stg.deliveries;
COPY stg.deliveries
FROM '/data/raw/deliveries.csv'
WITH (
    FORMAT csv,
    HEADER true,
    DELIMITER ',',
    ENCODING 'UTF8',
    NULL ''
);


-- Limpar e carregar a tabela stg.orders
TRUNCATE TABLE stg.orders;
COPY stg.orders
FROM '/data/raw/orders.csv'
WITH (
    FORMAT csv,
    HEADER true,
    DELIMITER ',',
    ENCODING 'UTF8',
    NULL ''
);
