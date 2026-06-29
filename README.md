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
- [x] **Scripts SQL de Criação e Carga**: Scripts automatizados de DDL e DML (`COPY`) com tratamento de codificação (`LATIN1`/`UTF8`) e valores nulos.
- [x] **Validações de Qualidade de Dados**: Consultas para assegurar a integridade e consistência volumétrica dos dados importados.
- [ ] **Consultas para KPIs Executivos**: Scripts SQL para extrair os principais indicadores de negócio diretamente do DW.
- [ ] **Dashboard Power BI**: Painel interativo com os KPIs consolidados (prints serão adicionados no README).
- [x] **Documentação Completa**:
  * [Regras de Negócio](docs/regras-negocio.md)
  * [Modelo Dimensional](docs/modelo-dimensional.md)
  * [Dicionário de Dados](docs/dicionario-dados.md)

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

---

## 💡 Decisões de Engenharia de Dados

* **Resiliência na Carga Bruta (`stg`)**: As tabelas de staging foram criadas sem chaves primárias ou restrições de integridade (`NOT NULL`, `FOREIGN KEY`). Isso garante que os dados brutos sejam carregados sem falhas, permitindo que a limpeza ocorra na etapa de transformação para a camada `dw`.
* **Tratamento de Codificação (Encoding)**: Os arquivos `hubs.csv` e `stores.csv` continham caracteres acentuados codificados em **LATIN1** (padrão Windows), gerando erros ao tentar importar em UTF-8. O script de carga foi ajustado para interpretar esses dois arquivos especificamente como `LATIN1`, traduzindo os acentos perfeitamente na carga do banco (que utiliza UTF-8).
* **Campos de Data Temporários**: Colunas de timestamp (`order_moment_...`) foram importadas como `VARCHAR` na staging para evitar que variações de formatação quebrassem a carga. Elas serão convertidas para `TIMESTAMP` via SQL utilizando `TO_TIMESTAMP` durante a carga do DW.

---

## 📊 Dashboard Power BI

*(Os prints do dashboard finalizado e as principais visões do painel executivo serão adicionados aqui)*

- [ ] *Print do Dashboard - Visão Executiva de Vendas*
- [ ] *Print do Dashboard - Visão Operacional e SLAs de Entrega*

---

## 🚀 Próximos Passos

1. **Desenvolver os scripts da camada `dw`**:
   * Criar as tabelas dimensionais (`dim_lojas`, `dim_entregadores`, `dim_canais`, `dim_tempo`, `dim_status`).
   * Criar as tabelas fato (`fato_pedidos`, `fato_pagamentos`).
   * Escrever a lógica de transformação (carga incremental ou carga total) de `stg` para `dw`.
2. **Criar a camada `mart`**:
   * Criar as Views analíticas para simplificar as métricas de vendas e logística.
3. **Desenvolver o Dashboard**:
   * Conectar o Power BI ao PostgreSQL local.
   * Criar o modelo de dados no Power BI (relacionamentos 1:N).
   * Desenvolver as medidas em DAX para os KPIs executivos.