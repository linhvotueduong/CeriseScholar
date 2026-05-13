import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import {
  buildOllamaSecurityStatus,
  getOllamaListenHosts,
  parsePort,
} from "./local-ollama-security.mjs";

const localAgentBaseUrl = (process.env.LOCAL_AGENT_BASE_URL || "http://127.0.0.1:43110").replace(/\/$/, "");
const ollamaBaseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/api").replace(/\/$/, "");
const minimumNodeMajor = 20;

function parseMajor(version) {
  return Number.parseInt(String(version || "").replace(/^v/, "").split(".")[0], 10) || 0;
}

function withTimeout(promise, timeoutMs = 2500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    wait: async (request) => {
      try {
        return await promise(request, controller.signal);
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

async function fetchJson(url, timeoutMs = 2500) {
  const { signal, wait } = withTimeout(async (requestUrl, requestSignal) => {
    const response = await fetch(requestUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: requestSignal,
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  }, timeoutMs);

  return wait(url, signal);
}

function canConnect(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const done = (result) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(1200);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

async function readPackageScripts() {
  try {
    const packagePath = path.resolve(process.cwd(), "package.json");
    const raw = await fs.readFile(packagePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed?.scripts && typeof parsed.scripts === "object" ? parsed.scripts : {};
  } catch {
    return {};
  }
}

function formatStatus(ok) {
  return ok ? "PASS" : "NEEDS ACTION";
}

function printCheck(label, ok, detail = "") {
  const suffix = detail ? ` - ${detail}` : "";
  console.log(`${formatStatus(ok)} ${label}${suffix}`);
}

async function main() {
  console.log("Cerise Scholar Laptop Setup Doctor");
  console.log(`Local agent: ${localAgentBaseUrl}`);
  console.log(`Ollama: ${ollamaBaseUrl}`);
  console.log("");

  const scripts = await readPackageScripts();
  const nodeMajor = parseMajor(process.version);
  const hasLocalAgentScript = Boolean(scripts["local-agent"]);
  const hasDevLocalScript = Boolean(scripts["dev:local"]);
  const hasDoctorScript = Boolean(scripts["local-agent:doctor"]);

  printCheck("Node.js runtime", nodeMajor >= minimumNodeMajor, `${process.version}; need ${minimumNodeMajor}+`);
  printCheck("npm run local-agent script", hasLocalAgentScript);
  printCheck("npm run dev:local script", hasDevLocalScript);
  printCheck("npm run local-agent:doctor script", hasDoctorScript);

  const localAgentPort = parsePort(localAgentBaseUrl, 43110);
  const ollamaPort = parsePort(ollamaBaseUrl, 11434);
  const localAgentPortOpen = await canConnect(localAgentPort);
  const ollamaPortOpen = await canConnect(ollamaPort);

  printCheck("Local agent port", localAgentPortOpen, `127.0.0.1:${localAgentPort}`);
  printCheck("Ollama port", ollamaPortOpen, `127.0.0.1:${ollamaPort}`);

  let localAgentHealth = null;
  if (localAgentPortOpen) {
    try {
      localAgentHealth = await fetchJson(`${localAgentBaseUrl}/health`);
      printCheck(
        "Local agent health",
        Boolean(localAgentHealth.ok && localAgentHealth.data?.ok),
        localAgentHealth.data?.mode ? `mode ${localAgentHealth.data.mode}` : `status ${localAgentHealth.status}`
      );
    } catch (error) {
      printCheck("Local agent health", false, error?.name === "AbortError" ? "timed out" : "not reachable");
    }
  } else {
    printCheck("Local agent health", false, "run npm run local-agent");
  }

  if (ollamaPortOpen) {
    try {
      const [version, tags] = await Promise.all([
        fetchJson(`${ollamaBaseUrl}/version`),
        fetchJson(`${ollamaBaseUrl}/tags`),
      ]);
      const models = Array.isArray(tags.data?.models) ? tags.data.models : [];
      const listenHosts = await getOllamaListenHosts(ollamaPort);
      const security = buildOllamaSecurityStatus({
        baseUrl: ollamaBaseUrl,
        version: version.data?.version || "",
        listenHosts,
      });
      printCheck("Ollama health", Boolean(version.ok), version.data?.version || `status ${version.status}`);
      printCheck("Ollama model installed", models.length > 0, `${models.length} model(s) found`);
      printCheck(
        "Ollama patched version",
        security.versionSafe,
        version.data?.version ? `found ${version.data.version}; need ${security.minSafeVersion}+` : "version unknown"
      );
      printCheck(
        "Ollama localhost-only",
        security.localhostOnly,
        listenHosts.length > 0 ? listenHosts.join(", ") : "could not verify listener"
      );
      printCheck(
        "Ollama security gate",
        security.ok,
        security.ok ? "safe for Cerise Scholar local AI" : security.warnings.join(" ")
      );
    } catch (error) {
      printCheck("Ollama health", false, error?.name === "AbortError" ? "timed out" : "not reachable");
      printCheck("Ollama model installed", false, "install at least one chat model");
      printCheck("Ollama security gate", false, "Ollama must be reachable, patched, and localhost-only");
    }
  } else {
    printCheck("Ollama health", false, "open Ollama or run ollama serve");
    printCheck("Ollama model installed", false, "install at least one chat model");
    printCheck("Ollama security gate", false, "Ollama must be reachable, patched, and localhost-only");
  }

  console.log("");
  console.log("Useful commands:");
  console.log("  npm run local-agent:doctor");
  console.log("  npm run local-agent");
  console.log("  npm run dev:local");
  console.log("  ollama serve");
  console.log("  ollama pull <model-name>");

  const ready =
    nodeMajor >= minimumNodeMajor &&
    hasLocalAgentScript &&
    hasDevLocalScript &&
    localAgentHealth?.ok &&
    localAgentHealth?.data?.capabilities?.localAi;

  if (!ready) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error?.message || "Cerise Scholar laptop setup doctor failed.");
  process.exitCode = 1;
});
