import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const powerbiDir = path.resolve(here, "..");
const modelDir = path.join(powerbiDir, "DeliveryCenter.SemanticModel", "definition");
const snapshotPath = path.join(powerbiDir, "data", "fato_dashboard.csv");
const baselinePath = path.join(powerbiDir, "data", "validacao.json");
const htmlVisualType = "htmlContent443BE3AD55E043BF878BED274D3A6865";

const pageIds = {
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

const pageOrder = [
  pageIds.executive,
  pageIds.delivery,
  pageIds.finance,
  pageIds.orders,
  pageIds.detail,
  pageIds.tooltipCommercial,
  pageIds.tooltipOrders,
  pageIds.tooltipFinance,
  pageIds.tooltipDelivery,
];

const pageNames = {
  [pageIds.executive]: "Executivo",
  [pageIds.orders]: "Pedidos & Operação",
  [pageIds.finance]: "Pagamentos",
  [pageIds.delivery]: "Logística",
  [pageIds.detail]: "Detalhamento",
  [pageIds.tooltipCommercial]: "Tooltip | Comercial",
  [pageIds.tooltipOrders]: "Tooltip | Pedidos",
  [pageIds.tooltipFinance]: "Tooltip | Financeiro",
  [pageIds.tooltipDelivery]: "Tooltip | Entregas",
};

const variants = [
  {
    mode: "dark",
    reportName: "DeliveryCenterDark.Report",
    projectName: "DeliveryCenterDark.pbip",
    activePage: pageIds.delivery,
    expectedVisuals: 84,
    expectedSlicers: 19,
    expectedHtml: 12,
    pageVisuals: [18, 14, 17, 17, 14, 1, 1, 1, 1],
  },
  {
    mode: "light",
    reportName: "DeliveryCenterLight.Report",
    projectName: "DeliveryCenterLight.pbip",
    activePage: pageIds.executive,
    expectedVisuals: 92,
    expectedSlicers: 20,
    expectedHtml: 12,
    pageVisuals: [19, 18, 18, 18, 15, 1, 1, 1, 1],
  },
];

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function collectFieldReferences(value, columns, measures) {
  if (!value || typeof value !== "object") return;
  if (value.Column?.Property) columns.add(value.Column.Property);
  if (value.Measure?.Property) measures.add(value.Measure.Property);
  for (const child of Object.values(value)) collectFieldReferences(child, columns, measures);
}

function validateReport(variant, modelColumns, modelMeasures) {
  const reportRoot = path.join(powerbiDir, variant.reportName);
  const reportDir = path.join(reportRoot, "definition");
  const pagesDir = path.join(reportDir, "pages");
  const project = readJson(path.join(powerbiDir, variant.projectName));
  const definitionPbir = readJson(path.join(reportRoot, "definition.pbir"));
  const reportDefinition = readJson(path.join(reportDir, "report.json"));
  const pagesMetadata = readJson(path.join(pagesDir, "pages.json"));

  assert(project.artifacts?.[0]?.report?.path === variant.reportName, `${variant.projectName} aponta para o relatório incorreto.`);
  assert(definitionPbir.datasetReference?.byPath?.path === "../DeliveryCenter.SemanticModel", `${variant.reportName} não compartilha o modelo esperado.`);
  assert(reportDefinition.publicCustomVisuals?.includes(htmlVisualType), `${variant.reportName} não registra HTML Content.`);
  assert(JSON.stringify(pagesMetadata.pageOrder) === JSON.stringify(pageOrder), `Ordem de páginas incorreta em ${variant.mode}.`);
  assert(pagesMetadata.activePageName === variant.activePage, `Página ativa incorreta em ${variant.mode}.`);

  const referencedColumns = new Set();
  const referencedMeasures = new Set();
  const visualTypes = new Map();
  const visibleVisuals = [];
  let visualCount = 0;

  for (const [index, pageId] of pageOrder.entries()) {
    const page = readJson(path.join(pagesDir, pageId, "page.json"));
    const isTooltip = index >= 5;
    const expectedVisibility = isTooltip || pageId === pageIds.orders || pageId === pageIds.detail
      ? "HiddenInViewMode"
      : "AlwaysVisible";
    assert(page.displayName === pageNames[pageId], `Nome inesperado na página ${pageId} (${variant.mode}).`);
    assert((page.type === "Tooltip") === isTooltip, `Tipo de página incorreto em ${pageNames[pageId]} (${variant.mode}).`);
    assert(page.visibility === expectedVisibility, `Visibilidade incorreta em ${pageNames[pageId]} (${variant.mode}).`);
    if (!isTooltip) {
      assert(page.width === 1440 && page.height === 1024, `Canvas incorreto em ${pageNames[pageId]} (${variant.mode}).`);
    }

    const visualsDir = path.join(pagesDir, pageId, "visuals");
    const folders = fs.readdirSync(visualsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
    assert(folders.length === variant.pageVisuals[index], `Quantidade de visuais incorreta em ${pageNames[pageId]} (${variant.mode}).`);
    visualCount += folders.length;

    for (const folder of folders) {
      const visual = readJson(path.join(visualsDir, folder.name, "visual.json"));
      const type = visual.visual?.visualType ?? "group-or-container";
      visualTypes.set(type, (visualTypes.get(type) ?? 0) + 1);
      collectFieldReferences(visual, referencedColumns, referencedMeasures);
      if (!isTooltip) visibleVisuals.push(JSON.stringify(visual));
      if (!isTooltip) {
        assert(visual.position.x >= 0 && visual.position.y >= 0, `Visual ${visual.name} possui posição negativa.`);
        assert(visual.position.x + visual.position.width <= 1440, `Visual ${visual.name} ultrapassa a largura do canvas.`);
        assert(visual.position.y + visual.position.height <= 1024, `Visual ${visual.name} ultrapassa a altura do canvas.`);
      }
    }
  }

  assert(visualCount === variant.expectedVisuals, `Total de visuais incorreto em ${variant.mode}.`);
  assert(visualTypes.get("pageNavigator") === 5, `Navegação ausente em ${variant.mode}.`);
  assert(visualTypes.get("actionButton") === 5, `Botão de limpeza ausente em ${variant.mode}.`);
  assert(visualTypes.get("slicer") === variant.expectedSlicers, `Total de slicers incorreto em ${variant.mode}.`);
  assert(visualTypes.get(htmlVisualType) === variant.expectedHtml, `Total de componentes HTML/CSS incorreto em ${variant.mode}.`);

  const visibleSerialized = visibleVisuals.join("\n");
  for (const tooltipId of [pageIds.tooltipCommercial, pageIds.tooltipOrders, pageIds.tooltipFinance, pageIds.tooltipDelivery]) {
    assert(visibleSerialized.includes(tooltipId), `Tooltip ${tooltipId} não está associado em ${variant.mode}.`);
  }

  const missingColumns = [...referencedColumns].filter((name) => !modelColumns.has(name));
  const missingMeasures = [...referencedMeasures].filter((name) => !modelMeasures.has(name));
  assert(missingColumns.length === 0, `Colunas ausentes em ${variant.mode}: ${missingColumns.join(", ")}`);
  assert(missingMeasures.length === 0, `Medidas ausentes em ${variant.mode}: ${missingMeasures.join(", ")}`);

  if (variant.mode === "dark") {
    assert(visualTypes.get("lineClusteredColumnComboChart") === 1, "O modo Dark deve conter o combo logístico.");
  } else {
    assert(visualTypes.get("areaChart") === 1, "O modo Light deve conter o gráfico de área executivo.");
  }

  return {
    mode: variant.mode,
    pages: pageOrder.length,
    visibleNavigationPages: 3,
    visuals: visualCount,
    slicers: visualTypes.get("slicer"),
    htmlCssVisuals: visualTypes.get(htmlVisualType),
    referencedColumns: referencedColumns.size,
    referencedMeasures: referencedMeasures.size,
  };
}

const tableTmdl = fs.readFileSync(path.join(modelDir, "tables", "FatoDashboard.tmdl"), "utf8");
const expressionsTmdl = fs.readFileSync(path.join(modelDir, "expressions.tmdl"), "utf8");
const modelColumns = new Set(
  [...tableTmdl.matchAll(/^\s*column\s+(?:'([^']+)'|([^\r\n]+?))\s*$/gm)].map((match) => match[1] ?? match[2].trim()),
);
const modelMeasures = new Set(
  [...tableTmdl.matchAll(/^\s*measure\s+(?:'([^']+)'|([^=]+?))\s*=/gm)].map((match) => match[1] ?? match[2].trim()),
);

assert(modelColumns.size === 46, `Esperadas 46 colunas; encontradas ${modelColumns.size}.`);
assert(modelMeasures.size === 72, `Esperadas 72 medidas; encontradas ${modelMeasures.size}.`);
assert(tableTmdl.includes('File.Contents(#"Arquivo Snapshot")'), "A partição deve usar Arquivo Snapshot.");
assert(tableTmdl.includes("Columns = 46"), "A partição CSV deve declarar 46 colunas.");
assert(expressionsTmdl.includes("IsParameterQuery=true"), "Arquivo Snapshot deve ser um parâmetro editável.");

assert(fs.existsSync(snapshotPath), "Snapshot ausente. Execute build_import_data.py.");
const snapshotHeader = fs.readFileSync(snapshotPath, "utf8").split(/\r?\n/, 1)[0].split(",");
assert(snapshotHeader.length === 46, `O snapshot possui ${snapshotHeader.length} colunas; eram esperadas 46.`);

const baselines = readJson(baselinePath);
assert(baselines.linhas === 368999, "Baseline de pedidos divergente.");
assert(baselines.pedidos_finalizados === 352020, "Baseline de pedidos finalizados divergente.");
assert(baselines.valor_transacionado_finalizado === 37481358.97, "Baseline comercial divergente.");
assert(baselines.valor_pago_confirmado === 37304232.78, "Baseline financeiro divergente.");
assert(baselines.taxa_entrega_concluida_pct === 97.95, "Baseline logístico divergente.");
assert(baselines.taxa_conciliacao_pct === 96.6, "Baseline de conciliação divergente.");

const reportResults = variants.map((variant) => validateReport(variant, modelColumns, modelMeasures));
console.log(JSON.stringify({
  result: "succeeded",
  semanticModel: { columns: modelColumns.size, measures: modelMeasures.size },
  reports: reportResults,
  baseline: {
    orders: baselines.linhas,
    finalizedOrders: baselines.pedidos_finalizados,
    finalizedValue: baselines.valor_transacionado_finalizado,
    paidValue: baselines.valor_pago_confirmado,
    deliveryCompletionPct: baselines.taxa_entrega_concluida_pct,
  },
}, null, 2));
