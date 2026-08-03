# Contrato visual — dark premium 2026

## Aprovação

- Status: **aprovado**.
- Resposta registrada: `pode aplicar`.
- Data: 02/08/2026.
- Escopo: identidade dark premium, menu lateral, cards, gráficos e continuidade mobile.
- Referências fornecidas pelo usuário:
  - [`assets/reference-dark-crm.png`](assets/reference-dark-crm.png);
  - [`assets/reference-dark-admin.png`](assets/reference-dark-admin.png);
  - [`assets/reference-dark-neon.png`](assets/reference-dark-neon.png).
- Continuidade mobile: estrutura do conceito [`assets/redesign-mobile-approved.png`](assets/redesign-mobile-approved.png), recolorida e reorganizada com os tokens dark.

As referências são estudos de princípios, não modelos para cópia. Marca, conteúdo fictício, avatares, ícones decorativos e dados rasterizados não entram no relatório.

## Evidência protegida

O relatório deve responder, nesta ordem: qual é o resultado, como ele evolui, onde existe desvio e qual registro explica o desvio.

Invariantes:

- valor transacionado considera pedidos finalizados;
- ticket médio é valor transacionado dividido por pedidos finalizados;
- margem de entrega é monetária e pode ser negativa;
- percentuais usam numerador e denominador no contexto atual;
- logística usa a última tentativa quando a medida exige desfecho por pedido;
- conciliação mantém uma linha por pedido, sem fanout;
- P50 e P90 são percentis históricos, não SLA;
- período disponível: 01/01/2021 a 30/04/2021;
- as 20 relações e suas direções permanecem inalteradas.

## Elementos bloqueados

- canvas 16:9 com sidebar escura fixa e conteúdo analítico à direita;
- menu vertical com página ativa destacada em roxo/ciano;
- filtros na sidebar e ação explícita para limpar o contexto;
- KPIs no topo, tendência no centro, diagnóstico e tabela na base;
- superfícies azul-marinho, bordas frias discretas e sombras profundas;
- ciano como foco principal, roxo como comparação e rosa/âmbar para risco ou atenção;
- linhas temporais suaves e barras horizontais para rankings;
- dados, títulos, eixos, rótulos, tabelas e filtros editáveis e vinculados ao modelo;
- tooltips de página, filtros cruzados e drill-through por pedido;
- valores essenciais visíveis sem depender de hover.

## Elementos flexíveis

- espaçamento exato, tamanho final das fontes e largura relativa dos cards;
- quantidade de linhas mostradas nas tabelas;
- intensidade da sombra e saturação dos acentos dentro dos limites de contraste;
- pequenos ajustes exigidos pelo renderizador do Power BI.

## Paleta

| Papel | Cor | Uso |
|---|---:|---|
| Canvas | `#090D18` | fundo geral |
| Sidebar | `#101627` | navegação e filtros |
| Superfície | `#141B2F` | gráficos, tabelas e painéis |
| Superfície elevada | `#1A2340` | KPIs e estados de seleção |
| Texto | `#F5F7FF` | títulos e valores |
| Texto secundário | `#9BA8C7` | eixos, contexto e unidades |
| Borda | `#293451` | separação discreta |
| Foco | `#22D3EE` | série principal e ícones funcionais |
| Comparação | `#8B5CF6` | segunda série e página ativa |
| Apoio | `#3B82F6` | séries auxiliares |
| Destaque | `#D946EF` | destaque pontual, nunca estado de erro |
| Favorável | `#10B981` | resultado positivo |
| Atenção | `#F59E0B` | P90 e leitura cuidadosa |
| Risco | `#FB7185` | cancelamento, chargeback e margem negativa |

Cor nunca é o único portador de significado: rótulo, sinal, unidade e valor permanecem visíveis.

## Continuação mobile

- viewport conceitual: 390 × 844 px;
- primeira dobra: título, período ativo, KPIs prioritários e tendência principal;
- menu lateral vira drawer e filtros viram painel recolhível;
- controles devem devolver o foco ao visual afetado após aplicar, cancelar ou limpar;
- alvos de interação de 44–48 px e nenhuma evidência essencial dependente de hover;
- o layout mobile nativo é aplicado no Desktop/Service, pois [`mobileState.json` não oferece edição externa suportada](https://learn.microsoft.com/en-us/power-bi/developer/projects/projects-report).

## Desvios deliberados das referências

- donuts, medidores e barras decorativas não são copiados quando uma barra ou tabela permite comparação mais precisa;
- não há busca global, notificações, avatar ou download fictício sem função no relatório;
- glow e gradientes atmosféricos foram substituídos por acentos sólidos e sombra funcional;
- nenhuma animação ornamental foi adicionada;
- nenhum KPI de SLA foi criado sem meta aprovada.
