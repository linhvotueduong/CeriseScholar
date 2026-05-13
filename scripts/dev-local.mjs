import { spawn } from "node:child_process";

const forwardedArgs = process.argv.slice(2);
const nextArgs = forwardedArgs.length
  ? ["run", "dev", "--", ...forwardedArgs]
  : ["run", "dev", "--", "-p", process.env.NEXT_PORT || "3000"];

const children = [
  spawn("npm", ["run", "local-agent"], {
    stdio: "inherit",
    env: process.env,
  }),
  spawn("npm", nextArgs, {
    stdio: "inherit",
    env: process.env,
  }),
];

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) child.kill("SIGTERM");
  }
  setTimeout(() => process.exit(code), 250);
}

for (const child of children) {
  child.on("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      shutdown(code || 1);
    }
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
