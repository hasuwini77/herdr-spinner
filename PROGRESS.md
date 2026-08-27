# Progress

## 2026-08-27 — animated spinner for working agents

**Wanted:** the agents sidebar showed a static `◐` for a working pane. With
several agents running it was hard to see at a glance which one was actually
moving. Goal was a loading spinner plus the literal word "working".

**What was already possible without this plugin:**

- `state_text` is a built-in sidebar row token — it renders the literal state
  word (`working`, `blocked`, `done`, `idle`, `unknown`). Adding it to
  `ui.sidebar.agents.rows` covers the "working" half of the ask.
- Agent-panel tokens render bolder than the Spaces panel above by default.
  Setting `bold = false` explicitly on a token overrides that; omitting `fg`
  is important, since setting a colour flattens the per-state colouring.

**Why a plugin was needed for the spinner:** Herdr has no animated status
indicator in any mode. Confirmed three ways — the bundled config template says
`symbols` uses "distinct **static** glyphs"; there are no spinner frame arrays
in the binary for the sidebar; and `state_icon_symbol` in `src/ui/status.rs`
returns a single static char per state with no frame cycling.

Two dead ends ruled out first:

- **Binary patching** — animation needs a timer, frame index, and redraw loop.
  That is code, not a glyph swap, so patching the stripped 24MB Rust binary
  could never produce it.
- **Reusing Claude Code's own spinner** — `terminal_title` carries `◐ Claude
  Code`, so it looked like a free animation source. Sampled it 6 times over
  7.5s: frozen. Claude stamps the glyph once and does not rotate it in the
  title. Idea killed by measurement.

**Fix:** a plugin that pushes an animating `$spin` token via the supported
`herdr pane report-metadata --token` API, referenced from the sidebar rows.
Nothing is patched. Only panes in `working` are animated.

**Cost measured:** ~1% of one core per working pane. With 3 panes at 6.25fps,
the daemon used 1.5% and the herdr server went 5.3% → 8.2%. Frame interval
defaults to a conservative 160ms because herdrdev/herdr#1862 treated sustained
server CPU as a real defect.

**Verified:** frames cycling in `herdr api snapshot` on working panes only;
idle/blocked/done panes untouched; `--stop` and daemon death both clear every
token (TTL failsafe); `herdr plugin link` and `herdr plugin action invoke`
drive it end to end.
