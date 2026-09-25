#!/usr/bin/env node
"use strict";
// Style switcher: spinner styles and theme presets.
//
//   node style.js spinner list | next | <name>
//   node style.js theme   list | next | reset | <name>
//
// Spinner changes only touch this plugin's config.json and restart the daemon.
// Theme changes rewrite the [theme] tables of Herdr's config.toml, and only
// after `herdr config check` confirms the candidate adds no new diagnostics.
// The previous file is kept under backups/, and `theme reset` puts back the
// theme tables you had before the first apply.

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { SPINNERS, THEMES, themeToml } = require("./presets");
const { applyTheme, resetTheme, stripManaged } = require("./toml-theme");
const { configDir, configPath, readConfig } = require("./config");

const HERDR = process.env.HERDR_BIN_PATH || process.env.HERDR_BIN || "herdr";

function herdrConfigPath() {
  if (process.env.HERDR_CONFIG_PATH) return process.env.HERDR_CONFIG_PATH;
  const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(base, "herdr", "config.toml");
}

const statePath = (name) => path.join(configDir(), name);

function writeJson(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n");
}

function cycle(names, current) {
  const i = names.indexOf(current);
  return names[(i + 1) % names.length];
}

// ---- spinner -------------------------------------------------------------

function spinner(arg) {
  const cfg = readConfig();
  const names = Object.keys(SPINNERS);
  if (Array.isArray(cfg.frames) && cfg.frames.length) names.push("custom");
  const current = cfg.style || (names.includes("custom") ? "custom" : "braille");

  if (!arg || arg === "list") {
    for (const n of names) {
      const frames = n === "custom" ? cfg.frames : SPINNERS[n].frames;
      console.log(`${n === current ? "*" : " "} ${n.padEnd(9)} ${frames.join("")}`);
    }
    return;
  }
  const next = arg === "next" ? cycle(names, current) : arg;
  if (!names.includes(next)) throw new Error(`unknown spinner "${next}"; try: ${names.join(", ")}`);
  writeJson(configPath(), { ...cfg, style: next });
  const r = spawnSync("sh", [path.join(__dirname, "run.sh"), "--restart"], { stdio: "inherit" });
  if (r.status !== 0) throw new Error("spinner restart failed");
  console.log(`spinner: ${next}`);
}

// ---- theme ---------------------------------------------------------------

// Diagnostics lines from `herdr config check` against a given file.
function check(file) {
  const r = spawnSync(HERDR, ["config", "check"], {
    encoding: "utf8", timeout: 10000,
    env: { ...process.env, HERDR_CONFIG_PATH: file },
  });
  if (r.error) throw new Error(`cannot run ${HERDR}: ${r.error.message}`);
  const lines = `${r.stdout}${r.stderr}`.split("\n").map((l) => l.trim())
    .filter((l) => l && !l.startsWith("config:"));
  return { ok: r.status === 0, lines };
}

function writeChecked(target, text) {
  const cand = `${target}.hs-candidate`;
  fs.writeFileSync(cand, text);
  try {
    const before = fs.existsSync(target) ? check(target).lines : [];
    const after = check(cand);
    const added = after.lines.filter((l) => !before.includes(l));
    if (added.length) {
      throw new Error(`herdr config check rejected the change; config.toml untouched:\n  ${added.join("\n  ")}`);
    }
    if (fs.existsSync(target)) {
      const dir = statePath("backups");
      fs.mkdirSync(dir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      fs.copyFileSync(target, path.join(dir, `config.toml.${stamp}`));
    }
    fs.renameSync(cand, target);
  } finally {
    fs.rmSync(cand, { force: true });
  }
  // Best effort: a stopped server picks the file up on next start anyway.
  spawnSync(HERDR, ["server", "reload-config"], { stdio: "ignore", timeout: 10000 });
}

function currentTheme(text) {
  const m = text.match(/# active preset: (\S+)/);
  return m && stripManaged(text).managed ? m[1] : null;
}

function theme(arg) {
  const target = herdrConfigPath();
  const text = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  const names = Object.keys(THEMES);
  const current = currentTheme(text);

  if (!arg || arg === "list") {
    for (const n of names) console.log(`${n === current ? "*" : " "} ${n.padEnd(10)} on ${THEMES[n].base}`);
    if (!current) console.log("  (no preset active - your own [theme] is in charge)");
    return;
  }
  if (arg === "reset") {
    const origFile = statePath("theme-original.toml");
    const original = fs.existsSync(origFile) ? fs.readFileSync(origFile, "utf8") : "";
    if (!stripManaged(text).managed) { console.log("theme: nothing to reset"); return; }
    writeChecked(target, resetTheme(text, original));
    console.log("theme: restored your original theme");
    return;
  }
  const next = arg === "next" ? cycle(names, current) : arg;
  if (!THEMES[next]) throw new Error(`unknown theme "${next}"; try: ${names.join(", ")}`);
  const { text: out, original } = applyTheme(text, `# active preset: ${next}\n${themeToml(next)}`);
  // Save before writing, so a crash between the two can never lose the original.
  if (original !== null) {
    fs.mkdirSync(configDir(), { recursive: true });
    fs.writeFileSync(statePath("theme-original.toml"), original ? original + "\n" : "");
  }
  writeChecked(target, out);
  console.log(`theme: ${next}`);
}

// ---- main ----------------------------------------------------------------

const [kind, arg] = process.argv.slice(2);
try {
  if (kind === "spinner") spinner(arg);
  else if (kind === "theme") theme(arg);
  else {
    console.log("usage: style.js spinner [list|next|<name>]\n       style.js theme [list|next|reset|<name>]");
    process.exit(kind ? 1 : 0);
  }
} catch (e) {
  console.error(`herdr-spinner: ${e.message}`);
  process.exit(1);
}
