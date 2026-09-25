"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { SPINNERS, THEMES, themeToml } = require("../presets");
const { loadConfig } = require("../spinner");

test("spinner frames are single code points", () => {
  for (const [name, s] of Object.entries(SPINNERS)) {
    assert.ok(s.frames.length >= 2, name);
    for (const f of s.frames) assert.equal([...f].length, 1, `${name}: ${f}`);
  }
});

test("default config is still the v0.1 braille ring at 160ms", () => {
  const cfg = loadConfig({});
  assert.deepEqual(cfg.frames, SPINNERS.braille.frames);
  assert.equal(cfg.intervalMs, 160);
});

test("v0.1 custom frames keep working; style and intervalMs override", () => {
  assert.deepEqual(loadConfig({ frames: ["a", "b"] }).frames, ["a", "b"]);
  assert.deepEqual(loadConfig({ style: "arc", frames: ["a"] }).frames, SPINNERS.arc.frames);
  assert.equal(loadConfig({ style: "arc" }).intervalMs, SPINNERS.arc.intervalMs);
  assert.equal(loadConfig({ style: "arc", intervalMs: 80 }).intervalMs, 80);
  assert.deepEqual(loadConfig({ style: "nope" }).frames, SPINNERS.braille.frames);
});

// Every preset must pass the real validator. Skipped where herdr is absent (CI).
const herdr = process.env.HERDR_BIN || "herdr";
const hasHerdr = spawnSync(herdr, ["--version"]).status === 0;

test("every theme preset passes `herdr config check`", { skip: !hasHerdr && "herdr not installed" }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hs-theme-"));
  for (const name of Object.keys(THEMES)) {
    const file = path.join(dir, `${name}.toml`);
    fs.writeFileSync(file, themeToml(name) + "\n");
    const r = spawnSync(herdr, ["config", "check"], {
      encoding: "utf8", env: { ...process.env, HERDR_CONFIG_PATH: file },
    });
    assert.equal(r.status, 0, `${name}: ${r.stdout}${r.stderr}`);
  }
  fs.rmSync(dir, { recursive: true });
});
