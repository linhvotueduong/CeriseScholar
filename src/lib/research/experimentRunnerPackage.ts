import {
  validateExperimentStudio,
  type ExperimentStudioDocument,
} from "./experimentStudio";
import type { ExperimentRelease } from "./experimentRelease";
import {
  consentRuntimeArtifactMatchesReference,
  participantConsentCopy,
  type ConsentRuntimeArtifact,
} from "./consentRuntime";

export const EXPERIMENT_RUNNER_PACKAGE_VERSION = 6 as const;

export type ExperimentPackageCheckStatus = "pass" | "warning" | "fail";

export interface ExperimentPackageCheck {
  id: string;
  label: string;
  detail: string;
  status: ExperimentPackageCheckStatus;
}

export interface ExperimentRunnerPackage {
  filename: string;
  html: string;
  mimeType: "text/html;charset=utf-8";
}

interface ExperimentRunnerPackageOptions {
  filename?: string;
  nonce?: string;
  release?: ExperimentRelease;
  executionMode?: "pilot" | "production";
  collectorCheckpointEndpoint?: string;
  collectorAudioEndpoint?: string;
  collectorVideoEndpoint?: string;
  consentRuntimeArtifact?: ConsentRuntimeArtifact;
}

function escapeHtmlText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function serializeForHtmlScript(value: unknown): string {
  return JSON.stringify(value)
    .replaceAll("&", "\\u0026")
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

function createNonce(): string {
  const bytes = new Uint8Array(18);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`.replace(/[^a-z0-9]/g, "");
}

function normalizeNonce(value?: string): string {
  const normalized = value?.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 80) ?? "";
  return normalized.length >= 16 ? normalized : createNonce();
}

export function experimentRunnerFilename(title: string): string {
  const stem = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .replace(/-+$/g, "");
  return `${stem || "cerise-study"}.html`;
}

export function normalizeExperimentRunnerFilename(value: string, fallbackTitle: string): string {
  const withoutExtension = value.replace(/\.html?$/i, "");
  return experimentRunnerFilename(withoutExtension || fallbackTitle);
}

export function escapeExperimentCsvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[\t\r\n ]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function collectExperimentPackageChecks(
  document: ExperimentStudioDocument,
): ExperimentPackageCheck[] {
  const errors = validateExperimentStudio(document).filter((issue) => issue.severity === "error");
  const hasConsent = document.blocks.some((block) => block.type === "consent" || block.type === "consent-form");
  const hasDebrief = document.blocks.some((block) => block.type === "debrief");
  const hasAudioResponse = document.blocks.some((block) => block.type === "audio-response");
  const hasVideoResponse = document.blocks.some((block) => block.type === "video-response");
  const hasBrowserTimedTask = document.blocks.some((block) => (
    block.responseType === "keyboard"
    || block.responseDeadlineMs > 0
    || block.displayDurationMs > 0
    || block.type === "trial-loop"
  ));
  return [
    {
      id: "valid-specification",
      label: "Study specification valid",
      detail: errors.length === 0 ? "No blocking study errors" : `${errors.length} blocking error${errors.length === 1 ? "" : "s"}`,
      status: errors.length === 0 ? "pass" : "fail",
    },
    {
      id: "consent-screen",
      label: "Consent screen included",
      detail: hasConsent ? "A participation decision is collected" : "Review whether approved consent is required",
      status: hasConsent ? "pass" : "warning",
    },
    {
      id: "debrief-screen",
      label: "Debrief screen included",
      detail: hasDebrief ? "Participants receive a closing screen" : "Add the approved debrief before collection",
      status: hasDebrief ? "pass" : "warning",
    },
    {
      id: "no-network",
      label: "No network requests",
      detail: "The runner contains no remote scripts, analytics, or upload path",
      status: "pass",
    },
    {
      id: "local-responses",
      label: "Responses stay local",
      detail: "Portable recovery uses local IndexedDB; the collector uses local SQLite",
      status: "pass",
    },
    {
      id: "browser-timing",
      label: "Browser timing is an estimate",
      detail: "Not certified laboratory hardware timing",
      status: "warning",
    },
    ...(hasAudioResponse ? [{
      id: "audio-local-host",
      label: "Audio requires the same-Mac Local Research Host",
      detail: "Portable HTML and Trusted-LAN execution cannot collect microphone responses",
      status: "warning",
    } satisfies ExperimentPackageCheck] : []),
    ...(hasVideoResponse ? [{
      id: "video-local-host",
      label: "Video requires the same-Mac Local Research Host",
      detail: "Portable HTML and Trusted-LAN execution cannot collect camera responses",
      status: "warning",
    } satisfies ExperimentPackageCheck] : []),
    ...(hasBrowserTimedTask ? [{
      id: "timing-diagnostic",
      label: "Representative-device diagnostic",
      detail: document.timingDiagnostic
        ? `${document.timingDiagnostic.status} · ${document.timingDiagnostic.recordedAt}`
        : "No local browser diagnostic is attached to this draft",
      status: document.timingDiagnostic?.status === "stable" ? "pass" : "warning",
    } satisfies ExperimentPackageCheck] : []),
  ];
}

export function canBuildExperimentRunnerPackage(
  document: ExperimentStudioDocument,
  consentRuntimeArtifact?: ConsentRuntimeArtifact,
): boolean {
  const semanticConsent = document.blocks.find((block) => block.type === "consent-form");
  return document.blocks.length > 0
    && !validateExperimentStudio(document).some((issue) => issue.severity === "error")
    && (!semanticConsent || consentRuntimeArtifactMatchesReference(consentRuntimeArtifact, semanticConsent.consentForm));
}

const RUNNER_STYLE = `
:root{color-scheme:light;--ink:#17130f;--muted:#6d6963;--border:#dedbd5;--gold:#a87f4f;--blue:#eef6fb;--danger:#a72a25;--rose:#8f123f;font-family:Arial,Helvetica,sans-serif}*{box-sizing:border-box}body{background:var(--blue);color:var(--ink);margin:0;min-height:100vh}.runner{display:grid;grid-template-rows:58px minmax(0,1fr);min-height:100vh}.runner-header{align-items:center;background:#fff;border-bottom:1px solid var(--border);display:flex;gap:16px;justify-content:space-between;padding:0 24px}.runner-header strong{font-family:Georgia,serif;font-size:20px}.runner-header span{color:var(--muted);font-size:12px}.withdraw-study{background:transparent;border:0;color:var(--danger);cursor:pointer;font-size:12px;font-weight:700;text-decoration:underline}.screen-shell{align-items:center;display:flex;justify-content:center;padding:34px 20px}.screen{background:#fff;border:1px solid var(--border);border-radius:10px;box-shadow:0 12px 34px rgba(42,36,30,.06);max-width:760px;min-height:460px;padding:52px 58px;width:100%}.screen.consent-screen{max-width:920px;padding:42px 50px}.progress{color:var(--muted);font-size:11px;margin-bottom:34px;text-transform:uppercase}.screen h1{font-family:Georgia,serif;font-size:32px;line-height:1.2;margin:0 0 18px}.consent-intro{color:var(--muted);font-size:15px;line-height:1.6;margin:0 0 24px}.consent-tools{align-items:center;border-bottom:1px solid var(--border);display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;margin-bottom:8px;padding-bottom:20px}.consent-tools code{color:var(--muted);font-size:10px;overflow-wrap:anywhere}.consent-section{border-bottom:1px solid #eeeae4;padding:24px 0}.consent-section h2{font-family:Georgia,serif;font-size:22px;margin:0 0 10px}.consent-section p,.consent-question p,.decision-copy{font-size:15px;line-height:1.7;margin:0;white-space:pre-wrap}.consent-question{background:#f8f6f2;border:1px solid var(--border);margin:22px 0;padding:16px}.consent-question summary{cursor:pointer;font-weight:700}.consent-question p{margin-top:12px}.consent-decisions{border-top:2px solid var(--ink);margin-top:30px;padding-top:26px}.consent-decision{border:1px solid var(--border);margin:14px 0;padding:18px}.consent-decision h2{font-family:Georgia,serif;font-size:20px;margin:0 0 8px}.decision-note{color:var(--muted);display:block;font-size:12px;margin:8px 0 14px}.consent-confirm{background:#f8f6f2;border:1px solid var(--border);margin:24px 0;padding:20px}.consent-confirm dl{display:grid;gap:10px;margin:0}.consent-confirm div{display:grid;gap:4px}.consent-confirm dt{color:var(--muted);font-size:11px;text-transform:uppercase}.consent-confirm dd{font-weight:700;margin:0}.consent-error{color:var(--danger);font-size:13px;font-weight:700}.stimulus-media{border:1px solid var(--border);border-radius:8px;display:block;height:auto;margin:0 0 24px;max-height:440px;object-fit:contain;width:100%}.prompt{font-size:16px;line-height:1.65;margin:0 0 30px;white-space:pre-wrap}.response{border:0;display:grid;gap:12px;margin:0;padding:0}.response legend{font-size:13px;font-weight:700;margin-bottom:10px}.choice{align-items:center;border:1px solid var(--border);border-radius:7px;cursor:pointer;display:flex;gap:11px;padding:12px 14px}.choice:focus-within{border-color:var(--gold);box-shadow:0 0 0 2px rgba(168,127,79,.14)}.scale{display:flex;flex-wrap:wrap;gap:10px}.scale .choice{display:grid;min-width:54px;text-align:center}.scale-labels{color:var(--muted);display:flex;font-size:11px;justify-content:space-between;margin-bottom:9px}.keyboard-response,.audio-response,.video-response{background:#f8f6f2;border:1px solid var(--border);border-radius:7px;display:grid;gap:10px;padding:18px}.keyboard-response{text-align:center}.keyboard-response span,.audio-response span,.audio-response small,.video-response span,.video-response small{color:var(--muted);font-size:12px}.audio-status{align-items:center;display:flex;gap:9px}.recording-dot{background:#b3261e;border-radius:50%;height:10px;width:10px}.audio-actions{display:flex;flex-wrap:wrap;gap:9px}.video-preview{background:#17130f;border:1px solid var(--border);border-radius:7px;display:none;max-height:360px;object-fit:contain;width:100%}.video-preview.visible{display:block}.text-response{border:1px solid var(--border);border-radius:7px;font:inherit;min-height:130px;padding:13px;resize:vertical;width:100%}.navigation{align-items:center;border-top:1px solid var(--border);display:flex;gap:12px;justify-content:space-between;margin-top:40px;padding-top:20px}.button{align-items:center;background:#fff;border:1px solid #bdb8b0;border-radius:7px;color:var(--ink);cursor:pointer;display:inline-flex;font-size:13px;font-weight:700;justify-content:center;min-height:40px;padding:0 17px}.button.primary{background:#231a10;border-color:#231a10;color:#fff}.button:disabled{cursor:not-allowed;opacity:.42}.timing{color:var(--muted);font-size:11px}.completion{align-items:flex-start;display:flex;flex-direction:column;gap:14px}.completion h1,.completion p{margin:0}.downloads{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}.privacy-note{background:#f8f6f2;border:1px solid var(--border);font-size:12px;line-height:1.5;padding:13px}.ended{color:var(--danger)}@media(max-width:620px){.runner-header{padding:0 14px}.runner-header strong{font-size:17px}.screen-shell{padding:12px}.screen,.screen.consent-screen{min-height:calc(100vh - 82px);padding:28px 20px}.screen h1{font-size:26px}.navigation{align-items:stretch;flex-direction:column}.navigation .button{width:100%}.runner-header span{display:none}.consent-tools{align-items:flex-start;flex-direction:column}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
`;

const RUNNER_SCRIPT = `
(function(){
  "use strict";
  var specNode=document.getElementById("study-spec");
  var root=document.getElementById("study-root");
  if(!specNode||!root){return;}
  var spec;
  try{spec=JSON.parse(specNode.textContent||"{}");}catch(error){showFatal("The study package could not be read.");return;}
  if(!Array.isArray(spec.blocks)||spec.blocks.length===0){showFatal("This study package has no participant screens.");return;}
  var release=spec.releaseMetadata||{};
  var consentArtifact=spec.consentRuntimeArtifact||null,structuredConsentBlock=spec.blocks.find(function(block){return block&&block.type==="consent-form";})||null;
  var hasStructuredConsent=Boolean(structuredConsentBlock),consentReceipt=null,consentPresentedAt="",consentSelections=Object.create(null),consentConfirming=false;
  var responses=Object.create(null),audioResponses=Object.create(null),videoResponses=Object.create(null),timings=[],history=[],events=[];
  var screenStartedAt=performance.now(),studyStartedAt=hasStructuredConsent?"":new Date().toISOString(),timerIds=[],activeKeyHandler=null;
  var activeRecorder=null,activeAudioStream=null,activeVideoStream=null;
  var sessionId=createSessionId(),condition=hasStructuredConsent?{id:"pending-consent",name:""}:assignCondition(sessionId),runtimeBlocks=hasStructuredConsent?spec.blocks.map(function(block){return Object.assign({},block);}):materializeBlocks(sessionId,condition),dirty=false,resultDownloaded=false,saveTimer=0,checkpointSequence=0;
  var visitCount=0,maxVisits=runtimeBlocks.length*4+25,currentIndex=0;
  var recoveryKey="release:"+String(release.checksum||spec.projectId||spec.title);
  var withdrawButton=document.getElementById("withdraw-study");
  if(runtimeBlocks.length===0){showFatal("This study package has no runnable participant screens.");return;}

  function createSessionId(){if(globalThis.crypto&&typeof globalThis.crypto.randomUUID==="function"){return globalThis.crypto.randomUUID();}return"local-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);}
  function element(tag,className,text){var node=document.createElement(tag);if(className){node.className=className;}if(text!==undefined){node.textContent=text;}return node;}
  function canonical(value){if(value===null||typeof value!=="object"){return JSON.stringify(value);}if(Array.isArray(value)){return"["+value.map(canonical).join(",")+"]";}return"{"+Object.keys(value).sort().map(function(key){return JSON.stringify(key)+":"+canonical(value[key]);}).join(",")+"}";}
  function sha256(value){if(!globalThis.crypto||!globalThis.crypto.subtle){return Promise.reject(new Error("checksum unavailable"));}return globalThis.crypto.subtle.digest("SHA-256",new TextEncoder().encode(canonical(value))).then(function(digest){return"sha256:"+Array.from(new Uint8Array(digest),function(byte){return byte.toString(16).padStart(2,"0");}).join("");});}
  function consentArtifactCore(){var core=Object.assign({},consentArtifact);delete core.artifactChecksum;return core;}
  function consentFormCore(){var core=Object.assign({},consentArtifact&&consentArtifact.form);delete core.checksum;return core;}
  function verifyEmbeddedConsent(){if(!hasStructuredConsent){return Promise.resolve(true);}var reference=structuredConsentBlock&&structuredConsentBlock.consentForm;if(!consentArtifact||!reference||spec.blocks[0]!==structuredConsentBlock||consentArtifact.artifactVersion!==1||consentArtifact.form.audience!=="adult-participant"||consentArtifact.form.language!=="en-US"||!Array.isArray(consentArtifact.decisions)||consentArtifact.decisions[0].id!=="main-participation"||!Array.isArray(reference.decisionIds)){return Promise.resolve(false);}if(consentArtifact.protocolId!==reference.consentProtocolId||consentArtifact.protocolChecksum!==reference.consentProtocolChecksum||consentArtifact.artifactChecksum!==reference.consentArtifactChecksum||consentArtifact.form.id!==reference.formId||consentArtifact.form.checksum!==reference.formChecksum||consentArtifact.form.language!==reference.language||consentArtifact.form.audience!==reference.audience||consentArtifact.decisions.length!==reference.decisionIds.length||consentArtifact.decisions.some(function(decision,index){return decision.id!==reference.decisionIds[index];})){return Promise.resolve(false);}return Promise.all([sha256(consentFormCore()),sha256(consentArtifactCore())]).then(function(checksums){return checksums[0]===consentArtifact.form.checksum&&checksums[1]===consentArtifact.artifactChecksum;}).catch(function(){return false;});}
  function consentReceiptCore(receipt){var core=Object.assign({},receipt);delete core.receiptChecksum;return core;}
  function verifyConsentReceipt(receipt){if(!receipt||!consentArtifact||!["accepted","reconsented"].includes(receipt.decision)||receipt.artifactChecksum!==consentArtifact.artifactChecksum||receipt.formChecksum!==consentArtifact.form.checksum||receipt.protocolChecksum!==consentArtifact.protocolChecksum){return Promise.resolve(false);}return sha256(consentReceiptCore(receipt)).then(function(checksum){return checksum===receipt.receiptChecksum;}).catch(function(){return false;});}
  function optionalDecisionRows(){return Array.isArray(consentArtifact&&consentArtifact.decisions)?consentArtifact.decisions.slice(1):[];}
  function receiptDecision(){var main=consentSelections["main-participation"],requiredDeclined=optionalDecisionRows().some(function(decision){return decision.requirement==="required-for-main-study"&&consentSelections[decision.id]!=="accepted";});return{decision:main!=="accepted"||requiredDeclined?"refused":"accepted",basis:main!=="accepted"?"main-declined":requiredDeclined?"required-component-declined":"main-accepted"};}
  function createBrowserConsentReceipt(decision,decidedAt){var outcome=decision||receiptDecision(),recordSeparate=outcome.decision!=="withdrawn"&&outcome.basis!=="main-declined",optional=recordSeparate?optionalDecisionRows().map(function(item){return{decisionId:item.id,decision:consentSelections[item.id]};}).sort(function(left,right){return left.decisionId.localeCompare(right.decisionId);}):[],core={receiptVersion:1,sessionId:sessionId,releaseId:String(release.releaseId||"unreleased"),releaseChecksum:String(release.checksum||"unreleased"),executionMode:String(spec.executionMode||"pilot"),protocolChecksum:consentArtifact.protocolChecksum,artifactChecksum:consentArtifact.artifactChecksum,formId:consentArtifact.form.id,formChecksum:consentArtifact.form.checksum,language:"en-US",decision:outcome.decision,decisionBasis:outcome.basis,optionalDecisions:optional,presentedAt:consentPresentedAt||decidedAt,decidedAt:decidedAt,priorReceiptChecksum:outcome.decision==="withdrawn"&&consentReceipt?consentReceipt.receiptChecksum:null,claim:"local-metadata-receipt-not-signature-identity-proof-or-approval"};return sha256(core).then(function(checksum){return Object.assign({},core,{receiptChecksum:checksum});});}
  function clearTimers(){timerIds.forEach(function(id){window.clearTimeout(id);window.clearInterval(id);});timerIds=[];if(activeKeyHandler){window.removeEventListener("keydown",activeKeyHandler);activeKeyHandler=null;}}
  function showFatal(message){root.replaceChildren();var shell=element("main","screen-shell"),card=element("section","screen completion");card.append(element("h1","ended","Study unavailable"),element("p","",message));shell.append(card);root.append(shell);}
  function hash(value){var output=2166136261;for(var index=0;index<value.length;index+=1){output^=value.charCodeAt(index);output=Math.imul(output,16777619);}return output>>>0;}
  function unit(seed){var value=seed+0x6d2b79f5;value=Math.imul(value^(value>>>15),value|1);value^=value+Math.imul(value^(value>>>7),value|61);return((value^(value>>>14))>>>0)/4294967296;}
  function shuffledChoices(block,choices){if(!block.randomizeChoices){return choices.slice();}var output=choices.slice(),seed=hash(sessionId+":"+block.id);for(var index=output.length-1;index>0;index-=1){var selected=Math.floor(unit(seed+index)*Number(index+1)),held=output[index];output[index]=output[selected];output[selected]=held;}return output;}
  function assignCondition(key){var conditions=Array.isArray(spec.conditions)&&spec.conditions.length?spec.conditions:[{id:"condition-all",name:"All participants",weight:1}];if(!spec.assignment||spec.assignment.method!=="random"||conditions.length<2){return conditions[0];}var total=conditions.reduce(function(sum,item){return sum+Math.max(1,Number(item.weight)||1);},0),cursor=unit(hash(String(spec.assignment.previewSeed||0)+":"+key))*total;for(var index=0;index<conditions.length;index+=1){cursor-=Math.max(1,Number(conditions[index].weight)||1);if(cursor<0){return conditions[index];}}return conditions[0];}
  function orderedRows(rows,order,seed){if(order==="fixed"||rows.length<2){return rows.slice();}if(order==="rotate"){var start=Math.floor(unit(seed)*rows.length);return rows.slice(start).concat(rows.slice(0,start));}var output=rows.slice();for(var index=output.length-1;index>0;index-=1){var selected=Math.floor(unit(seed+index)*(index+1)),held=output[index];output[index]=output[selected];output[selected]=held;}return output;}
  function rowRecord(table,row){var record=Object.create(null);table.columns.forEach(function(column,index){record[column]=String(row[index]===undefined?"":row[index]);});return record;}
  function trialFlag(value){return["1","true","yes","y","practice"].includes(String(value||"").trim().toLocaleLowerCase());}
  function trialKeys(value,fallback){var keys=String(value||"").split(/[|,;\\s]+/).map(function(key){return key.trim().toLocaleLowerCase();}).filter(Boolean);return keys.length?Array.from(new Set(keys)).slice(0,12):(Array.isArray(fallback)?fallback:[]);}
  function materializeBlocks(participantKey,assignedCondition){var output=[],tables=Array.isArray(spec.trialTables)?spec.trialTables:[];spec.blocks.forEach(function(block){var loop=block&&block.type==="trial-loop"?block.trialLoop:null,table=loop?tables.find(function(candidate){return candidate.id===loop.tableId;}):null;if(!loop||!table){output.push(Object.assign({},block));return;}var indexed=table.rows.map(function(row,sourceRowIndex){return{row:row,sourceRowIndex:sourceRowIndex};});if(loop.conditionColumn){indexed=indexed.filter(function(item){var record=rowRecord(table,item.row),value=String(record[loop.conditionColumn]||"").trim().toLocaleLowerCase();return!value||value===String(assignedCondition.id||"").toLocaleLowerCase()||value===String(assignedCondition.name||"").trim().toLocaleLowerCase();});}var orderIndex=0,repetitions=Math.max(1,Math.min(20,Number(loop.repetitions)||1));for(var repetition=1;repetition<=repetitions;repetition+=1){var seed=hash(String((spec.assignment&&spec.assignment.previewSeed)||0)+":"+participantKey+":"+block.id+":"+repetition),rows=orderedRows(indexed,String(loop.order||"shuffle"),seed);rows.forEach(function(item){var record=rowRecord(table,item.row),trialId=String(record[loop.trialIdColumn]||"").trim()||"row-"+String(item.sourceRowIndex+1),deadline=Number(record[loop.responseDeadlineColumn]),runtime=Object.assign({},block);runtime.id=block.id+"--"+repetition+"-"+String(item.sourceRowIndex+1);runtime.title=block.title+" · "+trialId;runtime.prompt=String(record[loop.stimulusColumn]===undefined?block.prompt:record[loop.stimulusColumn]);runtime.allowedKeys=loop.allowedKeysColumn?trialKeys(record[loop.allowedKeysColumn],block.allowedKeys):block.allowedKeys;runtime.correctAnswer=loop.correctAnswerColumn?String(record[loop.correctAnswerColumn]||"").trim().toLocaleLowerCase():block.correctAnswer;runtime.responseDeadlineMs=loop.responseDeadlineColumn&&Number.isInteger(deadline)?Math.max(0,Math.min(3600000,deadline)):block.responseDeadlineMs;runtime.practice=loop.practiceColumn?trialFlag(record[loop.practiceColumn]):block.practice;runtime.nextBlockId="";runtime.runtimeTrial={tableId:table.id,tableName:table.name,loopBlockId:block.id,sourceRowIndex:item.sourceRowIndex,trialId:trialId,repetition:repetition,orderIndex:orderIndex,stimulus:String(record[loop.stimulusColumn]||"")};orderIndex+=1;output.push(runtime);});}});return output;}
  function openRecovery(){return new Promise(function(resolve,reject){if(!globalThis.indexedDB){reject(new Error("unavailable"));return;}var request=indexedDB.open("cerise-runner-recovery-v1",1);request.onupgradeneeded=function(){var db=request.result;if(!db.objectStoreNames.contains("sessions")){db.createObjectStore("sessions");}};request.onsuccess=function(){resolve(request.result);};request.onerror=function(){reject(request.error);};});}
  function readRecovery(){return openRecovery().then(function(db){return new Promise(function(resolve){var request=db.transaction("sessions","readonly").objectStore("sessions").get(recoveryKey);request.onsuccess=function(){resolve(request.result||null);};request.onerror=function(){resolve(null);};});}).catch(function(){return null;});}
  function writeRecovery(record){return openRecovery().then(function(db){return new Promise(function(resolve){var request=db.transaction("sessions","readwrite").objectStore("sessions").put(record,recoveryKey);request.onsuccess=function(){resolve(true);};request.onerror=function(){resolve(false);};});}).catch(function(){return false;});}
  function deleteRecovery(){return openRecovery().then(function(db){return new Promise(function(resolve){var request=db.transaction("sessions","readwrite").objectStore("sessions").delete(recoveryKey);request.onsuccess=function(){resolve(true);};request.onerror=function(){resolve(false);};});}).catch(function(){return false;});}
  function transportCheckpoint(record){__CHECKPOINT_TRANSPORT__}
  function transportAudio(blob,metadata){__AUDIO_TRANSPORT__}
  function transportVideo(blob,metadata){__VIDEO_TRANSPORT__}
  function checkpoint(status){if(hasStructuredConsent&&!consentReceipt&&status!=="refused"){return null;}checkpointSequence+=1;var scrubbed=status==="withdrawn"||status==="refused",trials=scrubbed?[]:trialResults();var record={checkpointVersion:5,checkpointSequence:checkpointSequence,idempotencyKey:sessionId+":"+String(checkpointSequence),releaseId:String(release.releaseId||"unreleased"),releaseNumber:Number(release.releaseNumber)||0,releaseChecksum:String(release.checksum||"unreleased"),sessionId:sessionId,status:status,currentIndex:currentIndex,condition:scrubbed?{id:"consent-only",name:""}:condition,responses:scrubbed?{}:responses,audioResponses:scrubbed?{}:audioResponses,videoResponses:scrubbed?{}:videoResponses,timings:scrubbed?[]:timings,events:scrubbed?[]:events,history:scrubbed?[]:history,trials:trials,trialOrder:trials.map(function(trial){return trial.loopBlockId+":"+trial.trialId+":"+trial.repetition;}),consentReceipt:consentReceipt,startedAt:studyStartedAt||consentReceipt&&consentReceipt.decidedAt||new Date().toISOString(),updatedAt:new Date().toISOString(),executionMode:String(spec.executionMode||"pilot")};dirty=status!=="completed"&&status!=="withdrawn"&&status!=="refused";void writeRecovery(record);void transportCheckpoint(record);return record;}
  function scheduleCheckpoint(){dirty=true;if(saveTimer){window.clearTimeout(saveTimer);}saveTimer=window.setTimeout(function(){checkpoint("started");},120);}
  function recordEvent(type){if(hasStructuredConsent&&(!consentReceipt||!["accepted","reconsented"].includes(consentReceipt.decision))){return;}events.push({type:type,at:new Date().toISOString(),blockId:runtimeBlocks[currentIndex]?runtimeBlocks[currentIndex].id:"",screenIndex:currentIndex});if(events.length>500){events=events.slice(-500);}scheduleCheckpoint();}
  function ruleMatches(rule,response){var normalized=String(response===undefined?"":response).trim(),target=String(rule.value||"").trim();if(rule.operator==="answered"){return normalized.length>0;}if(rule.operator==="not-answered"){return normalized.length===0;}if(rule.operator==="equals"){return normalized===target;}if(rule.operator==="not-equals"){return normalized!==target;}var responseNumber=Number(normalized),ruleNumber=Number(target);if(!Number.isFinite(responseNumber)||!Number.isFinite(ruleNumber)){return false;}return rule.operator==="greater-than-or-equal"?responseNumber>=ruleNumber:responseNumber<=ruleNumber;}
  function nextIndex(block){if(block.runtimeTrial){return Math.min(runtimeBlocks.length,currentIndex+1);}if(block.responseType==="consent"&&responses[block.id]===block.choices[1]){return runtimeBlocks.length;}var rules=Array.isArray(spec.branchRules)?spec.branchRules:[],rule=rules.find(function(item){return item.sourceBlockId===block.id&&(!item.conditionId||item.conditionId===condition.id)&&ruleMatches(item,responses[block.id]);}),target=rule?rule.targetBlockId:block.nextBlockId;if(target==="__end__"){return runtimeBlocks.length;}if(target){var found=runtimeBlocks.findIndex(function(item){return item.id===target||(item.runtimeTrial&&item.runtimeTrial.loopBlockId===target);});return found>=0?found:runtimeBlocks.length;}return currentIndex+1;}
  function recordTiming(block,reason){var duration=Math.max(0,Math.round(performance.now()-screenStartedAt));timings.push({blockId:block.id,blockTitle:block.title,variableName:block.variableName||"",durationMs:duration,deadlineMs:Number(block.responseDeadlineMs)||0,deadlineExceeded:Number(block.responseDeadlineMs)>0&&duration>Number(block.responseDeadlineMs),completionReason:reason,recordedAt:new Date().toISOString()});}
  function setResponse(block,value,nextButton){responses[block.id]=value;if(nextButton){if(block.required){nextButton.disabled=!String(value).trim();}if(block.responseType==="consent"){nextButton.textContent=value===block.choices[1]?"End":"Next";}}scheduleCheckpoint();}
  function stopAudioTracks(){if(activeAudioStream){activeAudioStream.getTracks().forEach(function(track){track.stop();});activeAudioStream=null;}}
  function stopVideoTracks(){if(activeVideoStream){activeVideoStream.getTracks().forEach(function(track){track.stop();});activeVideoStream=null;}}
  function audioMimeType(){var candidates=["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg;codecs=opus"];for(var index=0;index<candidates.length;index+=1){if(typeof MediaRecorder.isTypeSupported!=="function"||MediaRecorder.isTypeSupported(candidates[index])){return candidates[index];}}return"";}
  function audioResponseControl(block,nextButton){
    var field=element("div","audio-response"),statusRow=element("div","audio-status"),status=element("strong","",responses[block.id]?"Recording saved locally":"Microphone check required"),detail=element("span",""),actions=element("div","audio-actions"),checkButton=element("button","button","Check microphone"),recordButton=element("button","button primary","Start recording"),stopButton=element("button","button","Stop recording"),dot=element("span","recording-dot");
    var settings=block.audio||{},maxDuration=Math.max(5,Math.min(300,Number(settings.maxDurationSeconds)||120)),maxBytes=Math.max(262144,Math.min(26214400,Number(settings.maxBytes)||10485760)),microphoneChecked=false,startedAt=0,totalBytes=0,chunkIndex=0,uploadQueue=Promise.resolve(true),uploadFailed=false,uploadId="",mimeType="",audioClock=0;
    function setStatus(text,subtext,recording){status.textContent=text;detail.textContent=subtext||"";statusRow.replaceChildren();if(recording){statusRow.append(dot);}statusRow.append(status);}
    function supported(){return Boolean(spec.audioCaptureEnabled&&spec.collectorMode&&window.isSecureContext&&navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&globalThis.MediaRecorder);}
    function consentAccepted(){var consent=(Array.isArray(spec.blocks)?spec.blocks:[]).find(function(candidate){return candidate.id===settings.consentBlockId;});return Boolean(consent&&consent.type==="audio-consent"&&responses[consent.id]===consent.choices[0]);}
    function finishRecording(){
      if(audioClock){window.clearInterval(audioClock);timerIds=timerIds.filter(function(id){return id!==audioClock;});audioClock=0;}
      stopAudioTracks();activeRecorder=null;recordButton.disabled=true;stopButton.disabled=true;
      uploadQueue.then(function(ok){var metadata={sessionId:sessionId,blockId:block.id,uploadId:uploadId,chunkIndex:chunkIndex,totalBytes:totalBytes,durationMs:Math.max(0,Math.round(performance.now()-startedAt)),mimeType:mimeType};if(!ok||uploadFailed){metadata.action="discard";return transportAudio(new Blob([],{type:"application/octet-stream"}),metadata).then(function(){return false;});}metadata.action="finalize";return transportAudio(new Blob([],{type:"application/octet-stream"}),metadata);}).then(function(ok){
        if(!ok){delete responses[block.id];delete audioResponses[block.id];nextButton.disabled=Boolean(block.required);setStatus("Recording could not be saved","No completed audio response was retained. Ask the researcher for help.",false);recordEvent("audio-upload-failed");return;}
        var durationMs=Math.max(0,Math.round(performance.now()-startedAt));audioResponses[block.id]={uploadId:uploadId,blockId:block.id,mimeType:mimeType,chunkCount:chunkIndex,totalBytes:totalBytes,durationMs:durationMs,status:"complete"};setResponse(block,"audio:"+uploadId,nextButton);setStatus("Recording saved locally",String(chunkIndex)+" chunk"+(chunkIndex===1?"":"s")+" · "+String(Math.round(durationMs/1000))+" seconds · "+String(totalBytes)+" bytes",false);recordEvent("audio-recording-complete");
      });
    }
    checkButton.type="button";recordButton.type="button";stopButton.type="button";stopButton.disabled=true;
    if(responses[block.id]){checkButton.disabled=true;recordButton.disabled=true;detail.textContent="The completed response is stored only on the researcher's Mac.";field.append(statusRow,detail);return field;}
    if(!supported()){checkButton.disabled=true;recordButton.disabled=true;stopButton.disabled=true;setStatus("Audio recording is unavailable","Open this release in the same-Mac Cerise Local Research Host using a supported browser.",false);field.append(statusRow,detail,actions);nextButton.disabled=true;return field;}
    if(!consentAccepted()){checkButton.disabled=true;recordButton.disabled=true;setStatus("Audio consent is required","This recording cannot start unless the linked audio-consent block was accepted.",false);field.append(statusRow,detail,actions);nextButton.disabled=true;return field;}
    recordButton.disabled=true;
    checkButton.addEventListener("click",function(){checkButton.disabled=true;setStatus("Checking microphone","Your browser controls this permission request.",false);navigator.mediaDevices.getUserMedia({audio:true,video:false}).then(function(stream){stream.getTracks().forEach(function(track){track.stop();});microphoneChecked=true;recordButton.disabled=false;setStatus("Microphone ready","Nothing was recorded or stored during this check.",false);recordEvent("audio-microphone-check-passed");}).catch(function(){checkButton.disabled=false;setStatus("Microphone unavailable","Allow microphone access in the browser, then try again.",false);recordEvent("audio-microphone-check-failed");});});
    recordButton.addEventListener("click",function(){if(!microphoneChecked||activeRecorder){return;}recordButton.disabled=true;checkButton.disabled=true;nextButton.disabled=true;navigator.mediaDevices.getUserMedia({audio:true,video:false}).then(function(stream){activeAudioStream=stream;mimeType=audioMimeType();uploadId=createSessionId();var recorder=mimeType?new MediaRecorder(stream,{mimeType:mimeType}):new MediaRecorder(stream);activeRecorder=recorder;mimeType=String(recorder.mimeType||mimeType||"audio/webm").split(";")[0].toLocaleLowerCase();startedAt=performance.now();totalBytes=0;chunkIndex=0;stopButton.disabled=false;setStatus("Recording","0 seconds · 0 bytes",true);recordEvent("audio-recording-started");audioClock=window.setInterval(function(){var elapsed=Math.max(0,Math.round((performance.now()-startedAt)/1000));setStatus("Recording",String(elapsed)+" of "+String(maxDuration)+" seconds · "+String(totalBytes)+" bytes",true);if(elapsed>=maxDuration&&recorder.state==="recording"){recorder.stop();}},250);timerIds.push(audioClock);recorder.ondataavailable=function(event){if(!event.data||event.data.size===0){return;}if(event.data.size>1048576||totalBytes+event.data.size>maxBytes){uploadFailed=true;recordEvent("audio-size-limit");if(recorder.state==="recording"){recorder.stop();}return;}var currentIndex=chunkIndex;chunkIndex+=1;totalBytes+=event.data.size;var currentTotalBytes=totalBytes,currentDurationMs=Math.max(0,Math.round(performance.now()-startedAt));uploadQueue=uploadQueue.then(function(ok){if(!ok){return false;}return transportAudio(event.data,{action:"chunk",sessionId:sessionId,blockId:block.id,uploadId:uploadId,chunkIndex:currentIndex,totalBytes:currentTotalBytes,durationMs:currentDurationMs,mimeType:mimeType});}).then(function(ok){if(!ok){uploadFailed=true;}return ok;});};recorder.onerror=function(){uploadFailed=true;recordEvent("audio-recorder-error");};recorder.onstop=finishRecording;recorder.start(4000);}).catch(function(){stopAudioTracks();activeRecorder=null;recordButton.disabled=false;checkButton.disabled=false;setStatus("Recording could not start","Check microphone permission and available input devices.",false);recordEvent("audio-recording-start-failed");});});
    stopButton.addEventListener("click",function(){if(activeRecorder&&activeRecorder.state==="recording"){stopButton.disabled=true;activeRecorder.stop();}});
    actions.append(checkButton,recordButton,stopButton);detail.textContent="Maximum "+String(maxDuration)+" seconds · "+String(Math.round(maxBytes/1048576))+" MB · stored only on this Mac";field.append(statusRow,detail,actions);return field;
  }
  function videoMimeType(includeAudio){var candidates=includeAudio?["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm","video/mp4"]:["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm","video/mp4"];for(var index=0;index<candidates.length;index+=1){if(typeof MediaRecorder.isTypeSupported!=="function"||MediaRecorder.isTypeSupported(candidates[index])){return candidates[index];}}return"";}
  function videoResponseControl(block,nextButton){
    var field=element("div","video-response"),statusRow=element("div","audio-status"),status=element("strong","",responses[block.id]?"Video saved locally":"Camera check required"),detail=element("span",""),preview=element("video","video-preview"),actions=element("div","audio-actions"),checkButton=element("button","button","Check camera"),recordButton=element("button","button primary","Start recording"),stopButton=element("button","button","Stop recording"),dot=element("span","recording-dot");
    var settings=block.video||{},includeAudio=settings.includeAudio===true,maxDuration=Math.max(5,Math.min(300,Number(settings.maxDurationSeconds)||60)),maxBytes=Math.max(1048576,Math.min(104857600,Number(settings.maxBytes)||26214400)),cameraChecked=false,startedAt=0,totalBytes=0,chunkIndex=0,uploadQueue=Promise.resolve(true),uploadFailed=false,uploadId="",mimeType="",videoClock=0;
    preview.autoplay=true;preview.muted=true;preview.playsInline=true;preview.setAttribute("aria-label","Live camera preview");
    function setStatus(text,subtext,recording){status.textContent=text;detail.textContent=subtext||"";statusRow.replaceChildren();if(recording){statusRow.append(dot);}statusRow.append(status);}
    function supported(){return Boolean(spec.videoCaptureEnabled&&spec.collectorMode&&window.isSecureContext&&navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&globalThis.MediaRecorder);}
    function consentAccepted(consentId,type){var consent=(Array.isArray(spec.blocks)?spec.blocks:[]).find(function(candidate){return candidate.id===consentId;});return Boolean(consent&&consent.type===type&&responses[consent.id]===consent.choices[0]);}
    function finishRecording(){
      if(videoClock){window.clearInterval(videoClock);timerIds=timerIds.filter(function(id){return id!==videoClock;});videoClock=0;}
      stopVideoTracks();preview.srcObject=null;preview.classList.remove("visible");activeRecorder=null;recordButton.disabled=true;stopButton.disabled=true;
      uploadQueue.then(function(ok){var metadata={sessionId:sessionId,blockId:block.id,uploadId:uploadId,chunkIndex:chunkIndex,totalBytes:totalBytes,durationMs:Math.max(0,Math.round(performance.now()-startedAt)),mimeType:mimeType,includeAudio:includeAudio};if(!ok||uploadFailed){metadata.action="discard";return transportVideo(new Blob([],{type:"application/octet-stream"}),metadata).then(function(){return false;});}metadata.action="finalize";return transportVideo(new Blob([],{type:"application/octet-stream"}),metadata);}).then(function(ok){
        if(!ok){delete responses[block.id];delete videoResponses[block.id];nextButton.disabled=Boolean(block.required);setStatus("Video could not be saved","No completed video response was retained. Ask the researcher for help.",false);recordEvent("video-upload-failed");return;}
        var durationMs=Math.max(0,Math.round(performance.now()-startedAt));videoResponses[block.id]={uploadId:uploadId,blockId:block.id,mimeType:mimeType,chunkCount:chunkIndex,totalBytes:totalBytes,durationMs:durationMs,includeAudio:includeAudio,status:"complete"};setResponse(block,"video:"+uploadId,nextButton);setStatus("Video saved locally",String(chunkIndex)+" chunk"+(chunkIndex===1?"":"s")+" · "+String(Math.round(durationMs/1000))+" seconds · "+String(totalBytes)+" bytes",false);recordEvent("video-recording-complete");
      });
    }
    checkButton.type="button";recordButton.type="button";stopButton.type="button";stopButton.disabled=true;
    if(responses[block.id]){checkButton.disabled=true;recordButton.disabled=true;detail.textContent="The completed response is stored only on the researcher's Mac.";field.append(statusRow,detail);return field;}
    if(!supported()){checkButton.disabled=true;recordButton.disabled=true;stopButton.disabled=true;setStatus("Video recording is unavailable","Open this release in the same-Mac Cerise Local Research Host using a supported browser.",false);field.append(statusRow,detail,actions);nextButton.disabled=true;return field;}
    if(!consentAccepted(settings.consentBlockId,"video-consent")){checkButton.disabled=true;recordButton.disabled=true;setStatus("Video consent is required","This recording cannot start unless the linked video-consent block was accepted.",false);field.append(statusRow,detail,actions);nextButton.disabled=true;return field;}
    if(includeAudio&&!consentAccepted(settings.audioConsentBlockId,"audio-consent")){checkButton.disabled=true;recordButton.disabled=true;setStatus("Audio consent is required","This video includes microphone audio and cannot start unless the linked audio-consent block was accepted.",false);field.append(statusRow,detail,actions);nextButton.disabled=true;return field;}
    recordButton.disabled=true;
    checkButton.addEventListener("click",function(){checkButton.disabled=true;setStatus("Checking camera","Your browser controls this permission request. Nothing is being recorded.",false);navigator.mediaDevices.getUserMedia({video:{facingMode:String(settings.cameraFacing||"user")},audio:includeAudio}).then(function(stream){stopVideoTracks();activeVideoStream=stream;preview.srcObject=stream;preview.classList.add("visible");cameraChecked=true;recordButton.disabled=false;setStatus("Camera ready","Review the live preview before starting. Nothing has been stored.",false);recordEvent("video-camera-check-passed");}).catch(function(){checkButton.disabled=false;setStatus("Camera unavailable","Allow camera access in the browser, then try again.",false);recordEvent("video-camera-check-failed");});});
    recordButton.addEventListener("click",function(){if(!cameraChecked||activeRecorder||!activeVideoStream){return;}recordButton.disabled=true;checkButton.disabled=true;nextButton.disabled=true;var stream=activeVideoStream;mimeType=videoMimeType(includeAudio);uploadId=createSessionId();try{var recorder=mimeType?new MediaRecorder(stream,{mimeType:mimeType}):new MediaRecorder(stream);activeRecorder=recorder;mimeType=String(recorder.mimeType||mimeType||"video/webm").split(";")[0].toLocaleLowerCase();startedAt=performance.now();totalBytes=0;chunkIndex=0;stopButton.disabled=false;setStatus("Recording video","0 seconds · 0 bytes",true);recordEvent("video-recording-started");videoClock=window.setInterval(function(){var elapsed=Math.max(0,Math.round((performance.now()-startedAt)/1000));setStatus("Recording video",String(elapsed)+" of "+String(maxDuration)+" seconds · "+String(totalBytes)+" bytes",true);if(elapsed>=maxDuration&&recorder.state==="recording"){recorder.stop();}},250);timerIds.push(videoClock);recorder.ondataavailable=function(event){if(!event.data||event.data.size===0){return;}if(event.data.size>2097152||totalBytes+event.data.size>maxBytes){uploadFailed=true;recordEvent("video-size-limit");if(recorder.state==="recording"){recorder.stop();}return;}var currentChunkIndex=chunkIndex;chunkIndex+=1;totalBytes+=event.data.size;var currentTotalBytes=totalBytes,currentDurationMs=Math.max(0,Math.round(performance.now()-startedAt));uploadQueue=uploadQueue.then(function(ok){if(!ok){return false;}return transportVideo(event.data,{action:"chunk",sessionId:sessionId,blockId:block.id,uploadId:uploadId,chunkIndex:currentChunkIndex,totalBytes:currentTotalBytes,durationMs:currentDurationMs,mimeType:mimeType,includeAudio:includeAudio});}).then(function(ok){if(!ok){uploadFailed=true;}return ok;});};recorder.onerror=function(){uploadFailed=true;recordEvent("video-recorder-error");};recorder.onstop=finishRecording;recorder.start(1000);}catch(error){stopVideoTracks();preview.srcObject=null;preview.classList.remove("visible");activeRecorder=null;cameraChecked=false;recordButton.disabled=true;checkButton.disabled=false;nextButton.disabled=Boolean(block.required);setStatus("Recording could not start","Check camera permission, codec support, and available devices.",false);recordEvent("video-recording-start-failed");}});
    stopButton.addEventListener("click",function(){if(activeRecorder&&activeRecorder.state==="recording"){stopButton.disabled=true;activeRecorder.stop();}});
    actions.append(checkButton,recordButton,stopButton);detail.textContent="Maximum "+String(maxDuration)+" seconds · "+String(Math.round(maxBytes/1048576))+" MB · "+(includeAudio?"camera and microphone":"camera only")+" · stored only on this Mac";field.append(statusRow,detail,preview,actions);return field;
  }
  function saveConsentCopy(){var text=String(spec.participantConsentCopy||""),url=URL.createObjectURL(new Blob([text],{type:"text/plain;charset=utf-8"})),link=element("a");link.href=url;link.download=String(consentArtifact.participantCopy.filename||"participant-consent.txt");link.rel="noopener";document.body.append(link);link.click();link.remove();window.setTimeout(function(){URL.revokeObjectURL(url);},1000);}
  function consentDecisionControl(decision){var field=element("fieldset","consent-decision"),legend=element("legend","",decision.title),copy=element("p","decision-copy",decision.participantText),note=element("span","decision-note",decision.requirement==="optional"?"Optional · declining does not decline the main study":"Required for this configured study · declining ends before study activities"),choices=element("div","response");[{value:"accepted",label:decision.acceptLabel},{value:"declined",label:decision.declineLabel}].forEach(function(option){var label=element("label","choice"),input=element("input");input.type="radio";input.name="consent-decision-"+decision.id;input.value=option.value;input.checked=consentSelections[decision.id]===option.value;input.addEventListener("change",function(){consentSelections[decision.id]=option.value;});label.append(input,element("span","",option.label));choices.append(label);});field.append(legend,copy,note,choices);return field;}
  function consentChoicesComplete(){var main=consentSelections["main-participation"];if(main==="declined"){return true;}return main==="accepted"&&optionalDecisionRows().every(function(decision){return consentSelections[decision.id]==="accepted"||consentSelections[decision.id]==="declined";});}
  function focusScreenHeading(){window.setTimeout(function(){var heading=root.querySelector("h1");if(heading){heading.tabIndex=-1;heading.focus();}},0);}
  function renderConsentReview(){consentConfirming=false;if(!consentPresentedAt){consentPresentedAt=new Date().toISOString();}root.replaceChildren();var shell=element("main","screen-shell"),card=element("article","screen consent-screen"),progress=element("div","progress","Consent · Review the information"),heading=element("h1","",consentArtifact.form.title),intro=element("p","consent-intro","Take the time you need. You can move through this page, ask questions using the reviewed contact information, save or print a copy, and leave without agreeing."),tools=element("div","consent-tools"),toolActions=element("div","downloads"),save=element("button","button","Save a copy"),print=element("button","button","Print"),checksum=element("code","","Form "+consentArtifact.form.checksum);save.type="button";print.type="button";save.addEventListener("click",saveConsentCopy);print.addEventListener("click",function(){window.print();});toolActions.append(save,print);tools.append(toolActions,checksum);card.append(progress,heading,intro,tools);var sections=element("div","consent-sections");consentArtifact.form.sections.forEach(function(section){var item=element("section","consent-section");item.append(element("h2","",section.title),element("p","",section.text));sections.append(item);});card.append(sections);var questions=element("details","consent-question"),summary=element("summary","","Questions or need more time?");questions.append(summary,element("p","",consentArtifact.contactsText));card.append(questions);var decisions=element("section","consent-decisions");decisions.append(element("h1","","Your decisions"),element("p","consent-intro","Nothing is selected for you. Main participation and each recording or optional-research choice are recorded separately."));consentArtifact.decisions.forEach(function(decision){decisions.append(consentDecisionControl(decision));});var error=element("p","consent-error","");error.setAttribute("role","status");var navigation=element("div","navigation"),leave=element("button","button","Leave without deciding"),review=element("button","button primary","Review my decisions");leave.type="button";review.type="button";leave.addEventListener("click",function(){void deleteRecovery();showConsentEnded("No decision recorded","The study did not begin, and no study response, timing, event, assignment, or media data was retained.",null);});review.addEventListener("click",function(){if(!consentChoicesComplete()){error.textContent="Choose your main participation decision and every applicable separate choice before reviewing.";error.focus();return;}renderConsentConfirmation();});navigation.append(leave,review);decisions.append(error,navigation);card.append(decisions);shell.append(card);root.append(shell);focusScreenHeading();}
  function renderConsentConfirmation(){consentConfirming=true;root.replaceChildren();var shell=element("main","screen-shell"),card=element("section","screen consent-screen"),outcome=receiptDecision(),heading=element("h1","",outcome.decision==="accepted"?"Confirm before the study begins":"Confirm that you do not want to begin"),intro=element("p","consent-intro",outcome.decision==="accepted"?"Review each decision below. You can go back and correct anything before creating the local acknowledgement receipt.":"The study will end before any study activity or data collection. Separate optional choices are not recorded when the main study is declined. You can go back if you want to change your participation decision."),summary=element("div","consent-confirm"),list=element("dl"),summaryDecisions=outcome.basis==="main-declined"?consentArtifact.decisions.slice(0,1):consentArtifact.decisions;summaryDecisions.forEach(function(decision){var row=element("div"),term=element("dt","",decision.title),description=element("dd","",consentSelections[decision.id]==="accepted"?decision.acceptLabel:decision.declineLabel);row.append(term,description);list.append(row);});summary.append(list);var boundary=element("p","privacy-note","Receipt boundary: local decision metadata and exact form/release checksums only. This is not an electronic signature, identity proof, IRB approval, or legal determination."),navigation=element("div","navigation"),back=element("button","button","Go back and correct"),submit=element("button","button primary",outcome.decision==="accepted"?"Confirm and begin study":"Confirm and end");back.type="button";submit.type="button";back.addEventListener("click",renderConsentReview);submit.addEventListener("click",function(){submit.disabled=true;createBrowserConsentReceipt(outcome,new Date().toISOString()).then(finishConsentDecision).catch(function(){showFatal("The local consent receipt could not be verified. No study activity began.");});});navigation.append(back,submit);card.append(element("div","progress","Consent · Confirm your decisions"),heading,intro,summary,boundary,navigation);shell.append(card);root.append(shell);focusScreenHeading();}
  function showConsentEnded(title,message,receipt){clearTimers();if(withdrawButton){withdrawButton.hidden=true;}root.replaceChildren();var shell=element("main","screen-shell"),card=element("section","screen completion");card.append(element("h1","ended",title),element("p","",message));if(receipt){card.append(element("p","privacy-note","Local receipt "+receipt.receiptChecksum+" · no name, signature, study response, timing, event, assignment, or media content"));}shell.append(card);root.append(shell);focusScreenHeading();}
  function finishConsentDecision(receipt){consentReceipt=receipt;if(receipt.decision==="refused"){responses=Object.create(null);audioResponses=Object.create(null);videoResponses=Object.create(null);timings=[];events=[];history=[];checkpoint("refused");void deleteRecovery();showConsentEnded("Participation did not begin",receipt.decisionBasis==="required-component-declined"?"A required component was declined, so this configured study cannot continue. No study data was retained.":"Your decision not to participate was recorded locally. No study data was retained.",receipt);return;}condition=assignCondition(sessionId);runtimeBlocks=materializeBlocks(sessionId,condition);maxVisits=runtimeBlocks.length*4+25;currentIndex=Math.max(1,runtimeBlocks.findIndex(function(block){return block.type==="consent-form";})+1);history=[];studyStartedAt=receipt.decidedAt;if(withdrawButton){withdrawButton.hidden=false;}checkpoint("started");render();}
  function recordingDecisionAllows(block){if(!consentReceipt||!Array.isArray(consentReceipt.optionalDecisions)){return !hasStructuredConsent;}var kind=block.type==="audio-response"?"audio-recording":block.type==="video-response"?"video-recording":"",decision=optionalDecisionRows().find(function(item){return item.kind===kind;}),recorded=decision&&consentReceipt.optionalDecisions.find(function(item){return item.decisionId===decision.id;});return !decision||Boolean(recorded&&recorded.decision==="accepted");}
  function showWithdrawalPrompt(){if(!consentReceipt||!["accepted","reconsented"].includes(consentReceipt.decision)){return;}clearTimers();stopAudioTracks();stopVideoTracks();root.replaceChildren();var shell=element("main","screen-shell"),card=element("section","screen completion"),heading=element("h1","","Stop or withdraw from this study?"),method=element("p","",consentArtifact.withdrawal.method),boundary=element("p","privacy-note",consentArtifact.withdrawal.dataBoundary),actions=element("div","downloads"),back=element("button","button","Continue the study"),withdraw=element("button","button primary","Confirm withdrawal");back.type="button";withdraw.type="button";back.addEventListener("click",render);withdraw.addEventListener("click",function(){withdraw.disabled=true;createBrowserConsentReceipt({decision:"withdrawn",basis:"participant-withdrew"},new Date().toISOString()).then(function(receipt){consentReceipt=receipt;responses=Object.create(null);audioResponses=Object.create(null);videoResponses=Object.create(null);timings=[];events=[];history=[];checkpoint("withdrawn");void deleteRecovery();showConsentEnded("Withdrawal recorded","New study interaction and collection stopped. The current provisional local session was scrubbed. The reviewed form explains the boundary for information already committed, de-identified, distributed, or otherwise outside this provisional session.",receipt);}).catch(function(){showFatal("Withdrawal stopped collection, but the local receipt could not be verified. Contact the study team using the reviewed form.");});});actions.append(back,withdraw);card.append(heading,method,boundary,actions);shell.append(card);root.append(shell);focusScreenHeading();}
  function responseControl(block,nextButton){if(block.responseType==="none"){return null;}var field;if(block.responseType==="long-text"){field=element("textarea","text-response");field.setAttribute("aria-label","Your response");field.value=responses[block.id]||"";field.addEventListener("input",function(){setResponse(block,field.value,nextButton);});return field;}if(block.responseType==="keyboard"){field=element("div","keyboard-response");var allowed=(Array.isArray(block.allowedKeys)?block.allowedKeys:[]).map(function(key){return String(key).toLocaleLowerCase();}),status=element("strong","",responses[block.id]?"Recorded key: "+String(responses[block.id]).toUpperCase():"Waiting for a key response"),hint=element("span","","Allowed keys: "+allowed.map(function(key){return key.toUpperCase();}).join(" · "));field.append(status,hint);activeKeyHandler=function(event){if(event.repeat||event.altKey||event.ctrlKey||event.metaKey){return;}var key=String(event.key||"").toLocaleLowerCase();if(!allowed.includes(key)){return;}event.preventDefault();setResponse(block,key,nextButton);status.textContent="Recorded key: "+key.toUpperCase();};window.addEventListener("keydown",activeKeyHandler);return field;}if(block.responseType==="audio"){return audioResponseControl(block,nextButton);}if(block.responseType==="video"){return videoResponseControl(block,nextButton);}field=element("fieldset","response");field.append(element("legend","",block.responseType==="consent"?"Your decision":"Choose one response"));var choices=block.responseType==="likert"?Array.from({length:Math.max(0,block.scaleMax-block.scaleMin+1)},function(_,index){return String(block.scaleMin+index);}):shuffledChoices(block,Array.isArray(block.choices)?block.choices:[]);if(block.responseType==="likert"){var labels=element("div","scale-labels");labels.append(element("span","",block.minLabel||"Minimum"),element("span","",block.maxLabel||"Maximum"));field.append(labels);}var list=element("div",block.responseType==="likert"?"scale":"");choices.forEach(function(choice){var label=element("label","choice"),input=element("input");input.type="radio";input.name="response-"+block.id;input.value=String(choice);input.checked=responses[block.id]===String(choice);input.addEventListener("change",function(){setResponse(block,String(choice),nextButton);});label.append(input,element("span","",String(choice)));list.append(label);});field.append(list);return field;}
  function advance(reason){clearTimers();stopVideoTracks();var block=runtimeBlocks[currentIndex];if(!block){showCompletion(false);return;}recordTiming(block,reason);if(block.responseType==="consent"&&responses[block.id]===block.choices[1]){responses=Object.create(null);audioResponses=Object.create(null);videoResponses=Object.create(null);timings=[];history=[];checkpoint("withdrawn");void deleteRecovery();showCompletion(true);return;}history.push(currentIndex);currentIndex=nextIndex(block);visitCount+=1;if(visitCount>maxVisits){showFatal("The study flow exceeded its safe navigation limit. Please contact the researcher.");return;}checkpoint(currentIndex>=runtimeBlocks.length?"completed":"started");render();}
  function render(){clearTimers();if(currentIndex>=runtimeBlocks.length){showCompletion(false);return;}var block=runtimeBlocks[currentIndex];if(block.type==="consent-form"){renderConsentReview();return;}if((block.type==="audio-response"||block.type==="video-response")&&!recordingDecisionAllows(block)){history.push(currentIndex);currentIndex=nextIndex(block);checkpoint("started");render();return;}root.replaceChildren();screenStartedAt=performance.now();var shell=element("main","screen-shell"),card=element("section","screen");card.append(element("div","progress","Screen "+String(currentIndex+1)+" of "+String(runtimeBlocks.length)+(condition&&condition.name?" · "+condition.name:"")+(block.practice?" · PRACTICE":"")+(spec.executionMode==="pilot"?" · PILOT":"")));if(block.heading){card.append(element("h1","",block.heading));}if(block.media&&block.media.kind==="image"&&/^data:image\\/(webp|png|jpeg);base64,[A-Za-z0-9+/=]+$/i.test(String(block.media.dataUrl||""))){var image=element("img","stimulus-media");image.src=block.media.dataUrl;image.alt=String(block.media.altText||"Study stimulus");image.draggable=false;card.append(image);}if(block.prompt){card.append(element("p","prompt",block.prompt));}var navigation=element("div","navigation"),back=element("button","button","Back");back.type="button";back.disabled=block.responseType==="audio"||block.responseType==="video"||!(spec.execution&&spec.execution.allowBackNavigation)||history.length===0;back.addEventListener("click",function(){clearTimers();stopVideoTracks();var previous=history.pop();if(previous===undefined){return;}recordTiming(block,"back");currentIndex=previous;checkpoint("started");render();});var timing=element("span","timing",Number(block.responseDeadlineMs)>0?"Deadline: "+Number(block.responseDeadlineMs).toLocaleString()+" ms":"Browser-measured timing"),next=element("button","button primary",block.responseType==="consent"&&responses[block.id]===block.choices[1]?"End":"Next");next.type="button";next.disabled=Boolean(block.required&&!String(responses[block.id]||"").trim());next.addEventListener("click",function(){if(currentIndex===0&&spec.execution&&spec.execution.requireFullscreen&&document.fullscreenEnabled&&!document.fullscreenElement){document.documentElement.requestFullscreen().then(function(){recordEvent("fullscreen-entered");}).catch(function(){recordEvent("fullscreen-denied");});}advance("participant");});var response=responseControl(block,next);if(response){card.append(response);}navigation.append(back,timing,next);card.append(navigation);shell.append(card);root.append(shell);if(block.responseType==="none"&&Number(block.displayDurationMs)>0){timerIds.push(window.setTimeout(function(){advance("display-duration");},Number(block.displayDurationMs)));}if(block.responseType!=="audio"&&block.responseType!=="video"&&Number(block.responseDeadlineMs)>0){timerIds.push(window.setTimeout(function(){advance("response-deadline");},Number(block.responseDeadlineMs)));}}
  function lastTiming(blockId){for(var index=timings.length-1;index>=0;index-=1){if(timings[index].blockId===blockId){return timings[index];}}return null;}
  function trialResults(){return runtimeBlocks.filter(function(block){return Boolean(block.runtimeTrial);}).map(function(block){var trial=block.runtimeTrial,timing=lastTiming(block.id),response=responses[block.id]===undefined?null:responses[block.id],expected=String(block.correctAnswer||"").trim();return{tableId:trial.tableId,tableName:trial.tableName,loopBlockId:trial.loopBlockId,trialId:trial.trialId,sourceRowIndex:trial.sourceRowIndex,repetition:trial.repetition,orderIndex:trial.orderIndex,practice:block.practice===true,response:response,correctAnswer:expected||null,correct:expected?String(response===null?"":response).toLocaleLowerCase()===expected.toLocaleLowerCase():null,reactionTimeMs:timing?timing.durationMs:null,deadlineMs:Number(block.responseDeadlineMs)||0,deadlineExceeded:timing?timing.deadlineExceeded:false,completionReason:timing?timing.completionReason:null};});}
  function resultRecord(){var values=Object.create(null),scoring=Object.create(null);runtimeBlocks.forEach(function(block){if(!block.runtimeTrial&&block.variableName){var response=responses[block.id]===undefined?null:responses[block.id];values[block.variableName]=response;if(String(block.correctAnswer||"").trim()){scoring[block.variableName]={correct:String(response===null?"":response).toLocaleLowerCase()===String(block.correctAnswer).trim().toLocaleLowerCase(),practice:block.practice===true,expected:String(block.correctAnswer)};}}});var trials=trialResults();return{packageVersion:6,releaseId:String(release.releaseId||"unreleased"),releaseNumber:Number(release.releaseNumber)||0,releaseChecksum:String(release.checksum||"unreleased"),executionMode:String(spec.executionMode||"pilot"),consentReceipt:consentReceipt,timingClaim:"browser-measured",timingDiagnostic:spec.timingDiagnostic?{diagnosticId:String(spec.timingDiagnostic.diagnosticId||""),engineVersion:String(spec.timingDiagnostic.engineVersion||""),recordedAt:String(spec.timingDiagnostic.recordedAt||""),status:String(spec.timingDiagnostic.status||"review")}:null,studySchemaVersion:spec.schemaVersion,studyTitle:spec.title,sessionId:sessionId,condition:{id:condition.id,name:condition.name},startedAt:studyStartedAt,completedAt:new Date().toISOString(),device:{userAgent:navigator.userAgent,language:navigator.language,viewport:{width:window.innerWidth,height:window.innerHeight},timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||""},responses:values,audioResponses:audioResponses,videoResponses:videoResponses,scoring:scoring,trials:trials,trialOrder:trials.map(function(trial){return trial.loopBlockId+":"+trial.trialId+":"+trial.repetition;}),timings:timings,events:events};}
  function csvCell(value){var text=value===null||value===undefined?"":String(value);if(/^[\\t\\r\\n ]*[=+\\-@]/.test(text)){text="'"+text;}return"\\\""+text.replaceAll("\\\"","\\\"\\\"")+"\\\"";}
  function resultCsv(record){var names=["release_id","release_number","release_checksum","execution_mode","session_id","condition_id","condition_name","started_at","completed_at","trial_count"].concat(Object.keys(record.responses)),values=[record.releaseId,record.releaseNumber,record.releaseChecksum,record.executionMode,record.sessionId,record.condition.id,record.condition.name,record.startedAt,record.completedAt,record.trials.length].concat(Object.keys(record.responses).map(function(name){return record.responses[name];}));return names.map(csvCell).join(",")+"\\r\\n"+values.map(csvCell).join(",")+"\\r\\n";}
  function trialSource(trial){var tables=Array.isArray(spec.trialTables)?spec.trialTables:[],table=tables.find(function(candidate){return candidate.id===trial.tableId;});return table&&Array.isArray(table.rows[trial.sourceRowIndex])?rowRecord(table,table.rows[trial.sourceRowIndex]):Object.create(null);}
  function trialCsv(record){var sourceColumns=[];(Array.isArray(spec.trialTables)?spec.trialTables:[]).forEach(function(table){(Array.isArray(table.columns)?table.columns:[]).forEach(function(column){if(!sourceColumns.includes(column)){sourceColumns.push(column);}});});var names=["release_id","release_number","release_checksum","session_id","condition_id","condition_name","order_index","table_id","loop_block_id","trial_id","source_row","repetition","practice","response","correct_answer","correct","reaction_time_ms","deadline_ms","deadline_exceeded","completion_reason"].concat(sourceColumns.map(function(column){return"source_"+column;})),lines=[names.map(csvCell).join(",")];record.trials.forEach(function(trial){var source=trialSource(trial),values=[record.releaseId,record.releaseNumber,record.releaseChecksum,record.sessionId,record.condition.id,record.condition.name,trial.orderIndex,trial.tableId,trial.loopBlockId,trial.trialId,trial.sourceRowIndex+1,trial.repetition,trial.practice,trial.response,trial.correctAnswer,trial.correct,trial.reactionTimeMs,trial.deadlineMs,trial.deadlineExceeded,trial.completionReason].concat(sourceColumns.map(function(column){return source[column]||"";}));lines.push(values.map(csvCell).join(","));});return lines.join("\\r\\n")+"\\r\\n";}
  function download(name,text,type){var url=URL.createObjectURL(new Blob([text],{type:type})),link=element("a");link.href=url;link.download=name;link.rel="noopener";document.body.append(link);link.click();link.remove();resultDownloaded=true;dirty=false;void deleteRecovery();window.setTimeout(function(){URL.revokeObjectURL(url);},1000);}
  function showCompletion(refused){clearTimers();root.replaceChildren();var shell=element("main","screen-shell"),card=element("section","screen completion");if(refused){card.append(element("h1","ended","Participation ended"),element("p","","No response or timing data were retained after declining consent."));}else{var record=resultRecord();checkpoint("completed");card.append(element("h1","","Study complete"),element("p","",spec.collectorMode?"Your responses were saved to the researcher's local collector.":"Download the results before closing this tab. A best-effort browser checkpoint is available until download."));if(!spec.collectorMode){var downloads=element("div","downloads"),jsonButton=element("button","button primary","Download JSON results");jsonButton.type="button";jsonButton.addEventListener("click",function(){download("cerise-results-"+sessionId+".json",JSON.stringify(record,null,2),"application/json;charset=utf-8");});var csvButton=element("button","button","Download participant CSV");csvButton.type="button";csvButton.addEventListener("click",function(){download("cerise-results-"+sessionId+".csv",resultCsv(record),"text/csv;charset=utf-8");});downloads.append(jsonButton,csvButton);if(record.trials.length){var trialButton=element("button","button","Download trial CSV");trialButton.type="button";trialButton.addEventListener("click",function(){download("cerise-trials-"+sessionId+".csv",trialCsv(record),"text/csv;charset=utf-8");});downloads.append(trialButton);}card.append(downloads);}card.append(element("p","privacy-note",spec.collectorMode?"Local Collector: responses are stored only in SQLite on the researcher's computer.":"Portable runner: IndexedDB recovery is local and best-effort; no cloud upload path exists."));}shell.append(card);root.append(shell);}
  function showResume(saved){root.replaceChildren();var shell=element("main","screen-shell"),card=element("section","screen completion");card.append(element("h1","","Resume this session?"),element("p","","A local recovery checkpoint exists for this exact study release and consent artifact."));var actions=element("div","downloads"),resume=element("button","button primary","Resume"),restart=element("button","button","Start over");resume.type="button";restart.type="button";resume.addEventListener("click",function(){sessionId=String(saved.sessionId||sessionId);consentReceipt=saved.consentReceipt||null;responses=saved.responses&&typeof saved.responses==="object"?saved.responses:Object.create(null);audioResponses=saved.audioResponses&&typeof saved.audioResponses==="object"?saved.audioResponses:Object.create(null);videoResponses=saved.videoResponses&&typeof saved.videoResponses==="object"?saved.videoResponses:Object.create(null);timings=Array.isArray(saved.timings)?saved.timings:[];events=Array.isArray(saved.events)?saved.events:[];history=Array.isArray(saved.history)?saved.history:[];studyStartedAt=String(saved.startedAt||studyStartedAt);checkpointSequence=Math.max(0,Number(saved.checkpointSequence)||0);condition=assignCondition(sessionId);runtimeBlocks=materializeBlocks(sessionId,condition);maxVisits=runtimeBlocks.length*4+25;currentIndex=Number.isInteger(saved.currentIndex)?Math.max(hasStructuredConsent?1:0,Math.min(runtimeBlocks.length,saved.currentIndex)):hasStructuredConsent?1:0;if(withdrawButton&&hasStructuredConsent){withdrawButton.hidden=false;}render();});restart.addEventListener("click",function(){void deleteRecovery();consentReceipt=null;consentSelections=Object.create(null);consentPresentedAt="";condition=hasStructuredConsent?{id:"pending-consent",name:""}:assignCondition(sessionId);runtimeBlocks=hasStructuredConsent?spec.blocks.map(function(block){return Object.assign({},block);}):materializeBlocks(sessionId,condition);currentIndex=0;history=[];responses=Object.create(null);audioResponses=Object.create(null);videoResponses=Object.create(null);timings=[];events=[];if(withdrawButton){withdrawButton.hidden=true;}if(hasStructuredConsent){renderConsentReview();}else{checkpoint("started");render();}});actions.append(resume,restart);card.append(actions);shell.append(card);root.append(shell);focusScreenHeading();}
  if(withdrawButton){withdrawButton.addEventListener("click",showWithdrawalPrompt);}
  window.addEventListener("beforeunload",function(event){stopAudioTracks();stopVideoTracks();if(dirty&&!resultDownloaded){event.preventDefault();event.returnValue="";}});
  if(!spec.execution||spec.execution.logFocusChanges!==false){document.addEventListener("visibilitychange",function(){recordEvent(document.hidden?"visibility-hidden":"visibility-visible");if(document.hidden){checkpoint("started");}});window.addEventListener("blur",function(){recordEvent("window-blur");});window.addEventListener("focus",function(){recordEvent("window-focus");});}
  function preloadImages(){
    var sources=runtimeBlocks.map(function(block){return block.media&&block.media.kind==="image"?String(block.media.dataUrl||""):"";}).filter(Boolean);
    return Promise.all(sources.map(function(source){
      return new Promise(function(resolve){
        var image=new Image(),settled=false;
        function finish(result){if(settled){return;}settled=true;resolve(result);}
        image.onload=function(){finish(true);};
        image.onerror=function(){finish(false);};
        image.src=source;
        if(image.decode){image.decode().then(function(){finish(true);}).catch(function(){finish(false);});}
      });
    }));
  }
  verifyEmbeddedConsent().then(function(valid){if(!valid){showFatal("The reviewed consent artifact is missing, stale, inapplicable, or has been altered. No study activity began.");return undefined;}return preloadImages().then(function(){return readRecovery();});}).then(function(saved){if(saved===undefined){return;}if(hasStructuredConsent){if(saved&&saved.releaseChecksum===String(release.checksum||"unreleased")&&saved.status==="started"){verifyConsentReceipt(saved.consentReceipt).then(function(valid){if(valid){showResume(saved);}else{void deleteRecovery();renderConsentReview();}});return;}void deleteRecovery();renderConsentReview();return;}if(saved&&saved.releaseChecksum===String(release.checksum||"unreleased")&&saved.status!=="withdrawn"&&saved.status!=="refused"){showResume(saved);}else{checkpoint("started");render();}});
})();
`;

export function buildExperimentRunnerPackage(
  document: ExperimentStudioDocument,
  options: ExperimentRunnerPackageOptions = {},
): ExperimentRunnerPackage {
  if (!canBuildExperimentRunnerPackage(document, options.consentRuntimeArtifact)) {
    throw new Error("Resolve blocking study errors before building the local runner package.");
  }
  const nonce = normalizeNonce(options.nonce);
  const filename = normalizeExperimentRunnerFilename(options.filename ?? "", document.title);
  const payload = serializeForHtmlScript({
    ...document,
    exportedAt: new Date().toISOString(),
    participantResponsesIncluded: false,
    runnerPackageVersion: EXPERIMENT_RUNNER_PACKAGE_VERSION,
    executionMode: options.executionMode ?? "pilot",
    collectorMode: Boolean(options.collectorCheckpointEndpoint),
    audioCaptureEnabled: Boolean(options.collectorAudioEndpoint),
    audioCaptureEndpoint: options.collectorAudioEndpoint ?? null,
    videoCaptureEnabled: Boolean(options.collectorVideoEndpoint),
    videoCaptureEndpoint: options.collectorVideoEndpoint ?? null,
    releaseMetadata: options.release ? {
      releaseId: options.release.releaseId,
      releaseNumber: options.release.releaseNumber,
      checksum: options.release.checksum,
      createdAt: options.release.createdAt,
    } : null,
    consentRuntimeArtifact: options.consentRuntimeArtifact ?? null,
    participantConsentCopy: options.consentRuntimeArtifact
      ? participantConsentCopy(options.consentRuntimeArtifact)
      : null,
  });
  const title = escapeHtmlText(document.title || "Cerise study");
  const csp = [
    "default-src 'none'",
    `script-src 'nonce-${nonce}'`,
    `style-src 'nonce-${nonce}'`,
    "img-src data: blob:",
    options.collectorCheckpointEndpoint || options.collectorAudioEndpoint || options.collectorVideoEndpoint
      ? "connect-src 'self'"
      : "connect-src 'none'",
    options.collectorVideoEndpoint ? "media-src blob:" : "media-src 'none'",
    "font-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");

  const checkpointTransport = options.collectorCheckpointEndpoint
    ? `return fetch(${JSON.stringify(options.collectorCheckpointEndpoint)},{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(record),credentials:"same-origin"}).then(function(response){return response.ok;}).catch(function(){return false;});`
    : "return Promise.resolve(false);";
  const audioTransport = options.collectorAudioEndpoint
    ? `var headers={"Content-Type":String(blob.type||"application/octet-stream"),"X-Cerise-Audio-Action":String(metadata.action||"chunk"),"X-Cerise-Session-Id":String(metadata.sessionId||""),"X-Cerise-Block-Id":String(metadata.blockId||""),"X-Cerise-Upload-Id":String(metadata.uploadId||""),"X-Cerise-Chunk-Index":String(metadata.chunkIndex||0),"X-Cerise-Total-Bytes":String(metadata.totalBytes||0),"X-Cerise-Duration-Ms":String(metadata.durationMs||0),"X-Cerise-Audio-Mime":String(metadata.mimeType||"")};return fetch(${JSON.stringify(options.collectorAudioEndpoint)},{method:"POST",headers:headers,body:blob,credentials:"same-origin"}).then(function(response){return response.ok;}).catch(function(){return false;});`
    : "return Promise.resolve(false);";
  const videoTransport = options.collectorVideoEndpoint
    ? `var headers={"Content-Type":String(blob.type||"application/octet-stream"),"X-Cerise-Video-Action":String(metadata.action||"chunk"),"X-Cerise-Session-Id":String(metadata.sessionId||""),"X-Cerise-Block-Id":String(metadata.blockId||""),"X-Cerise-Upload-Id":String(metadata.uploadId||""),"X-Cerise-Chunk-Index":String(metadata.chunkIndex||0),"X-Cerise-Total-Bytes":String(metadata.totalBytes||0),"X-Cerise-Duration-Ms":String(metadata.durationMs||0),"X-Cerise-Video-Mime":String(metadata.mimeType||""),"X-Cerise-Video-Includes-Audio":metadata.includeAudio===true?"true":"false"};return fetch(${JSON.stringify(options.collectorVideoEndpoint)},{method:"POST",headers:headers,body:blob,credentials:"same-origin"}).then(function(response){return response.ok;}).catch(function(){return false;});`
    : "return Promise.resolve(false);";
  const runnerScript = RUNNER_SCRIPT
    .replace("__CHECKPOINT_TRANSPORT__", checkpointTransport)
    .replace("__AUDIO_TRANSPORT__", audioTransport)
    .replace("__VIDEO_TRANSPORT__", videoTransport);

  return {
    filename,
    mimeType: "text/html;charset=utf-8",
    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="referrer" content="no-referrer">
  <title>${title} · Local study runner</title>
  <style nonce="${nonce}">${RUNNER_STYLE}</style>
</head>
<body>
  <div class="runner">
    <header class="runner-header"><strong>Cerise Scholar</strong><span>${options.collectorVideoEndpoint ? "Local Research Host · same Mac video" : options.collectorAudioEndpoint ? "Local Research Host · same Mac audio" : options.collectorCheckpointEndpoint ? "Local Pilot Collector · structured responses" : "Portable study runner · no network connection"}</span><button class="withdraw-study" hidden id="withdraw-study" type="button">Stop or withdraw</button></header>
    <div id="study-root" aria-live="polite"></div>
  </div>
  <script id="study-spec" nonce="${nonce}" type="application/json">${payload}</script>
  <script nonce="${nonce}">${runnerScript}</script>
</body>
</html>`,
  };
}
