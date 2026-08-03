import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, "..");
const reportDir = join(root, "DeliveryCenterAnalytics.Report");
const modelDir = join(root, "DeliveryCenterAnalytics.SemanticModel");
const tableDir = join(modelDir, "definition", "tables");
const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function unquote(value) {
  const trimmed = value.trim();
  return trimmed.startsWith("'") && trimmed.endsWith("'")
    ? trimmed.slice(1, -1).replaceAll("''", "'")
    : trimmed;
}

const tables = new Map();
for (const path of readdirSync(tableDir).filter((name) => name.endsWith(".tmdl")).map((name) => join(tableDir, name))) {
  const text = readFileSync(path, "utf8");
  const tableMatch = text.match(/^table (.+)$/m);
  assert(tableMatch, `Tabela não encontrada em ${basename(path)}`);
  if (!tableMatch) continue;

  const tableName = unquote(tableMatch[1]);
  const fields = new Set();
  for (const match of text.matchAll(/^\t(?:column|measure) (.+?)(?: = ```)?$/gm)) {
    fields.add(unquote(match[1]));
  }
  tables.set(tableName, fields);
}

const modelText = readFileSync(join(modelDir, "definition", "model.tmdl"), "utf8");
for (const match of modelText.matchAll(/^ref table (.+)$/gm)) {
  assert(tables.has(unquote(match[1])), `Referência a tabela inexistente: ${match[1]}`);
}

const relationshipText = readFileSync(join(modelDir, "definition", "relationships.tmdl"), "utf8");
const relationshipCount = [...relationshipText.matchAll(/^relationship /gm)].length;
assert(relationshipCount === 20, `Esperados 20 relacionamentos; encontrados ${relationshipCount}`);
assert(!/crossFilteringBehavior:\s*bothDirections/i.test(relationshipText), "Há relacionamento bidirecional não aprovado");
for (const match of relationshipText.matchAll(/^\t(?:fromColumn|toColumn): (.+?)\.(.+)$/gm)) {
  const tableName = unquote(match[1]);
  const fieldName = unquote(match[2]);
  assert(tables.has(tableName), `Relacionamento usa tabela inexistente: ${tableName}`);
  assert(tables.get(tableName)?.has(fieldName), `Relacionamento usa campo inexistente: ${tableName}[${fieldName}]`);
}

const jsonLike = walk(root).filter((path) =>
  [".json", ".platform", ".pbip", ".pbir", ".pbism"].includes(extname(path)) || basename(path) === ".platform"
);
for (const path of jsonLike) {
  try {
    JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    failures.push(`JSON inválido em ${path}: ${error.message}`);
  }
}

function inspectFieldBindings(value, sourcePath) {
  if (!value || typeof value !== "object") return;
  for (const kind of ["Column", "Measure"]) {
    const binding = value[kind];
    const entity = binding?.Expression?.SourceRef?.Entity;
    const property = binding?.Property;
    if (entity && property) {
      assert(tables.has(entity), `Visual usa tabela inexistente em ${sourcePath}: ${entity}`);
      assert(tables.get(entity)?.has(property), `Visual usa campo inexistente em ${sourcePath}: ${entity}[${property}]`);
    }
  }
  for (const child of Object.values(value)) inspectFieldBindings(child, sourcePath);
}

const visualFiles = walk(join(reportDir, "definition", "pages")).filter((path) => basename(path) === "visual.json");
let htmlVisuals = 0;
let pageNavigators = 0;
let clearFilterButtons = 0;
let canvasTooltips = 0;
let donutVisuals = 0;
let sidebarShapes = 0;
for (const path of visualFiles) {
  const visual = JSON.parse(readFileSync(path, "utf8"));
  const type = visual.visual?.visualType;
  if (type === "htmlContent443BE3AD55E043BF878BED274D3A6865") htmlVisuals += 1;
  if (type === "pageNavigator") pageNavigators += 1;
  if (type === "shape") sidebarShapes += 1;
  if (type === "donutChart" || type === "pieChart") donutVisuals += 1;
  const linkType = visual.visual?.visualContainerObjects?.visualLink?.[0]?.properties?.type?.expr?.Literal?.Value;
  if (linkType === "'ClearAllSlicers'") clearFilterButtons += 1;
  const tooltipType = visual.visual?.visualContainerObjects?.visualTooltip?.[0]?.properties?.type?.expr?.Literal?.Value;
  if (tooltipType === "'Canvas'") canvasTooltips += 1;
  const altText = visual.visual?.visualContainerObjects?.general?.[0]?.properties?.altText;
  assert(Boolean(altText), `Visual sem texto alternativo em ${path}`);
  inspectFieldBindings(visual, path);
}

const pageFiles = walk(join(reportDir, "definition", "pages")).filter((path) => basename(path) === "page.json");
const pages = pageFiles.map((path) => JSON.parse(readFileSync(path, "utf8")));
const pagesByName = new Map(pages.map((page) => [page.name, page]));
const tooltipPageNames = new Set(pages.filter((page) => page.type === "Tooltip").map((page) => page.name));
const visualLayoutsByPage = new Map();

for (const path of visualFiles) {
  const visual = JSON.parse(readFileSync(path, "utf8"));
  const pageName = basename(dirname(dirname(dirname(path))));
  const page = pagesByName.get(pageName);
  assert(Boolean(page), `Visual associado a página inexistente: ${path}`);
  if (!page) continue;

  const position = visual.position;
  assert(position.x >= 0 && position.y >= 0, `Visual inicia fora do canvas em ${path}`);
  assert(position.width > 0 && position.height > 0, `Visual sem dimensão válida em ${path}`);
  assert(position.x + position.width <= page.width, `Visual ultrapassa a largura da página em ${path}`);
  assert(position.y + position.height <= page.height, `Visual ultrapassa a altura da página em ${path}`);
  const pageLayouts = visualLayoutsByPage.get(pageName) ?? [];
  pageLayouts.push({ path, position, visualType: visual.visual?.visualType });
  visualLayoutsByPage.set(pageName, pageLayouts);

  if (visual.visual?.visualType === "pageNavigator") {
    const pageSettings = visual.visual?.objects?.pages?.[0]?.properties;
    assert(pageSettings?.showHiddenPages?.expr?.Literal?.Value === "false", `Navegador exibe páginas ocultas em ${path}`);
    assert(pageSettings?.showTooltipPages?.expr?.Literal?.Value === "false", `Navegador exibe páginas de tooltip em ${path}`);
  }

  const tooltipSection = visual.visual?.visualContainerObjects?.visualTooltip?.[0]?.properties?.section?.expr?.Literal?.Value;
  if (tooltipSection) {
    const targetPage = tooltipSection.replace(/^'/, "").replace(/'$/, "");
    assert(tooltipPageNames.has(targetPage), `Tooltip aponta para página inexistente ou visível em ${path}: ${targetPage}`);
  }
}

for (const [pageName, layouts] of visualLayoutsByPage) {
  for (let left = 0; left < layouts.length; left += 1) {
    for (let right = left + 1; right < layouts.length; right += 1) {
      const a = layouts[left].position;
      const b = layouts[right].position;
      const isBackgroundShape = layouts[left].visualType === "shape" || layouts[right].visualType === "shape";
      const overlaps = !isBackgroundShape && a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
      assert(!overlaps, `Visuais sobrepostos na página ${pageName}: ${layouts[left].path} e ${layouts[right].path}`);
    }
  }
}

const metricsText = readFileSync(join(tableDir, "Métricas.tmdl"), "utf8");
const measureCount = [...metricsText.matchAll(/^\tmeasure /gm)].length;
assert(pageFiles.length === 9, `Esperadas 9 páginas; encontradas ${pageFiles.length}`);
assert(pages.filter((page) => page.type === "Tooltip").length === 4, "Esperadas 4 páginas de tooltip");
assert(pages.filter((page) => page.visibility !== "HiddenInViewMode").length === 5, "Esperadas 5 páginas visíveis");
assert(pages.filter((page) => page.type === "Tooltip").every((page) => page.width === 320 && page.height === 240), "Tooltip fora do tamanho 320 × 240");
assert(visualFiles.length === 102, `Esperados 102 visuais; encontrados ${visualFiles.length}`);
assert(htmlVisuals === 7, `Esperados 7 visuais HTML; encontrados ${htmlVisuals}`);
assert(sidebarShapes === 5, `Esperados 5 painéis laterais; encontrados ${sidebarShapes}`);
assert(pageNavigators === 5, `Esperados 5 navegadores de página; encontrados ${pageNavigators}`);
assert(clearFilterButtons === 5, `Esperados 5 botões de limpeza; encontrados ${clearFilterButtons}`);
assert(canvasTooltips >= 8, `Esperados ao menos 8 gráficos com tooltip de página; encontrados ${canvasTooltips}`);
assert(donutVisuals === 0, `Não são permitidos pizza ou donut; encontrados ${donutVisuals}`);
assert(measureCount === 54, `Esperadas 54 medidas; encontradas ${measureCount}`);
assert(!metricsText.includes('style="'), "Há aspas HTML conflitantes com as strings DAX");
assert(!metricsText.includes("linear-gradient"), "Há gradiente decorativo em medida HTML");

for (const match of metricsText.matchAll(/^\tmeasure (.+?) = ```\r?\n([\s\S]*?)\r?\n\t\t```/gm)) {
  const measureName = unquote(match[1]);
  const dax = match[2].replace(/^\t+/gm, "").trim();
  assert(!/^RETURN\b/i.test(dax), `Medida começa com RETURN sem VAR: ${measureName}`);
}

for (const requiredMeasure of [
  "Pedidos Criados",
  "Valor Transacionado",
  "Ticket Médio",
  "Margem Entrega",
  "Tempo Ciclo P50",
  "Tempo Ciclo P90",
  "Taxa Conciliação",
  "Participação Valor Transacionado",
  "Participação Pedidos",
  "Participação Valor Pago",
  "Contexto Tooltip"
]) {
  assert(tables.get("Métricas")?.has(requiredMeasure), `Medida obrigatória ausente: ${requiredMeasure}`);
}

const allText = walk(root)
  .filter((path) => ![".png", ".jpg", ".jpeg", ".gif"].includes(extname(path).toLowerCase()))
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");
const forbiddenCredential = ["datamart", "pass"].join("_");
assert(!allText.includes(forbiddenCredential), "Uma credencial conhecida foi encontrada em powerbi/");

if (failures.length) {
  console.error(`Validação falhou com ${failures.length} problema(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Validação PBIP estática: OK");
console.log(`Tabelas: ${tables.size}; relações: ${relationshipCount}; medidas: ${measureCount}`);
console.log(`Páginas: ${pageFiles.length}; visuais: ${visualFiles.length}; HTML: ${htmlVisuals}`);
