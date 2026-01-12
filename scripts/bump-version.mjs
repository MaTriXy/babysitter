#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const run = (cmd, fallback = "") => {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return fallback;
  }
};

const bumpVersion = (version, level) => {
  const [major, minor, patch] = version.split(".").map((n) => parseInt(n, 10));
  if ([major, minor, patch].some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid semver detected in package.json: ${version}`);
  }
  if (level === "major") return `${major + 1}.0.0`;
  if (level === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
};

const pkgPath = "package.json";
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const currentVersion = pkg.version;

const lastTag = run("git describe --tags --abbrev=0");
const logRange = lastTag ? `${lastTag}..HEAD` : "";
const logCmd = lastTag
  ? `git log ${logRange} --pretty=%s`
  : "git log -n 50 --pretty=%s";
const commits = run(logCmd, "");

let bumpTarget = "patch";
if (/#major\b/i.test(commits)) {
  bumpTarget = "major";
} else if (/#minor\b/i.test(commits)) {
  bumpTarget = "minor";
}

const newVersion = bumpVersion(currentVersion, bumpTarget);
pkg.version = newVersion;
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

const lockPath = "package-lock.json";
if (existsSync(lockPath)) {
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  if (lock.version) lock.version = newVersion;
  if (lock.packages && lock.packages[""]) {
    lock.packages[""].version = newVersion;
  }
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
}

const changelogPath = "CHANGELOG.md";
if (!existsSync(changelogPath)) {
  throw new Error("CHANGELOG.md is required to build release notes.");
}

const changelog = readFileSync(changelogPath, "utf8");
const unreleasedPattern = /## \[Unreleased\](?<body>[\s\S]*?)(?=^## \[|$)/m;
const matches = changelog.match(unreleasedPattern);
if (!matches || !matches.groups) {
  throw new Error('Unable to locate "## [Unreleased]" section in CHANGELOG.md.');
}

const unreleasedBody = matches.groups.body.trim();
const isPlaceholder = unreleasedBody === "" || unreleasedBody === "- No unreleased changes.";
const releaseBody = !isPlaceholder ? `${unreleasedBody}\n` : "- No notable changes.\n";
const placeholder = "- No unreleased changes.\n";
const isoDate = new Date().toISOString().split("T")[0];
const replacement = `## [Unreleased]\n\n${placeholder}\n\n## [${newVersion}] - ${isoDate}\n${releaseBody}\n`;
const updatedChangelog = changelog.replace(unreleasedPattern, replacement);
writeFileSync(changelogPath, updatedChangelog);

process.stdout.write(newVersion);
