import { createHash } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const powerbiDir = resolve(scriptDir, "..");
const projectName = "DeliveryCenterAnalytics";
const reportName = `${projectName}.Report`;
const modelName = `${projectName}.SemanticModel`;
const reportDir = join(powerbiDir, reportName);
const modelDir = join(powerbiDir, modelName);

const schemas = {
  pbip: "https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json",
  platform: "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json",
  pbir: "https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/2.0.0/schema.json",
  pbism: "https://developer.microsoft.com/json-schemas/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json",
  report: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/report/3.3.0/schema.json",
  page: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json",
  pages: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/pagesMetadata/1.0.0/schema.json",
  version: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/versionMetadata/1.0.0/schema.json",
  visual: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.9.0/schema.json"
};

const colors = {
  canvas: "#08111F",
  surface: "#101B2D",
  surfaceAlt: "#15233A",
  border: "#263A56",
  text: "#F8FAFC",
  muted: "#9FB0C7",
  teal: "#2DD4BF",
  blue: "#60A5FA",
  purple: "#A78BFA",
  green: "#4ADE80",
  amber: "#FBBF24",
  red: "#FB7185"
};

const htmlVisualType = "htmlContent443BE3AD55E043BF878BED274D3A6865";

function safeReset(target) {
  const absolute = resolve(target);
  if (!absolute.startsWith(`${powerbiDir}\\`) || ![reportDir, modelDir].includes(absolute)) {
    throw new Error(`Tentativa de limpar caminho fora da área gerada: ${absolute}`);
  }
  rmSync(absolute, { recursive: true, force: true });
}

function write(relativePath, content) {
  const target = join(powerbiDir, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

function writeJson(relativePath, value) {
  write(relativePath, JSON.stringify(value, null, 2));
}

function stableId(scope, name) {
  return createHash("sha1").update(`${scope}:${name}`).digest("hex").slice(0, 20);
}

function literal(value) {
  return { expr: { Literal: { Value: value } } };
}

function bool(value) {
  return literal(value ? "true" : "false");
}

function number(value, integer = false) {
  return literal(`${value}${integer ? "L" : "D"}`);
}

function text(value) {
  return literal(`'${String(value).replaceAll("'", "''")}'`);
}

function fill(hex) {
  return { solid: { color: literal(`'${hex}'`) } };
}

function columnField(table, property) {
  return {
    Column: {
      Expression: { SourceRef: { Entity: table } },
      Property: property
    }
  };
}

function measureField(table, property) {
  return {
    Measure: {
      Expression: { SourceRef: { Entity: table } },
      Property: property
    }
  };
}

function projection(field, table, property, displayName) {
  return {
    field,
    queryRef: `${table}.${property}`,
    nativeQueryRef: property,
    ...(displayName ? { displayName } : {})
  };
}

function chrome(title, { padding = 8, background = true, border = true } = {}) {
  const result = {
    title: [{
      properties: {
        show: bool(Boolean(title)),
        ...(title ? {
          text: text(title),
          fontColor: fill(colors.text),
          fontFamily: text("Segoe UI Semibold"),
          fontSize: number(12),
          bold: bool(true)
        } : {})
      }
    }],
    background: [{
      properties: {
        show: bool(background),
        color: fill(colors.surface),
        transparency: number(0)
      }
    }],
    border: [{
      properties: {
        show: bool(border),
        color: fill(colors.border),
        width: number(1),
        radius: number(12)
      }
    }],
    padding: [{
      properties: {
        top: number(padding),
        bottom: number(padding),
        left: number(padding),
        right: number(padding)
      }
    }]
  };
  return result;
}

function visualFile(pageName, key, position, visual) {
  const name = stableId(pageName, key);
  return {
    name,
    value: {
      $schema: schemas.visual,
      name,
      position: {
        x: position.x,
        y: position.y,
        z: position.z,
        height: position.height,
        width: position.width,
        tabOrder: position.tabOrder ?? position.z
      },
      visual
    }
  };
}

function textboxVisual(title, subtitle = "") {
  const paragraphs = [{
    textRuns: [{
      value: title,
      textStyle: {
        fontFamily: "Segoe UI Semibold",
        fontSize: "24px",
        fontWeight: "bold",
        color: colors.text
      }
    }],
    horizontalTextAlignment: "left"
  }];

  if (subtitle) {
    paragraphs.push({
      textRuns: [{
        value: subtitle,
        textStyle: {
          fontFamily: "Segoe UI",
          fontSize: "10px",
          color: colors.muted
        }
      }],
      horizontalTextAlignment: "left"
    });
  }

  return {
    visualType: "textbox",
    objects: { general: [{ properties: { paragraphs } }] },
    visualContainerObjects: chrome("", { padding: 0, background: false, border: false })
  };
}

function backButtonVisual() {
  return {
    visualType: "actionButton",
    objects: {
      shape: [{ properties: { tileShape: text("rectangleRounded"), rectangleRoundedCurve: number(12) } }],
      fill: [{ properties: { show: bool(true), fillColor: fill(colors.surfaceAlt), transparency: number(0) } }],
      outline: [{ properties: { show: bool(true), lineColor: fill(colors.border), transparency: number(0), weight: number(1) } }],
      text: [{ properties: { show: bool(true), text: text("Voltar"), fontFamily: text("Segoe UI Semibold"), fontSize: number(11), bold: bool(true), fontColor: fill(colors.text), horizontalAlignment: text("center") } }],
      icon: [{ properties: { show: bool(true), shapeType: text("back"), lineColor: fill(colors.teal), lineWeight: number(2), placement: text("left"), iconSize: number(18) } }]
    },
    visualContainerObjects: {
      ...chrome("", { padding: 0, background: false, border: false }),
      visualLink: [{ properties: { show: bool(true), type: text("Back"), enabledTooltip: text("Voltar para a página anterior"), showDefaultTooltip: bool(true) } }]
    }
  };
}

function slicerVisual(table, property, label, mode = "Dropdown") {
  return {
    visualType: "slicer",
    query: {
      queryState: {
        Values: {
          projections: [projection(columnField(table, property), table, property)]
        }
      }
    },
    objects: {
      data: [{ properties: { mode: text(mode) } }],
      header: [{
        properties: {
          show: bool(true),
          text: text(label),
          fontColor: fill(colors.text),
          background: fill(colors.surface),
          bold: bool(true)
        }
      }]
    },
    visualContainerObjects: chrome("", { padding: 8, background: true, border: true })
  };
}

function htmlVisual(measure) {
  return {
    visualType: htmlVisualType,
    query: {
      queryState: {
        content: {
          projections: [projection(measureField("Métricas", measure), "Métricas", measure)]
        }
      }
    },
    objects: {
      contentFormatting: [{
        properties: {
          format: text("html"),
          overrideInlineStyling: bool(false),
          hyperlinks: bool(false),
          userSelect: bool(true),
          noDataMessage: text("Sem dados para o contexto selecionado")
        }
      }]
    },
    visualContainerObjects: chrome("", { padding: 0, background: false, border: false })
  };
}

function cartesianVisual(type, title, category, measures, tooltips = []) {
  const queryState = {
    Category: {
      projections: [projection(columnField(category.table, category.property), category.table, category.property)]
    },
    Y: {
      projections: measures.map((measure) => projection(
        measureField("Métricas", measure),
        "Métricas",
        measure
      ))
    }
  };

  if (tooltips.length) {
    queryState.Tooltips = {
      projections: tooltips.map((measure) => projection(
        measureField("Métricas", measure),
        "Métricas",
        measure
      ))
    };
  }

  return {
    visualType: type,
    query: { queryState },
    visualContainerObjects: {
      ...chrome(title),
      visualTooltip: [{ properties: { show: bool(true) } }]
    }
  };
}

function donutVisual(title, category, measure, tooltips = []) {
  return cartesianVisual("donutChart", title, category, [measure], tooltips);
}

function tableVisual(title, fields, sortMeasure) {
  const projections = fields.map((field) => projection(
    field.kind === "measure"
      ? measureField("Métricas", field.property)
      : columnField(field.table, field.property),
    field.kind === "measure" ? "Métricas" : field.table,
    field.property,
    field.displayName
  ));

  const query = {
    queryState: { Values: { projections } }
  };

  if (sortMeasure) {
    query.sortDefinition = {
      sort: [{
        field: measureField("Métricas", sortMeasure),
        direction: "Descending"
      }],
      isDefaultSort: true
    };
  }

  return {
    visualType: "tableEx",
    query,
    objects: {
      columnHeaders: [{
        properties: {
          autoSizeColumnWidth: bool(true),
          columnAdjustment: text("growToFit"),
          wordWrap: bool(true),
          backColor: fill(colors.surfaceAlt),
          fontColor: fill(colors.text),
          bold: bool(true)
        }
      }],
      values: [{
        properties: {
          fontColorPrimary: fill(colors.text),
          fontColorSecondary: fill(colors.text),
          backColorPrimary: fill(colors.surface),
          backColorSecondary: fill(colors.surfaceAlt),
          wordWrap: bool(false)
        }
      }]
    },
    visualContainerObjects: {
      ...chrome(title),
      stylePreset: [{ properties: { name: text("None") } }]
    }
  };
}

function pageDefinition(name, displayName, { drillthrough = false } = {}) {
  const value = {
    $schema: schemas.page,
    name,
    displayName,
    displayOption: "FitToPage",
    height: 720,
    width: 1280,
    objects: {
      background: [{
        properties: {
          color: fill(colors.canvas),
          transparency: number(0)
        }
      }],
      outspace: [{
        properties: {
          color: fill("#050A12"),
          transparency: number(0)
        }
      }]
    }
  };

  if (drillthrough) {
    const filterName = "Filter0d4e9c1284f75d3b9a21e7ff";
    value.filterConfig = {
      filters: [{
        name: filterName,
        field: columnField("Pedido", "Pedido ID"),
        type: "Categorical",
        howCreated: "Drillthrough"
      }]
    };
    value.pageBinding = {
      name: "d11f3e527de74c32b1d9",
      type: "Drillthrough",
      parameters: [{
        name: `Param_${filterName}`,
        boundFilter: filterName,
        fieldExpr: columnField("Pedido", "Pedido ID")
      }]
    };
  }

  return value;
}

function addPage(page, visuals) {
  const pageBase = `${reportName}/definition/pages/${page.name}`;
  writeJson(`${pageBase}/page.json`, page.value);
  for (const visual of visuals) {
    writeJson(`${pageBase}/visuals/${visual.name}/visual.json`, visual.value);
  }
}

function q(name) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)
    ? name
    : `'${name.replaceAll("'", "''")}'`;
}

function indent(textValue, tabs) {
  const prefix = "\t".repeat(tabs);
  return textValue.split("\n").map((line) => `${prefix}${line}`).join("\n");
}

function columnTmdl(column) {
  const lines = [];
  if (column.description) lines.push(`\t/// ${column.description}`);
  lines.push(`\tcolumn ${q(column.name)}`);
  if (column.dataType) lines.push(`\t\tdataType: ${column.dataType}`);
  if (column.hidden) lines.push("\t\tisHidden");
  if (column.key) lines.push("\t\tisKey");
  if (column.summarizeBy) lines.push(`\t\tsummarizeBy: ${column.summarizeBy}`);
  if (column.sortBy) lines.push(`\t\tsortByColumn: ${q(column.sortBy)}`);
  if (column.dataCategory) lines.push(`\t\tdataCategory: ${column.dataCategory}`);
  lines.push(`\t\tsourceColumn: ${column.source}`);
  return lines.join("\n");
}

function tableTmdl(table) {
  const parts = [
    `/// ${table.description}`,
    `table ${q(table.name)}`
  ];
  if (table.dataCategory) parts.push(`\tdataCategory: ${table.dataCategory}`);
  for (const column of table.columns) parts.push("", columnTmdl(column));
  parts.push(
    "",
    `\tpartition ${q(table.name)} = m`,
    "\t\tmode: import",
    "\t\tsource =",
    "\t\t\tlet",
    `\t\t\t\tFonte = PostgreSQL.Database(#\"Servidor PostgreSQL\", #\"Banco PostgreSQL\", [Query = \"${table.sql.replaceAll('"', '""')}\"])`,
    "\t\t\tin",
    "\t\t\t\tFonte"
  );
  return parts.join("\n");
}

const tables = [
  {
    name: "Calendário",
    description: "Dimensão de datas contínua derivada da view de pedidos; uma linha por dia.",
    dataCategory: "Time",
    sql: "SELECT DISTINCT sk_tempo, data_completa, ano::bigint AS ano, semestre::bigint AS semestre, trimestre::bigint AS trimestre, mes::bigint AS mes, nome_mes, dia::bigint AS dia, numero_dia_semana::bigint AS numero_dia_semana, nome_dia_semana, eh_fim_semana, TO_CHAR(data_completa, 'YYYY-MM') AS ano_mes, (ano::bigint * 100 + mes::bigint) AS ordem_ano_mes FROM mart.vw_pedidos_enriquecidos",
    columns: [
      { name: "Chave Data", source: "sk_tempo", dataType: "int64", hidden: true, key: true, summarizeBy: "none" },
      { name: "Data", source: "data_completa", dataType: "dateTime", summarizeBy: "none" },
      { name: "Ano", source: "ano", dataType: "int64", summarizeBy: "none" },
      { name: "Semestre", source: "semestre", dataType: "int64", summarizeBy: "none" },
      { name: "Trimestre", source: "trimestre", dataType: "int64", summarizeBy: "none" },
      { name: "Número Mês", source: "mes", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Mês", source: "nome_mes", dataType: "string", sortBy: "Número Mês" },
      { name: "Dia", source: "dia", dataType: "int64", summarizeBy: "none" },
      { name: "Número Dia Semana", source: "numero_dia_semana", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Dia da Semana", source: "nome_dia_semana", dataType: "string", sortBy: "Número Dia Semana" },
      { name: "Fim de Semana", source: "eh_fim_semana", dataType: "boolean", summarizeBy: "none" },
      { name: "Ano Mês", source: "ano_mes", dataType: "string", sortBy: "Ordem Ano Mês" },
      { name: "Ordem Ano Mês", source: "ordem_ano_mes", dataType: "int64", hidden: true, summarizeBy: "none" }
    ]
  },
  {
    name: "Hubs",
    description: "Dimensão de hubs logísticos; uma linha por hub.",
    sql: "SELECT DISTINCT hub_id, hub_name, hub_city, hub_state FROM mart.vw_pedidos_enriquecidos",
    columns: [
      { name: "Chave Hub", source: "hub_id", dataType: "int64", hidden: true, key: true, summarizeBy: "none" },
      { name: "Hub", source: "hub_name", dataType: "string" },
      { name: "Cidade Hub", source: "hub_city", dataType: "string", dataCategory: "City" },
      { name: "UF Hub", source: "hub_state", dataType: "string", dataCategory: "StateOrProvince" }
    ]
  },
  {
    name: "Lojas",
    description: "Dimensão de lojas; uma linha por loja.",
    sql: "SELECT DISTINCT store_id, store_name, store_segment, store_plan_price FROM mart.vw_pedidos_enriquecidos",
    columns: [
      { name: "Chave Loja", source: "store_id", dataType: "int64", hidden: true, key: true, summarizeBy: "none" },
      { name: "Loja", source: "store_name", dataType: "string" },
      { name: "Segmento Loja", source: "store_segment", dataType: "string" },
      { name: "Plano Loja", source: "store_plan_price", dataType: "decimal", summarizeBy: "none" }
    ]
  },
  {
    name: "Canais",
    description: "Dimensão de canais de venda; uma linha por canal.",
    sql: "SELECT DISTINCT channel_id, channel_name, channel_type FROM mart.vw_pedidos_enriquecidos",
    columns: [
      { name: "Chave Canal", source: "channel_id", dataType: "int64", hidden: true, key: true, summarizeBy: "none" },
      { name: "Canal", source: "channel_name", dataType: "string" },
      { name: "Tipo Canal", source: "channel_type", dataType: "string" }
    ]
  },
  {
    name: "Entregadores",
    description: "Dimensão de entregadores; uma linha por entregador, incluindo o membro não informado.",
    sql: "SELECT DISTINCT driver_id, driver_modal, driver_type FROM mart.vw_entregas_enriquecidas",
    columns: [
      { name: "Chave Entregador", source: "driver_id", dataType: "int64", hidden: true, key: true, summarizeBy: "none" },
      { name: "Modal Entregador", source: "driver_modal", dataType: "string" },
      { name: "Tipo Entregador", source: "driver_type", dataType: "string" }
    ]
  },
  {
    name: "Pedido",
    description: "Dimensão degenerada de pedidos usada como filtro comum e chave de drill-through.",
    sql: "SELECT sk_pedido, order_id FROM mart.vw_pedidos_enriquecidos",
    columns: [
      { name: "Chave Pedido", source: "sk_pedido", dataType: "int64", hidden: true, key: true, summarizeBy: "none" },
      { name: "Pedido ID", source: "order_id", dataType: "int64", summarizeBy: "none" }
    ]
  },
  {
    name: "Pedidos",
    description: "Fato de pedidos no grão de uma linha por pedido, oriunda de mart.vw_pedidos_enriquecidos.",
    sql: "SELECT sk_pedido, order_id, sk_tempo, store_id, hub_id, channel_id, order_status, hora_criacao::bigint AS hora_criacao, valor_pedido, taxa_entrega, custo_entrega, valor_total_pedido, margem_entrega, pedido_criado_em AT TIME ZONE 'America/Sao_Paulo' AS pedido_criado_em, pedido_aceito_em AT TIME ZONE 'America/Sao_Paulo' AS pedido_aceito_em, pedido_pronto_em AT TIME ZONE 'America/Sao_Paulo' AS pedido_pronto_em, pedido_coletado_em AT TIME ZONE 'America/Sao_Paulo' AS pedido_coletado_em, pedido_em_entrega_em AT TIME ZONE 'America/Sao_Paulo' AS pedido_em_entrega_em, pedido_finalizado_em AT TIME ZONE 'America/Sao_Paulo' AS pedido_finalizado_em, tempo_producao_minutos::numeric(18,2) AS tempo_producao_minutos, tempo_transito_minutos::numeric(18,2) AS tempo_transito_minutos, tempo_ciclo_total_minutos::numeric(18,2) AS tempo_ciclo_total_minutos FROM mart.vw_pedidos_enriquecidos",
    columns: [
      { name: "Chave Pedido", source: "sk_pedido", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Pedido ID", source: "order_id", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Chave Data", source: "sk_tempo", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Chave Loja", source: "store_id", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Chave Hub", source: "hub_id", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Chave Canal", source: "channel_id", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Status Pedido", source: "order_status", dataType: "string" },
      { name: "Hora Criação", source: "hora_criacao", dataType: "int64", summarizeBy: "none" },
      { name: "Valor Produtos", source: "valor_pedido", dataType: "decimal", summarizeBy: "none" },
      { name: "Taxa Entrega", source: "taxa_entrega", dataType: "decimal", summarizeBy: "none" },
      { name: "Custo Entrega", source: "custo_entrega", dataType: "decimal", summarizeBy: "none" },
      { name: "Valor Total Pedido", source: "valor_total_pedido", dataType: "decimal", summarizeBy: "none" },
      { name: "Margem Entrega", source: "margem_entrega", dataType: "decimal", summarizeBy: "none" },
      { name: "Pedido Criado Em", source: "pedido_criado_em", dataType: "dateTime", summarizeBy: "none" },
      { name: "Pedido Aceito Em", source: "pedido_aceito_em", dataType: "dateTime", summarizeBy: "none" },
      { name: "Pedido Pronto Em", source: "pedido_pronto_em", dataType: "dateTime", summarizeBy: "none" },
      { name: "Pedido Coletado Em", source: "pedido_coletado_em", dataType: "dateTime", summarizeBy: "none" },
      { name: "Pedido Em Entrega Em", source: "pedido_em_entrega_em", dataType: "dateTime", summarizeBy: "none" },
      { name: "Pedido Finalizado Em", source: "pedido_finalizado_em", dataType: "dateTime", summarizeBy: "none" },
      { name: "Tempo Produção", source: "tempo_producao_minutos", dataType: "decimal", summarizeBy: "none" },
      { name: "Tempo Trânsito", source: "tempo_transito_minutos", dataType: "decimal", summarizeBy: "none" },
      { name: "Tempo Ciclo", source: "tempo_ciclo_total_minutos", dataType: "decimal", summarizeBy: "none" }
    ]
  },
  {
    name: "Entregas",
    description: "Fato de entregas no grão de uma linha por tentativa de entrega.",
    sql: "SELECT sk_entrega, delivery_id, order_id, sk_pedido, sk_tempo, store_id, hub_id, driver_id, delivery_status, order_status, numero_tentativa::bigint AS numero_tentativa, eh_ultima_tentativa, distancia_entrega_metros::numeric(18,2) AS distancia_entrega_metros FROM mart.vw_entregas_enriquecidas",
    columns: [
      { name: "Chave Entrega", source: "sk_entrega", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Entrega ID", source: "delivery_id", dataType: "int64", summarizeBy: "none" },
      { name: "Pedido ID", source: "order_id", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Chave Pedido", source: "sk_pedido", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Chave Data", source: "sk_tempo", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Chave Loja", source: "store_id", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Chave Hub", source: "hub_id", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Chave Entregador", source: "driver_id", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Status Entrega", source: "delivery_status", dataType: "string" },
      { name: "Status Pedido", source: "order_status", dataType: "string", hidden: true },
      { name: "Número Tentativa", source: "numero_tentativa", dataType: "int64", summarizeBy: "none" },
      { name: "É Última Tentativa", source: "eh_ultima_tentativa", dataType: "boolean", summarizeBy: "none" },
      { name: "Distância Entrega (m)", source: "distancia_entrega_metros", dataType: "decimal", summarizeBy: "none" }
    ]
  },
  {
    name: "Pagamentos",
    description: "Fato de pagamentos no grão de uma linha por transação de pagamento.",
    sql: "SELECT sk_pagamento, payment_id, order_id, sk_pedido, sk_tempo, store_id, hub_id, channel_id, payment_method, payment_status, order_status, valor_pagamento, taxa_pagamento, valor_liquido_pagamento FROM mart.vw_pagamentos_enriquecidos",
    columns: [
      { name: "Chave Pagamento", source: "sk_pagamento", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Pagamento ID", source: "payment_id", dataType: "int64", summarizeBy: "none" },
      { name: "Pedido ID", source: "order_id", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Chave Pedido", source: "sk_pedido", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Chave Data", source: "sk_tempo", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Chave Loja", source: "store_id", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Chave Hub", source: "hub_id", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Chave Canal", source: "channel_id", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Meio Pagamento", source: "payment_method", dataType: "string" },
      { name: "Status Pagamento", source: "payment_status", dataType: "string" },
      { name: "Status Pedido", source: "order_status", dataType: "string", hidden: true },
      { name: "Valor Pagamento", source: "valor_pagamento", dataType: "decimal", summarizeBy: "none" },
      { name: "Taxa Pagamento", source: "taxa_pagamento", dataType: "decimal", summarizeBy: "none" },
      { name: "Valor Líquido Pagamento", source: "valor_liquido_pagamento", dataType: "decimal", summarizeBy: "none" }
    ]
  },
  {
    name: "Conciliação",
    description: "Fato de conciliação no grão de uma linha por pedido, com pagamentos previamente agregados.",
    sql: "SELECT sk_pedido, order_id, sk_tempo, store_id, hub_id, channel_id, order_status, valor_esperado_pedido, qtd_pagamentos, qtd_pagamentos_pagos, qtd_chargebacks, qtd_pagamentos_aguardando, total_pago_confirmado, total_chargeback, total_aguardando, taxas_pagamentos_pagos, valor_pago_apos_taxas, diferenca_conciliacao, status_conciliacao FROM mart.vw_conciliacao_pagamentos",
    columns: [
      { name: "Chave Pedido", source: "sk_pedido", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Pedido ID", source: "order_id", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Chave Data", source: "sk_tempo", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Chave Loja", source: "store_id", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Chave Hub", source: "hub_id", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Chave Canal", source: "channel_id", dataType: "int64", hidden: true, summarizeBy: "none" },
      { name: "Status Pedido", source: "order_status", dataType: "string" },
      { name: "Valor Esperado", source: "valor_esperado_pedido", dataType: "decimal", summarizeBy: "none" },
      { name: "Quantidade Pagamentos", source: "qtd_pagamentos", dataType: "int64", summarizeBy: "none" },
      { name: "Quantidade Pagamentos Pagos", source: "qtd_pagamentos_pagos", dataType: "int64", summarizeBy: "none" },
      { name: "Quantidade Chargebacks", source: "qtd_chargebacks", dataType: "int64", summarizeBy: "none" },
      { name: "Quantidade Aguardando", source: "qtd_pagamentos_aguardando", dataType: "int64", summarizeBy: "none" },
      { name: "Total Pago Confirmado", source: "total_pago_confirmado", dataType: "decimal", summarizeBy: "none" },
      { name: "Total Chargeback", source: "total_chargeback", dataType: "decimal", summarizeBy: "none" },
      { name: "Total Aguardando", source: "total_aguardando", dataType: "decimal", summarizeBy: "none" },
      { name: "Taxas Pagamentos Pagos", source: "taxas_pagamentos_pagos", dataType: "decimal", summarizeBy: "none" },
      { name: "Valor Pago Após Taxas", source: "valor_pago_apos_taxas", dataType: "decimal", summarizeBy: "none" },
      { name: "Diferença Conciliação", source: "diferenca_conciliacao", dataType: "decimal", summarizeBy: "none" },
      { name: "Status Conciliação", source: "status_conciliacao", dataType: "string" }
    ]
  }
];

const daxMeasures = [
  { name: "Pedidos Criados", folder: "01 Comercial", format: "#,##0", description: "Quantidade de pedidos no contexto de filtro.", dax: "COUNTROWS('Pedidos')" },
  { name: "Pedidos Finalizados", folder: "01 Comercial", format: "#,##0", description: "Pedidos com status FINISHED.", dax: "CALCULATE([Pedidos Criados], KEEPFILTERS('Pedidos'[Status Pedido] = \"FINISHED\"))" },
  { name: "Pedidos Cancelados", folder: "01 Comercial", format: "#,##0", description: "Pedidos com status CANCELED.", dax: "CALCULATE([Pedidos Criados], KEEPFILTERS('Pedidos'[Status Pedido] = \"CANCELED\"))" },
  { name: "Taxa Cancelamento", folder: "01 Comercial", format: "0.00%", description: "Pedidos cancelados divididos por pedidos criados; nunca é média de percentuais.", dax: "DIVIDE([Pedidos Cancelados], [Pedidos Criados])" },
  { name: "Valor Transacionado", folder: "01 Comercial", format: "R$ #,##0.00", description: "Soma do valor total de pedidos finalizados.", dax: "CALCULATE(SUM('Pedidos'[Valor Total Pedido]), KEEPFILTERS('Pedidos'[Status Pedido] = \"FINISHED\"))" },
  { name: "Ticket Médio", folder: "01 Comercial", format: "R$ #,##0.00", description: "Valor transacionado dividido por pedidos finalizados.", dax: "DIVIDE([Valor Transacionado], [Pedidos Finalizados])" },
  { name: "Taxas de Entrega", folder: "01 Comercial", format: "R$ #,##0.00", description: "Taxas de entrega cobradas em pedidos finalizados.", dax: "CALCULATE(SUM('Pedidos'[Taxa Entrega]), KEEPFILTERS('Pedidos'[Status Pedido] = \"FINISHED\"))" },
  { name: "Custo de Entrega", folder: "01 Comercial", format: "R$ #,##0.00", description: "Custo logístico de pedidos finalizados.", dax: "CALCULATE(SUM('Pedidos'[Custo Entrega]), KEEPFILTERS('Pedidos'[Status Pedido] = \"FINISHED\"))" },
  { name: "Margem Entrega", folder: "01 Comercial", format: "R$ #,##0.00", description: "Taxa de entrega menos custo de entrega nos pedidos finalizados.", dax: "CALCULATE(SUM('Pedidos'[Margem Entrega]), KEEPFILTERS('Pedidos'[Status Pedido] = \"FINISHED\"))" },
  { name: "Margem sobre Taxa Entrega", folder: "01 Comercial", format: "0.00%", description: "Margem de entrega dividida pelas taxas de entrega cobradas.", dax: "DIVIDE([Margem Entrega], [Taxas de Entrega])" },
  { name: "Valor Transacionado Mês Anterior", folder: "01 Comercial\\Inteligência de Tempo", format: "R$ #,##0.00", description: "Valor transacionado deslocado em um mês.", dax: "CALCULATE([Valor Transacionado], DATEADD('Calendário'[Data], -1, MONTH))" },
  { name: "Variação Valor Mensal", folder: "01 Comercial\\Inteligência de Tempo", format: "0.00%", description: "Variação do valor transacionado contra o mês anterior.", dax: "DIVIDE([Valor Transacionado] - [Valor Transacionado Mês Anterior], [Valor Transacionado Mês Anterior])" },

  { name: "Pedidos com Entrega", folder: "02 Logística", format: "#,##0", description: "Pedidos representados pela última tentativa de entrega.", dax: "CALCULATE(DISTINCTCOUNT('Entregas'[Chave Pedido]), KEEPFILTERS('Entregas'[É Última Tentativa] = TRUE()))" },
  { name: "Entregas Concluídas", folder: "02 Logística", format: "#,##0", description: "Últimas tentativas com status DELIVERED.", dax: "CALCULATE(DISTINCTCOUNT('Entregas'[Chave Pedido]), KEEPFILTERS('Entregas'[É Última Tentativa] = TRUE()), KEEPFILTERS('Entregas'[Status Entrega] = \"DELIVERED\"))" },
  { name: "Taxa Entrega Concluída", folder: "02 Logística", format: "0.00%", description: "Entregas concluídas divididas por pedidos com entrega.", dax: "DIVIDE([Entregas Concluídas], [Pedidos com Entrega])" },
  { name: "Pedidos Múltiplas Tentativas", folder: "02 Logística", format: "#,##0", description: "Pedidos cuja última tentativa tem número maior que um.", dax: "CALCULATE(DISTINCTCOUNT('Entregas'[Chave Pedido]), KEEPFILTERS('Entregas'[É Última Tentativa] = TRUE()), KEEPFILTERS('Entregas'[Número Tentativa] > 1))" },
  { name: "Taxa Múltiplas Tentativas", folder: "02 Logística", format: "0.00%", description: "Pedidos com múltiplas tentativas divididos por pedidos com entrega.", dax: "DIVIDE([Pedidos Múltiplas Tentativas], [Pedidos com Entrega])" },
  { name: "Distância Média Entrega (km)", folder: "02 Logística", format: "#,##0.00", description: "Distância média em quilômetros de últimas tentativas entregues com distância informada.", dax: "DIVIDE(CALCULATE(AVERAGE('Entregas'[Distância Entrega (m)]), KEEPFILTERS('Entregas'[É Última Tentativa] = TRUE()), KEEPFILTERS('Entregas'[Status Entrega] = \"DELIVERED\")), 1000)" },
  { name: "Tempo Ciclo Médio", folder: "02 Logística", format: "#,##0.00", description: "Tempo médio dos pedidos finalizados; ao filtrar entregadores, restringe aos pedidos das últimas tentativas selecionadas.", dax: "VAR PedidosEntrega = CALCULATETABLE(VALUES('Entregas'[Chave Pedido]), KEEPFILTERS('Entregas'[É Última Tentativa] = TRUE())) RETURN IF(ISCROSSFILTERED('Entregadores'), CALCULATE(AVERAGEX(FILTER('Pedidos', 'Pedidos'[Status Pedido] = \"FINISHED\" && 'Pedidos'[Tempo Ciclo] >= 0), 'Pedidos'[Tempo Ciclo]), TREATAS(PedidosEntrega, 'Pedidos'[Chave Pedido])), AVERAGEX(FILTER('Pedidos', 'Pedidos'[Status Pedido] = \"FINISHED\" && 'Pedidos'[Tempo Ciclo] >= 0), 'Pedidos'[Tempo Ciclo]))" },
  { name: "Tempo Ciclo P50", folder: "02 Logística", format: "#,##0.00", description: "Percentil 50 dos pedidos finalizados; ao filtrar entregadores, restringe aos pedidos das últimas tentativas selecionadas.", dax: "VAR PedidosEntrega = CALCULATETABLE(VALUES('Entregas'[Chave Pedido]), KEEPFILTERS('Entregas'[É Última Tentativa] = TRUE())) RETURN IF(ISCROSSFILTERED('Entregadores'), CALCULATE(PERCENTILEX.INC(FILTER('Pedidos', 'Pedidos'[Status Pedido] = \"FINISHED\" && 'Pedidos'[Tempo Ciclo] >= 0), 'Pedidos'[Tempo Ciclo], 0.5), TREATAS(PedidosEntrega, 'Pedidos'[Chave Pedido])), PERCENTILEX.INC(FILTER('Pedidos', 'Pedidos'[Status Pedido] = \"FINISHED\" && 'Pedidos'[Tempo Ciclo] >= 0), 'Pedidos'[Tempo Ciclo], 0.5))" },
  { name: "Tempo Ciclo P90", folder: "02 Logística", format: "#,##0.00", description: "Percentil 90 dos pedidos finalizados; ao filtrar entregadores, restringe aos pedidos das últimas tentativas selecionadas.", dax: "VAR PedidosEntrega = CALCULATETABLE(VALUES('Entregas'[Chave Pedido]), KEEPFILTERS('Entregas'[É Última Tentativa] = TRUE())) RETURN IF(ISCROSSFILTERED('Entregadores'), CALCULATE(PERCENTILEX.INC(FILTER('Pedidos', 'Pedidos'[Status Pedido] = \"FINISHED\" && 'Pedidos'[Tempo Ciclo] >= 0), 'Pedidos'[Tempo Ciclo], 0.9), TREATAS(PedidosEntrega, 'Pedidos'[Chave Pedido])), PERCENTILEX.INC(FILTER('Pedidos', 'Pedidos'[Status Pedido] = \"FINISHED\" && 'Pedidos'[Tempo Ciclo] >= 0), 'Pedidos'[Tempo Ciclo], 0.9))" },

  { name: "Transações Pagas", folder: "03 Financeiro", format: "#,##0", description: "Quantidade de transações com status PAID.", dax: "CALCULATE(COUNTROWS('Pagamentos'), KEEPFILTERS('Pagamentos'[Status Pagamento] = \"PAID\"))" },
  { name: "Valor Pago", folder: "03 Financeiro", format: "R$ #,##0.00", description: "Valor bruto de transações PAID.", dax: "CALCULATE(SUM('Pagamentos'[Valor Pagamento]), KEEPFILTERS('Pagamentos'[Status Pagamento] = \"PAID\"))" },
  { name: "Taxas Pagamento", folder: "03 Financeiro", format: "R$ #,##0.00", description: "Taxas das transações PAID.", dax: "CALCULATE(SUM('Pagamentos'[Taxa Pagamento]), KEEPFILTERS('Pagamentos'[Status Pagamento] = \"PAID\"))" },
  { name: "Valor Líquido Pago", folder: "03 Financeiro", format: "R$ #,##0.00", description: "Valor líquido das transações PAID.", dax: "CALCULATE(SUM('Pagamentos'[Valor Líquido Pagamento]), KEEPFILTERS('Pagamentos'[Status Pagamento] = \"PAID\"))" },
  { name: "Chargebacks", folder: "03 Financeiro", format: "#,##0", description: "Quantidade de transações em chargeback.", dax: "CALCULATE(COUNTROWS('Pagamentos'), KEEPFILTERS('Pagamentos'[Status Pagamento] = \"CHARGEBACK\"))" },
  { name: "Valor Chargeback", folder: "03 Financeiro", format: "R$ #,##0.00", description: "Valor bruto das transações em chargeback.", dax: "CALCULATE(SUM('Pagamentos'[Valor Pagamento]), KEEPFILTERS('Pagamentos'[Status Pagamento] = \"CHARGEBACK\"))" },
  { name: "Pedidos na Conciliação", folder: "03 Financeiro", format: "#,##0", description: "Pedidos no contexto da view de conciliação.", dax: "DISTINCTCOUNT('Conciliação'[Chave Pedido])" },
  { name: "Pedidos Conciliados", folder: "03 Financeiro", format: "#,##0", description: "Pedidos finalizados classificados como conciliados.", dax: "CALCULATE([Pedidos na Conciliação], KEEPFILTERS('Conciliação'[Status Pedido] = \"FINISHED\"), KEEPFILTERS('Conciliação'[Status Conciliação] = \"CONCILIADO\"))" },
  { name: "Pedidos Finalizados Conciliação", folder: "03 Financeiro", format: "#,##0", description: "Denominador da taxa de conciliação: pedidos finalizados.", dax: "CALCULATE([Pedidos na Conciliação], KEEPFILTERS('Conciliação'[Status Pedido] = \"FINISHED\"))" },
  { name: "Taxa Conciliação", folder: "03 Financeiro", format: "0.00%", description: "Pedidos finalizados conciliados divididos pelos pedidos finalizados.", dax: "DIVIDE([Pedidos Conciliados], [Pedidos Finalizados Conciliação])" },
  { name: "Diferença Absoluta Conciliação", folder: "03 Financeiro", format: "R$ #,##0.00", description: "Soma do valor absoluto das diferenças dos pedidos finalizados.", dax: "CALCULATE(SUMX('Conciliação', ABS('Conciliação'[Diferença Conciliação])), KEEPFILTERS('Conciliação'[Status Pedido] = \"FINISHED\"))" },
  { name: "Pedidos sem Pagamento Pago", folder: "03 Financeiro", format: "#,##0", description: "Pedidos finalizados sem transação PAID.", dax: "CALCULATE([Pedidos na Conciliação], KEEPFILTERS('Conciliação'[Status Pedido] = \"FINISHED\"), KEEPFILTERS('Conciliação'[Status Conciliação] IN { \"SEM_PAGAMENTO\", \"SEM_PAGAMENTO_PAGO\" }))" }
];

const htmlMeasures = [
  {
    name: "HTML | KPIs Executivos",
    description: "Painel HTML/CSS com os KPIs comerciais principais.",
    dax: `VAR Periodo = FORMAT(MIN('Calendário'[Data]), "dd/MM/yyyy") & " a " & FORMAT(MAX('Calendário'[Data]), "dd/MM/yyyy")
VAR CorMargem = IF([Margem Entrega] >= 0, "${colors.green}", "${colors.red}")
RETURN
"<div style=\"font-family:Segoe UI,Arial,sans-serif;color:${colors.text};background:${colors.surface};border:1px solid ${colors.border};border-radius:14px;padding:14px 16px;box-sizing:border-box;width:100%;height:100%;\">" &
"<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;\"><div style=\"font-size:13px;font-weight:700;letter-spacing:.04em;\">VISÃO EXECUTIVA</div><div style=\"font-size:10px;color:${colors.muted};\">" & Periodo & "</div></div>" &
"<div style=\"display:flex;gap:10px;height:86px;\">" &
"<div style=\"flex:1;background:${colors.surfaceAlt};border-top:3px solid ${colors.teal};border-radius:10px;padding:10px;box-sizing:border-box;\"><div style=\"font-size:10px;color:${colors.muted};\">VALOR TRANSACIONADO</div><div style=\"font-size:22px;font-weight:750;margin-top:7px;\">" & FORMAT([Valor Transacionado], "R$ #,##0.00", "pt-BR") & "</div></div>" &
"<div style=\"flex:1;background:${colors.surfaceAlt};border-top:3px solid ${colors.blue};border-radius:10px;padding:10px;box-sizing:border-box;\"><div style=\"font-size:10px;color:${colors.muted};\">PEDIDOS FINALIZADOS</div><div style=\"font-size:22px;font-weight:750;margin-top:7px;\">" & FORMAT([Pedidos Finalizados], "#,##0", "pt-BR") & "</div></div>" &
"<div style=\"flex:1;background:${colors.surfaceAlt};border-top:3px solid ${colors.purple};border-radius:10px;padding:10px;box-sizing:border-box;\"><div style=\"font-size:10px;color:${colors.muted};\">TICKET MÉDIO</div><div style=\"font-size:22px;font-weight:750;margin-top:7px;\">" & FORMAT([Ticket Médio], "R$ #,##0.00", "pt-BR") & "</div></div>" &
"<div style=\"flex:1;background:${colors.surfaceAlt};border-top:3px solid ${colors.amber};border-radius:10px;padding:10px;box-sizing:border-box;\"><div style=\"font-size:10px;color:${colors.muted};\">CANCELAMENTO</div><div style=\"font-size:22px;font-weight:750;margin-top:7px;\">" & FORMAT([Taxa Cancelamento], "0.00%", "pt-BR") & "</div></div>" &
"<div style=\"flex:1;background:${colors.surfaceAlt};border-top:3px solid " & CorMargem & ";border-radius:10px;padding:10px;box-sizing:border-box;\"><div style=\"font-size:10px;color:${colors.muted};\">MARGEM ENTREGA</div><div style=\"font-size:22px;font-weight:750;margin-top:7px;color:" & CorMargem & ";\">" & FORMAT([Margem Entrega], "R$ #,##0.00", "pt-BR") & "</div></div>" &
"</div></div>"`
  },
  {
    name: "HTML | Ranking Hubs",
    description: "Ranking HTML/CSS dos cinco hubs com maior valor transacionado.",
    dax: `VAR Base = FILTER(ADDCOLUMNS(VALUES('Hubs'[Hub]), "Valor", [Valor Transacionado]), NOT ISBLANK('Hubs'[Hub]))
VAR TopHubs = TOPN(5, Base, [Valor], DESC, 'Hubs'[Hub], ASC)
VAR Maximo = MAXX(TopHubs, [Valor])
VAR Linhas = CONCATENATEX(TopHubs, "<div style=\"margin-top:10px;\"><div style=\"display:flex;justify-content:space-between;font-size:11px;\"><span>" & 'Hubs'[Hub] & "</span><span style=\"color:${colors.muted};\">" & FORMAT([Valor], "R$ #,##0", "pt-BR") & "</span></div><div style=\"height:7px;background:${colors.border};border-radius:7px;margin-top:4px;overflow:hidden;\"><div style=\"height:7px;width:" & FORMAT(DIVIDE([Valor], Maximo), "0.0%", "en-US") & ";background:linear-gradient(90deg,${colors.teal},${colors.blue});border-radius:7px;\"></div></div></div>", "", [Valor], DESC)
RETURN "<div style=\"font-family:Segoe UI,Arial,sans-serif;color:${colors.text};background:${colors.surface};border:1px solid ${colors.border};border-radius:14px;padding:15px 18px;box-sizing:border-box;width:100%;height:100%;\"><div style=\"font-size:13px;font-weight:700;\">TOP 5 HUBS POR VALOR</div><div style=\"font-size:10px;color:${colors.muted};margin-top:2px;\">Responde aos filtros da página</div>" & Linhas & "</div>"`
  },
  {
    name: "HTML | KPIs Logística",
    description: "Painel HTML/CSS com os KPIs logísticos principais.",
    dax: `RETURN
"<div style=\"font-family:Segoe UI,Arial,sans-serif;color:${colors.text};background:${colors.surface};border:1px solid ${colors.border};border-radius:14px;padding:14px 16px;box-sizing:border-box;width:100%;height:100%;\">" &
"<div style=\"font-size:13px;font-weight:700;letter-spacing:.04em;margin-bottom:10px;\">PERFORMANCE LOGÍSTICA</div><div style=\"display:flex;gap:10px;height:86px;\">" &
"<div style=\"flex:1;background:${colors.surfaceAlt};border-top:3px solid ${colors.green};border-radius:10px;padding:10px;\"><div style=\"font-size:10px;color:${colors.muted};\">ENTREGA CONCLUÍDA</div><div style=\"font-size:22px;font-weight:750;margin-top:7px;\">" & FORMAT([Taxa Entrega Concluída], "0.00%", "pt-BR") & "</div></div>" &
"<div style=\"flex:1;background:${colors.surfaceAlt};border-top:3px solid ${colors.amber};border-radius:10px;padding:10px;\"><div style=\"font-size:10px;color:${colors.muted};\">MÚLTIPLAS TENTATIVAS</div><div style=\"font-size:22px;font-weight:750;margin-top:7px;\">" & FORMAT([Taxa Múltiplas Tentativas], "0.00%", "pt-BR") & "</div></div>" &
"<div style=\"flex:1;background:${colors.surfaceAlt};border-top:3px solid ${colors.teal};border-radius:10px;padding:10px;\"><div style=\"font-size:10px;color:${colors.muted};\">CICLO P50</div><div style=\"font-size:22px;font-weight:750;margin-top:7px;\">" & FORMAT([Tempo Ciclo P50], "0.00", "pt-BR") & " min</div></div>" &
"<div style=\"flex:1;background:${colors.surfaceAlt};border-top:3px solid ${colors.purple};border-radius:10px;padding:10px;\"><div style=\"font-size:10px;color:${colors.muted};\">CICLO P90</div><div style=\"font-size:22px;font-weight:750;margin-top:7px;\">" & FORMAT([Tempo Ciclo P90], "0.00", "pt-BR") & " min</div></div>" &
"<div style=\"flex:1;background:${colors.surfaceAlt};border-top:3px solid ${colors.blue};border-radius:10px;padding:10px;\"><div style=\"font-size:10px;color:${colors.muted};\">DISTÂNCIA MÉDIA</div><div style=\"font-size:22px;font-weight:750;margin-top:7px;\">" & FORMAT([Distância Média Entrega (km)], "0.00", "pt-BR") & " km</div></div>" &
"</div></div>"`
  },
  {
    name: "HTML | Ranking Tentativas",
    description: "Ranking HTML/CSS dos hubs com maior taxa de múltiplas tentativas.",
    dax: `VAR Base = FILTER(ADDCOLUMNS(VALUES('Hubs'[Hub]), "Taxa", [Taxa Múltiplas Tentativas]), NOT ISBLANK('Hubs'[Hub]))
VAR TopHubs = TOPN(5, Base, [Taxa], DESC, 'Hubs'[Hub], ASC)
VAR Maximo = MAXX(TopHubs, [Taxa])
VAR Linhas = CONCATENATEX(TopHubs, "<div style=\"margin-top:10px;\"><div style=\"display:flex;justify-content:space-between;font-size:11px;\"><span>" & 'Hubs'[Hub] & "</span><span style=\"color:${colors.muted};\">" & FORMAT([Taxa], "0.00%", "pt-BR") & "</span></div><div style=\"height:7px;background:${colors.border};border-radius:7px;margin-top:4px;overflow:hidden;\"><div style=\"height:7px;width:" & FORMAT(DIVIDE([Taxa], Maximo), "0.0%", "en-US") & ";background:linear-gradient(90deg,${colors.amber},${colors.red});border-radius:7px;\"></div></div></div>", "", [Taxa], DESC)
RETURN "<div style=\"font-family:Segoe UI,Arial,sans-serif;color:${colors.text};background:${colors.surface};border:1px solid ${colors.border};border-radius:14px;padding:15px 18px;box-sizing:border-box;width:100%;height:100%;\"><div style=\"font-size:13px;font-weight:700;\">HUBS COM MAIS RETENTATIVAS</div><div style=\"font-size:10px;color:${colors.muted};margin-top:2px;\">Última tentativa registrada por pedido</div>" & Linhas & "</div>"`
  },
  {
    name: "HTML | KPIs Financeiros",
    description: "Painel HTML/CSS com os KPIs financeiros e de conciliação.",
    dax: `RETURN
"<div style=\"font-family:Segoe UI,Arial,sans-serif;color:${colors.text};background:${colors.surface};border:1px solid ${colors.border};border-radius:14px;padding:14px 16px;box-sizing:border-box;width:100%;height:100%;\">" &
"<div style=\"font-size:13px;font-weight:700;letter-spacing:.04em;margin-bottom:10px;\">FINANCEIRO E CONCILIAÇÃO</div><div style=\"display:flex;gap:10px;height:86px;\">" &
"<div style=\"flex:1;background:${colors.surfaceAlt};border-top:3px solid ${colors.teal};border-radius:10px;padding:10px;\"><div style=\"font-size:10px;color:${colors.muted};\">VALOR PAGO</div><div style=\"font-size:22px;font-weight:750;margin-top:7px;\">" & FORMAT([Valor Pago], "R$ #,##0.00", "pt-BR") & "</div></div>" &
"<div style=\"flex:1;background:${colors.surfaceAlt};border-top:3px solid ${colors.green};border-radius:10px;padding:10px;\"><div style=\"font-size:10px;color:${colors.muted};\">CONCILIAÇÃO</div><div style=\"font-size:22px;font-weight:750;margin-top:7px;\">" & FORMAT([Taxa Conciliação], "0.00%", "pt-BR") & "</div></div>" &
"<div style=\"flex:1;background:${colors.surfaceAlt};border-top:3px solid ${colors.blue};border-radius:10px;padding:10px;\"><div style=\"font-size:10px;color:${colors.muted};\">TRANSAÇÕES PAGAS</div><div style=\"font-size:22px;font-weight:750;margin-top:7px;\">" & FORMAT([Transações Pagas], "#,##0", "pt-BR") & "</div></div>" &
"<div style=\"flex:1;background:${colors.surfaceAlt};border-top:3px solid ${colors.red};border-radius:10px;padding:10px;\"><div style=\"font-size:10px;color:${colors.muted};\">CHARGEBACK</div><div style=\"font-size:22px;font-weight:750;margin-top:7px;\">" & FORMAT([Valor Chargeback], "R$ #,##0.00", "pt-BR") & "</div></div>" &
"<div style=\"flex:1;background:${colors.surfaceAlt};border-top:3px solid ${colors.amber};border-radius:10px;padding:10px;\"><div style=\"font-size:10px;color:${colors.muted};\">DIFERENÇA ABSOLUTA</div><div style=\"font-size:22px;font-weight:750;margin-top:7px;\">" & FORMAT([Diferença Absoluta Conciliação], "R$ #,##0.00", "pt-BR") & "</div></div>" &
"</div></div>"`
  },
  {
    name: "HTML | Status Conciliação",
    description: "Distribuição HTML/CSS dos pedidos por status de conciliação.",
    dax: `VAR Base = FILTER(ADDCOLUMNS(VALUES('Conciliação'[Status Conciliação]), "Pedidos", [Pedidos na Conciliação]), NOT ISBLANK('Conciliação'[Status Conciliação]))
VAR TotalPedidos = SUMX(Base, [Pedidos])
VAR Linhas = CONCATENATEX(Base, "<div style=\"margin-top:9px;\"><div style=\"display:flex;justify-content:space-between;font-size:10px;\"><span>" & SUBSTITUTE('Conciliação'[Status Conciliação], "_", " ") & "</span><span style=\"color:${colors.muted};\">" & FORMAT([Pedidos], "#,##0", "pt-BR") & " · " & FORMAT(DIVIDE([Pedidos], TotalPedidos), "0.0%", "pt-BR") & "</span></div><div style=\"height:6px;background:${colors.border};border-radius:6px;margin-top:3px;overflow:hidden;\"><div style=\"height:6px;width:" & FORMAT(DIVIDE([Pedidos], TotalPedidos), "0.0%", "en-US") & ";background:${colors.purple};border-radius:6px;\"></div></div></div>", "", [Pedidos], DESC)
RETURN "<div style=\"font-family:Segoe UI,Arial,sans-serif;color:${colors.text};background:${colors.surface};border:1px solid ${colors.border};border-radius:14px;padding:15px 18px;box-sizing:border-box;width:100%;height:100%;\"><div style=\"font-size:13px;font-weight:700;\">STATUS DE CONCILIAÇÃO</div><div style=\"font-size:10px;color:${colors.muted};margin-top:2px;\">Uma linha por pedido, sem fanout de pagamentos</div>" & Linhas & "</div>"`
  },
  {
    name: "HTML | Detalhe Pedido",
    description: "Cabeçalho HTML/CSS do pedido selecionado via drill-through.",
    dax: `VAR PedidoId = SELECTEDVALUE('Pedido'[Pedido ID])
VAR StatusPedido = SELECTEDVALUE('Pedidos'[Status Pedido], "Vários")
VAR Loja = SELECTEDVALUE('Lojas'[Loja], "Várias")
VAR Canal = SELECTEDVALUE('Canais'[Canal], "Vários")
RETURN
"<div style=\"font-family:Segoe UI,Arial,sans-serif;color:${colors.text};background:${colors.surface};border:1px solid ${colors.border};border-radius:14px;padding:18px 20px;box-sizing:border-box;width:100%;height:100%;\"><div style=\"display:flex;justify-content:space-between;align-items:flex-start;\"><div><div style=\"font-size:10px;color:${colors.muted};letter-spacing:.08em;\">PEDIDO SELECIONADO</div><div style=\"font-size:28px;font-weight:800;margin-top:4px;\">#" & COALESCE(FORMAT(PedidoId, "0"), "—") & "</div></div><div style=\"background:${colors.surfaceAlt};border:1px solid ${colors.border};border-radius:999px;padding:7px 12px;font-size:11px;font-weight:700;\">" & StatusPedido & "</div></div><div style=\"display:flex;gap:26px;margin-top:15px;font-size:11px;color:${colors.muted};\"><span>Loja: <b style=\"color:${colors.text};\">" & Loja & "</b></span><span>Canal: <b style=\"color:${colors.text};\">" & Canal & "</b></span><span>Valor: <b style=\"color:${colors.text};\">" & FORMAT([Valor Transacionado], "R$ #,##0.00", "pt-BR") & "</b></span></div></div>"`
  }
];

// DAX delimita textos com aspas duplas. Os atributos HTML usam aspas simples
// para que o conteúdo CSS permaneça válido sem escapar as strings DAX.
for (const measure of htmlMeasures) {
  measure.dax = measure.dax
    .replaceAll('style="', "style='")
    .replaceAll(';"', ";'");
}

function measureTmdl(measure) {
  return [
    `\t/// ${measure.description}`,
    `\tmeasure ${q(measure.name)} = \`\`\``,
    indent(measure.dax, 3),
    "\t\t\`\`\`",
    `\t\tformatString: ${measure.format ?? "General"}`,
    `\t\tdisplayFolder: "${measure.folder ?? "90 HTML"}"`
  ].join("\n");
}

function metricsTmdl() {
  const measures = [...daxMeasures, ...htmlMeasures];
  const parts = [
    "/// Tabela utilitária que centraliza todas as medidas explícitas do modelo.",
    "table 'Métricas'"
  ];
  for (const measure of measures) parts.push("", measureTmdl(measure));
  parts.push(
    "",
    "\tcolumn Controle",
    "\t\tisHidden",
    "\t\tsourceColumn: [Controle]",
    "",
    "\tpartition 'Métricas' = calculated",
    "\t\tmode: import",
    "\t\tsource = ROW(\"Controle\", 1)"
  );
  return parts.join("\n");
}

function relationshipsTmdl() {
  const relationships = [];
  function add(fromTable, fromColumn, toTable, toColumn) {
    relationships.push({ fromTable, fromColumn, toTable, toColumn });
  }

  for (const fact of ["Pedidos", "Entregas", "Pagamentos", "Conciliação"]) {
    add(fact, "Chave Data", "Calendário", "Chave Data");
    add(fact, "Chave Hub", "Hubs", "Chave Hub");
    add(fact, "Chave Loja", "Lojas", "Chave Loja");
    add(fact, "Chave Pedido", "Pedido", "Chave Pedido");
  }
  for (const fact of ["Pedidos", "Pagamentos", "Conciliação"]) {
    add(fact, "Chave Canal", "Canais", "Chave Canal");
  }
  add("Entregas", "Chave Entregador", "Entregadores", "Chave Entregador");

  return relationships.map((relationship) => [
    `relationship ${stableId("relationship", `${relationship.fromTable}-${relationship.toTable}`)}`,
    `\tfromColumn: ${q(relationship.fromTable)}.${q(relationship.fromColumn)}`,
    `\ttoColumn: ${q(relationship.toTable)}.${q(relationship.toColumn)}`
  ].join("\n")).join("\n\n");
}

safeReset(reportDir);
safeReset(modelDir);

writeJson(`${projectName}.pbip`, {
  $schema: schemas.pbip,
  version: "1.0",
  artifacts: [{ report: { path: reportName } }],
  settings: { enableAutoRecovery: true }
});

writeJson(`${reportName}/.platform`, {
  $schema: schemas.platform,
  metadata: {
    type: "Report",
    displayName: "Delivery Center Analytics",
    description: "Dashboard comercial, logístico e financeiro do mini data mart de delivery."
  },
  config: {
    version: "2.0",
    logicalId: "dc59c1ba-6db8-4f96-a88a-3bb1489f7fb8"
  }
});

writeJson(`${modelName}/.platform`, {
  $schema: schemas.platform,
  metadata: {
    type: "SemanticModel",
    displayName: "Delivery Center Analytics",
    description: "Modelo semântico em estrela conectado às views PostgreSQL do schema mart."
  },
  config: {
    version: "2.0",
    logicalId: "91e40e34-0988-45ac-8ee6-645628bf952f"
  }
});

writeJson(`${reportName}/definition.pbir`, {
  $schema: schemas.pbir,
  version: "4.0",
  datasetReference: { byPath: { path: `../${modelName}` } }
});

writeJson(`${modelName}/definition.pbism`, {
  $schema: schemas.pbism,
  version: "4.2",
  settings: { qnaEnabled: true }
});

write(`${modelName}/definition/database.tmdl`, [
  "database DeliveryCenterAnalytics",
  "\tcompatibilityLevel: 1702",
  "\tcompatibilityMode: powerBI",
  "\tlanguage: 1046"
].join("\n"));

write(`${modelName}/definition/model.tmdl`, [
  "model Model",
  "\tculture: pt-BR",
  "\tdefaultPowerBIDataSourceVersion: powerBI_V3",
  "\tsourceQueryCulture: pt-BR",
  "\tdiscourageImplicitMeasures",
  "",
  ...tables.map((table) => `ref table ${q(table.name)}`),
  "ref table 'Métricas'"
].join("\n"));

write(`${modelName}/definition/expressions.tmdl`, [
  "expression 'Servidor PostgreSQL' = \"localhost:5432\" meta [IsParameterQuery=true, Type=\"Text\", IsParameterQueryRequired=true]",
  "",
  "expression 'Banco PostgreSQL' = \"mini_datamart_delivery\" meta [IsParameterQuery=true, Type=\"Text\", IsParameterQueryRequired=true]"
].join("\n"));

for (const table of tables) {
  write(`${modelName}/definition/tables/${table.name}.tmdl`, tableTmdl(table));
}
write(`${modelName}/definition/tables/Métricas.tmdl`, metricsTmdl());
write(`${modelName}/definition/relationships.tmdl`, relationshipsTmdl());

write(`${modelName}/DAXQueries/Validacao KPIs.dax`, `EVALUATE
ROW(
    "Pedidos Criados", [Pedidos Criados],
    "Pedidos Finalizados", [Pedidos Finalizados],
    "Pedidos Cancelados", [Pedidos Cancelados],
    "Taxa Cancelamento", [Taxa Cancelamento],
    "Valor Transacionado", [Valor Transacionado],
    "Ticket Médio", [Ticket Médio],
    "Margem Entrega", [Margem Entrega],
    "Tempo Ciclo P50", [Tempo Ciclo P50],
    "Tempo Ciclo P90", [Tempo Ciclo P90],
    "Taxa Entrega Concluída", [Taxa Entrega Concluída],
    "Taxa Múltiplas Tentativas", [Taxa Múltiplas Tentativas],
    "Valor Pago", [Valor Pago],
    "Valor Chargeback", [Valor Chargeback],
    "Taxa Conciliação", [Taxa Conciliação]
)`);

const themeFile = "DeliveryCenterDark-4f61c2a9.json";
writeJson(`${reportName}/StaticResources/RegisteredResources/${themeFile}`, {
  name: themeFile,
  dataColors: [colors.teal, colors.blue, colors.purple, colors.green, colors.amber, colors.red, "#38BDF8", "#F472B6"],
  good: colors.green,
  neutral: colors.amber,
  bad: colors.red,
  maximum: colors.teal,
  center: colors.amber,
  minimum: colors.blue,
  null: colors.muted,
  foreground: colors.text,
  foregroundNeutralSecondary: colors.muted,
  background: colors.canvas,
  backgroundLight: colors.surface,
  backgroundNeutral: colors.surfaceAlt,
  tableAccent: colors.teal,
  textClasses: {
    callout: { fontFace: "Segoe UI Semibold", fontSize: 28, color: colors.text },
    title: { fontFace: "Segoe UI Semibold", fontSize: 13, color: colors.text },
    header: { fontFace: "Segoe UI Semibold", fontSize: 11, color: colors.text },
    label: { fontFace: "Segoe UI", fontSize: 10, color: colors.muted }
  },
  visualStyles: {
    "*": {
      "*": {
        title: [{ show: true, fontColor: { solid: { color: colors.text } }, fontFamily: "Segoe UI Semibold", fontSize: 12 }],
        background: [{ show: true, color: { solid: { color: colors.surface } }, transparency: 0 }],
        border: [{ show: true, color: { solid: { color: colors.border } }, radius: 12, width: 1 }],
        visualHeader: [{ show: true, foreground: { solid: { color: colors.muted } }, transparency: 0 }]
      }
    }
  }
});

writeJson(`${reportName}/definition/report.json`, {
  $schema: schemas.report,
  themeCollection: {
    customTheme: {
      name: themeFile,
      reportVersionAtImport: {
        visual: "2.9.0",
        page: "2.1.0",
        report: "3.3.0"
      },
      type: "RegisteredResources"
    }
  },
  publicCustomVisuals: [htmlVisualType],
  resourcePackages: [{
    name: "RegisteredResources",
    type: "RegisteredResources",
    items: [{ name: themeFile, path: themeFile, type: "CustomTheme" }]
  }],
  settings: {
    hideVisualContainerHeader: false,
    useStylableVisualContainerHeader: true,
    exportDataMode: "AllowSummarized",
    defaultFilterActionIsDataFilter: true,
    defaultDrillFilterOtherVisuals: true,
    useEnhancedTooltips: true,
    filterPaneHiddenInEditMode: true,
    pagesPosition: "Bottom"
  },
  annotations: [
    { name: "owner", value: "Mini Data Mart Delivery Center" },
    { name: "source", value: "PostgreSQL mart views" },
    { name: "htmlVisual", value: "HTML Content (lite) - AppSource" }
  ]
});

writeJson(`${reportName}/definition/version.json`, {
  $schema: schemas.version,
  version: "2.0.0"
});

const pages = {
  executive: { name: "e1e1e1e1e1e1e1e1e1e1", displayName: "01 Executivo" },
  logistics: { name: "102030405060708090ab", displayName: "02 Logística" },
  finance: { name: "abcdef0123456789abcd", displayName: "03 Financeiro" },
  detail: { name: "deadbeefdeadbeefdead", displayName: "04 Detalhe do Pedido" }
};

writeJson(`${reportName}/definition/pages/pages.json`, {
  $schema: schemas.pages,
  pageOrder: [pages.executive.name, pages.logistics.name, pages.finance.name, pages.detail.name],
  activePageName: pages.executive.name
});

let z = 1000;
const pos = (x, y, width, height) => ({ x, y, width, height, z: (z += 1000) });

const executivePage = { name: pages.executive.name, value: pageDefinition(pages.executive.name, pages.executive.displayName) };
const executiveVisuals = [
  visualFile(executivePage.name, "title", pos(24, 12, 500, 68), textboxVisual("Delivery Center Analytics", "Visão executiva · comercial, margem e experiência")),
  visualFile(executivePage.name, "date", pos(536, 8, 216, 80), slicerVisual("Calendário", "Data", "Período", "Between")),
  visualFile(executivePage.name, "hub", pos(760, 8, 152, 80), slicerVisual("Hubs", "Hub", "Hub")),
  visualFile(executivePage.name, "store", pos(920, 8, 168, 80), slicerVisual("Lojas", "Loja", "Loja")),
  visualFile(executivePage.name, "channel", pos(1096, 8, 160, 80), slicerVisual("Canais", "Canal", "Canal")),
  visualFile(executivePage.name, "kpis", pos(24, 104, 1232, 144), htmlVisual("HTML | KPIs Executivos")),
  visualFile(executivePage.name, "trend", pos(24, 264, 600, 224), cartesianVisual("lineChart", "Valor transacionado por dia", { table: "Calendário", property: "Data" }, ["Valor Transacionado"], ["Pedidos Finalizados", "Taxa Cancelamento"])),
  visualFile(executivePage.name, "hub-ranking", pos(640, 264, 616, 224), htmlVisual("HTML | Ranking Hubs")),
  visualFile(executivePage.name, "channel-mix", pos(24, 504, 392, 192), cartesianVisual("clusteredColumnChart", "Pedidos por canal", { table: "Canais", property: "Canal" }, ["Pedidos Finalizados", "Pedidos Cancelados"], ["Valor Transacionado"])),
  visualFile(executivePage.name, "stores", pos(432, 504, 824, 192), tableVisual("Ranking de lojas", [
    { table: "Lojas", property: "Loja", kind: "column" },
    { property: "Pedidos Finalizados", kind: "measure" },
    { property: "Valor Transacionado", kind: "measure" },
    { property: "Ticket Médio", kind: "measure" },
    { property: "Taxa Cancelamento", kind: "measure" },
    { property: "Margem Entrega", kind: "measure" }
  ], "Valor Transacionado"))
];
addPage(executivePage, executiveVisuals);

z = 1000;
const logisticsPage = { name: pages.logistics.name, value: pageDefinition(pages.logistics.name, pages.logistics.displayName) };
const logisticsVisuals = [
  visualFile(logisticsPage.name, "title", pos(24, 12, 500, 68), textboxVisual("Logística", "Entrega, retentativas, distância e tempo de ciclo")),
  visualFile(logisticsPage.name, "date", pos(536, 8, 216, 80), slicerVisual("Calendário", "Data", "Período", "Between")),
  visualFile(logisticsPage.name, "hub", pos(760, 8, 152, 80), slicerVisual("Hubs", "Hub", "Hub")),
  visualFile(logisticsPage.name, "modal", pos(920, 8, 168, 80), slicerVisual("Entregadores", "Modal Entregador", "Modal")),
  visualFile(logisticsPage.name, "driver-type", pos(1096, 8, 160, 80), slicerVisual("Entregadores", "Tipo Entregador", "Tipo")),
  visualFile(logisticsPage.name, "kpis", pos(24, 104, 1232, 144), htmlVisual("HTML | KPIs Logística")),
  visualFile(logisticsPage.name, "cycle", pos(24, 264, 600, 224), cartesianVisual("lineChart", "Tempo de ciclo P50 e P90", { table: "Calendário", property: "Data" }, ["Tempo Ciclo P50", "Tempo Ciclo P90"], ["Pedidos com Entrega"])),
  visualFile(logisticsPage.name, "retry-ranking", pos(640, 264, 616, 224), htmlVisual("HTML | Ranking Tentativas")),
  visualFile(logisticsPage.name, "modal-rate", pos(24, 504, 392, 192), cartesianVisual("clusteredBarChart", "Conclusão por modal", { table: "Entregadores", property: "Modal Entregador" }, ["Taxa Entrega Concluída"], ["Pedidos com Entrega", "Taxa Múltiplas Tentativas"])),
  visualFile(logisticsPage.name, "hub-table", pos(432, 504, 824, 192), tableVisual("Performance por hub", [
    { table: "Hubs", property: "Hub", kind: "column" },
    { property: "Pedidos com Entrega", kind: "measure" },
    { property: "Taxa Entrega Concluída", kind: "measure" },
    { property: "Taxa Múltiplas Tentativas", kind: "measure" },
    { property: "Distância Média Entrega (km)", kind: "measure" },
    { property: "Tempo Ciclo P90", kind: "measure" }
  ], "Pedidos com Entrega"))
];
addPage(logisticsPage, logisticsVisuals);

z = 1000;
const financePage = { name: pages.finance.name, value: pageDefinition(pages.finance.name, pages.finance.displayName) };
const financeVisuals = [
  visualFile(financePage.name, "title", pos(24, 12, 500, 68), textboxVisual("Financeiro", "Pagamentos, taxas, chargebacks e conciliação")),
  visualFile(financePage.name, "date", pos(536, 8, 216, 80), slicerVisual("Calendário", "Data", "Período", "Between")),
  visualFile(financePage.name, "hub", pos(760, 8, 152, 80), slicerVisual("Hubs", "Hub", "Hub")),
  visualFile(financePage.name, "channel", pos(920, 8, 168, 80), slicerVisual("Canais", "Canal", "Canal")),
  visualFile(financePage.name, "method", pos(1096, 8, 160, 80), slicerVisual("Pagamentos", "Meio Pagamento", "Pagamento")),
  visualFile(financePage.name, "kpis", pos(24, 104, 1232, 144), htmlVisual("HTML | KPIs Financeiros")),
  visualFile(financePage.name, "paid-trend", pos(24, 264, 600, 224), cartesianVisual("lineChart", "Valor pago por dia", { table: "Calendário", property: "Data" }, ["Valor Pago"], ["Taxas Pagamento", "Valor Chargeback"])),
  visualFile(financePage.name, "reconciliation", pos(640, 264, 616, 224), htmlVisual("HTML | Status Conciliação")),
  visualFile(financePage.name, "payment-mix", pos(24, 504, 392, 192), donutVisual("Mix de valor pago", { table: "Pagamentos", property: "Meio Pagamento" }, "Valor Pago", ["Transações Pagas", "Taxas Pagamento"])),
  visualFile(financePage.name, "payment-table", pos(432, 504, 824, 192), tableVisual("Detalhe por meio de pagamento", [
    { table: "Pagamentos", property: "Meio Pagamento", kind: "column" },
    { property: "Transações Pagas", kind: "measure" },
    { property: "Valor Pago", kind: "measure" },
    { property: "Taxas Pagamento", kind: "measure" },
    { property: "Valor Líquido Pago", kind: "measure" },
    { property: "Valor Chargeback", kind: "measure" }
  ], "Valor Pago"))
];
addPage(financePage, financeVisuals);

z = 1000;
const detailPage = { name: pages.detail.name, value: pageDefinition(pages.detail.name, pages.detail.displayName, { drillthrough: true }) };
const detailVisuals = [
  visualFile(detailPage.name, "title", pos(24, 12, 720, 68), textboxVisual("Detalhe do Pedido", "Acesse com botão direito em um pedido → Drill-through")),
  visualFile(detailPage.name, "back", pos(1120, 16, 136, 56), backButtonVisual()),
  visualFile(detailPage.name, "detail-header", pos(24, 96, 1232, 128), htmlVisual("HTML | Detalhe Pedido")),
  visualFile(detailPage.name, "order-detail", pos(24, 240, 1232, 144), tableVisual("Pedido", [
    { table: "Pedido", property: "Pedido ID", kind: "column" },
    { table: "Pedidos", property: "Status Pedido", kind: "column" },
    { table: "Lojas", property: "Loja", kind: "column" },
    { table: "Canais", property: "Canal", kind: "column" },
    { table: "Pedidos", property: "Valor Total Pedido", kind: "column" },
    { table: "Pedidos", property: "Margem Entrega", kind: "column" },
    { table: "Pedidos", property: "Pedido Criado Em", kind: "column" },
    { table: "Pedidos", property: "Pedido Finalizado Em", kind: "column" },
    { table: "Pedidos", property: "Tempo Ciclo", kind: "column" }
  ])),
  visualFile(detailPage.name, "delivery-detail", pos(24, 400, 608, 296), tableVisual("Tentativas de entrega", [
    { table: "Entregas", property: "Entrega ID", kind: "column" },
    { table: "Entregas", property: "Status Entrega", kind: "column" },
    { table: "Entregadores", property: "Modal Entregador", kind: "column" },
    { table: "Entregas", property: "Número Tentativa", kind: "column" },
    { table: "Entregas", property: "É Última Tentativa", kind: "column" },
    { table: "Entregas", property: "Distância Entrega (m)", kind: "column" }
  ])),
  visualFile(detailPage.name, "payment-detail", pos(648, 400, 608, 296), tableVisual("Transações de pagamento", [
    { table: "Pagamentos", property: "Pagamento ID", kind: "column" },
    { table: "Pagamentos", property: "Meio Pagamento", kind: "column" },
    { table: "Pagamentos", property: "Status Pagamento", kind: "column" },
    { table: "Pagamentos", property: "Valor Pagamento", kind: "column" },
    { table: "Pagamentos", property: "Taxa Pagamento", kind: "column" },
    { table: "Pagamentos", property: "Valor Líquido Pagamento", kind: "column" }
  ]))
];
addPage(detailPage, detailVisuals);

write(`${reportName}/CustomVisuals/README.md`, `# Visual HTML utilizado

O relatório referencia o visual público certificado **HTML Content (lite)** pelo identificador:

\`${htmlVisualType}\`

Como é um visual do AppSource, o Power BI Desktop o carrega automaticamente quando permitido pelo tenant. Se o visual aparecer como indisponível, importe **HTML Content (lite)** em \`Obter mais visuais > AppSource\` e reabra o projeto.
`);

console.log(`PBIP gerado em ${join(powerbiDir, `${projectName}.pbip`)}`);
