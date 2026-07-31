# Mini Data Mart - Delivery Center 🚀

Este projeto consiste na estruturação de um **Data Warehouse** e de **Data Marts** analíticos utilizando dados operacionais de um centro de distribuição e entregas (Delivery Center). 

O objetivo principal é demonstrar competência em **Engenharia de Dados (ELT)**, **Modelagem Dimensional (Star Schema)**, **SQL Avançado (PostgreSQL)** e **Visualização de Dados (Power BI)**.

---

## 🎯 Objetivo do Projeto

Criar um projeto robusto de BI e SQL para provar a capacidade de:
* Modelar dados de forma eficiente para consultas analíticas (reduzindo complexidade de Joins).
* Definir e calcular métricas operacionais e financeiras de negócio (SLA de entregas, faturamento, margem de frete).
* Comunicar resultados de forma clara e executiva através de Dashboards e documentação técnica.

---

## 📦 Entregáveis

- [x] **Arquitetura e Camadas de Dados**: Separação física em schemas (`stg`, `dw` e `mart`) usando **PostgreSQL 16** via **Docker**.
- [x] **Modelagem Dimensional**: Modelo Star Schema detalhado com tabelas fato e dimensão prontas para análise.
- [x] **Scripts SQL de Criação e Carga**: Scripts automatizados para staging e DW, com tratamento de codificação (`LATIN1`/`UTF8`), valores nulos e carga full-refresh idempotente.
- [x] **Validações de Qualidade de Dados**: Consultas para assegurar a integridade e consistência volumétrica dos dados importados.
- [x] **Camada de Data Marts**: Views detalhadas e agregadas para vendas, logística, pagamentos e desempenho de lojas.
- [x] **Consultas para KPIs Executivos**: Indicadores documentados e calculados com regras explícitas de grão, denominador e exclusão.
- [ ] **Dashboard Power BI**: Painel interativo com os KPIs consolidados (prints serão adicionados no README).
- [x] **Documentação Completa**:
  * [Regras de Negócio](docs/regras-negocio.md)
  * [Modelo Dimensional](docs/modelo-dimensional.md)
  * [Dicionário de Dados](docs/dicionario-dados.md)
  * [Catálogo de KPIs](docs/kpis.md)

---

## ✅ Status Atual do Projeto

A estrutura de dados está implementada e validada até a camada de consumo analítico:

| Camada | Implementação |
|---|---|
| `stg` | 7 tabelas carregadas diretamente dos CSVs |
| `dw` | 8 dimensões conformadas e 3 tabelas fato |
| `mart` | 3 views detalhadas e 5 views agregadas |

Volumes reconciliados entre staging, DW e data marts:

- **368.999 pedidos**
- **378.843 entregas/tentativas**
- **400.834 pagamentos**
- **R$ 38.800.730,73** em valor de produtos preservado entre `stg` e `dw`
- **R$ 37.313.340,92** em pagamentos preservado entre `stg` e `dw`

As cargas foram executadas mais de uma vez para confirmar reprocessamento seguro. As validações também confirmaram:

- ausência de chaves de negócio duplicadas;
- integridade das foreign keys e cobertura por índices;
- preservação de pedidos com múltiplas entregas ou pagamentos;
- ausência de multiplicação de valores nas views do `mart`;
- coerência entre timestamps e a dimensão de tempo;
- reconciliação dos totais financeiros.

Baselines publicados para o futuro dashboard:

- taxa de cancelamento: **4,60%**;
- valor transacionado de pedidos finalizados: **R$ 37.481.358,97**;
- ticket médio finalizado: **R$ 106,48**;
- margem agregada de entrega: **-R$ 434.905,63**;
- tempo de ciclo P50/P90: **42,18 / 83,17 minutos**;
- taxa de entrega concluída: **97,95%**.

---

## 🏗️ Arquitetura de Dados e Tecnologia

Os dados brutos em formato CSV são ingeridos e transformados dentro de um banco de dados PostgreSQL executado em container Docker.

```mermaid
flowchart LR
    CSV[Arquivos CSV] -->|COPY Ingestion| STG[(Schema stg)]
    STG -->|ELT / SQL| DW[(Schema dw)]
    DW -->|Views / Agregados| MART[(Schema mart)]
    MART -->|Conexão Direta| PBI[Power BI Dashboard]
```

### Tecnologias Utilizadas:
* **Banco de Dados**: PostgreSQL 16
* **Ambiente**: Docker & Docker Compose
* **Linguagem**: SQL (PL/pgSQL)
* **Modelagem**: Star Schema (Fatos e Dimensões)
* **Visualização**: Power BI

---

## 🛠️ Como Executar o Projeto

### Prerrequisitos:
* [Docker](https://www.docker.com/) instalado.
* [Git](https://git-scm.com/) instalado.

### Passo 1: Subir o Banco de Dados
No diretório raiz do projeto, execute o comando abaixo para iniciar o container do PostgreSQL:
```bash
docker compose up -d
```

### Passo 2: Executar os Scripts SQL na Ordem
Conecte-se ao banco de dados (`localhost:5432`, base `mini_datamart_delivery`, usuário `datamart_user`, senha `datamart_pass`) utilizando seu cliente SQL de preferência (DBeaver, VS Code Database Client, etc.) e execute os arquivos na seguinte ordem:

1. [`sql/01_create_schemas.sql`](sql/01_create_schemas.sql): Cria os schemas `stg`, `dw` e `mart`.
2. [`sql/02_create_staging_tables.sql`](sql/02_create_staging_tables.sql): Cria as tabelas da camada de staging.
3. [`sql/03_load_staging.sql`](sql/03_load_staging.sql): Limpa e carrega os dados dos CSVs para as tabelas staging usando `COPY`.
4. [`sql/04_data_quality_checks.sql`](sql/04_data_quality_checks.sql): Executa testes de integridade e contagem de linhas.
5. [`sql/05_create_dw_dimensions.sql`](sql/05_create_dw_dimensions.sql): Cria as dimensões conformadas da camada `dw`.
6. [`sql/06_create_dw_facts.sql`](sql/06_create_dw_facts.sql): Cria as fatos de pedidos, entregas e pagamentos, suas constraints e índices.
7. [`sql/07_load_dw.sql`](sql/07_load_dw.sql): Transforma e carrega os dados da `stg` para a `dw`.
8. [`sql/08_dw_quality_checks.sql`](sql/08_dw_quality_checks.sql): Valida volumes, chaves de negócio e reconciliação financeira da DW.
9. [`sql/09_create_mart_views.sql`](sql/09_create_mart_views.sql): Cria as views detalhadas e agregadas da camada `mart`.
10. [`sql/10_mart_quality_checks.sql`](sql/10_mart_quality_checks.sql): Verifica cardinalidade, reconciliação e ausência de dupla contagem nas views.

---

## 💡 Decisões de Engenharia de Dados

* **Resiliência na Carga Bruta (`stg`)**: As tabelas de staging foram criadas sem chaves primárias ou restrições de integridade (`NOT NULL`, `FOREIGN KEY`). Isso garante que os dados brutos sejam carregados sem falhas, permitindo que a limpeza ocorra na etapa de transformação para a camada `dw`.
* **Tratamento de Codificação (Encoding)**: Os arquivos `hubs.csv` e `stores.csv` continham caracteres acentuados codificados em **LATIN1** (padrão Windows), gerando erros ao tentar importar em UTF-8. O script de carga foi ajustado para interpretar esses dois arquivos especificamente como `LATIN1`, traduzindo os acentos perfeitamente na carga do banco (que utiliza UTF-8).
* **Campos de Data Temporários**: Colunas de timestamp (`order_moment_...`) são importadas como `VARCHAR` na staging para evitar falhas na carga bruta e convertidas para `TIMESTAMPTZ` durante a carga do DW, considerando o fuso `America/Sao_Paulo`.
* **Data Canônica do Pedido**: A data analítica é derivada de `order_moment_created`, que possui o timestamp completo. As colunas fragmentadas de ano, mês e dia permanecem apenas como campos brutos de conferência.
* **Grãos Separados**: O DW possui uma fato por pedido, uma por entrega/tentativa e uma por transação de pagamento. Essa separação preserva corretamente pedidos com múltiplas entregas ou pagamentos sem multiplicar valores.
* **Chaves Substitutas e Integridade**: As dimensões usam surrogate keys sequenciais e chaves naturais únicas. Todas as relações das fatos possuem foreign keys e índices próprios.
* **Carga Repetível**: As dimensões são atualizadas como SCD Tipo 1 por `UPSERT`; as fatos passam por full-refresh dentro de uma única transação.
* **Data Marts sem Fanout**: Pedidos, entregas e pagamentos são enriquecidos em views separadas. Pagamentos são agregados por pedido antes da conciliação e a performance logística utiliza uma única última tentativa por pedido.
* **KPIs Auditáveis**: As views publicam numeradores e denominadores junto das taxas, permitindo reagregação correta no Power BI.

---

## 📊 Dashboard Power BI

*(Os prints do dashboard finalizado e as principais visões do painel executivo serão adicionados aqui)*

- [ ] *Print do Dashboard - Visão Executiva de Vendas*
- [ ] *Print do Dashboard - Visão Operacional e SLAs de Entrega*

---

## 🚀 Próximos Passos

1. **Conectar o Power BI ao schema `mart`**:
   * Usar as views agregadas nas páginas executivas.
   * Reservar as views detalhadas para drill-through.
2. **Criar três páginas iniciais do dashboard**:
   * Visão Executiva de Vendas.
   * Performance Logística e Tempos de Ciclo.
   * Conciliação e Mix de Pagamentos.
3. **Desenvolver as medidas em DAX**:
   * Recalcular taxas usando numeradores e denominadores.
   * Criar comparações mensais, acumulados e participação percentual.
4. **Definir Metas Operacionais**:
   * Avaliar as séries semanais e mensais dos KPIs.
   * Aprovar limites de SLA e metas por hub antes de classificar performance.
5. **Finalizar a apresentação do projeto**:
   * Adicionar prints do dashboard ao README.
   * Documentar os principais insights e decisões de negócio.
