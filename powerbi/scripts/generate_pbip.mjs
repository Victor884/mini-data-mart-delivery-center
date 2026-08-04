import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const pbRoot = path.join(root, "powerbi");
const projectName = "DeliveryCenter";
const reportDir = path.join(pbRoot, `${projectName}.Report`);
const modelDir = path.join(pbRoot, `${projectName}.SemanticModel`);
const reportDefinition = path.join(reportDir, "definition");
const pagesDir = path.join(reportDefinition, "pages");

const schemas = {
  pbip: "https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json",
  pbir: "https://developer.microsoft.com/json-schemas/fabric/item/report/definitionProperties/2.0.0/schema.json",
  pbism: "https://developer.microsoft.com/json-schemas/fabric/item/semanticModel/definitionProperties/1.0.0/schema.json",
  version: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/versionMetadata/1.0.0/schema.json",
  report: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/report/3.3.0/schema.json",
  pages: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/pagesMetadata/1.0.0/schema.json",
  page: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/page/2.1.0/schema.json",
  visual: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.9.0/schema.json",
  platform: "https://developer.microsoft.com/json-schemas/fabric/gitIntegration/platformProperties/2.0.0/schema.json",
};

const colors = {
  ink: "#10233A",
  muted: "#607085",
  green: "#00A86B",
  greenBright: "#20D49B",
  blue: "#2878D0",
  cyan: "#20B7D8",
  amber: "#F2B84B",
  red: "#E45555",
  canvas: "#F3F6F9",
  panel: "#FFFFFF",
  border: "#DDE5ED",
  darkCanvas: "#071522",
  darkPanel: "#10283B",
  darkBorder: "#23445C",
  darkText: "#F2F8FC",
  darkMuted: "#9FB4C4",
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(file, value) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, value.replace(/\r?\n/g, "\r\n"), "utf8");
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

function fill(value) {
  return { solid: { color: text(value) } };
}

function columnField(property) {
  return {
    Column: {
      Expression: { SourceRef: { Entity: "FatoDashboard" } },
      Property: property,
    },
  };
}

function measureField(property) {
  return {
    Measure: {
      Expression: { SourceRef: { Entity: "FatoDashboard" } },
      Property: property,
    },
  };
}

function projection(kind, property, active = undefined) {
  const item = {
    field: kind === "measure" ? measureField(property) : columnField(property),
    queryRef: `FatoDashboard.${property}`,
    nativeQueryRef: property,
  };
  if (active !== undefined) item.active = active;
  return item;
}

function chrome({ background, border, title, titleColor, padding = 10, radius = 12 }) {
  const vco = {
    background: [{ properties: { show: bool(true), color: fill(background), transparency: number(0) } }],
    border: [{ properties: { show: bool(true), color: fill(border), radius: number(radius), width: number(1) } }],
    padding: [{ properties: { top: number(padding), right: number(padding), bottom: number(padding), left: number(padding) } }],
    visualHeader: [{ properties: { show: bool(false) } }],
  };
  if (title) {
    vco.title = [{ properties: {
      show: bool(true), text: text(title), bold: bool(true), fontFamily: text("Segoe UI Semibold"),
      fontSize: number(13), fontColor: fill(titleColor), titleWrap: bool(false),
    } }];
  } else {
    vco.title = [{ properties: { show: bool(false) } }];
  }
  return vco;
}

function transparentChrome() {
  return {
    background: [{ properties: { show: bool(false) } }],
    border: [{ properties: { show: bool(false) } }],
    padding: [{ properties: { top: number(0), right: number(0), bottom: number(0), left: number(0) } }],
    visualHeader: [{ properties: { show: bool(false) } }],
  };
}

function baseVisual(name, position, visual) {
  return { $schema: schemas.visual, name, position, visual };
}

function textbox(name, position, value, size, color, family = "Segoe UI Semibold") {
  return baseVisual(name, position, {
    visualType: "textbox",
    objects: {
      general: [{ properties: { paragraphs: [{ textRuns: [{ value, textStyle: {
        fontFamily: family, fontSize: `${size}px`, color,
      } }], horizontalTextAlignment: "left" }] } }],
    },
    visualContainerObjects: transparentChrome(),
  });
}

function slicer(name, position, property, label, mode = "Dropdown") {
  return baseVisual(name, position, {
    visualType: "slicer",
    query: { queryState: { Values: { projections: [projection("column", property)] } } },
    objects: {
      data: [{ properties: { mode: text(mode) } }],
      header: [{ properties: {
        show: bool(true), text: text(label), fontFamily: text("Segoe UI Semibold"), textSize: number(11),
        fontColor: fill(colors.ink), background: fill(colors.panel),
      } }],
      items: [{ properties: { fontFamily: text("Segoe UI"), textSize: number(10), fontColor: fill(colors.ink) } }],
    },
    visualContainerObjects: chrome({ background: colors.panel, border: colors.border, titleColor: colors.ink, padding: 8, radius: 10 }),
  });
}

function card(name, position, measure, accent, dark = false) {
  const foreground = dark ? colors.darkText : accent;
  const labelColor = dark ? colors.darkMuted : colors.muted;
  return baseVisual(name, position, {
    visualType: "cardVisual",
    query: { queryState: { Data: { projections: [projection("measure", measure)] } } },
    objects: {
      value: [{ properties: {
        show: bool(true), fontFamily: text("Segoe UI Semibold"), fontSize: number(24), bold: bool(true),
        fontColor: fill(foreground), labelDisplayUnits: text("0"), labelPrecision: number(2, true), textWrap: bool(false),
      }, selector: { id: "default" } }],
      label: [{ properties: {
        show: bool(true), fontFamily: text("Segoe UI"), fontSize: number(10), fontColor: fill(labelColor),
        position: text("belowValue"), textWrap: bool(true),
      }, selector: { id: "default" } }],
    },
    visualContainerObjects: chrome({
      background: dark ? colors.darkPanel : colors.panel,
      border: dark ? colors.darkBorder : colors.border,
      titleColor: dark ? colors.darkText : colors.ink,
      padding: 12,
    }),
  });
}

function axisObjects(dark = false, showLegend = false) {
  const fg = dark ? colors.darkMuted : colors.muted;
  const grid = dark ? colors.darkBorder : colors.border;
  return {
    categoryAxis: [{ properties: {
      show: bool(true), fontFamily: text("Segoe UI"), fontSize: number(10), labelColor: fill(fg),
      gridlineShow: bool(false), showAxisTitle: bool(false),
    } }],
    valueAxis: [{ properties: {
      show: bool(true), fontFamily: text("Segoe UI"), fontSize: number(10), labelColor: fill(fg),
      gridlineShow: bool(true), gridlineColor: fill(grid), gridlineTransparency: number(dark ? 35 : 20),
      showAxisTitle: bool(false),
    } }],
    legend: [{ properties: {
      show: bool(showLegend), position: text("Top"), showTitle: bool(false), fontFamily: text("Segoe UI"),
      fontSize: number(10), labelColor: fill(fg),
    } }],
  };
}

function chart(name, position, { type, category, measures, title, dark = false, color, secondary = [] }) {
  const queryState = {
    Category: { projections: [projection("column", category, true)] },
  };
  if (measures.length) queryState.Y = { projections: measures.map((m) => projection("measure", m)) };
  if (secondary.length) queryState.Y2 = { projections: secondary.map((m) => projection("measure", m)) };

  const objects = axisObjects(dark, measures.length + secondary.length > 1);
  if (color && ["barChart", "clusteredBarChart", "columnChart", "clusteredColumnChart", "lineClusteredColumnComboChart"].includes(type)) {
    objects.dataPoint = [{ properties: { defaultColor: fill(color), fillTransparency: number(0) } }];
  }
  return baseVisual(name, position, {
    visualType: type,
    query: { queryState },
    objects,
    visualContainerObjects: chrome({
      background: dark ? colors.darkPanel : colors.panel,
      border: dark ? colors.darkBorder : colors.border,
      title,
      titleColor: dark ? colors.darkText : colors.ink,
      padding: 10,
    }),
    drillFilterOtherVisuals: true,
  });
}

function donut(name, position, { category, measure, title, dark = false }) {
  const fg = dark ? colors.darkMuted : colors.muted;
  return baseVisual(name, position, {
    visualType: "donutChart",
    query: { queryState: {
      Category: { projections: [projection("column", category, true)] },
      Y: { projections: [projection("measure", measure)] },
    } },
    objects: {
      legend: [{ properties: { show: bool(true), position: text("Bottom"), showTitle: bool(false), fontSize: number(10), labelColor: fill(fg) } }],
      labels: [{ properties: { show: bool(true), fontSize: number(9), color: fill(fg), labelStyle: text("Percent of total"), percentageLabelPrecision: number(1, true), position: text("preferOutside") } }],
    },
    visualContainerObjects: chrome({
      background: dark ? colors.darkPanel : colors.panel,
      border: dark ? colors.darkBorder : colors.border,
      title,
      titleColor: dark ? colors.darkText : colors.ink,
      padding: 10,
    }),
  });
}

function matrix(name, position, dark = false) {
  const fg = dark ? colors.darkText : colors.ink;
  const muted = dark ? colors.darkMuted : colors.muted;
  const bg1 = dark ? colors.darkPanel : colors.panel;
  const bg2 = dark ? "#0D2234" : "#F7F9FB";
  const valueMeasures = [
    "Pedidos com Entrega", "Taxa Entrega Concluída", "Tempo Ciclo Logístico P50",
    "Tempo Ciclo Logístico P90", "Taxa Múltiplas Tentativas", "Distância Média Entrega (km)",
  ];
  return baseVisual(name, position, {
    visualType: "pivotTable",
    query: { queryState: {
      Rows: { projections: [projection("column", "Hub")] },
      Values: { projections: valueMeasures.map((m) => projection("measure", m)) },
    } },
    objects: {
      columnHeaders: [{ properties: {
        autoSizeColumnWidth: bool(true), columnAdjustment: text("growToFit"),
        fontFamily: text("Segoe UI Semibold"), fontSize: number(10), fontColor: fill(fg), backColor: fill(bg2),
      } }],
      rowHeaders: [{ properties: {
        fontFamily: text("Segoe UI Semibold"), fontSize: number(10), fontColor: fill(fg), backColor: fill(bg1),
        stepped: bool(false), wordWrap: bool(false),
      } }],
      values: [{ properties: {
        fontFamily: text("Segoe UI"), fontSize: number(10), fontColorPrimary: fill(fg), fontColorSecondary: fill(fg),
        backColorPrimary: fill(bg1), backColorSecondary: fill(bg2), wordWrap: bool(false),
      } }],
    },
    visualContainerObjects: chrome({
      background: bg1,
      border: dark ? colors.darkBorder : colors.border,
      title: "Desempenho por hub",
      titleColor: fg,
      padding: 8,
    }),
  });
}

function pos(x, y, width, height, z) {
  return { x, y, z, height, width, tabOrder: z };
}

function writeVisual(pageId, visual) {
  writeJson(path.join(pagesDir, pageId, "visuals", visual.name, "visual.json"), visual);
}

const pageExecutive = "9e1c7a42d0b54173a101";
const pageLogistics = "a73f26c08b6e4d159202";

const executiveVisuals = [
  textbox("00000000000000000001", pos(24, 16, 600, 40, 1), "Delivery Center — Visão Executiva", 24, colors.ink),
  textbox("00000000000000000002", pos(24, 51, 700, 20, 2), "Resultados comerciais, margem e experiência operacional | Jan–Abr 2021", 11, colors.muted, "Segoe UI"),
  slicer("00000000000000000003", pos(24, 78, 292, 80, 3), "Data", "Período", "Between"),
  slicer("00000000000000000004", pos(332, 78, 292, 80, 4), "Hub", "Hub"),
  slicer("00000000000000000005", pos(640, 78, 292, 80, 5), "Tipo de Canal", "Canal"),
  slicer("00000000000000000006", pos(948, 78, 308, 80, 6), "Status do Pedido", "Status"),
  card("00000000000000000010", pos(24, 166, 232, 94, 10), "Valor Transacionado Finalizado", colors.green),
  card("00000000000000000011", pos(272, 166, 232, 94, 11), "Pedidos Finalizados", colors.blue),
  card("00000000000000000012", pos(520, 166, 232, 94, 12), "Ticket Médio Finalizado", colors.cyan),
  card("00000000000000000013", pos(768, 166, 232, 94, 13), "Taxa de Cancelamento", colors.red),
  card("00000000000000000014", pos(1016, 166, 240, 94, 14), "Margem de Entrega", colors.amber),
  chart("00000000000000000020", pos(24, 274, 608, 214, 20), {
    type: "lineChart", category: "Mês/Ano", measures: ["Valor Transacionado Finalizado"],
    title: "Valor transacionado por mês", color: colors.green,
  }),
  chart("00000000000000000021", pos(648, 274, 608, 214, 21), {
    type: "barChart", category: "Hub", measures: ["Valor Transacionado Finalizado"],
    title: "Valor transacionado por hub", color: colors.blue,
  }),
  chart("00000000000000000022", pos(24, 502, 400, 194, 22), {
    type: "barChart", category: "Hub", measures: ["Margem de Entrega"],
    title: "Margem de entrega por hub", color: colors.red,
  }),
  chart("00000000000000000023", pos(440, 502, 496, 194, 23), {
    type: "lineChart", category: "Mês/Ano", measures: ["Tempo Ciclo P50", "Tempo Ciclo P90"],
    title: "Tempo de ciclo P50 e P90 (min)",
  }),
  donut("00000000000000000024", pos(952, 502, 304, 194, 24), {
    category: "Tipo de Canal", measure: "Pedidos Criados", title: "Mix de canais",
  }),
];

const logisticsVisuals = [
  textbox("10000000000000000001", pos(24, 16, 640, 40, 1), "Delivery Center — Performance Logística", 24, colors.darkText),
  textbox("10000000000000000002", pos(24, 51, 760, 20, 2), "Última tentativa por pedido, tempos de ciclo e retrabalho operacional", 11, colors.darkMuted, "Segoe UI"),
  slicer("10000000000000000003", pos(24, 78, 388, 80, 3), "Data", "Período", "Between"),
  slicer("10000000000000000004", pos(428, 78, 388, 80, 4), "Hub", "Hub"),
  slicer("10000000000000000005", pos(832, 78, 424, 80, 5), "Modal do Entregador", "Modal"),
  card("10000000000000000010", pos(24, 166, 232, 94, 10), "Entregas Concluídas", colors.greenBright, true),
  card("10000000000000000011", pos(272, 166, 232, 94, 11), "Taxa Entrega Concluída", colors.greenBright, true),
  card("10000000000000000012", pos(520, 166, 232, 94, 12), "Tempo Ciclo Logístico P50", colors.cyan, true),
  card("10000000000000000013", pos(768, 166, 232, 94, 13), "Tempo Ciclo Logístico P90", colors.amber, true),
  card("10000000000000000014", pos(1016, 166, 240, 94, 14), "Taxa Múltiplas Tentativas", colors.red, true),
  chart("10000000000000000020", pos(24, 274, 760, 222, 20), {
    type: "lineClusteredColumnComboChart", category: "Mês/Ano", measures: ["Entregas Concluídas"],
    secondary: ["Tempo Ciclo Logístico P50"], title: "Entregas concluídas e tempo P50", dark: true, color: colors.greenBright,
  }),
  donut("10000000000000000021", pos(800, 274, 456, 222, 21), {
    category: "Status da Entrega", measure: "Pedidos com Entrega", title: "Distribuição do status final", dark: true,
  }),
  matrix("10000000000000000022", pos(24, 510, 1232, 186, 22), true),
];

ensureDir(reportDefinition);
ensureDir(path.join(modelDir, "definition", "tables"));

writeJson(path.join(reportDir, ".platform"), {
  $schema: schemas.platform,
  metadata: { type: "Report", displayName: "Delivery Center" },
  config: { version: "2.0", logicalId: "785be78e-d26b-45a0-af59-0be82999e381" },
});
writeJson(path.join(modelDir, ".platform"), {
  $schema: schemas.platform,
  metadata: { type: "SemanticModel", displayName: "Delivery Center" },
  config: { version: "2.0", logicalId: "90a63453-aa10-4ccd-b46e-7080f2978b9d" },
});

writeJson(path.join(pbRoot, `${projectName}.pbip`), {
  $schema: schemas.pbip,
  version: "1.0",
  artifacts: [{ report: { path: `${projectName}.Report` } }],
  settings: { enableAutoRecovery: true },
});

writeJson(path.join(reportDir, "definition.pbir"), {
  $schema: schemas.pbir,
  version: "4.0",
  datasetReference: { byPath: { path: `../${projectName}.SemanticModel` } },
});

writeJson(path.join(reportDefinition, "version.json"), { $schema: schemas.version, version: "2.0.0" });
writeJson(path.join(reportDefinition, "pages", "pages.json"), {
  $schema: schemas.pages,
  pageOrder: [pageExecutive, pageLogistics],
  activePageName: pageExecutive,
});

const themeFile = "DeliveryCenterModern-a04b2026.json";
writeJson(path.join(reportDir, "StaticResources", "RegisteredResources", themeFile), {
  name: themeFile,
  dataColors: [colors.green, colors.blue, colors.cyan, colors.amber, colors.red, "#7357D9", "#45A1A1", "#EE7A4D"],
  background: colors.canvas,
  foreground: colors.ink,
  tableAccent: colors.green,
  good: colors.green,
  neutral: colors.amber,
  bad: colors.red,
  maximum: colors.green,
  center: colors.amber,
  minimum: colors.red,
});

writeJson(path.join(reportDefinition, "report.json"), {
  $schema: schemas.report,
  themeCollection: {
    customTheme: {
      name: themeFile,
      reportVersionAtImport: { visual: "2.9.0", report: "3.3.0", page: "2.1.0" },
      type: "RegisteredResources",
    },
  },
  resourcePackages: [{
    name: "RegisteredResources",
    type: "RegisteredResources",
    items: [{ name: themeFile, path: themeFile, type: "CustomTheme" }],
  }],
  settings: {
    hideVisualContainerHeader: true,
    useStylableVisualContainerHeader: true,
    defaultFilterActionIsDataFilter: true,
    defaultDrillFilterOtherVisuals: true,
    allowChangeFilterTypes: true,
    allowInlineExploration: true,
    useEnhancedTooltips: true,
    filterPaneHiddenInEditMode: true,
    pagesPosition: "Bottom",
    locale: "pt-BR",
  },
});

writeJson(path.join(pagesDir, pageExecutive, "page.json"), {
  $schema: schemas.page,
  name: pageExecutive,
  displayName: "Visão Executiva",
  displayOption: "FitToPage",
  height: 720,
  width: 1280,
  objects: {
    background: [{ properties: { color: fill(colors.canvas), transparency: number(0) } }],
    outspace: [{ properties: { color: fill(colors.canvas), transparency: number(0) } }],
  },
});

writeJson(path.join(pagesDir, pageLogistics, "page.json"), {
  $schema: schemas.page,
  name: pageLogistics,
  displayName: "Performance Logística",
  displayOption: "FitToPage",
  height: 720,
  width: 1280,
  objects: {
    background: [{ properties: { color: fill(colors.darkCanvas), transparency: number(0) } }],
    outspace: [{ properties: { color: fill(colors.darkCanvas), transparency: number(0) } }],
  },
});

for (const visual of executiveVisuals) writeVisual(pageExecutive, visual);
for (const visual of logisticsVisuals) writeVisual(pageLogistics, visual);

writeJson(path.join(modelDir, "definition.pbism"), {
  $schema: schemas.pbism,
  version: "4.2",
  settings: { qnaEnabled: false },
});

writeText(path.join(modelDir, "definition", "database.tmdl"), `database ${projectName}\n\tcompatibilityLevel: 1600\n`);
writeText(path.join(modelDir, "definition", "model.tmdl"), `model Model\n\tculture: pt-BR\n\tdefaultPowerBIDataSourceVersion: powerBI_V3\n\tsourceQueryCulture: pt-BR\n\tdataAccessOptions\n\t\tlegacyRedirects\n\t\treturnErrorValuesAsNull\n\nref table FatoDashboard\n`);

const csvPath = path.join(pbRoot, "data", "fato_dashboard.csv");
const tableTmdl = `table FatoDashboard
\tmeasure 'Pedidos Criados' = COUNTROWS(FatoDashboard)
\t\tformatString: #,0
\t\tdisplayFolder: Comercial

\tmeasure 'Pedidos Finalizados' = CALCULATE([Pedidos Criados], FatoDashboard[Status do Pedido] = "FINISHED")
\t\tformatString: #,0
\t\tdisplayFolder: Comercial

\tmeasure 'Pedidos Cancelados' = CALCULATE([Pedidos Criados], FatoDashboard[Status do Pedido] = "CANCELED")
\t\tformatString: #,0
\t\tdisplayFolder: Comercial

\tmeasure 'Taxa de Cancelamento' = DIVIDE([Pedidos Cancelados], [Pedidos Criados])
\t\tformatString: 0.00%
\t\tdisplayFolder: Comercial

\tmeasure 'Valor Transacionado Finalizado' = CALCULATE(SUM(FatoDashboard[Valor Total Pedido]), FatoDashboard[Status do Pedido] = "FINISHED")
\t\tformatString: R$ #,##0.00
\t\tdisplayFolder: Comercial

\tmeasure 'Ticket Médio Finalizado' = DIVIDE([Valor Transacionado Finalizado], [Pedidos Finalizados])
\t\tformatString: R$ #,##0.00
\t\tdisplayFolder: Comercial

\tmeasure 'Margem de Entrega' = CALCULATE(SUM(FatoDashboard[Margem Entrega]), FatoDashboard[Status do Pedido] = "FINISHED")
\t\tformatString: R$ #,##0.00;[Red]-R$ #,##0.00
\t\tdisplayFolder: Comercial

\tmeasure 'Tempo Ciclo P50' =
\t\t\tPERCENTILEX.INC(
\t\t\t\tFILTER(FatoDashboard, FatoDashboard[Status do Pedido] = "FINISHED" && FatoDashboard[Tempo Ciclo Total (min)] >= 0),
\t\t\t\tFatoDashboard[Tempo Ciclo Total (min)],
\t\t\t\t0.5
\t\t\t)
\t\tformatString: 0.00 "min"
\t\tdisplayFolder: Experiência

\tmeasure 'Tempo Ciclo P90' =
\t\t\tPERCENTILEX.INC(
\t\t\t\tFILTER(FatoDashboard, FatoDashboard[Status do Pedido] = "FINISHED" && FatoDashboard[Tempo Ciclo Total (min)] >= 0),
\t\t\t\tFatoDashboard[Tempo Ciclo Total (min)],
\t\t\t\t0.9
\t\t\t)
\t\tformatString: 0.00 "min"
\t\tdisplayFolder: Experiência

\tmeasure 'Pedidos com Entrega' = CALCULATE([Pedidos Criados], FatoDashboard[Possui Entrega] = TRUE())
\t\tformatString: #,0
\t\tdisplayFolder: Logística

\tmeasure 'Entregas Concluídas' = CALCULATE([Pedidos com Entrega], FatoDashboard[Status da Entrega] = "DELIVERED")
\t\tformatString: #,0
\t\tdisplayFolder: Logística

\tmeasure 'Entregas Não Concluídas' = [Pedidos com Entrega] - [Entregas Concluídas]
\t\tformatString: #,0
\t\tdisplayFolder: Logística

\tmeasure 'Taxa Entrega Concluída' = DIVIDE([Entregas Concluídas], [Pedidos com Entrega])
\t\tformatString: 0.00%
\t\tdisplayFolder: Logística

\tmeasure 'Pedidos Múltiplas Tentativas' = CALCULATE([Pedidos com Entrega], FatoDashboard[Número de Tentativas] > 1)
\t\tformatString: #,0
\t\tdisplayFolder: Logística

\tmeasure 'Taxa Múltiplas Tentativas' = DIVIDE([Pedidos Múltiplas Tentativas], [Pedidos com Entrega])
\t\tformatString: 0.00%
\t\tdisplayFolder: Logística

\tmeasure 'Tempo Ciclo Logístico P50' =
\t\t\tPERCENTILEX.INC(
\t\t\t\tFILTER(FatoDashboard, FatoDashboard[Possui Entrega] = TRUE() && FatoDashboard[Status do Pedido] = "FINISHED" && FatoDashboard[Tempo Ciclo Total (min)] >= 0),
\t\t\t\tFatoDashboard[Tempo Ciclo Total (min)],
\t\t\t\t0.5
\t\t\t)
\t\tformatString: 0.00 "min"
\t\tdisplayFolder: Logística

\tmeasure 'Tempo Ciclo Logístico P90' =
\t\t\tPERCENTILEX.INC(
\t\t\t\tFILTER(FatoDashboard, FatoDashboard[Possui Entrega] = TRUE() && FatoDashboard[Status do Pedido] = "FINISHED" && FatoDashboard[Tempo Ciclo Total (min)] >= 0),
\t\t\t\tFatoDashboard[Tempo Ciclo Total (min)],
\t\t\t\t0.9
\t\t\t)
\t\tformatString: 0.00 "min"
\t\tdisplayFolder: Logística

\tmeasure 'Distância Média Entrega (km)' = DIVIDE(CALCULATE(AVERAGE(FatoDashboard[Distância da Entrega (m)]), FatoDashboard[Status da Entrega] = "DELIVERED"), 1000)
\t\tformatString: 0.00 "km"
\t\tdisplayFolder: Logística

\tcolumn 'ID do Pedido'
\t\tdataType: int64
\t\tsourceColumn: order_id
\t\tsummarizeBy: none
\t\tisHidden

\tcolumn Data
\t\tdataType: dateTime
\t\tformatString: Short Date
\t\tsourceColumn: data_pedido
\t\tsummarizeBy: none

\tcolumn Ano
\t\tdataType: int64
\t\tsourceColumn: ano
\t\tsummarizeBy: none

\tcolumn 'Número do Mês'
\t\tdataType: int64
\t\tsourceColumn: mes_numero
\t\tsummarizeBy: none
\t\tisHidden

\tcolumn 'Nome do Mês'
\t\tdataType: string
\t\tsourceColumn: mes_nome
\t\tsummarizeBy: none

\tcolumn 'Mês/Ano'
\t\tdataType: string
\t\tsourceColumn: mes_ano
\t\tsortByColumn: 'Ordem Mês'
\t\tsummarizeBy: none

\tcolumn 'Ordem Mês'
\t\tdataType: int64
\t\tsourceColumn: mes_ordem
\t\tsummarizeBy: none
\t\tisHidden

\tcolumn 'ID do Hub'
\t\tdataType: int64
\t\tsourceColumn: hub_id
\t\tsummarizeBy: none
\t\tisHidden

\tcolumn Hub
\t\tdataType: string
\t\tsourceColumn: hub_nome
\t\tsummarizeBy: none

\tcolumn 'Cidade do Hub'
\t\tdataType: string
\t\tsourceColumn: hub_cidade
\t\tsummarizeBy: none

\tcolumn 'UF do Hub'
\t\tdataType: string
\t\tsourceColumn: hub_estado
\t\tsummarizeBy: none

\tcolumn 'ID da Loja'
\t\tdataType: int64
\t\tsourceColumn: store_id
\t\tsummarizeBy: none
\t\tisHidden

\tcolumn Loja
\t\tdataType: string
\t\tsourceColumn: loja_nome
\t\tsummarizeBy: none

\tcolumn 'Segmento da Loja'
\t\tdataType: string
\t\tsourceColumn: segmento_loja
\t\tsummarizeBy: none

\tcolumn 'ID do Canal'
\t\tdataType: int64
\t\tsourceColumn: channel_id
\t\tsummarizeBy: none
\t\tisHidden

\tcolumn Canal
\t\tdataType: string
\t\tsourceColumn: canal_nome
\t\tsummarizeBy: none

\tcolumn 'Tipo de Canal'
\t\tdataType: string
\t\tsourceColumn: tipo_canal
\t\tsummarizeBy: none

\tcolumn 'Status do Pedido'
\t\tdataType: string
\t\tsourceColumn: status_pedido
\t\tsummarizeBy: none

\tcolumn 'Valor do Pedido'
\t\tdataType: double
\t\tformatString: R$ #,##0.00
\t\tsourceColumn: valor_pedido
\t\tsummarizeBy: sum

\tcolumn 'Taxa de Entrega'
\t\tdataType: double
\t\tformatString: R$ #,##0.00
\t\tsourceColumn: taxa_entrega
\t\tsummarizeBy: sum

\tcolumn 'Custo de Entrega'
\t\tdataType: double
\t\tformatString: R$ #,##0.00
\t\tsourceColumn: custo_entrega
\t\tsummarizeBy: sum

\tcolumn 'Valor Total Pedido'
\t\tdataType: double
\t\tformatString: R$ #,##0.00
\t\tsourceColumn: valor_total_pedido
\t\tsummarizeBy: sum

\tcolumn 'Margem Entrega'
\t\tdataType: double
\t\tformatString: R$ #,##0.00
\t\tsourceColumn: margem_entrega
\t\tsummarizeBy: sum

\tcolumn 'Tempo de Produção (min)'
\t\tdataType: double
\t\tsourceColumn: tempo_producao_minutos
\t\tsummarizeBy: average

\tcolumn 'Tempo de Trânsito (min)'
\t\tdataType: double
\t\tsourceColumn: tempo_transito_minutos
\t\tsummarizeBy: average

\tcolumn 'Tempo Ciclo Total (min)'
\t\tdataType: double
\t\tsourceColumn: tempo_ciclo_total_minutos
\t\tsummarizeBy: average

\tcolumn 'Possui Entrega'
\t\tdataType: boolean
\t\tsourceColumn: possui_entrega
\t\tsummarizeBy: none
\t\tisHidden

\tcolumn 'ID da Entrega'
\t\tdataType: int64
\t\tsourceColumn: delivery_id
\t\tsummarizeBy: none
\t\tisHidden

\tcolumn 'Status da Entrega'
\t\tdataType: string
\t\tsourceColumn: status_entrega
\t\tsummarizeBy: none

\tcolumn 'Número de Tentativas'
\t\tdataType: int64
\t\tsourceColumn: numero_tentativas
\t\tsummarizeBy: none

\tcolumn 'Distância da Entrega (m)'
\t\tdataType: int64
\t\tsourceColumn: distancia_entrega_metros
\t\tsummarizeBy: average

\tcolumn 'Modal do Entregador'
\t\tdataType: string
\t\tsourceColumn: modal_entregador
\t\tsummarizeBy: none

\tcolumn 'Tipo do Entregador'
\t\tdataType: string
\t\tsourceColumn: tipo_entregador
\t\tsummarizeBy: none

\tpartition FatoDashboard = m
\t\tmode: import
\t\tsource =
\t\t\tlet
\t\t\t\tSource = Csv.Document(File.Contents("${csvPath}"), [Delimiter = ",", Columns = 33, Encoding = 65001, QuoteStyle = QuoteStyle.Csv]),
\t\t\t\tPromotedHeaders = Table.PromoteHeaders(Source, [PromoteAllScalars = true]),
\t\t\t\tChangedTypes = Table.TransformColumnTypes(PromotedHeaders, {
\t\t\t\t\t{"order_id", Int64.Type}, {"data_pedido", type date}, {"ano", Int64.Type}, {"mes_numero", Int64.Type},
\t\t\t\t\t{"mes_nome", type text}, {"mes_ano", type text}, {"mes_ordem", Int64.Type}, {"hub_id", Int64.Type},
\t\t\t\t\t{"hub_nome", type text}, {"hub_cidade", type text}, {"hub_estado", type text}, {"store_id", Int64.Type},
\t\t\t\t\t{"loja_nome", type text}, {"segmento_loja", type text}, {"channel_id", Int64.Type}, {"canal_nome", type text},
\t\t\t\t\t{"tipo_canal", type text}, {"status_pedido", type text}, {"valor_pedido", type number}, {"taxa_entrega", type number},
\t\t\t\t\t{"custo_entrega", type number}, {"valor_total_pedido", type number}, {"margem_entrega", type number},
\t\t\t\t\t{"tempo_producao_minutos", type number}, {"tempo_transito_minutos", type number}, {"tempo_ciclo_total_minutos", type number},
\t\t\t\t\t{"possui_entrega", type logical}, {"delivery_id", Int64.Type}, {"status_entrega", type text},
\t\t\t\t\t{"numero_tentativas", Int64.Type}, {"distancia_entrega_metros", Int64.Type}, {"modal_entregador", type text}, {"tipo_entregador", type text}
\t\t\t\t}, "en-US")
\t\t\tin
\t\t\t\tChangedTypes

\tannotation PBI_ResultType = Table
`;
writeText(path.join(modelDir, "definition", "tables", "FatoDashboard.tmdl"), tableTmdl);

writeText(path.join(pbRoot, "README.md"), `# Relatório Power BI — Delivery Center

> **Status:** versão futura pronta para validação no Power BI Desktop. A estrutura PBIR foi validada com **0 erros e 0 avisos**; a carga e a inspeção visual no Desktop ficaram deliberadamente pendentes para outra máquina.

O projeto nativo \`${projectName}.pbip\` contém duas páginas modernas e responsivas ao contexto de filtro:

- **Visão Executiva:** faturamento finalizado, pedidos, ticket médio, cancelamento, margem, tendência mensal, hubs e canais.
- **Performance Logística:** conclusão de entregas, P50/P90 de ciclo, múltiplas tentativas, modal, status e matriz por hub.

O modelo Import utiliza um extrato de uma linha por pedido, gerado a partir dos CSVs completos do repositório. O snapshot de 82 MB não é versionado porque pode ser reproduzido de forma determinística.

## Preparar e abrir em outra máquina

Na raiz do repositório:

\`\`\`powershell
python powerbi/scripts/build_import_data.py
node powerbi/scripts/generate_pbip.mjs
\`\`\`

O segundo comando regenera o projeto e grava no Power Query o caminho absoluto correto da máquina atual. Depois, abra \`powerbi/${projectName}.pbip\` no Power BI Desktop e atualize o modelo.

## Evidências e manutenção

- \`data/validacao.json\`: baselines reconciliados com os dados completos.
- \`validation-report.json\`: validação estrutural do PBIR.
- \`${projectName}.SemanticModel/definition/tables/FatoDashboard.tmdl\`: colunas, partição Import e 18 medidas DAX.
- \`scripts/generate_pbip.mjs\`: geração determinística das duas páginas e de seus 29 visuais.
- \`report-spec.md\`: escopo, regras e critérios de aceite.
`);

console.log(JSON.stringify({
  project: path.join(pbRoot, `${projectName}.pbip`),
  reportDir,
  modelDir,
  pages: [pageExecutive, pageLogistics],
  visuals: executiveVisuals.length + logisticsVisuals.length,
}, null, 2));
