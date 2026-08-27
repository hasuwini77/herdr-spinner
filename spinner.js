#!/usr/bin/env node
"use strict";
// Animated spinner for Herdr panes in the `working` state.
//
// Herdr 0.8.2 renders agent status as a STATIC glyph (src/ui/status.rs,
// state_icon_symbol) - "◐" in symbols mode, "●" in dots mode. Neither animates.
// This daemon fills that gap using only the supported public surface:
//   herdr pane report-metadata <pane> --source <id> --token spin=<frame>
// which feeds the `$spin` token referenced from ui.sidebar.agents.rows.
//
// Nothing is patched; if the daemon dies, --ttl-ms expires every token it set.

const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const PLUGIN_ID = "hasuwini77.spinner";
const HERDR = process.env.HERDR_BIN || "herdr";
const TOKEN = "spin";

const DEFAULTS = {
  // Braille ring: reads as motion even at a low frame rate.
  frames: ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"],
  // 160ms = 6.25fps. Deliberately calm: each frame costs one `herdr` spawn per
  // working pane (~4ms measured), and herdrdev/herdr#1862 shows the maintainers
  // treat sustained server CPU as a real defect. Fast enough to read as motion.
  intervalMs: 160,
  // How often to re-ask which panes are working. Cheap relative to frames.
  pollMs: 1000,
  // Only these states get a spinner.
  animateStates: ["working"],
  enabled: true,
};

function configPath() {
  const base = process.env.HERDR_CONFIG_DIR ||
    path.join(os.homedir(), ".config", "herdr");
  return path.join(base, "plugins", "config", PLUGIN_ID, "config.json");
}

function loadConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath(), "utf8"));
    const cfg = { ...DEFAULTS, ...raw };
    // A malformed frame list would render an empty column forever; fall back.
    if (!Array.isArray(cfg.frames) || cfg.frames.length === 0) {
      cfg.frames = DEFAULTS.frames;
    }
    cfg.intervalMs = Math.max(40, Number(cfg.intervalMs) || DEFAULTS.intervalMs);
    cfg.pollMs = Math.max(250, Number(cfg.pollMs) || DEFAULTS.pollMs);
    return cfg;
  } catch {
    return { ...DEFAULTS };
  }
}

const cfg = loadConfig();
// TTL outlives one frame but expires fast if we are killed, so a crashed daemon
// never leaves a frozen glyph pinned in the sidebar.
const TTL_MS = Math.max(1000, cfg.intervalMs * 8);

function snapshotAgents() {
  const r = spawnSync(HERDR, ["api", "snapshot"], {
    encoding: "utf8", timeout: 4000,
  });
  if (r.status !== 0 || !r.stdout) return null;
  try {
    return JSON.parse(r.stdout).result.snapshot.agents || [];
  } catch {
    return null;
  }
}

function report(paneId, args) {
  // Detached + ignored stdio: a slow socket must never stall the frame loop.
  const p = spawn(HERDR, ["pane", "report-metadata", paneId, "--source", PLUGIN_ID, ...args],
    { stdio: "ignore", detached: false });
  p.on("error", () => {});
}

const setFrame = (pane, frame) =>
  report(pane, ["--token", `${TOKEN}=${frame}`, "--ttl-ms", String(TTL_MS)]);
const clearFrame = (pane) => report(pane, ["--clear-token", TOKEN]);

let working = [];
let tick = 0;
let stopping = false;

function poll() {
  if (stopping) return;
  const agents = snapshotAgents();
  if (agents === null) return; // transient socket failure: keep last known set
  const next = agents
    .filter((a) => cfg.animateStates.includes(a.agent_status))
    .map((a) => a.pane_id);
  for (const pane of working) if (!next.includes(pane)) clearFrame(pane);
  working = next;
}

function frame() {
  if (stopping || working.length === 0) return;
  const glyph = cfg.frames[tick++ % cfg.frames.length];
  for (const pane of working) setFrame(pane, glyph);
}

function shutdown() {
  if (stopping) return;
  stopping = true;
  for (const pane of working) clearFrame(pane);
  // Give the clear calls a moment to reach the socket before we exit.
  setTimeout(() => process.exit(0), 200);
}

if (!cfg.enabled) process.exit(0);

for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, shutdown);
process.on("exit", () => { for (const pane of working) clearFrame(pane); });

poll();
setInterval(poll, cfg.pollMs);
setInterval(frame, cfg.intervalMs);
