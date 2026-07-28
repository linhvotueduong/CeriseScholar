import { buildExperimentRunnerPackage, experimentRunnerFilename } from "./experimentRunnerPackage";
import { collectExperimentVariables } from "./experimentStudio";
import type { ExperimentRelease } from "./experimentRelease";

export interface ExperimentCollectorPackage {
  filename: string;
  source: string;
  mimeType: "text/javascript;charset=utf-8";
}

interface ExperimentCollectorPackageOptions {
  executionMode?: "pilot" | "production";
}

function sourceString(value: string): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

function collectorFilename(title: string, releaseNumber: number): string {
  return experimentRunnerFilename(`${title}-release-${releaseNumber}-collector`).replace(/\.html$/i, ".mjs");
}

export function buildExperimentCollectorPackage(
  release: ExperimentRelease,
  options: ExperimentCollectorPackageOptions = {},
): ExperimentCollectorPackage {
  const executionMode = options.executionMode ?? "pilot";
  const runner = buildExperimentRunnerPackage(release.studio, {
    release,
    executionMode,
    collectorCheckpointEndpoint: "/api/checkpoints",
  });
  const variables = collectExperimentVariables(release.studio);
  const releaseJson = JSON.stringify(release);
  const codebookJson = JSON.stringify({
    releaseId: release.releaseId,
    releaseNumber: release.releaseNumber,
    releaseChecksum: release.checksum,
    timingClaim: "browser-measured",
    timingDiagnostic: release.manifest.timingDiagnostic,
    variables,
    trialTables: release.studio.trialTables.map((table) => ({
      id: table.id,
      name: table.name,
      sourceFilename: table.sourceFilename,
      sourceChecksum: table.sourceChecksum,
      columns: table.columns,
      rowCount: table.rows.length,
    })),
    trialFields: [
      "order_index",
      "table_id",
      "loop_block_id",
      "trial_id",
      "source_row",
      "repetition",
      "practice",
      "response",
      "correct_answer",
      "correct",
      "reaction_time_ms",
      "deadline_ms",
      "deadline_exceeded",
      "completion_reason",
    ],
  });
  const source = `#!/usr/bin/env node
"use strict";
import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";

const RUNNER_HTML=${sourceString(runner.html)};
const RELEASE=JSON.parse(${sourceString(releaseJson)});
const CODEBOOK=JSON.parse(${sourceString(codebookJson)});
const MAX_BODY_BYTES=4*1024*1024;
const useLan=process.argv.includes("--lan");
const requestedPort=Number((process.argv.find((value)=>value.startsWith("--port="))||"").split("=")[1]||0);
const host=useLan?"0.0.0.0":"127.0.0.1";
const adminToken=randomBytes(24).toString("hex");
const dataDirectory=join(process.cwd(),"cerise-collector-release-${release.releaseNumber}");
mkdirSync(dataDirectory,{recursive:true});
const database=new DatabaseSync(join(dataDirectory,"responses.sqlite"));
database.exec(\`PRAGMA journal_mode=WAL;
PRAGMA synchronous=FULL;
PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS checkpoints (
  idempotency_key TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  release_id TEXT NOT NULL,
  release_checksum TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  recorded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS checkpoints_session_idx ON checkpoints(session_id, recorded_at);
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  checkpoint_sequence INTEGER NOT NULL DEFAULT 0,
  release_id TEXT NOT NULL,
  release_number INTEGER NOT NULL,
  release_checksum TEXT NOT NULL,
  execution_mode TEXT NOT NULL,
  condition_id TEXT NOT NULL,
  condition_name TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  payload_json TEXT NOT NULL
);\`);
const sessionColumns=database.prepare("PRAGMA table_info(sessions)").all();
if(!sessionColumns.some((column)=>String(column.name)==="checkpoint_sequence")){database.exec("ALTER TABLE sessions ADD COLUMN checkpoint_sequence INTEGER NOT NULL DEFAULT 0");}
const insertCheckpoint=database.prepare("INSERT OR IGNORE INTO checkpoints (idempotency_key,session_id,release_id,release_checksum,status,payload_json,recorded_at) VALUES (?,?,?,?,?,?,?)");
const deleteSessionCheckpoints=database.prepare("DELETE FROM checkpoints WHERE session_id=?");
const upsertSession=database.prepare("INSERT INTO sessions (session_id,checkpoint_sequence,release_id,release_number,release_checksum,execution_mode,condition_id,condition_name,status,started_at,updated_at,payload_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(session_id) DO UPDATE SET checkpoint_sequence=excluded.checkpoint_sequence,status=excluded.status,updated_at=excluded.updated_at,payload_json=excluded.payload_json WHERE excluded.checkpoint_sequence>=sessions.checkpoint_sequence");
let paused=false;

function text(response,status,contentType,body,headers={}){response.writeHead(status,{"Content-Type":contentType,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Frame-Options":"DENY","Referrer-Policy":"no-referrer","Permissions-Policy":"camera=(), microphone=(), geolocation=()",...headers});response.end(body);}
function json(response,status,body){text(response,status,"application/json;charset=utf-8",JSON.stringify(body));}
function readBody(request){return new Promise((resolve,reject)=>{let size=0;const chunks=[];request.on("data",(chunk)=>{size+=chunk.length;if(size>MAX_BODY_BYTES){reject(new Error("too-large"));request.destroy();return;}chunks.push(chunk);});request.on("end",()=>resolve(Buffer.concat(chunks).toString("utf8")));request.on("error",reject);});}
function validCheckpoint(value){return value&&typeof value==="object"&&typeof value.idempotencyKey==="string"&&value.idempotencyKey.length<=200&&typeof value.sessionId==="string"&&value.sessionId.length<=100&&Number.isInteger(value.checkpointSequence)&&value.checkpointSequence>0&&value.checkpointSequence<=10000000&&value.releaseId===RELEASE.releaseId&&value.releaseChecksum===RELEASE.checksum&&["started","completed","withdrawn"].includes(value.status)&&value.condition&&typeof value.condition.id==="string";}
function saveCheckpoint(value){const payload=JSON.stringify(value);database.exec("BEGIN IMMEDIATE");try{if(value.status==="withdrawn"){deleteSessionCheckpoints.run(value.sessionId);}const result=insertCheckpoint.run(value.idempotencyKey,value.sessionId,value.releaseId,value.releaseChecksum,value.status,payload,new Date().toISOString());if(Number(result.changes)>0){upsertSession.run(value.sessionId,value.checkpointSequence,value.releaseId,Number(value.releaseNumber)||0,value.releaseChecksum,String(value.executionMode||"pilot"),String(value.condition.id||""),String(value.condition.name||""),value.status,String(value.startedAt||new Date().toISOString()),String(value.updatedAt||new Date().toISOString()),payload);}database.exec("COMMIT");return Number(result.changes)>0;}catch(error){database.exec("ROLLBACK");throw error;}}
function csvCell(value){let output=value===null||value===undefined?"":String(value);if(/^[\\t\\r\\n ]*[=+\\-@]/.test(output)){output="'"+output;}return "\\\""+output.replaceAll("\\\"","\\\"\\\"")+"\\\"";}
function sessions(){return database.prepare("SELECT payload_json FROM sessions ORDER BY started_at ASC").all().flatMap((row)=>{try{return[JSON.parse(String(row.payload_json))];}catch{return[];}});}
function responseValues(record){const values={};for(const block of RELEASE.studio.blocks){if(block.variableName){values[block.variableName]=record.responses&&record.responses[block.id]!==undefined?record.responses[block.id]:null;}}return values;}
function exportCsv(){const records=sessions(),names=["release_id","release_number","release_checksum","execution_mode","session_id","status","condition_id","condition_name","started_at","updated_at",...CODEBOOK.variables.map((item)=>item.name)];const lines=[names.map(csvCell).join(",")];for(const record of records){const values=responseValues(record);lines.push([record.releaseId,record.releaseNumber,record.releaseChecksum,record.executionMode,record.sessionId,record.status,record.condition&&record.condition.id,record.condition&&record.condition.name,record.startedAt,record.updatedAt,...CODEBOOK.variables.map((item)=>values[item.name])].map(csvCell).join(","));}return lines.join("\\r\\n")+"\\r\\n";}
function trialSource(trial){const table=(RELEASE.studio.trialTables||[]).find((candidate)=>candidate.id===trial.tableId);if(!table||!Array.isArray(table.rows[trial.sourceRowIndex])){return{};}return Object.fromEntries(table.columns.map((column,index)=>[column,String(table.rows[trial.sourceRowIndex][index]??"")]));}
function exportTrialsCsv(){const sourceColumns=[];for(const table of RELEASE.studio.trialTables||[]){for(const column of table.columns||[]){if(!sourceColumns.includes(column)){sourceColumns.push(column);}}}const names=["release_id","release_number","release_checksum","execution_mode","session_id","status","condition_id","condition_name","order_index","table_id","loop_block_id","trial_id","source_row","repetition","practice","response","correct_answer","correct","reaction_time_ms","deadline_ms","deadline_exceeded","completion_reason",...sourceColumns.map((column)=>"source_"+column)],lines=[names.map(csvCell).join(",")];for(const record of sessions()){for(const trial of Array.isArray(record.trials)?record.trials:[]){const source=trialSource(trial);lines.push([record.releaseId,record.releaseNumber,record.releaseChecksum,record.executionMode,record.sessionId,record.status,record.condition&&record.condition.id,record.condition&&record.condition.name,trial.orderIndex,trial.tableId,trial.loopBlockId,trial.trialId,Number(trial.sourceRowIndex)+1,trial.repetition,trial.practice,trial.response,trial.correctAnswer,trial.correct,trial.reactionTimeMs,trial.deadlineMs,trial.deadlineExceeded,trial.completionReason,...sourceColumns.map((column)=>source[column]||"")].map(csvCell).join(","));}}return lines.join("\\r\\n")+"\\r\\n";}
function publicAddress(port){if(!useLan){return"http://127.0.0.1:"+port;}for(const group of Object.values(networkInterfaces())){for(const item of group||[]){if(item.family==="IPv4"&&!item.internal){return"http://"+item.address+":"+port;}}}return"http://127.0.0.1:"+port;}
function html(value){return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");}
function adminHtml(base){const counts=database.prepare("SELECT status,COUNT(*) AS count FROM sessions GROUP BY status").all();const rows=counts.map((row)=>\`<li><span>\${html(row.status)}</span><strong>\${html(row.count)}</strong></li>\`).join("");const trialExport=CODEBOOK.trialTables.length?'<a href="trials.csv">Trials CSV</a>':"";return\`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cerise Local Collector</title><style>:root{color-scheme:light;--ink:#17130f;--muted:#6d6963;--border:#dedbd5;--paper:#fff;--blue:#eef6fb;--gold:#a87f4f;--green:#166534;font-family:Arial,Helvetica,sans-serif}*{box-sizing:border-box}body{background:var(--blue);color:var(--ink);margin:0;min-height:100vh}.shell{margin:0 auto;max-width:960px;padding:42px 24px 72px}.brand{margin-bottom:24px}.eyebrow{color:var(--gold);font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.brand h1{font-family:Georgia,serif;font-size:38px;margin:8px 0}.brand p{color:var(--muted);margin:0}.card{background:var(--paper);border:1px solid var(--border);border-radius:12px;box-shadow:0 18px 48px rgba(42,36,30,.07);padding:28px}.summary{align-items:flex-start;display:flex;gap:20px;justify-content:space-between}.status{background:#edf9f0;border:1px solid #c9ead1;border-radius:999px;color:var(--green);font-size:12px;font-weight:800;padding:8px 11px;white-space:nowrap}.label{color:var(--muted);font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.participant{background:#f8f6f2;border:1px solid var(--border);border-radius:9px;margin:24px 0;padding:18px}.participant a{color:var(--ink);display:block;font-size:18px;font-weight:800;margin-top:7px;overflow-wrap:anywhere}.counts{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));list-style:none;margin:0 0 24px;padding:0}.counts li{border:1px solid var(--border);border-radius:8px;display:flex;justify-content:space-between;padding:15px}.counts span{text-transform:capitalize}.exports{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin:0 0 24px}.exports a,.pause{align-items:center;background:#fff;border:1px solid #bdb8b0;border-radius:7px;color:var(--ink);display:flex;font-size:13px;font-weight:800;justify-content:center;min-height:44px;padding:0 13px;text-decoration:none}.exports a:hover,.pause:hover{border-color:var(--gold)}form{margin:0}.pause{cursor:pointer}.privacy{background:#fff8df;border:1px solid #ecdca4;border-radius:8px;line-height:1.55;margin:24px 0 0;padding:16px}.privacy code,.checksum{background:#f1efeb;border-radius:4px;font:12px ui-monospace,SFMono-Regular,Menlo,monospace;padding:3px 6px;overflow-wrap:anywhere}.timing{color:var(--muted);font-size:12px;margin-top:8px}@media(max-width:620px){.shell{padding:24px 12px 48px}.brand h1{font-size:31px}.card{padding:20px}.summary{display:block}.status{display:inline-block;margin-top:14px}}</style></head><body><main class="shell"><header class="brand"><span class="eyebrow">Local Pilot Collector</span><h1>Cerise Scholar</h1><p>Researcher dashboard for a frozen, locally stored study release.</p></header><section class="card"><div class="summary"><div><div class="label">Frozen release</div><h2>Release v\${html(RELEASE.releaseNumber)}</h2><div class="checksum">\${html(RELEASE.checksum)}</div><div class="timing">Browser-measured timing · participant data stays on this computer</div></div><span class="status">\${paused?"Collection paused":"Collection active"}</span></div><div class="participant"><div class="label">Participant URL</div><a href="\${html(base)}">\${html(base)}</a></div><ul class="counts">\${rows||"<li><span>No sessions yet</span><strong>0</strong></li>"}</ul><div class="label">Research exports</div><nav class="exports" aria-label="Research exports"><a href="responses.csv">Responses CSV</a>\${trialExport}<a href="responses.json">Responses JSON</a><a href="codebook.json">Codebook</a><a href="release.json">Frozen release</a><a href="README.txt">README</a></nav><form method="post" action="pause"><button class="pause">\${paused?"Resume collection":"Pause collection"}</button></form><p class="privacy"><strong>Local data boundary.</strong> Participant data exists only in <code>\${html(dataDirectory)}</code>. Back up this folder according to your approved research-data plan.</p></section></main></body></html>\`;}
function readme(base){const diagnostic=CODEBOOK.timingDiagnostic?\`\\nRepresentative-device diagnostic: \${CODEBOOK.timingDiagnostic.status}\\nDiagnostic ID: \${CODEBOOK.timingDiagnostic.diagnosticId}\\nDiagnostic engine: \${CODEBOOK.timingDiagnostic.engineVersion}\\n\`:"\\nRepresentative-device diagnostic: not recorded\\n";return \`Cerise Scholar Local Pilot Collector\\n\\nRelease: v\${RELEASE.releaseNumber}\\nRelease ID: \${RELEASE.releaseId}\\nChecksum: \${RELEASE.checksum}\\nExecution mode: ${executionMode}\\nTiming claim: browser-measured\${diagnostic}\\nParticipant URL: \${base}\\n\\nData stays in the local responses.sqlite database. No participant response is sent to Cerise Scholar, Supabase, Azure, or OpenRouter. Trial order and trial-level browser timing are available in trials.csv when the release includes a trial table. The timing diagnostic is an engineering stability check, not physical-onset measurement or certified millisecond precision. Pilot rows remain tagged and should be excluded from production analysis.\\n\`;}

const server=createServer(async(request,response)=>{try{const url=new URL(request.url||"/","http://localhost");if(request.method==="GET"&&url.pathname==="/favicon.ico"){response.writeHead(204,{"Cache-Control":"public, max-age=86400"});response.end();return;}if(request.method==="GET"&&url.pathname==="/"){if(paused){text(response,503,"text/plain;charset=utf-8","This local study is temporarily paused.");return;}text(response,200,"text/html;charset=utf-8",RUNNER_HTML);return;}if(request.method==="POST"&&url.pathname==="/api/checkpoints"){if(paused){json(response,503,{saved:false,error:"paused"});return;}const origin=String(request.headers.origin||"");const expectedOrigin="http://"+String(request.headers.host||"");if(origin&&origin!==expectedOrigin){json(response,403,{saved:false,error:"origin"});return;}if(!String(request.headers["content-type"]||"").startsWith("application/json")){json(response,415,{saved:false});return;}const value=JSON.parse(await readBody(request));if(!validCheckpoint(value)){json(response,400,{saved:false});return;}const inserted=saveCheckpoint(value);json(response,200,{saved:true,duplicate:!inserted});return;}const adminPrefix="/admin/"+adminToken;if(url.pathname===adminPrefix||url.pathname===adminPrefix+"/"){text(response,200,"text/html;charset=utf-8",adminHtml(publicAddress(server.address().port)),{"Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"});return;}if(!url.pathname.startsWith(adminPrefix+"/")){text(response,404,"text/plain;charset=utf-8","Not found");return;}const asset=url.pathname.slice((adminPrefix+"/").length);if(request.method==="POST"&&asset==="pause"){paused=!paused;response.writeHead(303,{Location:adminPrefix});response.end();return;}if(request.method!=="GET"){text(response,405,"text/plain;charset=utf-8","Method not allowed");return;}if(asset==="responses.csv"){text(response,200,"text/csv;charset=utf-8",exportCsv(),{"Content-Disposition":"attachment; filename=cerise-responses-v${release.releaseNumber}.csv"});return;}if(asset==="trials.csv"){text(response,200,"text/csv;charset=utf-8",exportTrialsCsv(),{"Content-Disposition":"attachment; filename=cerise-trials-v${release.releaseNumber}.csv"});return;}if(asset==="responses.json"){json(response,200,{releaseId:RELEASE.releaseId,releaseChecksum:RELEASE.checksum,exportedAt:new Date().toISOString(),sessions:sessions()});return;}if(asset==="codebook.json"){json(response,200,CODEBOOK);return;}if(asset==="release.json"){json(response,200,RELEASE);return;}if(asset==="README.txt"){text(response,200,"text/plain;charset=utf-8",readme(publicAddress(server.address().port)));return;}text(response,404,"text/plain;charset=utf-8","Not found");}catch(error){json(response,error&&error.message==="too-large"?413:500,{error:"Local collector request failed."});}});

server.listen(Number.isInteger(requestedPort)&&requestedPort>=0&&requestedPort<=65535?requestedPort:0,host,()=>{const address=server.address(),port=typeof address==="object"&&address?address.port:requestedPort,participant=publicAddress(port),admin="http://127.0.0.1:"+port+"/admin/"+adminToken;console.log("\\nCerise Scholar Local Pilot Collector");console.log("Participant URL: "+participant);console.log("Researcher dashboard: "+admin);console.log("Data folder: "+dataDirectory);console.log(useLan?"LAN mode is active. Allow the Node process through your firewall only for the trusted research network.":"This-computer-only mode is active. Use --lan to allow trusted devices on the same network.");console.log("Press Ctrl+C to close collection.\\n");});
function close(){try{database.close();}finally{process.exit(0);}}process.on("SIGINT",close);process.on("SIGTERM",close);
`;

  return {
    filename: collectorFilename(release.studio.title, release.releaseNumber),
    source,
    mimeType: "text/javascript;charset=utf-8",
  };
}
