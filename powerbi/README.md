# Relatório Power BI — Delivery Center

> **Status:** versão futura pronta para validação no Power BI Desktop. A estrutura PBIR foi validada com **0 erros e 0 avisos**; a carga e a inspeção visual no Desktop ficaram deliberadamente pendentes para outra máquina.

O projeto nativo `DeliveryCenter.pbip` contém duas páginas modernas e responsivas ao contexto de filtro:

- **Visão Executiva:** faturamento finalizado, pedidos, ticket médio, cancelamento, margem, tendência mensal, hubs e canais.
- **Performance Logística:** conclusão de entregas, P50/P90 de ciclo, múltiplas tentativas, modal, status e matriz por hub.

O modelo Import utiliza um extrato de uma linha por pedido, gerado a partir dos CSVs completos do repositório. O snapshot de 82 MB não é versionado porque pode ser reproduzido de forma determinística.

## Preparar e abrir em outra máquina

Na raiz do repositório:

```powershell
python powerbi/scripts/build_import_data.py
node powerbi/scripts/generate_pbip.mjs
```

O segundo comando regenera o projeto e grava no Power Query o caminho absoluto correto da máquina atual. Depois, abra `powerbi/DeliveryCenter.pbip` no Power BI Desktop e atualize o modelo.

## Evidências e manutenção

- `data/validacao.json`: baselines reconciliados com os dados completos.
- `validation-report.json`: validação estrutural do PBIR.
- `DeliveryCenter.SemanticModel/definition/tables/FatoDashboard.tmdl`: colunas, partição Import e 18 medidas DAX.
- `scripts/generate_pbip.mjs`: geração determinística das duas páginas e de seus 29 visuais.
- `report-spec.md`: escopo, regras e critérios de aceite.
