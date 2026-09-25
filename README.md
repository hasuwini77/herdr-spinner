# Herdr Agent Spinner

Animated spinners for Herdr panes in the `working` state — **13 styles** — plus
**6 theme presets** layered on Herdr's built-in themes. Restyle the sidebar;
Herdr keeps working exactly as before.

![state](https://img.shields.io/badge/herdr-%3E%3D0.8.0-blue) ![license](https://img.shields.io/badge/license-MIT-green) [![ci](https://github.com/hasuwini77/herdr-spinner/actions/workflows/ci.yml/badge.svg)](https://github.com/hasuwini77/herdr-spinner/actions/workflows/ci.yml)

## Why

Herdr renders agent status as a **static** glyph. In `src/ui/status.rs`,
`state_icon_symbol` returns one character per state with no frame cycling:

| state          | `dots` | `symbols` |
| -------------- | ------ | --------- |
| blocked        | `●`    | `×`       |
| **working**    | `●`    | `◐`       |
| idle (unseen)  | `●`    | `✓`       |
| idle (seen)    | `○`    | `○`       |
| unknown        | `·`    | `·`       |

With several agents running, a static `◐` is easy to lose in the column — a
spinner is the conventional "this one is actually moving" signal, and it reads
at a glance in a way a still glyph does not.

This plugin adds that motion **without patching Herdr**. It uses only the
public surface:

```
herdr pane report-metadata <pane> --source hasuwini77.spinner --token spin=⣾ --ttl-ms 1280
```

which feeds the `$spin` token you reference from `ui.sidebar.agents.rows`.

## Install

```sh
git clone https://github.com/hasuwini77/herdr-spinner ~/dev/herdr-spinner
herdr plugin link ~/dev/herdr-spinner
```

Then add `$spin` to your agent rows in `~/.config/herdr/config.toml`:

```toml
[ui.sidebar.agents]
rows = [
  [{ token = "workspace", bold = false }, "tab"],
  [{ token = "$spin", fg = "#fab387", dim = false, bold = true }, { token = "state_text", bold = false, dim = false }, "agent"],
]
```

Two things matter here:

- **`$spin` needs an explicit `fg`.** It is a custom token with no state colour
  of its own, and without `dim = false` it inherits the row's dim context and
  renders grey. Sidebar token `fg` is **hex only** — named colours such as
  `"yellow"` fail `herdr config check` with
  `data did not match any variant of untagged enum RawSidebarToken`.
- **`state_text` deliberately has no `fg`,** so it keeps Herdr's per-state
  colouring (working/blocked/done/idle each get their own).

`state_icon` is dropped entirely — the animated spinner replaces the static
half circle. Keep it if you prefer a stable column for non-working states.

```sh
herdr config check && herdr server reload-config
```

The spinner starts with the session. To drive it manually:

```sh
herdr plugin action invoke restart --plugin hasuwini77.spinner
herdr plugin action invoke stop    --plugin hasuwini77.spinner
```

## Styles

Switch from Herdr's action menu, or from a shell:

| action                      | shell                                                       |
| --------------------------- | ----------------------------------------------------------- |
| Next spinner style          | `sh run.sh --style spinner next` (or `spinner <name>`)      |
| Next theme preset           | `sh run.sh --style theme next` (or `theme <name>`)          |
| Restore my original theme   | `sh run.sh --style theme reset`                             |

`--style spinner list` and `--style theme list` show what's available and
which one is active. Run the shell forms from the plugin directory.

### Spinners

| style      | frames            | style      | frames            |
| ---------- | ----------------- | ---------- | ----------------- |
| `braille`* | `⣾⣽⣻⢿⡿⣟⣯⣷`        | `square`   | `◰◳◲◱`            |
| `dots`     | `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`      | `triangle` | `◢◣◤◥`            |
| `bounce`   | `⠁⠂⠄⡀⢀⠠⠐⠈`        | `arrow`    | `←↖↑↗→↘↓↙`        |
| `line`     | `-\\|/`          | `pulse`    | `·•●•`            |
| `arc`      | `◜◠◝◞◡◟`          | `bars`     | `▁▂▃▄▅▆▇█▇▆▅▄▃▂`  |
| `circle`   | `◐◓◑◒`            | `star`     | `✶✸✹✺✹✷`          |
| `toggle`   | `⊶⊷`              |            |                   |

\* default. Every frame is one terminal cell, so rows never jitter.

### Theme presets

| preset      | on top of      | mood                                  |
| ----------- | -------------- | ------------------------------------- |
| `nocturne`  | `tokyo-night`  | near-black, violet accent — matches [Noctu](https://github.com/hasuwini77/ccstatusline-nocturne) |
| `synthwave` | `dracula`      | hot pink and cyan                      |
| `matrix`    | `one-dark`     | phosphor green                         |
| `ember`     | `gruvbox`      | warm orange                            |
| `glacier`   | `nord`         | icy blues                              |
| `mono`      | `one-dark`     | greyscale — except red, so blocked still shouts |

Want just the colours? `node -e 'console.log(require("./presets").themeToml("ember"))'`
prints the TOML to paste yourself.

**How a theme is applied, safely:** your `[theme]` tables are moved into a
managed block at the end of `config.toml`; nothing else in the file changes.
The candidate file goes through `herdr config check` first and is only written
if it adds no new diagnostics. The previous file is copied to
`backups/` in the plugin config dir, then `herdr server reload-config` applies
it live. `theme reset` removes the block and puts your original tables back.

## Configuration

Optional, at `~/.config/herdr/plugins/config/hasuwini77.spinner/config.json`
(find it with `herdr plugin config-dir hasuwini77.spinner`):

```json
{
  "style": "braille",
  "intervalMs": 160,
  "pollMs": 1000,
  "animateStates": ["working"],
  "enabled": true
}
```

`style` picks a spinner. For your own glyphs, drop `style` and set
`"frames": ["a", "b", ...]` instead (the v0.1 config keeps working as is).

`intervalMs` defaults to each style's own pace (160ms, 6.25fps, for braille)
on purpose — see Cost. Set it to override every style.

## Cost

Each frame is one `herdr pane report-metadata` call per animating pane
(~4ms measured). On this machine, with **3 panes working at 6.25fps**:

| process        | CPU (one core) |
| -------------- | -------------- |
| spinner daemon | 1.5%           |
| herdr server   | +2.9% over its 5.3% baseline |

So roughly **1% of a core per working pane**. Idle, blocked, and done panes
cost nothing — only `working` panes are animated. Raising `intervalMs` lowers
this proportionally.

For context, herdrdev/herdr#1862 treated ~20% sustained server CPU as a bug,
so the interval default is deliberately conservative rather than 60fps-smooth.

## Troubleshooting

Working panes show no spinner? Check in this order:

1. **Is a frame being published?** `herdr pane list | grep spin` — a working
   pane should carry `"tokens":{"spin":"⣽"}`, changing between calls.
2. **Is the plugin enabled?** `herdr plugin list`. A disabled plugin, or a
   stale copy (e.g. a demo linked from `/tmp`) enabled in its place, leaves
   `$spin` empty. Fix: `herdr plugin enable hasuwini77.spinner`.
3. **Is the daemon running?** It starts with the Herdr server. After enabling
   mid-session, start it with
   `herdr plugin action invoke restart --plugin hasuwini77.spinner`.
4. **Does your row template use the token?** `[ui.sidebar.agents] rows` must
   contain `$spin` — see Install.
5. **Does `herdr` on PATH match the server?** The daemon calls the `herdr`
   CLI. If it is older than the running server (`protocol_mismatch`), every
   frame is rejected. Point PATH or `HERDR_BIN` at the matching binary.

## Design notes

- **Self-healing.** Every token carries `--ttl-ms` (8 frames). If the daemon is
  killed, tokens expire on their own instead of freezing a glyph in the sidebar.
  `SIGTERM`/`SIGINT`/`SIGHUP` clear them explicitly first.
- **Singleton.** `run.sh` keeps a pidfile and stops any previous daemon before
  starting. Herdr can fire the startup hook more than once (session restore,
  live handoff) and two daemons would fight over the same token.
- **Transient failures are ignored.** If `herdr api snapshot` fails, the last
  known working set is kept rather than clearing every spinner on one blip.

## Known limitation

Herdr documents startup hooks as *"one-shot initialization commands rather than
supervised daemons"*. This plugin needs a persistent process to animate, so
`run.sh` detaches and exits immediately, leaving the daemon running outside
Herdr's supervision. It works, and the pidfile plus TTL keep it tidy — but a
native implementation inside Herdr would be strictly better, and much cheaper:
herdrdev/herdr#1868 already built a sidebar-only redraw path for animation
frames, so the expensive part is the per-frame process spawn this plugin cannot
avoid from outside.

## License

MIT © 2026 Edwin (hasuwini77)
