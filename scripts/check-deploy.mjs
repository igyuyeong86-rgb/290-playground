import { readFileSync } from "node:fs";
const config = JSON.parse(readFileSync(new URL("../wrangler.json", import.meta.url), "utf8"));
const db = config.d1_databases?.find(binding => binding.binding === "DB");
if (!db || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(db.database_id ?? "") || db.database_id === "00000000-0000-4000-8000-000000000000") {
  console.error("Deployment stopped: create D1 with npm run db:create, then npm run db:configure -- <database_id>.");
  process.exit(1);
}
console.log("D1 configuration is ready. Cloudflare account access will be verified by Wrangler.");
