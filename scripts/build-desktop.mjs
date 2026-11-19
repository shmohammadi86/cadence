#!/usr/bin/env node
// One entry point for local + CI desktop builds (YAR pattern).
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });
if (process.argv.includes("--doctor")) {
  for (const cmd of ["node --version", "pnpm --version", "cargo --version"]) {
    try { process.stdout.write(`${cmd.split(" ")[0]}: `); run(cmd); }
    catch { console.error(`✗ missing: ${cmd.split(" ")[0]}`); process.exitCode = 1; }
  }
} else {
  run("pnpm tauri build");
}
