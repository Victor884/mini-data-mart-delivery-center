# HTML e CSS dos visuais

O relatório usa sete medidas HTML na tabela `Métricas`, exibidas pelo visual **HTML Content (lite)**. O HTML complementa os visuais nativos; gráficos, tabelas, filtros, navegação e drill-through continuam nativos do Power BI.

## Componentes implementados

- `HTML | KPIs Executivos`: valor, pedidos, ticket, cancelamento e margem;
- `HTML | Saúde Executiva`: leitura resumida dos principais sinais;
- `HTML | KPIs Pedidos`: volume, conclusão, cancelamento e tempos operacionais;
- `HTML | Etapas Operacionais`: preparação, trânsito e ciclo;
- `HTML | KPIs Financeiros`: pagamentos, conciliação, chargeback e diferenças;
- `HTML | KPIs Logística`: conclusão, retentativa, P50/P90 e distância;
- `HTML | Detalhe Pedido`: contexto do pedido no drill-through.

## Regras técnicas

- somente HTML e CSS estáticos;
- sem JavaScript, formulários, hyperlinks ou recursos externos;
- cores sólidas e contraste compatível com o tema claro;
- valores e rótulos explícitos, sem depender exclusivamente de cor;
- CSS inline nas medidas, pois o Power BI não carrega esta folha externa.

Este diretório é a referência legível dos tokens. A fonte executável está em `../DeliveryCenterAnalytics.SemanticModel/definition/tables/Métricas.tmdl`, gerada por `../scripts/generate-pbip.mjs`.
