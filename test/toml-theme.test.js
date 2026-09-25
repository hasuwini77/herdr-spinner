"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { applyTheme, resetTheme, extractTheme, BEGIN, END } = require("../toml-theme");

const USER = `onboarding = false

[theme]
name = "nord"

[theme.custom]
accent = "#123456"

[ui.sidebar.agents]
rows = [
  ["tab"],
  [{ token = "$spin", fg = "#fab387" }, "agent"],
]

[keys]
prefix = "ctrl+b"
`;

test("apply moves user theme tables out and appends a managed block", () => {
  const { text, original } = applyTheme(USER, '[theme]\nname = "dracula"');
  assert.match(original, /name = "nord"/);
  assert.match(original, /accent = "#123456"/);
  assert.doesNotMatch(text, /nord|#123456/);
  assert.match(text, /\[keys\]\nprefix = "ctrl\+b"/);
  assert.ok(text.trimEnd().endsWith(END));
  assert.equal(text.split(BEGIN).length, 2);
});

test("lines inside a multi-line array are not mistaken for headers", () => {
  const { rest } = extractTheme(USER);
  assert.match(rest, /\["tab"\],/);
  assert.match(rest, /\[keys\]/);
});

test("re-apply replaces the managed block and keeps the saved original", () => {
  const first = applyTheme(USER, '[theme]\nname = "dracula"');
  const second = applyTheme(first.text, '[theme]\nname = "gruvbox"');
  assert.equal(second.original, null);
  assert.doesNotMatch(second.text, /dracula/);
  assert.equal(second.text.split(BEGIN).length, 2);
});

test("reset restores the original theme tables", () => {
  const { text, original } = applyTheme(USER, '[theme]\nname = "dracula"');
  const back = resetTheme(text, original);
  assert.doesNotMatch(back, /dracula|>>>/);
  assert.match(back, /\[theme\]\nname = "nord"/);
  assert.match(back, /\[keys\]/);
});

test("config without a theme resets to no theme", () => {
  const plain = '[keys]\nprefix = "ctrl+b"\n';
  const { text, original } = applyTheme(plain, '[theme]\nname = "dracula"');
  assert.equal(original, "");
  assert.equal(resetTheme(text, original), plain);
});

test("root-level theme keys are refused, not silently duplicated", () => {
  assert.throws(() => applyTheme('theme.name = "nord"\n', "[theme]"), /root-level/);
});
