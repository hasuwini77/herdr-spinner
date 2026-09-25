"use strict";
// Built-in spinner styles and theme presets.
//
// Spinner frames are single-cell glyphs only: a double-width emoji would shove
// every row after the $spin token one column right on each frame.

const SPINNERS = {
  braille:  { frames: ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"], intervalMs: 160 },
  dots:     { frames: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"], intervalMs: 100 },
  bounce:   { frames: ["⠁", "⠂", "⠄", "⡀", "⢀", "⠠", "⠐", "⠈"], intervalMs: 120 },
  line:     { frames: ["-", "\\", "|", "/"], intervalMs: 130 },
  arc:      { frames: ["◜", "◠", "◝", "◞", "◡", "◟"], intervalMs: 120 },
  circle:   { frames: ["◐", "◓", "◑", "◒"], intervalMs: 160 },
  square:   { frames: ["◰", "◳", "◲", "◱"], intervalMs: 160 },
  triangle: { frames: ["◢", "◣", "◤", "◥"], intervalMs: 140 },
  arrow:    { frames: ["←", "↖", "↑", "↗", "→", "↘", "↓", "↙"], intervalMs: 120 },
  pulse:    { frames: ["·", "•", "●", "•"], intervalMs: 180 },
  bars:     { frames: ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█", "▇", "▆", "▅", "▄", "▃", "▂"], intervalMs: 90 },
  star:     { frames: ["✶", "✸", "✹", "✺", "✹", "✷"], intervalMs: 140 },
  toggle:   { frames: ["⊶", "⊷"], intervalMs: 250 },
};

// Each preset picks one of Herdr's built-in themes as a base and overrides
// tokens through [theme.custom]. Backgrounds of panes are left alone so the
// host terminal still owns the canvas; only sidebar surfaces are recoloured.
const THEMES = {
  nocturne: {
    base: "tokyo-night",
    colors: {
      accent: "#7C5CFF", sidebar_bg: "#0B0E14", active_row_bg: "#161B26", selection_bg: "#1F2635",
      surface0: "#161B26", surface1: "#1F2635", overlay0: "#79808E", text: "#C6CCDA", subtext0: "#8F96A6",
      mauve: "#B69CFF", green: "#3E8E5A", yellow: "#E6B34A", red: "#FF6B6B", blue: "#5B9BE8",
      teal: "#2E9E7A", peach: "#E8903C",
    },
  },
  synthwave: {
    base: "dracula",
    colors: {
      accent: "#FF2E97", active_row_bg: "#2A2139", selection_bg: "#34294F",
      surface0: "#2A2139", surface1: "#34294F", overlay0: "#7E6A9E", text: "#F4EEFF", subtext0: "#B6B1C9",
      mauve: "#C74DED", green: "#72F1B8", yellow: "#FEDE5D", red: "#FE4450", blue: "#36F9F6",
      teal: "#72F1B8", peach: "#FF8B39",
    },
  },
  matrix: {
    base: "one-dark",
    colors: {
      accent: "#00FF41", active_row_bg: "#0F1F12", selection_bg: "#173020",
      surface0: "#0F1F12", surface1: "#173020", overlay0: "#2F6B3A", text: "#C8FFD4", subtext0: "#6FBF7F",
      mauve: "#5CFF9D", green: "#00FF41", yellow: "#B8FF3D", red: "#FF3B3B", blue: "#3DDCB4",
      teal: "#00C832", peach: "#9DFF6A",
    },
  },
  ember: {
    base: "gruvbox",
    colors: {
      accent: "#FF7A1A", active_row_bg: "#2A1C14", selection_bg: "#3A281C",
      surface0: "#2A1C14", surface1: "#3A281C", overlay0: "#7A5C45", text: "#F2E3D0", subtext0: "#BFA88F",
      mauve: "#D98BB4", green: "#9BBF5A", yellow: "#FFC857", red: "#E5484D", blue: "#7AA7C7",
      teal: "#6FB3A8", peach: "#FF9E4A",
    },
  },
  glacier: {
    base: "nord",
    colors: {
      accent: "#7FDBFF", active_row_bg: "#1B2533", selection_bg: "#243245",
      surface0: "#1B2533", surface1: "#243245", overlay0: "#5B6E86", text: "#E6F1FF", subtext0: "#A7B8CC",
      mauve: "#B7A8FF", green: "#9FE0B0", yellow: "#EBD98C", red: "#FF8FA3", blue: "#7FB8FF",
      teal: "#7FE3D6", peach: "#FFB38A",
    },
  },
  // Greyscale, except red: a blocked agent must still shout.
  mono: {
    base: "one-dark",
    colors: {
      accent: "#FFFFFF", active_row_bg: "#1C1C1C", selection_bg: "#2A2A2A",
      surface0: "#1C1C1C", surface1: "#2A2A2A", overlay0: "#6B6B6B", text: "#E4E4E4", subtext0: "#9A9A9A",
      mauve: "#BDBDBD", green: "#D0D0D0", yellow: "#F0F0F0", red: "#FF5F5F", blue: "#B0B0B0",
      teal: "#C4C4C4", peach: "#DADADA",
    },
  },
};

function themeToml(name) {
  const t = THEMES[name];
  if (!t) throw new Error(`unknown theme "${name}"`);
  const lines = ["[theme]", `name = "${t.base}"`, "", "[theme.custom]"];
  for (const [k, v] of Object.entries(t.colors)) lines.push(`${k} = "${v}"`);
  return lines.join("\n");
}

module.exports = { SPINNERS, THEMES, themeToml };
