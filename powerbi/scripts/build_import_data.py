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

    for frame in (orders, stores, hubs, channels, deliveries, drivers):
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
    }

    expected = {
        "linhas": 368_999,
        "pedidos_cancelados": 16_979,
        "taxa_cancelamento_pct": 4.60,
        "valor_transacionado_finalizado": 37_481_358.97,
        "ticket_medio_finalizado": 106.48,
        "margem_entrega_finalizada": -434_905.63,
        "taxa_entrega_concluida_pct": 97.95,
        "taxa_multiplas_tentativas_pct": 5.22,
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
