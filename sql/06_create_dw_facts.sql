-- Tabelas fato da camada analitica.
-- Graos:
--   fato_pedidos: uma linha por pedido;
--   fato_entregas: uma linha por registro/tentativa de entrega;
--   fato_pagamentos: uma linha por transacao de pagamento.

CREATE SCHEMA IF NOT EXISTS dw;

CREATE TABLE IF NOT EXISTS dw.fato_pedidos (
    sk_pedido BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT NOT NULL,

    fk_loja BIGINT NOT NULL,
    fk_canal BIGINT NOT NULL,
    fk_status_pedido BIGINT NOT NULL,
    fk_tempo_criacao INTEGER NOT NULL,

    valor_pedido NUMERIC(15, 2) NOT NULL,
    taxa_entrega NUMERIC(15, 2) NOT NULL,
    custo_entrega NUMERIC(15, 2),
    valor_total_pedido NUMERIC(15, 2)
        GENERATED ALWAYS AS (valor_pedido + taxa_entrega) STORED,
    margem_entrega NUMERIC(15, 2)
        GENERATED ALWAYS AS (taxa_entrega - COALESCE(custo_entrega, 0)) STORED,

    pedido_criado_em TIMESTAMPTZ NOT NULL,
    pedido_aceito_em TIMESTAMPTZ,
    pedido_pronto_em TIMESTAMPTZ,
    pedido_coletado_em TIMESTAMPTZ,
    pedido_em_expedicao_em TIMESTAMPTZ,
    pedido_em_entrega_em TIMESTAMPTZ,
    pedido_entregue_em TIMESTAMPTZ,
    pedido_finalizado_em TIMESTAMPTZ,

    tempo_coleta_minutos DOUBLE PRECISION,
    tempo_pausado_minutos DOUBLE PRECISION,
    tempo_producao_minutos DOUBLE PRECISION,
    tempo_caminhada_minutos DOUBLE PRECISION,
    tempo_expedicao_minutos DOUBLE PRECISION,
    tempo_transito_minutos DOUBLE PRECISION,
    tempo_ciclo_total_minutos DOUBLE PRECISION,

    carregado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_fato_pedidos_order_id UNIQUE (order_id),
    CONSTRAINT fk_fato_pedidos_loja
        FOREIGN KEY (fk_loja) REFERENCES dw.dim_lojas (sk_loja),
    CONSTRAINT fk_fato_pedidos_canal
        FOREIGN KEY (fk_canal) REFERENCES dw.dim_canais (sk_canal),
    CONSTRAINT fk_fato_pedidos_status
        FOREIGN KEY (fk_status_pedido)
        REFERENCES dw.dim_status_pedido (sk_status_pedido),
    CONSTRAINT fk_fato_pedidos_tempo
        FOREIGN KEY (fk_tempo_criacao) REFERENCES dw.dim_tempo (sk_tempo),
    CONSTRAINT ck_fato_pedidos_valor
        CHECK (valor_pedido >= 0),
    CONSTRAINT ck_fato_pedidos_taxa_entrega
        CHECK (taxa_entrega >= 0),
    CONSTRAINT ck_fato_pedidos_custo_entrega
        CHECK (custo_entrega IS NULL OR custo_entrega >= 0)
);

COMMENT ON TABLE dw.fato_pedidos IS
    'Uma linha por pedido, com metricas financeiras e tempos do ciclo do pedido.';

CREATE TABLE IF NOT EXISTS dw.fato_entregas (
    sk_entrega BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    delivery_id BIGINT NOT NULL,
    order_id BIGINT NOT NULL,

    fk_pedido BIGINT NOT NULL,
    fk_tempo_pedido INTEGER NOT NULL,
    fk_loja BIGINT NOT NULL,
    fk_entregador BIGINT NOT NULL,
    fk_status_entrega BIGINT NOT NULL,

    numero_tentativa INTEGER NOT NULL,
    eh_ultima_tentativa BOOLEAN NOT NULL,
    distancia_entrega_metros INTEGER,

    carregado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_fato_entregas_delivery_id UNIQUE (delivery_id),
    CONSTRAINT fk_fato_entregas_pedido
        FOREIGN KEY (fk_pedido) REFERENCES dw.fato_pedidos (sk_pedido),
    CONSTRAINT fk_fato_entregas_tempo
        FOREIGN KEY (fk_tempo_pedido) REFERENCES dw.dim_tempo (sk_tempo),
    CONSTRAINT fk_fato_entregas_loja
        FOREIGN KEY (fk_loja) REFERENCES dw.dim_lojas (sk_loja),
    CONSTRAINT fk_fato_entregas_entregador
        FOREIGN KEY (fk_entregador)
        REFERENCES dw.dim_entregadores (sk_entregador),
    CONSTRAINT fk_fato_entregas_status
        FOREIGN KEY (fk_status_entrega)
        REFERENCES dw.dim_status_entrega (sk_status_entrega),
    CONSTRAINT ck_fato_entregas_numero_tentativa
        CHECK (numero_tentativa > 0),
    CONSTRAINT ck_fato_entregas_distancia
        CHECK (
            distancia_entrega_metros IS NULL
            OR distancia_entrega_metros >= 0
        )
);

COMMENT ON TABLE dw.fato_entregas IS
    'Uma linha por entrega/tentativa. Preserva pedidos com multiplas entregas.';

CREATE TABLE IF NOT EXISTS dw.fato_pagamentos (
    sk_pagamento BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    payment_id BIGINT NOT NULL,
    order_id BIGINT NOT NULL,

    fk_pedido BIGINT NOT NULL,
    fk_tempo_pedido INTEGER NOT NULL,
    fk_loja BIGINT NOT NULL,
    fk_canal BIGINT NOT NULL,
    fk_metodo_pagamento BIGINT NOT NULL,
    fk_status_pagamento BIGINT NOT NULL,

    valor_pagamento NUMERIC(15, 2) NOT NULL,
    taxa_pagamento NUMERIC(15, 2),
    valor_liquido_pagamento NUMERIC(15, 2)
        GENERATED ALWAYS AS (
            valor_pagamento - COALESCE(taxa_pagamento, 0)
        ) STORED,

    carregado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_fato_pagamentos_payment_id UNIQUE (payment_id),
    CONSTRAINT fk_fato_pagamentos_pedido
        FOREIGN KEY (fk_pedido) REFERENCES dw.fato_pedidos (sk_pedido),
    CONSTRAINT fk_fato_pagamentos_tempo
        FOREIGN KEY (fk_tempo_pedido) REFERENCES dw.dim_tempo (sk_tempo),
    CONSTRAINT fk_fato_pagamentos_loja
        FOREIGN KEY (fk_loja) REFERENCES dw.dim_lojas (sk_loja),
    CONSTRAINT fk_fato_pagamentos_canal
        FOREIGN KEY (fk_canal) REFERENCES dw.dim_canais (sk_canal),
    CONSTRAINT fk_fato_pagamentos_metodo
        FOREIGN KEY (fk_metodo_pagamento)
        REFERENCES dw.dim_metodos_pagamento (sk_metodo_pagamento),
    CONSTRAINT fk_fato_pagamentos_status
        FOREIGN KEY (fk_status_pagamento)
        REFERENCES dw.dim_status_pagamento (sk_status_pagamento),
    CONSTRAINT ck_fato_pagamentos_valor
        CHECK (valor_pagamento >= 0),
    CONSTRAINT ck_fato_pagamentos_taxa
        CHECK (taxa_pagamento IS NULL OR taxa_pagamento >= 0)
);

COMMENT ON TABLE dw.fato_pagamentos IS
    'Uma linha por transacao de pagamento. A data disponivel e a data do pedido.';

-- O PostgreSQL nao cria indices automaticamente para chaves estrangeiras.
CREATE INDEX IF NOT EXISTS ix_fato_pedidos_loja
    ON dw.fato_pedidos (fk_loja);
CREATE INDEX IF NOT EXISTS ix_fato_pedidos_canal
    ON dw.fato_pedidos (fk_canal);
CREATE INDEX IF NOT EXISTS ix_fato_pedidos_tempo
    ON dw.fato_pedidos (fk_tempo_criacao);
CREATE INDEX IF NOT EXISTS ix_fato_pedidos_status_tempo
    ON dw.fato_pedidos (fk_status_pedido, fk_tempo_criacao);
CREATE INDEX IF NOT EXISTS ix_fato_pedidos_loja_tempo
    ON dw.fato_pedidos (fk_loja, fk_tempo_criacao);
CREATE INDEX IF NOT EXISTS ix_fato_pedidos_canal_tempo
    ON dw.fato_pedidos (fk_canal, fk_tempo_criacao);

CREATE INDEX IF NOT EXISTS ix_fato_entregas_pedido
    ON dw.fato_entregas (fk_pedido);
CREATE INDEX IF NOT EXISTS ix_fato_entregas_tempo
    ON dw.fato_entregas (fk_tempo_pedido);
CREATE INDEX IF NOT EXISTS ix_fato_entregas_loja_tempo
    ON dw.fato_entregas (fk_loja, fk_tempo_pedido);
CREATE INDEX IF NOT EXISTS ix_fato_entregas_entregador_tempo
    ON dw.fato_entregas (fk_entregador, fk_tempo_pedido);
CREATE INDEX IF NOT EXISTS ix_fato_entregas_status_tempo
    ON dw.fato_entregas (fk_status_entrega, fk_tempo_pedido);

CREATE INDEX IF NOT EXISTS ix_fato_pagamentos_pedido
    ON dw.fato_pagamentos (fk_pedido);
CREATE INDEX IF NOT EXISTS ix_fato_pagamentos_tempo
    ON dw.fato_pagamentos (fk_tempo_pedido);
CREATE INDEX IF NOT EXISTS ix_fato_pagamentos_loja_tempo
    ON dw.fato_pagamentos (fk_loja, fk_tempo_pedido);
CREATE INDEX IF NOT EXISTS ix_fato_pagamentos_canal_tempo
    ON dw.fato_pagamentos (fk_canal, fk_tempo_pedido);
CREATE INDEX IF NOT EXISTS ix_fato_pagamentos_metodo_tempo
    ON dw.fato_pagamentos (fk_metodo_pagamento, fk_tempo_pedido);
CREATE INDEX IF NOT EXISTS ix_fato_pagamentos_status_tempo
    ON dw.fato_pagamentos (fk_status_pagamento, fk_tempo_pedido);
