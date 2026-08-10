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
  ink: "#F8FAFC",
  muted: "#9FB0C7",
  green: "#4ADE80",
  greenBright: "#2DD4BF",
  blue: "#3B82F6",
  cyan: "#22D3EE",
  purple: "#8B5CF6",
  amber: "#FBBF24",
  red: "#FB7185",
  canvas: "#070B16",
  sidebar: "#0D1424",
  panel: "#131D31",
  panelAlt: "#1A2540",
  border: "#2A3955",
  darkCanvas: "#070B16",
  darkPanel: "#131D31",
  darkBorder: "#2A3955",
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

function pageNavigator(name, position) {
  const state = (id) => ({ id });
  return baseVisual(name, position, {
    visualType: "pageNavigator",
    objects: {
      layout: [{ properties: { orientation: number(1, true), cellPadding: number(4, true) } }],
      pages: [{ properties: { showHiddenPages: bool(false), showTooltipPages: bool(false), showByDefault: bool(true) } }],
      shape: [{ properties: { tileShape: text("rectangleRounded"), rectangleRoundedCurve: number(8, true) } }],
      fill: [
        { selector: state("default"), properties: { show: bool(true), fillColor: fill(colors.sidebar), transparency: number(100) } },
        { selector: state("hover"), properties: { show: bool(true), fillColor: fill(colors.panelAlt), transparency: number(0) } },
        { selector: state("selected"), properties: { show: bool(true), fillColor: fill("#28204A"), transparency: number(0) } },
      ],
      outline: [
        { selector: state("default"), properties: { show: bool(false), lineColor: fill(colors.border), transparency: number(100), weight: number(0) } },
        { selector: state("selected"), properties: { show: bool(true), lineColor: fill(colors.purple), transparency: number(0), weight: number(1) } },
      ],
      text: [
        { selector: state("default"), properties: { show: bool(true), fontFamily: text("Segoe UI Semibold"), fontSize: number(9), bold: bool(false), fontColor: fill(colors.muted), horizontalAlignment: text("left"), verticalAlignment: text("middle") } },
        { selector: state("selected"), properties: { show: bool(true), fontFamily: text("Segoe UI Semibold"), fontSize: number(9), bold: bool(true), fontColor: fill(colors.ink), horizontalAlignment: text("left"), verticalAlignment: text("middle") } },
      ],
      accentBar: [{ selector: state("selected"), properties: { show: bool(true), position: text("Left"), color: fill(colors.cyan), transparency: number(0), width: number(4) } }],
    },
    visualContainerObjects: transparentChrome(),
  });
}

function clearFiltersButton(name, position) {
  return baseVisual(name, position, {
    visualType: "actionButton",
    objects: {
      shape: [{ properties: { tileShape: text("rectangleRounded"), rectangleRoundedCurve: number(10) } }],
      fill: [{ properties: { show: bool(true), fillColor: fill("#28204A"), transparency: number(0) } }],
      outline: [{ properties: { show: bool(true), lineColor: fill(colors.purple), transparency: number(0), weight: number(1) } }],
      text: [{ properties: { show: bool(true), text: text("Limpar filtros"), fontFamily: text("Segoe UI Semibold"), fontSize: number(10), bold: bool(true), fontColor: fill(colors.ink), horizontalAlignment: text("center") } }],
      icon: [{ properties: { show: bool(true), shapeType: text("clearAllSlicers"), lineColor: fill(colors.cyan), lineWeight: number(2), placement: text("left"), iconSize: number(16) } }],
    },
    visualContainerObjects: {
      ...transparentChrome(),
      visualLink: [{ properties: { show: bool(true), type: text("ClearAllSlicers"), enabledTooltip: text("Limpar todas as segmentações da página"), showDefaultTooltip: bool(true) } }],
    },
  });
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

function htmlVisual(name, position, measure, altText) {
  return baseVisual(name, position, {
    visualType: "htmlContent443BE3AD55E043BF878BED274D3A6865",
    query: { queryState: { content: { projections: [projection("measure", measure)] } } },
    objects: {
      contentFormatting: [{ properties: {
        format: text("html"),
        overrideInlineStyling: bool(false),
        hyperlinks: bool(false),
        userSelect: bool(true),
        noDataMessage: text("Sem dados para o contexto selecionado"),
      } }],
    },
    visualContainerObjects: {
      ...transparentChrome(),
      general: [{ properties: { altText: text(altText) } }],
    },
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

function chart(name, position, { type, category, measures, title, dark = true, color, secondary = [], tooltips = [], tooltipPage }) {
  const queryState = {
    Category: { projections: [projection("column", category, true)] },
  };
  if (measures.length) queryState.Y = { projections: measures.map((m) => projection("measure", m)) };
  if (secondary.length) queryState.Y2 = { projections: secondary.map((m) => projection("measure", m)) };
  if (tooltips.length) queryState.Tooltips = { projections: tooltips.map((m) => projection("measure", m)) };

  const objects = axisObjects(dark, measures.length + secondary.length > 1);
  if (color && ["barChart", "clusteredBarChart", "columnChart", "clusteredColumnChart", "lineClusteredColumnComboChart"].includes(type)) {
    objects.dataPoint = [{ properties: { defaultColor: fill(color), fillTransparency: number(0) } }];
  }
  return baseVisual(name, position, {
    visualType: type,
    query: { queryState },
    objects,
    visualContainerObjects: {
      ...chrome({
        background: dark ? colors.darkPanel : colors.panel,
        border: dark ? colors.darkBorder : colors.border,
        title,
        titleColor: dark ? colors.darkText : colors.ink,
        padding: 10,
      }),
      visualTooltip: [{ properties: {
        show: bool(true),
        type: text(tooltipPage ? "Canvas" : "Default"),
        ...(tooltipPage ? { section: text(tooltipPage) } : {}),
      } }],
    },
    drillFilterOtherVisuals: true,
  });
}

function donut(name, position, { category, measure, title, dark = true, tooltipPage }) {
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
    visualContainerObjects: {
      ...chrome({
        background: dark ? colors.darkPanel : colors.panel,
        border: dark ? colors.darkBorder : colors.border,
        title,
        titleColor: dark ? colors.darkText : colors.ink,
        padding: 10,
      }),
      visualTooltip: [{ properties: {
        show: bool(true),
        type: text(tooltipPage ? "Canvas" : "Default"),
        ...(tooltipPage ? { section: text(tooltipPage) } : {}),
      } }],
    },
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

function tableVisual(name, position, { title, dimensions = [], measures = [], dark = true, sortMeasure }) {
  const fg = dark ? colors.darkText : colors.ink;
  const bg1 = dark ? colors.darkPanel : colors.panel;
  const bg2 = dark ? colors.panelAlt : colors.panel;
  const usePivot = dimensions.length > 0 && measures.length > 0;
  const query = usePivot
    ? {
        queryState: {
          Rows: { projections: dimensions.map((field) => projection("column", field)) },
          Values: { projections: measures.map((field) => projection("measure", field)) },
        },
      }
    : {
        queryState: {
          Values: { projections: dimensions.map((field) => projection("column", field)) },
        },
      };
  if (sortMeasure) {
    query.sortDefinition = {
      sort: [{ field: measureField(sortMeasure), direction: "Descending" }],
      isDefaultSort: true,
    };
  }
  return baseVisual(name, position, {
    visualType: usePivot ? "pivotTable" : "tableEx",
    query,
    objects: usePivot
      ? {
          rowHeaders: [{ properties: { fontFamily: text("Segoe UI"), fontSize: number(9), fontColor: fill(fg), backColor: fill(bg1), stepped: bool(false), wordWrap: bool(false), showExpandCollapseButtons: bool(false) } }],
          columnHeaders: [{ properties: { autoSizeColumnWidth: bool(true), columnAdjustment: text("growToFit"), fontFamily: text("Segoe UI Semibold"), fontSize: number(9), backColor: fill(bg2), fontColor: fill(fg), bold: bool(true), wordWrap: bool(true) } }],
          values: [{ properties: { fontFamily: text("Segoe UI"), fontSize: number(9), fontColorPrimary: fill(fg), fontColorSecondary: fill(fg), backColorPrimary: fill(bg1), backColorSecondary: fill(bg2), wordWrap: bool(false) } }],
          total: [{ properties: { applyToHeaders: bool(true), fontColor: fill(fg), backColor: fill(bg2), bold: bool(true) } }],
        }
      : {
          columnHeaders: [{ properties: { autoSizeColumnWidth: bool(true), columnAdjustment: text("growToFit"), fontFamily: text("Segoe UI Semibold"), fontSize: number(9), backColor: fill(bg2), fontColor: fill(fg), bold: bool(true), wordWrap: bool(true) } }],
          values: [{ properties: { fontFamily: text("Segoe UI"), fontSize: number(9), fontColorPrimary: fill(fg), fontColorSecondary: fill(fg), backColorPrimary: fill(bg1), backColorSecondary: fill(bg2), wordWrap: bool(false) } }],
        },
    visualContainerObjects: chrome({
      background: bg1,
      border: dark ? colors.darkBorder : colors.border,
      title,
      titleColor: fg,
      padding: 8,
    }),
  });
}

function tooltipCard(name, position, measure, accent) {
  return baseVisual(name, position, {
    visualType: "cardVisual",
    query: { queryState: { Data: { projections: [projection("measure", measure)] } } },
    objects: {
      value: [{ properties: { show: bool(true), fontFamily: text("Segoe UI Semibold"), fontSize: number(15), bold: bool(true), fontColor: fill(colors.darkText), labelDisplayUnits: text("0"), labelPrecision: number(2, true), textWrap: bool(false) }, selector: { id: "default" } }],
      label: [{ properties: { show: bool(true), fontFamily: text("Segoe UI"), fontSize: number(8), fontColor: fill(colors.darkMuted), position: text("belowValue"), textWrap: bool(true) }, selector: { id: "default" } }],
    },
    visualContainerObjects: chrome({ background: colors.darkPanel, border: accent, titleColor: colors.darkText, padding: 6, radius: 8 }),
  });
}

function pageDefinition(name, displayName, { tooltip = false } = {}) {
  const value = {
    $schema: schemas.page,
    name,
    displayName,
    displayOption: tooltip ? "ActualSize" : "FitToPage",
    height: tooltip ? 240 : 810,
    width: tooltip ? 360 : 1440,
    visibility: tooltip ? "HiddenInViewMode" : "AlwaysVisible",
    objects: {
      background: [{ properties: { color: fill(colors.darkCanvas), transparency: number(0) } }],
      outspace: [{ properties: { color: fill("#050812"), transparency: number(0) } }],
    },
  };
  if (tooltip) {
    value.type = "Tooltip";
    value.pageBinding = { name: `tooltip-${name}`, type: "Tooltip", parameters: [] };
  }
  return value;
}

function pos(x, y, width, height, z) {
  return { x, y, z, height, width, tabOrder: z };
}

function writeVisual(pageId, visual) {
  writeJson(path.join(pagesDir, pageId, "visuals", visual.name, "visual.json"), visual);
}

const pages = {
  executive: "9e1c7a42d0b54173a101",
  orders: "b84fe8e63ef84b0ab201",
  finance: "c95af9f74fa95c1bc302",
  delivery: "a73f26c08b6e4d159202",
  detail: "da6b0a0850ba6d2cd403",
  tooltipCommercial: "e17c1b1961cb7e3de504",
  tooltipOrders: "f28d2c2072dc8f4ef605",
  tooltipFinance: "039e3d3183ed9050a706",
  tooltipDelivery: "14af4e4294fea161b807",
};

function pageShell(prefix, title, subtitle, filters) {
  const filterWidth = 270;
  return [
    textbox(`${prefix}01`, pos(18, 20, 200, 32, 1), "Delivery Center", 20, colors.ink),
    textbox(`${prefix}02`, pos(18, 50, 200, 18, 2), "PORTABLE ANALYTICS", 9, colors.cyan, "Segoe UI Semibold"),
    pageNavigator(`${prefix}03`, pos(12, 92, 216, 238, 3)),
    textbox(`${prefix}04`, pos(18, 350, 200, 18, 4), "MODELO IMPORT", 9, colors.muted, "Segoe UI Semibold"),
    textbox(`${prefix}05`, pos(18, 374, 200, 54, 5), "Snapshot reproduzível\n368.999 pedidos\nJan–Abr 2021", 9, colors.muted, "Segoe UI"),
    clearFiltersButton(`${prefix}06`, pos(18, 744, 200, 42, 6)),
    textbox(`${prefix}07`, pos(264, 18, 720, 40, 7), title, 24, colors.ink),
    textbox(`${prefix}08`, pos(264, 52, 920, 20, 8), subtitle, 10, colors.muted, "Segoe UI"),
    ...filters.map((filter, index) => slicer(
      `${prefix}${10 + index}`,
      pos(264 + index * (filterWidth + 16), 84, filterWidth, 80, 10 + index),
      filter.property,
      filter.label,
      filter.mode || "Dropdown",
    )),
  ];
}

const executiveVisuals = [
  ...pageShell("01e", "Visão Executiva", "Resultado comercial, tendência e sinais que exigem ação", [
    { property: "Data", label: "Período", mode: "Between" },
    { property: "Hub", label: "Hub" },
    { property: "Loja", label: "Loja" },
    { property: "Tipo de Canal", label: "Canal" },
  ]),
  htmlVisual("01e20", pos(264, 170, 1156, 94, 20), "HTML | KPIs Executivos", "Resumo dos KPIs executivos do período"),
  chart("01e30", pos(264, 278, 730, 250, 30), {
    type: "lineChart", category: "Data", measures: ["Valor Transacionado Finalizado"],
    title: "Valor transacionado por dia", color: colors.cyan,
    tooltips: ["Valor Transacionado Mês Anterior", "Variação Valor Transacionado Mensal"],
    tooltipPage: pages.tooltipCommercial,
  }),
  chart("01e31", pos(1010, 278, 410, 250, 31), {
    type: "barChart", category: "Hub", measures: ["Valor Transacionado Finalizado"],
    title: "Hubs por valor transacionado", color: colors.cyan,
    tooltipPage: pages.tooltipCommercial,
  }),
  htmlVisual("01e32", pos(264, 542, 360, 244, 32), "HTML | Saúde Executiva", "Resumo da saúde operacional"),
  donut("01e33", pos(640, 542, 300, 244, 33), {
    category: "Tipo de Canal", measure: "Pedidos Criados", title: "Mix de canais",
    tooltipPage: pages.tooltipCommercial,
  }),
  tableVisual("01e34", pos(956, 542, 464, 244, 34), {
    title: "Lojas com maior impacto",
    dimensions: ["Loja"],
    measures: ["Valor Transacionado Finalizado", "Pedidos Finalizados", "Ticket Médio Finalizado", "Margem de Entrega"],
    sortMeasure: "Valor Transacionado Finalizado",
  }),
];

const ordersVisuals = [
  ...pageShell("02o", "Pedidos & Operação", "Volume, status e decomposição do ciclo operacional", [
    { property: "Data", label: "Período", mode: "Between" },
    { property: "Hub", label: "Hub" },
    { property: "Loja", label: "Loja" },
    { property: "Status do Pedido", label: "Status" },
  ]),
  htmlVisual("02o20", pos(264, 170, 1156, 94, 20), "HTML | KPIs Pedidos", "Resumo dos KPIs de pedidos e operação"),
  chart("02o30", pos(264, 278, 730, 250, 30), {
    type: "lineChart", category: "Data", measures: ["Pedidos Criados"],
    title: "Pedidos criados por dia", color: colors.cyan,
    tooltips: ["Pedidos Mês Anterior", "Variação Pedidos Mensal"],
    tooltipPage: pages.tooltipOrders,
  }),
  chart("02o31", pos(1010, 278, 410, 250, 31), {
    type: "barChart", category: "Status do Pedido", measures: ["Pedidos Criados"],
    title: "Composição por status", color: colors.cyan,
    tooltipPage: pages.tooltipOrders,
  }),
  htmlVisual("02o32", pos(264, 542, 220, 236, 32), "HTML | Etapas Operacionais", "Decomposição do ciclo operacional"),
  tableVisual("02o34", pos(500, 542, 920, 236, 34), {
    title: "Operação por hub",
    dimensions: ["Hub"],
    measures: ["Pedidos Criados", "Pedidos Finalizados", "Taxa de Cancelamento", "Tempo Produção Médio", "Tempo Trânsito Médio", "Tempo Ciclo P90"],
    sortMeasure: "Pedidos Criados",
  }),
];

const financeVisuals = [
  ...pageShell("03f", "Financeiro & Conciliação", "Pagamentos confirmados, taxas, chargebacks e divergências", [
    { property: "Data", label: "Período", mode: "Between" },
    { property: "Hub", label: "Hub" },
    { property: "Segmento da Loja", label: "Segmento" },
    { property: "Status Conciliação", label: "Conciliação" },
  ]),
  htmlVisual("03f20", pos(264, 170, 1156, 94, 20), "HTML | KPIs Financeiros", "Resumo dos KPIs financeiros e de conciliação"),
  chart("03f30", pos(264, 278, 730, 250, 30), {
    type: "lineChart", category: "Data", measures: ["Valor Transacionado Finalizado", "Valor Pago"],
    title: "Valor transacionado e pago por dia",
    tooltips: ["Valor Pago Mês Anterior", "Variação Valor Pago Mensal"],
    tooltipPage: pages.tooltipFinance,
  }),
  chart("03f31", pos(1010, 278, 410, 250, 31), {
    type: "barChart", category: "Segmento da Loja", measures: ["Valor Pago"],
    title: "Valor pago por segmento", color: colors.cyan,
    tooltipPage: pages.tooltipFinance,
  }),
  donut("03f32", pos(264, 542, 360, 244, 32), {
    category: "Status Conciliação", measure: "Pedidos Criados", title: "Status de conciliação",
    tooltipPage: pages.tooltipFinance,
  }),
  tableVisual("03f33", pos(640, 542, 780, 244, 33), {
    title: "Resultado financeiro por hub",
    dimensions: ["Hub"],
    measures: ["Valor Transacionado Finalizado", "Valor Pago", "Taxas Pagamento", "Valor Chargeback", "Taxa Conciliação", "Diferença Absoluta Conciliação"],
    sortMeasure: "Valor Pago",
  }),
];

const deliveryVisuals = [
  ...pageShell("04d", "Entregas & Qualidade", "Conclusão, retentativas, distância e percentis do ciclo", [
    { property: "Data", label: "Período", mode: "Between" },
    { property: "Hub", label: "Hub" },
    { property: "Modal do Entregador", label: "Modal" },
    { property: "Tipo do Entregador", label: "Tipo" },
  ]),
  htmlVisual("04d20", pos(264, 170, 1156, 94, 20), "HTML | KPIs Logística", "Resumo dos KPIs de entregas e qualidade"),
  chart("04d30", pos(264, 278, 730, 250, 30), {
    type: "lineChart", category: "Data", measures: ["Tempo Ciclo Logístico P50", "Tempo Ciclo Logístico P90"],
    title: "Ciclo P50 e P90 por dia",
    tooltipPage: pages.tooltipDelivery,
  }),
  chart("04d31", pos(1010, 278, 410, 250, 31), {
    type: "barChart", category: "Modal do Entregador", measures: ["Taxa Entrega Concluída"],
    title: "Conclusão por modal", color: colors.cyan,
    tooltipPage: pages.tooltipDelivery,
  }),
  chart("04d32", pos(264, 542, 360, 244, 32), {
    type: "barChart", category: "Hub", measures: ["Taxa Múltiplas Tentativas"],
    title: "Hubs com mais retentativas", color: colors.red,
    tooltipPage: pages.tooltipDelivery,
  }),
  matrix("04d33", pos(640, 542, 780, 244, 33), true),
];

const detailVisuals = [
  ...pageShell("05t", "Detalhamento", "Consulta operacional por pedido com contexto comercial, financeiro e logístico", [
    { property: "ID do Pedido", label: "Pedido" },
    { property: "Hub", label: "Hub" },
    { property: "Status do Pedido", label: "Status pedido" },
    { property: "Status Conciliação", label: "Conciliação" },
  ]),
  htmlVisual("05t20", pos(264, 170, 1156, 94, 20), "HTML | Detalhe Pedido", "Resumo do pedido selecionado"),
  tableVisual("05t30", pos(264, 278, 1156, 508, 30), {
    title: "Pedidos — detalhe auditável",
    dimensions: [
      "ID do Pedido", "Data", "Hub", "Loja", "Status do Pedido", "Valor Total Pedido",
      "Total Pago Confirmado", "Diferença Conciliação", "Status Conciliação",
      "Status da Entrega", "Número de Tentativas", "Modal do Entregador",
    ],
  }),
];

const tooltipCommercialVisuals = [
  htmlVisual("t1a", pos(8, 8, 344, 224, 1), "HTML | Tooltip Comercial", "Tooltip de desempenho comercial"),
];

const tooltipOrdersVisuals = [
  htmlVisual("t2a", pos(8, 8, 344, 224, 1), "HTML | Tooltip Pedidos", "Tooltip de pedidos e operação"),
];

const tooltipFinanceVisuals = [
  htmlVisual("t3a", pos(8, 8, 344, 224, 1), "HTML | Tooltip Financeiro", "Tooltip de desempenho financeiro"),
];

const tooltipDeliveryVisuals = [
  htmlVisual("t4a", pos(8, 8, 344, 224, 1), "HTML | Tooltip Entregas", "Tooltip de entregas e qualidade"),
];

// O gerador é determinístico e limpa somente os artefatos da versão portátil.
// O projeto principal DeliveryCenterAnalytics permanece fora deste escopo.
fs.rmSync(reportDir, { recursive: true, force: true });
fs.rmSync(modelDir, { recursive: true, force: true });
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
  pageOrder: [
    pages.executive,
    pages.orders,
    pages.finance,
    pages.delivery,
    pages.detail,
    pages.tooltipCommercial,
    pages.tooltipOrders,
    pages.tooltipFinance,
    pages.tooltipDelivery,
  ],
  activePageName: pages.executive,
});

const themeFile = "DeliveryCenterPortableDark-20260809.json";
writeJson(path.join(reportDir, "StaticResources", "RegisteredResources", themeFile), {
  name: themeFile,
  dataColors: [colors.green, colors.blue, colors.cyan, colors.amber, colors.red, "#7357D9", "#45A1A1", "#EE7A4D"],
  background: colors.darkCanvas,
  foreground: colors.darkText,
  tableAccent: colors.cyan,
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
  publicCustomVisuals: ["htmlContent443BE3AD55E043BF878BED274D3A6865"],
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

const pageDefinitions = [
  [pages.executive, "01 Visão Executiva", executiveVisuals, false],
  [pages.orders, "02 Pedidos & Operação", ordersVisuals, false],
  [pages.finance, "03 Financeiro & Conciliação", financeVisuals, false],
  [pages.delivery, "04 Entregas & Qualidade", deliveryVisuals, false],
  [pages.detail, "05 Detalhamento", detailVisuals, false],
  [pages.tooltipCommercial, "Tooltip | Comercial", tooltipCommercialVisuals, true],
  [pages.tooltipOrders, "Tooltip | Pedidos", tooltipOrdersVisuals, true],
  [pages.tooltipFinance, "Tooltip | Financeiro", tooltipFinanceVisuals, true],
  [pages.tooltipDelivery, "Tooltip | Entregas", tooltipDeliveryVisuals, true],
];

for (const [pageId, displayName, visuals, tooltip] of pageDefinitions) {
  writeJson(path.join(pagesDir, pageId, "page.json"), pageDefinition(pageId, displayName, { tooltip }));
  for (const visual of visuals) writeVisual(pageId, visual);
}

writeJson(path.join(modelDir, "definition.pbism"), {
  $schema: schemas.pbism,
  version: "4.2",
  settings: { qnaEnabled: false },
});

writeText(path.join(modelDir, "definition", "database.tmdl"), `database ${projectName}\n\tcompatibilityLevel: 1600\n`);
writeText(path.join(modelDir, "definition", "model.tmdl"), `model Model\n\tculture: pt-BR\n\tdefaultPowerBIDataSourceVersion: powerBI_V3\n\tsourceQueryCulture: pt-BR\n\tdataAccessOptions\n\t\tlegacyRedirects\n\t\treturnErrorValuesAsNull\n\nref table FatoDashboard\n`);

const csvPath = path.resolve(process.env.DELIVERYCENTER_SNAPSHOT_PATH ?? path.join(pbRoot, "data", "fato_dashboard.csv"));
const mCsvPath = csvPath.replaceAll('"', '""');
writeText(
  path.join(modelDir, "definition", "expressions.tmdl"),
  `expression 'Arquivo Snapshot' = "${mCsvPath}" meta [IsParameterQuery=true, Type="Text", IsParameterQueryRequired=true]\n`,
);
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

\tmeasure 'Tempo Produção Médio' =
\t\t\tAVERAGEX(
\t\t\t\tFILTER(FatoDashboard, FatoDashboard[Status do Pedido] = "FINISHED" && FatoDashboard[Tempo de Produção (min)] >= 0),
\t\t\t\tFatoDashboard[Tempo de Produção (min)]
\t\t\t)
\t\tformatString: 0.00 "min"
\t\tdisplayFolder: Operação

\tmeasure 'Tempo Trânsito Médio' =
\t\t\tAVERAGEX(
\t\t\t\tFILTER(FatoDashboard, FatoDashboard[Status do Pedido] = "FINISHED" && FatoDashboard[Tempo de Trânsito (min)] >= 0),
\t\t\t\tFatoDashboard[Tempo de Trânsito (min)]
\t\t\t)
\t\tformatString: 0.00 "min"
\t\tdisplayFolder: Operação

\tmeasure 'Transações Pagas' = SUM(FatoDashboard[Qtd Pagamentos Pagos])
\t\tformatString: #,0
\t\tdisplayFolder: Financeiro

\tmeasure 'Valor Pago' = SUM(FatoDashboard[Total Pago Confirmado])
\t\tformatString: R$ #,##0.00
\t\tdisplayFolder: Financeiro

\tmeasure 'Taxas Pagamento' = SUM(FatoDashboard[Taxas Pagamentos Pagos])
\t\tformatString: R$ #,##0.00
\t\tdisplayFolder: Financeiro

\tmeasure 'Valor Líquido Pago' = SUM(FatoDashboard[Valor Pago Após Taxas])
\t\tformatString: R$ #,##0.00
\t\tdisplayFolder: Financeiro

\tmeasure Chargebacks = SUM(FatoDashboard[Qtd Chargebacks])
\t\tformatString: #,0
\t\tdisplayFolder: Financeiro

\tmeasure 'Valor Chargeback' = SUM(FatoDashboard[Total Chargeback])
\t\tformatString: R$ #,##0.00
\t\tdisplayFolder: Financeiro

\tmeasure 'Pedidos Conciliados' =
\t\t\tCALCULATE(
\t\t\t\t[Pedidos Criados],
\t\t\t\tFatoDashboard[Status do Pedido] = "FINISHED",
\t\t\t\tFatoDashboard[Status Conciliação] = "CONCILIADO"
\t\t\t)
\t\tformatString: #,0
\t\tdisplayFolder: Financeiro

\tmeasure 'Pedidos Finalizados Conciliação' = [Pedidos Finalizados]
\t\tformatString: #,0
\t\tdisplayFolder: Financeiro

\tmeasure 'Taxa Conciliação' = DIVIDE([Pedidos Conciliados], [Pedidos Finalizados Conciliação])
\t\tformatString: 0.00%
\t\tdisplayFolder: Financeiro

\tmeasure 'Diferença Absoluta Conciliação' =
\t\t\tSUMX(
\t\t\t\tFILTER(FatoDashboard, FatoDashboard[Status do Pedido] = "FINISHED"),
\t\t\t\tABS(FatoDashboard[Diferença Conciliação])
\t\t\t)
\t\tformatString: R$ #,##0.00
\t\tdisplayFolder: Financeiro

\tmeasure 'Pedidos sem Pagamento Pago' =
\t\t\tCALCULATE(
\t\t\t\t[Pedidos Criados],
\t\t\t\tFatoDashboard[Status do Pedido] = "FINISHED",
\t\t\t\tFatoDashboard[Status Conciliação] IN { "SEM_PAGAMENTO", "SEM_PAGAMENTO_PAGO" }
\t\t\t)
\t\tformatString: #,0
\t\tdisplayFolder: Financeiro

\tmeasure 'Valor Transacionado Mês Anterior' =
\t\t\tVAR MesAtual = MAX(FatoDashboard[Índice Mês])
\t\t\tRETURN
\t\t\t\tCALCULATE(
\t\t\t\t\t[Valor Transacionado Finalizado],
\t\t\t\t\tREMOVEFILTERS(FatoDashboard[Data], FatoDashboard[Ano], FatoDashboard[Número do Mês], FatoDashboard[Nome do Mês], FatoDashboard[Mês/Ano], FatoDashboard[Ordem Mês], FatoDashboard[Índice Mês]),
\t\t\t\t\tFatoDashboard[Índice Mês] = MesAtual - 1
\t\t\t\t)
\t\tformatString: R$ #,##0.00
\t\tdisplayFolder: Comparações

\tmeasure 'Variação Absoluta Valor Transacionado' = [Valor Transacionado Finalizado] - [Valor Transacionado Mês Anterior]
\t\tformatString: R$ #,##0.00
\t\tdisplayFolder: Comparações

\tmeasure 'Variação Valor Transacionado Mensal' = DIVIDE([Variação Absoluta Valor Transacionado], [Valor Transacionado Mês Anterior])
\t\tformatString: 0.00%
\t\tdisplayFolder: Comparações

\tmeasure 'Pedidos Mês Anterior' =
\t\t\tVAR MesAtual = MAX(FatoDashboard[Índice Mês])
\t\t\tRETURN
\t\t\t\tCALCULATE(
\t\t\t\t\t[Pedidos Criados],
\t\t\t\t\tREMOVEFILTERS(FatoDashboard[Data], FatoDashboard[Ano], FatoDashboard[Número do Mês], FatoDashboard[Nome do Mês], FatoDashboard[Mês/Ano], FatoDashboard[Ordem Mês], FatoDashboard[Índice Mês]),
\t\t\t\t\tFatoDashboard[Índice Mês] = MesAtual - 1
\t\t\t\t)
\t\tformatString: #,0
\t\tdisplayFolder: Comparações

\tmeasure 'Variação Absoluta Pedidos' = [Pedidos Criados] - [Pedidos Mês Anterior]
\t\tformatString: #,0
\t\tdisplayFolder: Comparações

\tmeasure 'Variação Pedidos Mensal' = DIVIDE([Variação Absoluta Pedidos], [Pedidos Mês Anterior])
\t\tformatString: 0.00%
\t\tdisplayFolder: Comparações

\tmeasure 'Valor Pago Mês Anterior' =
\t\t\tVAR MesAtual = MAX(FatoDashboard[Índice Mês])
\t\t\tRETURN
\t\t\t\tCALCULATE(
\t\t\t\t\t[Valor Pago],
\t\t\t\t\tREMOVEFILTERS(FatoDashboard[Data], FatoDashboard[Ano], FatoDashboard[Número do Mês], FatoDashboard[Nome do Mês], FatoDashboard[Mês/Ano], FatoDashboard[Ordem Mês], FatoDashboard[Índice Mês]),
\t\t\t\t\tFatoDashboard[Índice Mês] = MesAtual - 1
\t\t\t\t)
\t\tformatString: R$ #,##0.00
\t\tdisplayFolder: Comparações

\tmeasure 'Variação Absoluta Valor Pago' = [Valor Pago] - [Valor Pago Mês Anterior]
\t\tformatString: R$ #,##0.00
\t\tdisplayFolder: Comparações

\tmeasure 'Variação Valor Pago Mensal' = DIVIDE([Variação Absoluta Valor Pago], [Valor Pago Mês Anterior])
\t\tformatString: 0.00%
\t\tdisplayFolder: Comparações

\tmeasure 'Tempo Ciclo Médio' = AVERAGEX(FILTER(FatoDashboard, FatoDashboard[Status do Pedido] = "FINISHED" && NOT ISBLANK(FatoDashboard[Tempo de Ciclo Total (min)]) && FatoDashboard[Tempo de Ciclo Total (min)] >= 0), FatoDashboard[Tempo de Ciclo Total (min)])
\t\tformatString: #,##0.00
\t\tdisplayFolder: Operação

\tmeasure 'Participação Valor Transacionado' = DIVIDE([Valor Transacionado Finalizado], CALCULATE([Valor Transacionado Finalizado], ALLSELECTED(FatoDashboard)))
\t\tformatString: 0.00%
\t\tdisplayFolder: Tooltips

\tmeasure 'Participação Pedidos' = DIVIDE([Pedidos Criados], CALCULATE([Pedidos Criados], ALLSELECTED(FatoDashboard)))
\t\tformatString: 0.00%
\t\tdisplayFolder: Tooltips

\tmeasure 'Participação Valor Pago' = DIVIDE([Valor Pago], CALCULATE([Valor Pago], ALLSELECTED(FatoDashboard)))
\t\tformatString: 0.00%
\t\tdisplayFolder: Tooltips

\tmeasure 'Participação Pedidos com Entrega' = DIVIDE([Pedidos com Entrega], CALCULATE([Pedidos com Entrega], ALLSELECTED(FatoDashboard)))
\t\tformatString: 0.00%
\t\tdisplayFolder: Tooltips

\tmeasure 'Contexto Tooltip' = VAR DataSelecionada = SELECTEDVALUE(FatoDashboard[Data]) RETURN COALESCE(IF(NOT ISBLANK(DataSelecionada), FORMAT(DataSelecionada, "dd/MM/yyyy")), SELECTEDVALUE(FatoDashboard[Hub]), SELECTEDVALUE(FatoDashboard[Loja]), SELECTEDVALUE(FatoDashboard[Tipo de Canal]), SELECTEDVALUE(FatoDashboard[Modal do Entregador]), SELECTEDVALUE(FatoDashboard[Meio Pagamento Principal]), SELECTEDVALUE(FatoDashboard[Status do Pedido]), SELECTEDVALUE(FatoDashboard[Status Conciliação]), "Contexto selecionado")
\t\tformatString: General
\t\tdisplayFolder: Tooltips

\tmeasure 'HTML | KPIs Executivos' = VAR Periodo = FORMAT(MIN(FatoDashboard[Data]), "dd/MM/yyyy") & " a " & FORMAT(MAX(FatoDashboard[Data]), "dd/MM/yyyy") VAR CorMargem = IF([Margem de Entrega] >= 0, "#2DD4BF", "#FB7185") RETURN "<div style='font-family:Segoe UI,Arial,sans-serif;color:#F8FAFC;background:#131D31;border:1px solid #2A3955;border-radius:12px;padding:9px 12px;box-sizing:border-box;width:100%;height:100%;overflow:hidden;'><div style='display:flex;justify-content:space-between;margin-bottom:6px;'><b style='font-size:11px;'>RESULTADO DO PERÍODO</b><span style='font-size:9px;color:#9FB0C7;'>" & Periodo & "</span></div><div style='display:flex;gap:8px;height:58px;'><div style='flex:1;background:#1A2540;border-left:4px solid #3B82F6;border-radius:8px;padding:7px;'><small style='color:#9FB0C7;'>VALOR TRANSACIONADO</small><div style='font-size:18px;font-weight:750;margin-top:4px;'>" & FORMAT([Valor Transacionado Finalizado], "R$ #,##0.00", "pt-BR") & "</div></div><div style='flex:1;background:#1A2540;border-left:4px solid #22D3EE;border-radius:8px;padding:7px;'><small style='color:#9FB0C7;'>PEDIDOS FINALIZADOS</small><div style='font-size:18px;font-weight:750;margin-top:4px;'>" & FORMAT([Pedidos Finalizados], "#,##0", "pt-BR") & "</div></div><div style='flex:1;background:#1A2540;border-left:4px solid #8B5CF6;border-radius:8px;padding:7px;'><small style='color:#9FB0C7;'>TICKET MÉDIO</small><div style='font-size:18px;font-weight:750;margin-top:4px;'>" & FORMAT([Ticket Médio Finalizado], "R$ #,##0.00", "pt-BR") & "</div></div><div style='flex:1;background:#1A2540;border-left:4px solid #FBBF24;border-radius:8px;padding:7px;'><small style='color:#9FB0C7;'>CANCELAMENTO</small><div style='font-size:18px;font-weight:750;margin-top:4px;'>" & FORMAT([Taxa de Cancelamento], "0.00%", "pt-BR") & "</div></div><div style='flex:1;background:#1A2540;border-left:4px solid " & CorMargem & ";border-radius:8px;padding:7px;'><small style='color:#9FB0C7;'>MARGEM ENTREGA</small><div style='font-size:18px;font-weight:750;margin-top:4px;color:" & CorMargem & ";'>" & FORMAT([Margem de Entrega], "R$ #,##0.00", "pt-BR") & "</div></div></div></div>"
\t\tformatString: General
\t\tdisplayFolder: HTML

\tmeasure 'HTML | Saúde Executiva' = VAR CorMargem = IF([Margem de Entrega] >= 0, "#2DD4BF", "#FB7185") RETURN "<div style='font-family:Segoe UI,Arial,sans-serif;color:#F8FAFC;background:#131D31;border:1px solid #2A3955;border-radius:12px;padding:14px 16px;box-sizing:border-box;width:100%;height:100%;'><div style='font-size:12px;font-weight:700;margin-bottom:10px;'>SAÚDE OPERACIONAL</div><div style='display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #2A3955;font-size:11px;'><span>Taxa de cancelamento</span><b style='color:#FB7185;'>" & FORMAT([Taxa de Cancelamento], "0.00%", "pt-BR") & "</b></div><div style='display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #2A3955;font-size:11px;'><span>Ciclo P90 <small style='color:#9FB0C7;'>(percentil)</small></span><b style='color:#FBBF24;'>" & FORMAT([Tempo Ciclo P90], "0.00", "pt-BR") & " min</b></div><div style='display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #2A3955;font-size:11px;'><span>Taxa de conciliação</span><b style='color:#22D3EE;'>" & FORMAT([Taxa Conciliação], "0.00%", "pt-BR") & "</b></div><div style='display:flex;justify-content:space-between;padding:9px 0;font-size:11px;'><span>Margem de entrega</span><b style='color:" & CorMargem & ";'>" & FORMAT([Margem de Entrega], "R$ #,##0.00", "pt-BR") & "</b></div></div>"
\t\tformatString: General
\t\tdisplayFolder: HTML

\tmeasure 'HTML | KPIs Pedidos' = "<div style='font-family:Segoe UI,Arial,sans-serif;color:#F8FAFC;background:#131D31;border:1px solid #2A3955;border-radius:12px;padding:9px 12px;box-sizing:border-box;width:100%;height:100%;overflow:hidden;'><div style='font-size:11px;font-weight:700;margin-bottom:6px;'>PEDIDOS E OPERAÇÃO</div><div style='display:flex;gap:8px;height:58px;'><div style='flex:1;background:#1A2540;border-left:4px solid #3B82F6;border-radius:8px;padding:7px;'><small style='color:#9FB0C7;'>PEDIDOS CRIADOS</small><div style='font-size:18px;font-weight:750;margin-top:4px;'>" & FORMAT([Pedidos Criados], "#,##0", "pt-BR") & "</div></div><div style='flex:1;background:#1A2540;border-left:4px solid #22D3EE;border-radius:8px;padding:7px;'><small style='color:#9FB0C7;'>FINALIZADOS</small><div style='font-size:18px;font-weight:750;margin-top:4px;'>" & FORMAT([Pedidos Finalizados], "#,##0", "pt-BR") & "</div></div><div style='flex:1;background:#1A2540;border-left:4px solid #FB7185;border-radius:8px;padding:7px;'><small style='color:#9FB0C7;'>CANCELADOS</small><div style='font-size:18px;font-weight:750;margin-top:4px;'>" & FORMAT([Pedidos Cancelados], "#,##0", "pt-BR") & "</div></div><div style='flex:1;background:#1A2540;border-left:4px solid #FB7185;border-radius:8px;padding:7px;'><small style='color:#9FB0C7;'>TAXA CANCELAMENTO</small><div style='font-size:18px;font-weight:750;margin-top:4px;color:#FB7185;'>" & FORMAT([Taxa de Cancelamento], "0.00%", "pt-BR") & "</div></div><div style='flex:1;background:#1A2540;border-left:4px solid #FBBF24;border-radius:8px;padding:7px;'><small style='color:#9FB0C7;'>CICLO MÉDIO</small><div style='font-size:18px;font-weight:750;margin-top:4px;'>" & FORMAT([Tempo Ciclo Médio], "0.00", "pt-BR") & " min</div></div></div></div>"
\t\tformatString: General
\t\tdisplayFolder: HTML

\tmeasure 'HTML | Etapas Operacionais' = "<div style='font-family:Segoe UI,Arial,sans-serif;color:#F8FAFC;background:#131D31;border:1px solid #2A3955;border-radius:12px;padding:14px;box-sizing:border-box;width:100%;height:100%;'><div style='font-size:12px;font-weight:700;margin-bottom:10px;'>DECOMPOSIÇÃO DO CICLO</div><div style='display:grid;grid-template-columns:1fr 1fr;gap:8px;'><div style='background:#1A2540;border-radius:8px;padding:10px;'><small style='color:#9FB0C7;'>Produção média</small><div style='font-size:17px;font-weight:700;margin-top:5px;'>" & FORMAT([Tempo Produção Médio], "0.00", "pt-BR") & " min</div></div><div style='background:#1A2540;border-radius:8px;padding:10px;'><small style='color:#9FB0C7;'>Trânsito médio</small><div style='font-size:17px;font-weight:700;margin-top:5px;'>" & FORMAT([Tempo Trânsito Médio], "0.00", "pt-BR") & " min</div></div><div style='background:#1A2540;border-radius:8px;padding:10px;'><small style='color:#9FB0C7;'>Ciclo P50</small><div style='font-size:17px;font-weight:700;margin-top:5px;'>" & FORMAT([Tempo Ciclo P50], "0.00", "pt-BR") & " min</div></div><div style='background:#1A2540;border-radius:8px;padding:10px;'><small style='color:#9FB0C7;'>Ciclo P90 · percentil</small><div style='font-size:17px;font-weight:700;margin-top:5px;color:#FBBF24;'>" & FORMAT([Tempo Ciclo P90], "0.00", "pt-BR") & " min</div></div></div></div>"
\t\tformatString: General
\t\tdisplayFolder: HTML

\tmeasure 'HTML | KPIs Financeiros' = "<div style='font-family:Segoe UI,Arial,sans-serif;color:#F8FAFC;background:#131D31;border:1px solid #2A3955;border-radius:12px;padding:9px 12px;box-sizing:border-box;width:100%;height:100%;overflow:hidden;'><div style='font-size:11px;font-weight:700;margin-bottom:6px;'>FINANCEIRO E CONCILIAÇÃO</div><div style='display:flex;gap:8px;height:58px;'><div style='flex:1;background:#1A2540;border-left:4px solid #2DD4BF;border-radius:8px;padding:7px;'><small style='color:#9FB0C7;'>VALOR PAGO</small><div style='font-size:18px;font-weight:750;margin-top:4px;'>" & FORMAT([Valor Pago], "R$ #,##0.00", "pt-BR") & "</div></div><div style='flex:1;background:#1A2540;border-left:4px solid #4ADE80;border-radius:8px;padding:7px;'><small style='color:#9FB0C7;'>CONCILIAÇÃO</small><div style='font-size:18px;font-weight:750;margin-top:4px;'>" & FORMAT([Taxa Conciliação], "0.00%", "pt-BR") & "</div></div><div style='flex:1;background:#1A2540;border-left:4px solid #60A5FA;border-radius:8px;padding:7px;'><small style='color:#9FB0C7;'>TRANSAÇÕES PAGAS</small><div style='font-size:18px;font-weight:750;margin-top:4px;'>" & FORMAT([Transações Pagas], "#,##0", "pt-BR") & "</div></div><div style='flex:1;background:#1A2540;border-left:4px solid #FB7185;border-radius:8px;padding:7px;'><small style='color:#9FB0C7;'>CHARGEBACK</small><div style='font-size:18px;font-weight:750;margin-top:4px;color:#FB7185;'>" & FORMAT([Valor Chargeback], "R$ #,##0.00", "pt-BR") & "</div></div><div style='flex:1;background:#1A2540;border-left:4px solid #FBBF24;border-radius:8px;padding:7px;'><small style='color:#9FB0C7;'>DIFERENÇA ABS.</small><div style='font-size:18px;font-weight:750;margin-top:4px;'>" & FORMAT([Diferença Absoluta Conciliação], "R$ #,##0.00", "pt-BR") & "</div></div></div></div>"
\t\tformatString: General
\t\tdisplayFolder: HTML

\tmeasure 'HTML | KPIs Logística' = "<div style='font-family:Segoe UI,Arial,sans-serif;color:#F8FAFC;background:#131D31;border:1px solid #2A3955;border-radius:12px;padding:9px 12px;box-sizing:border-box;width:100%;height:100%;overflow:hidden;'><div style='font-size:11px;font-weight:700;margin-bottom:6px;'>ENTREGAS E QUALIDADE</div><div style='display:flex;gap:8px;height:58px;'><div style='flex:1;background:#1A2540;border-left:4px solid #2DD4BF;border-radius:8px;padding:7px;'><small style='color:#9FB0C7;'>ENTREGA CONCLUÍDA</small><div style='font-size:18px;font-weight:750;margin-top:4px;'>" & FORMAT([Taxa Entrega Concluída], "0.00%", "pt-BR") & "</div></div><div style='flex:1;background:#1A2540;border-left:4px solid #FB7185;border-radius:8px;padding:7px;'><small style='color:#9FB0C7;'>MÚLTIPLAS TENTATIVAS</small><div style='font-size:18px;font-weight:750;margin-top:4px;color:#FB7185;'>" & FORMAT([Taxa Múltiplas Tentativas], "0.00%", "pt-BR") & "</div></div><div style='flex:1;background:#1A2540;border-left:4px solid #3B82F6;border-radius:8px;padding:7px;'><small style='color:#9FB0C7;'>CICLO P50</small><div style='font-size:18px;font-weight:750;margin-top:4px;'>" & FORMAT([Tempo Ciclo Logístico P50], "0.00", "pt-BR") & " min</div></div><div style='flex:1;background:#1A2540;border-left:4px solid #FBBF24;border-radius:8px;padding:7px;'><small style='color:#9FB0C7;'>CICLO P90 · PERCENTIL</small><div style='font-size:18px;font-weight:750;margin-top:4px;color:#FBBF24;'>" & FORMAT([Tempo Ciclo Logístico P90], "0.00", "pt-BR") & " min</div></div><div style='flex:1;background:#1A2540;border-left:4px solid #8B5CF6;border-radius:8px;padding:7px;'><small style='color:#9FB0C7;'>DISTÂNCIA MÉDIA</small><div style='font-size:18px;font-weight:750;margin-top:4px;'>" & FORMAT([Distância Média Entrega (km)], "0.00", "pt-BR") & " km</div></div></div></div>"
\t\tformatString: General
\t\tdisplayFolder: HTML

\tmeasure 'HTML | Detalhe Pedido' = VAR PedidoId = SELECTEDVALUE(FatoDashboard[ID do Pedido]) VAR StatusPedido = SELECTEDVALUE(FatoDashboard[Status do Pedido], "Vários") VAR Loja = SELECTEDVALUE(FatoDashboard[Loja], "Várias") VAR Hub = SELECTEDVALUE(FatoDashboard[Hub], "Vários") RETURN "<div style='font-family:Segoe UI,Arial,sans-serif;color:#F8FAFC;background:#131D31;border:1px solid #2A3955;border-radius:12px;padding:11px 15px;box-sizing:border-box;width:100%;height:100%;'><div style='display:flex;align-items:center;justify-content:space-between;'><div><small style='color:#9FB0C7;letter-spacing:.07em;'>PEDIDO SELECIONADO</small><div style='font-size:22px;font-weight:800;margin-top:2px;'>#" & COALESCE(FORMAT(PedidoId, "0"), "—") & "</div></div><div style='background:#1A2540;border:1px solid #2A3955;border-radius:999px;padding:6px 11px;font-size:10px;font-weight:700;'>" & StatusPedido & "</div><div><small style='color:#9FB0C7;'>LOJA</small><div style='font-size:13px;font-weight:700;margin-top:3px;'>" & Loja & "</div></div><div><small style='color:#9FB0C7;'>HUB</small><div style='font-size:13px;font-weight:700;margin-top:3px;'>" & Hub & "</div></div><div><small style='color:#9FB0C7;'>VALOR / PAGO</small><div style='font-size:13px;font-weight:700;margin-top:3px;'>" & FORMAT([Valor Transacionado Finalizado], "R$ #,##0.00", "pt-BR") & " · " & FORMAT([Valor Pago], "R$ #,##0.00", "pt-BR") & "</div></div></div></div>"
\t\tformatString: General
\t\tdisplayFolder: HTML

\tmeasure 'HTML | Tooltip Comercial' = VAR Contexto = [Contexto Tooltip] RETURN "<div style='font-family:Segoe UI,Arial,sans-serif;color:#F8FAFC;background:#090D18;border:1px solid #2A3955;border-radius:10px;padding:9px;box-sizing:border-box;width:100%;height:100%;overflow:hidden;'><div style='display:flex;justify-content:space-between;border-bottom:1px solid #2A3955;padding-bottom:7px;'><div><small style='color:#3B82F6;font-weight:700;'>DETALHE DO PONTO</small><div style='font-size:12px;font-weight:700;'>Desempenho comercial</div></div><small style='color:#9FB0C7;'>" & Contexto & "</small></div><div style='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px;'><div style='background:#1A2540;border-left:3px solid #3B82F6;border-radius:7px;padding:7px;'><small style='color:#9FB0C7;'>Valor</small><div style='font-size:14px;font-weight:750;'>" & FORMAT([Valor Transacionado Finalizado], "R$ #,##0.00", "pt-BR") & "</div></div><div style='background:#1A2540;border-left:3px solid #3B82F6;border-radius:7px;padding:7px;'><small style='color:#9FB0C7;'>Mês anterior</small><div style='font-size:14px;font-weight:750;'>" & FORMAT([Valor Transacionado Mês Anterior], "R$ #,##0.00", "pt-BR") & "</div></div><div style='background:#1A2540;border-left:3px solid #8B5CF6;border-radius:7px;padding:7px;'><small style='color:#9FB0C7;'>Variação absoluta</small><div style='font-size:14px;font-weight:750;'>" & FORMAT([Variação Absoluta Valor Transacionado], "R$ #,##0.00", "pt-BR") & "</div></div><div style='background:#1A2540;border-left:3px solid #8B5CF6;border-radius:7px;padding:7px;'><small style='color:#9FB0C7;'>Variação percentual</small><div style='font-size:14px;font-weight:750;'>" & FORMAT([Variação Valor Transacionado Mensal], "0.00%", "pt-BR") & "</div></div><div style='grid-column:span 2;background:#1A2540;border-left:3px solid #22D3EE;border-radius:7px;padding:7px;'><small style='color:#9FB0C7;'>Participação no total</small><div style='font-size:14px;font-weight:750;'>" & FORMAT([Participação Valor Transacionado], "0.00%", "pt-BR") & "</div></div></div></div>"
\t\tformatString: General
\t\tdisplayFolder: HTML\\Tooltips

\tmeasure 'HTML | Tooltip Pedidos' = VAR Contexto = [Contexto Tooltip] RETURN "<div style='font-family:Segoe UI,Arial,sans-serif;color:#F8FAFC;background:#090D18;border:1px solid #2A3955;border-radius:10px;padding:9px;box-sizing:border-box;width:100%;height:100%;overflow:hidden;'><div style='display:flex;justify-content:space-between;border-bottom:1px solid #2A3955;padding-bottom:7px;'><div><small style='color:#22D3EE;font-weight:700;'>DETALHE DO PONTO</small><div style='font-size:12px;font-weight:700;'>Pedidos e operação</div></div><small style='color:#9FB0C7;'>" & Contexto & "</small></div><div style='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px;'><div style='background:#1A2540;border-left:3px solid #22D3EE;border-radius:7px;padding:7px;'><small style='color:#9FB0C7;'>Pedidos</small><div style='font-size:14px;font-weight:750;'>" & FORMAT([Pedidos Criados], "#,##0", "pt-BR") & "</div></div><div style='background:#1A2540;border-left:3px solid #22D3EE;border-radius:7px;padding:7px;'><small style='color:#9FB0C7;'>Mês anterior</small><div style='font-size:14px;font-weight:750;'>" & FORMAT([Pedidos Mês Anterior], "#,##0", "pt-BR") & "</div></div><div style='background:#1A2540;border-left:3px solid #8B5CF6;border-radius:7px;padding:7px;'><small style='color:#9FB0C7;'>Variação absoluta</small><div style='font-size:14px;font-weight:750;'>" & FORMAT([Variação Absoluta Pedidos], "#,##0", "pt-BR") & "</div></div><div style='background:#1A2540;border-left:3px solid #8B5CF6;border-radius:7px;padding:7px;'><small style='color:#9FB0C7;'>Variação percentual</small><div style='font-size:14px;font-weight:750;'>" & FORMAT([Variação Pedidos Mensal], "0.00%", "pt-BR") & "</div></div><div style='grid-column:span 2;background:#1A2540;border-left:3px solid #3B82F6;border-radius:7px;padding:7px;'><small style='color:#9FB0C7;'>Participação no total</small><div style='font-size:14px;font-weight:750;'>" & FORMAT([Participação Pedidos], "0.00%", "pt-BR") & "</div></div></div></div>"
\t\tformatString: General
\t\tdisplayFolder: HTML\\Tooltips

\tmeasure 'HTML | Tooltip Financeiro' = VAR Contexto = [Contexto Tooltip] RETURN "<div style='font-family:Segoe UI,Arial,sans-serif;color:#F8FAFC;background:#090D18;border:1px solid #2A3955;border-radius:10px;padding:9px;box-sizing:border-box;width:100%;height:100%;overflow:hidden;'><div style='display:flex;justify-content:space-between;border-bottom:1px solid #2A3955;padding-bottom:7px;'><div><small style='color:#8B5CF6;font-weight:700;'>DETALHE DO PONTO</small><div style='font-size:12px;font-weight:700;'>Desempenho financeiro</div></div><small style='color:#9FB0C7;'>" & Contexto & "</small></div><div style='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px;'><div style='background:#1A2540;border-left:3px solid #8B5CF6;border-radius:7px;padding:7px;'><small style='color:#9FB0C7;'>Valor pago</small><div style='font-size:14px;font-weight:750;'>" & FORMAT([Valor Pago], "R$ #,##0.00", "pt-BR") & "</div></div><div style='background:#1A2540;border-left:3px solid #8B5CF6;border-radius:7px;padding:7px;'><small style='color:#9FB0C7;'>Mês anterior</small><div style='font-size:14px;font-weight:750;'>" & FORMAT([Valor Pago Mês Anterior], "R$ #,##0.00", "pt-BR") & "</div></div><div style='background:#1A2540;border-left:3px solid #3B82F6;border-radius:7px;padding:7px;'><small style='color:#9FB0C7;'>Variação absoluta</small><div style='font-size:14px;font-weight:750;'>" & FORMAT([Variação Absoluta Valor Pago], "R$ #,##0.00", "pt-BR") & "</div></div><div style='background:#1A2540;border-left:3px solid #3B82F6;border-radius:7px;padding:7px;'><small style='color:#9FB0C7;'>Variação percentual</small><div style='font-size:14px;font-weight:750;'>" & FORMAT([Variação Valor Pago Mensal], "0.00%", "pt-BR") & "</div></div><div style='grid-column:span 2;background:#1A2540;border-left:3px solid #22D3EE;border-radius:7px;padding:7px;'><small style='color:#9FB0C7;'>Participação no total</small><div style='font-size:14px;font-weight:750;'>" & FORMAT([Participação Valor Pago], "0.00%", "pt-BR") & "</div></div></div></div>"
\t\tformatString: General
\t\tdisplayFolder: HTML\\Tooltips

\tmeasure 'HTML | Tooltip Entregas' = VAR Contexto = [Contexto Tooltip] RETURN "<div style='font-family:Segoe UI,Arial,sans-serif;color:#F8FAFC;background:#090D18;border:1px solid #2A3955;border-radius:10px;padding:9px;box-sizing:border-box;width:100%;height:100%;overflow:hidden;'><div style='display:flex;justify-content:space-between;border-bottom:1px solid #2A3955;padding-bottom:7px;'><div><small style='color:#FBBF24;font-weight:700;'>DETALHE DO PONTO</small><div style='font-size:12px;font-weight:700;'>Entregas e qualidade</div></div><small style='color:#9FB0C7;'>" & Contexto & "</small></div><div style='display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px;'><div style='background:#1A2540;border-left:3px solid #3B82F6;border-radius:7px;padding:7px;'><small style='color:#9FB0C7;'>Pedidos com entrega</small><div style='font-size:14px;font-weight:750;'>" & FORMAT([Pedidos com Entrega], "#,##0", "pt-BR") & "</div></div><div style='background:#1A2540;border-left:3px solid #22D3EE;border-radius:7px;padding:7px;'><small style='color:#9FB0C7;'>Entrega concluída</small><div style='font-size:14px;font-weight:750;'>" & FORMAT([Taxa Entrega Concluída], "0.00%", "pt-BR") & "</div></div><div style='background:#1A2540;border-left:3px solid #FB7185;border-radius:7px;padding:7px;'><small style='color:#9FB0C7;'>Múltiplas tentativas</small><div style='font-size:14px;font-weight:750;'>" & FORMAT([Taxa Múltiplas Tentativas], "0.00%", "pt-BR") & "</div></div><div style='background:#1A2540;border-left:3px solid #3B82F6;border-radius:7px;padding:7px;'><small style='color:#9FB0C7;'>Ciclo P50</small><div style='font-size:14px;font-weight:750;'>" & FORMAT([Tempo Ciclo Logístico P50], "0.00", "pt-BR") & " min</div></div><div style='background:#1A2540;border-left:3px solid #FBBF24;border-radius:7px;padding:7px;'><small style='color:#9FB0C7;'>Ciclo P90</small><div style='font-size:14px;font-weight:750;'>" & FORMAT([Tempo Ciclo Logístico P90], "0.00", "pt-BR") & " min</div></div><div style='background:#1A2540;border-left:3px solid #8B5CF6;border-radius:7px;padding:7px;'><small style='color:#9FB0C7;'>Participação no total</small><div style='font-size:14px;font-weight:750;'>" & FORMAT([Participação Pedidos com Entrega], "0.00%", "pt-BR") & "</div></div></div></div>"
\t\tformatString: General
\t\tdisplayFolder: HTML\\Tooltips

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

\tcolumn 'Índice Mês'
\t\tdataType: int64
\t\tsourceColumn: mes_indice
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

\tcolumn 'Qtd Pagamentos'
\t\tdataType: int64
\t\tsourceColumn: qtd_pagamentos
\t\tsummarizeBy: sum

\tcolumn 'Qtd Pagamentos Pagos'
\t\tdataType: int64
\t\tsourceColumn: qtd_pagamentos_pagos
\t\tsummarizeBy: sum

\tcolumn 'Qtd Chargebacks'
\t\tdataType: int64
\t\tsourceColumn: qtd_chargebacks
\t\tsummarizeBy: sum

\tcolumn 'Qtd Pagamentos Aguardando'
\t\tdataType: int64
\t\tsourceColumn: qtd_pagamentos_aguardando
\t\tsummarizeBy: sum

\tcolumn 'Total Pago Confirmado'
\t\tdataType: double
\t\tformatString: R$ #,##0.00
\t\tsourceColumn: total_pago_confirmado
\t\tsummarizeBy: sum

\tcolumn 'Total Chargeback'
\t\tdataType: double
\t\tformatString: R$ #,##0.00
\t\tsourceColumn: total_chargeback
\t\tsummarizeBy: sum

\tcolumn 'Total Aguardando'
\t\tdataType: double
\t\tformatString: R$ #,##0.00
\t\tsourceColumn: total_aguardando
\t\tsummarizeBy: sum

\tcolumn 'Taxas Pagamentos Pagos'
\t\tdataType: double
\t\tformatString: R$ #,##0.00
\t\tsourceColumn: taxas_pagamentos_pagos
\t\tsummarizeBy: sum

\tcolumn 'Valor Pago Após Taxas'
\t\tdataType: double
\t\tformatString: R$ #,##0.00
\t\tsourceColumn: valor_pago_apos_taxas
\t\tsummarizeBy: sum

\tcolumn 'Diferença Conciliação'
\t\tdataType: double
\t\tformatString: R$ #,##0.00
\t\tsourceColumn: diferenca_conciliacao
\t\tsummarizeBy: sum

\tcolumn 'Status Conciliação'
\t\tdataType: string
\t\tsourceColumn: status_conciliacao
\t\tsummarizeBy: none

\tcolumn 'Meio Pagamento Principal'
\t\tdataType: string
\t\tsourceColumn: meio_pagamento_principal
\t\tsummarizeBy: none

\tpartition FatoDashboard = m
\t\tmode: import
\t\tsource =
\t\t\tlet
\t\t\t\tSource = Csv.Document(File.Contents(#"Arquivo Snapshot"), [Delimiter = ",", Columns = 46, Encoding = 65001, QuoteStyle = QuoteStyle.Csv]),
\t\t\t\tPromotedHeaders = Table.PromoteHeaders(Source, [PromoteAllScalars = true]),
\t\t\t\tChangedTypes = Table.TransformColumnTypes(PromotedHeaders, {
\t\t\t\t\t{"order_id", Int64.Type}, {"data_pedido", type date}, {"ano", Int64.Type}, {"mes_numero", Int64.Type},
\t\t\t\t\t{"mes_nome", type text}, {"mes_ano", type text}, {"mes_ordem", Int64.Type}, {"mes_indice", Int64.Type}, {"hub_id", Int64.Type},
\t\t\t\t\t{"hub_nome", type text}, {"hub_cidade", type text}, {"hub_estado", type text}, {"store_id", Int64.Type},
\t\t\t\t\t{"loja_nome", type text}, {"segmento_loja", type text}, {"channel_id", Int64.Type}, {"canal_nome", type text},
\t\t\t\t\t{"tipo_canal", type text}, {"status_pedido", type text}, {"valor_pedido", type number}, {"taxa_entrega", type number},
\t\t\t\t\t{"custo_entrega", type number}, {"valor_total_pedido", type number}, {"margem_entrega", type number},
\t\t\t\t\t{"tempo_producao_minutos", type number}, {"tempo_transito_minutos", type number}, {"tempo_ciclo_total_minutos", type number},
\t\t\t\t\t{"possui_entrega", type logical}, {"delivery_id", Int64.Type}, {"status_entrega", type text},
\t\t\t\t\t{"numero_tentativas", Int64.Type}, {"distancia_entrega_metros", Int64.Type}, {"modal_entregador", type text}, {"tipo_entregador", type text},
\t\t\t\t\t{"qtd_pagamentos", Int64.Type}, {"qtd_pagamentos_pagos", Int64.Type}, {"qtd_chargebacks", Int64.Type}, {"qtd_pagamentos_aguardando", Int64.Type},
\t\t\t\t\t{"total_pago_confirmado", type number}, {"total_chargeback", type number}, {"total_aguardando", type number}, {"taxas_pagamentos_pagos", type number},
\t\t\t\t\t{"valor_pago_apos_taxas", type number}, {"diferenca_conciliacao", type number}, {"status_conciliacao", type text}, {"meio_pagamento_principal", type text}
\t\t\t\t}, "en-US")
\t\t\tin
\t\t\t\tChangedTypes

\tannotation PBI_ResultType = Table
`;
writeText(path.join(modelDir, "definition", "tables", "FatoDashboard.tmdl"), tableTmdl);

if (process.env.GENERATE_PORTABLE_README === "1") writeText(path.join(pbRoot, "README-PORTABLE.generated.md"), `# Relatório Power BI — Delivery Center

> **Status:** implementação estrutural concluída na branch paralela. A inspeção visual no Power BI Desktop continua sendo a etapa de homologação antes do merge.

O projeto nativo \`${projectName}.pbip\` contém cinco páginas analíticas, quatro tooltips contextuais e componentes HTML/CSS:

- **Visão Executiva:** resultado comercial, tendências, hubs e saúde operacional.
- **Pedidos & Operação:** volume, status e decomposição do ciclo.
- **Financeiro & Conciliação:** pagamentos, taxas, chargebacks e divergências.
- **Entregas & Qualidade:** conclusão, retentativas, distância e percentis.
- **Detalhamento:** consulta auditável por pedido.

O modelo Import utiliza um extrato de uma linha por pedido, gerado a partir dos CSVs completos do repositório. O snapshot de 82 MB não é versionado porque pode ser reproduzido de forma determinística.

## Preparar e abrir em outra máquina

Na raiz do repositório:

\`\`\`powershell
python powerbi/scripts/build_import_data.py
node powerbi/scripts/generate_pbip.mjs
\`\`\`

O segundo comando regenera o projeto e atualiza o parâmetro Power Query \`Arquivo Snapshot\` com o caminho correto da máquina atual. Depois, abra \`powerbi/${projectName}.pbip\` no Power BI Desktop e atualize o modelo.

## Evidências e manutenção

- \`data/validacao.json\`: baselines reconciliados com os dados completos.
- \`validation-report.json\`: validação estrutural do PBIR.
- \`${projectName}.SemanticModel/definition/tables/FatoDashboard.tmdl\`: 46 colunas, partição Import e 57 medidas DAX.
- \`scripts/generate_pbip.mjs\`: geração determinística de nove páginas, 87 visuais e 11 componentes HTML/CSS.
- \`report-spec.md\`: escopo, regras e critérios de aceite.
`);

console.log(JSON.stringify({
  project: path.join(pbRoot, `${projectName}.pbip`),
  reportDir,
  modelDir,
  pages: pageDefinitions.map(([pageId, displayName, visuals, tooltip]) => ({
    pageId,
    displayName,
    tooltip,
    visuals: visuals.length,
  })),
  visuals: pageDefinitions.reduce((total, [, , visuals]) => total + visuals.length, 0),
}, null, 2));
