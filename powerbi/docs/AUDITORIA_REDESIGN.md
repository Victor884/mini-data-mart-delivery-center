# Auditoria do relatório antes do redesign

## Escopo auditado

- 4 páginas e 36 visuais;
- 11 tabelas, 20 relações unidirecionais e 40 medidas;
- filtros, campos de tooltip, drill-through, tema e custom visual HTML Content (lite);
- cardinalidade e distribuição das quatro views detalhadas do schema `mart`;
- baselines SQL existentes e compatibilidade do PBIR com o validador oficial.

## Problemas encontrados e tratamento

| Problema | Impacto | Correção definida |
|---|---|---|
| Quatro filtros comprimidos no cabeçalho | nomes e estados selecionados ficam cortados | trilho lateral dedicado, controles mais largos e botão de limpeza |
| Páginas com a mesma hierarquia visual | leitura pouco orientada à decisão | páginas especializadas com resumo, foco, diagnóstico e detalhe |
| Cinco KPIs no mesmo strip estreito | valores perdem destaque | quatro KPIs principais e indicadores secundários em painel próprio |
| Ranking de hubs em HTML | menor capacidade nativa de seleção e drill-through | barra horizontal nativa, ordenada e com participação no tooltip |
| Donut com 15 meios de pagamento | comparação imprecisa e legenda extensa | barra horizontal ordenada |
| Navegação apenas no detalhe | fluxo entre páginas depende das abas inferiores | page navigator global e botão Voltar no drill-through |
| Ausência de limpar filtros | estado analítico difícil de desfazer | ação nativa `ClearAllSlicers` em cada página principal |
| Tooltip apenas padrão | pouco contexto para diagnóstico | página oculta de tooltip e medidas de comparação/participação |
| Duas medidas HTML começam com `RETURN` sem `VAR` | DAX inválido no Power BI | expressão HTML direta e regra de validação específica |
| Gradientes nos rankings HTML | cor decorativa e contraste inconsistente | cores sólidas com papéis semânticos |
| Tema escuro original sem hierarquia suficiente | cards e canvas pareciam uma única massa visual | dark premium com três níveis de superfície, sidebar e acentos funcionais |
| Títulos descritivos, pouco orientados à pergunta | baixa hierarquia narrativa | título, subtítulo e propósito por página |
| Ausência de meta de SLA no modelo | risco de interpretação incorreta | não criar `% no SLA`; documentar P50/P90 como percentis |

## Evidência de cardinalidade

- 120 dias, de 01/01/2021 a 30/04/2021;
- 32 hubs, 480 lojas e 39 canais;
- 15 meios de pagamento;
- 2 status de pedido;
- 6 status de conciliação;
- 3 modalidades de entregador, incluindo “não informado”.

Essas distribuições justificam linha diária para tendência, barras horizontais para hubs/canais/pagamentos, cartões para status binários e tabelas para consulta de lojas e pedidos.

## Alterações semânticas permitidas

As medidas e relações existentes devem ser preservadas. Novas medidas podem ser adicionadas exclusivamente para tooltip, participação e comparação, com descrição, pasta e validação. Nenhuma medida existente pode ser redefinida para produzir um valor diferente.

## Resultado implementado

- 5 páginas analíticas visíveis e 4 tooltips ocultos;
- 102 visuais em grade, incluindo cinco formas de fundo para a sidebar;
- 54 medidas, sendo 7 HTML e 47 analíticas/contextuais;
- 20 relações preservadas, todas unidirecionais;
- navegação global, limpeza de slicers e drill-through por pedido;
- rankings migrados para barras horizontais nativas;
- tema dark premium, estados de seleção e texto alternativo em todos os visuais;
- 43 baselines e 10 consultas M validados no PostgreSQL;
- nenhum KPI de SLA inventado.
