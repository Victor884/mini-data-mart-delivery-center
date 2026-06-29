--drop das tabelas
DROP TABLE IF EXISTS stg.channels CASCADE;
DROP TABLE IF EXISTS stg.deliveries CASCADE;
DROP TABLE IF EXISTS stg.drivers CASCADE;
DROP TABLE IF EXISTS stg.hubs CASCADE;
DROP TABLE IF EXISTS stg.orders CASCADE;
DROP TABLE IF EXISTS stg.payments CASCADE;
DROP TABLE IF EXISTS stg.stores CASCADE;

-- stg.channels
CREATE TABLE stg.channels (
    channel_id INT,
    channel_name VARCHAR(100),
    channel_type VARCHAR(100)
);

-- stg.drivers
CREATE TABLE stg.drivers (
    driver_id INT,
    driver_modal VARCHAR(50),
    driver_type VARCHAR(50)
);

-- stg.hubs
CREATE TABLE stg.hubs (
    hub_id INT,
    hub_name VARCHAR(100),
    hub_city VARCHAR(100),
    hub_state VARCHAR(2),
    hub_latitude DOUBLE PRECISION,
    hub_longitude DOUBLE PRECISION
);

-- stg.stores
CREATE TABLE stg.stores (
    store_id INT,
    hub_id INT,
    store_name VARCHAR(150),
    store_segment VARCHAR(100),
    store_plan_price NUMERIC(15, 2),
    store_latitude DOUBLE PRECISION,
    store_longitude DOUBLE PRECISION
);

-- stg.deliveries
CREATE TABLE stg.deliveries (
    delivery_id INT,
    delivery_order_id INT,
    driver_id INT,
    delivery_distance_meters INT,
    delivery_status VARCHAR(50)
);

-- stg.payments
CREATE TABLE stg.payments (
    payment_id INT,
    payment_order_id INT,
    payment_amount NUMERIC(15, 2),
    payment_fee NUMERIC(15, 2),
    payment_method VARCHAR(50),
    payment_status VARCHAR(50)
);

-- stg.orders
CREATE TABLE stg.orders (
    order_id INT,
    store_id INT,
    channel_id INT,
    payment_order_id INT,
    delivery_order_id INT,
    order_status VARCHAR(50),
    order_amount NUMERIC(15, 2),
    order_delivery_fee NUMERIC(15, 2),
    order_delivery_cost NUMERIC(15, 2),
    order_created_hour INT,
    order_created_minute INT,
    order_created_day INT,
    order_created_month INT,
    order_created_year INT,
    order_moment_created VARCHAR(100),          -- Mantido como VARCHAR para evitar falhas de conversão de data na carga bruta
    order_moment_accepted VARCHAR(100),         -- A conversão para TIMESTAMP será feita na camada de DW
    order_moment_ready VARCHAR(100),
    order_moment_collected VARCHAR(100),
    order_moment_in_expedition VARCHAR(100),
    order_moment_delivering VARCHAR(100),
    order_moment_delivered VARCHAR(100),
    order_moment_finished VARCHAR(100),
    order_metric_collected_time DOUBLE PRECISION,
    order_metric_paused_time DOUBLE PRECISION,
    order_metric_production_time DOUBLE PRECISION,
    order_metric_walking_time DOUBLE PRECISION,
    order_metric_expediton_speed_time DOUBLE PRECISION,
    order_metric_transit_time DOUBLE PRECISION,
    order_metric_cycle_time DOUBLE PRECISION
);
