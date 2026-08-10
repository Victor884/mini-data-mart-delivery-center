# Delivery Center — versão portátil

> **Status:** em desenvolvimento na branch `agent/power-bi-future-version`. Esta versão não substitui `DeliveryCenterAnalytics.pbip`.

O projeto `DeliveryCenter.pbip` utiliza um extrato Import de uma linha por pedido, reproduzido a partir dos CSVs completos do repositório. Seu objetivo é permitir demonstração e validação local mesmo quando PostgreSQL ou Docker não estiverem disponíveis.

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
