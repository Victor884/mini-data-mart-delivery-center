# Delivery Center — especificação da versão portátil

## Objetivo e isolamento

- Formato: projeto PBIP/PBIR paralelo, com modelo semântico Import.
- Branch: `agent/power-bi-future-version`.
- Fonte: `powerbi/data/fato_dashboard.csv`, gerado deterministicamente dos CSVs completos em `data/raw`.
- Grão: uma linha por pedido, com última tentativa de entrega e pagamentos previamente agregados por pedido.
- Uso: demonstração e validação local quando PostgreSQL ou Docker não estiverem disponíveis.
- Restrição: não modifica nem substitui `DeliveryCenterAnalytics.pbip`; o schema `mart` continua sendo a fonte canônica da versão principal.

## Páginas implementadas

1. **Visão Executiva**: KPIs HTML, tendência comercial, ranking de hubs, mix de canais, saúde operacional e lojas de maior impacto.
2. **Pedidos & Operação**: KPIs HTML, volume diário, composição por status, decomposição do ciclo e operação por hub.
3. **Financeiro & Conciliação**: KPIs HTML, valores transacionado/pago, resultado por segmento e hub, chargebacks e conciliação.
4. **Entregas & Qualidade**: KPIs HTML, percentis do ciclo, conclusão por modal, retentativas e matriz de qualidade por hub.
5. **Detalhamento**: cabeçalho HTML do pedido e tabela auditável com atributos comerciais, financeiros e logísticos.

Quatro páginas ocultas complementam os gráficos com tooltips HTML contextuais contendo período/categoria, valor atual, período anterior, variação absoluta, variação percentual e participação no total quando aplicável.

## Experiência e identidade visual

- canvas `1440 × 810`, grade fixa, fundo azul-marinho e contraste alto;
- navegação lateral nativa em todas as páginas analíticas;
- quatro filtros no topo de cada página, com botão nativo para limpar todas as segmentações;
- HTML/CSS reservado a resumos e tooltips; gráficos, tabelas, filtros e ações permanecem nativos;
- cores semânticas consistentes: ciano/verde para saúde, vermelho para exceções, âmbar para atenção e roxo/azul para comparação;
- P90 identificado como percentil descritivo, nunca como meta de SLA.

## Modelo e regras preservadas

- Percentis são calculados dinamicamente em DAX no detalhe válido, nunca pela média de percentis agregados.
- Taxas usam numerador e denominador no contexto do filtro.
- Pagamentos são agregados antes da união com pedidos para impedir fanout.
- Apenas pagamentos `PAID` compõem valor pago; `CHARGEBACK` e `AWAITING` são guardrails separados.
- A conciliação segue a tolerância de R$ 0,01 definida no `mart`.
- A última tentativa é determinada por `delivery_id`, pois a origem não possui timestamp por tentativa.
- O parâmetro Power Query `Arquivo Snapshot` centraliza o caminho local do arquivo Import.

## Critérios de aceite

- cinco páginas analíticas e quatro tooltips na ordem definida;
- 46 colunas, 57 medidas DAX, 87 visuais e 11 componentes HTML/CSS;
- todos os campos usados pelos visuais existentes no modelo;
- filtros, navegação e limpeza configurados em todas as páginas analíticas;
- validação determinística de dados e estrutura sem erro;
- homologação visual final no Power BI Desktop antes do merge.
