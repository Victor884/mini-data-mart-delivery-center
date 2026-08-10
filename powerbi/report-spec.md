# Especificação — Delivery Center Dark e Light

## Escopo e isolamento

- Branch de trabalho: `agent/power-bi-future-version`.
- Projetos: `DeliveryCenterDark.pbip` e `DeliveryCenterLight.pbip`.
- Modelo compartilhado: `DeliveryCenter.SemanticModel` em modo Import.
- Fonte portátil: `powerbi/data/fato_dashboard.csv`, gerada dos CSVs completos.
- Restrição: não modificar nem substituir `DeliveryCenterAnalytics.pbip` ou a versão atual da branch principal.
- Grão: uma linha por pedido, última tentativa de entrega e pagamentos previamente agregados por pedido.

## Direção visual

### Dark

- referência principal: dashboard `Performance Logística` fornecido pelo usuário;
- canvas `1440 × 1024`, fundo azul-marinho, superfícies profundas e bordas discretas;
- navegação horizontal no topo;
- filtros no cabeçalho;
- gráfico combinado dominante, painel circular de conclusão e tabela de hubs;
- ciano para informação, verde para saúde, âmbar para atenção e vermelho para exceção.

### Light

- referência principal: dashboard `Delivery Center | Visão Executiva` fornecido pelo usuário;
- canvas `1440 × 1024`, fundo cinza muito claro e cartões brancos;
- sidebar azul-marinho compacta;
- filtros no cabeçalho e faixa de KPIs;
- tendência mensal, ranking por hub, margem, ciclo e participação por canal;
- azul para destaque primário e teal para indicadores operacionais positivos.

## Arquitetura das páginas

1. **Executivo** — destino principal do modo Light.
2. **Logística** — destino principal do modo Dark.
3. **Pagamentos** — análise financeira e conciliação.
4. **Pedidos & Operação** — página analítica preservada e oculta na navegação principal.
5. **Detalhamento** — página auditável preservada e oculta na navegação principal.
6. **Quatro tooltips** — Comercial, Pedidos, Financeiro e Entregas.

O menu principal exibe somente Executivo, Logística e Pagamentos para manter a navegação equivalente às referências. Páginas ocultas continuam no projeto e não perdem visuais ou regras.

## Regras de negócio preservadas

- Percentis são calculados dinamicamente em DAX no detalhe válido.
- Taxas preservam numerador e denominador no contexto do filtro.
- Pagamentos são agregados antes da união com pedidos, evitando fanout.
- Apenas pagamentos `PAID` compõem o valor pago.
- `CHARGEBACK` e `AWAITING` permanecem guardrails separados.
- A conciliação usa tolerância de R$ 0,01.
- A última tentativa usa `delivery_id`, pois a origem não possui timestamp por tentativa.
- O P90 é um percentil descritivo, não uma meta de SLA.
- Nenhum valor, região ou meta fictícia dos mockups foi incorporado ao modelo.

## Critérios de aceite estruturais

- dois arquivos PBIP independentes apontando para o mesmo modelo semântico;
- Dark ativo em Logística e Light ativo em Executivo;
- 46 colunas e 72 medidas DAX;
- 9 páginas internas por relatório, sendo 4 tooltips;
- 84 visuais no Dark e 92 no Light;
- 12 componentes HTML/CSS em cada modo;
- filtros com altura mínima para não cortar títulos ou seletores;
- todos os visuais contidos no canvas;
- campos e medidas referenciados existentes no modelo;
- zero erros no validador PBIR;
- baselines numéricos preservados;
- homologação visual final no Power BI Desktop antes de avaliar merge.
