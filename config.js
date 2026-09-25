"use strict";
// Where this plugin keeps its config.json. Herdr injects HERDR_PLUGIN_CONFIG_DIR
// for hooks and actions; the fallback covers running the scripts by hand.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const PLUGIN_ID = "hasuwini77.spinner";

function configDir() {
  if (process.env.HERDR_PLUGIN_CONFIG_DIR) return process.env.HERDR_PLUGIN_CONFIG_DIR;
  const base = process.env.HERDR_CONFIG_DIR ||
    path.join(os.homedir(), ".config", "herdr");
  return path.join(base, "plugins", "config", PLUGIN_ID);
}

const configPath = () => path.join(configDir(), "config.json");

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf8"));
  } catch {
    return {};
  }
}

module.exports = { PLUGIN_ID, configDir, configPath, readConfig };
