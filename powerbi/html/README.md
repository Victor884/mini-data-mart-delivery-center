# HTML e CSS dos visuais

Os sete componentes HTML do relatório são medidas DAX na tabela `Métricas` e são exibidos pelo visual certificado **HTML Content (lite)**.

O Power BI não carrega uma folha CSS externa no relatório. Por isso, as medidas usam CSS inline e este diretório mantém a referência legível dos tokens e componentes usados. A fonte de verdade executável está em `../DeliveryCenterAnalytics.SemanticModel/definition/tables/Métricas.tmdl`; a fonte geradora está em `../scripts/generate-pbip.mjs`.

Componentes implementados:

- faixa de KPIs executivos;
- ranking dos cinco hubs por valor;
- faixa de KPIs logísticos;
- ranking de hubs por retentativa;
- faixa de KPIs financeiros;
- distribuição dos status de conciliação;
- cabeçalho da página de drill-through.

Somente HTML e CSS estáticos são emitidos. Scripts, imagens externas, formulários e hyperlinks ficam desabilitados no visual.
