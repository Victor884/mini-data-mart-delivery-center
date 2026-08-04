# Delivery Center — especificação do relatório Power BI

- Formato: projeto PBIP com modelo semântico Import.
- Fonte: `powerbi/data/fato_dashboard.csv`, gerado dos CSVs completos em `data/raw`.
- Página 1: Visão Executiva, tema claro, filtros de período, hub, canal e status.
- Página 2: Performance Logística, tema escuro, filtros de período, hub e modal.
- Percentis: calculados dinamicamente em DAX no detalhe válido, nunca pela média de percentis agregados.
- Taxas: calculadas por numerador/denominador no contexto do filtro.
