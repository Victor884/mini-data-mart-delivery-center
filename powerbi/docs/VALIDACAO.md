# Validação do relatório e dos números

Data da execução: **2 de agosto de 2026**.

## Resultado

- 28 de 28 baselines SQL: **OK**.
- 10 de 10 consultas M executadas no PostgreSQL: **OK**.
- Validação estrutural PBIR: **0 erros**.
- Schemas oficiais PBIR/JSON: acessíveis e válidos.
- 4 páginas e 36 visuais reconhecidos pelo inventário do validador.
- 1 tema customizado registrado e reconhecido.
- Credenciais armazenadas no projeto: **nenhuma**.

O validador retorna sete avisos `PBIR_VISUAL_TYPE_UNKNOWN`, um para cada instância de HTML Content (lite). Isso é esperado: o catálogo do CLI reconhece os visuais nativos, mas não resolve o tipo do visual público do AppSource durante a análise estática.

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
| Tempo de ciclo P50 | 42,18 min |
| Tempo de ciclo P90 | 83,17 min |
| Pedidos com entrega | 358.654 |
| Taxa de entrega concluída | 97,95% |
| Taxa de múltiplas tentativas | 5,22% |
| Distância média entregue | 10,11 km |
| Transações pagas | 400.381 |
| Valor pago | R$ 37.304.232,78 |
| Taxa de conciliação | 96,60% |
| Diferença absoluta de conciliação | R$ 465.576,41 |
| Chargebacks | 438 / R$ 7.160,50 |

## Como repetir

Banco e dados:

```powershell
Get-Content powerbi\validation\validate_powerbi_baseline.sql -Raw -Encoding utf8 |
  docker exec -i mini_datamart_postgres psql `
    -v ON_ERROR_STOP=1 `
    -U datamart_user `
    -d mini_datamart_delivery `
    -P pager=off
```

Estrutura PBIR:

```powershell
powerbi-report-author validate powerbi\DeliveryCenterAnalytics.Report --pretty
powerbi-report-author preview-pages powerbi\DeliveryCenterAnalytics.Report --pretty
powerbi-report-author preview-visuals powerbi\DeliveryCenterAnalytics.Report --pretty
powerbi-report-author preview-themes powerbi\DeliveryCenterAnalytics.Report --pretty
```

## Metodologia

- A consulta de validação parte das views detalhadas, assim como as medidas DAX.
- Cada taxa é recalculada com seu numerador e denominador.
- Percentis são calculados sobre as observações de pedido; percentis de grupos não são somados nem promediados.
- Valores financeiros admitem tolerância de R$ 0,01.
- Contagens exigem igualdade exata.
- A conciliação usa uma linha por pedido para impedir fanout de pagamentos.

## Limitação restante

O ambiente usado para gerar o projeto não possui Power BI Desktop. Assim, a estrutura PBIP/PBIR e os dados foram validados, mas o refresh do modelo TMDL e a renderização final do visual HTML ainda precisam de uma abertura no Desktop. A checagem final deve:

1. abrir `DeliveryCenterAnalytics.pbip`;
2. informar as credenciais do PostgreSQL;
3. confirmar o carregamento do HTML Content (lite);
4. atualizar o modelo;
5. comparar os cartões com esta tabela;
6. testar filtros, cross-filter e drill-through;
7. publicar somente depois de definir gateway, RLS e política do visual customizado.
