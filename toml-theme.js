"use strict";
// Pure text surgery on Herdr's config.toml: swap the theme tables for a
// managed block without touching anything else. No TOML dependency - we only
// need to find table headers, and a reparse by `herdr config check` guards
// every write.

const BEGIN = "# >>> hasuwini77.spinner theme (managed - `theme reset` restores your original) >>>";
const END = "# <<< hasuwini77.spinner theme <<<";

const HEADER = /^\s*\[\[?\s*([^\]]+?)\s*\]\]?\s*(#.*)?$/;
const isThemeTable = (name) => name === "theme" || name.startsWith("theme.");

// Net [ minus ] on a line, ignoring strings and comments. Lets us skip lines
// inside multi-line arrays, where `["tab"]` would otherwise look like a header.
function bracketDelta(line) {
  let d = 0;
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quote) {
      if (c === "\\" && quote === '"') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === "#") break;
    else if (c === "[") d++;
    else if (c === "]") d--;
  }
  return d;
}

function stripManaged(text) {
  const lines = text.split("\n");
  const out = [];
  let inside = false;
  let found = false;
  for (const line of lines) {
    if (line.trim() === BEGIN) { inside = true; found = true; continue; }
    if (inside && line.trim() === END) { inside = false; continue; }
    if (!inside) out.push(line);
  }
  return { text: out.join("\n"), managed: found };
}

// Pull every [theme] / [theme.*] table out of the text. Returns the remaining
// text and the extracted tables verbatim.
function extractTheme(text) {
  const lines = text.split("\n");
  const rest = [];
  const theme = [];
  let table = null; // null = root
  let depth = 0; // open brackets of a multi-line value
  for (const line of lines) {
    const m = depth === 0 && line.match(HEADER);
    if (m) table = m[1].replace(/\s+/g, "").replace(/"/g, "");
    else depth += bracketDelta(line);
    if (table === null && depth === 0 && /^\s*"?theme"?\s*[.=]/.test(line)) {
      throw new Error("config.toml sets theme with a root-level key; move it into a [theme] table first");
    }
    (table !== null && isThemeTable(table) ? theme : rest).push(line);
  }
  return { rest: rest.join("\n"), theme: theme.join("\n").trim() };
}

// Returns { text, original } where `original` is the user's own theme tables
// when this is the first managed apply (null when a managed block already
// existed, i.e. the original was saved earlier).
function applyTheme(text, blockToml) {
  const { text: unmanaged, managed } = stripManaged(text);
  const { rest, theme } = extractTheme(unmanaged);
  const body = rest.replace(/\s+$/, "");
  const block = [BEGIN, blockToml.trim(), END].join("\n");
  return {
    text: (body ? body + "\n\n" : "") + block + "\n",
    original: managed ? null : theme,
  };
}

function resetTheme(text, original) {
  const { text: unmanaged } = stripManaged(text);
  const body = unmanaged.replace(/\s+$/, "");
  const orig = (original || "").trim();
  if (!orig) return body ? body + "\n" : "";
  return (body ? body + "\n\n" : "") + orig + "\n";
}

module.exports = { BEGIN, END, stripManaged, extractTheme, applyTheme, resetTheme };
