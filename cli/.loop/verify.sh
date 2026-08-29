#!/usr/bin/env bash
set -euo pipefail

# Este script asume que corre desde cualquier lado, pero opera siempre sobre
# cli/ (el directorio padre de .loop/), nunca sobre el resto del repo.
cd "$(dirname "$0")/.."

LOG_DIR=".loop/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/verify-$(date +%Y%m%d-%H%M%S).log"

run_step() {
  local name="$1"; shift
  echo "== $name ==" | tee -a "$LOG_FILE"
  if ! "$@" >>"$LOG_FILE" 2>&1; then
    echo "FALLÓ: $name (ver $LOG_FILE)" >&2
    exit 1
  fi
}

# --- lint: sintaxis (siempre, cero dependencias) ---
run_step "lint:syntax" bash -c '
  set -e
  for f in $(find src bin test -name "*.js"); do
    node --check "$f"
  done
'

# --- lint: ESLint, solo si ya está instalado como devDependency ---
# Ítem pendiente en PROGRESS.md hasta que se instale - hasta entonces este
# paso no bloquea el resto del gate, solo lo deja anotado en el log. Una vez
# instalado, pasa a ser obligatorio como cualquier otro paso (falla duro).
if [ -x "node_modules/.bin/eslint" ]; then
  run_step "lint:eslint" node_modules/.bin/eslint src bin test
else
  echo "== lint:eslint ==" | tee -a "$LOG_FILE"
  echo "eslint no está instalado todavía (ver PROGRESS.md -> Next) - paso no bloqueante hasta que exista." | tee -a "$LOG_FILE"
fi

# --- empaquetado real (no hay build - esto es el equivalente) ---
run_step "pack" npm pack --dry-run

# --- guardarraíl de irreversibilidad: SELF_ONLY nunca deja de ser literal ---
run_step "guardrail:self-only" bash -c '
  set -e
  grep -q '"'"'PRIVACY_LEVEL = "SELF_ONLY"'"'"' src/commands/post/direct.js
  ! grep -qE "privacy-level|privacyLevel" bin/tiktok.js
'

# --- tests ---
run_step "test" npm test

echo "verify.sh: todo verde" | tee -a "$LOG_FILE"
