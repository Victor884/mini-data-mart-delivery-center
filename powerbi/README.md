# Delivery Center Analytics — Power BI Project

Projeto Power BI em formato PBIP/PBIR, versionável como texto, conectado às views PostgreSQL do schema `mart`. A versão atual foi reformulada como peça de portfólio, com hierarquia visual, navegação e contexto analítico consistentes.

## Entrega atual

- modelo estrela em TMDL com 6 dimensões, 4 fatos e 20 relacionamentos `1:*` unidirecionais;
- conexão Import parametrizada, sem credenciais versionadas;
- 54 medidas DAX, incluindo 7 componentes HTML/CSS;
- 5 páginas analíticas visíveis e 4 páginas ocultas de tooltip;
- 97 visuais: KPIs, linhas, barras horizontais, tabelas, filtros, botões e navegação;
- tema claro `DeliveryCenterPortfolio-20260802.json`;
- drill-through por pedido e botão nativo de retorno;
- tooltips com contexto, período anterior, variação absoluta/percentual e participação;
- gerador determinístico e três níveis de validação.

## Abrir no Power BI Desktop

1. Suba e carregue o PostgreSQL conforme o README da raiz.
2. Use uma versão atual do Power BI Desktop com PBIP, PBIR e TMDL habilitados.
3. Abra `DeliveryCenterAnalytics.pbip`.
4. Na primeira atualização, escolha autenticação de banco de dados e informe as credenciais localmente.
5. Se necessário, instale **HTML Content (lite)** por `Obter mais visuais > AppSource`.
6. Atualize o modelo e confira os valores de `docs/VALIDACAO.md`.

| Parâmetro | Valor padrão |
|---|---|
| `Servidor PostgreSQL` | `localhost:5432` |
| `Banco PostgreSQL` | `mini_datamart_delivery` |

## Estrutura

```text
powerbi/
├── DeliveryCenterAnalytics.pbip
├── DeliveryCenterAnalytics.Report/       # PBIR: páginas, visuais e tema
├── DeliveryCenterAnalytics.SemanticModel/# TMDL: consultas, relações e DAX
├── docs/                                  # arquitetura, auditoria, páginas e QA
│   └── assets/                            # conceitos desktop/mobile aprovados
├── html/                                  # referência dos tokens CSS
├── scripts/                               # geração e validadores
└── validation/                            # baselines SQL
```

## Documentação

- [Auditoria do redesign](docs/AUDITORIA_REDESIGN.md)
- [Contrato visual aprovado](docs/CONTRATO_VISUAL.md)
- [Arquitetura e relacionamentos](docs/ARQUITETURA.md)
- [Páginas, filtros e interações](docs/PAGINAS.md)
- [Catálogo de medidas DAX](docs/MEDIDAS.md)
- [Validação estrutural e numérica](docs/VALIDACAO.md)
- [HTML e CSS](html/README.md)

## Regenerar e validar

Requer Node.js 20 ou superior:

```powershell
node powerbi\scripts\generate-pbip.mjs
node powerbi\scripts\validate-pbip.mjs
node powerbi\scripts\validate-m-queries.mjs
powerbi-report-author validate powerbi\DeliveryCenterAnalytics.Report --pretty
```

O gerador reconstrói somente os artefatos PBIP/PBIR/TMDL. Documentação, conceitos e validações permanecem preservados.

## Decisões preservadas

O redesign não alterou os 20 relacionamentos, o grão das tabelas nem as medidas existentes de negócio. As medidas adicionadas servem a comparação temporal, participação, tooltips e leitura de etapas. P90 continua sendo um percentil descritivo, não um SLA; nenhum alvo foi inventado sem regra aprovada.

O visual HTML customizado emite apenas conteúdo estático. Os elementos que exigem interação ou auditabilidade continuam nativos, mantendo filtros cruzados, drill-through e exportação.
