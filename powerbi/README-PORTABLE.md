# Delivery Center — portfólio Dark e Light

> **Status:** as duas variantes PBIP foram implementadas e validadas estruturalmente na branch `agent/power-bi-future-version`. A branch principal e `DeliveryCenterAnalytics.pbip` permanecem inalterados.

Esta entrega usa um único modelo semântico Import e dois relatórios independentes:

- [`DeliveryCenterDark.pbip`](DeliveryCenterDark.pbip): experiência escura orientada à operação logística, com navegação superior;
- [`DeliveryCenterLight.pbip`](DeliveryCenterLight.pbip): experiência clara orientada à visão executiva, com sidebar compacta;
- `DeliveryCenter.SemanticModel`: modelo compartilhado pelos dois relatórios, evitando medidas ou resultados divergentes.

As referências visuais foram usadas como direção de composição, hierarquia e identidade. Categorias, hubs e valores fictícios presentes nos mockups não foram copiados; todos os visuais usam os dados reais do snapshot reconciliado.

## Experiência implementada

### Dark — Performance Logística

- página inicial `Logística`;
- navegação horizontal entre Executivo, Logística e Pagamentos;
- filtros de período, hub e modal no cabeçalho;
- gráfico combinado mensal de entregas concluídas e P50 do ciclo;
- painel HTML/CSS com anel de conclusão, P50, P90 e total de tentativas;
- tabela HTML/CSS de desempenho dos cinco principais hubs, com barras de progresso e cores semânticas;
- paleta azul-marinho, ciano, verde, âmbar e vermelho de exceção.

### Light — Visão Executiva

- página inicial `Executivo`;
- sidebar azul-marinho compacta e navegação nativa;
- filtros de período, hub, canal e status no cabeçalho;
- faixa executiva com quatro KPIs;
- evolução mensal do valor transacionado e ranking de hubs;
- cartões HTML/CSS de margem e tempo de ciclo;
- participação por canal em visual nativo;
- superfícies brancas, tipografia azul-marinho e acentos azul/teal.

### Conteúdo preservado

Os dois projetos mantêm internamente as páginas Executivo, Logística, Pagamentos, Pedidos & Operação e Detalhamento, além de quatro tooltips contextuais. Pedidos e Detalhamento ficam ocultos no menu principal para reproduzir a navegação enxuta das referências, mas continuam disponíveis para evolução e drill-through.

## Modelo e componentes

- 46 colunas e 72 medidas DAX no modelo Import compartilhado;
- 9 páginas internas em cada relatório: 5 analíticas e 4 tooltips;
- 3 destinos visíveis na navegação principal;
- Dark: 84 visuais, 19 segmentações e 12 componentes HTML/CSS;
- Light: 92 visuais, 20 segmentações e 12 componentes HTML/CSS;
- filtros nativos, botões para limpar segmentações e tooltips associados;
- canvas `1440 × 1024`, alinhado à proporção das referências fornecidas;
- visual certificado **HTML Content (lite)** registrado nos dois relatórios.

## Gerar, validar e abrir

Na raiz do repositório:

```powershell
python powerbi/scripts/build_import_data.py
node powerbi/scripts/generate_pbip.mjs
node powerbi/scripts/validate_portable_pbip.mjs
```

O gerador cria as duas variantes e atualiza o parâmetro Power Query `Arquivo Snapshot` para a máquina atual. Depois, abra o modo desejado no Power BI Desktop:

```text
powerbi/DeliveryCenterDark.pbip
powerbi/DeliveryCenterLight.pbip
```

Se solicitado, instale **HTML Content (lite)** por `Obter mais visuais > AppSource` e atualize o modelo. O snapshot `powerbi/data/fato_dashboard.csv` tem aproximadamente 82 MB, não é versionado e pode ser reconstruído deterministicamente.

## Validação executada

| Controle | Dark | Light |
|---|---:|---:|
| PBIR | 0 erros | 0 erros |
| Páginas internas / tooltips | 9 / 4 | 9 / 4 |
| Visuais | 84 | 92 |
| Componentes HTML/CSS | 12 | 12 |
| Segmentações | 19 | 20 |
| Navegadores / limpar filtros | 5 / 5 | 5 / 5 |
| Limites do canvas | aprovado | aprovado |
| Referências de campos e medidas | aprovado | aprovado |

O `powerbi-report-author` retorna 12 avisos esperados em cada relatório porque não conhece o schema interno do visual externo HTML Content. O identificador está registrado em `publicCustomVisuals`, e não houve erro de PBIR.

## Baselines reconciliados

- 368.999 pedidos e 352.020 finalizados;
- R$ 37.481.358,97 em valor transacionado finalizado;
- R$ 37.304.232,78 em valor pago confirmado;
- 96,60% de conciliação;
- 97,95% de conclusão de entrega;
- 5,22% de múltiplas tentativas;
- P50/P90 logístico de 42,18 / 83,17 minutos;
- margem agregada de entrega de -R$ 434.905,63.

## Arquivos de manutenção

- `scripts/build_import_data.py`: constrói e reconcilia o snapshot;
- `scripts/generate_pbip.mjs`: gera o modelo e o relatório-base transitório;
- `scripts/generate_design_modes.mjs`: materializa os layouts Dark e Light;
- `scripts/validate_portable_pbip.mjs`: valida os dois relatórios e o modelo compartilhado;
- `validation-report.json`: evidência resumida da validação;
- `report-spec.md`: regras, decisões e critérios de aceite.

## Próxima etapa

Abrir ambos os `.pbip` no Power BI Desktop, atualizar o snapshot e homologar visualmente fontes, quebras de texto, HTML Content, navegação, tooltips, filtros cruzados e drill-through. A validação de arquivos confirma a estrutura, mas não substitui a inspeção do motor de renderização do Desktop.
