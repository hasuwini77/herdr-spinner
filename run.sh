#!/bin/sh
# Entrypoint for every hook in herdr-plugin.toml. Herdr spawns argv directly
# (no shell), so this launcher exists to find a real Node.js binary even on
# machines where node is only available through a version manager like nvm.
#
# Also enforces a singleton: Herdr may fire the startup hook more than once
# (server reload, reattach), and two daemons would fight over the same token.
set -eu

dir=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
state="${XDG_RUNTIME_DIR:-/tmp}/herdr-spinner.pid"

stop_existing() {
  # Kill by script path, not just the pidfile. Herdr can fire the startup hook
  # concurrently with a manual action; the pidfile only remembers the most
  # recent start, so a pidfile-only stop leaks the other daemon. Two daemons
  # double the CPU and fight over the same token.
  dir_esc=$1
  pkill -TERM -f "$dir_esc/spinner.js" 2>/dev/null || true
  old=$(cat "$state" 2>/dev/null || true)
  if [ -n "${old:-}" ] && kill -0 "$old" 2>/dev/null; then
    kill -TERM "$old" 2>/dev/null || true
  fi
  rm -f "$state"
  # Let SIGTERM handlers clear their tokens before we start a replacement.
  sleep 1
}

case "${1:-}" in
  --stop) stop_existing "$dir"; exit 0 ;;
  --restart) stop_existing "$dir" ;;
  *) stop_existing "$dir" ;;
esac

node_bin="${HERDR_SPINNER_NODE:-}"
if [ -z "$node_bin" ] && command -v node >/dev/null 2>&1; then
  node_bin=node
fi
if [ -z "$node_bin" ]; then
  for cand in "$HOME"/.nvm/versions/node/*/bin/node /usr/local/bin/node /opt/homebrew/bin/node; do
    [ -x "$cand" ] && node_bin="$cand"
  done
fi
if [ -z "$node_bin" ]; then
  echo "herdr-spinner: no node binary found; set HERDR_SPINNER_NODE" >&2
  exit 1
fi

# Detach so the hook returns immediately; Herdr should not wait on a daemon.
"$node_bin" "$dir/spinner.js" >/dev/null 2>&1 &
echo $! > "$state"
