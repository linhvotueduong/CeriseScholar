import assert from "node:assert/strict";
import {
  BLOCKED_OLLAMA_ENDPOINTS,
  MIN_SAFE_OLLAMA_VERSION,
  buildOllamaSecurityStatus,
  compareSemver,
} from "./local-ollama-security.mjs";

assert.equal(compareSemver("0.23.2", MIN_SAFE_OLLAMA_VERSION) > 0, true);
assert.equal(compareSemver("0.17.1", MIN_SAFE_OLLAMA_VERSION), 0);
assert.equal(compareSemver("0.16.9", MIN_SAFE_OLLAMA_VERSION) < 0, true);

const safe = buildOllamaSecurityStatus({
  baseUrl: "http://127.0.0.1:11434/api",
  version: "0.23.2",
  listenHosts: ["127.0.0.1"],
});
assert.equal(safe.ok, true);
assert.equal(safe.versionSafe, true);
assert.equal(safe.localhostOnly, true);

const outdated = buildOllamaSecurityStatus({
  baseUrl: "http://127.0.0.1:11434/api",
  version: "0.16.9",
  listenHosts: ["127.0.0.1"],
});
assert.equal(outdated.ok, false);
assert.equal(outdated.versionSafe, false);

const publicBind = buildOllamaSecurityStatus({
  baseUrl: "http://127.0.0.1:11434/api",
  version: "0.23.2",
  listenHosts: ["0.0.0.0"],
});
assert.equal(publicBind.ok, false);
assert.equal(publicBind.localhostOnly, false);

const remoteBaseUrl = buildOllamaSecurityStatus({
  baseUrl: "http://192.168.1.30:11434/api",
  version: "0.23.2",
  listenHosts: ["127.0.0.1"],
});
assert.equal(remoteBaseUrl.ok, false);
assert.equal(remoteBaseUrl.usingLoopbackUrl, false);

assert.deepEqual(BLOCKED_OLLAMA_ENDPOINTS, ["/api/create", "/api/blobs", "/api/push"]);

console.log("Ollama security gate checks passed.");
