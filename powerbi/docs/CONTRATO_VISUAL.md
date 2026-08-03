# Contrato visual — redesign 2026

## Aprovação

- Status: **aprovado**.
- Resposta registrada: `sim`.
- Data: 02/08/2026.
- Escopo aprovado: direção visual desktop, continuação mobile e implementação integral do relatório.
- Conceito desktop: [`assets/redesign-desktop-approved.png`](assets/redesign-desktop-approved.png).
- Conceito mobile: [`assets/redesign-mobile-approved.png`](assets/redesign-mobile-approved.png).

Os conceitos são referências de composição. Valores, rótulos, eixos, tabelas, filtros e estados são implementados como elementos editáveis e vinculados ao modelo, nunca como imagem de fundo.

## Evidência protegida

O relatório deve responder, em ordem: qual é o resultado geral, como ele evolui, onde existe desvio e qual registro explica o desvio.

Invariantes que a implementação não pode violar:

- valor transacionado considera pedidos finalizados;
- ticket médio é valor transacionado dividido por pedidos finalizados;
- margem de entrega é monetária e pode ser negativa;
- percentuais são calculados a partir dos numeradores e denominadores, sem média de percentuais;
- entregas usam a última tentativa por pedido quando indicado pelas medidas;
- conciliação mantém uma linha por pedido, sem fanout de pagamentos;
- P50 e P90 são percentis históricos em minutos e não representam SLA;
- o período disponível é de 01/01/2021 a 30/04/2021;
- as 20 relações existentes e suas direções permanecem inalteradas.

## Elementos bloqueados

- Página 16:9 com cabeçalho, navegação superior, trilho de filtros e conteúdo analítico.
- Leitura `resumo → tendência → diagnóstico → detalhe`.
- Quatro KPIs dominantes no topo das páginas principais.
- Linha para séries temporais e barras horizontais para rankings ou categorias extensas.
- Ausência de pizza, donut, velocímetro, 3D, gradientes decorativos e animação ornamental.
- Paleta com neutros claros, azul para foco, teal para desempenho, âmbar para atenção e rosa para desvio.
- Margens, espaçamento e alinhamentos consistentes; valores importantes visíveis sem tooltip.
- Navegação global, limpeza de filtros, drill-through e tooltip de página.
- Tooltip não interativo, pequeno e complementar; detalhamento interativo fica no drill-through.

## Elementos flexíveis

- Medidas exatas das colunas da grade e dos cards.
- Quantidade final de linhas exibidas em cada tabela.
- Pequenos ajustes de tipografia, altura e espaçamento exigidos pelo renderizador do Power BI.
- Uso de cartão nativo ou HTML quando ambos preservarem acessibilidade, consulta e hierarquia.
- Comparação com período anterior apenas quando o contexto possuir base válida; caso contrário, o valor fica ausente, sem inferência.

## Sistema visual

| Papel | Cor | Uso |
|---|---:|---|
| Canvas | `#F4F7FB` | plano de fundo |
| Superfície | `#FFFFFF` | cartões, gráficos e tabelas |
| Texto principal | `#172033` | títulos e valores |
| Texto secundário | `#64748B` | contexto e unidades |
| Borda | `#DDE5EF` | separação discreta |
| Foco | `#2563EB` | série principal e página ativa |
| Desempenho | `#0F766E` | taxa positiva ou comparação secundária |
| Atenção | `#D97706` | P90 e sinais que exigem leitura |
| Desvio | `#BE123C` | cancelamento, chargeback e margem negativa |

Cor nunca é o único portador de significado: sinal, unidade, rótulo e valor permanecem visíveis.

## Continuação mobile

- Viewport conceitual: 390 × 844 px.
- Primeira leitura: período, filtro recolhido, KPIs 2 × 2 e tendência principal.
- Filtros devem abrir em painel e devolver o foco ao visual afetado.
- Alvos de interação de 44–48 px e nenhuma evidência essencial dependente de hover.
- O [`mobileState.json` não recebe edição externa suportada](https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report). A composição mobile aprovada deve ser aplicada no Power BI Desktop/Service com [**Auto-create mobile layout**](https://learn.microsoft.com/en-us/power-bi/create-reports/power-bi-create-mobile-optimized-report-mobile-layout-view) e revisada contra o conceito depois de abrir o PBIP.

## Desvios aprovados

- O conceito mobile é preservado como referência e checklist, mas seu estado interno não é gerado por script porque a Microsoft não dá suporte à edição externa do arquivo de layout móvel.
- Não há KPI “dentro do SLA”: o modelo não contém meta de SLA aprovada. A página usa conclusão de entrega, retentativas e P50/P90 sem renomeá-los como SLA.
