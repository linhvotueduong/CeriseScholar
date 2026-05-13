import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const MIN_SAFE_OLLAMA_VERSION = "0.17.1";
export const BLOCKED_OLLAMA_ENDPOINTS = [
  "/api/create",
  "/api/blobs",
  "/api/push",
];

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const PUBLIC_BIND_HOSTS = new Set(["0.0.0.0", "::", "[::]", "*"]);

export function compareSemver(left, right) {
  const leftParts = String(left || "")
    .replace(/^v/i, "")
    .split(/[.-]/)
    .map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = String(right || "")
    .replace(/^v/i, "")
    .split(/[.-]/)
    .map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(leftParts.length, rightParts.length, 3);

  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] || 0;
    const rightValue = rightParts[index] || 0;
    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }

  return 0;
}

export function parsePort(rawUrl, fallback = 11434) {
  try {
    return Number.parseInt(new URL(rawUrl).port || fallback, 10);
  } catch {
    return fallback;
  }
}

export function parseHostname(rawUrl, fallback = "127.0.0.1") {
  try {
    return new URL(rawUrl).hostname || fallback;
  } catch {
    return fallback;
  }
}

export function isLoopbackHostname(hostname) {
  return LOOPBACK_HOSTS.has(String(hostname || "").toLowerCase());
}

function normalizeListenHost(rawHost) {
  const host = String(rawHost || "").trim().toLowerCase();
  if (!host) return "";
  if (host === "*") return "*";
  if (host.startsWith("[") && host.endsWith("]")) return host.slice(1, -1);
  return host;
}

function parseHostPort(entry) {
  const value = String(entry || "").trim();
  if (!value) return null;
  if (value.includes("->")) return null;

  const bracketMatch = value.match(/^\[([^\]]+)\]:(\d+)$/);
  if (bracketMatch) {
    return { host: normalizeListenHost(bracketMatch[1]), port: Number.parseInt(bracketMatch[2], 10) };
  }

  const lastColon = value.lastIndexOf(":");
  if (lastColon < 0) return null;

  return {
    host: normalizeListenHost(value.slice(0, lastColon)),
    port: Number.parseInt(value.slice(lastColon + 1), 10),
  };
}

function parseListenerOutput(output, port) {
  return [
    ...new Set(
      String(output || "")
        .split(/\r?\n/)
        .flatMap((line) => line.trim().split(/\s+/))
        .map(parseHostPort)
        .filter((entry) => entry && entry.port === port)
        .map((entry) => entry.host)
        .filter(Boolean)
    ),
  ];
}

async function tryCommand(command, args, port) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { timeout: 1500 });
    return parseListenerOutput(`${stdout}\n${stderr}`, port);
  } catch {
    return [];
  }
}

export async function getOllamaListenHosts(port = 11434) {
  const commands =
    process.platform === "win32"
      ? [["netstat", ["-ano", "-p", "tcp"]]]
      : [
          ["lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"]],
          ["ss", ["-ltn"]],
          ["netstat", ["-an"]],
        ];

  for (const [command, args] of commands) {
    const hosts = await tryCommand(command, args, port);
    if (hosts.length > 0) return hosts;
  }

  return [];
}

export function buildOllamaSecurityStatus({ baseUrl, version, listenHosts = [], platform = process.platform }) {
  const host = parseHostname(baseUrl);
  const usingLoopbackUrl = isLoopbackHostname(host);
  const hasVersion = Boolean(version);
  const versionSafe = hasVersion && compareSemver(version, MIN_SAFE_OLLAMA_VERSION) >= 0;
  const normalizedHosts = listenHosts.map(normalizeListenHost).filter(Boolean);
  const publicHosts = normalizedHosts.filter((listenHost) => PUBLIC_BIND_HOSTS.has(listenHost));
  const nonLoopbackHosts = normalizedHosts.filter(
    (listenHost) => !PUBLIC_BIND_HOSTS.has(listenHost) && !isLoopbackHostname(listenHost)
  );
  const localhostOnly =
    usingLoopbackUrl &&
    normalizedHosts.length > 0 &&
    publicHosts.length === 0 &&
    nonLoopbackHosts.length === 0;
  const unknownListener = usingLoopbackUrl && normalizedHosts.length === 0;
  const ok = versionSafe && localhostOnly;
  const warnings = [];

  if (!usingLoopbackUrl) {
    warnings.push("Ollama must be configured through 127.0.0.1 or localhost for Cerise Scholar.");
  }
  if (!hasVersion) {
    warnings.push("Cerise Scholar could not read the Ollama version.");
  } else if (!versionSafe) {
    warnings.push(`Update Ollama to ${MIN_SAFE_OLLAMA_VERSION} or newer before using local AI.`);
  }
  if (publicHosts.length > 0 || nonLoopbackHosts.length > 0) {
    warnings.push("Ollama appears reachable beyond this laptop. Restrict it to localhost before using local AI.");
  }
  if (unknownListener) {
    warnings.push("Cerise Scholar could not verify that Ollama is localhost-only.");
  }
  if (platform === "win32") {
    warnings.push("Windows users should keep Ollama updated before enabling local AI features.");
  }

  return {
    ok,
    minSafeVersion: MIN_SAFE_OLLAMA_VERSION,
    versionSafe,
    localhostOnly,
    usingLoopbackUrl,
    listenHosts: normalizedHosts,
    blockedEndpoints: BLOCKED_OLLAMA_ENDPOINTS,
    trustedPersonalLaptopRequired: true,
    warnings,
  };
}
