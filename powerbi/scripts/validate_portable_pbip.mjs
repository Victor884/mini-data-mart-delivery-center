import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const powerbiDir = path.resolve(here, "..");
const reportDir = path.join(powerbiDir, "DeliveryCenter.Report", "definition");
const modelDir = path.join(powerbiDir, "DeliveryCenter.SemanticModel", "definition");
const pagesDir = path.join(reportDir, "pages");
const snapshotPath = path.join(powerbiDir, "data", "fato_dashboard.csv");
const baselinePath = path.join(powerbiDir, "data", "validacao.json");

const expectedPages = [
  ["9e1c7a42d0b54173a101", "01 Visão Executiva", false, 18],
  ["b84fe8e63ef84b0ab201", "02 Pedidos & Operação", false, 17],
  ["c95af9f74fa95c1bc302", "03 Financeiro & Conciliação", false, 17],
  ["a73f26c08b6e4d159202", "04 Entregas & Qualidade", false, 17],
  ["da6b0a0850ba6d2cd403", "05 Detalhamento", false, 14],
  ["e17c1b1961cb7e3de504", "Tooltip | Comercial", true, 1],
  ["f28d2c2072dc8f4ef605", "Tooltip | Pedidos", true, 1],
  ["039e3d3183ed9050a706", "Tooltip | Financeiro", true, 1],
  ["14af4e4294fea161b807", "Tooltip | Entregas", true, 1],
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

const pagesMetadata = readJson(path.join(pagesDir, "pages.json"));
const reportDefinition = readJson(path.join(reportDir, "report.json"));
assert(
  reportDefinition.publicCustomVisuals?.includes("htmlContent443BE3AD55E043BF878BED274D3A6865"),
  "O visual certificado HTML Content (lite) não está registrado no relatório.",
);
assert(
  JSON.stringify(pagesMetadata.pageOrder) === JSON.stringify(expectedPages.map(([id]) => id)),
  "A ordem ou o conjunto de páginas diverge da especificação.",
);
assert(pagesMetadata.activePageName === expectedPages[0][0], "A Visão Executiva deve ser a página ativa.");

const referencedColumns = new Set();
const referencedMeasures = new Set();
const visualTypes = new Map();
const serializedVisibleVisuals = [];
let visualCount = 0;

for (const [pageId, displayName, isTooltip, expectedVisuals] of expectedPages) {
  const page = readJson(path.join(pagesDir, pageId, "page.json"));
  assert(page.displayName === displayName, `Nome inesperado para a página ${pageId}.`);
  assert((page.type === "Tooltip") === isTooltip, `Configuração de tooltip incorreta em ${displayName}.`);
  assert(
    page.visibility === (isTooltip ? "HiddenInViewMode" : "AlwaysVisible"),
    `Visibilidade incorreta em ${displayName}.`,
  );

  const visualsDir = path.join(pagesDir, pageId, "visuals");
  const visualFolders = fs.readdirSync(visualsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  assert(visualFolders.length === expectedVisuals, `${displayName} possui quantidade inesperada de visuais.`);
  visualCount += visualFolders.length;

  for (const folder of visualFolders) {
    const visual = readJson(path.join(visualsDir, folder.name, "visual.json"));
    const type = visual.visual?.visualType ?? "group-or-container";
    visualTypes.set(type, (visualTypes.get(type) ?? 0) + 1);
    collectFieldReferences(visual, referencedColumns, referencedMeasures);
    if (!isTooltip) serializedVisibleVisuals.push(JSON.stringify(visual));
  }
}

assert(visualCount === 87, `Esperados 87 visuais; encontrados ${visualCount}.`);
assert(visualTypes.get("pageNavigator") === 5, "Cada página analítica deve possuir um navegador de páginas.");
assert(visualTypes.get("actionButton") === 5, "Cada página analítica deve possuir um botão para limpar filtros.");
assert(visualTypes.get("slicer") === 20, "Esperadas quatro segmentações em cada página analítica.");
assert(
  visualTypes.get("htmlContent443BE3AD55E043BF878BED274D3A6865") === 11,
  "Esperados 11 componentes HTML/CSS no visual HTML Content (lite).",
);

const allVisibleVisuals = serializedVisibleVisuals.join("\n");
for (const [pageId, displayName, isTooltip] of expectedPages) {
  if (isTooltip) assert(allVisibleVisuals.includes(pageId), `${displayName} não está associado a nenhum visual analítico.`);
}

const tableTmdl = fs.readFileSync(path.join(modelDir, "tables", "FatoDashboard.tmdl"), "utf8");
const expressionsTmdl = fs.readFileSync(path.join(modelDir, "expressions.tmdl"), "utf8");
const modelColumns = new Set(
  [...tableTmdl.matchAll(/^\s*column\s+(?:'([^']+)'|([^\r\n]+?))\s*$/gm)].map((match) => match[1] ?? match[2].trim()),
);
const modelMeasures = new Set(
  [...tableTmdl.matchAll(/^\s*measure\s+(?:'([^']+)'|([^=]+?))\s*=/gm)].map((match) => match[1] ?? match[2].trim()),
);

assert(modelColumns.size === 46, `Esperadas 46 colunas no modelo; encontradas ${modelColumns.size}.`);
assert(modelMeasures.size === 57, `Esperadas 57 medidas no modelo; encontradas ${modelMeasures.size}.`);
assert(tableTmdl.includes('File.Contents(#"Arquivo Snapshot")'), "A partição deve usar o parâmetro Arquivo Snapshot.");
assert(tableTmdl.includes("Columns = 46"), "A partição CSV deve declarar as 46 colunas esperadas.");
assert(expressionsTmdl.includes("IsParameterQuery=true"), "Arquivo Snapshot deve ser um parâmetro editável.");

const missingColumns = [...referencedColumns].filter((name) => !modelColumns.has(name));
const missingMeasures = [...referencedMeasures].filter((name) => !modelMeasures.has(name));
assert(missingColumns.length === 0, `Colunas visuais ausentes no modelo: ${missingColumns.join(", ")}`);
assert(missingMeasures.length === 0, `Medidas visuais ausentes no modelo: ${missingMeasures.join(", ")}`);

assert(fs.existsSync(snapshotPath), "Snapshot ausente. Execute python powerbi/scripts/build_import_data.py.");
const snapshotHeader = fs.readFileSync(snapshotPath, "utf8").split(/\r?\n/, 1)[0].split(",");
assert(snapshotHeader.length === 46, `O snapshot possui ${snapshotHeader.length} colunas; eram esperadas 46.`);

const baselines = readJson(baselinePath);
assert(baselines.linhas === 368999, "Baseline de pedidos divergente.");
assert(baselines.pedidos_finalizados === 352020, "Baseline de pedidos finalizados divergente.");
assert(baselines.valor_transacionado_finalizado === 37481358.97, "Baseline comercial divergente.");
assert(baselines.valor_pago_confirmado === 37304232.78, "Baseline financeiro divergente.");
assert(baselines.taxa_entrega_concluida_pct === 97.95, "Baseline logístico divergente.");
assert(baselines.taxa_conciliacao_pct === 96.6, "Baseline de conciliação divergente.");

console.log(JSON.stringify({
  result: "succeeded",
  pages: expectedPages.length,
  analyticalPages: expectedPages.filter(([, , tooltip]) => !tooltip).length,
  tooltipPages: expectedPages.filter(([, , tooltip]) => tooltip).length,
  visuals: visualCount,
  columns: modelColumns.size,
  measures: modelMeasures.size,
  slicers: visualTypes.get("slicer"),
  navigation: visualTypes.get("pageNavigator"),
  clearFilterButtons: visualTypes.get("actionButton"),
  htmlCssVisuals: visualTypes.get("htmlContent443BE3AD55E043BF878BED274D3A6865"),
  referencedColumns: referencedColumns.size,
  referencedMeasures: referencedMeasures.size,
}, null, 2));
