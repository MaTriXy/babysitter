#!/usr/bin/env node
import { readFileSync } from "node:fs";

const changelogPath = "CHANGELOG.md";
const changelog = readFileSync(changelogPath, "utf8");

const pattern = /^## \[(\d+\.\d+\.\d+)\][^\n]*\n([\s\S]*?)(?=^## \[|$)/m;
const match = changelog.match(pattern);
if (!match) {
  throw new Error("Unable to locate the latest version section in CHANGELOG.md.");
}

const body = match[2].trim();
process.stdout.write(body.length > 0 ? `${body}\n` : "No notable changes.\n");
