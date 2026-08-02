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
for (const path of visualFiles) {
  const visual = JSON.parse(readFileSync(path, "utf8"));
  if (visual.visual?.visualType === "htmlContent443BE3AD55E043BF878BED274D3A6865") htmlVisuals += 1;
  inspectFieldBindings(visual, path);
}

const pageFiles = walk(join(reportDir, "definition", "pages")).filter((path) => basename(path) === "page.json");
const metricsText = readFileSync(join(tableDir, "Métricas.tmdl"), "utf8");
const measureCount = [...metricsText.matchAll(/^\tmeasure /gm)].length;
assert(pageFiles.length === 4, `Esperadas 4 páginas; encontradas ${pageFiles.length}`);
assert(visualFiles.length === 36, `Esperados 36 visuais; encontrados ${visualFiles.length}`);
assert(htmlVisuals === 7, `Esperados 7 visuais HTML; encontrados ${htmlVisuals}`);
assert(measureCount === 40, `Esperadas 40 medidas; encontradas ${measureCount}`);
assert(!metricsText.includes('style="'), "Há aspas HTML conflitantes com as strings DAX");

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
