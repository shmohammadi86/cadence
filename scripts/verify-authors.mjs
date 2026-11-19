#!/usr/bin/env node
// Hard rule (AGENTS.md §1): every Cadence commit is authored
// "Shahin Mohammadi <mohammadi@cytognosis.org>".
// Usage: node scripts/verify-authors.mjs [git-range]  (default: HEAD)
import { execFileSync } from "node:child_process";

const EXPECTED = "Shahin Mohammadi <mohammadi@cytognosis.org>";
const range = process.argv[2] ?? "HEAD";
const out = execFileSync("git", ["log", "--format=%an <%ae>", range], { encoding: "utf8" })
  .split("\n").filter(Boolean);
const bad = out.filter((a) => a !== EXPECTED);
if (bad.length) {
  console.error(`✗ ${bad.length} commit(s) with wrong author:\n` + [...new Set(bad)].join("\n"));
  process.exit(1);
}
console.log(`✓ ${out.length} commit(s) authored ${EXPECTED}`);
