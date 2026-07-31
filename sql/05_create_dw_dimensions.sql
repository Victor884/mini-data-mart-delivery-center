-- Dimensoes conformadas da camada analitica.
-- Este script e idempotente: pode ser executado novamente sem apagar dados.

CREATE SCHEMA IF NOT EXISTS dw;

CREATE TABLE IF NOT EXISTS dw.dim_lojas (
    sk_loja BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    store_id BIGINT NOT NULL,
    store_name TEXT,
    store_segment TEXT,
    store_plan_price NUMERIC(15, 2),
    store_latitude DOUBLE PRECISION,
    store_longitude DOUBLE PRECISION,
    hub_id BIGINT NOT NULL,
    hub_name TEXT,
    hub_city TEXT,
    hub_state TEXT,
    carregado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_dim_lojas_store_id UNIQUE (store_id),
    CONSTRAINT ck_dim_lojas_store_plan_price
        CHECK (store_plan_price IS NULL OR store_plan_price >= 0)
);

COMMENT ON TABLE dw.dim_lojas IS
    'Uma linha por loja, com os atributos do hub desnormalizados.';

CREATE TABLE IF NOT EXISTS dw.dim_entregadores (
    sk_entregador BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    driver_id BIGINT NOT NULL,
    driver_modal TEXT,
    driver_type TEXT,
    carregado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_dim_entregadores_driver_id UNIQUE (driver_id)
);

COMMENT ON TABLE dw.dim_entregadores IS
    'Uma linha por entregador. O driver_id -1 representa entregador nao informado.';

CREATE TABLE IF NOT EXISTS dw.dim_canais (
    sk_canal BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    channel_id BIGINT NOT NULL,
    channel_name TEXT,
    channel_type TEXT,
    carregado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_dim_canais_channel_id UNIQUE (channel_id)
);

COMMENT ON TABLE dw.dim_canais IS
    'Uma linha por canal de venda.';

CREATE TABLE IF NOT EXISTS dw.dim_status_pedido (
    sk_status_pedido BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_status TEXT NOT NULL,
    carregado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_dim_status_pedido UNIQUE (order_status)
);

CREATE TABLE IF NOT EXISTS dw.dim_status_entrega (
    sk_status_entrega BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    delivery_status TEXT NOT NULL,
    carregado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_dim_status_entrega UNIQUE (delivery_status)
);

CREATE TABLE IF NOT EXISTS dw.dim_metodos_pagamento (
    sk_metodo_pagamento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payment_method TEXT NOT NULL,
    carregado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_dim_metodos_pagamento UNIQUE (payment_method)
);

CREATE TABLE IF NOT EXISTS dw.dim_status_pagamento (
    sk_status_pagamento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payment_status TEXT NOT NULL,
    carregado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_dim_status_pagamento UNIQUE (payment_status)
);

CREATE TABLE IF NOT EXISTS dw.dim_tempo (
    sk_tempo INTEGER PRIMARY KEY,
    data_completa DATE NOT NULL,
    ano SMALLINT NOT NULL,
    semestre SMALLINT NOT NULL,
    trimestre SMALLINT NOT NULL,
    mes SMALLINT NOT NULL,
    nome_mes TEXT NOT NULL,
    dia SMALLINT NOT NULL,
    numero_dia_semana SMALLINT NOT NULL,
    nome_dia_semana TEXT NOT NULL,
    eh_fim_semana BOOLEAN NOT NULL,
    carregado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_dim_tempo_data_completa UNIQUE (data_completa),
    CONSTRAINT ck_dim_tempo_sk
        CHECK (sk_tempo BETWEEN 19000101 AND 29991231),
    CONSTRAINT ck_dim_tempo_semestre
        CHECK (semestre BETWEEN 1 AND 2),
    CONSTRAINT ck_dim_tempo_trimestre
        CHECK (trimestre BETWEEN 1 AND 4),
    CONSTRAINT ck_dim_tempo_mes
        CHECK (mes BETWEEN 1 AND 12),
    CONSTRAINT ck_dim_tempo_dia
        CHECK (dia BETWEEN 1 AND 31),
    CONSTRAINT ck_dim_tempo_numero_dia_semana
        CHECK (numero_dia_semana BETWEEN 1 AND 7)
);

COMMENT ON TABLE dw.dim_tempo IS
    'Uma linha por dia. A chave usa o formato YYYYMMDD.';
