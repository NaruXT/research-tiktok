#!/usr/bin/env bash
set -uo pipefail

LOG_DIR=".loop/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/verify-$(date +%Y%m%d-%H%M%S).log"
FAIL=0

log() { echo "$@" | tee -a "$LOG_FILE"; }

fail_check() {
  log "ROJO: $1"
  FAIL=1
}

log "== verify.sh: $(date) =="

SKILL_FILES=$(find skills -mindepth 2 -maxdepth 2 -name 'SKILL.md' 2>/dev/null || true)

if [ -z "$SKILL_FILES" ]; then
  log "No hay SKILL.md todavía bajo skills/ - nada que verificar (esto es normal antes de la primera Skill)."
  echo "verify.sh: sin Skills, nada que chequear" | tee -a "$LOG_FILE"
  exit 0
fi

REQUIRED_SECTIONS=(
  "## Overview"
  "## Scopes requeridos"
  "## Endpoints"
  "## Schemas (JSON)"
  "## Manejo de errores"
  "## Ejemplo end-to-end"
  "## Prueba E2E realizada"
)

for skill in $SKILL_FILES; do
  log "-- Chequeando $skill --"

  # 1. Frontmatter presente y con las claves requeridas
  if ! head -1 "$skill" | grep -q '^---$'; then
    fail_check "$skill: no empieza con frontmatter '---'"
    continue
  fi
  FRONTMATTER=$(awk '/^---$/{c++; next} c==1' "$skill")
  for key in name description tiktok_docs scopes tested_e2e last_verified; do
    if ! echo "$FRONTMATTER" | grep -qE "^${key}:"; then
      fail_check "$skill: falta la clave de frontmatter '$key'"
    fi
  done

  # 2. Secciones requeridas presentes
  for section in "${REQUIRED_SECTIONS[@]}"; do
    if ! grep -qF "$section" "$skill"; then
      fail_check "$skill: falta la sección '$section'"
    fi
  done

  # 3. Bloques JSON embebidos parsean sin error
  python3 - "$skill" "$LOG_FILE" <<'PYEOF'
import sys, re, json

path, log_path = sys.argv[1], sys.argv[2]
text = open(path, encoding="utf-8").read()
blocks = re.findall(r"```json\s*\n(.*?)```", text, re.DOTALL)
ok = True
with open(log_path, "a") as logf:
    if not blocks:
        logf.write(f"ROJO: {path}: no se encontró ningún bloque ```json en Schemas (JSON)\n")
        print(f"ROJO: {path}: no se encontró ningún bloque \x60\x60\x60json en Schemas (JSON)")
        ok = False
    for i, b in enumerate(blocks):
        try:
            json.loads(b)
        except json.JSONDecodeError as e:
            msg = f"ROJO: {path}: bloque JSON #{i+1} no parsea - {e}"
            logf.write(msg + "\n")
            print(msg)
            ok = False
sys.exit(0 if ok else 1)
PYEOF
  if [ $? -ne 0 ]; then
    FAIL=1
  fi

  # 4. Re-fetch de las URLs en tiktok_docs: deben responder 200
  DOCS_URLS=$(echo "$FRONTMATTER" | awk '/^tiktok_docs:/{f=1; next} /^[a-z_]+:/{f=0} f' | sed -n 's/^[[:space:]]*-[[:space:]]*//p')
  if [ -z "$DOCS_URLS" ]; then
    fail_check "$skill: tiktok_docs vacío - no hay fuente que re-fetchear"
  else
    while IFS= read -r url; do
      [ -z "$url" ] && continue
      STATUS=$(curl -s -o /dev/null -w '%{http_code}' -L --max-time 15 "$url" || echo "000")
      if [ "$STATUS" != "200" ]; then
        fail_check "$skill: re-fetch de $url devolvió HTTP $STATUS (¿doc movida o caída?)"
      else
        log "OK: $url responde 200"
      fi
    done <<< "$DOCS_URLS"
  fi

  # 5. Guardarraíl de irreversibilidad: Content Posting nunca con privacy_level público como parámetro
  MODULE_DIR=$(dirname "$skill")
  if [ -d "$MODULE_DIR" ]; then
    if grep -rEl 'privacy_level\s*=\s*["\x27]?(PUBLIC_TO_EVERYONE|PUBLIC)' "$MODULE_DIR" 2>/dev/null | grep -q .; then
      fail_check "$MODULE_DIR: script/código referencia privacy_level público - viola el guardarraíl de irreversibilidad de Content Posting API"
    fi
  fi
done

if [ "$FAIL" -ne 0 ]; then
  log "verify.sh: ROJO - ver detalle arriba ($LOG_FILE)"
  exit 1
fi

log "verify.sh: todo verde"
exit 0
