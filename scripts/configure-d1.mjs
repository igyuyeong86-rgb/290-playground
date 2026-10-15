import { readFileSync, writeFileSync } from "node:fs";
const id = process.argv[2];
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id ?? "") || id === "00000000-0000-4000-8000-000000000000") {
  console.error("Usage: npm run db:configure -- <database_id returned by npm run db:create>");
  process.exit(1);
}
const path = new URL("../wrangler.json", import.meta.url);
const config = JSON.parse(readFileSync(path, "utf8"));
config.d1_databases.find(binding => binding.binding === "DB").database_id = id;
writeFileSync(path, JSON.stringify(config, null, 2) + "\n");
console.log("DB configured in wrangler.json. Rebuild before deployment. Local data is not uploaded.");
