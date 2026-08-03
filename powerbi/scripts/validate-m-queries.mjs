import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const tableDir = resolve(scriptDir, "..", "DeliveryCenterAnalytics.SemanticModel", "definition", "tables");
const container = process.env.PBI_DB_CONTAINER || "mini_datamart_postgres";
const databaseUser = process.env.PBI_DB_USER || "datamart_user";
const database = process.env.PBI_DB_NAME || "mini_datamart_delivery";

const queries = [];
for (const fileName of readdirSync(tableDir).filter((name) => name.endsWith(".tmdl"))) {
  const source = readFileSync(join(tableDir, fileName), "utf8");
  const match = source.match(/\[Query = "((?:[^"]|"")*)"\]\)/);
  if (!match) continue;
  queries.push({ table: fileName.replace(/\.tmdl$/, ""), sql: match[1].replaceAll('""', '"') });
}

if (queries.length !== 10) {
  console.error(`Esperadas 10 consultas M nativas; encontradas ${queries.length}`);
  process.exit(1);
}

let failures = 0;
for (const query of queries) {
  const sql = `SELECT * FROM (${query.sql}) AS powerbi_query LIMIT 0;`;
  const result = spawnSync(
    "docker",
    ["exec", container, "psql", "-v", "ON_ERROR_STOP=1", "-U", databaseUser, "-d", database, "-At", "-c", sql],
    { encoding: "utf8", windowsHide: true }
  );
  if (result.status === 0) {
    console.log(`OK  ${query.table}`);
  } else {
    failures += 1;
    console.error(`ERRO  ${query.table}`);
    console.error((result.stderr || result.stdout).trim());
  }
}

if (failures) {
  console.error(`${failures} consulta(s) M falharam.`);
  process.exit(1);
}

console.log(`${queries.length} de ${queries.length} consultas M executadas com sucesso.`);
