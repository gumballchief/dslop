// Talks to Seldon's API with the key from your SELDON_API_KEY user variable (never printed).
//   powershell -File seldon.ps1 validate          free: checks app/seldon.yml server-side
//   powershell -File seldon.ps1 run [name]        spends 1 simulation per test case
//   powershell -File seldon.ps1 report <runId>    the per-case verdicts
//   powershell -File seldon.ps1 summary <runId>   the narrative summary
//   powershell -File seldon.ps1 status|wait <runId>  progress, or wait until it finishes
import fs from "node:fs";

const KEY = process.env.SELDON_API_KEY;
if (!KEY) { console.log("No SELDON_API_KEY in this process. Run through seldon.ps1."); process.exit(1); }
const BASE = "https://app.seldon.com/api/v1";
const yaml = fs.readFileSync(new URL("./app/seldon.yml", import.meta.url), "utf8");
const [, , cmd, arg] = process.argv;
const call = async (method, path, body) => {
  const res = await fetch(BASE + path, { method, headers: { "X-API-Key": KEY, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
};

if (cmd === "validate") console.log(JSON.stringify(await call("POST", "/code-tests/validate", { seldon_yaml: yaml, lineage_key: "unslop" }), null, 1));
else if (cmd === "run") console.log(JSON.stringify(await call("POST", "/code-tests/run", { seldon_yaml: yaml, lineage_key: "unslop", run_name: arg ?? "unslop run" }), null, 1));
else if (cmd === "status") { const r = await call("GET", `/experiments/${arg}/progress`); console.log(JSON.stringify(r.json, null, 1).slice(0, 3000)); }
else if (cmd === "report") { const r = await call("GET", `/experiments/${arg}/qa-report`); console.log(JSON.stringify(r.json, null, 1).slice(0, 20000)); }
else if (cmd === "summary") { const r = await call("GET", `/experiments/${arg}/summary`); console.log(JSON.stringify(r.json, null, 1).slice(0, 12000)); }
else if (cmd === "wait") { for (let i = 0; i < 80; i++) { const r = await call("GET", `/experiments/${arg}`); const st = r.json?.status ?? r.json?.experiment?.status; if (i % 4 === 0) console.log(new Date().toLocaleTimeString(), st); if (/complet|fail|cancel|timeout/i.test(String(st))) { console.log("final", st); break; } await new Promise((res) => setTimeout(res, 30000)); } }
else console.log("usage: validate | run [name] | status|wait|report|summary <id>");
