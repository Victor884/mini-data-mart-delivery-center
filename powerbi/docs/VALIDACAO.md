# Validação do relatório e dos números

Data da execução: **2 de agosto de 2026**.

## Resultado final

- 43 de 43 baselines SQL: **OK**;
- 10 de 10 consultas M executadas no PostgreSQL: **OK**;
- validação estática própria: **OK**;
- schemas oficiais PBIR/JSON: **0 erros**;
- 11 tabelas, 20 relacionamentos, 54 medidas, 9 páginas e 97 visuais;
- 5 páginas visíveis e 4 páginas de tooltip em `320 × 240`;
- 7 componentes HTML/CSS, 5 navegadores e 5 botões para limpar slicers;
- todos os 97 visuais dentro do canvas, sem sobreposição geométrica;
- navegadores sem páginas ocultas/tooltips e referências de tooltip válidas;
- credenciais armazenadas: **nenhuma**.

O validador oficial retorna sete avisos `PBIR_VISUAL_TYPE_UNKNOWN`, um para cada instância de **HTML Content (lite)**. É um aviso de catálogo do CLI para o visual customizado; não há erro de schema ou estrutura.

## Baselines principais

| Indicador | Resultado validado |
|---|---:|
| Pedidos criados | 368.999 |
| Pedidos finalizados | 352.020 |
| Pedidos cancelados | 16.979 |
| Taxa de cancelamento | 4,60% |
| Valor transacionado | R$ 37.481.358,97 |
| Ticket médio | R$ 106,48 |
| Margem de entrega | -R$ 434.905,63 |
| Tempo de produção médio | 61,71 min |
| Tempo de trânsito médio | 46,55 min |
| Tempo de ciclo P50 / P90 | 42,18 / 83,17 min |
| Pedidos com entrega | 358.654 |
| Taxa de entrega concluída | 97,95% |
| Taxa de múltiplas tentativas | 5,22% |
| Distância média entregue | 10,11 km |
| Transações pagas | 400.381 |
| Valor pago | R$ 37.304.232,78 |
| Taxa de conciliação | 96,60% |
| Diferença absoluta de conciliação | R$ 465.576,41 |
| Chargebacks | 438 / R$ 7.160,50 |

Também foram validadas as medidas de mês anterior, variações absoluta e percentual e participações usadas nos tooltips.

## Integridade semântica

- os 20 relacionamentos continuam `1:*`, unidirecionais e sem fatos relacionadas diretamente;
- as fórmulas originais de negócio foram preservadas;
- os acréscimos DAX servem a comparação temporal, participação, etapas e contexto de tooltip;
- percentis são calculados sobre observações, não somados nem promediados;
- pagamentos e conciliação permanecem protegidos contra fanout;
- P90 permanece descritivo, sem ser classificado como SLA.

## Como repetir

```powershell
node powerbi\scripts\generate-pbip.mjs
node powerbi\scripts\validate-pbip.mjs
node powerbi\scripts\validate-m-queries.mjs
powerbi-report-author validate powerbi\DeliveryCenterAnalytics.Report --pretty
powerbi-report-author preview-pages powerbi\DeliveryCenterAnalytics.Report --with-derived
powerbi-report-author preview-visuals powerbi\DeliveryCenterAnalytics.Report --with-derived
powerbi-report-author preview-themes powerbi\DeliveryCenterAnalytics.Report --with-derived
```

Baselines PostgreSQL:

```powershell
Get-Content powerbi\validation\validate_powerbi_baseline.sql -Raw -Encoding utf8 |
  docker exec -i mini_datamart_postgres psql `
    -v ON_ERROR_STOP=1 `
    -U datamart_user `
    -d mini_datamart_delivery `
    -P pager=off
```

## Limitação e homologação final

O ambiente de geração não possui Power BI Desktop. Portanto, estrutura, consultas e números têm confiança alta, enquanto a inspeção do render final tem confiança média até a abertura no Desktop.

Checklist de homologação:

1. abrir `DeliveryCenterAnalytics.pbip` e informar as credenciais do PostgreSQL;
2. atualizar o modelo e conferir os baselines;
3. confirmar o carregamento do HTML Content (lite);
4. testar filtros cruzados, limpar filtros, navegação, tooltips e drill-through;
5. verificar valores truncados em 100% de zoom e tela de apresentação;
6. usar `Auto-create mobile layout` e ajustar conforme o conceito aprovado;
7. publicar somente após configurar gateway, atualização, política do visual customizado e eventual RLS.
