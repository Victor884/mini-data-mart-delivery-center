"""Build the denormalized Import table used by the Power BI report.

The PostgreSQL mart remains the canonical production path. This local extract
reproduces the same business rules from the checked-in raw CSV snapshot so the
PBIP can be opened and refreshed even when Docker/WSL is unavailable.
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd


ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data" / "raw"
OUTPUT = ROOT / "powerbi" / "data"


def load_csv(name: str, **kwargs) -> pd.DataFrame:
    # The source snapshot contains a few legacy Windows-1252 characters in
    # store names. latin-1 is lossless for those single-byte source files.
    return pd.read_csv(RAW / name, low_memory=False, encoding="latin-1", **kwargs)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)

    orders = load_csv("orders.csv")
    stores = load_csv("stores.csv")
    hubs = load_csv("hubs.csv")
    channels = load_csv("channels.csv")
    deliveries = load_csv("deliveries.csv")
    drivers = load_csv("drivers.csv")
    payments = load_csv("payments.csv")

    for frame in (orders, stores, hubs, channels, deliveries, drivers, payments):
        for column in frame.select_dtypes(include=["object", "str"]).columns:
            frame[column] = frame[column].str.strip()

    if not orders["order_id"].is_unique:
        raise ValueError("orders.csv possui order_id duplicado")
    if not stores["store_id"].is_unique:
        raise ValueError("stores.csv possui store_id duplicado")
    if not hubs["hub_id"].is_unique:
        raise ValueError("hubs.csv possui hub_id duplicado")
    if not channels["channel_id"].is_unique:
        raise ValueError("channels.csv possui channel_id duplicado")
    if not payments["payment_id"].is_unique:
        raise ValueError("payments.csv possui payment_id duplicado")

    lojas = stores.merge(hubs, on="hub_id", how="inner", validate="many_to_one")
    fato = orders.merge(lojas, on="store_id", how="inner", validate="many_to_one")
    fato = fato.merge(channels, on="channel_id", how="inner", validate="many_to_one")

    if len(fato) != len(orders):
        raise ValueError(
            f"Pedidos perdidos nas dimensoes: origem={len(orders)}, enriquecidos={len(fato)}"
        )

    fato["data_pedido"] = pd.to_datetime(
        fato["order_moment_created"],
        format="%m/%d/%Y %I:%M:%S %p",
        errors="raise",
    ).dt.normalize()
    fato["ano"] = fato["data_pedido"].dt.year.astype("int64")
    fato["mes_numero"] = fato["data_pedido"].dt.month.astype("int64")
    meses = {
        1: "Janeiro",
        2: "Fevereiro",
        3: "Marco",
        4: "Abril",
        5: "Maio",
        6: "Junho",
        7: "Julho",
        8: "Agosto",
        9: "Setembro",
        10: "Outubro",
        11: "Novembro",
        12: "Dezembro",
    }
    fato["mes_nome"] = fato["mes_numero"].map(meses)
    fato["mes_ano"] = fato["data_pedido"].dt.strftime("%m/%Y")
    fato["mes_ordem"] = fato["ano"] * 100 + fato["mes_numero"]

    fato["valor_total_pedido"] = (
        fato["order_amount"] + fato["order_delivery_fee"]
    ).round(2)
    fato["margem_entrega"] = (
        fato["order_delivery_fee"] - fato["order_delivery_cost"].fillna(0)
    ).round(2)

    deliveries = deliveries.sort_values(
        ["delivery_order_id", "delivery_id"], kind="mergesort"
    )
    deliveries["numero_tentativas"] = (
        deliveries.groupby("delivery_order_id").cumcount() + 1
    )
    ultimas = deliveries.groupby("delivery_order_id", as_index=False).tail(1).copy()

    drivers = pd.concat(
        [
            drivers,
            pd.DataFrame(
                [
                    {
                        "driver_id": -1,
                        "driver_modal": "NAO INFORMADO",
                        "driver_type": "NAO INFORMADO",
                    }
                ]
            ),
        ],
        ignore_index=True,
    )
    ultimas["driver_id"] = ultimas["driver_id"].fillna(-1)
    ultimas = ultimas.merge(drivers, on="driver_id", how="inner", validate="many_to_one")
    ultimas = ultimas.rename(
        columns={
            "delivery_order_id": "order_id",
            "delivery_distance_meters": "distancia_entrega_metros",
        }
    )

    fato = fato.merge(
        ultimas[
            [
                "order_id",
                "delivery_id",
                "delivery_status",
                "numero_tentativas",
                "distancia_entrega_metros",
                "driver_modal",
                "driver_type",
            ]
        ],
        on="order_id",
        how="left",
        validate="one_to_one",
    )
    fato["possui_entrega"] = fato["delivery_id"].notna()
    fato.loc[
        fato["possui_entrega"] & fato["driver_modal"].isna(), "driver_modal"
    ] = "NAO INFORMADO"
    fato.loc[
        fato["possui_entrega"] & fato["driver_type"].isna(), "driver_type"
    ] = "NAO INFORMADO"

    payments["valor_pago_confirmado"] = payments["payment_amount"].where(
        payments["payment_status"].eq("PAID"), 0
    )
    payments["valor_chargeback"] = payments["payment_amount"].where(
        payments["payment_status"].eq("CHARGEBACK"), 0
    )
    payments["valor_aguardando"] = payments["payment_amount"].where(
        payments["payment_status"].eq("AWAITING"), 0
    )
    payments["taxa_pagamento_pago"] = payments["payment_fee"].where(
        payments["payment_status"].eq("PAID"), 0
    )
    payments["flag_pago"] = payments["payment_status"].eq("PAID").astype("int64")
    payments["flag_chargeback"] = payments["payment_status"].eq(
        "CHARGEBACK"
    ).astype("int64")
    payments["flag_aguardando"] = payments["payment_status"].eq(
        "AWAITING"
    ).astype("int64")

    pagamentos = (
        payments.groupby("payment_order_id", as_index=False)
        .agg(
            qtd_pagamentos=("payment_id", "size"),
            qtd_pagamentos_pagos=("flag_pago", "sum"),
            qtd_chargebacks=("flag_chargeback", "sum"),
            qtd_pagamentos_aguardando=("flag_aguardando", "sum"),
            total_pago_confirmado=("valor_pago_confirmado", "sum"),
            total_chargeback=("valor_chargeback", "sum"),
            total_aguardando=("valor_aguardando", "sum"),
            taxas_pagamentos_pagos=("taxa_pagamento_pago", "sum"),
        )
        .rename(columns={"payment_order_id": "order_id"})
    )

    meio_principal = (
        payments.loc[payments["payment_status"].eq("PAID")]
        .sort_values(
            ["payment_order_id", "payment_amount", "payment_id"],
            ascending=[True, False, True],
            kind="mergesort",
        )
        .drop_duplicates("payment_order_id")
        [["payment_order_id", "payment_method"]]
        .rename(
            columns={
                "payment_order_id": "order_id",
                "payment_method": "meio_pagamento_principal",
            }
        )
    )
    pagamentos = pagamentos.merge(
        meio_principal, on="order_id", how="left", validate="one_to_one"
    )
    fato = fato.merge(pagamentos, on="order_id", how="left", validate="one_to_one")

    colunas_pagamento = [
        "qtd_pagamentos",
        "qtd_pagamentos_pagos",
        "qtd_chargebacks",
        "qtd_pagamentos_aguardando",
        "total_pago_confirmado",
        "total_chargeback",
        "total_aguardando",
        "taxas_pagamentos_pagos",
    ]
    fato[colunas_pagamento] = fato[colunas_pagamento].fillna(0)
    fato[
        [
            "qtd_pagamentos",
            "qtd_pagamentos_pagos",
            "qtd_chargebacks",
            "qtd_pagamentos_aguardando",
        ]
    ] = fato[
        [
            "qtd_pagamentos",
            "qtd_pagamentos_pagos",
            "qtd_chargebacks",
            "qtd_pagamentos_aguardando",
        ]
    ].astype("int64")
    fato["meio_pagamento_principal"] = fato[
        "meio_pagamento_principal"
    ].fillna("SEM PAGAMENTO PAGO")
    fato["valor_pago_apos_taxas"] = (
        fato["total_pago_confirmado"] - fato["taxas_pagamentos_pagos"]
    ).round(2)
    fato["diferenca_conciliacao"] = (
        fato["total_pago_confirmado"] - fato["valor_total_pedido"]
    ).round(2)

    fato["status_conciliacao"] = "PAGAMENTO_A_MAIOR"
    fato.loc[
        fato["total_pago_confirmado"] < fato["valor_total_pedido"],
        "status_conciliacao",
    ] = "PAGAMENTO_A_MENOR"
    fato.loc[
        fato["diferenca_conciliacao"].abs() <= 0.01,
        "status_conciliacao",
    ] = "CONCILIADO"
    fato.loc[
        fato["qtd_pagamentos_pagos"].eq(0), "status_conciliacao"
    ] = "SEM_PAGAMENTO_PAGO"
    fato.loc[fato["qtd_pagamentos"].eq(0), "status_conciliacao"] = (
        "SEM_PAGAMENTO"
    )
    fato.loc[fato["order_status"].eq("CANCELED"), "status_conciliacao"] = (
        "PEDIDO_CANCELADO"
    )

    output = fato[
        [
            "order_id",
            "data_pedido",
            "ano",
            "mes_numero",
            "mes_nome",
            "mes_ano",
            "mes_ordem",
            "hub_id",
            "hub_name",
            "hub_city",
            "hub_state",
            "store_id",
            "store_name",
            "store_segment",
            "channel_id",
            "channel_name",
            "channel_type",
            "order_status",
            "order_amount",
            "order_delivery_fee",
            "order_delivery_cost",
            "valor_total_pedido",
            "margem_entrega",
            "order_metric_production_time",
            "order_metric_transit_time",
            "order_metric_cycle_time",
            "possui_entrega",
            "delivery_id",
            "delivery_status",
            "numero_tentativas",
            "distancia_entrega_metros",
            "driver_modal",
            "driver_type",
            "qtd_pagamentos",
            "qtd_pagamentos_pagos",
            "qtd_chargebacks",
            "qtd_pagamentos_aguardando",
            "total_pago_confirmado",
            "total_chargeback",
            "total_aguardando",
            "taxas_pagamentos_pagos",
            "valor_pago_apos_taxas",
            "diferenca_conciliacao",
            "status_conciliacao",
            "meio_pagamento_principal",
        ]
    ].rename(
        columns={
            "hub_name": "hub_nome",
            "hub_city": "hub_cidade",
            "hub_state": "hub_estado",
            "store_name": "loja_nome",
            "store_segment": "segmento_loja",
            "channel_name": "canal_nome",
            "channel_type": "tipo_canal",
            "order_status": "status_pedido",
            "order_amount": "valor_pedido",
            "order_delivery_fee": "taxa_entrega",
            "order_delivery_cost": "custo_entrega",
            "order_metric_production_time": "tempo_producao_minutos",
            "order_metric_transit_time": "tempo_transito_minutos",
            "order_metric_cycle_time": "tempo_ciclo_total_minutos",
            "delivery_status": "status_entrega",
            "driver_modal": "modal_entregador",
            "driver_type": "tipo_entregador",
        }
    )

    output_path = OUTPUT / "fato_dashboard.csv"
    output.to_csv(output_path, index=False, date_format="%Y-%m-%d", encoding="utf-8")

    finalizados = output["status_pedido"].eq("FINISHED")
    cancelados = output["status_pedido"].eq("CANCELED")
    ciclo_valido = finalizados & output["tempo_ciclo_total_minutos"].ge(0)
    com_entrega = output["possui_entrega"]
    ciclo_logistico = ciclo_valido & com_entrega
    producao_valida = finalizados & output["tempo_producao_minutos"].ge(0)
    transito_valido = finalizados & output["tempo_transito_minutos"].ge(0)
    distancia_valida = (
        output["status_entrega"].eq("DELIVERED")
        & output["distancia_entrega_metros"].ge(0)
    )
    conciliados = finalizados & output["status_conciliacao"].eq("CONCILIADO")

    validacao = {
        "linhas": int(len(output)),
        "periodo_inicial": output["data_pedido"].min().strftime("%Y-%m-%d"),
        "periodo_final": output["data_pedido"].max().strftime("%Y-%m-%d"),
        "pedidos_finalizados": int(finalizados.sum()),
        "pedidos_cancelados": int(cancelados.sum()),
        "taxa_cancelamento_pct": round(100 * cancelados.sum() / len(output), 2),
        "valor_transacionado_finalizado": round(
            float(output.loc[finalizados, "valor_total_pedido"].sum()), 2
        ),
        "ticket_medio_finalizado": round(
            float(output.loc[finalizados, "valor_total_pedido"].sum())
            / int(finalizados.sum()),
            2,
        ),
        "margem_entrega_finalizada": round(
            float(output.loc[finalizados, "margem_entrega"].sum()), 2
        ),
        "tempo_producao_medio_minutos": round(
            float(output.loc[producao_valida, "tempo_producao_minutos"].mean()), 2
        ),
        "tempo_transito_medio_minutos": round(
            float(output.loc[transito_valido, "tempo_transito_minutos"].mean()), 2
        ),
        "tempo_ciclo_p50_minutos": round(
            float(output.loc[ciclo_valido, "tempo_ciclo_total_minutos"].quantile(0.5)),
            2,
        ),
        "tempo_ciclo_p90_minutos": round(
            float(output.loc[ciclo_valido, "tempo_ciclo_total_minutos"].quantile(0.9)),
            2,
        ),
        "tempo_ciclo_logistico_p50_minutos": round(
            float(output.loc[ciclo_logistico, "tempo_ciclo_total_minutos"].quantile(0.5)),
            2,
        ),
        "tempo_ciclo_logistico_p90_minutos": round(
            float(output.loc[ciclo_logistico, "tempo_ciclo_total_minutos"].quantile(0.9)),
            2,
        ),
        "pedidos_com_entrega": int(com_entrega.sum()),
        "taxa_entrega_concluida_pct": round(
            100
            * (com_entrega & output["status_entrega"].eq("DELIVERED")).sum()
            / com_entrega.sum(),
            2,
        ),
        "taxa_multiplas_tentativas_pct": round(
            100
            * (com_entrega & output["numero_tentativas"].gt(1)).sum()
            / com_entrega.sum(),
            2,
        ),
        "distancia_media_entregue_km": round(
            float(output.loc[distancia_valida, "distancia_entrega_metros"].mean())
            / 1000,
            2,
        ),
        "transacoes_pagas": int(output["qtd_pagamentos_pagos"].sum()),
        "valor_pago_confirmado": round(
            float(output["total_pago_confirmado"].sum()), 2
        ),
        "taxas_pagamentos_pagos": round(
            float(output["taxas_pagamentos_pagos"].sum()), 2
        ),
        "chargebacks": int(output["qtd_chargebacks"].sum()),
        "valor_chargeback": round(float(output["total_chargeback"].sum()), 2),
        "pedidos_conciliados": int(conciliados.sum()),
        "taxa_conciliacao_pct": round(
            100 * conciliados.sum() / finalizados.sum(), 2
        ),
        "diferenca_absoluta_conciliacao": round(
            float(
                output.loc[finalizados, "diferenca_conciliacao"].abs().sum()
            ),
            2,
        ),
    }

    expected = {
        "linhas": 368_999,
        "pedidos_finalizados": 352_020,
        "pedidos_cancelados": 16_979,
        "taxa_cancelamento_pct": 4.60,
        "valor_transacionado_finalizado": 37_481_358.97,
        "ticket_medio_finalizado": 106.48,
        "margem_entrega_finalizada": -434_905.63,
        "tempo_producao_medio_minutos": 61.71,
        "tempo_transito_medio_minutos": 46.55,
        "tempo_ciclo_p50_minutos": 42.18,
        "tempo_ciclo_p90_minutos": 83.17,
        "pedidos_com_entrega": 358_654,
        "taxa_entrega_concluida_pct": 97.95,
        "taxa_multiplas_tentativas_pct": 5.22,
        "distancia_media_entregue_km": 10.11,
        "transacoes_pagas": 400_381,
        "valor_pago_confirmado": 37_304_232.78,
        "taxas_pagamentos_pagos": 753_363.85,
        "chargebacks": 438,
        "valor_chargeback": 7_160.50,
        "taxa_conciliacao_pct": 96.60,
        "diferenca_absoluta_conciliacao": 465_576.41,
    }
    for metric, expected_value in expected.items():
        if validacao[metric] != expected_value:
            raise ValueError(
                f"Baseline divergente para {metric}: {validacao[metric]} != {expected_value}"
            )

    (OUTPUT / "validacao.json").write_text(
        json.dumps(validacao, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(validacao, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
