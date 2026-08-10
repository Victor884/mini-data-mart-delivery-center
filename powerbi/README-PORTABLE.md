# Delivery Center — versão portátil

> **Status:** implementação estrutural concluída na branch `agent/power-bi-future-version`. Esta versão continua isolada e não substitui `DeliveryCenterAnalytics.pbip` enquanto a homologação visual no Power BI Desktop não for encerrada.

O projeto [`DeliveryCenter.pbip`](DeliveryCenter.pbip) é uma alternativa Import reproduzível a partir dos CSVs completos do repositório. Ele permite demonstrar o portfólio sem depender do PostgreSQL ou do Docker e preserva as regras do `mart`: uma linha por pedido, última tentativa de entrega e pagamentos agregados antes da união, sem fanout financeiro.

## Conteúdo entregue

- cinco páginas analíticas: Visão Executiva, Pedidos & Operação, Financeiro & Conciliação, Entregas & Qualidade e Detalhamento;
- quatro páginas ocultas de tooltip, associadas aos principais gráficos;
- 46 colunas e 57 medidas DAX no modelo Import;
- 87 visuais, incluindo 20 segmentações, cinco navegadores e cinco botões para limpar filtros;
- 11 componentes HTML/CSS com o visual certificado **HTML Content (lite)**: KPIs, saúde operacional, etapas do ciclo, detalhe do pedido e tooltips;
- tema dark profissional, títulos e unidades padronizados e `altText` nos componentes HTML;
- parâmetro Power Query `Arquivo Snapshot`, atualizado pelo gerador para a máquina atual.

## Preparar e abrir

Na raiz do repositório:

```powershell
python powerbi/scripts/build_import_data.py
node powerbi/scripts/generate_pbip.mjs
node powerbi/scripts/validate_portable_pbip.mjs
```

Depois, abra `powerbi/DeliveryCenter.pbip` no Power BI Desktop e atualize o modelo. Caso o visual não seja carregado automaticamente, instale **HTML Content (lite)** pelo AppSource.

O snapshot `powerbi/data/fato_dashboard.csv` tem aproximadamente 82 MB, não é versionado e pode ser reconstruído deterministicamente. O arquivo `powerbi/data/validacao.json` permanece versionado como evidência dos baselines.

## Validação executada

| Controle | Resultado |
|---|---:|
| Reconciliação dos dados completos | aprovado |
| Páginas / tooltips | 5 / 4 |
| Visuais / componentes HTML | 87 / 11 |
| Colunas / medidas DAX | 46 / 57 |
| Referências de campos dos visuais | aprovado |
| PBIR nativo | 0 erros |
| Avisos do validador | 11 esperados — schema externo do HTML Content |

O comando `powerbi-report-author validate` não conhece o schema interno do visual de terceiros e, por isso, registra um aviso por componente HTML. O visual está declarado em `publicCustomVisuals` com o mesmo identificador já utilizado na versão principal.

## Baselines reconciliados

- 368.999 pedidos e 352.020 finalizados;
- R$ 37.481.358,97 em valor transacionado finalizado;
- 400.381 transações pagas e R$ 37.304.232,78 em valor pago;
- 96,60% de conciliação e R$ 465.576,41 de diferença absoluta;
- 438 chargebacks, totalizando R$ 7.160,50;
- 97,95% de conclusão de entrega e 5,22% de múltiplas tentativas.

## Evidências e manutenção

- `data/validacao.json`: baselines reconciliados;
- `validation-report.json`: última validação estrutural registrada;
- `DeliveryCenter.SemanticModel/definition/tables/FatoDashboard.tmdl`: modelo, medidas DAX e partição Import;
- `scripts/build_import_data.py`: construção e reconciliação do snapshot;
- `scripts/generate_pbip.mjs`: geração determinística do PBIP/PBIR/TMDL;
- `scripts/validate_portable_pbip.mjs`: checagem local de páginas, campos, navegação, filtros e HTML;
- `report-spec.md`: escopo, regras e critério de aceite.

## Pendência antes do merge

Abrir esta branch no Power BI Desktop, atualizar o parâmetro/snapshot e homologar visualmente as cinco páginas, os quatro tooltips, a navegação, a limpeza de filtros e o comportamento do HTML Content. A automação de UI do Windows não ficou disponível nesta sessão, portanto essa etapa não foi marcada como concluída sem evidência.
