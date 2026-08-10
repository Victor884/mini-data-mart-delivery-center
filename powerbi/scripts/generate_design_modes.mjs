import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const powerbiDir = path.resolve(here, "..");
const baseReportDir = path.join(powerbiDir, "DeliveryCenter.Report");
const htmlVisualType = "htmlContent443BE3AD55E043BF878BED274D3A6865";

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

const pageNames = {
  [pages.executive]: "Executivo",
  [pages.orders]: "Pedidos & Operação",
  [pages.finance]: "Pagamentos",
  [pages.delivery]: "Logística",
  [pages.detail]: "Detalhamento",
  [pages.tooltipCommercial]: "Tooltip | Comercial",
  [pages.tooltipOrders]: "Tooltip | Pedidos",
  [pages.tooltipFinance]: "Tooltip | Financeiro",
  [pages.tooltipDelivery]: "Tooltip | Entregas",
};

const pagePrefixes = {
  [pages.executive]: "01e",
  [pages.orders]: "02o",
  [pages.finance]: "03f",
  [pages.delivery]: "04d",
  [pages.detail]: "05t",
};

const lightMeasureMap = {
  "HTML | KPIs Executivos": "HTML | KPIs Executivos Light",
  "HTML | KPIs Pedidos": "HTML | KPIs Pedidos Light",
  "HTML | Etapas Operacionais": "HTML | Etapas Operacionais Light",
  "HTML | KPIs Financeiros": "HTML | KPIs Financeiros Light",
  "HTML | KPIs Logística": "HTML | KPIs Logística Light",
  "HTML | Detalhe Pedido": "HTML | Detalhe Pedido Light",
  "HTML | Tooltip Comercial": "HTML | Tooltip Comercial Light",
  "HTML | Tooltip Pedidos": "HTML | Tooltip Pedidos Light",
  "HTML | Tooltip Financeiro": "HTML | Tooltip Financeiro Light",
  "HTML | Tooltip Entregas": "HTML | Tooltip Entregas Light",
};

const darkColors = {
  "#070B16": "#06131E",
  "#050812": "#030B13",
  "#0D1424": "#071522",
  "#131D31": "#081A28",
  "#1A2540": "#0D2232",
  "#2A3955": "#244052",
  "#F8FAFC": "#F4F7FB",
  "#F2F8FC": "#F4F7FB",
  "#9FB0C7": "#A5B4C3",
  "#9FB4C4": "#A5B4C3",
  "#22D3EE": "#35C9F2",
  "#4ADE80": "#65D987",
  "#FBBF24": "#FFC244",
  "#FB7185": "#FF7A6E",
};

const lightColors = {
  "#070B16": "#F6F8FB",
  "#050812": "#E8EDF4",
  "#0D1424": "#061A35",
  "#131D31": "#FFFFFF",
  "#1A2540": "#F4F7FB",
  "#2A3955": "#D5DDE8",
  "#F8FAFC": "#0B1B38",
  "#F2F8FC": "#0B1B38",
  "#9FB0C7": "#5D687A",
  "#9FB4C4": "#5D687A",
  "#3B82F6": "#2563EB",
  "#22D3EE": "#14B8A6",
  "#FB7185": "#FF5A52",
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function literal(value) {
  return { expr: { Literal: { Value: value } } };
}

function text(value) {
  return literal(`'${String(value).replaceAll("'", "''")}'`);
}

function bool(value) {
  return literal(value ? "true" : "false");
}

function number(value) {
  return literal(`${value}D`);
}

function fill(color) {
  return { solid: { color: text(color) } };
}

function projection(kind, property) {
  const field = kind === "measure"
    ? { Measure: { Expression: { SourceRef: { Entity: "FatoDashboard" } }, Property: property } }
    : { Column: { Expression: { SourceRef: { Entity: "FatoDashboard" } }, Property: property } };
  return {
    field,
    queryRef: `FatoDashboard.${property}`,
    nativeQueryRef: property,
  };
}

function mapColors(value, replacements) {
  if (Array.isArray(value)) return value.map((item) => mapColors(item, replacements));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapColors(item, replacements)]));
  }
  if (typeof value !== "string") return value;
  let result = value;
  for (const [from, to] of Object.entries(replacements)) result = result.replaceAll(from, to);
  return result;
}

function setPosition(visual, x, y, width, height, z = undefined) {
  Object.assign(visual.position, { x, y, width, height });
  if (z !== undefined) {
    visual.position.z = z;
    visual.position.tabOrder = z;
  }
}

function setText(visual, value, size, color, family = "Segoe UI Semibold") {
  const run = visual.visual.objects.general[0].properties.paragraphs[0].textRuns[0];
  run.value = value;
  run.textStyle = { fontFamily: family, fontSize: `${size}px`, color };
}

function setTitle(visual, title) {
  const titleObject = visual.visual.visualContainerObjects?.title?.[0]?.properties;
  if (titleObject) titleObject.text = text(title);
}

function replaceMeasure(visual, measure) {
  const state = visual.visual.query?.queryState;
  if (!state) return;
  const projectionGroups = Object.values(state);
  for (const group of projectionGroups) {
    for (const item of group.projections ?? []) {
      if (!item.field?.Measure) continue;
      item.field.Measure.Property = measure;
      item.queryRef = `FatoDashboard.${measure}`;
      item.nativeQueryRef = measure;
    }
  }
}

function replaceAllMeasures(visual, mapping) {
  const state = visual.visual.query?.queryState;
  if (!state) return;
  for (const group of Object.values(state)) {
    for (const item of group.projections ?? []) {
      const current = item.field?.Measure?.Property;
      if (current && mapping[current]) {
        item.field.Measure.Property = mapping[current];
        item.queryRef = `FatoDashboard.${mapping[current]}`;
        item.nativeQueryRef = mapping[current];
      }
    }
  }
}

function makeHtmlFrom(source, name, measure, position) {
  const visual = structuredClone(source);
  visual.name = name;
  visual.position = { ...visual.position, ...position, z: position.z, tabOrder: position.z };
  replaceMeasure(visual, measure);
  return visual;
}

function sidebarVisual(mode) {
  const color = mode === "light" ? "#061A35" : "#071522";
  return {
    $schema: "https://developer.microsoft.com/json-schemas/fabric/item/report/definition/visualContainer/2.9.0/schema.json",
    name: `${mode}SidebarBackground`,
    position: { x: 0, y: 0, z: 0, height: 1024, width: 108, tabOrder: 0 },
    visual: {
      visualType: "textbox",
      objects: {
        general: [{ properties: { paragraphs: [{ textRuns: [{ value: "" }], horizontalTextAlignment: "left" }] } }],
      },
      visualContainerObjects: {
        background: [{ properties: { show: bool(true), color: fill(color), transparency: number(0) } }],
        border: [{ properties: { show: bool(false) } }],
        visualHeader: [{ properties: { show: bool(false) } }],
      },
    },
  };
}

function pageDir(reportDir, pageId) {
  return path.join(reportDir, "definition", "pages", pageId);
}

function visualPath(reportDir, pageId, visualName) {
  return path.join(pageDir(reportDir, pageId), "visuals", visualName, "visual.json");
}

function readVisual(reportDir, pageId, visualName) {
  return readJson(visualPath(reportDir, pageId, visualName));
}

function writeVisual(reportDir, pageId, visual) {
  writeJson(visualPath(reportDir, pageId, visual.name), visual);
}

function deleteVisual(reportDir, pageId, visualName) {
  fs.rmSync(path.dirname(visualPath(reportDir, pageId, visualName)), { recursive: true, force: true });
}

function listVisuals(reportDir, pageId) {
  const visualsDir = path.join(pageDir(reportDir, pageId), "visuals");
  if (!fs.existsSync(visualsDir)) return [];
  return fs.readdirSync(visualsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => readVisual(reportDir, pageId, entry.name));
}

function transformPageShell(reportDir, pageId, mode) {
  const prefix = pagePrefixes[pageId];
  const isLight = mode === "light";
  const ink = isLight ? "#0B1B38" : "#F4F7FB";
  const muted = isLight ? "#5D687A" : "#A5B4C3";

  const pageFile = path.join(pageDir(reportDir, pageId), "page.json");
  let page = readJson(pageFile);
  page.displayName = pageNames[pageId];
  page.width = 1440;
  page.height = 1024;
  if (pageId === pages.orders || pageId === pages.detail) page.visibility = "HiddenInViewMode";
  page = mapColors(page, isLight ? lightColors : darkColors);
  writeJson(pageFile, page);

  let visuals = listVisuals(reportDir, pageId).map((visual) => mapColors(visual, isLight ? lightColors : darkColors));
  for (let visual of visuals) {
    replaceAllMeasures(visual, isLight ? lightMeasureMap : {});
    const suffix = visual.name.slice(prefix.length);
    if (isLight) {
      if (suffix === "01") {
        setPosition(visual, 16, 20, 82, 36, 2);
        setText(visual, "DC", 22, "#FFFFFF");
      } else if (suffix === "02") {
        setPosition(visual, 14, 57, 86, 24, 3);
        setText(visual, "ANALYTICS", 7, "#A7B7CB", "Segoe UI");
      } else if (suffix === "03") {
        setPosition(visual, 6, 102, 96, 330, 4);
        visual.visual.objects.layout[0].properties.orientation = literal("1L");
      } else if (suffix === "04") {
        setPosition(visual, 132, 988, 300, 18, 90);
        setText(visual, "Fonte: mart", 9, muted, "Segoe UI");
      } else if (suffix === "05") {
        setPosition(visual, 438, 988, 430, 18, 91);
        setText(visual, "Atualização: full-refresh · Modelo validado", 9, muted, "Segoe UI");
      } else if (suffix === "06") {
        setPosition(visual, 12, 940, 84, 44, 92);
      } else if (suffix === "07") {
        setPosition(visual, 132, 20, 575, 38, 5);
        setText(visual, pageId === pages.executive ? "Delivery Center | Visão Executiva" : pageNames[pageId], 24, ink);
      } else if (suffix === "08") {
        setPosition(visual, 132, 58, 610, 22, 6);
        setText(visual, "Desempenho consolidado · Jan–Abr 2021", 11, muted, "Segoe UI");
      } else if (["10", "11", "12", "13"].includes(suffix)) {
        const index = Number(suffix) - 10;
        setPosition(visual, 760 + index * 165, 18, 150, 76, 10 + index);
      } else if (visual.position.y >= 170) {
        const scaleX = 1.115;
        const scaleY = 1.39;
        setPosition(
          visual,
          Math.round(132 + (visual.position.x - 264) * scaleX),
          Math.round(112 + (visual.position.y - 170) * scaleY),
          Math.round(visual.position.width * scaleX),
          Math.round(visual.position.height * scaleY),
        );
      }
    } else {
      if (suffix === "01") {
        setPosition(visual, 20, 15, 190, 36, 2);
        setText(visual, "◇  Delivery Center", 18, ink);
      } else if (suffix === "02") {
        setPosition(visual, 20, 978, 220, 18, 90);
        setText(visual, "Última carga validada", 9, muted, "Segoe UI");
      } else if (suffix === "03") {
        setPosition(visual, 20, 57, 510, 50, 4);
        visual.visual.objects.layout[0].properties.orientation = literal("0L");
      } else if (suffix === "04") {
        setPosition(visual, 246, 978, 250, 18, 91);
        setText(visual, "full-refresh", 9, muted, "Segoe UI");
      } else if (suffix === "05") {
        setPosition(visual, 502, 978, 430, 18, 92);
        setText(visual, "Fonte: mart · Modelo validado", 9, muted, "Segoe UI");
      } else if (suffix === "06") {
        setPosition(visual, 1360, 58, 68, 44, 93);
      } else if (suffix === "07") {
        setPosition(visual, 230, 14, 560, 38, 5);
        setText(visual, pageNames[pageId], 24, ink);
      } else if (suffix === "08") {
        setPosition(visual, 802, 17, 280, 20, 6);
        setText(visual, "Jan–Abr 2021", 10, muted, "Segoe UI");
      } else if (["10", "11", "12", "13"].includes(suffix)) {
        const index = Number(suffix) - 10;
        setPosition(visual, 710 + index * 165, 42, 150, 76, 10 + index);
      } else if (visual.position.y >= 170) {
        const scaleX = 1.228;
        const scaleY = 1.39;
        setPosition(
          visual,
          Math.round(10 + (visual.position.x - 264) * scaleX),
          Math.round(118 + (visual.position.y - 170) * scaleY),
          Math.round(visual.position.width * scaleX),
          Math.round(visual.position.height * scaleY),
        );
      }
    }
    writeVisual(reportDir, pageId, visual);
  }

  if (isLight) {
    writeVisual(reportDir, pageId, sidebarVisual(mode));
  }
}

function transformTooltip(reportDir, pageId, mode) {
  const pageFile = path.join(pageDir(reportDir, pageId), "page.json");
  let page = mapColors(readJson(pageFile), mode === "light" ? lightColors : darkColors);
  page.displayName = pageNames[pageId];
  writeJson(pageFile, page);
  for (let visual of listVisuals(reportDir, pageId)) {
    visual = mapColors(visual, mode === "light" ? lightColors : darkColors);
    replaceAllMeasures(visual, mode === "light" ? lightMeasureMap : {});
    writeVisual(reportDir, pageId, visual);
  }
}

function configureDarkLogistics(reportDir) {
  const pageId = pages.delivery;
  const prefix = pagePrefixes[pageId];

  const brand = readVisual(reportDir, pageId, `${prefix}01`);
  setPosition(brand, 20, 14, 190, 38, 2);
  setText(brand, "◇  Delivery Center", 18, "#F4F7FB");
  writeVisual(reportDir, pageId, brand);

  const title = readVisual(reportDir, pageId, `${prefix}07`);
  setPosition(title, 230, 14, 560, 38, 5);
  setText(title, "Performance Logística", 24, "#F4F7FB");
  writeVisual(reportDir, pageId, title);

  const nav = readVisual(reportDir, pageId, `${prefix}03`);
  setPosition(nav, 20, 57, 510, 50, 4);
  nav.visual.objects.layout[0].properties.orientation = literal("0L");
  writeVisual(reportDir, pageId, nav);

  for (const [suffix, x, width] of [["10", 842, 190], ["11", 1040, 190], ["12", 1238, 190]]) {
    const slicer = readVisual(reportDir, pageId, `${prefix}${suffix}`);
    setPosition(slicer, x, 42, width, 76);
    writeVisual(reportDir, pageId, slicer);
  }
  deleteVisual(reportDir, pageId, `${prefix}13`);

  const chart = readVisual(reportDir, pageId, `${prefix}30`);
  chart.visual.visualType = "lineClusteredColumnComboChart";
  chart.visual.query.queryState = {
    Category: { projections: [projection("column", "Mês/Ano")] },
    Y: { projections: [projection("measure", "Entregas Concluídas")] },
    Y2: { projections: [projection("measure", "Tempo Ciclo Logístico P50")] },
  };
  setPosition(chart, 10, 125, 990, 455, 30);
  setTitle(chart, "Entregas e tempo de ciclo por mês");
  writeVisual(reportDir, pageId, chart);

  const panel = readVisual(reportDir, pageId, `${prefix}20`);
  replaceMeasure(panel, "HTML | Painel Logística Dark");
  setPosition(panel, 1010, 125, 420, 455, 20);
  writeVisual(reportDir, pageId, panel);

  const hubTable = makeHtmlFrom(panel, `${prefix}32`, "HTML | Tabela Hubs Dark", {
    x: 10, y: 592, width: 1420, height: 370, z: 32,
  });
  writeVisual(reportDir, pageId, hubTable);
  deleteVisual(reportDir, pageId, `${prefix}31`);
  deleteVisual(reportDir, pageId, `${prefix}33`);
}

function configureLightExecutive(reportDir) {
  const pageId = pages.executive;
  const prefix = pagePrefixes[pageId];

  const kpis = readVisual(reportDir, pageId, `${prefix}20`);
  replaceMeasure(kpis, "HTML | KPIs Executivos Light");
  setPosition(kpis, 132, 112, 1290, 126, 20);
  writeVisual(reportDir, pageId, kpis);

  const trend = readVisual(reportDir, pageId, `${prefix}30`);
  trend.visual.visualType = "areaChart";
  trend.visual.query.queryState = {
    Category: { projections: [projection("column", "Mês/Ano")] },
    Y: { projections: [projection("measure", "Valor Transacionado Finalizado")] },
  };
  setPosition(trend, 132, 255, 700, 440, 30);
  setTitle(trend, "Valor transacionado finalizado por mês");
  writeVisual(reportDir, pageId, trend);

  const hubs = readVisual(reportDir, pageId, `${prefix}31`);
  setPosition(hubs, 845, 255, 577, 440, 31);
  setTitle(hubs, "Receita por hub");
  writeVisual(reportDir, pageId, hubs);

  const margin = readVisual(reportDir, pageId, `${prefix}32`);
  replaceMeasure(margin, "HTML | Margem Light");
  setPosition(margin, 132, 715, 300, 245, 32);
  writeVisual(reportDir, pageId, margin);

  const oldTable = readVisual(reportDir, pageId, `${prefix}34`);
  const cycle = makeHtmlFrom(kpis, `${prefix}34`, "HTML | Ciclo Light", {
    x: 445, y: 715, width: 535, height: 245, z: 34,
  });
  cycle.visual.visualContainerObjects = structuredClone(kpis.visual.visualContainerObjects);
  writeVisual(reportDir, pageId, cycle);
  void oldTable;

  const donut = readVisual(reportDir, pageId, `${prefix}33`);
  setPosition(donut, 995, 715, 427, 245, 33);
  setTitle(donut, "Participação por canal");
  writeVisual(reportDir, pageId, donut);
}

function configureReport(reportDir, mode) {
  const isLight = mode === "light";
  const metadataPath = path.join(reportDir, "definition", "pages", "pages.json");
  const metadata = readJson(metadataPath);
  metadata.pageOrder = [
    pages.executive,
    pages.delivery,
    pages.finance,
    pages.orders,
    pages.detail,
    pages.tooltipCommercial,
    pages.tooltipOrders,
    pages.tooltipFinance,
    pages.tooltipDelivery,
  ];
  metadata.activePageName = isLight ? pages.executive : pages.delivery;
  writeJson(metadataPath, metadata);

  for (const pageId of [pages.executive, pages.orders, pages.finance, pages.delivery, pages.detail]) {
    transformPageShell(reportDir, pageId, mode);
  }
  for (const pageId of [pages.tooltipCommercial, pages.tooltipOrders, pages.tooltipFinance, pages.tooltipDelivery]) {
    transformTooltip(reportDir, pageId, mode);
  }

  if (isLight) configureLightExecutive(reportDir);
  else configureDarkLogistics(reportDir);

  const reportFile = path.join(reportDir, "definition", "report.json");
  let report = mapColors(readJson(reportFile), isLight ? lightColors : darkColors);
  const themeName = isLight ? "DeliveryCenterPortfolioLight-20260809.json" : "DeliveryCenterPortfolioDark-20260809.json";
  report.themeCollection.customTheme.name = themeName;
  report.resourcePackages[0].items[0].name = themeName;
  report.resourcePackages[0].items[0].path = themeName;
  writeJson(reportFile, report);

  const resources = path.join(reportDir, "StaticResources", "RegisteredResources");
  for (const file of fs.readdirSync(resources)) fs.rmSync(path.join(resources, file), { force: true });
  writeJson(path.join(resources, themeName), isLight ? {
    name: themeName,
    dataColors: ["#2563EB", "#14B8A6", "#061A35", "#94A3B8", "#FFB020", "#FF5A52"],
    background: "#F6F8FB", foreground: "#0B1B38", tableAccent: "#2563EB",
    good: "#14B8A6", neutral: "#FFB020", bad: "#FF5A52",
    maximum: "#2563EB", center: "#14B8A6", minimum: "#D5DDE8",
  } : {
    name: themeName,
    dataColors: ["#65D987", "#35C9F2", "#FFC244", "#FF7A6E", "#8B5CF6", "#A5B4C3"],
    background: "#06131E", foreground: "#F4F7FB", tableAccent: "#35C9F2",
    good: "#65D987", neutral: "#FFC244", bad: "#FF7A6E",
    maximum: "#65D987", center: "#35C9F2", minimum: "#244052",
  });
}

function createVariant(mode, displayName, logicalId) {
  const suffix = mode === "light" ? "Light" : "Dark";
  const reportName = `DeliveryCenter${suffix}.Report`;
  const reportDir = path.join(powerbiDir, reportName);
  fs.rmSync(reportDir, { recursive: true, force: true });
  fs.cpSync(baseReportDir, reportDir, { recursive: true });

  const platformFile = path.join(reportDir, ".platform");
  const platform = readJson(platformFile);
  platform.metadata.displayName = displayName;
  platform.config.logicalId = logicalId;
  writeJson(platformFile, platform);

  configureReport(reportDir, mode);
  writeJson(path.join(powerbiDir, `DeliveryCenter${suffix}.pbip`), {
    $schema: "https://developer.microsoft.com/json-schemas/fabric/pbip/pbipProperties/1.0.0/schema.json",
    version: "1.0",
    artifacts: [{ report: { path: reportName } }],
    settings: { enableAutoRecovery: true },
  });
  return reportDir;
}

if (!fs.existsSync(baseReportDir)) {
  throw new Error("O relatório-base DeliveryCenter.Report não existe. Execute generate_pbip.mjs primeiro.");
}

const darkReport = createVariant("dark", "Delivery Center — Dark", "018ead00-53be-4a86-a38c-04b90dc16411");
const lightReport = createVariant("light", "Delivery Center — Light", "5720ec18-4b02-427e-a529-82964e04c021");

fs.rmSync(baseReportDir, { recursive: true, force: true });
fs.rmSync(path.join(powerbiDir, "DeliveryCenter.pbip"), { force: true });

console.log(JSON.stringify({
  variants: {
    dark: { project: path.join(powerbiDir, "DeliveryCenterDark.pbip"), report: darkReport, activePage: pageNames[pages.delivery] },
    light: { project: path.join(powerbiDir, "DeliveryCenterLight.pbip"), report: lightReport, activePage: pageNames[pages.executive] },
  },
  semanticModel: path.join(powerbiDir, "DeliveryCenter.SemanticModel"),
}, null, 2));
