# Delivery Center Analytics — Power BI Project

Projeto Power BI em formato PBIP/PBIR, versionável como texto, conectado às views PostgreSQL do schema `mart`.

## O que está pronto

- modelo semântico estrela em TMDL;
- 6 dimensões, 4 fatos e 20 relacionamentos unidirecionais;
- conexão Import com parâmetros de servidor e banco;
- 40 medidas DAX, incluindo 7 componentes HTML/CSS;
- tema visual JSON;
- 4 páginas, 36 visuais, slicers e drill-through por pedido;
- validação de 28 indicadores contra o PostgreSQL;
- gerador determinístico para reconstruir os artefatos.

## Abrir no Power BI Desktop

1. Suba e carregue o banco conforme o README da raiz.
2. Use uma versão atual do Power BI Desktop com PBIP, PBIR e TMDL habilitados.
3. Abra `DeliveryCenterAnalytics.pbip`.
4. Na primeira atualização, selecione autenticação de banco de dados e informe o usuário e a senha localmente.
5. Se os blocos HTML aparecerem indisponíveis, instale **HTML Content (lite)** em `Obter mais visuais > AppSource` e reabra o projeto.
6. Clique em `Atualizar` e confira os baselines de `docs/VALIDACAO.md`.

Parâmetros padrão:

| Parâmetro | Valor |
|---|---|
| `Servidor PostgreSQL` | `localhost:5432` |
| `Banco PostgreSQL` | `mini_datamart_delivery` |

Nenhuma credencial é armazenada no repositório.

## Estrutura

```text
powerbi/
├── DeliveryCenterAnalytics.pbip
├── DeliveryCenterAnalytics.Report/
│   ├── definition/                 # PBIR: páginas e visuais
│   └── StaticResources/            # tema JSON
├── DeliveryCenterAnalytics.SemanticModel/
│   └── definition/                 # TMDL: tabelas, medidas e relações
├── docs/                            # arquitetura, páginas, DAX e QA
├── html/                            # referência visual do CSS
├── scripts/generate-pbip.mjs        # geração determinística
└── validation/                      # baselines SQL
```

## Documentação

- [Arquitetura e relacionamentos](docs/ARQUITETURA.md)
- [Páginas e interações](docs/PAGINAS.md)
- [Medidas DAX](docs/MEDIDAS.md)
- [Validação dos números](docs/VALIDACAO.md)
- [HTML e CSS](html/README.md)

## Regenerar

Requer Node.js 20 ou superior:

```powershell
node powerbi\scripts\generate-pbip.mjs
```

O script substitui somente os dois diretórios gerados e o arquivo `.pbip`. Documentação, CSS e validações são preservados.

Depois, valide:

```powershell
powerbi-report-author validate powerbi\DeliveryCenterAnalytics.Report --pretty
```

## Decisão sobre HTML/CSS

O Power BI não possui um visual HTML genérico nativo. Este projeto usa o visual público certificado **HTML Content (lite)** (`htmlContent443BE3AD55E043BF878BED274D3A6865`). As medidas emitem apenas HTML estático e CSS inline; scripts, hyperlinks e recursos externos permanecem desabilitados.

Os gráficos analíticos, tabelas e filtros continuam nativos. Essa composição mantém cross-filter, drill-through, exportação resumida e uma alternativa auditável aos componentes HTML.
