"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { logoFor, LOGOS } = require("../spinner");

test("known agents get their mark", () => {
  assert.equal(logoFor("claude"), "✻");
  assert.equal(logoFor("codex"), ">_");
  assert.equal(logoFor("gemini"), "✦");
});

test("an unknown agent falls back to its name", () => {
  assert.equal(logoFor("pi"), "pi");
  assert.equal(logoFor(undefined), "");
});

test("config marks override the built-in ones", () => {
  assert.equal(logoFor("claude", { ...LOGOS, claude: "C" }), "C");
});
