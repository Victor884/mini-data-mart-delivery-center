# Delivery Center — versão portátil

> **Status:** em desenvolvimento na branch `agent/power-bi-future-version`. Esta versão não substitui `DeliveryCenterAnalytics.pbip`.

O projeto `DeliveryCenter.pbip` utiliza um extrato Import de uma linha por pedido, reproduzido a partir dos CSVs completos do repositório. Entregas usam a última tentativa e pagamentos são agregados antes da união, preservando valores sem fanout. Seu objetivo é permitir demonstração e validação local mesmo quando PostgreSQL ou Docker não estiverem disponíveis.

## Preparar e abrir

Na raiz do repositório:

```powershell
python powerbi/scripts/build_import_data.py
node powerbi/scripts/generate_pbip.mjs
```

Depois, abra `powerbi/DeliveryCenter.pbip` no Power BI Desktop e atualize o modelo.

## Evidências e manutenção

- `data/validacao.json`: baselines reconciliados com os dados completos;
- `validation-report.json`: última validação estrutural registrada do PBIR;
- `DeliveryCenter.SemanticModel/definition/tables/FatoDashboard.tmdl`: modelo Import e medidas DAX;
- `scripts/generate_pbip.mjs`: geração determinística do projeto;
- `report-spec.md`: escopo, regras e critérios de aceite.

## Baselines já reconciliados

- 368.999 pedidos e 352.020 finalizados;
- R$ 37.481.358,97 em valor transacionado finalizado;
- 400.381 transações pagas e R$ 37.304.232,78 em valor pago;
- 96,60% de conciliação e R$ 465.576,41 de diferença absoluta;
- 438 chargebacks, totalizando R$ 7.160,50;
- 97,95% de conclusão de entrega e 5,22% de múltiplas tentativas.
